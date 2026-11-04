import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { Cabecera, Estatus, Kpi, Opciones, Archivos } from '@/components/ui';
import { agregarPagoProveedor, borrarPagoProveedor } from '@/app/acciones';
import { dinero, fecha, fechaISO } from '@/lib/formato';
import FormOC from '../FormOC';

export default async function OC({ params, searchParams }) {
  const { id } = await params;
  const { editar } = await searchParams;
  const [o] = await sql`select * from v_ordenes_compra where id = ${id}`;
  if (!o) notFound();
  const [partidas, pagos] = await Promise.all([
    sql`select * from v_partidas where orden_compra_id = ${id} order by cotizacion_fecha desc nulls last`,
    sql`select * from pagos_proveedor where orden_compra_id = ${id} order by fecha desc`,
  ]);
  const volver = `/compras/${id}`;
  return (
    <>
      <Cabecera titulo={`OC ${o.folio}`} migas={[['/compras', 'Órdenes de compra']]} sub={`${o.proveedor_nombre ?? 'Sin proveedor'} · ${fecha(o.fecha)}${o.referencia_proveedor ? ' · Ref. ' + o.referencia_proveedor : ''}`}>
        <Estatus>{o.estatus}</Estatus>
        <Link className="btn sec" href={editar ? volver : `${volver}?editar=1`}>{editar ? 'Cerrar edición' : 'Editar'}</Link>
      </Cabecera>
      {editar && <FormOC o={o} volver={volver} />}
      <div className="rejilla r4" style={{ marginBottom: 16 }}>
        <Kpi etiqueta="Total" valor={dinero(o.total, o.moneda)} />
        <Kpi etiqueta="Pagado" valor={dinero(o.pagado, o.moneda)} />
        <Kpi etiqueta="Saldo" valor={dinero(o.saldo_pendiente, o.moneda)} />
        <Kpi etiqueta="Piezas entregadas / en stock" valor={`${o.piezas_entregadas} / ${o.piezas_en_stock}`} detalle={`${o.piezas} piezas en total`} />
      </div>
      <div className="rejilla r-2-1">
        <div>
          <div className="panel sin-pad tabla-env">
            <h2>Partidas incluidas</h2>
            <table>
              <thead><tr><th>Producto</th><th className="num">Cant.</th><th className="num">Costo unit.</th><th>Cotización</th><th>Pedimento</th><th>Estatus</th></tr></thead>
              <tbody>{partidas.map((p) => (
                <tr key={p.id}><td>{p.producto_nombre}<div className="tenue chico">{p.producto_codigo}</div></td><td className="num">{p.cantidad}</td>
                  <td className="num">{p.costo_unitario != null ? dinero(p.costo_unitario, o.moneda) : '—'}</td>
                  <td>{p.cotizacion_id ? <Link href={`/cotizaciones/${p.cotizacion_id}`}>{p.cotizacion_folio}</Link> : '—'}</td>
                  <td>{p.pedimento ?? '—'}</td><td><Estatus>{p.estatus}</Estatus></td></tr>
              ))}
              {partidas.length === 0 && <tr><td colSpan={6} className="vacio">Asigna partidas a esta OC desde Logística o desde la cotización.</td></tr>}</tbody>
            </table>
          </div>
          <div className="panel sin-pad">
            <h2>Pagos al proveedor</h2>
            <table>
              <thead><tr><th>Fecha</th><th className="num">Monto</th><th>Método</th><th>Referencia</th><th></th></tr></thead>
              <tbody>{pagos.map((p) => (
                <tr key={p.id}><td>{fecha(p.fecha)}</td><td className="num">{dinero(p.monto, o.moneda)}</td><td>{p.metodo}</td><td className="tenue">{p.referencia}</td>
                  <td><form action={borrarPagoProveedor}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="_volver" value={volver} /><button className="btn peligro chico">✕</button></form></td></tr>
              ))}</tbody>
            </table>
            <form action={agregarPagoProveedor} style={{ padding: '6px 18px 16px' }}>
              <input type="hidden" name="orden_compra_id" value={o.id} /><input type="hidden" name="_volver" value={volver} />
              <div className="en-linea">
                <div><label>Fecha</label><input name="fecha" type="date" defaultValue={fechaISO(new Date())} /></div>
                <div><label>Monto ({o.moneda})</label><input name="monto" inputMode="decimal" required defaultValue={Number(o.saldo_pendiente) > 0 ? o.saldo_pendiente : ''} /></div>
                <div><label>Método</label><select name="metodo"><Opciones lista={['Transferencia', 'Tarjeta', 'PayPal', 'Wise', 'Otro']} vacio={false} /></select></div>
                <div><label>Referencia</label><input name="referencia" /></div>
                <button className="btn">Registrar</button>
              </div>
            </form>
          </div>
        </div>
        <Archivos entidad="ordenes_compra" id={o.id} volver={volver} campos={[['orden_compra', 'Orden de compra'], ['factura', 'Confirmación / Invoice'], ['documento', 'Otro']]} />
      </div>
    </>
  );
}
