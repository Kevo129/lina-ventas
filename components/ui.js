import Link from 'next/link';
import { sql } from '@/lib/db';
import { claseEstatus, fecha } from '@/lib/formato';
import { subirArchivo, borrarArchivo } from '@/app/acciones';

export const Estatus = ({ children }) => <span className={`est ${claseEstatus(String(children ?? ''))}`}>{children || '—'}</span>;

export const Kpi = ({ etiqueta, valor, detalle, children }) => (
  <div className="kpi">
    <div className="eti">{etiqueta}</div>
    <div className="val">{valor}</div>
    {detalle && <div className="det">{detalle}</div>}
    {children}
  </div>
);

export const Cabecera = ({ titulo, sub, migas, children }) => (
  <div className="cabecera">
    <div>
      {migas && <div className="migas">{migas.map(([href, t], i) => <span key={i}>{i > 0 && ' / '}<Link href={href}>{t}</Link></span>)}</div>}
      <h1>{titulo}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
    <div className="acciones" style={{ marginTop: 0 }}>{children}</div>
  </div>
);

export const Opciones = ({ lista, vacio = '—' }) => (
  <>
    {vacio !== false && <option value="">{vacio}</option>}
    {lista.map((o) => Array.isArray(o)
      ? <option key={o[0]} value={o[0]}>{o[1]}</option>
      : <option key={o} value={o}>{o}</option>)}
  </>
);

export const Campo = ({ label, ancho, children }) => (
  <div className={ancho ? 'ancho' : undefined}><label>{label}</label>{children}</div>
);

export const Vacio = ({ children = 'Sin registros todavía.' }) => <div className="vacio">{children}</div>;

// Listas de selección reutilizables
export const listaContactos = () => sql`
  select c.id, c.nombre || coalesce(' ' || c.apellido, '') || coalesce(' — ' || cu.nombre, '') as etiqueta
  from contactos c left join cuentas cu on cu.id = c.cuenta_id order by c.nombre, c.apellido`;
export const listaCuentas = () => sql`select id, nombre as etiqueta from cuentas order by nombre`;
export const listaUsuarios = () => sql`select id, nombre as etiqueta from usuarios where activo order by nombre`;
export const listaProductos = () => sql`select id, nombre || coalesce(' [' || codigo || ']', '') as etiqueta from productos where activo order by nombre`;
export const listaProveedores = () => sql`select id, nombre as etiqueta from proveedores order by nombre`;
export const listaOC = () => sql`select o.id, o.folio || coalesce(' · ' || p.nombre, '') as etiqueta from ordenes_compra o left join proveedores p on p.id = o.proveedor_id order by o.fecha desc nulls last, o.id desc limit 300`;
export const listaPedimentos = () => sql`select id, pedimento as etiqueta from importaciones order by fecha_importacion desc nulls first, id desc limit 300`;
export const aOpciones = (rows) => rows.map((r) => [String(r.id), r.etiqueta]);

// Panel de archivos adjuntos de cualquier entidad
export async function Archivos({ entidad, id, volver, campos = [['documento', 'Documento']] }) {
  const archivos = await sql`select * from archivos where entidad = ${entidad} and entidad_id = ${id} order by created_at desc`;
  const nombreCampo = (c) => campos.find(([k]) => k === c)?.[1] ?? c;
  return (
    <div className="panel">
      <h2>Archivos</h2>
      {archivos.length === 0 ? <div className="tenue chico">Sin archivos.</div> : (
        <ul className="linea-tiempo">
          {archivos.map((a) => (
            <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <a href={`/archivos/${a.id}`} target="_blank">{a.nombre}</a>
                <div className="meta">{nombreCampo(a.campo)} · {fecha(a.created_at)}</div>
              </div>
              <form action={borrarArchivo}>
                <input type="hidden" name="id" value={a.id} /><input type="hidden" name="_volver" value={volver} />
                <button className="btn peligro chico" title="Eliminar">✕</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <details className="agregar">
        <summary>+ Subir archivo</summary>
        <form action={subirArchivo}>
          <input type="hidden" name="entidad" value={entidad} /><input type="hidden" name="entidad_id" value={id} />
          <input type="hidden" name="_volver" value={volver} />
          {campos.length > 1 && <select name="campo" style={{ marginBottom: 8 }}><Opciones lista={campos} vacio={false} /></select>}
          {campos.length === 1 && <input type="hidden" name="campo" value={campos[0][0]} />}
          <input type="file" name="archivo" multiple required />
          <div className="acciones"><button className="btn chico">Subir</button></div>
        </form>
      </details>
    </div>
  );
}
