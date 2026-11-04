import { Campo, Opciones, aOpciones, listaCuentas } from '@/components/ui';
import { guardarContacto } from '@/app/acciones';

export default async function FormContacto({ c = {}, volver }) {
  const cuentas = await listaCuentas();
  return (
    <form action={guardarContacto} className="panel">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      {volver && <input type="hidden" name="_volver" value={volver} />}
      <div className="campos">
        <Campo label="Nombre *"><input name="nombre" required defaultValue={c.nombre} /></Campo>
        <Campo label="Apellido"><input name="apellido" defaultValue={c.apellido} /></Campo>
        <Campo label="Puesto"><input name="puesto" defaultValue={c.puesto} placeholder="Coordinador de simulación" /></Campo>
        <Campo label="Cuenta / institución"><select name="cuenta_id" defaultValue={c.cuenta_id ?? ''}><Opciones lista={aOpciones(cuentas)} /></select></Campo>
        <Campo label="Correo"><input name="correo" type="email" defaultValue={c.correo} /></Campo>
        <Campo label="Teléfono"><input name="telefono" defaultValue={c.telefono} /></Campo>
        <Campo label="RFC (facturación)"><input name="rfc" defaultValue={c.rfc} /></Campo>
        <Campo label="Dirección de entrega" ancho><input name="direccion_entrega" defaultValue={c.direccion_entrega} /></Campo>
        <Campo label="Notas" ancho><textarea name="notas" defaultValue={c.notas} /></Campo>
      </div>
      <div className="acciones"><button className="btn">Guardar</button></div>
    </form>
  );
}
