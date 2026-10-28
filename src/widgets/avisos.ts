// Notificaciones pendientes de Windows: se leen y se descartan desde la isla, una a una o todas,
// sin abrir el Centro de actividades. Se abre con la campana de la cabecera.
// Al pulsar una se abre la app que la envió (y se descarta), como en Windows.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { compactaCambiada } from "../bus";
import { icono } from "../icons";
import { $, escapar } from "../util";
import type { Vista } from "./tipos";

interface Pendiente {
  id: number;
  /** Epoch ms */
  fecha: number;
  app: string;
  icono: string | null;
  titulo: string;
  texto: string;
}

/** Alto de cada notificación en la lista (px), para calcular el de la isla. */
const ALTO_FILA = 62;
const ALTO_MIN = 180;
const ALTO_MAX = 270;
/** Lo que dura la animación al descartar una. */
const SALIDA_MS = 220;

let raiz: HTMLElement;
let lista: Pendiente[] = [];
let cargando = false;
let repetir = false;

/** Pide la lista a Rust; si llega otro cambio mientras tanto, se vuelve a pedir al terminar. */
async function cargar(): Promise<void> {
  if (cargando) {
    repetir = true;
    return;
  }
  cargando = true;
  try {
    lista = await invoke<Pendiente[]>("listar_notificaciones");
  } catch (e) {
    console.error("notificaciones:", e);
  } finally {
    cargando = false;
  }
  pintar();
  if (repetir) {
    repetir = false;
    void cargar();
  }
}

function hace(fecha: number): string {
  const min = Math.floor((Date.now() - fecha) / 60_000);
  if (!fecha || min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  return new Date(fecha).toLocaleDateString("es", { day: "numeric", month: "short" });
}

function fila(n: Pendiente): string {
  const logo = n.icono
    ? `<img src="${escapar(n.icono)}" alt="" />`
    : escapar(n.app.charAt(0).toUpperCase() || "?");
  return `<li class="av-fila" data-id="${n.id}" title="Abrir ${escapar(n.app)}">
      <span class="av-icono">${logo}</span>
      <div class="av-cuerpo">
        <small>${escapar(n.app)} · ${hace(n.fecha)}</small>
        <b>${escapar(n.titulo || n.app)}</b>
        ${n.texto ? `<p>${escapar(n.texto)}</p>` : ""}
      </div>
      <button class="av-quitar" title="Descartar" aria-label="Descartar">${icono.cerrar}</button>
    </li>`;
}

function pintar(): void {
  const contenido = $(raiz, ".av-lista");
  const borrar = $<HTMLButtonElement>(raiz, ".av-borrar");
  borrar.hidden = lista.length === 0;
  contenido.innerHTML =
    lista.length > 0
      ? lista.map(fila).join("")
      : `<li class="av-vacia">${icono.hecho}<span>No tienes notificaciones</span></li>`;
  // La isla cambia de alto según cuántas haya
  compactaCambiada();
}

/** Quita la fila con animación y llama a Rust (descartar, o abrir la app y descartar). */
async function descartar(li: HTMLElement, comando = "eliminar_notificacion"): Promise<void> {
  const id = Number(li.dataset.id);
  li.classList.add("saliendo");
  await new Promise((r) => window.setTimeout(r, SALIDA_MS));
  lista = lista.filter((n) => n.id !== id);
  pintar();
  try {
    await invoke(comando, { id });
  } catch (e) {
    console.error("notificaciones:", e);
    void cargar(); // si no se pudo, vuelve a aparecer
  }
}

async function descartarTodas(): Promise<void> {
  raiz.querySelectorAll(".av-fila").forEach((li) => li.classList.add("saliendo"));
  await new Promise((r) => window.setTimeout(r, SALIDA_MS));
  lista = [];
  pintar();
  try {
    await invoke("eliminar_notificaciones");
  } catch (e) {
    console.error("notificaciones:", e);
    void cargar();
  }
}

export const avisos: Vista = {
  id: "avisos",
  titulo: "Notificaciones",

  montar(contenedor) {
    raiz = contenedor;
    contenedor.classList.add("avisos");
    contenedor.innerHTML = `
      <button class="pill plano av-borrar" hidden>Borrar todo</button>
      <ul class="av-lista"></ul>`;

    $(contenedor, ".av-borrar").addEventListener("click", () => void descartarTodas());
    $(contenedor, ".av-lista").addEventListener("click", (e) => {
      const objetivo = e.target as HTMLElement;
      const li = objetivo.closest<HTMLElement>(".av-fila");
      if (!li || li.classList.contains("saliendo")) return;
      // La X solo la descarta; el resto de la fila abre la app
      void descartar(li, objetivo.closest(".av-quitar") ? "eliminar_notificacion" : "abrir_notificacion");
    });

    // Cualquier cambio en el número de pendientes (nuevas o descartadas desde Windows) recarga la lista
    listen<number>("notification-count", () => void cargar()).catch(console.error);
    void cargar();
  },

  alto() {
    return Math.min(ALTO_MAX, Math.max(ALTO_MIN, 78 + lista.length * ALTO_FILA));
  },
};
