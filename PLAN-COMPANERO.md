# Plan: el Compañero de isbar

Un asistente con cara que vive en la pantalla: se mueve, reacciona, habla con globos de pensamiento
y despliega un panel para ver avisos, música, recordatorios y pedirle cosas.

Se construye **dentro de este proyecto** como un segundo estilo. En la configuración se elige
**Estilo: Isla | Compañero**. Todo lo que ya funciona (notificaciones, música, Pomodoro, agua,
pausas, Claude, ajustes, sonidos, paquete de la Store) se reutiliza.

## Diseño acordado

- **Cuerpo**: pantalla de cristal oscuro (cuadrado redondeado), translúcida.
- **Cara LED**: dos ojos y una boca con trazos gruesos y brillo suave. Color por defecto blanco,
  con opción azul, naranja y lima. Sin carcasa, sin parecido a personajes ni logos conocidos.
- **Emociones**: normal, feliz, risa, guiño animado, sorpresa, enojado, triste, pensativo,
  cansado (con bostezo), mareado, preocupado, hablando, silba, dormido, celebración, saludo.
- **Vida propia**: respira; mira al ratón o alrededor; parpadea; rutinas cuando está solo
  (silba, se estira); se cansa, bosteza y se duerme; de noche, más lento.
- **Reacciones**: sonríe con el ratón encima; guiño con clic; risa con doble clic; se enoja con
  muchos clics; se marea si se agita el ratón encima.
- **Moverlo**: mantener pulsado y arrastrar; rebota al soltarlo; junto a un borde se esconde y
  se asoma; recuerda la posición.
- **Globos de pensamiento**: avisos con acciones al pasar el ratón (Abrir, Más tarde, Descartar,
  Hecho…). Se colocan hacia el lado con espacio.
- **Panel** (clic): Inicio, Avisos, Música, Recordatorios y Chat, con un cuadro para escribirle.
- **Música**: mientras suena, ojos sonrientes, canta y se balancea al ritmo con notas flotando;
  globo con la canción al cambiar de pista, con controles.
- **Iconos de estado** sobre la cabeza: sin internet, batería baja, progreso del Pomodoro en el borde.
- **Sonidos opcionales**: blips cortos y suaves, desactivados por defecto.

## Arquitectura

### Ventana
- Ventana nueva `companero` (Tauri `WebviewWindow`): transparente, siempre encima, sin barra de
  tareas, sin foco al aparecer.
- Tamaño fijo con margen alrededor del compañero (para globos, panel y animaciones). Al abrir el
  panel o un globo hacia un lado, Rust recoloca la ventana para que el compañero no se mueva.
- **Click-through**: se generaliza el sondeo actual de `window.rs` para aceptar **varios
  rectángulos** por ventana (compañero, globo, panel). Fuera de ellos, los clics pasan al escritorio.
- **Arrastre**: el frontend detecta el "mantener pulsado" y pide a Rust mover la ventana con el
  cursor (posición física, multimonitor). Al soltar: rebote, imán a bordes y guardar la posición.
- **Pantalla completa**: se reutiliza `fullscreen.rs` para ocultarlo.

### Frontend (nuevo `src/companero/`)
| Archivo | Para qué |
|---|---|
| `companero.html` / `main.ts` | Arranque de la ventana |
| `cara.ts` | Dibuja la cara (SVG) a partir de parámetros; transiciones suaves (lerp) |
| `emociones.ts` | Catálogo de emociones y estados (forma de ojos, boca, extras) |
| `vida.ts` | Respiración, parpadeo, mirada, rutinas, cansancio y sueño, modo noche |
| `interaccion.ts` | Clic, doble clic, muchos clics, mantener y arrastrar, agitar, bordes |
| `globos.ts` | Cola de globos de pensamiento con acciones |
| `panel/` | Pestañas Inicio, Avisos, Música, Recordatorios y Chat |
| `asistente.ts` | Entiende frases en español ("recuérdame…", "pon un pomodoro"…) |
| `recordatorios.ts` | Lista persistente y programación de avisos |

### Lógica compartida
Hoy la lógica de Pomodoro, agua, pausas y música vive dentro de cada vista de la isla. Se separa
en módulos de **estado** (sin interfaz) que usan tanto la isla como el compañero, para no
duplicar nada.

### Rust (nuevo)
- `companero.rs`: crear, mostrar y ocultar la ventana; moverla; recolocarla para el panel;
  guardar la posición.
- `sistema.rs`: **batería** (`GetSystemPowerStatus` o `PowerManager`) y **conexión**
  (`NetworkInformation` con su evento de cambio), emitidos como eventos.
- El **tiempo** se pide desde el frontend a Open-Meteo (gratis, sin clave) con la ciudad que el
  usuario indique en la configuración.

## Fases

Cada fase termina con algo que funciona y se puede probar.

**Fase 0. Preparación**
- Commit del trabajo pendiente (lista de notificaciones, abrir la app, rueda).
- Separar la lógica de estado de Pomodoro, agua, pausas y música en módulos compartidos.
- Ajuste **Estilo: Isla | Compañero**.

**Fase 1. Ventana y movimiento**
- Ventana del compañero con click-through de varios rectángulos.
- Mantener pulsado y arrastrar, rebote, imán a bordes, asomarse, posición guardada, multimonitor.
- Ocultarse en pantalla completa.

**Fase 2. Cara y vida propia**
- Motor de la cara con todas las emociones y transiciones.
- Respirar, parpadear, mirar, rutinas, cansancio, sueño y modo noche.
- Reacciones al ratón: encima, clic, doble clic, muchos clics, agitar.
- Ajustes: color, tamaño y modo tranquilo.

**Fase 3. Globos, notificaciones y música**
- Globos de pensamiento con cola y acciones.
- Notificaciones del sistema como globos: Abrir, Más tarde, Descartar.
- Música: animación de cantar y balancearse, globo al cambiar de canción con controles.
- Pomodoro, agua y pausas activas avisando con globos y gestos.

**Fase 4. Panel**
- Panel que sale del compañero hacia el lado con espacio.
- Pestañas Inicio, Avisos, Música, Recordatorios y Chat.

**Fase 5. Asistente**
- Cuadro para escribirle y respuestas "hablando".
- Recordatorios ("en N min", "a las HH:MM", "mañana…") persistentes, que sobreviven a reinicios.
- Órdenes: pomodoro, agua, tiempo, batería, pausas.

**Fase 6. Estado del sistema y del día**
- Batería y conexión con iconos y avisos.
- Tiempo del día (Open-Meteo) y saludo de buenos días.
- Noche: sugerir descanso. Ritmo de trabajo: avisar tras mucho tiempo sin pausa. Rachas.

**Fase 7. Pulido y publicación**
- Sonidos opcionales, rendimiento (pausar la animación cuando está oculto), accesibilidad.
- Probar en Windows 10 y 11, varios monitores y escalas.
- Publicar como **isbar 0.2** en la Microsoft Store.

## Para más adelante
- IA opcional para conversar (clave de API propia del usuario; se avisa de que el texto sale del PC).
- Lanzador de apps, Centro de control y reemplazo del menú Inicio y la barra de tareas.
