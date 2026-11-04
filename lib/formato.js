const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const mon = (m) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: m || 'MXN', currencyDisplay: 'code', minimumFractionDigits: 2 });

export const dinero = (v, moneda = 'MXN') => (v == null ? '—' : mon(moneda).format(Number(v)).replace(/ /g, ' '));
export const dineroCorto = (v) => (v == null ? '—' : mxn.format(Number(v)));
export const millones = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n)}`;
};
export const fecha = (v) => {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v.length === 10 ? v + 'T12:00:00' : v) : v;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fechaISO = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  const d = new Date(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const entero = (v) => new Intl.NumberFormat('es-MX').format(Number(v || 0));

export const ETAPAS = [
  ['prospecto', 'Prospecto'], ['contactado', 'Contactado'], ['demo_visita', 'Demo / visita'],
  ['cotizado', 'Cotizado'], ['negociacion', 'Negociación'], ['ganada', 'Ganada'], ['perdida', 'Perdida'],
];
export const FUENTES = [
  ['meta_ads', 'Meta Ads'], ['google_ads', 'Google Ads'], ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn'],
  ['sitio_web', 'Sitio web'], ['mercado_libre', 'Mercado Libre'], ['referido', 'Referido'],
  ['cliente_recurrente', 'Cliente recurrente'], ['licitacion', 'Licitación'], ['evento', 'Evento / congreso'],
  ['prospeccion', 'Prospección propia'], ['otro', 'Otro'],
];
export const SEGMENTOS = [
  ['universidad_publica', 'Universidad pública'], ['universidad_privada', 'Universidad privada'],
  ['consultor_primeros_auxilios', 'Consultor primeros auxilios'], ['hospital_clinica', 'Hospital / clínica'],
  ['empresa', 'Empresa'], ['gobierno', 'Gobierno'], ['distribuidor', 'Distribuidor'],
  ['publico_general', 'Público general'], ['otro', 'Otro'],
];
export const TIPOS_ACTIVIDAD = [
  ['llamada', 'Llamada'], ['correo', 'Correo'], ['whatsapp', 'WhatsApp'], ['reunion', 'Reunión'],
  ['demo', 'Demo'], ['visita', 'Visita'], ['nota', 'Nota'],
];
export const ESTADOS_COT = [
  ['borrador', 'Borrador'], ['enviada', 'Enviada'], ['ganada', 'Ganada'], ['perdida', 'Perdida'], ['cancelada', 'Cancelada'],
];
export const PAQUETERIAS = ['DHL', 'FedEx', 'Estafeta', 'UPS', 'Paquete Express', 'Tres Guerras', 'J&T Express', 'Red Pack',
  'Sendex', 'Afimex', 'Mercado Libre', 'Entrega Presencial', 'Envío Directo del Proveedor', 'Software', 'Curso Presencial'];
export const ADUANAS = ['Nuevo Laredo #240', 'Colombia #800', 'Guadalajara #480', 'Aeropuerto General Mariano Escobedo #521', 'Manzanillo #160'];
export const ROLES = [['admin', 'Administrador'], ['ventas', 'Ventas'], ['administracion', 'Administración / pagos'], ['contabilidad', 'Contabilidad']];

export const etiqueta = (lista, v) => lista.find(([k]) => k === v)?.[1] ?? v ?? '—';

export function claseEstatus(s = '') {
  const t = s.toLowerCase();
  if (/concretada|pagada|archivado|ganada|entregado/.test(t)) return 'ok';
  if (/cobro|cobrar|por pagar|pendiente|perdida|cancelada/.test(t)) return 'alerta';
  if (/entregar|stock|tránsito|transito/.test(t)) return 'info';
  return 'neutro';
}
