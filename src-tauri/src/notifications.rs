//! Notificaciones del sistema mediante UserNotificationListener.
//!
//! Requiere identidad de paquete (Fase 4A) y el permiso del usuario. Un hilo propio
//! pide el permiso, avisa al frontend con `notification-access` y emite
//! `notification-new` por cada notificación nueva.
//!
//! `NotificationChanged` no siempre funciona en apps de escritorio: si no se puede
//! suscribir, se consulta la lista cada segundo y se comparan los IDs.

use std::collections::{HashMap, HashSet};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_opener::OpenerExt;
use windows::core::Result as WinResult;
use windows::Foundation::{Size, TypedEventHandler};
use windows::UI::Notifications::Management::{
    UserNotificationListener as Escucha, UserNotificationListenerAccessStatus as Acceso,
};
use windows::UI::Notifications::{KnownNotificationBindings, NotificationKinds, UserNotification};

use crate::media::{iniciar_winrt, leer_imagen};

/// Sin eventos de Windows se consulta cada segundo; con eventos, solo como respaldo.
const SONDEO: Duration = Duration::from_secs(1);
const SONDEO_CON_EVENTOS: Duration = Duration::from_secs(5);
/// Mientras no haya permiso, se vuelve a mirar por si el usuario lo activa.
const ESPERA_PERMISO: Duration = Duration::from_secs(10);

#[derive(Serialize, Clone)]
pub struct Notificacion {
    app: String,
    icono: Option<String>,
    titulo: String,
    texto: String,
}

#[derive(Serialize, Clone)]
struct EstadoPermiso {
    /// "permitido", "denegado", "sin-decidir" o "error"
    estado: &'static str,
}

fn nombre_estado(acceso: Acceso) -> &'static str {
    match acceso {
        Acceso::Allowed => "permitido",
        Acceso::Denied => "denegado",
        _ => "sin-decidir",
    }
}

pub fn iniciar(app: AppHandle) {
    thread::spawn(move || {
        if let Err(e) = bucle(&app) {
            eprintln!("notificaciones: {e}");
            let _ = app.emit("notification-access", EstadoPermiso { estado: "error" });
        }
    });
}

fn bucle(app: &AppHandle) -> WinResult<()> {
    iniciar_winrt();
    let escucha = Escucha::Current()?;

    // RequestAccessAsync muestra el diálogo la primera vez; si falla, se usa el estado actual
    let mut acceso = escucha
        .RequestAccessAsync()
        .and_then(|op| op.join())
        .or_else(|_| escucha.GetAccessStatus())?;
    let _ = app.emit("notification-access", EstadoPermiso { estado: nombre_estado(acceso) });

    while acceso != Acceso::Allowed {
        thread::sleep(ESPERA_PERMISO);
        let nuevo = escucha.GetAccessStatus()?;
        if nuevo != acceso {
            acceso = nuevo;
            let _ = app.emit("notification-access", EstadoPermiso { estado: nombre_estado(acceso) });
        }
    }

    let (tx, rx) = mpsc::channel::<()>();
    let con_eventos = escucha
        .NotificationChanged(&TypedEventHandler::new(move |_, _| {
            let _ = tx.send(());
            Ok(())
        }))
        .is_ok();
    let espera = if con_eventos { SONDEO_CON_EVENTOS } else { SONDEO };

    let mut iconos: HashMap<String, Option<String>> = HashMap::new();
    // Las que ya estaban al arrancar no se muestran
    let mut vistas: HashSet<u32> = match consultar(&escucha) {
        Ok(lista) => lista.iter().filter_map(|n| n.Id().ok()).collect(),
        Err(_) => HashSet::new(),
    };

    loop {
        match rx.recv_timeout(espera) {
            Ok(()) | Err(RecvTimeoutError::Timeout) => {}
            // Sin suscripción el emisor ya no existe: se espera a mano
            Err(RecvTimeoutError::Disconnected) => thread::sleep(espera),
        }
        let lista = match consultar(&escucha) {
            Ok(l) => l,
            Err(e) => {
                eprintln!("notificaciones: no se pudo leer la lista: {e}");
                continue;
            }
        };

        let mut actuales = HashSet::with_capacity(lista.len());
        for n in &lista {
            let Ok(id) = n.Id() else { continue };
            actuales.insert(id);
            if vistas.contains(&id) {
                continue;
            }
            match leer(n, &mut iconos) {
                Ok(info) => {
                    let _ = app.emit("notification-new", info);
                }
                Err(e) => eprintln!("notificaciones: no se pudo leer una notificación: {e}"),
            }
        }
        vistas = actuales;
    }
}

fn consultar(escucha: &Escucha) -> WinResult<Vec<UserNotification>> {
    let vista = escucha.GetNotificationsAsync(NotificationKinds::Toast)?.join()?;
    (0..vista.Size()?).map(|i| vista.GetAt(i)).collect()
}

fn leer(n: &UserNotification, iconos: &mut HashMap<String, Option<String>>) -> WinResult<Notificacion> {
    let pantalla = n.AppInfo()?.DisplayInfo()?;
    let app = pantalla.DisplayName()?.to_string();

    // El logo de cada app se lee una sola vez
    let icono = iconos
        .entry(app.clone())
        .or_insert_with(|| {
            pantalla
                .GetLogo(Size { Width: 64.0, Height: 64.0 })
                .and_then(|logo| leer_imagen(logo.OpenReadAsync()?))
                .unwrap_or(None)
        })
        .clone();

    // Plantilla ToastGeneric: el primer texto es el título y el resto el cuerpo
    let binding = n
        .Notification()?
        .Visual()?
        .GetBinding(&KnownNotificationBindings::ToastGeneric()?)?;
    let textos = binding.GetTextElements()?;
    let mut lineas = (0..textos.Size()?).filter_map(|i| textos.GetAt(i).and_then(|t| t.Text()).ok());
    let titulo = lineas.next().map(|t| t.to_string()).unwrap_or_default();
    let texto = lineas.map(|t| t.to_string()).collect::<Vec<_>>().join("\n");

    Ok(Notificacion { app, icono, titulo, texto })
}

/// Abre Configuración > Privacidad > Notificaciones para conceder el permiso.
#[tauri::command]
pub fn abrir_ajustes_notificaciones(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url("ms-settings:privacy-notifications", None::<&str>)
        .map_err(|e| e.to_string())
}
