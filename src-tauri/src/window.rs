//! Ventana-isla: posición, tamaño, monitor, visibilidad y click-through.
//!
//! La ventana es más grande que la píldora (para dejar sitio a las animaciones),
//! así que un hilo comprueba la posición del cursor y solo deja que la ventana
//! reciba el ratón cuando está encima del rectángulo de la píldora.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

/// Tamaño de la ventana con escala 1, en píxeles lógicos (igual que en tauri.conf.json).
const ANCHO_BASE: f64 = 560.0;
const ALTO_BASE: f64 = 290.0;

/// Rectángulo actual de la píldora en píxeles lógicos (CSS), relativo a la ventana.
#[derive(Clone, Copy, Default)]
pub struct RectIsla {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

impl RectIsla {
    fn contiene(&self, px: f64, py: f64) -> bool {
        px >= self.x && px <= self.x + self.w && py >= self.y && py <= self.y + self.h
    }
}

/// Ajustes de la ventana que llegan desde la configuración.
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AjustesVentana {
    /// Tamaño de la isla (1 = 100 %)
    escala: f64,
    /// Separación del borde superior, en píxeles lógicos
    desplazamiento: f64,
    /// Nombre del monitor, o None para el principal
    monitor: Option<String>,
}

impl Default for AjustesVentana {
    fn default() -> Self {
        Self { escala: 1.0, desplazamiento: 0.0, monitor: None }
    }
}

pub struct EstadoIsla {
    rect: Mutex<RectIsla>,
    ajustes: Mutex<AjustesVentana>,
    /// El usuario la ha dejado visible desde la bandeja
    pub visible_usuario: AtomicBool,
    /// Hay una aplicación a pantalla completa en el monitor de la isla
    pub pantalla_completa: AtomicBool,
}

impl Default for EstadoIsla {
    fn default() -> Self {
        Self {
            rect: Mutex::new(RectIsla::default()),
            ajustes: Mutex::new(AjustesVentana::default()),
            visible_usuario: AtomicBool::new(true),
            pantalla_completa: AtomicBool::new(false),
        }
    }
}

/// El frontend informa del tamaño de la píldora cada vez que cambia de estado.
#[tauri::command]
pub fn set_island_rect(estado: tauri::State<'_, EstadoIsla>, x: f64, y: f64, w: f64, h: f64) {
    if let Ok(mut rect) = estado.rect.lock() {
        *rect = RectIsla { x, y, w, h };
    }
}

/// Aplica tamaño, desplazamiento y monitor elegidos en la configuración.
#[tauri::command]
pub fn aplicar_ajustes_ventana(
    app: AppHandle,
    estado: tauri::State<'_, EstadoIsla>,
    ajustes: AjustesVentana,
) -> Result<(), String> {
    if let Ok(mut actuales) = estado.ajustes.lock() {
        *actuales = ajustes.clone();
    }
    let ventana = app.get_webview_window("main").ok_or("No existe la ventana de la isla")?;
    colocar(&ventana, &ajustes).map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct InfoMonitor {
    nombre: String,
    etiqueta: String,
}

#[tauri::command]
pub fn listar_monitores(app: AppHandle) -> Result<Vec<InfoMonitor>, String> {
    let ventana = app.get_webview_window("main").ok_or("No existe la ventana de la isla")?;
    let monitores = ventana.available_monitors().map_err(|e| e.to_string())?;
    Ok(monitores
        .iter()
        .enumerate()
        .filter_map(|(i, m)| {
            let nombre = m.name()?.clone();
            let tam = m.size();
            Some(InfoMonitor {
                etiqueta: format!("Monitor {} ({}×{})", i + 1, tam.width, tam.height),
                nombre,
            })
        })
        .collect())
}

/// Coloca la ventana arriba y centrada en el monitor elegido (o el principal).
/// Se trabaja en píxeles físicos con el escalado DPI de ese monitor.
pub fn colocar(ventana: &WebviewWindow, ajustes: &AjustesVentana) -> tauri::Result<()> {
    let monitores = ventana.available_monitors()?;
    let elegido = ajustes
        .monitor
        .as_deref()
        .and_then(|nombre| monitores.iter().find(|m| m.name().map(String::as_str) == Some(nombre)))
        .cloned();
    let monitor = match elegido {
        Some(m) => m,
        None => match ventana.primary_monitor()?.or_else(|| monitores.into_iter().next()) {
            Some(m) => m,
            None => return Ok(()),
        },
    };

    let dpi = monitor.scale_factor();
    let ancho = (ANCHO_BASE * ajustes.escala * dpi).round() as i32;
    let alto = (ALTO_BASE * ajustes.escala * dpi).round() as i32;
    let origen = monitor.position();
    let x = origen.x + (monitor.size().width as i32 - ancho) / 2;
    let y = origen.y + (ajustes.desplazamiento * dpi).round() as i32;

    // Primero se mueve (por si cambia de monitor y de DPI) y luego se ajusta el tamaño
    ventana.set_position(PhysicalPosition::new(x, y))?;
    ventana.set_size(PhysicalSize::new(ancho.max(1) as u32, alto.max(1) as u32))?;
    ventana.set_position(PhysicalPosition::new(x, y))
}

/// Muestra u oculta la isla según la bandeja y la pantalla completa.
pub fn aplicar_visibilidad(app: &AppHandle) {
    let estado = app.state::<EstadoIsla>();
    let visible = estado.visible_usuario.load(Ordering::SeqCst) && !estado.pantalla_completa.load(Ordering::SeqCst);
    let Some(ventana) = app.get_webview_window("main") else {
        return;
    };
    #[cfg(target_os = "windows")]
    crate::fullscreen::fijar_visible(&ventana, visible);
    #[cfg(not(target_os = "windows"))]
    {
        let _ = if visible { ventana.show() } else { ventana.hide() };
    }
}

/// Hilo que cada ~30 ms decide si la ventana deja pasar los clics.
/// Además avisa al frontend con `isla-hover` cuando el cursor entra o sale.
pub fn iniciar_click_through(app: AppHandle) {
    thread::spawn(move || {
        let mut dentro_antes: Option<bool> = None;
        loop {
            thread::sleep(Duration::from_millis(30));
            let Some(ventana) = app.get_webview_window("main") else {
                continue;
            };
            let (Ok(cursor), Ok(pos), Ok(escala)) = (
                app.cursor_position(),
                ventana.outer_position(),
                ventana.scale_factor(),
            ) else {
                continue;
            };
            let rect = app
                .state::<EstadoIsla>()
                .rect
                .lock()
                .map(|r| *r)
                .unwrap_or_default();
            let lx = (cursor.x - f64::from(pos.x)) / escala;
            let ly = (cursor.y - f64::from(pos.y)) / escala;
            let dentro = rect.contiene(lx, ly);

            if dentro_antes != Some(dentro) {
                if let Err(e) = ventana.set_ignore_cursor_events(!dentro) {
                    eprintln!("click-through: {e}");
                    continue;
                }
                let _ = app.emit("isla-hover", dentro);
                dentro_antes = Some(dentro);
            }
        }
    });
}
