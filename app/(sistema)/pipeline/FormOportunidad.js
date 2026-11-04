import { Campo, Opciones, aOpciones, listaContactos, listaCuentas, listaUsuarios } from '@/components/ui';
import { guardarOportunidad } from '@/app/acciones';
import { ETAPAS, FUENTES, fechaISO } from '@/lib/formato';

export default async function FormOportunidad({ o = {}, volver }) {
  const [cuentas, contactos, usuarios] = await Promise.all([listaCuentas(), listaContactos(), listaUsuarios()]);
  return (
    <form action={guardarOportunidad} className="panel">
      {o.id && <input type="hidden" name="id" value={o.id} />}
      {volver && <input type="hidden" name="_volver" value={volver} />}
      <div className="campos">
        <Campo label="Título *" ancho><input name="titulo" required defaultValue={o.titulo} placeholder="Ej. Laboratorio de simulación Enfermería UANL" /></Campo>
        <Campo label="Cuenta"><select name="cuenta_id" defaultValue={o.cuenta_id ?? ''}><Opciones lista={aOpciones(cuentas)} /></select></Campo>
        <Campo label="Contacto"><select name="contacto_id" defaultValue={o.contacto_id ?? ''}><Opciones lista={aOpciones(contactos)} /></select></Campo>
        <Campo label="Etapa"><select name="etapa" defaultValue={o.etapa ?? 'prospecto'}><Opciones lista={ETAPAS} vacio={false} /></select></Campo>
        <Campo label="Fuente"><select name="fuente" defaultValue={o.fuente ?? ''}><Opciones lista={FUENTES} /></select></Campo>
        <Campo label="Monto estimado"><input name="monto_estimado" inputMode="decimal" defaultValue={o.monto_estimado ?? ''} /></Campo>
        <Campo label="Moneda"><select name="moneda" defaultValue={o.moneda ?? 'MXN'}><Opciones lista={['MXN', 'USD', 'EUR']} vacio={false} /></select></Campo>
        <Campo label="Probabilidad % (opcional)"><input name="probabilidad" type="number" min="0" max="100" defaultValue={o.probabilidad ?? ''} placeholder="Automática por etapa" /></Campo>
        <Campo label="Cierre estimado"><input name="fecha_cierre_estimada" type="date" defaultValue={fechaISO(o.fecha_cierre_estimada)} /></Campo>
        <Campo label="Responsable"><select name="responsable_id" defaultValue={o.responsable_id ?? ''}><Opciones lista={aOpciones(usuarios)} /></select></Campo>
        <Campo label="Siguiente paso"><input name="siguiente_paso" defaultValue={o.siguiente_paso} placeholder="Ej. Enviar propuesta técnica" /></Campo>
        <Campo label="Fecha siguiente paso"><input name="fecha_siguiente_paso" type="date" defaultValue={fechaISO(o.fecha_siguiente_paso)} /></Campo>
        <Campo label="Motivo de pérdida"><input name="motivo_perdida" defaultValue={o.motivo_perdida} /></Campo>
        <Campo label="Notas" ancho><textarea name="notas" defaultValue={o.notas} /></Campo>
      </div>
      <div className="acciones"><button className="btn">Guardar</button></div>
    </form>
  );
}
