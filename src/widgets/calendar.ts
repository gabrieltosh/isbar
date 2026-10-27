// Vista Calendario: hora y fecha grandes y el mes en cuadrícula (se abre al pulsar la hora).
import { icono } from "../icons";
import { $ } from "../util";
import type { Vista } from "./tipos";

const fmtHora = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });
const fmtDia = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const fmtMes = new Intl.DateTimeFormat("es-ES", { month: "long" });
const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

let raiz: HTMLElement;
// Mes que se está viendo (día 1), puede ser distinto del actual
let mesVisto = primeroDeMes(new Date());

function primeroDeMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Número de semana ISO 8601. */
function semanaIso(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const inicioAnio = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - inicioAnio) / 86_400_000 + 1) / 7);
}

function pintarReloj(): void {
  const ahora = new Date();
  $(raiz, ".cal-hora").textContent = fmtHora.format(ahora);
  $(raiz, ".cal-dia").textContent = fmtDia.format(ahora);
  $(raiz, ".cal-anio").textContent = `${ahora.getFullYear()} · semana ${semanaIso(ahora)}`;
}

function pintarMes(): void {
  const hoy = new Date();
  // "Octubre 2026" (el formato largo de es-ES diría "octubre de 2026")
  const mes = fmtMes.format(mesVisto);
  $(raiz, ".cal-mes").textContent = `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${mesVisto.getFullYear()}`;

  // La cuadrícula empieza en lunes; se rellena con los días del mes anterior y siguiente
  const desfase = (mesVisto.getDay() + 6) % 7;
  const inicio = new Date(mesVisto.getFullYear(), mesVisto.getMonth(), 1 - desfase);
  const celdas: string[] = DIAS_SEMANA.map((d) => `<b>${d}</b>`);
  for (let i = 0; i < 42; i++) {
    const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const clases = [
      dia.getMonth() !== mesVisto.getMonth() ? "fuera" : "",
      dia.toDateString() === hoy.toDateString() ? "hoy" : "",
      (dia.getDay() + 6) % 7 >= 5 ? "finde" : "",
    ].filter(Boolean);
    celdas.push(`<span class="${clases.join(" ")}">${dia.getDate()}</span>`);
  }
  $(raiz, ".cal-rejilla").innerHTML = celdas.join("");
  raiz.classList.toggle("otro-mes", mesVisto.getTime() !== primeroDeMes(hoy).getTime());
}

function cambiarMes(delta: number): void {
  mesVisto = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + delta, 1);
  pintarMes();
}

function tic(): void {
  pintarReloj();
  pintarMes(); // por si cambia el día
  window.setTimeout(tic, 60_000 - (Date.now() % 60_000) + 50);
}

export const calendario: Vista = {
  id: "calendario",
  titulo: "Calendario",

  montar(contenedor) {
    raiz = contenedor;
    contenedor.classList.add("calendario");
    contenedor.innerHTML = `
      <div class="cal-izq">
        <div class="cal-hora grande"></div>
        <div class="cal-dia"></div>
        <div class="cal-anio sub"></div>
      </div>
      <div class="cal-panel">
        <div class="cal-cabecera">
          <button class="cal-nav" data-mes="-1" aria-label="Mes anterior">${icono.izquierda}</button>
          <button class="cal-mes" title="Volver a hoy"></button>
          <button class="cal-nav" data-mes="1" aria-label="Mes siguiente">${icono.derecha}</button>
        </div>
        <div class="cal-rejilla"></div>
      </div>`;

    contenedor.querySelectorAll<HTMLButtonElement>("[data-mes]").forEach((b) =>
      b.addEventListener("click", () => cambiarMes(Number(b.dataset.mes))),
    );
    $(contenedor, ".cal-mes").addEventListener("click", () => {
      mesVisto = primeroDeMes(new Date());
      pintarMes();
    });
    tic();
  },
};
