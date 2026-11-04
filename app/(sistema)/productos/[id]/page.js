import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { Cabecera, Estatus, Kpi, Archivos } from '@/components/ui';
import { entero, fecha } from '@/lib/formato';
import FormProducto from '../FormProducto';

export default async function Producto({ params }) {
  const { id } = await params;
  const [p] = await sql`select * from v_productos where id = ${id}`;
  if (!p) notFound();
  const partidas = await sql`select * from v_partidas where producto_id = ${id} order by cotizacion_fecha desc nulls last limit 100`;
  const volver = `/productos/${id}`;
  return (
    <>
      <Cabecera titulo={p.nombre} migas={[['/productos', 'Productos']]} sub={[p.codigo, p.proveedor_nombre].filter(Boolean).join(' · ')} />
      <div className="rejilla r4" style={{ marginBottom: 16 }}>
        <Kpi etiqueta="Piezas vendidas" valor={entero(p.piezas_vendidas)} detalle={`Última venta ${fecha(p.ultima_venta)}`} />
        <Kpi etiqueta="Entregadas" valor={entero(p.piezas_entregadas)} />
        <Kpi etiqueta="Por entregar" valor={entero(p.piezas_por_entregar)} />
        <Kpi etiqueta="En stock (recibidas sin entregar)" valor={entero(p.piezas_en_stock)} />
      </div>
      <div className="rejilla r-2-1">
        <div>
          <FormProducto p={p} volver={volver} />
          <div className="panel sin-pad tabla-env">
            <h2>Movimientos</h2>
            <table>
              <thead><tr><th>Cotización</th><th>Fecha</th><th className="num">Cant.</th><th>OC</th><th>Estatus</th></tr></thead>
              <tbody>{partidas.map((x) => (
                <tr key={x.id}><td>{x.cotizacion_id ? <Link href={`/cotizaciones/${x.cotizacion_id}`}>{x.cotizacion_folio}</Link> : '—'}</td>
                  <td>{fecha(x.cotizacion_fecha)}</td><td className="num">{x.cantidad}</td><td>{x.oc_folio ?? '—'}</td><td><Estatus>{x.estatus}</Estatus></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <Archivos entidad="productos" id={p.id} volver={volver} campos={[['foto', 'Foto'], ['ficha_tecnica', 'Ficha técnica'], ['documento', 'Otro']]} />
      </div>
    </>
  );
}
