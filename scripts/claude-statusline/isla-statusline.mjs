// Barra de estado de Claude Code para la isla.
//
// Claude Code ejecuta este script cada vez que actualiza su barra de estado y le pasa
// por stdin un JSON con datos de la sesión (ver https://code.claude.com/docs/en/statusline).
// El script:
//   1. Guarda los datos de uso que muestra la isla en %USERPROFILE%\.isla\claude-uso.json.
//   2. Si antes había otra barra de estado configurada, le pasa el mismo JSON y muestra su salida,
//      así esa herramienta sigue funcionando igual. Si no había ninguna, muestra un resumen propio.
//
// No lee ni toca credenciales: solo usa los datos que Claude Code le da a su barra de estado.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
// Fuera de AppData a propósito: Windows redirige AppData en las apps empaquetadas
// (la isla y la app de Claude lo son) y cada una vería una carpeta distinta
const CARPETA_ISLA = join(homedir(), ".isla");
const ARCHIVO_USO = join(CARPETA_ISLA, "claude-uso.json");
// Lo escribe instalar.mjs con la barra de estado que había antes
const ARCHIVO_ANTERIOR = join(AQUI, "anterior.json");
const ESPERA_ANTERIOR_MS = 4000;

function leerEntrada() {
  return new Promise((resolver) => {
    let texto = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (trozo) => (texto += trozo));
    process.stdin.on("end", () => resolver(texto));
    process.stdin.on("error", () => resolver(texto));
  });
}

function leerJson(ruta) {
  try {
    return JSON.parse(readFileSync(ruta, "utf8"));
  } catch {
    return null;
  }
}

/** Ventana de límite: { porcentaje, reinicio (epoch ms) } o null. */
function ventana(v) {
  if (!v || typeof v.used_percentage !== "number") return null;
  return {
    porcentaje: v.used_percentage,
    reinicio: typeof v.resets_at === "number" ? v.resets_at * 1000 : null,
  };
}

/** Conserva una ventana anterior si el JSON nuevo no la trae y aún no se ha reiniciado. */
function conservar(nueva, vieja) {
  if (nueva) return nueva;
  if (vieja && (vieja.reinicio === null || vieja.reinicio > Date.now())) return vieja;
  return null;
}

function guardarUso(datos) {
  const previo = leerJson(ARCHIVO_USO);
  const uso = {
    actualizado: Date.now(),
    modelo: datos.model?.display_name ?? null,
    costeSesion: typeof datos.cost?.total_cost_usd === "number" ? datos.cost.total_cost_usd : null,
    contexto:
      typeof datos.context_window?.used_percentage === "number" ? datos.context_window.used_percentage : null,
    cincoHoras: conservar(ventana(datos.rate_limits?.five_hour), previo?.cincoHoras),
    semanal: conservar(ventana(datos.rate_limits?.seven_day), previo?.semanal),
  };
  mkdirSync(CARPETA_ISLA, { recursive: true });
  // Escritura atómica: la isla nunca lee un archivo a medias
  const temporal = `${ARCHIVO_USO}.${process.pid}.tmp`;
  writeFileSync(temporal, JSON.stringify(uso));
  renameSync(temporal, ARCHIVO_USO);
  return uso;
}

function resumen(uso) {
  const partes = [];
  if (uso.modelo) partes.push(uso.modelo);
  if (uso.cincoHoras) partes.push(`5 h ${Math.round(uso.cincoHoras.porcentaje)} %`);
  if (uso.semanal) partes.push(`semana ${Math.round(uso.semanal.porcentaje)} %`);
  if (uso.costeSesion !== null) partes.push(`$${uso.costeSesion.toFixed(2)}`);
  return partes.join(" · ");
}

/** Ejecuta la barra de estado anterior con la misma entrada; su salida es la que se muestra. */
function ejecutarAnterior(comando, entrada) {
  return new Promise((resolver) => {
    const proceso = spawn(comando, { shell: true, stdio: ["pipe", "inherit", "inherit"], windowsHide: true });
    const limite = setTimeout(() => {
      proceso.kill();
      resolver();
    }, ESPERA_ANTERIOR_MS);
    proceso.on("error", () => resolver());
    proceso.on("exit", () => {
      clearTimeout(limite);
      resolver();
    });
    proceso.stdin.on("error", () => {});
    proceso.stdin.end(entrada);
  });
}

const entrada = await leerEntrada();
let uso = null;
try {
  uso = guardarUso(JSON.parse(entrada));
} catch {
  // Entrada vacía o no válida: no se guarda nada, pero la barra anterior se ejecuta igual
}

const anterior = existsSync(ARCHIVO_ANTERIOR) ? leerJson(ARCHIVO_ANTERIOR)?.comando : null;
if (anterior) {
  await ejecutarAnterior(anterior, entrada);
} else if (uso) {
  process.stdout.write(resumen(uso));
}
