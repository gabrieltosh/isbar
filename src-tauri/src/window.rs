//! Ventana-isla: posición arriba al centro y click-through.
//!
//! La ventana es más grande que la píldora (para dejar sitio a las animaciones),
//! así que un hilo comprueba la posición del cursor y solo deja que la ventana
//! reciba el ratón cuando está encima del rectángulo de la píldora.

use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewWindow};

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

pub struct EstadoIsla(pub Mutex<RectIsla>);

impl Default for EstadoIsla {
    fn default() -> Self {
        Self(Mutex::new(RectIsla::default()))
    }
}

/// El frontend informa del tamaño de la píldora cada vez que cambia de estado.
#[tauri::command]
pub fn set_island_rect(estado: tauri::State<'_, EstadoIsla>, x: f64, y: f64, w: f64, h: f64) {
    if let Ok(mut rect) = estado.0.lock() {
        *rect = RectIsla { x, y, w, h };
    }
}

/// Coloca la ventana arriba y centrada en el monitor principal.
/// Se trabaja en píxeles físicos, así el escalado DPI ya está incluido.
pub fn colocar_arriba_centro(ventana: &WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = ventana.primary_monitor()? else {
        return Ok(());
    };
    let tam = ventana.outer_size()?;
    let origen = monitor.position();
    let ancho_monitor = monitor.size().width as i32;
    let x = origen.x + (ancho_monitor - tam.width as i32) / 2;
    ventana.set_position(PhysicalPosition::new(x, origen.y))
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
                .0
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
