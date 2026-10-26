// Persistencia local con tauri-plugin-store (archivo isla.json en la carpeta de datos de la app)
import { load, type Store } from "@tauri-apps/plugin-store";

let almacen: Promise<Store> | null = null;

function abrir(): Promise<Store> {
  almacen ??= load("isla.json", { autoSave: 300, defaults: {} });
  return almacen;
}

export async function leer<T>(clave: string, porDefecto: T): Promise<T> {
  try {
    const valor = await (await abrir()).get<T>(clave);
    return valor ?? porDefecto;
  } catch (e) {
    console.error("store:", e);
    return porDefecto;
  }
}

export async function guardar(clave: string, valor: unknown): Promise<void> {
  try {
    await (await abrir()).set(clave, valor);
  } catch (e) {
    console.error("store:", e);
  }
}
