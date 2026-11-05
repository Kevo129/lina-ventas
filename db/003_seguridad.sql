-- =====================================================================
-- Seguridad para Supabase: la app se conecta directo a Postgres (DATABASE_URL),
-- así que la API pública de Supabase (llaves anon / authenticated) no debe ver nada.
-- Correr DESPUÉS de 001 y 002. Es seguro correrlo más de una vez.
-- =====================================================================

-- RLS en todas las tablas (sin políticas = nadie entra por la API pública)
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Las vistas no respetan RLS: se les quita el acceso público por completo
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon, authenticated';
    execute 'revoke all on all sequences in schema public from anon, authenticated';
    execute 'revoke execute on all functions in schema public from anon, authenticated';
    execute 'alter default privileges in schema public revoke all on tables from anon, authenticated';
    execute 'alter default privileges in schema public revoke all on sequences from anon, authenticated';
    execute 'alter default privileges in schema public revoke execute on functions from anon, authenticated';
  end if;
end $$;
