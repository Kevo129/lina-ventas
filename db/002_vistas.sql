-- =====================================================================
-- Vistas: reemplazan las fórmulas y rollups de Airtable
-- =====================================================================

-- Partidas con estatus logístico (fórmula "Estatus del Pedido")
create or replace view v_partidas as
select
  p.*,
  case when p.entregado then p.cantidad else 0 end            as cantidad_entregada,
  coalesce(p.costo_unitario, 0) * p.cantidad                  as costo_total,
  coalesce(p.precio_unitario, 0) * p.cantidad                 as venta_total,
  case
    when p.orden_compra_id is null then 'OC PENDIENTE'
    when p.importacion_id  is null then 'PEDIMENTO PENDIENTE'
    when p.recibido and p.entregado then 'ARCHIVADO'
    when p.entregado               then 'ENTREGADO'
    when p.recibido                then 'EN STOCK'
    else 'EN TRÁNSITO'
  end                                                         as estatus,
  pr.nombre  as producto_nombre,
  pr.codigo  as producto_codigo,
  prov.nombre as proveedor_nombre,
  c.folio    as cotizacion_folio,
  c.fecha    as cotizacion_fecha,
  oc.folio   as oc_folio,
  oc.moneda  as oc_moneda,
  im.pedimento,
  e.paqueteria, e.guia, e.fecha_envio
from partidas p
left join productos      pr   on pr.id = p.producto_id
left join proveedores    prov on prov.id = pr.proveedor_id
left join cotizaciones   c    on c.id = p.cotizacion_id
left join ordenes_compra oc   on oc.id = p.orden_compra_id
left join importaciones  im   on im.id = p.importacion_id
left join envios         e    on e.id = p.envio_id;

-- Cotizaciones con cobranza, entregas y estatus (fórmula "Estatus")
create or replace view v_cotizaciones as
with pg as (
  select cotizacion_id, sum(monto) pagado, max(fecha) ultimo_pago
  from pagos group by cotizacion_id
), it as (
  select cotizacion_id,
         sum(cantidad) piezas,
         sum(case when entregado then cantidad else 0 end) piezas_entregadas,
         sum(coalesce(costo_unitario,0) * cantidad) costo
  from partidas group by cotizacion_id
)
select
  c.*,
  round(c.total / (1 + config_num('iva')), 2)                         as subtotal,
  coalesce(pg.pagado, 0)                                              as pagado,
  c.total - coalesce(pg.pagado, 0)                                    as saldo_pendiente,
  pg.ultimo_pago,
  coalesce(it.piezas, 0)                                              as piezas,
  coalesce(it.piezas_entregadas, 0)                                   as piezas_entregadas,
  coalesce(it.piezas, 0) - coalesce(it.piezas_entregadas, 0)          as piezas_pendientes,
  case
    when c.estado <> 'ganada' then initcap(c.estado::text)
    when coalesce(it.piezas,0) - coalesce(it.piezas_entregadas,0) > 0
         and c.total - coalesce(pg.pagado,0) > 0.009 then 'Items y cobros pendientes'
    when coalesce(it.piezas,0) - coalesce(it.piezas_entregadas,0) > 0 then 'Items por entregar'
    when c.total - coalesce(pg.pagado,0) > 0.009 then 'Por cobrar'
    else 'Concretada'
  end                                                                 as estatus,
  c.total * case c.moneda
              when 'MXN' then 1
              when 'USD' then coalesce(c.tipo_cambio, config_num('tipo_cambio_usd'))
              when 'EUR' then coalesce(c.tipo_cambio, config_num('tipo_cambio_eur'))
            end                                                       as total_mxn,
  to_char(c.fecha, 'YYYY-MM')                                         as periodo,
  ct.nombre || coalesce(' ' || ct.apellido, '')                      as contacto_nombre,
  ct.direccion_entrega,
  cu.id      as cuenta_id,
  cu.nombre  as cuenta_nombre,
  cu.segmento,
  u.nombre   as vendedor_nombre
from cotizaciones c
left join pg       on pg.cotizacion_id = c.id
left join it       on it.cotizacion_id = c.id
left join contactos ct on ct.id = c.contacto_id
left join cuentas   cu on cu.id = ct.cuenta_id
left join usuarios  u  on u.id = c.vendedor_id;

-- Órdenes de compra con pagos y stock
create or replace view v_ordenes_compra as
with pg as (
  select orden_compra_id, sum(monto) pagado from pagos_proveedor group by orden_compra_id
), it as (
  select orden_compra_id,
         sum(cantidad) piezas,
         sum(case when entregado then cantidad else 0 end) piezas_entregadas,
         sum(case when recibido and not entregado then cantidad else 0 end) piezas_en_stock
  from partidas group by orden_compra_id
)
select
  o.*,
  coalesce(pg.pagado, 0)                         as pagado,
  o.total - coalesce(pg.pagado, 0)               as saldo_pendiente,
  case when o.total - coalesce(pg.pagado,0) > 0.009 then 'Por pagar' else 'Pagada' end as estatus,
  coalesce(it.piezas, 0)                         as piezas,
  coalesce(it.piezas_entregadas, 0)              as piezas_entregadas,
  coalesce(it.piezas, 0) - coalesce(it.piezas_entregadas, 0) as piezas_sin_entregar,
  coalesce(it.piezas_en_stock, 0)                as piezas_en_stock,
  pr.nombre as proveedor_nombre
from ordenes_compra o
left join pg on pg.orden_compra_id = o.id
left join it on it.orden_compra_id = o.id
left join proveedores pr on pr.id = o.proveedor_id;

-- Productos con movimiento
create or replace view v_productos as
select
  p.*,
  pr.nombre as proveedor_nombre,
  coalesce(sum(pa.cantidad), 0)                                         as piezas_vendidas,
  coalesce(sum(case when pa.entregado then pa.cantidad else 0 end), 0)  as piezas_entregadas,
  coalesce(sum(case when not pa.entregado then pa.cantidad else 0 end), 0) as piezas_por_entregar,
  coalesce(sum(case when pa.recibido and not pa.entregado then pa.cantidad else 0 end), 0) as piezas_en_stock,
  max(c.fecha) as ultima_venta
from productos p
left join proveedores pr on pr.id = p.proveedor_id
left join partidas pa on pa.producto_id = p.id
left join cotizaciones c on c.id = pa.cotizacion_id
group by p.id, pr.nombre;

-- Contactos con ventas totales (rollup "Ventas Totales")
create or replace view v_contactos as
select
  ct.*,
  ct.nombre || coalesce(' ' || ct.apellido, '') as nombre_completo,
  cu.nombre as cuenta_nombre,
  coalesce(sum(vc.total_mxn) filter (where vc.estado = 'ganada'), 0) as ventas_mxn,
  count(vc.id) filter (where vc.estado = 'ganada')                 as num_compras,
  max(vc.fecha) filter (where vc.estado = 'ganada')                as ultima_compra
from contactos ct
left join cuentas cu on cu.id = ct.cuenta_id
left join v_cotizaciones vc on vc.contacto_id = ct.id
group by ct.id, cu.nombre;

-- Cuentas con ventas
create or replace view v_cuentas as
select
  cu.*,
  count(distinct ct.id)                                               as num_contactos,
  coalesce(sum(vc.total_mxn) filter (where vc.estado = 'ganada'), 0)  as ventas_mxn,
  coalesce(sum(vc.saldo_pendiente * (vc.total_mxn / nullif(vc.total,0)))
           filter (where vc.estado = 'ganada'), 0)                    as por_cobrar_mxn,
  max(vc.fecha) filter (where vc.estado = 'ganada')                   as ultima_compra
from cuentas cu
left join contactos ct on ct.cuenta_id = cu.id
left join v_cotizaciones vc on vc.contacto_id = ct.id
group by cu.id;

-- Pipeline: valor ponderado
create or replace view v_oportunidades as
select
  o.*,
  cu.nombre as cuenta_nombre,
  ct.nombre || coalesce(' ' || ct.apellido, '') as contacto_nombre,
  u.nombre  as responsable_nombre,
  coalesce(o.probabilidad, case o.etapa
    when 'prospecto' then 10 when 'contactado' then 20 when 'demo_visita' then 35
    when 'cotizado' then 50 when 'negociacion' then 75 when 'ganada' then 100 else 0 end) as probabilidad_efectiva,
  o.monto_estimado * case o.moneda
    when 'USD' then config_num('tipo_cambio_usd') when 'EUR' then config_num('tipo_cambio_eur') else 1 end as monto_mxn
from oportunidades o
left join cuentas cu on cu.id = o.cuenta_id
left join contactos ct on ct.id = o.contacto_id
left join usuarios u on u.id = o.responsable_id;

-- Ventas por mes (para el tablero)
create or replace view v_ventas_mensuales as
select periodo,
       count(*)                as cotizaciones,
       sum(total_mxn)          as ventas_mxn,
       sum(total_mxn / (1 + config_num('iva'))) as ventas_mxn_sin_iva,
       sum(saldo_pendiente * total_mxn / nullif(total,0)) as por_cobrar_mxn
from v_cotizaciones
where estado = 'ganada'
group by periodo;
