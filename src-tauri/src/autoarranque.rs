//! Inicio con Windows.
//!
//! - Instalada desde Microsoft Store (MSIX completo): la tarea de inicio declarada en el
//!   manifiesto del paquete (StartupTask "IsbarInicio"). La clave Run del registro no sirve
//!   dentro de un paquete.
//! - Sin paquete (desarrollo, instalador normal): tauri-plugin-autostart (clave Run).

use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

#[cfg(target_os = "windows")]
mod paquete {
    use windows::core::{Result as WinResult, HSTRING};
    use windows::ApplicationModel::{StartupTask, StartupTaskState};

    use crate::media::iniciar_winrt;

    /// Debe coincidir con TaskId de paquete-store/AppxManifest.xml.
    const TAREA: &str = "IsbarInicio";

    /// La tarea solo existe dentro del MSIX de la Store; fuera de él falla y se usa el plugin.
    fn tarea() -> WinResult<StartupTask> {
        iniciar_winrt();
        StartupTask::GetAsync(&HSTRING::from(TAREA))?.join()
    }

    fn activo(estado: StartupTaskState) -> bool {
        estado == StartupTaskState::Enabled || estado == StartupTaskState::EnabledByPolicy
    }

    pub fn consultar() -> Option<bool> {
        tarea().and_then(|t| t.State()).map(activo).ok()
    }

    /// Devuelve el estado final (Windows puede no permitirlo si el usuario lo desactivó a mano).
    pub fn fijar(encender: bool) -> Option<bool> {
        let t = tarea().ok()?;
        if encender {
            t.RequestEnableAsync().and_then(|op| op.join()).map(activo).ok()
        } else {
            t.Disable().ok().map(|_| false)
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod paquete {
    pub fn consultar() -> Option<bool> {
        None
    }
    pub fn fijar(_encender: bool) -> Option<bool> {
        None
    }
}

#[tauri::command]
pub async fn autoarranque_activo(app: AppHandle) -> Result<bool, String> {
    let desde_paquete = tauri::async_runtime::spawn_blocking(paquete::consultar)
        .await
        .map_err(|e| e.to_string())?;
    match desde_paquete {
        Some(activo) => Ok(activo),
        None => app.autolaunch().is_enabled().map_err(|e| e.to_string()),
    }
}

/// Activa o desactiva el inicio con Windows y devuelve cómo queda.
#[tauri::command]
pub async fn autoarranque_fijar(app: AppHandle, activo: bool) -> Result<bool, String> {
    let desde_paquete = tauri::async_runtime::spawn_blocking(move || paquete::fijar(activo))
        .await
        .map_err(|e| e.to_string())?;
    if let Some(estado) = desde_paquete {
        return Ok(estado);
    }
    let gestor = app.autolaunch();
    let resultado = if activo { gestor.enable() } else { gestor.disable() };
    resultado.map_err(|e| e.to_string())?;
    gestor.is_enabled().map_err(|e| e.to_string())
}
