import { Cabecera } from '@/components/ui';
import FormOportunidad from '../FormOportunidad';

export default async function Nueva({ searchParams }) {
  const { cuenta } = await searchParams;
  return (
    <>
      <Cabecera titulo="Nueva oportunidad" migas={[['/pipeline', 'Pipeline']]} />
      <FormOportunidad o={{ cuenta_id: cuenta }} />
    </>
  );
}
