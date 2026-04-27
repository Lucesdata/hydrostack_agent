"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

const MODULES = [
  {
    slug: "fosa-septica",
    icon: "🪣",
    norms: "RAS · España · EN 12566 · EPA",
    ready: true,
    titleKey: "septicTitle",
    descKey: "septicDesc",
  },
  { slug: "imhoff",  icon: "🏗", ready: false, titleKey: "imhoffTitle", descKey: "imhoffDesc" },
  { slug: "lodos",   icon: "🔬", ready: false, titleKey: "lodsTitle",   descKey: "lodsDesc"   },
  { slug: "uasb",    icon: "⚗️",  ready: false, titleKey: "uasbTitle",   descKey: "uasbDesc"   },
  { slug: "filtro",  icon: "🧱", ready: false, titleKey: "filterTitle", descKey: "filterDesc" },
  { slug: "potable", icon: "💧", ready: false, titleKey: "potTitle",    descKey: "potDesc"    },
];

export default function CalculatorsPage() {
  const { t } = useLang();
  const tc = t.calculators;

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.header}>
          <div style={S.tag}>calculators</div>
          <h1 style={S.title}>{tc.pageTitle}</h1>
          <p style={S.sub}>{tc.pageSubtitle}</p>
        </div>

        <div style={S.grid}>
          {MODULES.map((m, i) => (
            m.ready ? (
              <Link key={i} href={`/calculators/${m.slug}`} style={S.card(true)}>
                <div style={S.cardIcon}>{m.icon}</div>
                <div style={S.cardTitle}>{tc[m.titleKey]}</div>
                <div style={S.cardDesc}>{tc[m.descKey]}</div>
                {m.norms && <div style={S.cardNorms}>{m.norms}</div>}
                <div style={S.cardCta}>{tc.open} →</div>
              </Link>
            ) : (
              <div key={i} style={S.card(false)}>
                <div style={{...S.cardIcon, opacity:0.3}}>{m.icon}</div>
                <div style={{...S.cardTitle, opacity:0.4}}>{tc[m.titleKey]}</div>
                <div style={{...S.cardDesc, opacity:0.3}}>{tc[m.descKey]}</div>
                <div style={S.cardSoon}>{tc.soon}</div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "calc(100vh - 52px)",
    background: "linear-gradient(135deg,#0a1628 0%,#0d2137 60%,#0a1f35 100%)",
    padding: "52px 28px 80px",
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  },
  inner: {
    maxWidth: "1000px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "44px",
  },
  tag: {
    fontSize: "9px",
    letterSpacing: "3px",
    textTransform: "uppercase",
    color: "#4a7fa5",
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: "10px",
  },
  title: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "32px",
    fontWeight: "700",
    color: "#e2f0f7",
    marginBottom: "10px",
  },
  sub: {
    fontSize: "13px",
    color: "#4a7fa5",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  card: (active) => ({
    background: active ? "rgba(0,212,255,0.05)" : "rgba(255,255,255,0.02)",
    border: active ? "1px solid rgba(0,212,255,0.2)" : "1px solid #1e4060",
    borderRadius: "8px",
    padding: "24px 22px",
    cursor: active ? "pointer" : "default",
    display: "block",
    transition: "all 0.2s",
  }),
  cardIcon: {
    fontSize: "28px",
    marginBottom: "14px",
  },
  cardTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "14px",
    fontWeight: "700",
    color: "#e2f0f7",
    marginBottom: "8px",
  },
  cardDesc: {
    fontSize: "12px",
    color: "#4a7fa5",
    lineHeight: "1.65",
    marginBottom: "12px",
  },
  cardNorms: {
    fontSize: "9px",
    color: "#2a6080",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.5px",
    marginBottom: "14px",
  },
  cardCta: {
    fontSize: "10px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: "700",
    color: "#00d4ff",
    letterSpacing: "1px",
  },
  cardSoon: {
    fontSize: "9px",
    color: "#2a5070",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
};
