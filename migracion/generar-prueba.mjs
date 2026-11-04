#!/usr/bin/env node
// Genera datos de PRUEBA con el mismo formato que exporta Airtable (returnFieldsByFieldId),
// para ensayar importar.mjs y la app sin tocar datos reales.
// Uso: DATOS_DIR=/tmp/prueba node migracion/generar-prueba.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { F } from './airtable-campos.mjs';

const DIR = process.env.DATOS_DIR || '/tmp/prueba';
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
let idc = 0;
const rid = (p = 'rec') => p + String(++idc).padStart(14, '0');
const rec = (fields, created = '2025-01-01T00:00:00.000Z') => ({ id: rid(), createdTime: created, fields });
const dia = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const instituciones = ['Universidad Autónoma de Nuevo León (UANL)', 'Universidad del Bienestar (UBBJ)', 'Cruz Roja Mexicana Delegación Sonora',
  'Universidad Intercultural del Estado de Hidalgo', 'Durán Consultores', 'QHSE Auditores', 'EP de México', 'Laboratorios Quimipharma',
  'Universidad de Guadalajara CUCS', 'Tecnológico de Monterrey Escuela de Medicina', 'Beracah Médica', 'Carsalab', 'Grupo CLYDSE',
  'UNAM Facultad de Medicina', 'Universidad Anáhuac', 'BUAP Facultad de Enfermería', 'Protección Civil Coahuila', 'Rescate Urbano MX'];
const nombres = ['Juan José', 'Rosa María', 'Christian', 'Lourdes', 'Israel', 'Nohemí', 'Carlos', 'Guillermina', 'José Eduardo', 'Andrés', 'Ana', 'Luis'];
const apellidos = ['Durán', 'Mendoza Hernández', 'Rodríguez', 'Arroyo', 'González Falcón', 'Gómez', 'Milton Guevara', 'Suárez', 'Neváez', 'Ruelas'];
const marcas = ['Prestan', 'Nasco', '3B Scientific', 'Laerdal México', 'Mercado Libre México', 'Sunbird S.A. de C.V.', 'TODO EN OFICINAS S.A DE C,V,', 'Gaumard', 'Erler Zimmer'];
const provOC = ['Prestan', 'Nasco', '3B Scientific', 'Laerdal México', 'Mercado Libre México', 'Sunbird', 'Todo en Oficinas', 'N/A'];
const productosBase = ['Maniquí de RCP Adulto Prestan', 'DEA UltraTrainer', 'Brazo para punción arterial', 'Neo Nate - Entrenador neonatal',
  'Simulador de exploración de mama', 'Modelo de oído 3X', 'Torso anatómico 24 partes', 'Esqueleto humano tamaño real', 'Mesa pasteur cromada',
  'Vendas elásticas paquete 12', 'Brazo de hemodiálisis', 'Simulador de parto', 'Cabeza de intubación adulto', 'Pad de sutura'];
const paqs = ['DHL', 'FedEx', 'Estafeta', 'Entrega Presencial', 'Paquete Express', 'Mercado Libre', 'Afimex', 'Envío Directo del Proveedor'];
const vendedores = [{ id: 'usrhL6TRAx6E9lCU5', email: 'kevin.paz@linahp.com', name: 'Kevin Guadiana' },
  { id: 'usrADELINA000001', email: 'adelina@linahp.com', name: 'Adelina' }];

const att = async (nombre, tipo = 'application/pdf') => {
  const a = { id: rid('att'), filename: nombre, size: 20, type: tipo, url: 'https://ejemplo.invalid/' + nombre };
  await fs.writeFile(path.join(DIR, 'adjuntos', `${a.id}__${nombre}`), `%PDF-1.4 prueba ${nombre}\n`);
  return a;
};

await fs.mkdir(path.join(DIR, 'adjuntos'), { recursive: true });
const cuentas = instituciones.map((n) => rec({ [F.cuentas.nombre]: n }));
const clientes = [];
for (let i = 0; i < 70; i++) {
  const c = rnd() < 0.85 ? pick(cuentas) : null;
  clientes.push(rec({
    [F.clientes.nombre]: pick(nombres), [F.clientes.apellido]: pick(apellidos),
    [F.clientes.telefono]: `(81) ${int(1000, 9999)}-${int(1000, 9999)}`, [F.clientes.correo]: `contacto${i}@ejemplo.mx`,
    ...(c ? { [F.clientes.institucion]: [c.id] } : {}),
    ...(rnd() < 0.6 ? { [F.clientes.rfc]: `ABC${int(100000, 999999)}XY${int(1, 9)}` } : {}),
    [F.clientes.direccion]: `Calle ${int(1, 900)}, Col. Centro, Monterrey, N.L.`,
  }));
}
// un contacto con dos instituciones (caso borde)
clientes[0].fields[F.clientes.institucion] = [cuentas[0].id, cuentas[1].id];

const productos = [];
for (let i = 0; i < 40; i++) {
  productos.push(rec({
    [F.productos.nombre]: `${pick(productosBase)} ${i}`, [F.productos.codigo]: `PP-${int(100, 999)}-${i}`,
    [F.productos.marca]: pick(marcas),
    ...(i < 5 ? { [F.productos.foto]: [await att(`foto${i}.jpg`, 'image/jpeg')], [F.productos.ficha]: [await att(`ficha${i}.pdf`)] } : {}),
  }));
}
const importaciones = [rec({ [F.importaciones.pedimento]: 'N/A', [F.importaciones.aduana]: 'N/A' })];
for (let i = 0; i < 15; i++) importaciones.push(rec({
  [F.importaciones.pedimento]: `26 24 1653 600${int(1000, 9999)}`, [F.importaciones.aduana]: pick(['Nuevo Laredo #240', 'Colombia #800', 'Aeropuerto General Mariano Escobedo #521']),
  [F.importaciones.fecha]: dia(2026, int(1, 10), int(1, 28)), [F.importaciones.documento]: [await att(`pedimento${i}.pdf`)],
}));
const ordenes = [];
for (let i = 0; i < 25; i++) {
  const total = Math.round(rnd() * 15000 * 100) / 100;
  ordenes.push(rec({
    [F.ordenes.folio]: i < 2 ? `Mercadolibre 202${5 + i}` : `PO${400 + i}`, [F.ordenes.referencia]: `REF-${int(1000, 9999)}`,
    [F.ordenes.fecha]: dia(2026, int(1, 10), int(1, 28)), [F.ordenes.total]: total,
    [F.ordenes.pagado]: rnd() < 0.7 ? total : Math.round(total * 0.5 * 100) / 100,
    [F.ordenes.moneda]: i < 2 ? 'MXN' : pick(['USD', 'USD', 'EUR']), [F.ordenes.proveedor]: pick(provOC),
    ...(i < 4 ? { [F.ordenes.docOrden]: [await att(`PO${400 + i}.pdf`)], [F.ordenes.docFactura]: [await att(`INV${i}.pdf`)] } : {}),
  }));
}
const cotizaciones = [], pedidos = [];
for (let i = 0; i < 160; i++) {
  const mes = int(1, 11), y = rnd() < 0.3 ? 2025 : 2026;
  const total = Math.round((2000 + rnd() * 180000) * 100) / 100;
  const pagado = rnd() < 0.75 ? total : rnd() < 0.5 ? 0 : Math.round(total * 0.6 * 100) / 100;
  const meli = rnd() < 0.15;
  const c = rec({
    [F.cotizaciones.folio]: meli ? `MELI${300 + i}` : `QUO${5000 + i}`, [F.cotizaciones.cliente]: [pick(clientes).id],
    [F.cotizaciones.fecha]: dia(y, y === 2026 ? Math.min(mes, 11) : mes, int(1, 28)), [F.cotizaciones.total]: total,
    [F.cotizaciones.pagado]: pagado, [F.cotizaciones.moneda]: rnd() < 0.1 ? 'USD' : 'MXN',
    ...(rnd() < 0.8 ? { [F.cotizaciones.vendedor]: pick(vendedores) } : {}),
    ...(i < 10 ? { [F.cotizaciones.pdf]: [await att(`QUO${5000 + i}.pdf`)] } : {}),
  });
  cotizaciones.push(c);
  const lineas = int(1, 4), paq = pick(paqs), guia = rnd() < 0.3 ? 'N/A' : String(int(10000000, 99999999)), fe = dia(2026, int(1, 11), int(1, 28));
  for (let j = 0; j < lineas; j++) {
    const conOC = rnd() < 0.9, recibido = conOC && rnd() < 0.8, entregado = recibido && rnd() < 0.8;
    pedidos.push(rec({
      [F.pedidos.cantidad]: int(1, 10), [F.pedidos.producto]: [pick(productos).id], [F.pedidos.cotizacion]: [c.id],
      ...(conOC ? { [F.pedidos.orden]: [pick(ordenes).id], [F.pedidos.pedimento]: [pick(importaciones).id] } : {}),
      ...(recibido ? { [F.pedidos.recibido]: true } : {}), ...(entregado ? { [F.pedidos.entregado]: true, [F.pedidos.paqueteria]: paq, [F.pedidos.guia]: guia, [F.pedidos.fechaEnvio]: fe } : {}),
      [F.pedidos.costo]: Math.round(rnd() * 3000 * 100) / 100,
    }));
  }
}
// cotización duplicada (caso borde)
cotizaciones.push(rec({ ...cotizaciones[5].fields, [F.cotizaciones.pdf]: undefined }));

for (const [n, v] of Object.entries({ cuentas, clientes, productos, ordenes, cotizaciones, pedidos, importaciones }))
  await fs.writeFile(path.join(DIR, `${n}.json`), JSON.stringify(v));
console.log('Datos de prueba en', DIR, { cotizaciones: cotizaciones.length, pedidos: pedidos.length });
