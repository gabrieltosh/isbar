// Notificaciones del sistema. Llegan desde Rust (notifications.rs) con `notification-new`.
// Se muestran encima de las vistas ~5 s y, si llegan varias seguidas, se encolan.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { pedirAviso } from "../bus";
import { escapar } from "../util";
import { musicaSonando } from "../estado/musica";

export interface Notificacion {
  /** Id de Windows (solo las del sistema): al pulsarla se abre su app */
  id?: number;
  app: string;
  /** Icono de la app como data URL, o null */
  icono: string | null;
  titulo: string;
  texto: string;
  /** Qué hacer al hacer clic (solo para avisos propios de la isla) */
  accion?: () => void;
}

type EstadoPermiso = "permitido" | "denegado" | "sin-decidir" | "error";

const DURACION = 5000;
const DURACION_PERMISO = 9000;
// Apps cuya notificación ya se ve en la vista de música
const REPRODUCTORES = /spotify|music|música|media player|reproductor/i;

const cola: Notificacion[] = [];
let mostrando = false;
let actual: Notificacion | null = null;

function siguiente(isla: HTMLElement, caja: HTMLElement): void {
  const n = cola.shift();
  actual = n ?? null;
  if (!n) {
    mostrando = false;
    isla.classList.remove("con-notificacion");
    return;
  }
  mostrando = true;
  const inicial = escapar(n.app.slice(0, 1).toUpperCase());
  caja.innerHTML = `
    <span class="n-icono">${n.icono ? `<img src="${n.icono}" alt="">` : inicial}</span>
    <div class="n-cuerpo">
      <small>${escapar(n.app)}</small>
      <b>${escapar(n.titulo)}</b>
      <p>${escapar(n.texto)}</p>
    </div>`;
  caja.classList.toggle("accionable", Boolean(n.accion));
  isla.classList.add("con-notificacion");
  // Los avisos propios con acción (p. ej. el del permiso) se quedan más tiempo
  const duracion = n.accion && n.id === undefined ? DURACION_PERMISO : DURACION;
  pedirAviso({ duracion });
  window.setTimeout(() => siguiente(isla, caja), duracion);
}

function encolar(isla: HTMLElement, caja: HTMLElement, n: Notificacion): void {
  cola.push(n);
  if (!mostrando) siguiente(isla, caja);
}

function avisoPermiso(estado: EstadoPermiso): Notificacion | null {
  const abrirAjustes = () => {
    invoke("abrir_ajustes_notificaciones").catch(console.error);
  };
  switch (estado) {
    case "denegado":
    case "sin-decidir":
      return {
        app: "Isla",
        icono: null,
        titulo: "Sin acceso a las notificaciones",
        texto: "Haz clic para activarlo en Configuración › Privacidad › Notificaciones.",
        accion: abrirAjustes,
      };
    case "error":
      return {
        app: "Isla",
        icono: null,
        titulo: "No se pueden leer las notificaciones",
        texto: "Comprueba que el paquete está registrado (npm run paquete:registrar).",
      };
    default:
      return null;
  }
}

export function iniciarNotificaciones(isla: HTMLElement, caja: HTMLElement): void {
  caja.addEventListener("click", () => actual?.accion?.());

  listen<Notificacion>("notification-new", ({ payload }) => {
    if (musicaSonando() && REPRODUCTORES.test(payload.app)) return;
    const id = payload.id;
    // Como en Windows: al pulsarla se abre la app que la envió
    const accion = id === undefined ? undefined : () => void invoke("abrir_notificacion", { id }).catch(console.error);
    encolar(isla, caja, { ...payload, accion });
  }).catch(console.error);

  listen<{ estado: EstadoPermiso }>("notification-access", ({ payload }) => {
    const aviso = avisoPermiso(payload.estado);
    if (aviso) encolar(isla, caja, aviso);
  }).catch(console.error);
}
