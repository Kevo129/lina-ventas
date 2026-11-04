import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import FormOC from '../FormOC';

export default async function Nueva() {
  const [f] = await sql`select max(substring(folio from '^PO(\\d+)$')::int) n from ordenes_compra`;
  return (<><Cabecera titulo="Nueva orden de compra" migas={[['/compras', 'Órdenes de compra']]} /><FormOC o={{ folio: f?.n ? `PO${f.n + 1}` : '' }} /></>);
}
