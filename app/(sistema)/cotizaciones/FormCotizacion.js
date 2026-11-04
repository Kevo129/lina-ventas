import { sql } from '@/lib/db';
import { Campo, Opciones, aOpciones, listaContactos, listaUsuarios } from '@/components/ui';
import { guardarCotizacion } from '@/app/acciones';
import { ESTADOS_COT, fechaISO } from '@/lib/formato';

export default async function FormCotizacion({ c = {}, volver }) {
  const [contactos, usuarios, ops] = await Promise.all([
    listaContactos(), listaUsuarios(),
    sql`select id, titulo || coalesce(' — ' || cuenta_nombre, '') etiqueta from v_oportunidades
        where etapa not in ('perdida') or id = ${c.oportunidad_id ?? 0} order by created_at desc limit 300`,
  ]);
  return (
    <form action={guardarCotizacion} className="panel">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      {volver && <input type="hidden" name="_volver" value={volver} />}
      <div className="campos">
        <Campo label="Folio *"><input name="folio" required defaultValue={c.folio} placeholder="QUO5573" /></Campo>
        <Campo label="Fecha"><input name="fecha" type="date" defaultValue={fechaISO(c.fecha) || fechaISO(new Date())} /></Campo>
        <Campo label="Estado"><select name="estado" defaultValue={c.estado ?? 'enviada'}><Opciones lista={ESTADOS_COT} vacio={false} /></select></Campo>
        <Campo label="Contacto"><select name="contacto_id" defaultValue={c.contacto_id ?? ''}><Opciones lista={aOpciones(contactos)} /></select></Campo>
        <Campo label="Oportunidad"><select name="oportunidad_id" defaultValue={c.oportunidad_id ?? ''}><Opciones lista={aOpciones(ops)} /></select></Campo>
        <Campo label="Vendedor"><select name="vendedor_id" defaultValue={c.vendedor_id ?? ''}><Opciones lista={aOpciones(usuarios)} /></select></Campo>
        <Campo label="Total con IVA"><input name="total" inputMode="decimal" defaultValue={c.total ?? ''} /></Campo>
        <Campo label="Moneda"><select name="moneda" defaultValue={c.moneda ?? 'MXN'}><Opciones lista={['MXN', 'USD', 'EUR']} vacio={false} /></select></Campo>
        <Campo label="Tipo de cambio (si no es MXN)"><input name="tipo_cambio" inputMode="decimal" defaultValue={c.tipo_cambio ?? ''} /></Campo>
        <Campo label="Canal"><select name="canal" defaultValue={c.canal ?? 'Directo'}><Opciones lista={['Directo', 'Mercado Libre', 'Licitación', 'Distribuidor', 'Sitio web']} vacio={false} /></select></Campo>
        <Campo label="Notas" ancho><textarea name="notas" defaultValue={c.notas} /></Campo>
      </div>
      <div className="acciones"><button className="btn">Guardar</button>
        <span className="tenue chico">El PDF de CRM Adoc se sube en el panel de archivos.</span></div>
    </form>
  );
}
