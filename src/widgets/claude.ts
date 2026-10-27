// Vista Claude: uso de Claude Code (límites de 5 horas y semanal, coste de la sesión).
// Los datos llegan de la barra de estado de Claude Code a través de Rust (claude_uso.rs).
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { pedirAviso } from "../bus";
import { $, anilloSvg, escapar, fijarAnillo } from "../util";
import type { Vista } from "./tipos";

interface Ventana {
  porcentaje: number;
  /** Epoch ms del reinicio, o null si no se conoce */
  reinicio: number | null;
}

interface UsoClaude {
  actualizado: number;
  modelo: string | null;
  costeSesion: number | null;
  contexto: number | null;
  cincoHoras: Ventana | null;
  semanal: Ventana | null;
}

/** A partir de aquí el anillo se pone rojo y la isla avisa (una vez por ventana y umbral). */
const UMBRALES_AVISO = [80, 95];
const ALERTA = 80;
/** Sin datos nuevos en este tiempo se considera que no hay sesión de Claude Code abierta. */
const SIN_SESION_MS = 10 * 60_000;

let uso: UsoClaude | null = null;
let raiz: HTMLElement;
const avisados = new Set<string>();

const fmtDia = new Intl.DateTimeFormat("es-ES", { weekday: "short", hour: "2-digit", minute: "2-digit" });

/** "reinicia en 2 h 13 min", "reinicia en 45 min" o, si falta más de un día, "reinicia lun 09:00". */
function cuandoReinicia(reinicio: number | null): string {
  if (reinicio === null) return "";
  const falta = reinicio - Date.now();
  if (falta <= 0) return "reiniciado";
  if (falta > 24 * 3_600_000) return `reinicia ${fmtDia.format(reinicio).replace(",", "")}`;
  const horas = Math.floor(falta / 3_600_000);
  const minutos = Math.ceil((falta % 3_600_000) / 60_000);
  return `reinicia en ${horas > 0 ? `${horas} h ` : ""}${minutos} min`;
}

function haceCuanto(ms: number): string {
  const minutos = Math.round((Date.now() - ms) / 60_000);
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  return horas < 24 ? `hace ${horas} h` : `hace ${Math.round(horas / 24)} d`;
}

function pintarVentana(selector: string, v: Ventana | null): void {
  const caja = $(raiz, selector);
  const vigente = v && (v.reinicio === null || v.reinicio > Date.now());
  const porcentaje = vigente ? v.porcentaje : 0;
  caja.classList.toggle("sin-dato", !vigente);
  caja.classList.toggle("alerta", Boolean(vigente) && porcentaje >= ALERTA);
  fijarAnillo(caja.querySelector(".anillo"), porcentaje / 100);
  $(caja, ".cl-pct").textContent = vigente ? `${Math.round(porcentaje)}` : "–";
  $(caja, ".cl-reinicio").textContent = vigente ? cuandoReinicia(v.reinicio) : "sin datos";
}

function pintar(): void {
  raiz.classList.toggle("vacia", !uso);
  if (!uso) return;
  pintarVentana(".cl-5h", uso.cincoHoras);
  pintarVentana(".cl-semana", uso.semanal);
  $(raiz, ".cl-modelo").textContent = uso.modelo ?? "Claude Code";
  $(raiz, ".cl-coste").textContent = uso.costeSesion !== null ? `$${uso.costeSesion.toFixed(2)}` : "–";
  $(raiz, ".cl-contexto").textContent = uso.contexto !== null ? `${Math.round(uso.contexto)} %` : "–";
  const antiguo = Date.now() - uso.actualizado > SIN_SESION_MS;
  // Claude Code solo manda los límites tras la primera respuesta de cada sesión
  const sinLimites = !uso.cincoHoras && !uso.semanal;
  $(raiz, ".cl-estado").innerHTML = antiguo
    ? `Sin sesión abierta · dato de ${escapar(haceCuanto(uso.actualizado))}`
    : sinLimites
      ? "Los límites llegan tras la primera respuesta de Claude"
      : `Actualizado ${escapar(haceCuanto(uso.actualizado))}`;
  raiz.classList.toggle("antiguo", antiguo);
}

/** Avisa al cruzar un umbral del límite de 5 horas (una vez por ventana). */
function comprobarAvisos(anterior: UsoClaude | null): void {
  const v = uso?.cincoHoras;
  if (!v || !anterior) return;
  const antes = anterior.cincoHoras?.reinicio === v.reinicio ? anterior.cincoHoras.porcentaje : 0;
  for (const umbral of UMBRALES_AVISO) {
    const clave = `${v.reinicio}-${umbral}`;
    if (antes < umbral && v.porcentaje >= umbral && !avisados.has(clave)) {
      avisados.add(clave);
      pedirAviso({ vista: "claude", duracion: 6000 });
    }
  }
}

function caja(clase: string, etiqueta: string): string {
  return `<div class="cl-ventana ${clase}">
      <div class="cl-anillo">${anilloSvg("claude")}<div class="cl-centro"><b class="cl-pct">–</b><small>%</small></div></div>
      <div class="cl-texto"><b>${etiqueta}</b><small class="cl-reinicio"></small></div>
    </div>`;
}

export const claude: Vista = {
  id: "claude",
  titulo: `Uso de <span class="naranja">Claude</span>`,

  montar(contenedor) {
    raiz = contenedor;
    contenedor.classList.add("claude");
    contenedor.innerHTML = `
      <div class="cl-ventanas">${caja("cl-5h", "5 horas")}${caja("cl-semana", "Semana")}</div>
      <div class="cl-detalle">
        <div class="cl-modelo"></div>
        <div class="cl-fila"><span>Sesión</span><b class="cl-coste"></b></div>
        <div class="cl-fila"><span>Contexto</span><b class="cl-contexto"></b></div>
        <div class="cl-estado sub"></div>
      </div>
      <div class="cl-vacia">
        <b>Sin datos de Claude Code</b>
        <small>Abre Claude Code: el uso aparece tras su primera respuesta.</small>
      </div>`;

    listen<UsoClaude>("claude-uso", ({ payload }) => {
      const anterior = uso;
      uso = payload;
      comprobarAvisos(anterior);
      pintar();
    }).catch(console.error);

    invoke<UsoClaude | null>("leer_uso_claude")
      .then((u) => {
        uso = u ?? uso;
        pintar();
      })
      .catch(console.error);

    // Los "se reinicia en…" y "hace…" cambian con el tiempo
    window.setInterval(pintar, 30_000);
    pintar();
  },
};
