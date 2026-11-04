import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Estatus, Opciones, aOpciones, listaOC, listaPedimentos } from '@/components/ui';
import { asignarPartidas } from '@/app/acciones';
import { fecha, entero } from '@/lib/formato';

const ESTATUS = ['OC PENDIENTE', 'PEDIMENTO PENDIENTE', 'EN TRÁNSITO', 'EN STOCK'];

export default async function Logistica({ searchParams }) {
  const { estatus = '', proveedor = '' } = await searchParams;
  const [conteo, filas, ocs, pedimentos, provs] = await Promise.all([
    sql`select estatus, count(*)::int n, sum(cantidad)::int piezas from v_partidas where not entregado group by 1`,
    sql`select * from v_partidas
        where not entregado and (${estatus} = '' or estatus = ${estatus})
          and (${proveedor} = '' or proveedor_nombre = ${proveedor})
        order by cotizacion_fecha nulls last, id limit 400`,
    listaOC(), listaPedimentos(),
    sql`select distinct proveedor_nombre from v_partidas where not entregado and proveedor_nombre is not null order by 1`,
  ]);
  const volver = `/logistica?${new URLSearchParams({ estatus, proveedor })}`;
  return (
    <>
      <Cabecera titulo="Logística" sub="Todo lo vendido que aún no se entrega: qué falta pedir, qué viene en camino y qué está en bodega" />
      <div className="rejilla r4" style={{ marginBottom: 16 }}>
        {ESTATUS.map((e) => {
          const c = conteo.find((x) => x.estatus === e);
          return (
            <Link key={e} href={`/logistica?estatus=${encodeURIComponent(e)}`} className="kpi" style={{ textDecoration: 'none', color: 'inherit', outline: estatus === e ? '2px solid var(--marca)' : 'none' }}>
              <div className="eti">{e}</div><div className="val">{entero(c?.n ?? 0)}</div><div className="det">{entero(c?.piezas ?? 0)} piezas</div>
            </Link>
          );
        })}
      </div>
      <form className="filtros">
        <select name="estatus" defaultValue={estatus}><option value="">Todo lo pendiente</option><Opciones lista={ESTATUS} vacio={false} /></select>
        <select name="proveedor" defaultValue={proveedor}><option value="">Todas las marcas</option><Opciones lista={provs.map((p) => p.proveedor_nombre)} vacio={false} /></select>
        <button className="btn sec">Filtrar</button>
      </form>
      <form action={asignarPartidas}>
        <input type="hidden" name="_volver" value={volver} />
        <div className="panel" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <h2>Acción sobre las partidas seleccionadas</h2>
          <div className="en-linea">
            <div><label>Asignar OC</label><select name="orden_compra_id"><Opciones lista={aOpciones(ocs)} vacio="(sin cambio)" /></select></div>
            <div><label>Asignar pedimento</label><select name="importacion_id"><Opciones lista={aOpciones(pedimentos)} vacio="(sin cambio)" /></select></div>
            <div><label>Marcar como</label><select name="marcar"><option value="">(sin cambio)</option><option value="recibido">Recibido en bodega</option><option value="entregado">Entregado al cliente</option></select></div>
            <button className="btn">Aplicar</button>
          </div>
        </div>
        <div className="panel sin-pad tabla-env">
          <table>
            <thead><tr><th></th><th>Producto</th><th>Marca</th><th className="num">Cant.</th><th>Cotización</th><th>Vendida</th><th>OC</th><th>Pedimento</th><th>Estatus</th></tr></thead>
            <tbody>{filas.map((p) => (
              <tr key={p.id}>
                <td><input type="checkbox" name="partida" value={p.id} /></td>
                <td>{p.producto_nombre}<div className="tenue chico">{p.producto_codigo}</div></td>
                <td>{p.proveedor_nombre ?? '—'}</td><td className="num">{p.cantidad}</td>
                <td>{p.cotizacion_id ? <Link href={`/cotizaciones/${p.cotizacion_id}`}>{p.cotizacion_folio}</Link> : '—'}</td>
                <td>{fecha(p.cotizacion_fecha)}</td>
                <td>{p.orden_compra_id ? <Link href={`/compras/${p.orden_compra_id}`}>{p.oc_folio}</Link> : '—'}</td>
                <td>{p.pedimento ?? '—'}</td><td><Estatus>{p.estatus}</Estatus></td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={9} className="vacio">Nada pendiente aquí. 🎉</td></tr>}</tbody>
          </table>
        </div>
      </form>
    </>
  );
}
