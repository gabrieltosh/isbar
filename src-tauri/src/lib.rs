mod window;

#[cfg(target_os = "windows")]
mod media;
#[cfg(target_os = "windows")]
mod notifications;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(window::EstadoIsla::default())
        .invoke_handler(tauri::generate_handler![window::set_island_rect])
        .setup(|app| {
            if let Some(ventana) = app.get_webview_window("main") {
                window::colocar_arriba_centro(&ventana)?;
                ventana.set_ignore_cursor_events(true)?;
            }
            window::iniciar_click_through(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar la isla");
}
