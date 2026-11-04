import { Cabecera } from '@/components/ui';
import FormProducto from '../FormProducto';

export default function Nuevo() {
  return (<><Cabecera titulo="Nuevo producto" migas={[['/productos', 'Productos']]} /><FormProducto /></>);
}
