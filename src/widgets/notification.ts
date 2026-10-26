// Notificaciones del sistema. Llegan desde Rust (notifications.rs, Fase 4) con `notification-new`.
// Se muestran encima de las vistas ~5 s y, si llegan varias seguidas, se encolan.
import { listen } from "@tauri-apps/api/event";
import { pedirAviso } from "../bus";
import { escapar } from "../util";
import { musicaSonando } from "./media";

export interface Notificacion {
  app: string;
  /** Icono de la app como data URL, o null */
  icono: string | null;
  titulo: string;
  texto: string;
}

const DURACION = 5000;
// Apps cuya notificación ya se ve en la vista de música
const REPRODUCTORES = /spotify|music|música|media player|reproductor/i;

const cola: Notificacion[] = [];
let mostrando = false;

function siguiente(isla: HTMLElement, caja: HTMLElement): void {
  const n = cola.shift();
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
  isla.classList.add("con-notificacion");
  pedirAviso({ duracion: DURACION });
  window.setTimeout(() => siguiente(isla, caja), DURACION);
}

export function iniciarNotificaciones(isla: HTMLElement, caja: HTMLElement): void {
  listen<Notificacion>("notification-new", ({ payload }) => {
    if (musicaSonando() && REPRODUCTORES.test(payload.app)) return;
    cola.push(payload);
    if (!mostrando) siguiente(isla, caja);
  }).catch(console.error);
}
