# isbar

Barra flotante para Windows inspirada en la isla dinámica de los móviles: una píldora negra
anclada arriba al centro de la pantalla que se expande al pasar el ratón.

## Qué hace

- **Música**: lo que suena en el sistema (Spotify, navegador…), con carátula y controles.
- **Notificaciones**: muestra las notificaciones de Windows y avisa de cuántas hay pendientes.
- **Pomodoro**: temporizador de enfoque y descansos que sigue contando con la barra contraída.
- **Agua**: litros bebidos hoy, meta diaria y recordatorio.
- **Pausas activas**: recordatorios para estirar la postura y descansar la vista, con ejercicios guiados paso a paso.
- **Tareas**, **Bandeja** de archivos y **Calendario**.
- **Uso de Claude**: límites de 5 horas y semanal de Claude Code (a través de su barra de estado).
- Se oculta con aplicaciones a pantalla completa, icono en la bandeja del sistema, inicio con Windows
  y configuración de vistas, tamaño, posición y monitor.

## Desarrollo

Requisitos: Windows 10 (2004) o posterior, [Node.js](https://nodejs.org/), [Rust](https://rustup.rs/) y el
[Windows SDK](https://developer.microsoft.com/windows/downloads/windows-sdk/) (para los paquetes MSIX).

```
npm install
npm run tauri dev
```

Hecho con [Tauri 2](https://tauri.app/) (Rust + WebView2) y TypeScript sin frameworks.

### Notificaciones del sistema en desarrollo

Leer las notificaciones de Windows requiere identidad de paquete. En desarrollo se registra un paquete
externo firmado con un certificado de prueba (la primera vez, en PowerShell como administrador):

```
npm run paquete:registrar
npm run paquete:comprobar
```

### Paquete para Microsoft Store

```
npm run paquete:store
```

Genera `src-tauri/target/store/isbar_<versión>_x64.msix` (la Store lo firma al publicarlo). Con
`-Probar` crea además una copia firmada para instalarla en tu PC antes de subirla.

### Uso de Claude Code

```
npm run claude:instalar   # añade la barra de estado de isbar a Claude Code (conserva la que hubiera)
npm run claude:quitar     # la quita y deja la anterior
```

## Licencia

[MIT](LICENSE)
