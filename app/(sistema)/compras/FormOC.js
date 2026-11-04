import { Campo, Opciones, aOpciones, listaProveedores } from '@/components/ui';
import { guardarOrdenCompra } from '@/app/acciones';
import { fechaISO } from '@/lib/formato';

export default async function FormOC({ o = {}, volver }) {
  const provs = await listaProveedores();
  return (
    <form action={guardarOrdenCompra} className="panel">
      {o.id && <input type="hidden" name="id" value={o.id} />}
      {volver && <input type="hidden" name="_volver" value={volver} />}
      <div className="campos">
        <Campo label="Folio *"><input name="folio" required defaultValue={o.folio} placeholder="PO458" /></Campo>
        <Campo label="Fecha"><input name="fecha" type="date" defaultValue={fechaISO(o.fecha) || fechaISO(new Date())} /></Campo>
        <Campo label="Proveedor"><select name="proveedor_id" defaultValue={o.proveedor_id ?? ''}><Opciones lista={aOpciones(provs)} /></select></Campo>
        <Campo label="Referencia del proveedor"><input name="referencia_proveedor" defaultValue={o.referencia_proveedor} /></Campo>
        <Campo label="Total (factura)"><input name="total" inputMode="decimal" defaultValue={o.total ?? ''} /></Campo>
        <Campo label="Moneda"><select name="moneda" defaultValue={o.moneda ?? 'USD'}><Opciones lista={['USD', 'MXN', 'EUR']} vacio={false} /></select></Campo>
        <Campo label="Notas" ancho><textarea name="notas" defaultValue={o.notas} /></Campo>
      </div>
      <div className="acciones"><button className="btn">Guardar</button></div>
    </form>
  );
}
