// Vista de música. Los datos llegan desde Rust (media.rs, Fase 2) con el evento `media-update`.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { compactaCambiada } from "../bus";
import { barras, icono } from "../icons";
import { $, mmss } from "../util";
import type { Vista } from "./tipos";

export interface InfoMedia {
  titulo: string;
  artista: string;
  reproduciendo: boolean;
  duracionMs: number;
  posicionMs: number;
  app: string;
  /** Carátula como data URL, o null */
  caratula: string | null;
}

let info: InfoMedia | null = null;
// La posición avanza localmente entre actualizaciones de Rust
let posicionBase = 0;
let marcaBase = 0;
let raiz: HTMLElement;

export function musicaSonando(): boolean {
  return info?.reproduciendo ?? false;
}

function posicionActual(): number {
  if (!info) return 0;
  const p = posicionBase + (info.reproduciendo ? performance.now() - marcaBase : 0);
  return info.duracionMs > 0 ? Math.min(p, info.duracionMs) : p;
}

function pintarProgreso(): void {
  const dur = info?.duracionMs ?? 0;
  const pos = posicionActual();
  $(raiz, ".m-transcurrido").textContent = mmss(pos);
  $(raiz, ".m-restante").textContent = `-${mmss(Math.max(0, dur - pos))}`;
  $(raiz, ".m-barra i").style.width = dur > 0 ? `${(pos / dur) * 100}%` : "0%";
}

function pintar(): void {
  const arte = $(raiz, ".m-arte");
  arte.innerHTML = info?.caratula ? `<img src="${info.caratula}" alt="">` : icono.nota;
  $(raiz, ".m-titulo").textContent = info ? info.titulo || "Sin título" : "Nada reproduciéndose";
  $(raiz, ".m-artista").textContent = info?.artista ?? "";
  $(raiz, ".m-origen").title = info?.app ? `Desde ${info.app}` : "";
  $(raiz, ".m-play").innerHTML = info?.reproduciendo ? icono.pausa : icono.play;
  raiz.classList.toggle("sin-sesion", !info);
  pintarProgreso();
}

function comando(nombre: string): void {
  invoke(nombre).catch((e) => console.warn(`${nombre} no disponible todavía:`, e));
}

export const media: Vista = {
  id: "media",
  titulo: "",

  montar(contenedor) {
    raiz = contenedor;
    contenedor.classList.add("media");
    contenedor.innerHTML = `
      <div class="m-arte"></div>
      <div class="m-info">
        <div class="m-titulo"></div>
        <div class="m-artista"></div>
      </div>
      <div class="m-progreso">
        <span class="m-transcurrido">00:00</span>
        <span class="m-barra"><i></i></span>
        <span class="m-restante">-00:00</span>
      </div>
      <div class="m-controles">
        <span class="m-origen">${icono.letra}</span>
        <button class="m-btn" data-cmd="media_previous" aria-label="Anterior">${icono.atras}</button>
        <button class="m-btn m-play" data-cmd="media_play_pause" aria-label="Reproducir o pausar"></button>
        <button class="m-btn" data-cmd="media_next" aria-label="Siguiente">${icono.adelante}</button>
      </div>`;

    contenedor.querySelectorAll<HTMLButtonElement>("[data-cmd]").forEach((b) =>
      b.addEventListener("click", () => comando(b.dataset.cmd ?? "")),
    );

    listen<InfoMedia | null>("media-update", ({ payload }) => {
      info = payload;
      posicionBase = payload?.posicionMs ?? 0;
      marcaBase = performance.now();
      pintar();
      compactaCambiada();
    }).catch(console.error);

    window.setInterval(() => {
      if (info?.reproduciendo) pintarProgreso();
    }, 500);

    pintar();
  },

  compacta() {
    if (!info?.reproduciendo) return null;
    const arte = info.caratula
      ? `<img class="c-arte" src="${info.caratula}" alt="">`
      : `<span class="c-arte">${icono.nota}</span>`;
    return { izq: arte, der: barras(true) };
  },
};
