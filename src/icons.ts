// Iconos SVG en línea (usan currentColor para heredar el color del texto)

const svg = (cuerpo: string, vb = "0 0 24 24") =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cuerpo}</svg>`;

export const icono = {
  estado: `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8.9 3.9 5.6 8.7h2.5l-.9 3.4 3.3-4.9H8z" fill="currentColor"/></svg>`,
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
  archivo: svg(`<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>`),
};

/** Indicador de barras (ecualizador). Animado cuando hay música sonando. */
export function barras(animadas: boolean): string {
  return `<span class="barras${animadas ? " sonando" : ""}"><i></i><i></i><i></i><i></i><i></i></span>`;
}
