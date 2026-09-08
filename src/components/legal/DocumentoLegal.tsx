// src/components/legal/DocumentoLegal.tsx

/**
 * Envoltorio compartido por /terms y /privacy. Existe para que los dos
 * documentos se lean como uno solo: misma columna de lectura, misma jerarquía
 * de títulos, misma fecha de vigencia visible arriba.
 *
 * La columna es de 720px y no del --container de 1100px del resto del sitio:
 * son textos largos de leer seguido, y a 1100px las líneas pasan de los 110
 * caracteres. El resto de tokens sí son los de globals.css, para no abrir una
 * segunda convención de color y tipografía.
 */

import type { ReactNode } from "react";

const STYLE = `
.clr-legal{ max-width: 720px; }
.clr-legal-meta{
  font: var(--fs-xs)/1.6 var(--font-mono, monospace);
  color: var(--ink-300);
  letter-spacing: .06em;
  text-transform: uppercase;
  margin: 18px 0 0;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.clr-legal h2{
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink-900);
  margin: 40px 0 10px;
  scroll-margin-top: calc(var(--nav-h) + 16px);
}
.clr-legal h3{
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
  margin: 22px 0 6px;
}
.clr-legal p, .clr-legal li{
  font-size: 14px;
  line-height: 1.65;
  color: var(--ink-600);
}
.clr-legal p{ margin: 0 0 12px; }
.clr-legal ul, .clr-legal ol{ margin: 0 0 12px; padding-left: 20px; }
.clr-legal li{ margin-bottom: 6px; }
.clr-legal li::marker{ color: var(--ink-300); }
.clr-legal strong{ color: var(--ink-900); font-weight: 600; }
.clr-legal a{ color: var(--accent); }
.clr-legal code{
  font: 12px var(--font-mono, monospace);
  background: var(--surface-alt);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
  color: var(--ink-900);
}
.clr-legal-nota{
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 2px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  margin: 0 0 12px;
}
.clr-legal-nota p:last-child{ margin-bottom: 0; }
`;

export default function DocumentoLegal({
  etiqueta,
  titulo,
  resumen,
  vigencia,
  children,
}: {
  etiqueta: string;
  titulo: string;
  /** Una frase en lenguaje llano. Va antes del articulado, no lo sustituye. */
  resumen: string;
  /** Fecha de entrada en vigor, en formato legible. */
  vigencia: string;
  children: ReactNode;
}) {
  return (
    <main className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-container clr-legal">
        <span className="clr-tag">{etiqueta}</span>
        <h1 className="clr-h1">{titulo}</h1>
        <p className="clr-sub">{resumen}</p>
        <p className="clr-legal-meta">En vigor desde el {vigencia}</p>
        {children}
      </div>
    </main>
  );
}
