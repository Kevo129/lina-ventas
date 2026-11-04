import { Campo, Opciones, aOpciones, listaUsuarios } from '@/components/ui';
import { guardarCuenta } from '@/app/acciones';
import { SEGMENTOS } from '@/lib/formato';

export default async function FormCuenta({ c = {}, volver }) {
  const usuarios = await listaUsuarios();
  return (
    <form action={guardarCuenta} className="panel">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      {volver && <input type="hidden" name="_volver" value={volver} />}
      <div className="campos">
        <Campo label="Nombre *" ancho><input name="nombre" required defaultValue={c.nombre} /></Campo>
        <Campo label="Segmento"><select name="segmento" defaultValue={c.segmento ?? ''}><Opciones lista={SEGMENTOS} /></select></Campo>
        <Campo label="RFC"><input name="rfc" defaultValue={c.rfc} /></Campo>
        <Campo label="Ciudad"><input name="ciudad" defaultValue={c.ciudad} /></Campo>
        <Campo label="Estado"><input name="estado" defaultValue={c.estado} /></Campo>
        <Campo label="Sitio web"><input name="sitio_web" defaultValue={c.sitio_web} /></Campo>
        <Campo label="Responsable de la cuenta"><select name="responsable_id" defaultValue={c.responsable_id ?? ''}><Opciones lista={aOpciones(usuarios)} /></select></Campo>
        <Campo label="Notas" ancho><textarea name="notas" defaultValue={c.notas} /></Campo>
      </div>
      <div className="acciones"><button className="btn">Guardar</button></div>
    </form>
  );
}
