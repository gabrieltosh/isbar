//! Uso de Claude Code (límites de 5 horas y semanal, coste de la sesión).
//!
//! Los datos los escribe la barra de estado de la isla para Claude Code
//! (scripts/claude-statusline) en `~/.isla/claude-uso.json`. Está fuera de AppData a
//! propósito: Windows redirige AppData en las apps empaquetadas y la isla no lo vería.
//! Aquí solo se vigila ese archivo y se reenvía su contenido con `claude-uso`.
//! No se leen credenciales ni se llama a ningún servidor.

use std::fs;
use std::path::PathBuf;
use std::thread;
use std::time::{Duration, SystemTime};

use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};

const ARCHIVO: &str = "claude-uso.json";
/// Claude Code actualiza la barra de estado como mucho cada pocos segundos.
const INTERVALO: Duration = Duration::from_secs(2);

fn ruta(app: &AppHandle) -> Option<PathBuf> {
    app.path().home_dir().ok().map(|d| d.join(".isla").join(ARCHIVO))
}

fn leer(app: &AppHandle) -> Option<Value> {
    let texto = fs::read_to_string(ruta(app)?).ok()?;
    let valor: Value = serde_json::from_str(&texto).ok()?;
    valor.is_object().then_some(valor)
}

/// Para que la isla tenga el último dato al arrancar.
#[tauri::command]
pub fn leer_uso_claude(app: AppHandle) -> Option<Value> {
    leer(&app)
}

pub fn iniciar(app: AppHandle) {
    thread::spawn(move || {
        let mut ultima: Option<SystemTime> = None;
        loop {
            thread::sleep(INTERVALO);
            let Some(ruta) = ruta(&app) else { continue };
            let Ok(modificado) = fs::metadata(&ruta).and_then(|m| m.modified()) else {
                continue;
            };
            if ultima == Some(modificado) {
                continue;
            }
            ultima = Some(modificado);
            if let Some(uso) = leer(&app) {
                let _ = app.emit("claude-uso", uso);
            }
        }
    });
}
