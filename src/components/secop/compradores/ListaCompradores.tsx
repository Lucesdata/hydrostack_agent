import Link from "next/link";
import { formatConteo, formatCopEscala } from "@/src/components/secop/format";
import { titulo } from "@/src/components/landing/texto";
import { CLASE_ENTIDAD } from "@/src/lib/secop/clase-entidad";
import type { Compradores } from "@/src/lib/secop/compradores";

/**
 * La lista de "Quién compra". Sin estado ni efectos: se pinta en el servidor.
 * Cada entidad lleva su clase (enlazada a la faceta de su clase), su sede,
 * sus procesos abiertos y el presupuesto de los que lo publican.
 */
export default function ListaCompradores({ datos }: { datos: Compradores | null }) {
  if (!datos) {
    return <p className="lc-vacio">El listado no está disponible en este momento · —</p>;
  }
  if (datos.entidades.length === 0) {
    return <p className="lc-vacio">Ninguna entidad tiene procesos abiertos ahora mismo.</p>;
  }
  return (
    <ol className="lc-lista">
      {datos.entidades.map((e, i) => {
        const clase = CLASE_ENTIDAD[e.clase];
        return (
          <li key={e.id} className="lc-fila">
            <span className="lc-puesto" aria-hidden="true">
              {i + 1}
            </span>
            <div className="lc-quien">
              <p className="lc-nombre">{titulo(e.nombre)}</p>
              <p className="lc-meta">
                <Link href={`/licitaciones/entidad/${clase.slug}`}>{clase.label}</Link>
                {" · "}
                {e.departamento ? titulo(e.departamento) : "Sede sin resolver"}
              </p>
            </div>
            <p className="lc-cifra">
              <strong>{formatConteo(e.n)}</strong>
              <span>{e.n === 1 ? "proceso abierto" : "procesos abiertos"}</span>
            </p>
            <p className="lc-cifra">
              <strong>{e.nConMonto > 0 ? formatCopEscala(e.montoAbierto) : "—"}</strong>
              {/* No todos publican presupuesto: se dice sobre cuántos se suma. */}
              <span>
                {formatConteo(e.nConMonto)} de {formatConteo(e.n)} con presupuesto
              </span>
            </p>
            <Link
              className="lc-ver"
              href={`/licitaciones/explorar?q=${encodeURIComponent(e.nombre)}`}
              aria-label={`Ver los procesos de ${titulo(e.nombre)}`}
            >
              Ver sus procesos <span aria-hidden="true">→</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Tokens de globals.css: los mide contraste.test.ts. */
export const ESTILOS_COMPRADORES = `
.lc-lista{ list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
.lc-fila{
  display: grid; grid-template-columns: 32px minmax(0, 1fr) 140px 190px auto;
  gap: 16px; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border);
}
.lc-puesto{ font: 600 13px var(--font-jetbrains-mono), monospace; color: var(--text-muted); }
.lc-nombre{ margin: 0; font: 600 15px/1.35 var(--font-inter), sans-serif; color: var(--text-primary); }
.lc-meta{ margin: 2px 0 0; font: 12.5px/1.4 var(--font-inter), sans-serif; color: var(--text-muted); }
.lc-meta a{ color: var(--accent); text-decoration: none; }
.lc-meta a:hover{ text-decoration: underline; }
.lc-cifra{ margin: 0; display: flex; flex-direction: column; gap: 2px; }
.lc-cifra strong{ font: 700 17px/1.2 var(--font-inter), sans-serif; color: var(--text-primary); }
.lc-cifra span{ font: 12px/1.35 var(--font-inter), sans-serif; color: var(--text-muted); }
.lc-ver{ font: 600 13px var(--font-inter), sans-serif; color: var(--accent); text-decoration: none; white-space: nowrap; }
.lc-ver:hover{ text-decoration: underline; }
.lc-ver:focus-visible, .lc-meta a:focus-visible{ outline: 2px solid var(--accent); outline-offset: 2px; }
.lc-vacio{ margin: 24px 0; color: var(--text-muted); }
@media (max-width: 860px){
  .lc-fila{ grid-template-columns: 28px minmax(0, 1fr); row-gap: 8px; }
  .lc-cifra, .lc-ver{ grid-column: 2; }
}
`;
