'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { COOKIE, crearToken, requiereUsuario } from '@/lib/auth';
import { guardarArchivo, borrarArchivo as borrarDeAlmacen } from '@/lib/storage.mjs';

// ---------- utilidades ----------
const TIPOS_NUM = /^(total|monto|monto_estimado|precio_lista|precio_unitario|costo_unitario|tipo_cambio|probabilidad|cantidad)$/;
const TIPOS_ID = /_id$/;

function leer(fd, nombres) {
  const o = {};
  for (const n of nombres) {
    if (!fd.has(n)) continue;
    let v = fd.get(n);
    if (typeof v === 'string') v = v.trim();
    if (v === '') v = null;
    if (v != null && (TIPOS_NUM.test(n) || TIPOS_ID.test(n))) v = Number(String(v).replace(/[$,\s]/g, ''));
    o[n] = v;
  }
  return o;
}

async function guardar(tabla, id, datos) {
  if (id) {
    await sql`update ${sql(tabla)} set ${sql(datos)} where id = ${id}`;
    return Number(id);
  }
  const [r] = await sql`insert into ${sql(tabla)} ${sql(datos)} returning id`;
  return r.id;
}

const volver = (fd, defecto) => {
  const destino = fd.get('_volver') || defecto;
  revalidatePath('/', 'layout');
  redirect(destino);
};

// ---------- sesión ----------
export async function iniciarSesion(fd) {
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const [u] = await sql`select * from usuarios where email = ${email} and activo`;
  if (!u?.password_hash || !(await bcrypt.compare(String(fd.get('password') || ''), u.password_hash)))
    redirect('/login?error=1');
  (await cookies()).set(COOKIE, await crearToken(u), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  redirect('/');
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
  redirect('/login');
}

// ---------- cuentas y contactos ----------
export async function guardarCuenta(fd) {
  await requiereUsuario();
  const id = await guardar('cuentas', fd.get('id'), leer(fd, ['nombre', 'segmento', 'rfc', 'ciudad', 'estado', 'sitio_web', 'responsable_id', 'notas']));
  volver(fd, `/cuentas/${id}`);
}

export async function guardarContacto(fd) {
  await requiereUsuario();
  const id = await guardar('contactos', fd.get('id'),
    leer(fd, ['nombre', 'apellido', 'puesto', 'telefono', 'correo', 'cuenta_id', 'rfc', 'direccion_entrega', 'notas']));
  volver(fd, `/contactos/${id}`);
}

// ---------- productos y proveedores ----------
export async function guardarProducto(fd) {
  await requiereUsuario();
  const id = await guardar('productos', fd.get('id'), {
    ...leer(fd, ['nombre', 'codigo', 'proveedor_id', 'categoria', 'precio_lista', 'moneda_precio']),
    activo: fd.get('activo') === 'on',
  });
  volver(fd, `/productos/${id}`);
}

export async function guardarProveedor(fd) {
  await requiereUsuario();
  await guardar('proveedores', fd.get('id'), leer(fd, ['nombre', 'pais', 'contacto', 'correo', 'telefono', 'notas']));
  volver(fd, '/proveedores');
}

// ---------- pipeline ----------
export async function guardarOportunidad(fd) {
  const u = await requiereUsuario();
  const datos = leer(fd, ['titulo', 'cuenta_id', 'contacto_id', 'etapa', 'monto_estimado', 'moneda', 'probabilidad',
    'fecha_cierre_estimada', 'fuente', 'responsable_id', 'motivo_perdida', 'siguiente_paso', 'fecha_siguiente_paso', 'notas']);
  if (!fd.get('id') && !datos.responsable_id) datos.responsable_id = u.id;
  if (datos.etapa === 'ganada' || datos.etapa === 'perdida') datos.cerrada_en = new Date();
  const id = await guardar('oportunidades', fd.get('id'), datos);
  volver(fd, `/pipeline/${id}`);
}

export async function cambiarEtapa(fd) {
  await requiereUsuario();
  const etapa = fd.get('etapa');
  const cerrada = etapa === 'ganada' || etapa === 'perdida';
  await sql`update oportunidades set etapa = ${etapa}, cerrada_en = ${cerrada ? new Date() : null} where id = ${fd.get('id')}`;
  revalidatePath('/pipeline');
}

export async function agregarActividad(fd) {
  const u = await requiereUsuario();
  await sql`insert into actividades ${sql({ ...leer(fd, ['tipo', 'descripcion', 'oportunidad_id', 'cuenta_id', 'contacto_id']), usuario_id: u.id })}`;
  volver(fd, '/pipeline');
}

// ---------- cotizaciones ----------
export async function guardarCotizacion(fd) {
  const u = await requiereUsuario();
  const datos = leer(fd, ['folio', 'oportunidad_id', 'contacto_id', 'fecha', 'estado', 'total', 'moneda', 'tipo_cambio', 'vendedor_id', 'canal', 'notas']);
  if (!fd.get('id') && !datos.vendedor_id) datos.vendedor_id = u.id;
  const id = await guardar('cotizaciones', fd.get('id'), datos);
  // al ganar una cotización, la oportunidad ligada pasa a "ganada"
  if (datos.estado === 'ganada' && datos.oportunidad_id)
    await sql`update oportunidades set etapa = 'ganada', cerrada_en = coalesce(cerrada_en, now()) where id = ${datos.oportunidad_id}`;
  volver(fd, `/cotizaciones/${id}`);
}

export async function agregarPartida(fd) {
  await requiereUsuario();
  await sql`insert into partidas ${sql(leer(fd, ['cotizacion_id', 'producto_id', 'cantidad', 'precio_unitario', 'costo_unitario', 'orden_compra_id', 'importacion_id', 'notas']))}`;
  volver(fd, `/cotizaciones/${fd.get('cotizacion_id')}`);
}

export async function actualizarPartida(fd) {
  await requiereUsuario();
  const datos = leer(fd, ['cantidad', 'precio_unitario', 'costo_unitario', 'orden_compra_id', 'importacion_id', 'notas']);
  if (fd.has('_checks')) { datos.recibido = fd.get('recibido') === 'on'; datos.entregado = fd.get('entregado') === 'on'; }
  if (fd.has('orden_compra_id') && !fd.get('orden_compra_id')) datos.orden_compra_id = null;
  if (fd.has('importacion_id') && !fd.get('importacion_id')) datos.importacion_id = null;
  await sql`update partidas set ${sql(datos)} where id = ${fd.get('id')}`;
  volver(fd, '/logistica');
}

export async function borrarPartida(fd) {
  await requiereUsuario();
  await sql`delete from partidas where id = ${fd.get('id')}`;
  volver(fd, '/cotizaciones');
}

export async function registrarEnvio(fd) {
  await requiereUsuario();
  const partidas = fd.getAll('partida').map(Number).filter(Boolean);
  if (partidas.length) {
    const [e] = await sql`insert into envios ${sql(leer(fd, ['cotizacion_id', 'paqueteria', 'guia', 'fecha_envio', 'notas']))} returning id`;
    await sql`update partidas set envio_id = ${e.id}, entregado = true where id in ${sql(partidas)}`;
  }
  volver(fd, `/cotizaciones/${fd.get('cotizacion_id')}`);
}

export async function agregarPago(fd) {
  const u = await requiereUsuario();
  await sql`insert into pagos ${sql({ ...leer(fd, ['cotizacion_id', 'fecha', 'monto', 'metodo', 'referencia', 'notas']), registrado_por: u.id })}`;
  volver(fd, `/cotizaciones/${fd.get('cotizacion_id')}`);
}

export async function borrarPago(fd) {
  await requiereUsuario(['admin', 'administracion']);
  await sql`delete from pagos where id = ${fd.get('id')}`;
  volver(fd, '/cobranza');
}

// ---------- compras e importaciones ----------
export async function guardarOrdenCompra(fd) {
  await requiereUsuario();
  const id = await guardar('ordenes_compra', fd.get('id'), leer(fd, ['folio', 'referencia_proveedor', 'fecha', 'proveedor_id', 'total', 'moneda', 'notas']));
  volver(fd, `/compras/${id}`);
}

export async function agregarPagoProveedor(fd) {
  const u = await requiereUsuario();
  await sql`insert into pagos_proveedor ${sql({ ...leer(fd, ['orden_compra_id', 'fecha', 'monto', 'metodo', 'referencia', 'notas']), registrado_por: u.id })}`;
  volver(fd, `/compras/${fd.get('orden_compra_id')}`);
}

export async function borrarPagoProveedor(fd) {
  await requiereUsuario(['admin', 'administracion']);
  await sql`delete from pagos_proveedor where id = ${fd.get('id')}`;
  volver(fd, '/compras');
}

export async function guardarImportacion(fd) {
  await requiereUsuario();
  const id = await guardar('importaciones', fd.get('id'), leer(fd, ['pedimento', 'aduana', 'fecha_importacion', 'notas']));
  volver(fd, `/importaciones/${id}`);
}

export async function asignarPartidas(fd) {
  // Asigna OC y/o pedimento y/o marca recibido a varias partidas a la vez
  await requiereUsuario();
  const ids = fd.getAll('partida').map(Number).filter(Boolean);
  if (ids.length) {
    const d = {};
    if (fd.get('orden_compra_id')) d.orden_compra_id = Number(fd.get('orden_compra_id'));
    if (fd.get('importacion_id')) d.importacion_id = Number(fd.get('importacion_id'));
    if (fd.get('marcar') === 'recibido') d.recibido = true;
    if (fd.get('marcar') === 'entregado') d.entregado = true;
    if (Object.keys(d).length) await sql`update partidas set ${sql(d)} where id in ${sql(ids)}`;
  }
  volver(fd, '/logistica');
}

// ---------- archivos ----------
const ENTIDADES = new Set(['cotizaciones', 'productos', 'ordenes_compra', 'importaciones']);
export async function subirArchivo(fd) {
  await requiereUsuario();
  const entidad = fd.get('entidad'), entidadId = Number(fd.get('entidad_id')), campo = fd.get('campo') || 'documento';
  if (!ENTIDADES.has(entidad)) throw new Error('Entidad inválida');
  for (const f of fd.getAll('archivo')) {
    if (!f || typeof f === 'string' || !f.size) continue;
    const nombreSeguro = f.name.replace(/[^\w.\-]+/g, '_');
    const ruta = `${entidad}/${entidadId}/${Date.now()}-${nombreSeguro}`;
    await guardarArchivo(ruta, Buffer.from(await f.arrayBuffer()), f.type);
    await sql`insert into archivos (entidad, entidad_id, campo, nombre, ruta, mime, tamano)
              values (${entidad}, ${entidadId}, ${campo}, ${f.name}, ${ruta}, ${f.type || null}, ${f.size})`;
  }
  volver(fd, '/');
}

export async function borrarArchivo(fd) {
  await requiereUsuario();
  const [a] = await sql`delete from archivos where id = ${fd.get('id')} returning ruta`;
  if (a) await borrarDeAlmacen(a.ruta);
  volver(fd, '/');
}

// ---------- configuración ----------
export async function guardarConfiguracion(fd) {
  await requiereUsuario(['admin']);
  for (const clave of ['meta_mensual_mxn', 'tipo_cambio_usd', 'tipo_cambio_eur', 'iva']) {
    const v = String(fd.get(clave) || '').replace(/[$,\s]/g, '');
    if (v && !Number.isNaN(Number(v))) await sql`update configuracion set valor = ${v} where clave = ${clave}`;
  }
  volver(fd, '/configuracion');
}

export async function guardarUsuario(fd) {
  await requiereUsuario(['admin']);
  const datos = { ...leer(fd, ['nombre', 'email', 'rol']), activo: fd.get('activo') === 'on' };
  datos.email = datos.email?.toLowerCase();
  const pass = String(fd.get('password') || '');
  if (pass) datos.password_hash = await bcrypt.hash(pass, 10);
  await guardar('usuarios', fd.get('id'), datos);
  volver(fd, '/configuracion');
}
