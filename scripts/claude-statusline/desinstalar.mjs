// Quita la barra de estado de la isla de Claude Code y deja la que hubiera antes.
//
// Uso: node scripts/claude-statusline/desinstalar.mjs
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DESTINO = join(homedir(), ".isla", "claude-statusline");
const AJUSTES = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "settings.json");
const ARCHIVO_ANTERIOR = join(DESTINO, "anterior.json");

const ajustes = existsSync(AJUSTES) ? JSON.parse(readFileSync(AJUSTES, "utf8")) : {};
const nuestro = ajustes.statusLine?.command?.includes("isla-statusline");

if (nuestro) {
  const anterior = existsSync(ARCHIVO_ANTERIOR) ? JSON.parse(readFileSync(ARCHIVO_ANTERIOR, "utf8")) : null;
  if (anterior?.statusLine) {
    ajustes.statusLine = anterior.statusLine;
    console.log(`Restaurada la barra de estado anterior: ${anterior.comando}`);
  } else {
    delete ajustes.statusLine;
    console.log("No había barra de estado anterior: se quita la de la isla.");
  }
  writeFileSync(AJUSTES, `${JSON.stringify(ajustes, null, 2)}\n`);
} else {
  console.log("La barra de estado de la isla no estaba configurada en Claude Code.");
}

rmSync(DESTINO, { recursive: true, force: true });
console.log("Listo.");
