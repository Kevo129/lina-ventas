import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { Cabecera, Estatus } from '@/components/ui';
import { dinero, fecha, millones } from '@/lib/formato';
import FormContacto from '../FormContacto';

export default async function Contacto({ params }) {
  const { id } = await params;
  const [c] = await sql`select * from v_contactos where id = ${id}`;
  if (!c) notFound();
  const cotizaciones = await sql`select * from v_cotizaciones where contacto_id = ${id} order by fecha desc`;
  return (
    <>
      <Cabecera titulo={c.nombre_completo} migas={[['/contactos', 'Contactos']]}
        sub={<>{c.cuenta_id ? <Link href={`/cuentas/${c.cuenta_id}`}>{c.cuenta_nombre}</Link> : 'Sin cuenta'} · {c.num_compras} compras · {millones(c.ventas_mxn)}</>}>
        <Link className="btn" href={`/cotizaciones/nueva?contacto=${id}`}>+ Cotización</Link>
      </Cabecera>
      <div className="rejilla r2">
        <FormContacto c={c} volver={`/contactos/${id}`} />
        <div className="panel sin-pad tabla-env">
          <h2>Cotizaciones</h2>
          <table>
            <thead><tr><th>Folio</th><th>Fecha</th><th className="num">Total</th><th>Estatus</th></tr></thead>
            <tbody>{cotizaciones.map((q) => (
              <tr key={q.id}><td><Link href={`/cotizaciones/${q.id}`}>{q.folio}</Link></td><td>{fecha(q.fecha)}</td>
                <td className="num">{dinero(q.total, q.moneda)}</td><td><Estatus>{q.estatus}</Estatus></td></tr>
            ))}
            {cotizaciones.length === 0 && <tr><td colSpan={4} className="vacio">Sin cotizaciones.</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
