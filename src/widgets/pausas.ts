// Vista Pausas activas: recordatorios para estirar la postura y descansar la vista,
// con aviso (campanita suave + la isla se abre) y rutina guiada paso a paso.
// La lógica está en estado/pausas.ts; aquí solo se pinta.
import { compactaCambiada, pedirAviso, terminarAviso } from "../bus";
import {
  AVISO_PAUSA,
  DURACION_FIN_PAUSA,
  NOMBRE_PAUSA,
  TIPOS_PAUSA,
  cambiosPausas,
  cuandoPausa,
  detenerPausa,
  empezarPausa,
  estadoPausas,
  fijarAlarmaPausa,
  iniciarPaso,
  iniciarPausas,
  intervaloPausa,
  pasoPausa,
  pausaActiva,
  pausaDetenida,
  pausaPendiente,
  pausaTerminada,
  proximaPausa,
  resolverPausa,
  siguientePaso,
  type TipoPausa,
} from "../estado/pausas";
import { icono } from "../icons";
import { $, anilloSvg, fijarAnillo, mmss } from "../util";
import type { Vista } from "./tipos";

/** Cuánto se queda abierta la isla al avisar de una pausa. */
const DURACION_AVISO = 15_000;

let raiz: HTMLElement;

function pintarReposo(): void {
  let siguiente: TipoPausa | null = null;
  for (const tipo of TIPOS_PAUSA) {
    const caja = $(raiz, `.pa-tipo[data-tipo="${tipo}"]`);
    const encendida = pausaActiva(tipo);
    const falta = Math.max(0, proximaPausa(tipo) - Date.now());
    caja.classList.toggle("apagada", !encendida);
    $<HTMLInputElement>(caja, "[data-alarma]").checked = encendida;
    // El anillo se va llenando según se acerca la pausa; en el centro, los minutos que faltan
    fijarAnillo(caja.querySelector(".anillo"), encendida ? 1 - falta / intervaloPausa(tipo) : 0);
    $(caja, ".pa-min").textContent = encendida ? String(Math.ceil(falta / 60_000)) : "–";
    if (encendida && (!siguiente || proximaPausa(tipo) < proximaPausa(siguiente))) siguiente = tipo;
  }
  $(raiz, ".pa-proxima-tipo").textContent = siguiente ? NOMBRE_PAUSA[siguiente] : "Sin alarmas";
  $(raiz, ".pa-proxima-cuando").textContent = siguiente
    ? cuandoPausa(proximaPausa(siguiente))
    : "Activa una para recibir avisos";
}

function pintarRutina(): void {
  const estado = estadoPausas();
  if (estado.modo !== "rutina") return;
  const paso = estado.pasos[estado.indice];
  const total = estado.pasos[estado.pasos.length - 1].numero;
  const restante = Math.max(0, estado.finPaso - Date.now());
  $(raiz, ".pa-segundos").textContent = String(Math.ceil(restante / 1000));
  fijarAnillo(raiz.querySelector(".pa-reloj .anillo"), restante / (paso.segundos * 1000));
  $(raiz, ".pa-contador").textContent = `${NOMBRE_PAUSA[estado.tipo]} · ejercicio ${paso.numero} de ${total}`;
  $(raiz, ".pa-nombre").textContent = paso.ejercicio.nombre;
  $(raiz, ".pa-texto").textContent = paso.texto;
  // En el último paso, "Siguiente" termina la rutina
  const ultimo = estado.indice === estado.pasos.length - 1;
  const siguienteBtn = $(raiz, '[data-accion="siguiente"]');
  siguienteBtn.innerHTML = ultimo ? icono.hecho : icono.adelante;
  siguienteBtn.title = ultimo ? "Terminar" : "Siguiente paso";
}

function pintar(): void {
  const estado = estadoPausas();
  raiz.dataset.modo = estado.modo;
  if (estado.modo === "reposo") pintarReposo();
  if (estado.modo === "pendiente") {
    $(raiz, ".pa-pendiente .pa-simbolo").innerHTML = estado.tipo === "postura" ? icono.postura : icono.ojo;
    $(raiz, ".pa-pendiente .pa-etiqueta-tipo").textContent = `Pausa de ${NOMBRE_PAUSA[estado.tipo].toLowerCase()}`;
    $(raiz, ".pa-titulo").textContent = AVISO_PAUSA[estado.tipo].titulo;
    $(raiz, ".pa-detalle").textContent = AVISO_PAUSA[estado.tipo].detalle;
  }
  if (estado.modo === "rutina") pintarRutina();
  if (estado.modo === "fin") {
    $(raiz, ".pa-proxima-fin").textContent =
      `Próxima pausa de ${NOMBRE_PAUSA[estado.tipo].toLowerCase()} ${cuandoPausa(proximaPausa(estado.tipo))}`;
  }
  compactaCambiada();
}

/** Anillo de un recordatorio (reposo): minutos que faltan, nombre e interruptor de alarma. */
function anilloTipo(tipo: TipoPausa): string {
  return `<div class="pa-tipo" data-tipo="${tipo}">
      <div class="pa-anillo">${anilloSvg("verde")}<div class="pa-centro"><b class="pa-min">–</b><small>min</small></div></div>
      <div class="pa-etiqueta">
        <span>${NOMBRE_PAUSA[tipo]}</span>
        <label class="a-switch" title="Alarma de ${NOMBRE_PAUSA[tipo].toLowerCase()}"><input type="checkbox" data-alarma="${tipo}"><span></span></label>
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
      if (input) fijarAlarmaPausa(input.dataset.alarma as TipoPausa, input.checked);
    });

    contenedor.addEventListener("click", (e) => {
      const boton = (e.target as HTMLElement).closest<HTMLElement>("[data-accion], [data-empezar]");
      if (!boton) return;
      if (boton.dataset.empezar) {
        empezarPausa(boton.dataset.empezar as TipoPausa);
        return;
      }
      switch (boton.dataset.accion) {
        case "empezar":
        case "posponer":
        case "saltar":
          resolverPausa(boton.dataset.accion);
          break;
        case "detener":
          detenerPausa();
          break;
        case "reiniciar":
          // Vuelve a empezar el paso actual
          iniciarPaso();
          break;
        case "siguiente":
          siguientePaso();
          break;
      }
    });

    cambiosPausas.escuchar(pintar);
    pausaPendiente.escuchar(() => pedirAviso({ vista: "pausas", duracion: DURACION_AVISO }));
    // La isla se queda abierta mientras dura el paso, para seguirlo sin tocar el ratón
    pasoPausa.escuchar((ms) => pedirAviso({ vista: "pausas", duracion: ms + 1500 }));
    pausaTerminada.escuchar(() => pedirAviso({ vista: "pausas", duracion: DURACION_FIN_PAUSA }));
    pausaDetenida.escuchar(terminarAviso);

    pintar();
    iniciarPausas();
  },

  // La rutina necesita un poco más de alto para las instrucciones de cada ejercicio
  alto() {
    return estadoPausas().modo === "rutina" ? 210 : null;
  },

  compacta() {
    const estado = estadoPausas();
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
