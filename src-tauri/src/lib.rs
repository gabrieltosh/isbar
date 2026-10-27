mod window;

#[cfg(target_os = "windows")]
mod media;
#[cfg(target_os = "windows")]
mod notifications;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(window::EstadoIsla::default());

    #[cfg(target_os = "windows")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        window::set_island_rect,
        media::media_play_pause,
        media::media_next,
        media::media_previous,
        notifications::abrir_ajustes_notificaciones,
    ]);
    #[cfg(not(target_os = "windows"))]
    let builder = builder.invoke_handler(tauri::generate_handler![window::set_island_rect]);

    builder
        .setup(|app| {
            if let Some(ventana) = app.get_webview_window("main") {
                window::colocar_arriba_centro(&ventana)?;
                ventana.set_ignore_cursor_events(true)?;
            }
            window::iniciar_click_through(app.handle().clone());
            #[cfg(target_os = "windows")]
            {
                media::iniciar(app.handle().clone());
                notifications::iniciar(app.handle().clone());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar la isla");
}
