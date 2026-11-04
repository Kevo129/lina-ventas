import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const COOKIE = 'lina_sesion';
const secreto = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('Falta SESSION_SECRET');
  return new TextEncoder().encode(s || 'solo-para-desarrollo-local');
};

export async function crearToken(usuario) {
  return new SignJWT({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secreto());
}

export async function verificarToken(token) {
  try {
    const { payload } = await jwtVerify(token, secreto());
    return payload;
  } catch {
    return null;
  }
}

export async function usuarioActual() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verificarToken(token) : null;
}

export async function requiereUsuario(roles) {
  const u = await usuarioActual();
  if (!u) redirect('/login');
  if (roles && !roles.includes(u.rol)) redirect('/?sinpermiso=1');
  return u;
}
