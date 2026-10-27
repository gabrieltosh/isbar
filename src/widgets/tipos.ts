/** Lo que una vista quiere mostrar en la píldora compacta (cada campo es HTML). */
export interface Compacta {
  izq?: string;
  centro?: string;
  der?: string;
}

export interface Vista {
  id: string;
  /** Título de la cabecera (HTML). Vacío si la vista ocupa esa zona. */
  titulo: string;
  montar(contenedor: HTMLElement): void;
  /** Contenido para la vista compacta, o null si no tiene nada que mostrar. */
  compacta?(): Compacta | null;
  /** Alto que necesita la isla expandida ahora mismo (px), o null para el normal. */
  alto?(): number | null;
}
