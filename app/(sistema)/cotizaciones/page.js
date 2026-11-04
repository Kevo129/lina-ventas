import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Estatus, Opciones, Vacio } from '@/components/ui';
import { dinero, fecha, millones, ESTADOS_COT } from '@/lib/formato';

const ESTATUS = ['Items y cobros pendientes', 'Items por entregar', 'Por cobrar', 'Concretada'];

export default async function Cotizaciones({ searchParams }) {
  const { q = '', estado = '', estatus = '', desde = '', hasta = '', pagina = '1' } = await searchParams;
  const pag = Math.max(1, Number(pagina) || 1), porPag = 50;
  const filtro = sql`
    where (${q} = '' or folio ilike ${'%' + q + '%'} or contacto_nombre ilike ${'%' + q + '%'} or cuenta_nombre ilike ${'%' + q + '%'})
      and (${estado} = '' or estado::text = ${estado})
      and (${estatus} = '' or estatus = ${estatus})
      and (${desde} = '' or fecha >= ${desde || '1900-01-01'}::date)
      and (${hasta} = '' or fecha <= ${hasta || '2999-01-01'}::date)`;
  const [filas, [tot]] = await Promise.all([
    sql`select * from v_cotizaciones ${filtro} order by fecha desc, id desc limit ${porPag} offset ${(pag - 1) * porPag}`,
    sql`select count(*)::int n, coalesce(sum(total_mxn),0) total, coalesce(sum(saldo_pendiente * total_mxn / nullif(total,0)),0) saldo from v_cotizaciones ${filtro}`,
  ]);
  const qs = (p) => new URLSearchParams({ q, estado, estatus, desde, hasta, pagina: String(p) }).toString();

  return (
    <>
      <Cabecera titulo="Cotizaciones" sub={`${tot.n} cotizaciones · ${millones(tot.total)} MXN · ${millones(tot.saldo)} por cobrar`}>
        <Link className="btn" href="/cotizaciones/nueva">+ Cotización</Link>
      </Cabecera>
      <form className="filtros">
        <input name="q" defaultValue={q} placeholder="Folio, contacto o cuenta" />
        <select name="estado" defaultValue={estado}><option value="">Todos los estados</option><Opciones lista={ESTADOS_COT} vacio={false} /></select>
        <select name="estatus" defaultValue={estatus}><option value="">Todo estatus</option><Opciones lista={ESTATUS} vacio={false} /></select>
        <input type="date" name="desde" defaultValue={desde} title="Desde" />
        <input type="date" name="hasta" defaultValue={hasta} title="Hasta" />
        <button className="btn sec">Filtrar</button>
      </form>
      <div className="panel sin-pad tabla-env">
        {filas.length === 0 ? <Vacio /> : (
          <table>
            <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th className="num">Total</th><th className="num">Saldo</th><th className="num">Piezas</th><th>Estatus</th></tr></thead>
            <tbody>
              {filas.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/cotizaciones/${c.id}`}><b>{c.folio}</b></Link>{c.canal === 'Mercado Libre' && <div className="tenue chico">Mercado Libre</div>}</td>
                  <td>{fecha(c.fecha)}</td>
                  <td>{c.contacto_nombre || '—'}<div className="tenue chico">{c.cuenta_nombre}</div></td>
                  <td className="tenue">{c.vendedor_nombre || '—'}</td>
                  <td className="num">{dinero(c.total, c.moneda)}</td>
                  <td className="num">{Number(c.saldo_pendiente) > 0.009 ? dinero(c.saldo_pendiente, c.moneda) : <span className="tenue">—</span>}</td>
                  <td className="num">{c.piezas_entregadas}/{c.piezas}</td>
                  <td><Estatus>{c.estatus}</Estatus></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="acciones">
        {pag > 1 && <Link className="btn sec chico" href={`?${qs(pag - 1)}`}>← Anterior</Link>}
        <span className="tenue chico">Página {pag} de {Math.max(1, Math.ceil(tot.n / porPag))}</span>
        {pag * porPag < tot.n && <Link className="btn sec chico" href={`?${qs(pag + 1)}`}>Siguiente →</Link>}
      </div>
    </>
  );
}
