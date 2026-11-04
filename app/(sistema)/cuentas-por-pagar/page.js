import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Kpi, Vacio } from '@/components/ui';
import { dinero, fecha } from '@/lib/formato';

export default async function PorPagar() {
  const [filas, totales] = await Promise.all([
    sql`select *, current_date - fecha dias from v_ordenes_compra where estatus = 'Por pagar' order by fecha nulls last`,
    sql`select moneda, sum(saldo_pendiente) saldo from v_ordenes_compra where estatus = 'Por pagar' group by 1 order by 1`,
  ]);
  return (
    <>
      <Cabecera titulo="Cuentas por pagar" sub="Órdenes de compra con saldo a proveedores" />
      <div className="rejilla r3" style={{ marginBottom: 16 }}>
        {totales.map((t) => <Kpi key={t.moneda} etiqueta={`Saldo en ${t.moneda}`} valor={dinero(t.saldo, t.moneda)} />)}
      </div>
      <div className="panel sin-pad tabla-env">
        {filas.length === 0 ? <Vacio>Todo pagado.</Vacio> : (
          <table>
            <thead><tr><th>OC</th><th>Fecha</th><th className="num">Días</th><th>Proveedor</th><th className="num">Total</th><th className="num">Pagado</th><th className="num">Saldo</th></tr></thead>
            <tbody>{filas.map((o) => (
              <tr key={o.id}><td><Link href={`/compras/${o.id}`}><b>{o.folio}</b></Link></td><td>{fecha(o.fecha)}</td><td className="num">{o.dias ?? '—'}</td>
                <td>{o.proveedor_nombre}</td><td className="num">{dinero(o.total, o.moneda)}</td><td className="num">{dinero(o.pagado, o.moneda)}</td>
                <td className="num"><b>{dinero(o.saldo_pendiente, o.moneda)}</b></td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
