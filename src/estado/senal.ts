// Señal simple para que el estado avise a quien lo muestre (la isla o el compañero).

export interface Senal<T> {
  /** Llama a `fn` cada vez que se emita. Devuelve una función para dejar de escuchar. */
  escuchar(fn: (valor: T) => void): () => void;
  emitir(valor: T): void;
}

export function crearSenal<T = void>(): Senal<T> {
  const oyentes = new Set<(valor: T) => void>();
  return {
    escuchar(fn) {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
    emitir(valor) {
      oyentes.forEach((fn) => fn(valor));
    },
  };
}
