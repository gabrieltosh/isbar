// Iconos SVG en línea (usan currentColor para heredar el color del texto)

const svg = (cuerpo: string, vb = "0 0 24 24") =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cuerpo}</svg>`;

export const icono = {
  // Centrada en el viewBox (de y=3 a y≈20.7) para que quede a la altura del texto
  campana: svg(`<path d="M6 14.5V9a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 18.5a2.2 2.2 0 0 0 4 0"/>`),
  izquierda: svg(`<path d="m14.5 6.5-5.5 5.5 5.5 5.5"/>`),
  derecha: svg(`<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>`),
  cronometro: svg(`<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M12 2.5v3.5M18.5 6.5l1.5-1.5"/>`),
  reiniciar: svg(`<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>`),
  taza: svg(`<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>`),
  diana: svg(`<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>`),
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>`,
  pausa: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor"/></svg>`,
  atras: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.5 6v12L3 12zM21 6v12l-8.5-6z" fill="currentColor"/></svg>`,
  adelante: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 6v12L21 12zM3 6v12l8.5-6z" fill="currentColor"/></svg>`,
  letra: svg(`<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>`),
  nota: svg(`<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>`),
  gota: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2c3.3 4 6 7.2 6 10.6a6 6 0 0 1-12 0c0-3.4 2.7-6.6 6-10.6z" fill="currentColor"/></svg>`,
  ajustes: svg(`<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>`),
  bandeja: svg(`<path d="M12 3v8m0 0-3-3m3 3 3-3"/><path d="M3.5 13.5 6 7h2M18 7h-2l2.5 6.5V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-5.5h5a2 2 0 0 0 4 0h5"/>`),
  mas: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 7.5v9M7.5 12h9" stroke="#000" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  lapiz: svg(`<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>`),
  lista: svg(`<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m7.5 9 1.5 1.5L11.5 8M7.5 15l1.5 1.5 2.5-2.5M14 9.5h3M14 15.5h3"/>`),
  cerrar: svg(`<path d="M7 7l10 10M17 7 7 17"/>`),
  engranaje: svg(`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`),
  calendario: svg(`<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="8.5" cy="14.5" r=".6" fill="currentColor"/><circle cx="12" cy="14.5" r=".6" fill="currentColor"/>`),
  // Destello de ocho puntas para la vista de uso de Claude
  claude: svg(`<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/>`),
  // Pausas activas: persona estirando los brazos, ojo y "hecho"
  postura: svg(`<circle cx="12" cy="4.5" r="2"/><path d="M6.5 3.5 12 9l5.5-5.5M12 9v6.5M12 15.5 8.5 21M12 15.5l3.5 5.5"/>`),
  ojo: svg(`<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`),
  detener: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2.2" fill="currentColor"/></svg>`,
  hecho: svg(`<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>`),
  archivo: svg(`<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>`),
};

/** Indicador de barras (ecualizador). Animado cuando hay música sonando. */
export function barras(animadas: boolean): string {
  return `<span class="barras${animadas ? " sonando" : ""}"><i></i><i></i><i></i><i></i><i></i></span>`;
}
