import { sql, config } from '@/lib/db';
import { requiereUsuario } from '@/lib/auth';
import { Cabecera, Campo, Opciones } from '@/components/ui';
import { guardarConfiguracion, guardarUsuario } from '@/app/acciones';
import { ROLES, etiqueta } from '@/lib/formato';

export default async function Configuracion() {
  await requiereUsuario(['admin']);
  const [cfg, usuarios] = await Promise.all([config(), sql`select * from usuarios order by activo desc, nombre`]);
  return (
    <>
      <Cabecera titulo="Configuración" />
      <div className="rejilla r2">
        <form action={guardarConfiguracion} className="panel">
          <h2>Parámetros</h2>
          <div className="campos">
            <Campo label="Meta mensual (MXN con IVA)"><input name="meta_mensual_mxn" defaultValue={cfg.meta_mensual_mxn} /></Campo>
            <Campo label="Tipo de cambio USD → MXN"><input name="tipo_cambio_usd" defaultValue={cfg.tipo_cambio_usd} /></Campo>
            <Campo label="Tipo de cambio EUR → MXN"><input name="tipo_cambio_eur" defaultValue={cfg.tipo_cambio_eur} /></Campo>
            <Campo label="IVA"><input name="iva" defaultValue={cfg.iva} /></Campo>
          </div>
          <p className="tenue chico">El tipo de cambio se usa para reportes cuando una cotización no tiene uno propio.</p>
          <div className="acciones"><button className="btn">Guardar</button></div>
        </form>
        <div className="panel">
          <h2>Usuarios</h2>
          <ul className="linea-tiempo">
            {usuarios.map((u) => (
              <li key={u.id}>
                <details>
                  <summary style={{ cursor: 'pointer' }}><b>{u.nombre}</b> <span className="tenue">· {u.email} · {etiqueta(ROLES, u.rol)}{!u.activo && ' · inactivo'}{!u.password_hash && ' · sin contraseña'}</span></summary>
                  <FormUsuario u={u} />
                </details>
              </li>
            ))}
          </ul>
          <details className="agregar"><summary>+ Nuevo usuario</summary><FormUsuario u={{ activo: true, rol: 'ventas' }} /></details>
        </div>
      </div>
    </>
  );
}

function FormUsuario({ u }) {
  return (
    <form action={guardarUsuario} style={{ marginTop: 8 }}>
      {u.id && <input type="hidden" name="id" value={u.id} />}
      <div className="campos">
        <Campo label="Nombre"><input name="nombre" required defaultValue={u.nombre} /></Campo>
        <Campo label="Correo"><input name="email" type="email" required defaultValue={u.email} /></Campo>
        <Campo label="Rol"><select name="rol" defaultValue={u.rol}><Opciones lista={ROLES} vacio={false} /></select></Campo>
        <Campo label={u.id ? 'Nueva contraseña (opcional)' : 'Contraseña'}><input name="password" type="password" required={!u.id} minLength={8} /></Campo>
        <Campo label="Activo"><input type="checkbox" name="activo" defaultChecked={u.activo} /></Campo>
      </div>
      <div className="acciones"><button className="btn chico">Guardar</button></div>
    </form>
  );
}
