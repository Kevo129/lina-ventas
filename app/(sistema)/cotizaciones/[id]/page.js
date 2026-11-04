import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { Cabecera, Estatus, Kpi, Opciones, Archivos, Campo, aOpciones, listaProductos, listaOC, listaPedimentos } from '@/components/ui';
import { agregarPartida, actualizarPartida, borrarPartida, agregarPago, borrarPago, registrarEnvio } from '@/app/acciones';
import { dinero, fecha, fechaISO, PAQUETERIAS } from '@/lib/formato';
import FormCotizacion from '../FormCotizacion';

export default async function Cotizacion({ params, searchParams }) {
  const { id } = await params;
  const { editar } = await searchParams;
  const [c] = await sql`select * from v_cotizaciones where id = ${id}`;
  if (!c) notFound();
  const [partidas, pagos, envios, productos, ocs, pedimentos] = await Promise.all([
    sql`select * from v_partidas where cotizacion_id = ${id} order by id`,
    sql`select p.*, u.nombre usuario from pagos p left join usuarios u on u.id = p.registrado_por where cotizacion_id = ${id} order by fecha desc, id desc`,
    sql`select e.*, count(p.id) partidas from envios e left join partidas p on p.envio_id = e.id where e.cotizacion_id = ${id} group by e.id order by fecha_envio desc nulls last`,
    listaProductos(), listaOC(), listaPedimentos(),
  ]);
  const volver = `/cotizaciones/${id}`;
  const porEntregar = partidas.filter((p) => !p.entregado);
  const H = ({ n, v }) => <input type="hidden" name={n} value={v} />;

  return (
    <>
      <Cabecera titulo={`Cotización ${c.folio}`} migas={[['/cotizaciones', 'Cotizaciones']]}
        sub={<>{fecha(c.fecha)} · {c.contacto_id ? <Link href={`/contactos/${c.contacto_id}`}>{c.contacto_nombre}</Link> : 'Sin contacto'}
          {c.cuenta_id && <> · <Link href={`/cuentas/${c.cuenta_id}`}>{c.cuenta_nombre}</Link></>} · {c.vendedor_nombre ?? 'Sin vendedor'}</>}>
        <Estatus>{c.estatus}</Estatus>
        <Link className="btn sec" href={editar ? volver : `${volver}?editar=1`}>{editar ? 'Cerrar edición' : 'Editar'}</Link>
      </Cabecera>

      {editar && <FormCotizacion c={c} volver={volver} />}

      <div className="rejilla r4" style={{ marginBottom: 16 }}>
        <Kpi etiqueta="Total con IVA" valor={dinero(c.total, c.moneda)} detalle={`Subtotal ${dinero(c.subtotal, c.moneda)}`} />
        <Kpi etiqueta="Cobrado" valor={dinero(c.pagado, c.moneda)} detalle={c.ultimo_pago ? `Último pago ${fecha(c.ultimo_pago)}` : 'Sin pagos'} />
        <Kpi etiqueta="Saldo pendiente" valor={dinero(c.saldo_pendiente, c.moneda)} />
        <Kpi etiqueta="Piezas entregadas" valor={`${c.piezas_entregadas} / ${c.piezas}`} detalle={c.direccion_entrega} />
      </div>

      <div className="panel sin-pad tabla-env">
        <h2>Partidas</h2>
        <table>
          <thead><tr><th>Producto</th><th className="num">Cant.</th><th className="num">Costo unit.</th><th>OC</th><th>Pedimento</th><th>Recibido / Entregado</th><th>Envío</th><th>Estatus</th><th></th></tr></thead>
          <tbody>
            {partidas.map((p) => (
              <tr key={p.id}>
                <td>{p.producto_id ? <Link href={`/productos/${p.producto_id}`}>{p.producto_nombre}</Link> : '—'}<div className="tenue chico">{p.producto_codigo} · {p.proveedor_nombre}</div></td>
                <td className="num">{p.cantidad}</td>
                <td className="num">{p.costo_unitario != null ? dinero(p.costo_unitario, p.oc_moneda ?? 'USD') : '—'}</td>
                <td>{p.orden_compra_id ? <Link href={`/compras/${p.orden_compra_id}`}>{p.oc_folio}</Link> : '—'}</td>
                <td>{p.importacion_id ? <Link href={`/importaciones/${p.importacion_id}`}>{p.pedimento}</Link> : '—'}</td>
                <td>
                  <form action={actualizarPartida} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <H n="id" v={p.id} /><H n="_checks" v="1" /><H n="_volver" v={volver} />
                    <input type="checkbox" name="recibido" defaultChecked={p.recibido} title="Recibido" />
                    <input type="checkbox" name="entregado" defaultChecked={p.entregado} title="Entregado" />
                    <button className="btn sec chico">✓</button>
                  </form>
                </td>
                <td className="chico">{p.paqueteria ? <>{p.paqueteria}<div className="tenue">{p.guia} {p.fecha_envio && `· ${fecha(p.fecha_envio)}`}</div></> : '—'}</td>
                <td><Estatus>{p.estatus}</Estatus></td>
                <td>
                  <form action={borrarPartida}><H n="id" v={p.id} /><H n="_volver" v={volver} /><button className="btn peligro chico" title="Eliminar partida">✕</button></form>
                </td>
              </tr>
            ))}
            {partidas.length === 0 && <tr><td colSpan={9} className="vacio">Sin partidas.</td></tr>}
          </tbody>
        </table>
        <div style={{ padding: '0 18px 14px' }}>
          <details className="agregar">
            <summary>+ Agregar partida</summary>
            <form action={agregarPartida}>
              <H n="cotizacion_id" v={c.id} /><H n="_volver" v={volver} />
              <div className="campos">
                <Campo label="Producto *"><select name="producto_id" required><Opciones lista={aOpciones(productos)} /></select></Campo>
                <Campo label="Cantidad"><input name="cantidad" type="number" min="1" defaultValue="1" /></Campo>
                <Campo label="Precio unitario venta"><input name="precio_unitario" inputMode="decimal" /></Campo>
                <Campo label="Costo unitario compra"><input name="costo_unitario" inputMode="decimal" /></Campo>
                <Campo label="Orden de compra"><select name="orden_compra_id"><Opciones lista={aOpciones(ocs)} /></select></Campo>
                <Campo label="Pedimento"><select name="importacion_id"><Opciones lista={aOpciones(pedimentos)} /></select></Campo>
              </div>
              <div className="acciones"><button className="btn chico">Agregar</button></div>
            </form>
          </details>
          {porEntregar.length > 0 && (
            <details className="agregar">
              <summary>+ Registrar envío / entrega</summary>
              <form action={registrarEnvio}>
                <H n="cotizacion_id" v={c.id} /><H n="_volver" v={volver} />
                <div style={{ marginBottom: 10 }}>
                  {porEntregar.map((p) => (
                    <label key={p.id} style={{ display: 'flex', gap: 8, fontWeight: 400, color: 'inherit' }}>
                      <input type="checkbox" name="partida" value={p.id} defaultChecked={p.recibido} /> ({p.cantidad}) {p.producto_nombre}
                      {!p.recibido && <span className="tenue chico">· aún no recibido</span>}
                    </label>
                  ))}
                </div>
                <div className="campos">
                  <Campo label="Paquetería"><select name="paqueteria"><Opciones lista={PAQUETERIAS} /></select></Campo>
                  <Campo label="Guía"><input name="guia" /></Campo>
                  <Campo label="Fecha de envío"><input name="fecha_envio" type="date" defaultValue={fechaISO(new Date())} /></Campo>
                </div>
                <div className="acciones"><button className="btn chico">Registrar y marcar entregado</button></div>
              </form>
            </details>
          )}
        </div>
      </div>

      <div className="rejilla r-2-1">
        <div className="panel sin-pad">
          <h2>Pagos del cliente</h2>
          <table>
            <thead><tr><th>Fecha</th><th className="num">Monto</th><th>Método</th><th>Referencia</th><th>Registró</th><th></th></tr></thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td>{fecha(p.fecha)}</td><td className="num">{dinero(p.monto, c.moneda)}</td><td>{p.metodo}</td>
                  <td className="tenue">{p.referencia}{p.notas && <div className="chico">{p.notas}</div>}</td><td className="tenue">{p.usuario ?? '—'}</td>
                  <td><form action={borrarPago}><H n="id" v={p.id} /><H n="_volver" v={volver} /><button className="btn peligro chico">✕</button></form></td>
                </tr>
              ))}
              {pagos.length === 0 && <tr><td colSpan={6} className="vacio">Sin pagos registrados.</td></tr>}
            </tbody>
          </table>
          <form action={agregarPago} style={{ padding: '6px 18px 16px' }}>
            <H n="cotizacion_id" v={c.id} /><H n="_volver" v={volver} />
            <div className="en-linea">
              <div><label>Fecha</label><input name="fecha" type="date" defaultValue={fechaISO(new Date())} /></div>
              <div><label>Monto ({c.moneda})</label><input name="monto" inputMode="decimal" required defaultValue={Number(c.saldo_pendiente) > 0 ? c.saldo_pendiente : ''} /></div>
              <div><label>Método</label><select name="metodo"><Opciones lista={['Transferencia', 'Tarjeta', 'Mercado Pago', 'Mercado Libre', 'Cheque', 'Efectivo']} vacio={false} /></select></div>
              <div><label>Referencia</label><input name="referencia" /></div>
              <button className="btn">Registrar pago</button>
            </div>
          </form>
        </div>
        <div>
          <Archivos entidad="cotizaciones" id={c.id} volver={volver} campos={[['cotizacion', 'Cotización (PDF)'], ['orden_cliente', 'OC del cliente'], ['factura', 'Factura'], ['comprobante', 'Comprobante de pago'], ['documento', 'Otro']]} />
          {envios.length > 0 && (
            <div className="panel">
              <h2>Envíos</h2>
              <ul className="linea-tiempo">
                {envios.map((e) => <li key={e.id}>{e.paqueteria ?? '—'} {e.guia && <b>{e.guia}</b>}<div className="meta">{fecha(e.fecha_envio)} · {e.partidas} partidas</div></li>)}
              </ul>
            </div>
          )}
          {c.notas && <div className="panel"><h2>Notas</h2><div style={{ whiteSpace: 'pre-wrap' }}>{c.notas}</div></div>}
        </div>
      </div>
    </>
  );
}
