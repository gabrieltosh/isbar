// Vista Agua: litros de hoy frente a la meta, botón Beber y recordatorio periódico.
import { pedirAviso } from "../bus";
import { icono } from "../icons";
import { guardar, leer } from "../store";
import { $, anilloSvg, fijarAnillo, hoy } from "../util";
import type { Vista } from "./tipos";

interface Config {
  meta: number; // ml
  sorbo: number; // ml por cada "Beber"
  intervalo: number; // minutos entre recordatorios
  recordatorios: boolean;
}

interface Registro {
  fecha: string;
  ml: number;
}

let config: Config = { meta: 2000, sorbo: 250, intervalo: 60, recordatorios: false };
let registro: Registro = { fecha: hoy(), ml: 0 };
let ultimoAviso = Date.now();
let raiz: HTMLElement;

const litros = (ml: number) => (ml / 1000).toFixed(1);

function comprobarDia(): void {
  if (registro.fecha !== hoy()) {
    registro = { fecha: hoy(), ml: 0 };
    void guardar("agua", registro);
  }
}

function pintar(): void {
  comprobarDia();
  const pct = Math.round((registro.ml / config.meta) * 100);
  $(raiz, ".a-litros").textContent = litros(registro.ml);
  $(raiz, ".a-meta").textContent = `/ ${litros(config.meta)} L`;
  $(raiz, ".a-sub").textContent =
    `Hoy · ${pct}% · ${config.recordatorios ? `Cada ${config.intervalo} min` : "Recordatorios off"}`;
  $(raiz, ".a-barra i").style.width = `${Math.min(100, pct)}%`;
  $(raiz, ".a-pct").textContent = String(pct);
  $<HTMLInputElement>(raiz, ".a-switch input").checked = config.recordatorios;
  fijarAnillo(raiz.querySelector(".anillo"), registro.ml / config.meta);

  $(raiz, ".a-v-meta").textContent = `${litros(config.meta)} L`;
  $(raiz, ".a-v-intervalo").textContent = `${config.intervalo} min`;
  $(raiz, ".a-v-sorbo").textContent = `${config.sorbo} ml`;
}

function guardarConfig(): void {
  void guardar("aguaConfig", config);
  pintar();
}

function beber(): void {
  comprobarDia();
  registro = { ...registro, ml: registro.ml + config.sorbo };
  ultimoAviso = Date.now();
  void guardar("agua", registro);
  pintar();
}

// Pasos de los ajustes: [clave, paso, mínimo, máximo]
const AJUSTES: Record<string, [keyof Config, number, number, number]> = {
  meta: ["meta", 250, 500, 6000],
  intervalo: ["intervalo", 15, 15, 240],
  sorbo: ["sorbo", 50, 50, 1000],
};

export const agua: Vista = {
  id: "agua",
  titulo: `Recordatorio <span class="azul">Agua</span>`,

  montar(contenedor) {
    raiz = contenedor;
    contenedor.classList.add("agua");
    const fila = (id: string, nombre: string) => `
      <div class="a-ajuste"><span>${nombre}</span>
        <button class="mini" data-ajuste="${id}" data-dir="-1">−</button>
        <b class="a-v-${id}"></b>
        <button class="mini" data-ajuste="${id}" data-dir="1">+</button>
      </div>`;
    contenedor.innerHTML = `
      <div class="a-izq">
        <div class="a-principal">
          <div class="a-fila">
            <span class="a-litros grande">0.0</span><span class="a-meta"></span>
            <label class="a-switch" title="Recordatorios"><input type="checkbox"><span></span></label>
          </div>
          <div class="a-sub sub"></div>
          <div class="a-barra"><i></i></div>
          <div class="botones">
            <button class="pill azul a-beber">${icono.gota}Beber</button>
            <button class="pill a-abrir-ajustes">${icono.ajustes}Ajustes</button>
          </div>
        </div>
        <div class="a-ajustes">
          ${fila("meta", "Meta")}${fila("intervalo", "Aviso cada")}${fila("sorbo", "Por trago")}
          <button class="pill a-cerrar-ajustes">Listo</button>
        </div>
      </div>
      <div class="a-anillo">${anilloSvg("azul")}<div class="a-centro"><b class="a-pct">0</b><small>${icono.gota}%</small></div></div>`;

    $(contenedor, ".a-beber").addEventListener("click", beber);
    $(contenedor, ".a-abrir-ajustes").addEventListener("click", () => contenedor.classList.add("ajustando"));
    $(contenedor, ".a-cerrar-ajustes").addEventListener("click", () => contenedor.classList.remove("ajustando"));
    $<HTMLInputElement>(contenedor, ".a-switch input").addEventListener("change", (e) => {
      config = { ...config, recordatorios: (e.target as HTMLInputElement).checked };
      ultimoAviso = Date.now();
      guardarConfig();
    });
    contenedor.querySelectorAll<HTMLButtonElement>("[data-ajuste]").forEach((b) =>
      b.addEventListener("click", () => {
        const [clave, paso, min, max] = AJUSTES[b.dataset.ajuste ?? ""];
        const valor = (config[clave] as number) + paso * Number(b.dataset.dir);
        config = { ...config, [clave]: Math.min(max, Math.max(min, valor)) };
        guardarConfig();
      }),
    );

    // Recordatorio y cambio de día: basta con revisar cada 30 s
    window.setInterval(() => {
      if (config.recordatorios && Date.now() - ultimoAviso >= config.intervalo * 60_000) {
        ultimoAviso = Date.now();
        pedirAviso({ vista: "agua", duracion: 6000 });
      }
      pintar();
    }, 30_000);

    pintar();
    void (async () => {
      config = await leer("aguaConfig", config);
      registro = await leer("agua", registro);
      pintar();
    })();
  },
};
