import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import FormCotizacion from '../FormCotizacion';

export default async function Nueva({ searchParams }) {
  const { oportunidad, contacto } = await searchParams;
  let c = { contacto_id: contacto, oportunidad_id: oportunidad };
  if (oportunidad) {
    const [o] = await sql`select contacto_id, moneda, monto_estimado from oportunidades where id = ${oportunidad}`;
    if (o) c = { ...c, contacto_id: o.contacto_id, moneda: o.moneda, total: o.monto_estimado };
  }
  // siguiente folio sugerido
  const [f] = await sql`select max(substring(folio from '^QUO(\\d+)$')::int) n from cotizaciones`;
  c.folio = f?.n ? `QUO${f.n + 1}` : '';
  return (
    <>
      <Cabecera titulo="Nueva cotización" migas={[['/cotizaciones', 'Cotizaciones']]} />
      <FormCotizacion c={c} />
    </>
  );
}
