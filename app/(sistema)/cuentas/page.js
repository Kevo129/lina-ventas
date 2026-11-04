import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Opciones, Vacio } from '@/components/ui';
import { millones, fecha, etiqueta, SEGMENTOS } from '@/lib/formato';

export default async function Cuentas({ searchParams }) {
  const { q = '', segmento = '', orden = 'ventas' } = await searchParams;
  const ord = orden === 'nombre' ? sql`nombre` : orden === 'reciente' ? sql`ultima_compra desc nulls last` : sql`ventas_mxn desc`;
  const filas = await sql`
    select * from v_cuentas
    where (${q} = '' or nombre ilike ${'%' + q + '%'})
      and (${segmento} = '' or coalesce(segmento::text, 'sin') = ${segmento})
    order by ${ord} limit 300`;
  return (
    <>
      <Cabecera titulo="Cuentas" sub="Instituciones y empresas cliente">
        <Link className="btn" href="/cuentas/nueva">+ Cuenta</Link>
      </Cabecera>
      <form className="filtros">
        <input name="q" defaultValue={q} placeholder="Buscar cuenta" />
        <select name="segmento" defaultValue={segmento}><option value="">Todos los segmentos</option><option value="sin">Sin clasificar</option><Opciones lista={SEGMENTOS} vacio={false} /></select>
        <select name="orden" defaultValue={orden}><option value="ventas">Mayor venta</option><option value="reciente">Compra más reciente</option><option value="nombre">Nombre</option></select>
        <button className="btn sec">Filtrar</button>
      </form>
      <div className="panel sin-pad tabla-env">
        {filas.length === 0 ? <Vacio /> : (
          <table>
            <thead><tr><th>Cuenta</th><th>Segmento</th><th className="num">Contactos</th><th className="num">Ventas históricas</th><th className="num">Por cobrar</th><th>Última compra</th></tr></thead>
            <tbody>{filas.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/cuentas/${c.id}`}><b>{c.nombre}</b></Link></td>
                <td>{c.segmento ? etiqueta(SEGMENTOS, c.segmento) : <span className="tenue">—</span>}</td>
                <td className="num">{c.num_contactos}</td>
                <td className="num">{millones(c.ventas_mxn)}</td>
                <td className="num">{Number(c.por_cobrar_mxn) > 1 ? millones(c.por_cobrar_mxn) : '—'}</td>
                <td>{fecha(c.ultima_compra)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
