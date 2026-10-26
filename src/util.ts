// Utilidades compartidas por las vistas

/** Milisegundos a "mm:ss" (redondeando hacia arriba, como una cuenta atrás). */
export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Fecha de hoy como "AAAA-MM-DD" en hora local. */
export function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function escapar(texto: string): string {
  const d = document.createElement("div");
  d.textContent = texto;
  return d.innerHTML;
}

const RADIO = 30;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Anillo de progreso circular (rojo para Pomodoro, azul para agua). */
export function anilloSvg(clase: string): string {
  return `<svg class="anillo ${clase}" viewBox="0 0 72 72" aria-hidden="true">
    <circle class="pista" cx="36" cy="36" r="${RADIO}"/>
    <circle class="progreso" cx="36" cy="36" r="${RADIO}" stroke-dasharray="${CIRCUNFERENCIA}"/>
  </svg>`;
}

export function fijarAnillo(svg: Element | null, fraccion: number): void {
  const c = svg?.querySelector<SVGCircleElement>(".progreso");
  if (c) c.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - Math.min(1, Math.max(0, fraccion))));
}

export function $<T extends Element = HTMLElement>(raiz: ParentNode, sel: string): T {
  const el = raiz.querySelector<T>(sel);
  if (!el) throw new Error(`No existe ${sel}`);
  return el;
}
