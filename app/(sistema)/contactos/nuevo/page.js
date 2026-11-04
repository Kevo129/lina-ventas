import { Cabecera } from '@/components/ui';
import FormContacto from '../FormContacto';

export default async function Nuevo({ searchParams }) {
  const { cuenta } = await searchParams;
  return (<><Cabecera titulo="Nuevo contacto" migas={[['/contactos', 'Contactos']]} /><FormContacto c={{ cuenta_id: cuenta }} /></>);
}
