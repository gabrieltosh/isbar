# Plan de desarrollo — Isla (Windows)

Cada fase tiene un **prompt** para pegar en Claude Code y unos **criterios de aceptación** para comprobar que quedó bien antes de pasar a la siguiente.

**Flujo recomendado para cada fase:**

1. `/clear` para empezar con contexto limpio (CLAUDE.md se vuelve a cargar solo).
2. Activa el modo plan (`Shift+Tab` hasta ver "plan mode") y pega el prompt. Revisa el plan que propone y apruébalo o corrígelo.
3. Deja que implemente. Prueba con `npm run tauri dev`.
4. Si algo falla, pégale el error o descríbele lo que ves (puedes arrastrar capturas a la terminal).
5. Cuando funcione: `git add -A && git commit -m "Fase X: ..."`. Así siempre puedes volver atrás.

---

## Fase 0 — Preparación

Antes de abrir Claude Code, en la carpeta `isla`:

```
git init
git add -A
git commit -m "Proyecto base de Tauri"
```

Copia `CLAUDE.md` y `PLAN.md` a la raíz del proyecto y ejecuta `claude`.

**Prompt:**

> Lee CLAUDE.md y PLAN.md. Revisa la estructura actual del proyecto (es la plantilla de Tauri 2 con Vanilla TypeScript). Limpia el contenido de ejemplo (el greet, los logos) y deja la estructura de carpetas descrita en CLAUDE.md con archivos vacíos o mínimos. Verifica que `npm run tauri dev` sigue arrancando.

**Aceptación:** la app arranca con una ventana vacía y sin errores en la terminal.

---

## Fase 1 — La ventana-isla

**Prompt:**

> Fase 1 del PLAN.md. Convierte la ventana en la isla:
> - Configura la ventana en tauri.conf.json: sin bordes, transparente, siempre encima, sin sombra, no redimensionable, sin icono en la barra de tareas, tamaño igual al de la isla expandida más un margen para las animaciones.
> - En window.rs, al arrancar, colócala arriba y centrada horizontalmente en el monitor principal (respetando el escalado DPI).
> - Implementa el click-through: un hilo en Rust que cada ~30 ms lee la posición del cursor (GetCursorPos) y la compara con el rectángulo actual de la píldora. Fuera de la píldora, `set_ignore_cursor_events(true)`; dentro, `false`. El frontend debe informar a Rust del tamaño actual de la píldora cuando cambie de estado.
> - En el frontend, crea la píldora con dos estados (compacta y expandida) según el diseño de CLAUDE.md. Se expande al entrar el mouse y se contrae al salir, con un pequeño retardo al salir (~400 ms).
> - En la vista expandida pon de momento la cabecera con el punto verde, fecha y hora en vivo, flechas ‹ › y puntitos de paginación para 4 vistas vacías (Música, Pomodoro, Agua, Tareas). Cambiar de vista con las flechas y con la rueda del mouse.

**Aceptación:**
- La píldora aparece arriba al centro, sobre todas las ventanas.
- Se puede hacer clic en el escritorio y en las ventanas justo al lado de la píldora.
- Expande y contrae suavemente; las flechas y la rueda cambian de vista.

---

## Fase 2 — Multimedia (SMTC)

**Prompt:**

> Fase 2 del PLAN.md. Implementa el control multimedia en media.rs usando el crate `windows` (features Media_Control, Foundation, Storage_Streams):
> - Obtén `GlobalSystemMediaTransportControlsSessionManager` y la sesión actual. Suscríbete a los cambios de sesión, de propiedades (canción), de estado de reproducción y de línea de tiempo.
> - Emite al frontend un evento `media-update` con: título, artista, estado (reproduciendo/pausado), duración, posición, app de origen y carátula en base64 (data URL).
> - Comandos Tauri: `media_play_pause`, `media_next`, `media_previous`.
> - En widgets/media.ts, crea la vista: carátula a la izquierda, título y artista, barra de progreso con tiempo transcurrido y restante (la posición avanza localmente entre actualizaciones), y botones ⏮ ⏯ ⏭.
> - En modo compacto, si hay música sonando, muestra una miniatura de la carátula a la izquierda y un indicador animado de ecualizador a la derecha.
> - Si no hay sesión activa, la vista muestra "Nada reproduciéndose".

**Aceptación:**
- Con Spotify o YouTube en el navegador sonando, aparecen título, artista y carátula.
- Los botones controlan la reproducción.
- Al cambiar de canción, la isla se actualiza sola.

---

## Fase 3 — Widgets locales

Puedes hacerla en tres sesiones separadas (una por widget) si prefieres.

**Prompt:**

> Fase 3 del PLAN.md. Añade `tauri-plugin-store` y crea tres vistas con datos persistentes:
> - **Pomodoro** (widgets/pomodoro.ts): temporizador circular con anillo de progreso rojo, cuenta atrás grande, botones "Descanso corto", ▶/⏸ y "Enfoque". Duraciones configurables (por defecto 25/5/15 min, descanso largo cada 4 ciclos). El tiempo debe seguir corriendo aunque la isla esté contraída; en modo compacto muestra el tiempo restante.
> - **Agua** (widgets/water.ts): litros bebidos hoy / meta diaria (por defecto 2.0 L), porcentaje, anillo de progreso azul, botón "Beber" (+250 ml configurable). Recordatorio cada X minutos configurable: cuando toca, la isla se expande sola unos segundos con un aviso. Se reinicia cada día.
> - **Tareas** (widgets/todo.ts): contador "hechas/total", campo para añadir tarea, lista con casillas para marcar y botón para borrar. El campo de texto debe poder recibir el teclado (la ventana necesita foco al escribir).
> - Al terminar un Pomodoro o al tocar el recordatorio de agua, la isla se expande automáticamente con una animación de aviso.

**Aceptación:**
- Los tres widgets funcionan y conservan sus datos al cerrar y abrir la app.
- El Pomodoro sigue contando con la isla contraída.
- Se puede escribir una tarea nueva.

---

## Fase 4 — Notificaciones del sistema

Esta es la fase más delicada: requiere darle a la app identidad de paquete.

**Requisito previo:** activar el Modo de desarrollador en Windows (Configuración → Sistema → Para programadores).

**Prompt 4a (identidad):**

> Fase 4 del PLAN.md, parte A. Para usar UserNotificationListener la app necesita identidad de paquete. Crea un sparse package:
> - Un AppxManifest.xml en src-tauri/ con `AllowExternalContent`, la capacidad `userNotificationListener` y el ejecutable de la app.
> - Embebe en el .exe un manifiesto de aplicación con `msix` identity (publisher y packageName iguales a los del AppxManifest), configurándolo en build.rs.
> - Un script `scripts/register-dev.ps1` que registre el paquete en modo desarrollo con `Add-AppxPackage -Register` apuntando a la carpeta del ejecutable, y otro para desregistrarlo.
> - Explícame paso a paso cómo ejecutarlo y cómo comprobar que la app tiene identidad.

**Prompt 4b (lectura):**

> Fase 4, parte B. En notifications.rs (feature UI_Notifications_Management):
> - Llama a `UserNotificationListener::Current()` y a `RequestAccessAsync()`. Si se deniega, emite un evento para que la interfaz muestre cómo activarlo en Configuración → Privacidad → Notificaciones.
> - Suscríbete a `NotificationChanged`. Si no se dispara, usa como respaldo `GetNotificationsAsync(NotificationKinds::Toast)` cada segundo, comparando IDs para detectar las nuevas.
> - De cada notificación nueva extrae: nombre de la app, icono de la app (base64), título y texto (de la binding `ToastGeneric`).
> - Emite `notification-new` al frontend.
> - En widgets/notification.ts: la isla se expande ~5 s mostrando icono, app, título y texto, y luego vuelve al estado anterior. Si llegan varias seguidas, se encolan.
> - Ignora las notificaciones de reproductores multimedia si ya se muestran en la vista de música.

**Aceptación:**
- Al recibir un mensaje de WhatsApp, Discord, correo o una notificación web del navegador, aparece en la isla.
- Si el permiso está denegado, la isla lo indica claramente.

---

## Fase 5 — Pulido y distribución

**Prompt:**

> Fase 5 del PLAN.md:
> - Icono en la bandeja del sistema con menú: Mostrar/ocultar isla, Configuración, Salir.
> - Inicio automático con Windows (`tauri-plugin-autostart`), activable desde la configuración.
> - Ventana de configuración: vistas activas y su orden, duraciones del Pomodoro, meta y recordatorio de agua, tamaño de la isla, desplazamiento vertical.
> - Ocultar la isla cuando haya una aplicación en pantalla completa (juegos, vídeos).
> - Soporte para varios monitores: elegir en cuál se muestra.
> - Revisar consumo: la app en reposo debe usar menos del 1 % de CPU.

**Prompt (empaquetado):**

> Prepara el empaquetado final como MSIX firmado, incluyendo la identidad de la fase 4. Genera un certificado autofirmado para pruebas y explícame qué haría falta para firmarlo con un certificado real y distribuirlo.

**Aceptación:**
- La app arranca con Windows, se controla desde la bandeja y desaparece en pantalla completa.
- Se instala desde el MSIX en otro equipo.

---

## Ideas para después

- Portar a Linux: MPRIS para multimedia y D-Bus para notificaciones (crear `media_linux.rs` y `notifications_linux.rs`).
- Más vistas: calendario, clima, uso de CPU/RAM, portapapeles.
- Temas de color y opción de fondo con desenfoque (acrílico).
