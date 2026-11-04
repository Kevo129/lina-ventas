import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Campo, Opciones, Vacio } from '@/components/ui';
import { guardarImportacion } from '@/app/acciones';
import { fecha, ADUANAS } from '@/lib/formato';

export default async function Importaciones({ searchParams }) {
  const { q = '' } = await searchParams;
  const filas = await sql`
    select i.*, count(p.id)::int partidas, coalesce(sum(p.cantidad),0)::int piezas,
           coalesce(sum(p.cantidad) filter (where p.recibido),0)::int recibidas
    from importaciones i left join partidas p on p.importacion_id = i.id
    where ${q} = '' or i.pedimento ilike ${'%' + q + '%'}
    group by i.id order by i.fecha_importacion desc nulls last, i.id desc limit 300`;
  return (
    <>
      <Cabecera titulo="Importaciones" sub="Pedimentos y aduanas" />
      <div className="rejilla r-2-1">
        <div>
          <form className="filtros"><input name="q" defaultValue={q} placeholder="Número de pedimento" /><button className="btn sec">Buscar</button></form>
          <div className="panel sin-pad tabla-env">
            {filas.length === 0 ? <Vacio /> : (
              <table>
                <thead><tr><th>Pedimento</th><th>Aduana</th><th>Fecha</th><th className="num">Partidas</th><th className="num">Recibidas</th></tr></thead>
                <tbody>{filas.map((i) => (
                  <tr key={i.id}><td><Link href={`/importaciones/${i.id}`}><b>{i.pedimento}</b></Link></td><td>{i.aduana ?? '—'}</td>
                    <td>{fecha(i.fecha_importacion)}</td><td className="num">{i.partidas}</td><td className="num">{i.recibidas}/{i.piezas}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
        <form action={guardarImportacion} className="panel">
          <h2>Nueva importación</h2>
          <div className="campos">
            <Campo label="Pedimento *" ancho><input name="pedimento" required placeholder="26 24 1653 6003232" /></Campo>
            <Campo label="Aduana"><select name="aduana"><Opciones lista={ADUANAS} /></select></Campo>
            <Campo label="Fecha"><input type="date" name="fecha_importacion" /></Campo>
          </div>
          <div className="acciones"><button className="btn">Agregar</button></div>
        </form>
      </div>
    </>
  );
}
