// Vista Pausas activas: recordatorios para estirar la postura y descansar la vista,
// con aviso (campanita suave + la isla se abre) y rutina guiada paso a paso.
import { listen } from "@tauri-apps/api/event";
import { EVENTO_AJUSTES, PAUSAS_POR_DEFECTO, type ConfigPausas } from "../ajustes";
import { compactaCambiada, pedirAviso, terminarAviso } from "../bus";
import { icono } from "../icons";
import { sonarAviso, sonarPaso } from "../sonido";
import { guardar, leer } from "../store";
import { $, anilloSvg, fijarAnillo, mmss } from "../util";
import { elegirRutina, type Ejercicio, type TipoPausa } from "./ejercicios";
import type { Vista } from "./tipos";

interface Programa {
  /** Epoch ms de la próxima pausa de cada tipo */
  proxima: Record<TipoPausa, number>;
  /** Cuántas rutinas se han hecho, para rotar los ejercicios */
  turno: Record<TipoPausa, number>;
}

interface Paso {
  ejercicio: Ejercicio;
  /** Posición del ejercicio en la rutina (desde 1) */
  numero: number;
  texto: string;
  segundos: number;
}

type Estado =
  | { modo: "reposo" }
  | { modo: "pendiente"; tipo: TipoPausa }
  | { modo: "rutina"; tipo: TipoPausa; pasos: Paso[]; indice: number; finPaso: number }
  | { modo: "fin"; tipo: TipoPausa };

const TIPOS: TipoPausa[] = ["vista", "postura"];
const NOMBRE: Record<TipoPausa, string> = { postura: "Postura", vista: "Vista" };
const AVISO: Record<TipoPausa, { titulo: string; detalle: string }> = {
  postura: { titulo: "Hora de estirar", detalle: "Unos estiramientos para el cuello, la espalda y los hombros." },
  vista: { titulo: "Descansa la vista", detalle: "Un minuto lejos de la pantalla para relajar los ojos." },
};
const POSPONER_MS = 5 * 60_000;
/** Cuánto se queda abierta la isla al avisar de una pausa. */
const DURACION_AVISO = 15_000;
const DURACION_FIN = 4_000;

let config: ConfigPausas = PAUSAS_POR_DEFECTO;
let programa: Programa = {
  proxima: { postura: Date.now() + 45 * 60_000, vista: Date.now() + 20 * 60_000 },
  turno: { postura: 0, vista: 0 },
};
let estado: Estado = { modo: "reposo" };
let raiz: HTMLElement;
let temporizador = 0;

const intervaloMs = (tipo: TipoPausa) => config[`${tipo}Intervalo`] * 60_000;
const activa = (tipo: TipoPausa) => config[`${tipo}Activa`];

function reprogramar(tipo: TipoPausa, dentroDe: number): void {
  programa = { ...programa, proxima: { ...programa.proxima, [tipo]: Date.now() + dentroDe } };
  void guardar("pausas", programa);
}

/** "en 23 min", "en 1 h 05 min" o "ahora". */
function cuando(ms: number): string {
  const falta = Math.max(0, ms - Date.now());
  if (falta < 60_000) return "ahora";
  const minutos = Math.round(falta / 60_000);
  if (minutos < 60) return `en ${minutos} min`;
  return `en ${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, "0")} min`;
}

// ---------- Flujo ----------

/** Si toca alguna pausa (y no hay otra en curso), avisa. Primero la más atrasada. */
function comprobar(): void {
  if (estado.modo !== "reposo") return;
  const vencidas = TIPOS.filter((t) => activa(t) && Date.now() >= programa.proxima[t]).sort(
    (a, b) => programa.proxima[a] - programa.proxima[b],
  );
  const tipo = vencidas[0];
  if (!tipo) return;
  estado = { modo: "pendiente", tipo };
  sonarAviso();
  pedirAviso({ vista: "pausas", duracion: DURACION_AVISO });
  pintar();
}

function empezar(tipo: TipoPausa): void {
  const rutina = elegirRutina(tipo, programa.turno[tipo]);
  programa = { ...programa, turno: { ...programa.turno, [tipo]: programa.turno[tipo] + 1 } };
  const pasos = rutina.flatMap((ejercicio, i) =>
    ejercicio.pasos.map((p) => ({ ejercicio, numero: i + 1, texto: p.texto, segundos: p.segundos })),
  );
  estado = { modo: "rutina", tipo, pasos, indice: 0, finPaso: 0 };
  iniciarPaso();
}

function iniciarPaso(): void {
  if (estado.modo !== "rutina") return;
  const paso = estado.pasos[estado.indice];
  estado.finPaso = Date.now() + paso.segundos * 1000;
  sonarPaso();
  // La isla se queda abierta mientras dura el paso, para seguirlo sin tocar el ratón
  pedirAviso({ vista: "pausas", duracion: paso.segundos * 1000 + 1500 });
  window.clearInterval(temporizador);
  temporizador = window.setInterval(tictac, 250);
  pintar();
}

function tictac(): void {
  if (estado.modo !== "rutina") return;
  if (Date.now() >= estado.finPaso) {
    siguiente();
    return;
  }
  pintarRutina();
  compactaCambiada();
}

function siguiente(): void {
  if (estado.modo !== "rutina") return;
  if (estado.indice < estado.pasos.length - 1) {
    estado.indice += 1;
    iniciarPaso();
  } else {
    terminar();
  }
}

/** Cancela la rutina: vuelve al reposo, la próxima pausa cuenta desde ahora y la isla puede cerrarse. */
function detener(): void {
  if (estado.modo !== "rutina") return;
  window.clearInterval(temporizador);
  reprogramar(estado.tipo, intervaloMs(estado.tipo));
  estado = { modo: "reposo" };
  pintar();
  terminarAviso();
}

function terminar(): void {
  if (estado.modo !== "rutina") return;
  const tipo = estado.tipo;
  window.clearInterval(temporizador);
  reprogramar(tipo, intervaloMs(tipo));
  estado = { modo: "fin", tipo };
  sonarAviso();
  pedirAviso({ vista: "pausas", duracion: DURACION_FIN });
  pintar();
  window.setTimeout(() => {
    if (estado.modo === "fin") {
      estado = { modo: "reposo" };
      pintar();
      comprobar();
    }
  }, DURACION_FIN);
}

function resolverPendiente(accion: "empezar" | "posponer" | "saltar"): void {
  if (estado.modo !== "pendiente") return;
  const tipo = estado.tipo;
  if (accion === "empezar") {
    empezar(tipo);
    return;
  }
  reprogramar(tipo, accion === "posponer" ? POSPONER_MS : intervaloMs(tipo));
  estado = { modo: "reposo" };
  pintar();
  compactaCambiada();
}

// ---------- Pintado ----------

function pintarReposo(): void {
  let siguiente: TipoPausa | null = null;
  for (const tipo of TIPOS) {
    const caja = $(raiz, `.pa-tipo[data-tipo="${tipo}"]`);
    const encendida = activa(tipo);
    const falta = Math.max(0, programa.proxima[tipo] - Date.now());
    caja.classList.toggle("apagada", !encendida);
    $<HTMLInputElement>(caja, "[data-alarma]").checked = encendida;
    // El anillo se va llenando según se acerca la pausa; en el centro, los minutos que faltan
    fijarAnillo(caja.querySelector(".anillo"), encendida ? 1 - falta / intervaloMs(tipo) : 0);
    $(caja, ".pa-min").textContent = encendida ? String(Math.ceil(falta / 60_000)) : "–";
    if (encendida && (!siguiente || programa.proxima[tipo] < programa.proxima[siguiente])) siguiente = tipo;
  }
  $(raiz, ".pa-proxima-tipo").textContent = siguiente ? NOMBRE[siguiente] : "Sin alarmas";
  $(raiz, ".pa-proxima-cuando").textContent = siguiente
    ? cuando(programa.proxima[siguiente])
    : "Activa una para recibir avisos";
}

function pintarRutina(): void {
  if (estado.modo !== "rutina") return;
  const paso = estado.pasos[estado.indice];
  const total = estado.pasos[estado.pasos.length - 1].numero;
  const restante = Math.max(0, estado.finPaso - Date.now());
  $(raiz, ".pa-segundos").textContent = String(Math.ceil(restante / 1000));
  fijarAnillo(raiz.querySelector(".pa-reloj .anillo"), restante / (paso.segundos * 1000));
  $(raiz, ".pa-contador").textContent = `${NOMBRE[estado.tipo]} · ejercicio ${paso.numero} de ${total}`;
  $(raiz, ".pa-nombre").textContent = paso.ejercicio.nombre;
  $(raiz, ".pa-texto").textContent = paso.texto;
  // En el último paso, "Siguiente" termina la rutina
  const ultimo = estado.indice === estado.pasos.length - 1;
  const siguienteBtn = $(raiz, '[data-accion="siguiente"]');
  siguienteBtn.innerHTML = ultimo ? icono.hecho : icono.adelante;
  siguienteBtn.title = ultimo ? "Terminar" : "Siguiente paso";
}

function pintar(): void {
  raiz.dataset.modo = estado.modo;
  if (estado.modo === "reposo") pintarReposo();
  if (estado.modo === "pendiente") {
    $(raiz, ".pa-pendiente .pa-simbolo").innerHTML = estado.tipo === "postura" ? icono.postura : icono.ojo;
    $(raiz, ".pa-pendiente .pa-etiqueta-tipo").textContent = `Pausa de ${NOMBRE[estado.tipo].toLowerCase()}`;
    $(raiz, ".pa-titulo").textContent = AVISO[estado.tipo].titulo;
    $(raiz, ".pa-detalle").textContent = AVISO[estado.tipo].detalle;
  }
  if (estado.modo === "rutina") pintarRutina();
  if (estado.modo === "fin") {
    $(raiz, ".pa-proxima-fin").textContent =
      `Próxima pausa de ${NOMBRE[estado.tipo].toLowerCase()} ${cuando(programa.proxima[estado.tipo])}`;
  }
  compactaCambiada();
}

/** Anillo de un recordatorio (reposo): minutos que faltan, nombre e interruptor de alarma. */
function anilloTipo(tipo: TipoPausa): string {
  return `<div class="pa-tipo" data-tipo="${tipo}">
      <div class="pa-anillo">${anilloSvg("verde")}<div class="pa-centro"><b class="pa-min">–</b><small>min</small></div></div>
      <div class="pa-etiqueta">
        <span>${NOMBRE[tipo]}</span>
        <label class="a-switch" title="Alarma de ${NOMBRE[tipo].toLowerCase()}"><input type="checkbox" data-alarma="${tipo}"><span></span></label>
      </div>
    </div>`;
}

export const pausas: Vista = {
  id: "pausas",
  titulo: `Pausas <span class="verde">activas</span>`,

  montar(contenedor) {
    raiz = contenedor;
    contenedor.classList.add("pausas");
    contenedor.innerHTML = `
      <div class="pa-panel pa-reposo">
        <div class="pa-anillos">${anilloTipo("postura")}${anilloTipo("vista")}</div>
        <div class="pa-lado">
          <small class="sub">Próxima pausa</small>
          <div class="pa-proxima"><b class="pa-proxima-tipo"></b><span class="pa-proxima-cuando"></span></div>
          <div class="botones">
            <button class="pill verde" data-empezar="postura">${icono.postura}Estirar</button>
            <button class="pill" data-empezar="vista">${icono.ojo}Descansar la vista</button>
          </div>
        </div>
      </div>
      <div class="pa-panel pa-pendiente">
        <div class="pa-anillo pa-alerta">${anilloSvg("verde")}<span class="pa-simbolo"></span></div>
        <div class="pa-lado">
          <small class="pa-etiqueta-tipo"></small>
          <b class="pa-titulo"></b>
          <span class="sub pa-detalle"></span>
          <div class="botones">
            <button class="pill verde" data-accion="empezar">Empezar</button>
            <button class="pill" data-accion="posponer">5 min más</button>
            <button class="pill plano" data-accion="saltar">Saltar</button>
          </div>
        </div>
      </div>
      <div class="pa-panel pa-rutina">
        <div class="pa-reloj">${anilloSvg("verde")}<b class="pa-segundos"></b></div>
        <div class="pa-paso">
          <small class="pa-contador"></small>
          <b class="pa-nombre"></b>
          <p class="pa-texto"></p>
        </div>
        <div class="pa-controles">
          <button class="pa-btn" data-accion="detener" title="Detener la rutina" aria-label="Detener la rutina">${icono.detener}</button>
          <button class="pa-btn" data-accion="reiniciar" title="Reiniciar el paso" aria-label="Reiniciar el paso">${icono.reiniciar}</button>
          <button class="pa-btn principal" data-accion="siguiente" title="Siguiente paso" aria-label="Siguiente paso">${icono.adelante}</button>
        </div>
      </div>
      <div class="pa-panel pa-fin">
        <div class="pa-anillo">${anilloSvg("verde")}<span class="pa-simbolo">${icono.hecho}</span></div>
        <div class="pa-lado">
          <b class="pa-titulo">¡Bien hecho!</b>
          <span class="sub pa-proxima-fin"></span>
        </div>
      </div>`;

    // Interruptor de alarma de cada tarjeta (el mismo ajuste que en la configuración)
    contenedor.addEventListener("change", (e) => {
      const input = (e.target as HTMLElement).closest<HTMLInputElement>("[data-alarma]");
      if (!input) return;
      const tipo = input.dataset.alarma as TipoPausa;
      config = { ...config, [`${tipo}Activa`]: input.checked };
      void guardar("pausasConfig", config);
      // Al activarla, la próxima pausa cuenta desde ahora
      if (input.checked) reprogramar(tipo, intervaloMs(tipo));
      pintar();
    });

    contenedor.addEventListener("click", (e) => {
      const boton = (e.target as HTMLElement).closest<HTMLElement>("[data-accion], [data-empezar]");
      if (!boton) return;
      if (boton.dataset.empezar) {
        empezar(boton.dataset.empezar as TipoPausa);
        return;
      }
      switch (boton.dataset.accion) {
        case "empezar":
        case "posponer":
        case "saltar":
          resolverPendiente(boton.dataset.accion);
          break;
        case "detener":
          detener();
          break;
        case "reiniciar":
          // Vuelve a empezar el paso actual
          iniciarPaso();
          break;
        case "siguiente":
          siguiente();
          break;
      }
    });

    void (async () => {
      config = await leer("pausasConfig", config);
      programa = await leer("pausas", programa);
      pintar();
      comprobar();
    })();

    // Intervalos o sonido cambiados en la configuración
    listen(EVENTO_AJUSTES, async () => {
      config = await leer("pausasConfig", config);
      // Si el intervalo se acortó, la próxima pausa no puede quedar más lejos que el nuevo intervalo
      for (const tipo of TIPOS) {
        if (programa.proxima[tipo] > Date.now() + intervaloMs(tipo)) reprogramar(tipo, intervaloMs(tipo));
      }
      pintar();
    }).catch(console.error);

    // Basta con revisar cada 15 s; también refresca los "en N min"
    window.setInterval(() => {
      comprobar();
      if (estado.modo === "reposo") pintarReposo();
    }, 15_000);

    pintar();
  },

  // La rutina necesita un poco más de alto para las instrucciones de cada ejercicio
  alto() {
    return estado.modo === "rutina" ? 210 : null;
  },

  compacta() {
    if (estado.modo === "rutina") {
      const restante = Math.max(0, estado.finPaso - Date.now());
      return { centro: `<span class="c-pausa">${mmss(restante)}</span>` };
    }
    if (estado.modo === "pendiente") {
      const simbolo = estado.tipo === "postura" ? icono.postura : icono.ojo;
      return { izq: `<span class="c-pausa-icono">${simbolo}</span>`, centro: `<span class="c-pausa">Pausa</span>` };
    }
    return null;
  },
};
