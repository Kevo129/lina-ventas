import { Fragment } from 'react';
import Link from 'next/link';
import { sql, config } from '@/lib/db';
import { Kpi, Cabecera, Estatus } from '@/components/ui';
import { dineroCorto, millones, entero, fecha, etiqueta, SEGMENTOS, ETAPAS } from '@/lib/formato';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default async function Tablero({ searchParams }) {
  const { sinpermiso } = await searchParams;
  const cfg = await config();
  const meta = Number(cfg.meta_mensual_mxn);
  const hoy = new Date();
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const diaMes = hoy.getDate();
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

  const [[mes], meses, [cobranza], [pipeline], [logistica], [ocs], topCuentas, segmentos, recientes, porEtapa] = await Promise.all([
    sql`select coalesce(sum(total_mxn),0) ventas, count(*) n from v_cotizaciones where estado='ganada' and periodo=${periodo}`,
    sql`select periodo, ventas_mxn from v_ventas_mensuales where periodo >= to_char(current_date - interval '11 months','YYYY-MM') order by periodo`,
    sql`select coalesce(sum(saldo_pendiente * total_mxn / nullif(total,0)),0) monto, count(*) n
        from v_cotizaciones where estado='ganada' and saldo_pendiente > 0.009`,
    sql`select coalesce(sum(monto_mxn),0) bruto, coalesce(sum(monto_mxn * probabilidad_efectiva / 100.0),0) ponderado, count(*) n
        from v_oportunidades where etapa not in ('ganada','perdida')`,
    sql`select count(*) filter (where estatus='OC PENDIENTE') sin_oc,
               count(*) filter (where estatus in ('EN TRÁNSITO','PEDIMENTO PENDIENTE')) transito,
               count(*) filter (where estatus='EN STOCK') stock
        from v_partidas where not entregado`,
    sql`select count(*) n from v_ordenes_compra where estatus='Por pagar'`,
    sql`select cuenta_id, cuenta_nombre, sum(total_mxn) ventas from v_cotizaciones
        where estado='ganada' and fecha >= current_date - interval '12 months' and cuenta_id is not null
        group by 1,2 order by 3 desc limit 8`,
    sql`select segmento, sum(total_mxn) ventas from v_cotizaciones
        where estado='ganada' and fecha >= current_date - interval '12 months' group by 1 order by 2 desc`,
    sql`select id, folio, fecha, contacto_nombre, cuenta_nombre, total, moneda, estatus from v_cotizaciones
        order by fecha desc, id desc limit 8`,
    sql`select etapa, count(*) n, coalesce(sum(monto_mxn),0) monto from v_oportunidades
        where etapa not in ('ganada','perdida') group by 1`,
  ]);

  const avance = meta ? Number(mes.ventas) / meta : 0;
  const proyeccion = (Number(mes.ventas) / diaMes) * diasMes;
  const maxMes = Math.max(meta, ...meses.map((m) => Number(m.ventas_mxn)));
  const totalSeg = segmentos.reduce((a, s) => a + Number(s.ventas), 0) || 1;

  return (
    <>
      {sinpermiso && <div className="aviso">No tienes permiso para esa sección.</div>}
      <Cabecera titulo="Tablero de ventas" sub={`${MESES[hoy.getMonth()]} ${hoy.getFullYear()} · día ${diaMes} de ${diasMes}`}>
        <Link className="btn sec" href="/pipeline/nueva">+ Oportunidad</Link>
        <Link className="btn" href="/cotizaciones/nueva">+ Cotización</Link>
      </Cabecera>

      <div className="rejilla r4" style={{ marginBottom: 16 }}>
        <Kpi etiqueta="Vendido este mes (con IVA)" valor={dineroCorto(mes.ventas)}
          detalle={`${Math.round(avance * 100)}% de la meta de ${millones(meta)} · ${mes.n} cotizaciones ganadas`}>
          <div className="barra-meta"><div style={{ width: `${Math.min(100, avance * 100)}%` }} /></div>
        </Kpi>
        <Kpi etiqueta="Proyección al cierre del mes" valor={dineroCorto(proyeccion)}
          detalle={proyeccion >= meta ? 'Al ritmo actual se cumple la meta' : `Faltan ${dineroCorto(meta - Number(mes.ventas))} para la meta`} />
        <Kpi etiqueta="Pipeline abierto (ponderado)" valor={dineroCorto(pipeline.ponderado)}
          detalle={`${pipeline.n} oportunidades · ${dineroCorto(pipeline.bruto)} sin ponderar`} />
        <Kpi etiqueta="Por cobrar" valor={dineroCorto(cobranza.monto)} detalle={<Link href="/cobranza">{cobranza.n} cotizaciones con saldo →</Link>} />
      </div>

      <div className="rejilla r-2-1">
        <div className="panel">
          <h2>Ventas por mes (MXN con IVA) · meta {millones(meta)}</h2>
          <div className="barras">
            {meses.map((m) => {
              const [y, mm] = m.periodo.split('-');
              return (
                <div key={m.periodo} className={`b ${m.periodo === periodo ? 'actual' : ''}`} title={dineroCorto(m.ventas_mxn)}>
                  <em>{millones(m.ventas_mxn)}</em>
                  <div style={{ height: `${(Number(m.ventas_mxn) / maxMes) * 100}%` }} />
                  <span>{MESES[Number(mm) - 1]} {y.slice(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <h2>Operación pendiente</h2>
          <dl className="datos">
            <dt>Partidas sin OC</dt><dd><Link href="/logistica?estatus=OC PENDIENTE">{entero(logistica.sin_oc)}</Link></dd>
            <dt>En tránsito</dt><dd><Link href="/logistica?estatus=EN TRÁNSITO">{entero(logistica.transito)}</Link></dd>
            <dt>En stock por entregar</dt><dd><Link href="/logistica?estatus=EN STOCK">{entero(logistica.stock)}</Link></dd>
            <dt>OCs por pagar</dt><dd><Link href="/cuentas-por-pagar">{entero(ocs.n)}</Link></dd>
          </dl>
          <h2 style={{ marginTop: 18 }}>Pipeline por etapa</h2>
          <dl className="datos">
            {ETAPAS.filter(([k]) => k !== 'ganada' && k !== 'perdida').map(([k, t]) => {
              const e = porEtapa.find((x) => x.etapa === k);
              return <Fragment key={k}><dt>{t}</dt><dd>{e ? `${e.n} · ${millones(e.monto)}` : '—'}</dd></Fragment>;
            })}
          </dl>
        </div>
      </div>

      <div className="rejilla r3">
        <div className="panel sin-pad">
          <h2>Top cuentas · últimos 12 meses</h2>
          <table><tbody>
            {topCuentas.map((c) => (
              <tr key={c.cuenta_id}><td><Link href={`/cuentas/${c.cuenta_id}`}>{c.cuenta_nombre}</Link></td><td className="num">{millones(c.ventas)}</td></tr>
            ))}
          </tbody></table>
        </div>
        <div className="panel sin-pad">
          <h2>Ventas por segmento · 12 meses</h2>
          <table><tbody>
            {segmentos.map((s) => (
              <tr key={s.segmento ?? 'x'}>
                <td>{s.segmento ? etiqueta(SEGMENTOS, s.segmento) : <span className="tenue">Sin clasificar</span>}</td>
                <td className="num">{millones(s.ventas)}</td>
                <td className="num tenue">{Math.round((Number(s.ventas) / totalSeg) * 100)}%</td>
              </tr>
            ))}
          </tbody></table>
        </div>
        <div className="panel sin-pad">
          <h2>Últimas cotizaciones</h2>
          <table><tbody>
            {recientes.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/cotizaciones/${c.id}`}>{c.folio}</Link><div className="tenue chico">{c.cuenta_nombre || c.contacto_nombre}</div></td>
                <td className="num">{millones(c.total)}{c.moneda !== 'MXN' && <span className="tenue chico"> {c.moneda}</span>}<div><Estatus>{c.estatus}</Estatus></div></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </>
  );
}
