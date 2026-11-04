import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Campo } from '@/components/ui';
import { guardarProveedor } from '@/app/acciones';
import { entero } from '@/lib/formato';

export default async function Proveedores() {
  const filas = await sql`
    select pr.*, (select count(*) from productos p where p.proveedor_id = pr.id)::int productos,
           (select count(*) from ordenes_compra o where o.proveedor_id = pr.id)::int ocs
    from proveedores pr order by nombre`;
  return (
    <>
      <Cabecera titulo="Proveedores y marcas" sub="Unifica «Marca» de productos y «Proveedor» de órdenes de compra" />
      <div className="rejilla r-2-1">
        <div className="panel sin-pad tabla-env">
          <table>
            <thead><tr><th>Nombre</th><th>País</th><th>Contacto</th><th className="num">Productos</th><th className="num">OCs</th></tr></thead>
            <tbody>{filas.map((p) => (
              <tr key={p.id}>
                <td><details><summary style={{ cursor: 'pointer' }}><b>{p.nombre}</b></summary>
                  <form action={guardarProveedor} style={{ marginTop: 8 }}>
                    <input type="hidden" name="id" value={p.id} />
                    <div className="campos">
                      <Campo label="Nombre"><input name="nombre" defaultValue={p.nombre} required /></Campo>
                      <Campo label="País"><input name="pais" defaultValue={p.pais} /></Campo>
                      <Campo label="Contacto"><input name="contacto" defaultValue={p.contacto} /></Campo>
                      <Campo label="Correo"><input name="correo" defaultValue={p.correo} /></Campo>
                      <Campo label="Teléfono"><input name="telefono" defaultValue={p.telefono} /></Campo>
                    </div>
                    <div className="acciones"><button className="btn chico">Guardar</button></div>
                  </form></details></td>
                <td>{p.pais ?? '—'}</td><td>{p.contacto ?? '—'}{p.correo && <div className="tenue chico">{p.correo}</div>}</td>
                <td className="num"><Link href={`/productos?proveedor=${p.id}`}>{entero(p.productos)}</Link></td><td className="num">{entero(p.ocs)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <form action={guardarProveedor} className="panel">
          <h2>Nuevo proveedor</h2>
          <div className="campos">
            <Campo label="Nombre *" ancho><input name="nombre" required /></Campo>
            <Campo label="País"><input name="pais" /></Campo>
            <Campo label="Contacto"><input name="contacto" /></Campo>
            <Campo label="Correo"><input name="correo" /></Campo>
            <Campo label="Teléfono"><input name="telefono" /></Campo>
          </div>
          <div className="acciones"><button className="btn">Agregar</button></div>
        </form>
      </div>
    </>
  );
}
