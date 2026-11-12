import Link from "next/link";
import { FAMILIAS_CHIP, type FamiliaMarketplace } from "@/src/lib/marketplace/familias";
import type { FiltrosVitrina } from "@/src/lib/secop/filtros-vitrina";
import { conTipo, hrefMarketplace } from "@/src/lib/marketplace/url";
import s from "./marketplace.module.css";

function Icono({ familia }: { familia: FamiliaMarketplace }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      {familia === "potable" ? (
        <path d="M12 3.5c3.2 3.8 5.5 6.6 5.5 9.6a5.5 5.5 0 0 1-11 0c0-3 2.3-5.8 5.5-9.6Z" {...p} />
      ) : familia === "residual" ? (
        <>
          <path d="M12 20v-7" {...p} />
          <path d="M12 13c0-3.6-2.4-5.6-6-5.6 0 3.6 2.4 5.6 6 5.6Zm0 0c0-3.6 2.4-5.6 6-5.6 0 3.6-2.4 5.6-6 5.6Z" {...p} />
        </>
      ) : (
        <>
          <path d="M4 9h9a3 3 0 0 1 3 3v5" {...p} />
          <path d="M2.5 7.5h3v3h-3zM14.5 17h3v3h-3z" {...p} />
        </>
      )}
    </svg>
  );
}

/**
 * Las tres familias. Son enlaces a la misma página con `tipo=…`: un clic activa
 * la familia y otro la quita, conservando búsqueda y territorio. El color
 * acompaña siempre a su nombre y nunca es lo único que dice la familia activa
 * (`aria-current` y el trazo).
 */
export default function Familias({ filtros }: { filtros: FiltrosVitrina }) {
  return (
    <nav aria-label="Tipo de infraestructura" className={s.familias}>
      {FAMILIAS_CHIP.map((f) => {
        const activa = filtros.tipo === f.sistema;
        return (
          <Link
            key={f.sistema}
            href={hrefMarketplace(conTipo(filtros, activa ? null : f.sistema))}
            className={s.familia}
            data-activa={activa || undefined}
            aria-current={activa ? "true" : undefined}
            style={{ ["--color-familia" as string]: f.color }}
          >
            <Icono familia={f.familia} />
            <span>{f.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
