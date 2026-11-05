#!/usr/bin/env node
// Paso 1 de la migración: descarga TODO de Airtable a ./migracion/datos
//   - un JSON por tabla (respaldo completo, aunque se borre Airtable)
//   - todos los adjuntos (PDFs de cotizaciones, fotos, fichas, OCs, facturas, pedimentos)
//
// Uso:  AIRTABLE_TOKEN=pat_xxx node migracion/exportar.mjs
// El token se crea en https://airtable.com/create/tokens con permisos
// data.records:read y schema.bases:read, con acceso a "Base de Ventas".

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_ID, T, ADJUNTOS, nombreLocal } from './airtable-campos.mjs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'datos');
const TOKEN = process.env.AIRTABLE_TOKEN;
if (!TOKEN) {
  console.error('Falta AIRTABLE_TOKEN. Ejemplo: AIRTABLE_TOKEN=pat_xxx node migracion/exportar.mjs');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(url, intento = 1) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (res.status === 429 && intento < 6) { await sleep(30000); return api(url, intento + 1); }
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
  return res.json();
}

async function descargarTabla(nombre, tableId) {
  const registros = [];
  let offset;
  do {
    const u = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`);
    u.searchParams.set('pageSize', '100');
    u.searchParams.set('returnFieldsByFieldId', 'true');
    if (offset) u.searchParams.set('offset', offset);
    const data = await api(u);
    registros.push(...data.records);
    offset = data.offset;
    process.stdout.write(`\r  ${nombre}: ${registros.length}`);
    await sleep(220); // límite de Airtable: 5 req/s
  } while (offset);
  process.stdout.write('\n');
  await fs.writeFile(path.join(DIR, `${nombre}.json`), JSON.stringify(registros, null, 1));
  return registros;
}

async function descargarAdjunto(att) {
  const destino = path.join(DIR, 'adjuntos', nombreLocal(att));
  try { await fs.access(destino); return 'ya'; } catch {}
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(att.url);
      if (!res.ok) throw new Error(String(res.status));
      await fs.writeFile(destino, Buffer.from(await res.arrayBuffer()));
      return 'ok';
    } catch (e) {
      if (i === 3) return `error ${e.message}`;
      await sleep(1000 * i);
    }
  }
}

async function main() {
  await fs.mkdir(path.join(DIR, 'adjuntos'), { recursive: true });
  console.log('Descargando tablas de Airtable…');
  const datos = {};
  for (const [nombre, id] of Object.entries(T)) datos[nombre] = await descargarTabla(nombre, id);

  // Esquema (por si se requiere auditar después)
  const esquema = await api(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`);
  await fs.writeFile(path.join(DIR, '_esquema.json'), JSON.stringify(esquema, null, 1));

  // Adjuntos — los links de Airtable caducan en ~2 horas, por eso se descargan aquí mismo
  const lista = [];
  for (const [tabla, campo] of ADJUNTOS)
    for (const r of datos[tabla]) for (const att of r.fields[campo] ?? []) lista.push(att);
  console.log(`Descargando ${lista.length} adjuntos…`);
  const errores = [];
  let n = 0;
  const cola = [...lista];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cola.length) {
      const att = cola.shift();
      const r = await descargarAdjunto(att);
      if (r.startsWith('error')) errores.push(`${att.filename}: ${r}`);
      process.stdout.write(`\r  ${++n}/${lista.length}`);
    }
  }));
  process.stdout.write('\n');
  if (errores.length) {
    await fs.writeFile(path.join(DIR, '_errores_adjuntos.txt'), errores.join('\n'));
    console.warn(`⚠ ${errores.length} adjuntos fallaron (ver migracion/datos/_errores_adjuntos.txt). Vuelve a correr el script: solo reintenta los que faltan.`);
  }

  const resumen = Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, v.length]));
  resumen.adjuntos = lista.length - errores.length;
  resumen.fecha = new Date().toISOString();
  await fs.writeFile(path.join(DIR, '_resumen.json'), JSON.stringify(resumen, null, 1));
  console.log('Listo:', resumen);
}

main().catch((e) => { console.error(e); process.exit(1); });
