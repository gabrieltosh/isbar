// Comunicación entre las vistas y el núcleo de la isla (main.ts)

export interface PeticionAviso {
  /** Vista a la que saltar (id). Sin vista, solo se expande. */
  vista?: string;
  /** Cuánto tiempo se queda abierta la isla, en ms. */
  duracion?: number;
}

const bus = new EventTarget();

/** Pide que la isla se expanda sola con la animación de aviso. */
export function pedirAviso(p: PeticionAviso = {}): void {
  bus.dispatchEvent(new CustomEvent<PeticionAviso>("aviso", { detail: p }));
}

export function alAviso(fn: (p: PeticionAviso) => void): void {
  bus.addEventListener("aviso", (e) => fn((e as CustomEvent<PeticionAviso>).detail));
}

/** Avisa de que el contenido de la vista compacta puede haber cambiado. */
export function compactaCambiada(): void {
  bus.dispatchEvent(new Event("compacta"));
}

export function alCompacta(fn: () => void): void {
  bus.addEventListener("compacta", fn);
}
