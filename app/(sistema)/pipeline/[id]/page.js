import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { Cabecera, Estatus, Opciones } from '@/components/ui';
import { agregarActividad } from '@/app/acciones';
import { ETAPAS, TIPOS_ACTIVIDAD, etiqueta, fecha, dinero } from '@/lib/formato';
import FormOportunidad from '../FormOportunidad';

export default async function Oportunidad({ params }) {
  const { id } = await params;
  const [o] = await sql`select * from v_oportunidades where id = ${id}`;
  if (!o) notFound();
  const [actividades, cotizaciones] = await Promise.all([
    sql`select a.*, u.nombre usuario from actividades a left join usuarios u on u.id = a.usuario_id
        where a.oportunidad_id = ${id} order by a.fecha desc`,
    sql`select id, folio, fecha, total, moneda, estatus from v_cotizaciones where oportunidad_id = ${id} order by fecha desc`,
  ]);
  const volver = `/pipeline/${id}`;
  return (
    <>
      <Cabecera titulo={o.titulo} migas={[['/pipeline', 'Pipeline']]}
        sub={<>{etiqueta(ETAPAS, o.etapa)} · {o.probabilidad_efectiva}% · {o.cuenta_id ? <Link href={`/cuentas/${o.cuenta_id}`}>{o.cuenta_nombre}</Link> : 'Sin cuenta'}</>}>
        <Link className="btn" href={`/cotizaciones/nueva?oportunidad=${o.id}`}>+ Cotización</Link>
      </Cabecera>
      <div className="rejilla r-2-1">
        <FormOportunidad o={o} volver={volver} />
        <div>
          <div className="panel">
            <h2>Bitácora</h2>
            <form action={agregarActividad}>
              <input type="hidden" name="oportunidad_id" value={o.id} />
              {o.cuenta_id && <input type="hidden" name="cuenta_id" value={o.cuenta_id} />}
              <input type="hidden" name="_volver" value={volver} />
              <div className="en-linea" style={{ marginBottom: 8 }}>
                <select name="tipo" defaultValue="llamada"><Opciones lista={TIPOS_ACTIVIDAD} vacio={false} /></select>
              </div>
              <textarea name="descripcion" required placeholder="¿Qué pasó? ¿Qué sigue?" />
              <div className="acciones"><button className="btn chico">Registrar</button></div>
            </form>
            <ul className="linea-tiempo" style={{ marginTop: 10 }}>
              {actividades.map((a) => (
                <li key={a.id}>
                  <div>{a.descripcion}</div>
                  <div className="meta">{etiqueta(TIPOS_ACTIVIDAD, a.tipo)} · {fecha(a.fecha)} · {a.usuario}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Cotizaciones</h2>
            {cotizaciones.length === 0 ? <div className="tenue chico">Aún no hay cotizaciones ligadas.</div> : (
              <ul className="linea-tiempo">
                {cotizaciones.map((c) => (
                  <li key={c.id}><Link href={`/cotizaciones/${c.id}`}>{c.folio}</Link> · {dinero(c.total, c.moneda)} <Estatus>{c.estatus}</Estatus>
                    <div className="meta">{fecha(c.fecha)}</div></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
