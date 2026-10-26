// Vista Bandeja: suelta archivos sobre la isla para tenerlos a mano y abrirlos con un clic.
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { openPath } from "@tauri-apps/plugin-opener";
import { pedirAviso } from "../bus";
import { icono } from "../icons";
import { guardar, leer } from "../store";
import { $, escapar } from "../util";
import type { Vista } from "./tipos";

let archivos: string[] = [];
let raiz: HTMLElement;

const nombre = (ruta: string) => ruta.split(/[\\/]/).pop() ?? ruta;

function pintar(): void {
  raiz.classList.toggle("con-archivos", archivos.length > 0);
  $(raiz, ".b-lista").innerHTML = archivos
    .map(
      (r, i) => `<li title="${escapar(r)}" data-i="${i}">${icono.archivo}<span>${escapar(nombre(r))}</span>
        <button class="b-quitar" data-quitar="${i}" aria-label="Quitar">${icono.cerrar}</button></li>`,
    )
    .join("");
}

function actualizar(nuevos: string[]): void {
  archivos = nuevos;
  void guardar("bandeja", archivos);
  pintar();
}

export const bandeja: Vista = {
  id: "bandeja",
  titulo: "Bandeja",

  montar(contenedor) {
    raiz = contenedor;
    contenedor.classList.add("bandeja");
    contenedor.innerHTML = `
      <div class="b-zona">
        <div class="b-vacia">
          <span class="b-icono">${icono.bandeja}</span>
          <b>Suelta archivos aquí</b>
          <small>Se quedan en la bandeja · clic para abrir</small>
        </div>
        <ul class="b-lista"></ul>
      </div>`;

    $(contenedor, ".b-lista").addEventListener("click", (e) => {
      const objetivo = e.target as HTMLElement;
      const quitar = objetivo.closest<HTMLElement>("[data-quitar]");
      if (quitar) {
        actualizar(archivos.filter((_, i) => i !== Number(quitar.dataset.quitar)));
        return;
      }
      const item = objetivo.closest<HTMLElement>("[data-i]");
      const ruta = item ? archivos[Number(item.dataset.i)] : undefined;
      if (ruta) openPath(ruta).catch(console.error);
    });

    getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
        if (payload.type === "enter") {
          contenedor.classList.add("soltando");
          pedirAviso({ vista: "bandeja", duracion: 4000 });
        } else if (payload.type === "leave") {
          contenedor.classList.remove("soltando");
        } else if (payload.type === "drop") {
          contenedor.classList.remove("soltando");
          actualizar([...archivos, ...payload.paths.filter((p) => !archivos.includes(p))]);
        }
      })
      .catch(console.error);

    pintar();
    void leer<string[]>("bandeja", []).then((a) => {
      archivos = a;
      pintar();
    });
  },
};
