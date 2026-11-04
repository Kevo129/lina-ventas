import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Estatus, Opciones, Vacio } from '@/components/ui';
import { dinero, fecha } from '@/lib/formato';

export default async function Compras({ searchParams }) {
  const { q = '', estatus = '' } = await searchParams;
  const filas = await sql`
    select * from v_ordenes_compra
    where (${q} = '' or folio ilike ${'%' + q + '%'} or proveedor_nombre ilike ${'%' + q + '%'} or referencia_proveedor ilike ${'%' + q + '%'})
      and (${estatus} = '' or estatus = ${estatus})
    order by fecha desc nulls last, id desc limit 300`;
  return (
    <>
      <Cabecera titulo="Órdenes de compra" sub="Compras a proveedores y su avance">
        <Link className="btn" href="/compras/nueva">+ Orden de compra</Link>
      </Cabecera>
      <form className="filtros">
        <input name="q" defaultValue={q} placeholder="Folio, proveedor o referencia" />
        <select name="estatus" defaultValue={estatus}><option value="">Todas</option><Opciones lista={['Por pagar', 'Pagada']} vacio={false} /></select>
        <button className="btn sec">Filtrar</button>
      </form>
      <div className="panel sin-pad tabla-env">
        {filas.length === 0 ? <Vacio /> : (
          <table>
            <thead><tr><th>Folio</th><th>Fecha</th><th>Proveedor</th><th className="num">Total</th><th className="num">Saldo</th><th className="num">Piezas</th><th className="num">En stock</th><th>Pago</th></tr></thead>
            <tbody>{filas.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/compras/${o.id}`}><b>{o.folio}</b></Link>{o.referencia_proveedor && <div className="tenue chico">{o.referencia_proveedor}</div>}</td>
                <td>{fecha(o.fecha)}</td><td>{o.proveedor_nombre ?? '—'}</td>
                <td className="num">{dinero(o.total, o.moneda)}</td>
                <td className="num">{Number(o.saldo_pendiente) > 0.009 ? dinero(o.saldo_pendiente, o.moneda) : '—'}</td>
                <td className="num">{o.piezas_entregadas}/{o.piezas}</td><td className="num">{o.piezas_en_stock}</td>
                <td><Estatus>{o.estatus}</Estatus></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
