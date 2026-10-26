# Isla — Dynamic Island para Windows

App de escritorio tipo "Dynamic Island": una píldora negra anclada arriba al centro de la pantalla que se expande al pasar el mouse y muestra vistas rotativas (multimedia, Pomodoro, recordatorio de agua, tareas y notificaciones del sistema).

Primera versión: **solo Windows 10/11**. Más adelante se portará a Linux, así que todo lo específico de Windows debe quedar aislado en módulos propios de Rust.

## Stack

- **Tauri 2** (backend en Rust, frontend en WebView2)
- **Frontend:** Vite + TypeScript vanilla (sin frameworks). CSS puro para animaciones.
- **Backend:** Rust con el crate `windows` (WinRT) para SMTC y UserNotificationListener.
- **Persistencia:** `tauri-plugin-store` (JSON local).

## Comandos

- `npm run tauri dev` — ejecutar en desarrollo (desde la raíz)
- `cargo check` y `cargo clippy` — dentro de `src-tauri/`, ejecutar tras cada cambio en Rust
- `npx tsc --noEmit` — verificar tipos del frontend
- `npm run tauri build` — compilar versión final

## Estructura

```
src/                      Frontend
  main.ts                 Arranque, carrusel de vistas, estados compacta/expandida
  styles.css              Estilos globales de la isla
  widgets/                Un archivo por vista: media.ts, pomodoro.ts, water.ts, todo.ts, notification.ts
src-tauri/src/
  main.rs / lib.rs        Registro de comandos, plugins y arranque
  window.rs               Posición, click-through, siempre encima
  media.rs                Multimedia (SMTC)
  notifications.rs        Notificaciones del sistema (UserNotificationListener)
```

## Diseño visual

- Fondo negro puro (#000) o casi negro, texto blanco, acentos: verde (estado), rojo (Pomodoro), azul (agua).
- **Compacta:** píldora de ~200×36 px, bordes totalmente redondeados.
- **Expandida:** ~420×140 px, radio ~24 px. Cabecera con punto verde + fecha y hora. Flechas ‹ › a los lados para cambiar de vista y puntitos de paginación abajo.
- Transiciones suaves (~300 ms, curva tipo spring con `cubic-bezier`). Nada de saltos bruscos.
- Fuente del sistema: `Segoe UI Variable`, `Segoe UI`, sans-serif.

## Reglas

- La ventana NUNCA debe bloquear clics en zonas transparentes: fuera de la píldora, los clics pasan al escritorio.
- Rust se comunica con el frontend mediante eventos (`emit`) y comandos (`#[tauri::command]`). No hacer polling desde JS si Rust puede emitir eventos.
- Las llamadas WinRT son asíncronas: no bloquear el hilo principal de Tauri. Usar `tokio`/`async` o hilos dedicados.
- Manejar errores con `Result`, sin `unwrap()` en código que se ejecute en tiempo de ejecución normal.
- Código Windows-only bajo `#[cfg(target_os = "windows")]`.
- Comentarios y textos de la interfaz en español.
- Cambios pequeños y verificables. Al terminar cada tarea: compilar, probar con `npm run tauri dev` y resumir qué se hizo y qué falta.
- No añadir dependencias nuevas sin explicar para qué sirven.
