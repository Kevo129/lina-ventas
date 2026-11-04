import postgres from 'postgres';

// Una sola conexión compartida (también en desarrollo con recarga en caliente)
const g = globalThis;
export const sql =
  g.__sql ??
  (g.__sql = postgres(process.env.DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    onnotice: () => {},
    ssl: process.env.DATABASE_SSL === 'true' ? 'require' : false,
    types: {
      numeric: { to: 1700, from: [1700], serialize: (x) => String(x), parse: (x) => Number(x) },
      bigint: { to: 20, from: [20], serialize: (x) => String(x), parse: (x) => Number(x) },
    },
  }));

export async function config() {
  const rows = await sql`select clave, valor from configuracion`;
  return Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
}
