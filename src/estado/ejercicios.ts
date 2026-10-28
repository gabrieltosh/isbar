// Ejercicios de las pausas activas: estiramientos para la postura y descanso para la vista.
// Recomendaciones generales de ergonomía para trabajo frente al ordenador; se hacen con
// suavidad y sin dolor. No sustituyen el consejo de un profesional de la salud.

export type TipoPausa = "postura" | "vista";

export interface Ejercicio {
  id: string;
  nombre: string;
  /** Pasos que se muestran uno tras otro, cada uno con su cuenta atrás */
  pasos: { texto: string; segundos: number }[];
}

export const EJERCICIOS: Record<TipoPausa, Ejercicio[]> = {
  postura: [
    {
      id: "cuello-lateral",
      nombre: "Cuello lateral",
      pasos: [
        { texto: "Siéntate recto y deja caer la oreja derecha hacia el hombro, sin subirlo.", segundos: 15 },
        { texto: "Vuelve al centro y repite hacia el lado izquierdo.", segundos: 15 },
      ],
    },
    {
      id: "hombros",
      nombre: "Círculos de hombros",
      pasos: [
        { texto: "Sube los hombros hacia las orejas y hazlos rodar hacia atrás, despacio.", segundos: 15 },
        { texto: "Ahora hacia delante, con movimientos amplios.", segundos: 10 },
      ],
    },
    {
      id: "barbilla",
      nombre: "Retracción de barbilla",
      pasos: [
        {
          texto: "Mirando al frente, lleva la barbilla hacia atrás como si hicieras papada. Mantén 5 s y suelta.",
          segundos: 25,
        },
      ],
    },
    {
      id: "pecho",
      nombre: "Apertura de pecho",
      pasos: [
        { texto: "Entrelaza las manos detrás de la espalda y estira los brazos.", segundos: 5 },
        { texto: "Abre el pecho y junta los omóplatos, mirando al frente. Respira hondo.", segundos: 20 },
      ],
    },
    {
      id: "torsion",
      nombre: "Torsión sentado",
      pasos: [
        { texto: "Con los pies en el suelo, gira el tronco a la derecha apoyando la mano en el respaldo.", segundos: 15 },
        { texto: "Vuelve al centro y gira hacia la izquierda.", segundos: 15 },
      ],
    },
    {
      id: "munecas",
      nombre: "Muñecas y antebrazos",
      pasos: [
        { texto: "Estira el brazo derecho con la palma hacia fuera y tira suavemente de los dedos hacia ti.", segundos: 15 },
        { texto: "Cambia al brazo izquierdo.", segundos: 15 },
      ],
    },
    {
      id: "de-pie",
      nombre: "Estiramiento de pie",
      pasos: [
        { texto: "Ponte de pie, entrelaza las manos y estira los brazos hacia arriba, creciendo.", segundos: 15 },
        { texto: "Inclínate un poco a cada lado sin doblar el tronco hacia delante.", segundos: 15 },
      ],
    },
    {
      id: "espalda-baja",
      nombre: "Espalda baja",
      pasos: [
        {
          texto: "Sentado al borde de la silla, deja caer el tronco hacia delante entre las rodillas y relaja el cuello.",
          segundos: 20,
        },
        { texto: "Sube despacio, vértebra a vértebra.", segundos: 8 },
      ],
    },
  ],
  vista: [
    {
      id: "20-20-20",
      nombre: "Regla 20-20-20",
      pasos: [{ texto: "Mira algo que esté a unos 6 metros (por la ventana, el fondo de la sala).", segundos: 20 }],
    },
    {
      id: "parpadeo",
      nombre: "Parpadeo consciente",
      pasos: [{ texto: "Parpadea despacio y por completo, cerrando bien los párpados, unas 10 veces.", segundos: 15 }],
    },
    {
      id: "palming",
      nombre: "Palming",
      pasos: [
        { texto: "Frota las palmas hasta que estén tibias.", segundos: 5 },
        { texto: "Cubre los ojos cerrados con las palmas, sin presionar, y respira tranquilo.", segundos: 25 },
      ],
    },
    {
      id: "cerca-lejos",
      nombre: "Enfoque cerca y lejos",
      pasos: [
        {
          texto: "Pon el pulgar a un palmo de la cara y enfócalo; luego mira un objeto lejano. Alterna sin prisa.",
          segundos: 25,
        },
      ],
    },
    {
      id: "movimientos",
      nombre: "Movimientos oculares",
      pasos: [
        { texto: "Sin mover la cabeza, mira arriba, abajo, a la izquierda y a la derecha, despacio.", segundos: 15 },
        { texto: "Dibuja un ocho grande con la mirada, en un sentido y luego en el otro.", segundos: 15 },
      ],
    },
  ],
};

/** Cuántos ejercicios entran en cada pausa. */
const POR_PAUSA: Record<TipoPausa, number> = { postura: 4, vista: 3 };

/**
 * Elige los ejercicios de una pausa rotando por la lista, para no repetir siempre los mismos.
 * En la vista, la regla 20-20-20 va siempre la primera.
 */
export function elegirRutina(tipo: TipoPausa, turno: number): Ejercicio[] {
  const lista = EJERCICIOS[tipo];
  if (tipo === "vista") {
    const [fija, ...resto] = lista;
    return [fija, ...rotar(resto, turno, POR_PAUSA.vista - 1)];
  }
  return rotar(lista, turno, POR_PAUSA.postura);
}

function rotar<T>(lista: T[], turno: number, cuantos: number): T[] {
  const inicio = (turno * cuantos) % lista.length;
  return Array.from({ length: Math.min(cuantos, lista.length) }, (_, i) => lista[(inicio + i) % lista.length]);
}
