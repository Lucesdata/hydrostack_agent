// src/components/oferente/SectorZonaSetup.tsx
import { SECTOR_OPTIONS } from "@/src/lib/oferente/wizard";
import { DEPARTAMENTOS } from "@/data/dane/divipola";
import { saveMinimoPerfilAction } from "@/src/lib/oferente/actions";

const STYLE = `
  .clr-szs{ display: flex; flex-direction: column; gap: 20px; }
  .clr-szs-group h3{ font-size: 13px; font-weight: 600; color: var(--ink-900); margin: 0 0 8px; }
  .clr-szs-chips{ display: flex; flex-wrap: wrap; gap: 8px; }
  .clr-szs-chip{ position: relative; }
  .clr-szs-chip input{ position: absolute; opacity: 0; inset: 0; cursor: pointer; margin: 0; }
  .clr-szs-chip span{
    display: inline-flex; align-items: center; padding: 6px 12px; border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--line); font-size: 12.5px; color: var(--ink-700, var(--ink-600));
    background: var(--card, #fff); user-select: none;
  }
  .clr-szs-chip input:checked + span{
    background: var(--accent); border-color: var(--accent); color: #fff;
  }
  .clr-szs-submit{
    align-self: flex-start; background: var(--accent); color: #fff; border: none;
    font-size: 12.5px; font-weight: 500; padding: 9px 16px; border-radius: var(--radius-md);
    cursor: pointer;
  }
  .clr-szs-submit:hover{ opacity: 0.9; }
`;

export function SectorZonaSetup() {
  return (
    <div className="clr-szs">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <form action={saveMinimoPerfilAction} className="clr-szs">
        <div className="clr-szs-group">
          <h3>¿En qué sector trabajas?</h3>
          <div className="clr-szs-chips">
            {SECTOR_OPTIONS.map((o) => (
              <label key={o.codigo} className="clr-szs-chip">
                <input type="checkbox" name="sector" value={o.codigo} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="clr-szs-group">
          <h3>¿En qué zona te interesa participar?</h3>
          <div className="clr-szs-chips">
            {DEPARTAMENTOS.map((d) => (
              <label key={d.departamentoCodigo} className="clr-szs-chip">
                <input type="checkbox" name="departamento" value={d.departamentoCodigo} />
                <span>{d.departamentoNombre}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="clr-szs-submit">
          Ver mis coincidencias
        </button>
      </form>
    </div>
  );
}
