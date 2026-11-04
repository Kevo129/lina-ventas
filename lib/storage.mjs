// Almacenamiento de archivos.
// - Con SUPABASE_URL + SUPABASE_SERVICE_KEY: usa Supabase Storage (bucket privado "archivos").
// - Sin ellas: guarda en disco en STORAGE_DIR (por defecto ./almacen), útil en desarrollo.
import fs from 'node:fs/promises';
import path from 'node:path';

const BUCKET = process.env.STORAGE_BUCKET || 'archivos';
const SB_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const LOCAL_DIR = path.resolve(process.env.STORAGE_DIR || './almacen');

export const usaSupabase = Boolean(SB_URL && SB_KEY);

export async function guardarArchivo(ruta, contenido, mime = 'application/octet-stream') {
  if (usaSupabase) {
    const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${encodeURI(ruta)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SB_KEY}`, 'Content-Type': mime, 'x-upsert': 'true' },
      body: contenido,
    });
    if (!res.ok) throw new Error(`Storage ${res.status}: ${await res.text()}`);
    return ruta;
  }
  const destino = path.join(LOCAL_DIR, ruta);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, contenido);
  return ruta;
}

export async function leerArchivo(ruta) {
  if (usaSupabase) {
    const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${encodeURI(ruta)}`, {
      headers: { Authorization: `Bearer ${SB_KEY}` },
    });
    if (!res.ok) throw new Error(`Storage ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const destino = path.join(LOCAL_DIR, ruta);
  if (!destino.startsWith(LOCAL_DIR)) throw new Error('Ruta inválida');
  return fs.readFile(destino);
}

export async function borrarArchivo(ruta) {
  if (usaSupabase) {
    await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${encodeURI(ruta)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${SB_KEY}` },
    });
    return;
  }
  await fs.rm(path.join(LOCAL_DIR, ruta), { force: true });
}
