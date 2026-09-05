/**
 * Render del reporte diario (SDD §9).
 *
 * Lee el `payload` congelado, no la base: el reporte es permanente y tiene que
 * decir lo que decía el día que se generó, aunque el proceso haya cambiado
 * después. Por eso este componente no consulta nada.
 *
 * Es el gemelo web del correo: mismas secciones y mismo orden, empezando por las
 * adendas con su diff.
 */

interface CampoCambiado {
  campo: string;
  etiqueta: string;
  antes: string | null;
  despues: string | null;
}

interface ItemEvento {
  secopProcesoId: string;
  titulo: string | null;
  entidad: string | null;
  url: string | null;
  delta: CampoCambiado[] | null;
}

interface ItemApertura {
  secopProcesoId: string;
  titulo: string | null;
  entidad: string | null;
  url: string | null;
  filtroNombre: string | null;
}

export interface PayloadDigest {
  fecha?: string;
  novedades?: {
    adendas?: ItemEvento[];
    adjudicaciones?: ItemEvento[];
    aperturas?: ItemApertura[];
    total?: number;
  };
  matches?: Array<{
    secopProcesoId: string;
    nombre: string | null;
    entidad: string | null;
    url: string | null;
    veredicto: string | null;
  }>;
}

function Tarjeta({
  titulo,
  entidad,
  url,
  children,
}: {
  titulo: string | null;
  entidad: string | null;
  url: string | null;
  children?: React.ReactNode;
}) {
  return (
    <li className="clr-rep-card">
      <p className="clr-rep-card-title">{titulo ?? "(sin título)"}</p>
      {entidad ? <p className="clr-rep-card-meta">{entidad}</p> : null}
      {children}
      {url ? (
        <a
          href={url}
          className="clr-rep-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver en SECOP
        </a>
      ) : null}
    </li>
  );
}

/** El diff, que es lo que convierte una adenda en información. */
function Delta({ delta }: { delta: CampoCambiado[] | null }) {
  if (!delta || delta.length === 0) return null;
  return (
    <dl className="clr-rep-delta">
      {delta.map((d) => (
        <div key={d.campo} className="clr-rep-delta-fila">
          <dt className="clr-rep-delta-campo">{d.etiqueta}</dt>
          <dd className="clr-rep-delta-valor">
            {d.antes === null && d.despues === null ? (
              <em className="clr-rep-delta-campo">cambió</em>
            ) : (
              <>
                <span className="clr-rep-antes">{d.antes ?? "—"}</span>
                {" → "}
                <strong>{d.despues ?? "—"}</strong>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="clr-rep-h2">{titulo}</h2>
      <ul className="clr-rep-list">{children}</ul>
    </section>
  );
}

export function ReporteDigest({ payload }: { payload: PayloadDigest }) {
  const n = payload.novedades ?? {};
  const adendas = n.adendas ?? [];
  const adjudicaciones = n.adjudicaciones ?? [];
  const aperturas = n.aperturas ?? [];
  const matches = payload.matches ?? [];

  if (adendas.length + adjudicaciones.length + aperturas.length + matches.length === 0) {
    return <p className="clr-rep-vacio">Ese día no hubo novedades.</p>;
  }

  return (
    <>
      {adendas.length > 0 && (
        <Seccion titulo="Cambios en procesos que sigues">
          {adendas.map((a) => (
            <Tarjeta key={a.secopProcesoId} titulo={a.titulo} entidad={a.entidad} url={a.url}>
              <Delta delta={a.delta} />
            </Tarjeta>
          ))}
        </Seccion>
      )}

      {adjudicaciones.length > 0 && (
        <Seccion titulo="Adjudicadas">
          {adjudicaciones.map((a) => (
            <Tarjeta key={a.secopProcesoId} titulo={a.titulo} entidad={a.entidad} url={a.url}>
              <Delta delta={a.delta} />
            </Tarjeta>
          ))}
        </Seccion>
      )}

      {aperturas.length > 0 && (
        <Seccion titulo="Nuevas que casan con tus filtros">
          {aperturas.map((a) => (
            <Tarjeta key={a.secopProcesoId} titulo={a.titulo} entidad={a.entidad} url={a.url}>
              {a.filtroNombre ? (
                <p className="clr-rep-card-meta">Filtro: {a.filtroNombre}</p>
              ) : null}
            </Tarjeta>
          ))}
        </Seccion>
      )}

      {matches.length > 0 && (
        <Seccion titulo="Coincidencias con tu perfil">
          {matches.map((m) => (
            <Tarjeta key={m.secopProcesoId} titulo={m.nombre} entidad={m.entidad} url={m.url} />
          ))}
        </Seccion>
      )}
    </>
  );
}
