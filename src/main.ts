// Arranque de la isla: estados compacta/expandida, carrusel de vistas, reloj y avisos.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { alAviso, alCompacta } from "./bus";
import { barras, icono } from "./icons";
import { $ } from "./util";
import { media, musicaSonando } from "./widgets/media";
import { iniciarNotificaciones } from "./widgets/notification";
import { pomodoro } from "./widgets/pomodoro";
import { bandeja } from "./widgets/shelf";
import type { Compacta, Vista } from "./widgets/tipos";
import { tareasVista } from "./widgets/todo";
import { agua } from "./widgets/water";

const VISTAS: Vista[] = [media, pomodoro, agua, bandeja, tareasVista];

// Deben coincidir con los tamaños de styles.css
const TAM = {
  compacta: { w: 150, h: 34 },
  expandida: { w: 470, h: 160 },
};
const RETARDO_SALIDA = 400;
const DURACION_TRANSICION = 380;

const isla = $(document, "#isla");
const contVistas = $(document, "#vistas");
const titulo = $(document, "#titulo");
const puntos = $(document, "#puntos");

let abierta = false;
let raton = false; // el cursor está sobre la píldora (lo dice Rust)
let avisoHasta = 0;
let indice = 0;
let tSalida = 0;

// ---------- Estados compacta / expandida ----------

/** Informa a Rust del rectángulo de la píldora para el click-through. */
function informarRect(estado: keyof typeof TAM): void {
  const { w, h } = TAM[estado];
  invoke("set_island_rect", { x: (window.innerWidth - w) / 2, y: 0, w, h }).catch(console.error);
}

function abrir(): void {
  if (abierta) return;
  abierta = true;
  isla.classList.add("abierta");
  informarRect("expandida");
}

function cerrar(): void {
  const escribiendo = document.activeElement instanceof HTMLInputElement;
  if (!abierta || raton || escribiendo || Date.now() < avisoHasta) return;
  abierta = false;
  isla.classList.remove("abierta", "aviso");
  // Mantiene el área grande hasta que termina la animación
  window.setTimeout(() => {
    if (!abierta) informarRect("compacta");
  }, DURACION_TRANSICION);
}

function programarCierre(): void {
  window.clearTimeout(tSalida);
  tSalida = window.setTimeout(cerrar, RETARDO_SALIDA);
}

listen<boolean>("isla-hover", ({ payload }) => {
  raton = payload;
  window.clearTimeout(tSalida);
  if (raton) abrir();
  else programarCierre();
}).catch(console.error);

// Al perder el foco (clic fuera de la isla) se suelta el campo de texto
window.addEventListener("blur", () => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
});
document.addEventListener("focusout", () => {
  if (!raton) programarCierre();
});

alAviso(({ vista, duracion = 5000 }) => {
  const i = VISTAS.findIndex((v) => v.id === vista);
  if (i >= 0) ir(i);
  avisoHasta = Date.now() + duracion;
  abrir();
  // Reinicia la animación de aviso aunque ya estuviera puesta
  isla.classList.remove("aviso");
  void isla.offsetWidth;
  isla.classList.add("aviso");
  window.setTimeout(() => {
    if (!raton) cerrar();
  }, duracion + 50);
});

// ---------- Carrusel de vistas ----------

const paneles = VISTAS.map((v) => {
  const panel = document.createElement("section");
  panel.className = "vista";
  contVistas.append(panel);
  v.montar(panel);
  return panel;
});

puntos.innerHTML = VISTAS.map(() => "<i></i>").join("");

function ir(n: number): void {
  indice = (n + VISTAS.length) % VISTAS.length;
  paneles.forEach((p, i) => {
    p.classList.toggle("activa", i === indice);
    p.classList.toggle("antes", i < indice);
  });
  puntos.querySelectorAll("i").forEach((p, i) => p.classList.toggle("activo", i === indice));
  titulo.innerHTML = VISTAS[indice].titulo;
  isla.dataset.vista = VISTAS[indice].id;
}

const btnAnterior = $(document, "#anterior");
const btnSiguiente = $(document, "#siguiente");
btnAnterior.innerHTML = icono.izquierda;
btnSiguiente.innerHTML = icono.derecha;
btnAnterior.addEventListener("click", () => ir(indice - 1));
btnSiguiente.addEventListener("click", () => ir(indice + 1));

let ultimaRueda = 0;
isla.addEventListener(
  "wheel",
  (e) => {
    const ahora = Date.now();
    if (!abierta || ahora - ultimaRueda < 300) return;
    ultimaRueda = ahora;
    ir(indice + (e.deltaY > 0 || e.deltaX > 0 ? 1 : -1));
  },
  { passive: true },
);

// ---------- Reloj y vista compacta ----------

const fmtFecha = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtHora = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });
let horaActual = "";

function pintarReloj(): void {
  const ahora = new Date();
  horaActual = fmtHora.format(ahora);
  $(document, "#fecha").textContent = fmtFecha.format(ahora).replace(/,/g, "");
  $(document, "#hora").textContent = horaActual;
  pintarCompacta();
  // Siguiente actualización justo al cambiar de minuto
  window.setTimeout(pintarReloj, 60_000 - (Date.now() % 60_000) + 50);
}

const cIzq = $(document, "#c-izq");
const cCentro = $(document, "#c-centro");
const cDer = $(document, "#c-der");
const indicador = $(document, "#indicador");

function fijarHtml(el: HTMLElement, html: string): void {
  // Solo se reescribe si cambia, para no reiniciar animaciones
  if (el.innerHTML !== html) el.innerHTML = html;
}

function pintarCompacta(): void {
  let c: Required<Compacta> = {
    izq: `<span class="estado">${icono.estado}</span>`,
    centro: `<span class="c-hora">${horaActual}</span>`,
    der: barras(false),
  };
  for (const v of VISTAS) c = { ...c, ...v.compacta?.() };
  fijarHtml(cIzq, c.izq);
  fijarHtml(cCentro, c.centro);
  fijarHtml(cDer, c.der);
  fijarHtml(indicador, barras(musicaSonando()));
}

alCompacta(pintarCompacta);

// ---------- Arranque ----------

$(document, "#estado").innerHTML = icono.estado;
iniciarNotificaciones(isla, $(document, "#notificacion"));
ir(0);
pintarReloj();
informarRect("compacta");
