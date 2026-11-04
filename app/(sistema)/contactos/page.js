import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Vacio } from '@/components/ui';
import { millones, fecha } from '@/lib/formato';

export default async function Contactos({ searchParams }) {
  const { q = '' } = await searchParams;
  const like = '%' + q + '%';
  const filas = await sql`
    select * from v_contactos
    where (${q} = '' or nombre_completo ilike ${like} or correo ilike ${like} or cuenta_nombre ilike ${like} or rfc ilike ${like} or telefono ilike ${like})
    order by ultima_compra desc nulls last, nombre limit 200`;
  return (
    <>
      <Cabecera titulo="Contactos" sub="Personas con las que tratamos (antes «Clientes» en Airtable)">
        <Link className="btn" href="/contactos/nuevo">+ Contacto</Link>
      </Cabecera>
      <form className="filtros"><input name="q" defaultValue={q} placeholder="Nombre, correo, teléfono, RFC o cuenta" style={{ minWidth: 320 }} /><button className="btn sec">Buscar</button></form>
      <div className="panel sin-pad tabla-env">
        {filas.length === 0 ? <Vacio /> : (
          <table>
            <thead><tr><th>Nombre</th><th>Cuenta</th><th>Correo</th><th>Teléfono</th><th className="num">Compras</th><th className="num">Ventas</th><th>Última compra</th></tr></thead>
            <tbody>{filas.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/contactos/${c.id}`}><b>{c.nombre_completo}</b></Link>{c.puesto && <div className="tenue chico">{c.puesto}</div>}</td>
                <td>{c.cuenta_id ? <Link href={`/cuentas/${c.cuenta_id}`}>{c.cuenta_nombre}</Link> : <span className="tenue">—</span>}</td>
                <td>{c.correo ?? '—'}</td><td>{c.telefono ?? '—'}</td>
                <td className="num">{c.num_compras}</td><td className="num">{millones(c.ventas_mxn)}</td><td>{fecha(c.ultima_compra)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
