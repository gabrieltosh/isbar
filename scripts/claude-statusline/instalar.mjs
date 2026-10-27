// Instala la barra de estado de la isla en Claude Code.
//
// - Copia isla-statusline.mjs a %USERPROFILE%\.isla\claude-statusline (ruta estable, fuera de
//   AppData para que Windows no la redirija en apps empaquetadas).
// - Guarda la barra de estado que hubiera antes para seguir ejecutándola (no se pierde).
// - Hace una copia de seguridad de ~/.claude/settings.json y cambia solo "statusLine".
//
// Uso: node scripts/claude-statusline/instalar.mjs
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DESTINO = join(homedir(), ".isla", "claude-statusline");
const AJUSTES = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "settings.json");
const LANZADOR = join(DESTINO, "isla-statusline.cmd");
const COMANDO = LANZADOR.replaceAll("\\", "/");

mkdirSync(DESTINO, { recursive: true });
copyFileSync(join(AQUI, "isla-statusline.mjs"), join(DESTINO, "isla-statusline.mjs"));
// Claude Code ejecuta el comando con la consola; el .cmd llama a node con el script
writeFileSync(LANZADOR, '@echo off\r\nnode "%~dp0isla-statusline.mjs"\r\n');

const texto = existsSync(AJUSTES) ? readFileSync(AJUSTES, "utf8") : "{}";
const ajustes = JSON.parse(texto);
const actual = ajustes.statusLine?.command;

// Un comando de una instalación anterior de la isla no es "la barra anterior"
const esDeLaIsla = (comando) => comando?.includes("isla-statusline");

if (actual && actual !== COMANDO && !esDeLaIsla(actual)) {
  // La barra anterior se sigue ejecutando desde nuestro script
  writeFileSync(join(DESTINO, "anterior.json"), JSON.stringify({ comando: actual, statusLine: ajustes.statusLine }, null, 2));
  console.log(`Barra de estado anterior conservada: ${actual}`);
}

if (actual !== COMANDO) {
  writeFileSync(`${AJUSTES}.isla-backup`, texto);
  ajustes.statusLine = { ...(ajustes.statusLine ?? {}), type: "command", command: COMANDO };
  writeFileSync(AJUSTES, `${JSON.stringify(ajustes, null, 2)}\n`);
  console.log(`Copia de seguridad: ${AJUSTES}.isla-backup`);
}

console.log(`Barra de estado de la isla instalada: ${COMANDO}`);
console.log("Los datos aparecerán en la isla tras la próxima respuesta de Claude Code.");
