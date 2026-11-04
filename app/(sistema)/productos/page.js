import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Opciones, Vacio, aOpciones, listaProveedores } from '@/components/ui';
import { entero, fecha, dinero } from '@/lib/formato';

export default async function Productos({ searchParams }) {
  const { q = '', proveedor = '' } = await searchParams;
  const like = '%' + q + '%';
  const [filas, provs] = await Promise.all([
    sql`select * from v_productos
        where (${q} = '' or nombre ilike ${like} or codigo ilike ${like})
          and (${proveedor} = '' or proveedor_id::text = ${proveedor})
        order by piezas_vendidas desc, nombre limit 300`,
    listaProveedores(),
  ]);
  return (
    <>
      <Cabecera titulo="Productos" sub="Catálogo de simuladores, modelos y plataformas">
        <Link className="btn" href="/productos/nuevo">+ Producto</Link>
      </Cabecera>
      <form className="filtros">
        <input name="q" defaultValue={q} placeholder="Nombre o código" />
        <select name="proveedor" defaultValue={proveedor}><option value="">Todas las marcas</option><Opciones lista={aOpciones(provs)} vacio={false} /></select>
        <button className="btn sec">Filtrar</button>
      </form>
      <div className="panel sin-pad tabla-env">
        {filas.length === 0 ? <Vacio /> : (
          <table>
            <thead><tr><th>Producto</th><th>Código</th><th>Marca</th><th className="num">Precio lista</th><th className="num">Vendidas</th><th className="num">Por entregar</th><th className="num">En stock</th><th>Última venta</th></tr></thead>
            <tbody>{filas.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/productos/${p.id}`}><b>{p.nombre}</b></Link>{!p.activo && <span className="tenue chico"> (inactivo)</span>}</td>
                <td className="tenue">{p.codigo}</td><td>{p.proveedor_nombre ?? '—'}</td>
                <td className="num">{p.precio_lista ? dinero(p.precio_lista, p.moneda_precio) : '—'}</td>
                <td className="num">{entero(p.piezas_vendidas)}</td><td className="num">{entero(p.piezas_por_entregar)}</td>
                <td className="num">{entero(p.piezas_en_stock)}</td><td>{fecha(p.ultima_venta)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
