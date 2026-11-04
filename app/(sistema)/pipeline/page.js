import Link from 'next/link';
import { sql } from '@/lib/db';
import { Cabecera, Opciones } from '@/components/ui';
import AutoEnvio from '@/components/AutoEnvio';
import { cambiarEtapa } from '@/app/acciones';
import { ETAPAS, FUENTES, millones, fecha, etiqueta } from '@/lib/formato';

export default async function Pipeline({ searchParams }) {
  const { responsable = '', fuente = '', cerradas = '' } = await searchParams;
  const usuarios = await sql`select id, nombre from usuarios where activo order by nombre`;
  const ops = await sql`
    select * from v_oportunidades
    where (${responsable} = '' or responsable_id::text = ${responsable})
      and (${fuente} = '' or fuente::text = ${fuente})
      and (etapa not in ('ganada','perdida') or (${cerradas} = '1' and cerrada_en > now() - interval '60 days'))
    order by fecha_cierre_estimada nulls last, monto_mxn desc nulls last`;
  const etapas = ETAPAS.filter(([k]) => cerradas === '1' || (k !== 'ganada' && k !== 'perdida'));

  return (
    <>
      <Cabecera titulo="Pipeline" sub="Oportunidades abiertas por etapa. Cambia la etapa desde cada tarjeta.">
        <Link className="btn" href="/pipeline/nueva">+ Oportunidad</Link>
      </Cabecera>
      <form className="filtros">
        <select name="responsable" defaultValue={responsable}><option value="">Todos los responsables</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>
        <select name="fuente" defaultValue={fuente}><option value="">Todas las fuentes</option><Opciones lista={FUENTES} vacio={false} /></select>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}><input type="checkbox" name="cerradas" value="1" defaultChecked={cerradas === '1'} /> Ver cerradas (60 días)</label>
        <button className="btn sec">Filtrar</button>
      </form>
      <div className="tablero">
        {etapas.map(([k, t]) => {
          const items = ops.filter((o) => o.etapa === k);
          const total = items.reduce((a, o) => a + Number(o.monto_mxn || 0), 0);
          return (
            <div key={k} className="columna">
              <h3><span>{t}</span><span className="tenue">{items.length}</span></h3>
              <div className="tot">{millones(total)}</div>
              {items.map((o) => (
                <div key={o.id} className="tarjeta">
                  <Link className="t" href={`/pipeline/${o.id}`}>{o.titulo}</Link>
                  <div className="tenue chico">{o.cuenta_nombre || o.contacto_nombre || 'Sin cuenta'}</div>
                  {o.monto_estimado && <div className="m">{millones(o.monto_mxn)}{o.moneda !== 'MXN' && <span className="tenue chico"> ({o.moneda})</span>}</div>}
                  <div className="tenue chico">
                    {o.fecha_cierre_estimada && <>Cierre {fecha(o.fecha_cierre_estimada)} · </>}
                    {o.fuente && etiqueta(FUENTES, o.fuente)}
                  </div>
                  {o.siguiente_paso && <div className="chico" style={{ marginTop: 4 }}>→ {o.siguiente_paso}</div>}
                  <form action={cambiarEtapa}>
                    <input type="hidden" name="id" value={o.id} />
                    <AutoEnvio name="etapa" defaultValue={o.etapa}><Opciones lista={ETAPAS} vacio={false} /></AutoEnvio>
                  </form>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
