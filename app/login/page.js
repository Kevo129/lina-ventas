import { iniciarSesion } from '@/app/acciones';

export default async function Login({ searchParams }) {
  const { error } = await searchParams;
  return (
    <div className="login">
      <form action={iniciarSesion}>
        <h1>Lina Health · Ventas</h1>
        <p>Inicia sesión para continuar</p>
        {error && <div className="error">Correo o contraseña incorrectos.</div>}
        <div className="campo"><label>Correo</label><input name="email" type="email" required autoFocus /></div>
        <div className="campo"><label>Contraseña</label><input name="password" type="password" required /></div>
        <button className="btn">Entrar</button>
      </form>
    </div>
  );
}
