#!/usr/bin/env node
// Paso 2 de la migración: carga ./migracion/datos (generado por exportar.mjs) a Postgres.
//
// Uso:  DATABASE_URL=postgres://... node migracion/importar.mjs [--sin-adjuntos]
// Corre todo en una sola transacción: si algo falla, la base queda como estaba.
// Requiere la base VACÍA (recién creada con db/001 y db/002).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { F, ADJUNTOS, nombreLocal } from './airtable-campos.mjs';
import { guardarArchivo } from '../lib/storage.mjs';

const DIR = process.env.DATOS_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), 'datos');
const SIN_ADJUNTOS = process.argv.includes('--sin-adjuntos');
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

const leer = async (n) => JSON.parse(await fs.readFile(path.join(DIR, `${n}.json`), 'utf8'));
const txt = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const uno = (v) => (Array.isArray(v) && v.length ? v[0] : null);           // primer link
const sel = (v) => (v && typeof v === 'object' ? v.name : txt(v));        // singleSelect
const sinValor = (v) => !v || /^n\/?a$/i.test(String(v).trim());          // "N/A"

// Normaliza nombres de proveedor para unir "Sunbird" con "Sunbird S.A. de C.V.", etc.
const normProv = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/,/g, '.').replace(/\bs\.?\s*a\.?\s*(de\s*)?c\.?\s*v\.?/g, '')
  .replace(/[^a-z0-9+&]+/g, ' ').trim();

async function main() {
  const d = {};
  for (const n of ['cuentas', 'clientes', 'productos', 'ordenes', 'cotizaciones', 'pedidos', 'importaciones'])
    d[n] = await leer(n);
  console.log('Registros leídos:', Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.length])));

  const reporte = { advertencias: [] };
  const warn = (m) => reporte.advertencias.push(m);

  await sql.begin(async (tx) => {
    const [{ n }] = await tx`select count(*)::int n from cotizaciones`;
    if (n > 0) throw new Error('La base ya tiene cotizaciones. La importación requiere una base vacía.');

    const map = { cuentas: {}, clientes: {}, productos: {}, ordenes: {}, cotizaciones: {}, importaciones: {}, usuarios: {}, proveedores: {} };

    // ---------- proveedores (unión de "Marca" de productos y "Proveedor" de OCs) ----------
    const provNombres = new Map(); // norm -> nombre a mostrar
    const addProv = (nombre) => {
      if (!nombre || sinValor(nombre)) return;
      const k = normProv(nombre);
      if (!provNombres.has(k) || nombre.length < provNombres.get(k).length) provNombres.set(k, nombre.trim());
    };
    d.productos.forEach((r) => addProv(sel(r.fields[F.productos.marca])));
    d.ordenes.forEach((r) => addProv(sel(r.fields[F.ordenes.proveedor])));
    for (const [k, nombre] of provNombres) {
      const [row] = await tx`insert into proveedores (nombre) values (${nombre}) returning id`;
      map.proveedores[k] = row.id;
    }
    const provId = (nombre) => (nombre && !sinValor(nombre) ? map.proveedores[normProv(nombre)] ?? null : null);

    // ---------- usuarios (vendedores colaboradores de Airtable) ----------
    for (const r of d.cotizaciones) {
      const v = r.fields[F.cotizaciones.vendedor];
      if (v?.email && !map.usuarios[v.id]) {
        const [row] = await tx`
          insert into usuarios (nombre, email, airtable_id, rol)
          values (${v.name || v.email}, ${v.email.toLowerCase()}, ${v.id}, 'ventas')
          on conflict (email) do update set airtable_id = excluded.airtable_id
          returning id`;
        map.usuarios[v.id] = row.id;
      }
    }

    // ---------- cuentas ----------
    for (const r of d.cuentas) {
      const nombre = txt(r.fields[F.cuentas.nombre]) ?? '(sin nombre)';
      const [row] = await tx`insert into cuentas (nombre, airtable_id) values (${nombre}, ${r.id}) returning id`;
      map.cuentas[r.id] = row.id;
    }

    // ---------- contactos ----------
    for (const r of d.clientes) {
      const f = r.fields;
      const inst = f[F.clientes.institucion] ?? [];
      if (inst.length > 1) warn(`Contacto ${r.id} tenía ${inst.length} instituciones; se usó la primera.`);
      const [row] = await tx`
        insert into contactos (nombre, apellido, telefono, correo, cuenta_id, rfc, direccion_entrega, airtable_id)
        values (${txt(f[F.clientes.nombre]) ?? '(sin nombre)'}, ${txt(f[F.clientes.apellido])},
                ${txt(f[F.clientes.telefono])}, ${txt(f[F.clientes.correo])},
                ${map.cuentas[inst[0]] ?? null}, ${txt(f[F.clientes.rfc])},
                ${txt(f[F.clientes.direccion])}, ${r.id})
        returning id`;
      map.clientes[r.id] = row.id;
    }

    // ---------- productos ----------
    for (const r of d.productos) {
      const f = r.fields;
      const [row] = await tx`
        insert into productos (nombre, codigo, proveedor_id, airtable_id)
        values (${txt(f[F.productos.nombre]) ?? '(sin nombre)'}, ${txt(f[F.productos.codigo])},
                ${provId(sel(f[F.productos.marca]))}, ${r.id})
        returning id`;
      map.productos[r.id] = row.id;
    }

    // ---------- importaciones ----------
    const pedimentosVistos = new Set();
    for (const r of d.importaciones) {
      const f = r.fields;
      let ped = txt(f[F.importaciones.pedimento]) ?? `SIN-PEDIMENTO-${r.id}`;
      if (pedimentosVistos.has(ped)) { warn(`Pedimento duplicado "${ped}" (${r.id}); se renombró.`); ped = `${ped} (${r.id})`; }
      pedimentosVistos.add(ped);
      const [row] = await tx`
        insert into importaciones (pedimento, aduana, fecha_importacion, airtable_id)
        values (${ped}, ${sinValor(sel(f[F.importaciones.aduana])) ? null : sel(f[F.importaciones.aduana])},
                ${f[F.importaciones.fecha] ?? null}, ${r.id})
        returning id`;
      map.importaciones[r.id] = row.id;
    }

    // ---------- órdenes de compra + pago migrado ----------
    const foliosOC = new Set();
    for (const r of d.ordenes) {
      const f = r.fields;
      let folio = txt(f[F.ordenes.folio]) ?? `OC-${r.id}`;
      if (foliosOC.has(folio)) { warn(`Folio de OC duplicado "${folio}" (${r.id}); se renombró.`); folio = `${folio} (${r.id})`; }
      foliosOC.add(folio);
      const total = num(f[F.ordenes.total]) ?? 0;
      const [row] = await tx`
        insert into ordenes_compra (folio, referencia_proveedor, fecha, proveedor_id, total, moneda, airtable_id)
        values (${folio}, ${txt(f[F.ordenes.referencia])}, ${f[F.ordenes.fecha] ?? null},
                ${provId(sel(f[F.ordenes.proveedor]))}, ${total}, ${sel(f[F.ordenes.moneda]) ?? 'USD'}, ${r.id})
        returning id`;
      map.ordenes[r.id] = row.id;
      const pagado = num(f[F.ordenes.pagado]);
      if (pagado) await tx`
        insert into pagos_proveedor (orden_compra_id, fecha, monto, metodo, notas)
        values (${row.id}, ${f[F.ordenes.fecha] ?? r.createdTime.slice(0, 10)}, ${pagado}, 'Migrado',
                'Monto pagado registrado en Airtable al momento de la migración')`;
    }

    // ---------- cotizaciones + pago migrado ----------
    const foliosCot = new Set();
    for (const r of d.cotizaciones) {
      const f = r.fields;
      let folio = txt(f[F.cotizaciones.folio]) ?? `COT-${r.id}`;
      if (foliosCot.has(folio)) { warn(`Folio de cotización duplicado "${folio}" (${r.id}); se renombró.`); folio = `${folio} (${r.id})`; }
      foliosCot.add(folio);
      const cliente = f[F.cotizaciones.cliente] ?? [];
      if (!cliente.length) warn(`Cotización ${folio} no tiene cliente.`);
      const fecha = f[F.cotizaciones.fecha] ?? r.createdTime.slice(0, 10);
      const canal = /^MELI/i.test(folio) ? 'Mercado Libre' : 'Directo';
      const [row] = await tx`
        insert into cotizaciones (folio, contacto_id, fecha, estado, total, moneda, vendedor_id, canal, airtable_id)
        values (${folio}, ${map.clientes[cliente[0]] ?? null}, ${fecha}, 'ganada',
                ${num(f[F.cotizaciones.total]) ?? 0}, ${sel(f[F.cotizaciones.moneda]) ?? 'MXN'},
                ${map.usuarios[f[F.cotizaciones.vendedor]?.id] ?? null}, ${canal}, ${r.id})
        returning id`;
      map.cotizaciones[r.id] = row.id;
      const pagado = num(f[F.cotizaciones.pagado]);
      if (pagado) await tx`
        insert into pagos (cotizacion_id, fecha, monto, metodo, notas)
        values (${row.id}, ${fecha}, ${pagado}, 'Migrado',
                'Monto cobrado registrado en Airtable al momento de la migración')`;
    }

    // ---------- partidas + envíos (agrupados por cotización/paquetería/guía/fecha) ----------
    const envios = new Map();
    let sinProducto = 0;
    for (const r of d.pedidos) {
      const f = r.fields;
      const cotId = map.cotizaciones[uno(f[F.pedidos.cotizacion])] ?? null;
      const prodId = map.productos[uno(f[F.pedidos.producto])] ?? null;
      if (!prodId) sinProducto++;
      const paq = sel(f[F.pedidos.paqueteria]);
      const guia = sinValor(f[F.pedidos.guia]) ? null : txt(f[F.pedidos.guia]);
      const fEnvio = f[F.pedidos.fechaEnvio] ?? null;
      let envioId = null;
      if (paq || guia || fEnvio) {
        const k = [cotId, paq, guia, fEnvio].join('|');
        if (!envios.has(k)) {
          const [e] = await tx`
            insert into envios (cotizacion_id, paqueteria, guia, fecha_envio)
            values (${cotId}, ${paq}, ${guia}, ${fEnvio}) returning id`;
          envios.set(k, e.id);
        }
        envioId = envios.get(k);
      }
      await tx`
        insert into partidas (cotizacion_id, producto_id, cantidad, costo_unitario, orden_compra_id,
                              importacion_id, recibido, entregado, envio_id, airtable_id)
        values (${cotId}, ${prodId}, ${num(f[F.pedidos.cantidad]) ?? 0}, ${num(f[F.pedidos.costo])},
                ${map.ordenes[uno(f[F.pedidos.orden])] ?? null},
                ${map.importaciones[uno(f[F.pedidos.pedimento])] ?? null},
                ${Boolean(f[F.pedidos.recibido])}, ${Boolean(f[F.pedidos.entregado])}, ${envioId}, ${r.id})`;
    }
    if (sinProducto) warn(`${sinProducto} partidas no tenían producto ligado.`);
    reporte.envios = envios.size;

    // ---------- adjuntos ----------
    if (!SIN_ADJUNTOS) {
      const tablaMap = { cotizaciones: map.cotizaciones, productos: map.productos, ordenes: map.ordenes, importaciones: map.importaciones };
      let ok = 0, faltan = 0;
      for (const [tabla, campo, entidad, campoDestino] of ADJUNTOS) {
        for (const r of d[tabla]) {
          for (const att of r.fields[campo] ?? []) {
            const local = path.join(DIR, 'adjuntos', nombreLocal(att));
            let buf;
            try { buf = await fs.readFile(local); } catch { faltan++; continue; }
            const entidadId = tablaMap[tabla][r.id];
            const ruta = `${entidad}/${entidadId}/${att.id}-${att.filename.replace(/[^\w.\-]+/g, '_')}`;
            await guardarArchivo(ruta, buf, att.type);
            await tx`
              insert into archivos (entidad, entidad_id, campo, nombre, ruta, mime, tamano, airtable_id)
              values (${entidad}, ${entidadId}, ${campoDestino}, ${att.filename}, ${ruta}, ${att.type ?? null},
                      ${att.size ?? buf.length}, ${att.id})`;
            ok++;
          }
        }
      }
      reporte.adjuntos = { cargados: ok, no_encontrados: faltan };
      if (faltan) warn(`${faltan} adjuntos no estaban descargados; vuelve a correr exportar.mjs.`);
    }
  });

  // ---------- verificación contra Airtable ----------
  const [c] = await sql`
    select (select count(*)::int from cuentas) cuentas, (select count(*)::int from contactos) contactos,
           (select count(*)::int from productos) productos, (select count(*)::int from cotizaciones) cotizaciones,
           (select count(*)::int from partidas) partidas, (select count(*)::int from ordenes_compra) ordenes_compra,
           (select count(*)::int from importaciones) importaciones,
           (select coalesce(sum(total),0)::float from cotizaciones) suma_total_cot,
           (select coalesce(sum(saldo_pendiente),0)::float from v_cotizaciones) suma_saldo_cot,
           (select coalesce(sum(saldo_pendiente),0)::float from v_ordenes_compra) suma_saldo_oc`;
  const sumaAT = (arr, fT, fP) => arr.reduce((a, r) => a + (num(r.fields[fT]) ?? 0) - (fP ? num(r.fields[fP]) ?? 0 : 0), 0);
  const esperado = {
    cuentas: d.cuentas.length, contactos: d.clientes.length, productos: d.productos.length,
    cotizaciones: d.cotizaciones.length, partidas: d.pedidos.length, ordenes_compra: d.ordenes.length,
    importaciones: d.importaciones.length,
    suma_total_cot: sumaAT(d.cotizaciones, F.cotizaciones.total),
    suma_saldo_cot: sumaAT(d.cotizaciones, F.cotizaciones.total, F.cotizaciones.pagado),
    suma_saldo_oc: sumaAT(d.ordenes, F.ordenes.total, F.ordenes.pagado),
  };
  console.log('\nVerificación (Airtable → nueva base):');
  let todoBien = true;
  for (const k of Object.keys(esperado)) {
    const ok = Math.abs(Number(c[k]) - esperado[k]) < 0.05;
    todoBien &&= ok;
    console.log(`  ${ok ? '✔' : '✘'} ${k.padEnd(16)} ${String(esperado[k].toFixed?.(2) ?? esperado[k]).padStart(16)} → ${Number(c[k]).toFixed(2).padStart(16)}`);
  }
  console.log(`  envíos agrupados: ${reporte.envios}`);
  if (reporte.adjuntos) console.log(`  adjuntos: ${JSON.stringify(reporte.adjuntos)}`);
  if (reporte.advertencias.length) {
    console.log(`\nAdvertencias (${reporte.advertencias.length}):`);
    reporte.advertencias.slice(0, 30).forEach((a) => console.log('  - ' + a));
    await fs.writeFile(path.join(DIR, '_advertencias.txt'), reporte.advertencias.join('\n'));
  }
  console.log(todoBien ? '\n✅ Migración completa y cuadrada.' : '\n⚠ Hay diferencias: revisa antes de dejar Airtable.');
  await sql.end();
  process.exit(todoBien ? 0 : 2);
}

main().catch(async (e) => { console.error('\n❌', e.message); await sql.end(); process.exit(1); });
