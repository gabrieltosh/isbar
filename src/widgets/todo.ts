// Vista Tareas: contador hechas/total, añadir, marcar y borrar.
import { getCurrentWindow } from "@tauri-apps/api/window";
import { icono } from "../icons";
import { guardar, leer } from "../store";
import { $, escapar } from "../util";
import type { Vista } from "./tipos";

interface Tarea {
  id: number;
  texto: string;
  hecha: boolean;
}

let tareas: Tarea[] = [];
let raiz: HTMLElement;

function actualizar(nuevas: Tarea[]): void {
  tareas = nuevas;
  void guardar("tareas", tareas);
  pintar();
}

function pintar(): void {
  const hechas = tareas.filter((t) => t.hecha).length;
  $(raiz, ".t-contador").textContent = `${hechas}/${tareas.length}`;
  raiz.classList.toggle("vacia", tareas.length === 0);
  $(raiz, ".t-lista").innerHTML = tareas
    .map(
      (t) => `<li class="${t.hecha ? "hecha" : ""}" data-id="${t.id}">
        <label><input type="checkbox" ${t.hecha ? "checked" : ""}><span>${escapar(t.texto)}</span></label>
        <button class="t-borrar" aria-label="Borrar">${icono.cerrar}</button>
      </li>`,
    )
    .join("");
}

async function mostrarCampo(): Promise<void> {
  raiz.classList.add("escribiendo");
  // La ventana tiene que tener el foco para recibir el teclado
  await getCurrentWindow().setFocus().catch(console.error);
  $<HTMLInputElement>(raiz, ".t-campo").focus();
}

export const tareasVista: Vista = {
  id: "tareas",
  titulo: `Lista de <span class="verde">Tareas</span>`,

  montar(contenedor) {
    raiz = contenedor;
    contenedor.classList.add("tareas");
    contenedor.innerHTML = `
      <div class="t-izq">
        <div class="t-contador grande">0/0</div>
        <div class="sub">Tareas hechas</div>
        <div class="botones">
          <button class="pill claro t-anadir">${icono.mas}Añadir</button>
          <button class="pill plano t-editar">${icono.lapiz}Editar</button>
        </div>
      </div>
      <div class="t-panel">
        <form class="t-form"><input class="t-campo" maxlength="80" placeholder="Nueva tarea…"></form>
        <ul class="t-lista"></ul>
        <div class="t-vacio">${icono.lista}<span>Sin tareas.</span></div>
      </div>`;

    const campo = $<HTMLInputElement>(contenedor, ".t-campo");
    $(contenedor, ".t-anadir").addEventListener("click", () => void mostrarCampo());
    $(contenedor, ".t-editar").addEventListener("click", () => contenedor.classList.toggle("editando"));
    $(contenedor, ".t-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const texto = campo.value.trim();
      if (texto) actualizar([...tareas, { id: Date.now(), texto, hecha: false }]);
      campo.value = "";
    });
    campo.addEventListener("keydown", (e) => {
      if (e.key === "Escape") campo.blur();
    });
    campo.addEventListener("blur", () => {
      if (!campo.value.trim()) contenedor.classList.remove("escribiendo");
    });

    const lista = $(contenedor, ".t-lista");
    lista.addEventListener("change", (e) => {
      const id = Number((e.target as HTMLElement).closest<HTMLElement>("[data-id]")?.dataset.id);
      actualizar(tareas.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t)));
    });
    lista.addEventListener("click", (e) => {
      const boton = (e.target as HTMLElement).closest(".t-borrar");
      const id = Number(boton?.closest<HTMLElement>("[data-id]")?.dataset.id);
      if (boton) actualizar(tareas.filter((t) => t.id !== id));
    });

    pintar();
    void leer<Tarea[]>("tareas", []).then((t) => {
      tareas = t;
      pintar();
    });
  },
};
