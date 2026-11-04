import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secreto = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('Falta SESSION_SECRET');
  return new TextEncoder().encode(s || 'solo-para-desarrollo-local');
};

export async function proxy(request) {
  const token = request.cookies.get('lina_sesion')?.value;
  if (token) {
    try { await jwtVerify(token, secreto()); return NextResponse.next(); } catch {}
  }
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico|logo.svg).*)'],
};
