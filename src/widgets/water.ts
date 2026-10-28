// Vista Agua: litros de hoy frente a la meta, botón Beber y recordatorio periódico.
// La lógica está en estado/agua.ts; aquí solo se pinta.
import { pedirAviso } from "../bus";
import {
  PASOS_AGUA,
  ajustarAgua,
  beber,
  cambiosAgua,
  configAgua,
  fijarRecordatoriosAgua,
  iniciarAgua,
  mlHoy,
  recordatorioAgua,
} from "../estado/agua";
import { icono } from "../icons";
import { $, anilloSvg, fijarAnillo } from "../util";
import type { Vista } from "./tipos";

let raiz: HTMLElement;

const litros = (ml: number) => (ml / 1000).toFixed(1);

function pintar(): void {
  const config = configAgua();
  const ml = mlHoy();
  const pct = Math.round((ml / config.meta) * 100);
  $(raiz, ".a-litros").textContent = litros(ml);
  $(raiz, ".a-meta").textContent = `/ ${litros(config.meta)} L`;
  $(raiz, ".a-sub").textContent =
    `Hoy · ${pct}% · ${config.recordatorios ? `Cada ${config.intervalo} min` : "Recordatorios off"}`;
  $(raiz, ".a-barra i").style.width = `${Math.min(100, pct)}%`;
  $(raiz, ".a-pct").textContent = String(pct);
  $<HTMLInputElement>(raiz, ".a-switch input").checked = config.recordatorios;
  fijarAnillo(raiz.querySelector(".anillo"), ml / config.meta);

  $(raiz, ".a-v-meta").textContent = `${litros(config.meta)} L`;
  $(raiz, ".a-v-intervalo").textContent = `${config.intervalo} min`;
  $(raiz, ".a-v-sorbo").textContent = `${config.sorbo} ml`;
}

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
    $<HTMLInputElement>(contenedor, ".a-switch input").addEventListener("change", (e) =>
      fijarRecordatoriosAgua((e.target as HTMLInputElement).checked),
    );
    contenedor.querySelectorAll<HTMLButtonElement>("[data-ajuste]").forEach((b) =>
      b.addEventListener("click", () =>
        ajustarAgua(b.dataset.ajuste as keyof typeof PASOS_AGUA, Number(b.dataset.dir) as 1 | -1),
      ),
    );

    cambiosAgua.escuchar(pintar);
    recordatorioAgua.escuchar(() => pedirAviso({ vista: "agua", duracion: 6000 }));

    pintar();
    iniciarAgua();
  },
};
