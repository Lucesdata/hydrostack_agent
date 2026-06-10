"use client";
import Link from "next/link";
import { useLang } from "@/src/lib/i18n";

import Compass from "@/src/components/icons/Compass";
import Geo from "@/src/components/icons/calculators/Geo";
import FosaSeptica from "@/src/components/icons/calculators/FosaSeptica";
import Mantenimiento from "@/src/components/icons/calculators/Mantenimiento";
import Imhoff from "@/src/components/icons/calculators/Imhoff";
import Lodos from "@/src/components/icons/calculators/Lodos";
import Uasb from "@/src/components/icons/calculators/Uasb";
import Filtro from "@/src/components/icons/calculators/Filtro";
import Potable from "@/src/components/icons/calculators/Potable";

const MODULES = [
  { n: "01", slug: "geo",            Glyph: Geo,            ready: true,  norms: "OSM · Open-Meteo · Ley 99/1993", titleKey: "geoTitle",     descKey: "geoDesc" },
  { n: "02", slug: "fosa-septica",   Glyph: FosaSeptica,    ready: true,  norms: "RAS · España · EN 12566 · EPA",  titleKey: "septicTitle",  descKey: "septicDesc" },
  { n: "03", slug: "mantenimiento",  Glyph: Mantenimiento,  ready: true,  norms: "Res. 0330/2017 · RAS 2017",      titleKey: "maintTitle",   descKey: "maintDesc" },
  { n: "04", slug: "imhoff",         Glyph: Imhoff,         ready: false, titleKey: "imhoffTitle", descKey: "imhoffDesc" },
  { n: "05", slug: "lodos",          Glyph: Lodos,          ready: false, titleKey: "lodsTitle",   descKey: "lodsDesc"   },
  { n: "06", slug: "uasb",           Glyph: Uasb,           ready: false, titleKey: "uasbTitle",   descKey: "uasbDesc"   },
  { n: "07", slug: "filtro",         Glyph: Filtro,         ready: false, titleKey: "filterTitle", descKey: "filterDesc" },
  { n: "08", slug: "potable",        Glyph: Potable,        ready: false, titleKey: "potTitle",    descKey: "potDesc"    },
];

export default function CalculatorsPage() {
  const { t, lang } = useLang();
  const tc = t.calculators;
  const isEs = lang === "es";

  return (
    <div className="clr-page">
      <div className="clr-container">
        <header style={{ marginBottom: 22 }}>
          <span className="clr-tag">calculators</span>
          <h1 className="clr-h1">{tc.pageTitle}</h1>
          <p className="clr-sub">{tc.pageSubtitle}</p>
        </header>

        <Link href="/build" className="clr-guided-banner">
          <span className="clr-guided-banner-icon">
            <Compass size={26} />
          </span>
          <span className="clr-guided-banner-body">
            <span className="clr-guided-banner-title">
              {isEs ? "¿Primera vez?" : "First time?"}
            </span>
            <span className="clr-guided-banner-sub">
              {isEs
                ? "Prueba el flujo guiado paso a paso (incluye informe PDF al final)."
                : "Try the step-by-step guided flow (PDF report included)."}
            </span>
          </span>
          <span className="clr-guided-banner-cta">
            {isEs ? "Ir al flujo guiado" : "Go to guided flow"}
            <span className="clr-cta-arrow">→</span>
          </span>
        </Link>

        <div className="clr-grid">
          {MODULES.map((m) => {
            const Glyph = m.Glyph;
            if (m.ready) {
              return (
                <Link key={m.slug} href={`/calculators/${m.slug}`} className="clr-card is-active">
                  <div className="clr-card-top">
                    <span className="clr-card-num">{m.n} · {m.slug.toUpperCase()}</span>
                    <Glyph size={36} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="clr-card-title">{tc[m.titleKey]}</div>
                  <p className="clr-card-desc">{tc[m.descKey]}</p>
                  {m.norms && <div className="clr-card-norms">{m.norms}</div>}
                  <span className="clr-card-cta">
                    {tc.open}
                    <span className="clr-cta-arrow">→</span>
                  </span>
                </Link>
              );
            }
            return (
              <div key={m.slug} className="clr-card is-soon">
                <div className="clr-card-top">
                  <span className="clr-card-num">{m.n} · {m.slug.toUpperCase()}</span>
                  <span className="clr-card-soon-badge">{tc.soon}</span>
                </div>
                <Glyph size={36} style={{ color: "var(--ink-300)" }} />
                <div className="clr-card-title">{tc[m.titleKey]}</div>
                <p className="clr-card-desc">{tc[m.descKey]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
