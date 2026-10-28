// Vista de música. La lógica está en estado/musica.ts; aquí solo se pinta.
import { compactaCambiada } from "../bus";
import {
  cambiosMusica,
  cancionAnterior,
  cancionSiguiente,
  infoMusica,
  iniciarMusica,
  posicionMusica,
  reproducirPausar,
} from "../estado/musica";
import { barras, icono } from "../icons";
import { $, mmss } from "../util";
import type { Vista } from "./tipos";

let raiz: HTMLElement;

function pintarProgreso(): void {
  const dur = infoMusica()?.duracionMs ?? 0;
  const pos = posicionMusica();
  $(raiz, ".m-transcurrido").textContent = mmss(pos);
  $(raiz, ".m-restante").textContent = `-${mmss(Math.max(0, dur - pos))}`;
  $(raiz, ".m-barra i").style.width = dur > 0 ? `${(pos / dur) * 100}%` : "0%";
}

function pintar(): void {
  const info = infoMusica();
  const arte = $(raiz, ".m-arte");
  arte.innerHTML = info?.caratula ? `<img src="${info.caratula}" alt="">` : icono.nota;
  $(raiz, ".m-titulo").textContent = info ? info.titulo || "Sin título" : "Nada reproduciéndose";
  $(raiz, ".m-artista").textContent = info?.artista ?? "";
  $(raiz, ".m-origen").title = info?.app ? `Desde ${info.app}` : "";
  $(raiz, ".m-play").innerHTML = info?.reproduciendo ? icono.pausa : icono.play;
  raiz.classList.toggle("sin-sesion", !info);
  pintarProgreso();
}

const COMANDOS: Record<string, () => void> = {
  anterior: cancionAnterior,
  play: reproducirPausar,
  siguiente: cancionSiguiente,
};

export const media: Vista = {
  id: "media",
  titulo: `<span class="verde">Música</span>`,

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
        <button class="m-btn" data-cmd="anterior" aria-label="Anterior">${icono.atras}</button>
        <button class="m-btn m-play" data-cmd="play" aria-label="Reproducir o pausar"></button>
        <button class="m-btn" data-cmd="siguiente" aria-label="Siguiente">${icono.adelante}</button>
      </div>`;

    contenedor.querySelectorAll<HTMLButtonElement>("[data-cmd]").forEach((b) =>
      b.addEventListener("click", () => COMANDOS[b.dataset.cmd ?? ""]?.()),
    );

    cambiosMusica.escuchar(() => {
      pintar();
      compactaCambiada();
    });

    window.setInterval(() => {
      if (infoMusica()?.reproduciendo) pintarProgreso();
    }, 500);

    pintar();
    iniciarMusica();
  },

  compacta() {
    const info = infoMusica();
    if (!info?.reproduciendo) return null;
    const arte = info.caratula
      ? `<img class="c-arte" src="${info.caratula}" alt="">`
      : `<span class="c-arte">${icono.nota}</span>`;
    return { izq: arte, der: barras(true) };
  },
};
