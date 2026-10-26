// Vista Pomodoro: cuenta atrás con anillo rojo. Sigue contando con la isla contraída.
import { compactaCambiada, pedirAviso } from "../bus";
import { icono } from "../icons";
import { guardar, leer } from "../store";
import { $, anilloSvg, fijarAnillo, mmss } from "../util";
import type { Vista } from "./tipos";

type Modo = "enfoque" | "corto" | "largo";

interface Config {
  enfoque: number; // minutos
  corto: number;
  largo: number;
  cadaLargo: number; // descanso largo cada N enfoques
}

interface Estado {
  modo: Modo;
  corriendo: boolean;
  /** Momento (epoch ms) en que termina, si está corriendo */
  finEn: number;
  /** Tiempo restante cuando está en pausa */
  restante: number;
  ciclos: number;
}

const ETIQUETA: Record<Modo, string> = {
  enfoque: "Tiempo de enfoque",
  corto: "Descanso corto",
  largo: "Descanso largo",
};

let config: Config = { enfoque: 25, corto: 5, largo: 15, cadaLargo: 4 };
let estado: Estado = { modo: "enfoque", corriendo: false, finEn: 0, restante: 25 * 60_000, ciclos: 0 };
let raiz: HTMLElement;
let temporizador = 0;

const duracion = (m: Modo) => config[m] * 60_000;
const restante = () => (estado.corriendo ? Math.max(0, estado.finEn - Date.now()) : estado.restante);

function persistir(): void {
  void guardar("pomodoro", estado);
}

function pintar(): void {
  const r = restante();
  $(raiz, ".p-tiempo").textContent = mmss(r);
  $(raiz, ".p-sub").textContent = ETIQUETA[estado.modo];
  $(raiz, ".p-play").innerHTML = estado.corriendo ? icono.pausa : icono.play;
  fijarAnillo(raiz.querySelector(".anillo"), r / duracion(estado.modo));
  raiz.classList.toggle("corriendo", estado.corriendo);
  raiz.querySelectorAll<HTMLButtonElement>("[data-modo]").forEach((b) =>
    b.classList.toggle("activo", b.dataset.modo === estado.modo),
  );
}

function tic(): void {
  if (estado.corriendo && restante() <= 0) terminar();
  pintar();
  compactaCambiada();
}

function arrancarReloj(): void {
  window.clearInterval(temporizador);
  if (estado.corriendo) temporizador = window.setInterval(tic, 250);
}

function cambiarModo(modo: Modo): void {
  estado = { ...estado, modo, corriendo: false, restante: duracion(modo) };
  arrancarReloj();
  persistir();
  tic();
}

function alternar(): void {
  if (estado.corriendo) {
    estado = { ...estado, corriendo: false, restante: restante() };
  } else {
    estado = { ...estado, corriendo: true, finEn: Date.now() + estado.restante };
  }
  arrancarReloj();
  persistir();
  tic();
}

function terminar(): void {
  let siguiente: Modo = "enfoque";
  let ciclos = estado.ciclos;
  if (estado.modo === "enfoque") {
    ciclos += 1;
    siguiente = ciclos % config.cadaLargo === 0 ? "largo" : "corto";
  }
  estado = { modo: siguiente, corriendo: false, finEn: 0, restante: duracion(siguiente), ciclos };
  arrancarReloj();
  persistir();
  pedirAviso({ vista: "pomodoro", duracion: 6000 });
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

    $(contenedor, ".p-play").addEventListener("click", alternar);
    $(contenedor, ".p-reiniciar").addEventListener("click", () => cambiarModo(estado.modo));
    contenedor.querySelectorAll<HTMLButtonElement>("[data-modo]").forEach((b) =>
      b.addEventListener("click", () => cambiarModo(b.dataset.modo as Modo)),
    );

    pintar();
    void (async () => {
      config = await leer("pomodoroConfig", config);
      estado = await leer("pomodoro", { ...estado, restante: duracion("enfoque") });
      arrancarReloj();
      tic();
    })();
  },

  compacta() {
    if (!estado.corriendo) return null;
    return { centro: `<span class="c-pomodoro">${mmss(restante())}</span>` };
  },
};
