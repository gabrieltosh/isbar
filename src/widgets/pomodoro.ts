// Vista Pomodoro: cuenta atrás con anillo rojo. Sigue contando con la isla contraída.
// La lógica está en estado/pomodoro.ts; aquí solo se pinta.
import { compactaCambiada, pedirAviso } from "../bus";
import {
  ETIQUETA_MODO,
  alternarPomodoro,
  cambiarModo,
  cambiosPomodoro,
  duracion,
  estadoPomodoro,
  iniciarPomodoro,
  pomodoroTerminado,
  reiniciarPomodoro,
  restante,
  type Modo,
} from "../estado/pomodoro";
import { icono } from "../icons";
import { $, anilloSvg, fijarAnillo, mmss } from "../util";
import type { Vista } from "./tipos";

let raiz: HTMLElement;

function pintar(): void {
  const estado = estadoPomodoro();
  const r = restante();
  $(raiz, ".p-tiempo").textContent = mmss(r);
  $(raiz, ".p-sub").textContent = ETIQUETA_MODO[estado.modo];
  $(raiz, ".p-play").innerHTML = estado.corriendo ? icono.pausa : icono.play;
  fijarAnillo(raiz.querySelector(".anillo"), r / duracion(estado.modo));
  raiz.classList.toggle("corriendo", estado.corriendo);
  raiz.querySelectorAll<HTMLButtonElement>("[data-modo]").forEach((b) =>
    b.classList.toggle("activo", b.dataset.modo === estado.modo),
  );
}

export const pomodoro: Vista = {
  id: "pomodoro",
  titulo: "Pomodoro",

  montar(contenedor) {
    raiz = contenedor;
    contenedor.classList.add("pomodoro");
    contenedor.innerHTML = `
      <div class="p-reloj">${anilloSvg("rojo")}<span class="p-icono">${icono.cronometro}</span></div>
      <div class="p-der">
        <div class="p-fila">
          <span class="p-tiempo grande">25:00</span>
          <button class="p-reiniciar" aria-label="Reiniciar">${icono.reiniciar}</button>
        </div>
        <div class="p-sub sub"></div>
        <div class="botones">
          <button class="pill" data-modo="corto">${icono.taza}Descanso corto</button>
          <button class="pill rojo p-play" aria-label="Iniciar o pausar"></button>
          <button class="pill" data-modo="enfoque">${icono.diana}Enfoque</button>
        </div>
      </div>`;

    $(contenedor, ".p-play").addEventListener("click", alternarPomodoro);
    $(contenedor, ".p-reiniciar").addEventListener("click", reiniciarPomodoro);
    contenedor.querySelectorAll<HTMLButtonElement>("[data-modo]").forEach((b) =>
      b.addEventListener("click", () => cambiarModo(b.dataset.modo as Modo)),
    );

    cambiosPomodoro.escuchar(() => {
      pintar();
      compactaCambiada();
    });
    pomodoroTerminado.escuchar(() => pedirAviso({ vista: "pomodoro", duracion: 6000 }));

    pintar();
    iniciarPomodoro();
  },

  compacta() {
    if (!estadoPomodoro().corriendo) return null;
    return { centro: `<span class="c-pomodoro">${mmss(restante())}</span>` };
  },
};
