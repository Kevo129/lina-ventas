#!/usr/bin/env node
// Crea un usuario o cambia su contraseña/rol.
// Uso: npm run usuario -- correo@linahp.com "Nombre" rol contraseña
//   rol: admin | ventas | administracion | contabilidad
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const [email, nombre, rol = 'ventas', pass] = process.argv.slice(2);
if (!email || !nombre || !pass) {
  console.log('Uso: npm run usuario -- correo@linahp.com "Nombre" admin|ventas|administracion|contabilidad contraseña');
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {}, ssl: process.env.DATABASE_SSL === 'true' ? 'require' : false });
const hash = await bcrypt.hash(pass, 10);
const [u] = await sql`
  insert into usuarios (email, nombre, rol, password_hash) values (${email.toLowerCase()}, ${nombre}, ${rol}, ${hash})
  on conflict (email) do update set nombre = excluded.nombre, rol = excluded.rol, password_hash = excluded.password_hash, activo = true
  returning id, email, rol`;
console.log('Usuario listo:', u);
await sql.end();
