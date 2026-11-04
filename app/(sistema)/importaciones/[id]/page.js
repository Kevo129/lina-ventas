import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { Cabecera, Campo, Estatus, Opciones, Archivos } from '@/components/ui';
import { guardarImportacion } from '@/app/acciones';
import { fecha, fechaISO, ADUANAS } from '@/lib/formato';

export default async function Importacion({ params }) {
  const { id } = await params;
  const [i] = await sql`select * from importaciones where id = ${id}`;
  if (!i) notFound();
  const partidas = await sql`select * from v_partidas where importacion_id = ${id} order by id`;
  const volver = `/importaciones/${id}`;
  return (
    <>
      <Cabecera titulo={`Pedimento ${i.pedimento}`} migas={[['/importaciones', 'Importaciones']]} sub={`${i.aduana ?? 'Sin aduana'} · ${fecha(i.fecha_importacion)}`} />
      <div className="rejilla r-2-1">
        <div>
          <form action={guardarImportacion} className="panel">
            <input type="hidden" name="id" value={i.id} /><input type="hidden" name="_volver" value={volver} />
            <div className="campos">
              <Campo label="Pedimento"><input name="pedimento" required defaultValue={i.pedimento} /></Campo>
              <Campo label="Aduana"><select name="aduana" defaultValue={i.aduana ?? ''}><Opciones lista={ADUANAS.includes(i.aduana) || !i.aduana ? ADUANAS : [i.aduana, ...ADUANAS]} /></select></Campo>
              <Campo label="Fecha"><input type="date" name="fecha_importacion" defaultValue={fechaISO(i.fecha_importacion)} /></Campo>
              <Campo label="Notas" ancho><textarea name="notas" defaultValue={i.notas} /></Campo>
            </div>
            <div className="acciones"><button className="btn">Guardar</button></div>
          </form>
          <div className="panel sin-pad tabla-env">
            <h2>Partidas en este pedimento</h2>
            <table>
              <thead><tr><th>Producto</th><th className="num">Cant.</th><th>OC</th><th>Cotización</th><th>Estatus</th></tr></thead>
              <tbody>{partidas.map((p) => (
                <tr key={p.id}><td>{p.producto_nombre}</td><td className="num">{p.cantidad}</td>
                  <td>{p.orden_compra_id ? <Link href={`/compras/${p.orden_compra_id}`}>{p.oc_folio}</Link> : '—'}</td>
                  <td>{p.cotizacion_id ? <Link href={`/cotizaciones/${p.cotizacion_id}`}>{p.cotizacion_folio}</Link> : '—'}</td>
                  <td><Estatus>{p.estatus}</Estatus></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <Archivos entidad="importaciones" id={i.id} volver={volver} />
      </div>
    </>
  );
}
