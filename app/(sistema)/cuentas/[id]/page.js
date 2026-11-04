import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { Cabecera, Estatus, Kpi, Opciones } from '@/components/ui';
import { agregarActividad } from '@/app/acciones';
import { dinero, millones, fecha, etiqueta, SEGMENTOS, ETAPAS, TIPOS_ACTIVIDAD } from '@/lib/formato';
import FormCuenta from '../FormCuenta';

export default async function Cuenta({ params, searchParams }) {
  const { id } = await params;
  const { editar } = await searchParams;
  const [c] = await sql`select v.*, u.nombre responsable from v_cuentas v left join usuarios u on u.id = v.responsable_id where v.id = ${id}`;
  if (!c) notFound();
  const [contactos, cotizaciones, ops, actividades] = await Promise.all([
    sql`select * from v_contactos where cuenta_id = ${id} order by ventas_mxn desc`,
    sql`select * from v_cotizaciones where cuenta_id = ${id} order by fecha desc limit 100`,
    sql`select * from v_oportunidades where cuenta_id = ${id} order by created_at desc`,
    sql`select a.*, u.nombre usuario from actividades a left join usuarios u on u.id = a.usuario_id where a.cuenta_id = ${id} order by fecha desc limit 30`,
  ]);
  const volver = `/cuentas/${id}`;
  return (
    <>
      <Cabecera titulo={c.nombre} migas={[['/cuentas', 'Cuentas']]}
        sub={[c.segmento && etiqueta(SEGMENTOS, c.segmento), c.ciudad, c.responsable && `Responsable: ${c.responsable}`].filter(Boolean).join(' · ') || 'Sin clasificar'}>
        <Link className="btn sec" href={editar ? volver : `${volver}?editar=1`}>{editar ? 'Cerrar edición' : 'Editar'}</Link>
        <Link className="btn sec" href={`/contactos/nuevo?cuenta=${id}`}>+ Contacto</Link>
        <Link className="btn" href={`/pipeline/nueva?cuenta=${id}`}>+ Oportunidad</Link>
      </Cabecera>
      {editar && <FormCuenta c={c} volver={volver} />}
      <div className="rejilla r3" style={{ marginBottom: 16 }}>
        <Kpi etiqueta="Ventas históricas (MXN)" valor={millones(c.ventas_mxn)} detalle={`Última compra ${fecha(c.ultima_compra)}`} />
        <Kpi etiqueta="Por cobrar (MXN)" valor={millones(c.por_cobrar_mxn)} />
        <Kpi etiqueta="Oportunidades abiertas" valor={ops.filter((o) => !['ganada', 'perdida'].includes(o.etapa)).length} />
      </div>
      <div className="rejilla r-2-1">
        <div>
          <div className="panel sin-pad tabla-env">
            <h2>Cotizaciones</h2>
            <table>
              <thead><tr><th>Folio</th><th>Fecha</th><th>Contacto</th><th className="num">Total</th><th>Estatus</th></tr></thead>
              <tbody>{cotizaciones.map((q) => (
                <tr key={q.id}><td><Link href={`/cotizaciones/${q.id}`}>{q.folio}</Link></td><td>{fecha(q.fecha)}</td><td>{q.contacto_nombre}</td>
                  <td className="num">{dinero(q.total, q.moneda)}</td><td><Estatus>{q.estatus}</Estatus></td></tr>
              ))}
              {cotizaciones.length === 0 && <tr><td colSpan={5} className="vacio">Sin cotizaciones.</td></tr>}</tbody>
            </table>
          </div>
          <div className="panel sin-pad tabla-env">
            <h2>Oportunidades</h2>
            <table>
              <thead><tr><th>Oportunidad</th><th>Etapa</th><th className="num">Monto</th><th>Cierre</th></tr></thead>
              <tbody>{ops.map((o) => (
                <tr key={o.id}><td><Link href={`/pipeline/${o.id}`}>{o.titulo}</Link></td><td><Estatus>{etiqueta(ETAPAS, o.etapa)}</Estatus></td>
                  <td className="num">{millones(o.monto_mxn)}</td><td>{fecha(o.fecha_cierre_estimada)}</td></tr>
              ))}
              {ops.length === 0 && <tr><td colSpan={4} className="vacio">Sin oportunidades.</td></tr>}</tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="panel">
            <h2>Contactos</h2>
            <ul className="linea-tiempo">
              {contactos.map((p) => (
                <li key={p.id}><Link href={`/contactos/${p.id}`}>{p.nombre_completo}</Link>
                  <div className="meta">{[p.puesto, p.correo, p.telefono].filter(Boolean).join(' · ')}</div>
                  <div className="meta">{p.num_compras} compras · {millones(p.ventas_mxn)}</div></li>
              ))}
              {contactos.length === 0 && <li className="tenue">Sin contactos.</li>}
            </ul>
          </div>
          <div className="panel">
            <h2>Bitácora</h2>
            <form action={agregarActividad}>
              <input type="hidden" name="cuenta_id" value={id} /><input type="hidden" name="_volver" value={volver} />
              <select name="tipo" defaultValue="nota" style={{ marginBottom: 8 }}><Opciones lista={TIPOS_ACTIVIDAD} vacio={false} /></select>
              <textarea name="descripcion" required placeholder="Nota sobre la cuenta" />
              <div className="acciones"><button className="btn chico">Registrar</button></div>
            </form>
            <ul className="linea-tiempo">
              {actividades.map((a) => <li key={a.id}>{a.descripcion}<div className="meta">{etiqueta(TIPOS_ACTIVIDAD, a.tipo)} · {fecha(a.fecha)} · {a.usuario}</div></li>)}
            </ul>
          </div>
          {c.notas && <div className="panel"><h2>Notas</h2><div style={{ whiteSpace: 'pre-wrap' }}>{c.notas}</div></div>}
        </div>
      </div>
    </>
  );
}
