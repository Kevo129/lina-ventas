import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Estatus, Kpi, Vacio } from '@/components/ui';
import { dinero, dineroCorto, fecha } from '@/lib/formato';

export default async function Cobranza() {
  const filas = await sql`
    select *, current_date - fecha as dias, saldo_pendiente * total_mxn / nullif(total,0) saldo_mxn
    from v_cotizaciones where estado = 'ganada' and saldo_pendiente > 0.009 order by fecha`;
  const rango = (a, b) => filas.filter((f) => f.dias >= a && f.dias <= b).reduce((s, f) => s + Number(f.saldo_mxn || 0), 0);
  return (
    <>
      <Cabecera titulo="Cobranza" sub="Cotizaciones ganadas con saldo pendiente, de la más antigua a la más reciente" />
      <div className="rejilla r4" style={{ marginBottom: 16 }}>
        <Kpi etiqueta="0–30 días" valor={dineroCorto(rango(0, 30))} />
        <Kpi etiqueta="31–60 días" valor={dineroCorto(rango(31, 60))} />
        <Kpi etiqueta="61–90 días" valor={dineroCorto(rango(61, 90))} />
        <Kpi etiqueta="Más de 90 días" valor={dineroCorto(rango(91, 100000))} />
      </div>
      <div className="panel sin-pad tabla-env">
        {filas.length === 0 ? <Vacio>Sin saldos pendientes.</Vacio> : (
          <table>
            <thead><tr><th>Folio</th><th>Fecha</th><th className="num">Días</th><th>Cliente</th><th className="num">Total</th><th className="num">Cobrado</th><th className="num">Saldo</th><th>Estatus</th></tr></thead>
            <tbody>{filas.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/cotizaciones/${c.id}`}><b>{c.folio}</b></Link></td><td>{fecha(c.fecha)}</td>
                <td className="num" style={{ color: c.dias > 60 ? 'var(--alerta)' : undefined }}>{c.dias}</td>
                <td>{c.contacto_nombre}<div className="tenue chico">{c.cuenta_nombre}</div></td>
                <td className="num">{dinero(c.total, c.moneda)}</td><td className="num">{dinero(c.pagado, c.moneda)}</td>
                <td className="num"><b>{dinero(c.saldo_pendiente, c.moneda)}</b></td><td><Estatus>{c.estatus}</Estatus></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
