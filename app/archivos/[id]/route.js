import { sql } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { leerArchivo } from '@/lib/storage.mjs';

export async function GET(_req, { params }) {
  if (!(await usuarioActual())) return new Response('No autorizado', { status: 401 });
  const { id } = await params;
  const [a] = await sql`select * from archivos where id = ${id}`;
  if (!a) return new Response('No encontrado', { status: 404 });
  const buf = await leerArchivo(a.ruta);
  return new Response(buf, {
    headers: {
      'Content-Type': a.mime || 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(a.nombre)}`,
    },
  });
}
