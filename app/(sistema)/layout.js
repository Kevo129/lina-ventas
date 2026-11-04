import Link from 'next/link';
import { requiereUsuario } from '@/lib/auth';
import { cerrarSesion } from '@/app/acciones';
import { etiqueta, ROLES } from '@/lib/formato';

export const dynamic = 'force-dynamic';

const MENU = [
  [null, [['/', 'Tablero']]],
  ['Comercial', [['/pipeline', 'Pipeline'], ['/cotizaciones', 'Cotizaciones'], ['/cuentas', 'Cuentas'], ['/contactos', 'Contactos']]],
  ['Operación', [['/logistica', 'Logística'], ['/compras', 'Órdenes de compra'], ['/importaciones', 'Importaciones'], ['/productos', 'Productos'], ['/proveedores', 'Proveedores']]],
  ['Finanzas', [['/cobranza', 'Cobranza'], ['/cuentas-por-pagar', 'Cuentas por pagar']]],
];

export default async function Sistema({ children }) {
  const u = await requiereUsuario();
  return (
    <div className="app">
      <aside className="lateral">
        <div className="logo"><span>LH</span> Lina Health · Ventas</div>
        <nav>
          {MENU.map(([grupo, items]) => (
            <div key={grupo ?? 'inicio'}>
              {grupo && <div className="grupo">{grupo}</div>}
              {items.map(([href, t]) => <Link key={href} href={href}>{t}</Link>)}
            </div>
          ))}
          {u.rol === 'admin' && <><div className="grupo">Sistema</div><Link href="/configuracion">Configuración</Link></>}
        </nav>
        <div className="usuario">
          <div style={{ color: '#fff' }}>{u.nombre}</div>
          <div>{etiqueta(ROLES, u.rol)}</div>
          <form action={cerrarSesion}><button>Cerrar sesión</button></form>
        </div>
      </aside>
      <main className="contenido">{children}</main>
    </div>
  );
}
