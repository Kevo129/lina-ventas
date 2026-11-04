import { Cabecera } from '@/components/ui';
import FormCuenta from '../FormCuenta';

export default function Nueva() {
  return (<><Cabecera titulo="Nueva cuenta" migas={[['/cuentas', 'Cuentas']]} /><FormCuenta /></>);
}
