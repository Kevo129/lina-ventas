import { Campo, Opciones, aOpciones, listaProveedores } from '@/components/ui';
import { guardarProducto } from '@/app/acciones';

export default async function FormProducto({ p = {}, volver }) {
  const provs = await listaProveedores();
  return (
    <form action={guardarProducto} className="panel">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      {volver && <input type="hidden" name="_volver" value={volver} />}
      <div className="campos">
        <Campo label="Nombre *" ancho><input name="nombre" required defaultValue={p.nombre} /></Campo>
        <Campo label="Código / SKU"><input name="codigo" defaultValue={p.codigo} /></Campo>
        <Campo label="Marca / proveedor"><select name="proveedor_id" defaultValue={p.proveedor_id ?? ''}><Opciones lista={aOpciones(provs)} /></select></Campo>
        <Campo label="Categoría"><select name="categoria" defaultValue={p.categoria ?? ''}><Opciones lista={['Simulador', 'Modelo anatómico', 'Entrenador de RCP / DEA', 'Plataforma virtual', 'Consumible', 'Mobiliario / equipo', 'Curso / capacitación', 'Otro']} /></select></Campo>
        <Campo label="Precio de lista"><input name="precio_lista" inputMode="decimal" defaultValue={p.precio_lista ?? ''} /></Campo>
        <Campo label="Moneda del precio"><select name="moneda_precio" defaultValue={p.moneda_precio ?? 'MXN'}><Opciones lista={['MXN', 'USD', 'EUR']} vacio={false} /></select></Campo>
        <Campo label="Activo"><input type="checkbox" name="activo" defaultChecked={p.activo ?? true} /></Campo>
      </div>
      <div className="acciones"><button className="btn">Guardar</button></div>
    </form>
  );
}
