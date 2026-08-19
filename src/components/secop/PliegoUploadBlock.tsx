// src/components/secop/PliegoUploadBlock.tsx

/**
 * Bloque colapsable dentro de cada tarjeta de /mis-coincidencias: puente
 * captcha->upload. `<details>` nativo — sin JS, coherente con que la página
 * es Server Component puro. Ver
 * docs/superpowers/specs/2026-08-19-captcha-upload-bridge-design.md.
 */

import { uploadPliegoAction } from "@/src/lib/secop/pliego-actions";
import type { PliegoStatus } from "@/src/lib/secop/pliego-status";
import { formatCopCompact, formatShortDate } from "./format";

interface Props {
  procesoId: string;
  procesoUrl: string | null;
  status: PliegoStatus | undefined;
}

export function PliegoUploadBlock({ procesoId, procesoUrl, status }: Props) {
  return (
    <details className="clr-mc-pliego">
      <summary className="clr-mc-pliego-summary">
        {status ? (
          <>
            <span
              className={`clr-mc-pliego-glyph clr-mc-pliego-glyph--${status.gateMatematicoPasado ? "pass" : "fail"}`}
            >
              {status.gateMatematicoPasado ? "✓" : "✕"}
            </span>
            {(() => {
              const dateStr = formatShortDate(status.createdAt.toISOString());
              return <>Pliego cargado{dateStr ? ` · ${dateStr}` : ""}</>;
            })()}
          </>
        ) : (
          "Subir pliego"
        )}
      </summary>
      <div className="clr-mc-pliego-body">
        {status && (
          <p className="clr-mc-pliego-fields">
            Presupuesto: {formatCopCompact(status.presupuestoOficialCop)} · Cierre:{" "}
            {status.fechaCierre}
          </p>
        )}
        <p className="clr-mc-pliego-hint">
          SECOP pide verificación humana para abrir este documento.
          {procesoUrl && (
            <>
              {" "}
              <a href={procesoUrl} target="_blank" rel="noreferrer">
                Ábrelo en SECOP ↗
              </a>
            </>
          )}{" "}
          descarga el Documento Base y súbelo aquí.
        </p>
        <form action={uploadPliegoAction} className="clr-mc-pliego-form">
          <input type="hidden" name="procesoId" value={procesoId} />
          <label htmlFor={`pliego-file-${procesoId}`} className="sr-only">
            Selecciona un archivo PDF del documento base
          </label>
          <input
            id={`pliego-file-${procesoId}`}
            type="file"
            name="file"
            accept="application/pdf"
            required
          />
          <button type="submit">{status ? "Volver a subir" : "Subir"}</button>
        </form>
      </div>
    </details>
  );
}
