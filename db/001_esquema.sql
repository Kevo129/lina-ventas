-- =====================================================================
-- Lina Health Providers · Sistema de Ventas
-- Esquema v1 (migración desde Airtable "Base de Ventas")
-- Compatible con cualquier PostgreSQL 14+ (Supabase, Neon, local)
-- =====================================================================

-- ---------- utilidades ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- usuarios ----------
create type rol_usuario as enum ('admin', 'ventas', 'administracion', 'contabilidad');

create table usuarios (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  email         text not null unique,
  password_hash text,                       -- null = aún no define contraseña
  rol           rol_usuario not null default 'ventas',
  activo        boolean not null default true,
  airtable_id   text unique,                -- id de colaborador en Airtable (usr...)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- configuración (meta mensual, tipo de cambio, IVA) ----------
create table configuracion (
  clave  text primary key,
  valor  text not null,
  descripcion text
);
insert into configuracion (clave, valor, descripcion) values
  ('meta_mensual_mxn', '2000000', 'Meta de venta mensual en MXN'),
  ('tipo_cambio_usd',  '18.50',   'Tipo de cambio USD→MXN por defecto para reportes'),
  ('tipo_cambio_eur',  '20.00',   'Tipo de cambio EUR→MXN por defecto para reportes'),
  ('iva',              '0.16',    'Tasa de IVA');

create or replace function config_num(p_clave text) returns numeric language sql stable as $$
  select valor::numeric from configuracion where clave = p_clave
$$;

-- ---------- proveedores / marcas ----------
create table proveedores (
  id          bigint generated always as identity primary key,
  nombre      text not null unique,
  pais        text,
  contacto    text,
  correo      text,
  telefono    text,
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- cuentas (instituciones / empresas) ----------
create type segmento_cuenta as enum (
  'universidad_publica', 'universidad_privada', 'consultor_primeros_auxilios',
  'hospital_clinica', 'empresa', 'gobierno', 'distribuidor', 'publico_general', 'otro'
);

create table cuentas (
  id           bigint generated always as identity primary key,
  nombre       text not null,
  segmento     segmento_cuenta,
  rfc          text,
  ciudad       text,
  estado       text,
  sitio_web    text,
  responsable_id bigint references usuarios(id),
  notas        text,
  airtable_id  text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on cuentas (lower(nombre));

-- ---------- contactos (antes "Clientes") ----------
create table contactos (
  id                 bigint generated always as identity primary key,
  nombre             text not null,
  apellido           text,
  puesto             text,                 -- ej. Coordinador de simulación, Director
  telefono           text,
  correo             text,
  cuenta_id          bigint references cuentas(id) on delete set null,
  rfc                text,
  direccion_entrega  text,
  notas              text,
  airtable_id        text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on contactos (cuenta_id);
create index on contactos (lower(correo));

-- ---------- productos ----------
create table productos (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  codigo        text,
  proveedor_id  bigint references proveedores(id) on delete set null,
  categoria     text,                      -- simulador, modelo anatómico, plataforma, consumible...
  precio_lista  numeric(14,2),
  moneda_precio text default 'MXN',
  activo        boolean not null default true,
  airtable_id   text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on productos (codigo);
create index on productos (proveedor_id);

-- ---------- NUEVO: oportunidades (pipeline) ----------
create type etapa_oportunidad as enum (
  'prospecto', 'contactado', 'demo_visita', 'cotizado', 'negociacion', 'ganada', 'perdida'
);
create type fuente_oportunidad as enum (
  'meta_ads', 'google_ads', 'tiktok', 'linkedin', 'sitio_web', 'mercado_libre',
  'referido', 'cliente_recurrente', 'licitacion', 'evento', 'prospeccion', 'otro'
);

create table oportunidades (
  id                     bigint generated always as identity primary key,
  titulo                 text not null,
  cuenta_id              bigint references cuentas(id) on delete set null,
  contacto_id            bigint references contactos(id) on delete set null,
  etapa                  etapa_oportunidad not null default 'prospecto',
  monto_estimado         numeric(14,2),
  moneda                 text not null default 'MXN',
  probabilidad           int check (probabilidad between 0 and 100),
  fecha_cierre_estimada  date,
  fuente                 fuente_oportunidad,
  responsable_id         bigint references usuarios(id),
  motivo_perdida         text,
  siguiente_paso         text,
  fecha_siguiente_paso   date,
  notas                  text,
  cerrada_en             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index on oportunidades (etapa);
create index on oportunidades (cuenta_id);

-- ---------- NUEVO: actividades (bitácora comercial) ----------
create type tipo_actividad as enum ('llamada', 'correo', 'whatsapp', 'reunion', 'demo', 'visita', 'nota');

create table actividades (
  id              bigint generated always as identity primary key,
  tipo            tipo_actividad not null default 'nota',
  fecha           timestamptz not null default now(),
  descripcion     text not null,
  oportunidad_id  bigint references oportunidades(id) on delete cascade,
  cuenta_id       bigint references cuentas(id) on delete cascade,
  contacto_id     bigint references contactos(id) on delete cascade,
  usuario_id      bigint references usuarios(id),
  created_at      timestamptz not null default now()
);
create index on actividades (oportunidad_id);
create index on actividades (cuenta_id);

-- ---------- cotizaciones (antes "Cotizaciones Ganadas"; ahora todas) ----------
create type estado_cotizacion as enum ('borrador', 'enviada', 'ganada', 'perdida', 'cancelada');

create table cotizaciones (
  id              bigint generated always as identity primary key,
  folio           text not null unique,            -- QUO5572, MELI344...
  oportunidad_id  bigint references oportunidades(id) on delete set null,
  contacto_id     bigint references contactos(id) on delete set null,
  fecha           date not null default current_date,
  estado          estado_cotizacion not null default 'enviada',
  total           numeric(14,2) not null default 0,  -- con IVA
  moneda          text not null default 'MXN' check (moneda in ('MXN','USD','EUR')),
  tipo_cambio     numeric(10,4),                     -- opcional, al momento de la venta
  vendedor_id     bigint references usuarios(id),
  canal           text,                              -- directo, Mercado Libre, licitación...
  notas           text,
  airtable_id     text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on cotizaciones (fecha);
create index on cotizaciones (contacto_id);
create index on cotizaciones (estado);

-- ---------- NUEVO: pagos de clientes (historial de cobranza) ----------
create table pagos (
  id             bigint generated always as identity primary key,
  cotizacion_id  bigint not null references cotizaciones(id) on delete cascade,
  fecha          date not null default current_date,
  monto          numeric(14,2) not null check (monto <> 0),
  metodo         text,          -- transferencia, tarjeta, Mercado Pago, cheque...
  referencia     text,
  notas          text,
  registrado_por bigint references usuarios(id),
  created_at     timestamptz not null default now()
);
create index on pagos (cotizacion_id);

-- ---------- órdenes de compra a proveedor ----------
create table ordenes_compra (
  id                    bigint generated always as identity primary key,
  folio                 text not null unique,          -- PO417, "Mercadolibre 2025"...
  referencia_proveedor  text,
  fecha                 date,
  proveedor_id          bigint references proveedores(id) on delete set null,
  total                 numeric(14,2) not null default 0,
  moneda                text not null default 'USD' check (moneda in ('MXN','USD','EUR')),
  notas                 text,
  airtable_id           text unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------- NUEVO: pagos a proveedores ----------
create table pagos_proveedor (
  id               bigint generated always as identity primary key,
  orden_compra_id  bigint not null references ordenes_compra(id) on delete cascade,
  fecha            date not null default current_date,
  monto            numeric(14,2) not null check (monto <> 0),
  metodo           text,
  referencia       text,
  notas            text,
  registrado_por   bigint references usuarios(id),
  created_at       timestamptz not null default now()
);
create index on pagos_proveedor (orden_compra_id);

-- ---------- importaciones (pedimentos) ----------
create table importaciones (
  id                 bigint generated always as identity primary key,
  pedimento          text not null unique,   -- "N/A" = compra nacional
  aduana             text,
  fecha_importacion  date,
  notas              text,
  airtable_id        text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- NUEVO: envíos (separado de las partidas) ----------
create table envios (
  id             bigint generated always as identity primary key,
  cotizacion_id  bigint references cotizaciones(id) on delete cascade,
  paqueteria     text,
  guia           text,
  fecha_envio    date,
  notas          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on envios (cotizacion_id);

-- ---------- partidas (antes "Pedidos | Stock | Envíos") ----------
create table partidas (
  id               bigint generated always as identity primary key,
  cotizacion_id    bigint references cotizaciones(id) on delete cascade,
  producto_id      bigint references productos(id) on delete restrict,
  cantidad         int not null default 1 check (cantidad >= 0),
  precio_unitario  numeric(14,2),                 -- NUEVO: precio de venta (opcional)
  costo_unitario   numeric(14,4),                 -- costo de compra (moneda de la OC)
  orden_compra_id  bigint references ordenes_compra(id) on delete set null,
  importacion_id   bigint references importaciones(id) on delete set null,
  recibido         boolean not null default false,  -- llegó a nuestro almacén
  entregado        boolean not null default false,  -- entregado al cliente
  envio_id         bigint references envios(id) on delete set null,
  notas            text,
  airtable_id      text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on partidas (cotizacion_id);
create index on partidas (producto_id);
create index on partidas (orden_compra_id);
create index on partidas (importacion_id);

-- ---------- archivos adjuntos (PDFs, fotos, fichas, facturas) ----------
create table archivos (
  id           bigint generated always as identity primary key,
  entidad      text not null,     -- 'cotizaciones','productos','ordenes_compra','importaciones'
  entidad_id   bigint not null,
  campo        text not null,     -- 'cotizacion','foto','ficha_tecnica','orden_compra','factura','documento'
  nombre       text not null,
  ruta         text not null,     -- ruta dentro del almacenamiento
  mime         text,
  tamano       bigint,
  airtable_id  text unique,
  created_at   timestamptz not null default now()
);
create index on archivos (entidad, entidad_id);

-- ---------- triggers updated_at ----------
do $$
declare t text;
begin
  foreach t in array array['usuarios','proveedores','cuentas','contactos','productos','oportunidades',
                           'cotizaciones','ordenes_compra','importaciones','envios','partidas']
  loop
    execute format('create trigger trg_%1$s_updated before update on %1$s
                    for each row execute function set_updated_at()', t);
  end loop;
end $$;
