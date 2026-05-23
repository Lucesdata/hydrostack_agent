"use client";
import { useState } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const CONTINENTS = [
  { id: "latam",    es: "América Latina",    en: "Latin America"   },
  { id: "north_am", es: "América del Norte", en: "North America"   },
  { id: "europe",   es: "Europa",            en: "Europe"          },
  { id: "oceania",  es: "Oceanía",           en: "Oceania"         },
  { id: "other",    es: "Otro continente",   en: "Other continent" },
];

const COUNTRIES = {
  latam: [
    { id: "co", label: "Colombia",          norm: "ras" },
    { id: "mx", label: "México",            norm: "ras" },
    { id: "ve", label: "Venezuela",         norm: "ras" },
    { id: "ec", label: "Ecuador",           norm: "ras" },
    { id: "pe", label: "Perú",              norm: "ras" },
    { id: "ar", label: "Argentina",         norm: "ras" },
    { id: "cl", label: "Chile",             norm: "ras" },
    { id: "bo", label: "Bolivia",           norm: "ras" },
    { id: "pa", label: "Panamá",            norm: "ras" },
    { id: "cr", label: "Costa Rica",        norm: "ras" },
    { id: "gt", label: "Guatemala",         norm: "ras" },
    { id: "hn", label: "Honduras",          norm: "ras" },
    { id: "sv", label: "El Salvador",       norm: "ras" },
    { id: "ni", label: "Nicaragua",         norm: "ras" },
    { id: "do", label: "Rep. Dominicana",   norm: "ras" },
    { id: "br", label: "Brasil",            norm: "ras" },
    { id: "uy", label: "Uruguay",           norm: "ras" },
    { id: "py", label: "Paraguay",          norm: "ras" },
    { id: "other_la", label: "Otro país",   norm: "epa" },
  ],
  north_am: [
    { id: "us", label: "United States", norm: "epa" },
    { id: "ca", label: "Canada",        norm: "epa" },
    { id: "mx", label: "México",        norm: "ras" },
  ],
  europe: [
    { id: "es",       label: "España",         norm: "cte" },
    { id: "uk",       label: "United Kingdom", norm: "uk"  },
    { id: "fr",       label: "Francia",        norm: "cte" },
    { id: "de",       label: "Alemania",       norm: "cte" },
    { id: "pt",       label: "Portugal",       norm: "cte" },
    { id: "it",       label: "Italia",         norm: "cte" },
    { id: "other_eu", label: "Otro país",      norm: "cte" },
  ],
  oceania: [
    { id: "au", label: "Australia",    norm: "asnzs" },
    { id: "nz", label: "New Zealand",  norm: "asnzs" },
  ],
  other: [
    { id: "other_ot", label: "Otro país", norm: "epa" },
  ],
};

const REGIONS = {
  co: [
    { id: "ant", label: "Antioquia" },
    { id: "atl", label: "Atlántico" },
    { id: "bog", label: "Bogotá D.C." },
    { id: "bol", label: "Bolívar" },
    { id: "boy", label: "Boyacá" },
    { id: "cal", label: "Caldas" },
    { id: "caq", label: "Caquetá" },
    { id: "cau", label: "Cauca" },
    { id: "ces", label: "Cesar" },
    { id: "cho", label: "Chocó" },
    { id: "cor", label: "Córdoba" },
    { id: "cun", label: "Cundinamarca" },
    { id: "gua", label: "La Guajira" },
    { id: "hui", label: "Huila" },
    { id: "mag", label: "Magdalena" },
    { id: "met", label: "Meta" },
    { id: "nar", label: "Nariño" },
    { id: "nor", label: "Norte de Santander" },
    { id: "qui", label: "Quindío" },
    { id: "ris", label: "Risaralda" },
    { id: "san", label: "Santander" },
    { id: "suc", label: "Sucre" },
    { id: "tol", label: "Tolima" },
    { id: "val", label: "Valle del Cauca" },
    { id: "cas", label: "Casanare" },
    { id: "put", label: "Putumayo" },
    { id: "other_co", label: "Otro departamento" },
  ],
  us: [
    { id: "ca_us", label: "California" },
    { id: "tx",    label: "Texas" },
    { id: "fl",    label: "Florida" },
    { id: "ny",    label: "New York" },
    { id: "wa",    label: "Washington" },
    { id: "or",    label: "Oregon" },
    { id: "az",    label: "Arizona" },
    { id: "nc",    label: "North Carolina" },
    { id: "ga_us", label: "Georgia" },
    { id: "va",    label: "Virginia" },
    { id: "other_us", label: "Other state" },
  ],
  es: [
    { id: "and",      label: "Andalucía" },
    { id: "cat",      label: "Cataluña" },
    { id: "mad",      label: "Madrid" },
    { id: "val_es",   label: "Valencia" },
    { id: "gal",      label: "Galicia" },
    { id: "pv",       label: "País Vasco" },
    { id: "can",      label: "Canarias" },
    { id: "other_es", label: "Otra comunidad" },
  ],
  mx: [
    { id: "cdmx", label: "Ciudad de México" },
    { id: "jal",  label: "Jalisco" },
    { id: "nl",   label: "Nuevo León" },
    { id: "pue",  label: "Puebla" },
    { id: "ver",  label: "Veracruz" },
    { id: "yuc",  label: "Yucatán" },
    { id: "other_mx", label: "Otro estado" },
  ],
};

const MUNICIPALITIES = {
  val:  ["Cali","Palmira","Buenaventura","Tuluá","Buga","Cartago","Yumbo","Jamundí","Florida","Pradera","Candelaria","Zarzal","Caicedonia","Sevilla","El Cerrito","Guacarí","Roldanillo","La Unión","Otro municipio"],
  ant:  ["Medellín","Bello","Itagüí","Envigado","Rionegro","Apartadó","Turbo","Caucasia","Girardota","Copacabana","Otro municipio"],
  bog:  ["Bogotá"],
  cun:  ["Soacha","Facatativá","Zipaquirá","Chía","Mosquera","Madrid","Fusagasugá","Girardot","Otro municipio"],
  atl:  ["Barranquilla","Soledad","Malambo","Sabanalarga","Otro municipio"],
  bol:  ["Cartagena","Magangué","Mompox","Otro municipio"],
  nor:  ["Cúcuta","Ocaña","Pamplona","Villa del Rosario","Otro municipio"],
  san:  ["Bucaramanga","Floridablanca","Girón","Piedecuesta","Barrancabermeja","Otro municipio"],
  met:  ["Villavicencio","Acacías","Granada","Otro municipio"],
  hui:  ["Neiva","Pitalito","Garzón","Otro municipio"],
  tol:  ["Ibagué","Espinal","Melgar","Honda","Otro municipio"],
  boy:  ["Tunja","Duitama","Sogamoso","Chiquinquirá","Otro municipio"],
  nar:  ["Pasto","Tumaco","Ipiales","Otro municipio"],
  cau:  ["Popayán","Santander de Quilichao","Guapi","Otro municipio"],
  qui:  ["Armenia","Calarcá","Montenegro","Otro municipio"],
  ris:  ["Pereira","Dosquebradas","Santa Rosa de Cabal","Otro municipio"],
  cal:  ["Manizales","La Dorada","Riosucio","Otro municipio"],
  ces:  ["Valledupar","Aguachica","Codazzi","Otro municipio"],
  mag:  ["Santa Marta","Ciénaga","Fundación","Otro municipio"],
  cor:  ["Montería","Cereté","Sahagún","Otro municipio"],
  suc:  ["Sincelejo","Corozal","Sampués","Otro municipio"],
  gua:  ["Riohacha","Maicao","Uribia","Otro municipio"],
  cho:  ["Quibdó","Istmina","Otro municipio"],
  cas:  ["Yopal","Aguazul","Otro municipio"],
  put:  ["Mocoa","Puerto Asís","Otro municipio"],
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const sty = {
  sectionLabel: {
    fontSize: "10px", color: "#4A7A8A", letterSpacing: "0.1em",
    textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: "5px", display: "block",
  },
  list: {
    maxHeight: "152px", overflowY: "auto",
    border: "1px solid rgba(0,245,255,0.12)", borderRadius: "4px",
    background: "rgba(0,10,14,0.5)",
  },
  option: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "7px 10px", cursor: "pointer",
    borderBottom: "1px solid rgba(0,245,255,0.05)",
    fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px",
    color: "#7ab8c8", userSelect: "none",
  },
  num: {
    fontSize: "10px", color: "#2a5070",
    minWidth: "20px", textAlign: "right", flexShrink: 0,
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    padding: "4px 10px",
    background: "rgba(0,245,255,0.07)",
    border: "1px solid rgba(0,245,255,0.18)",
    borderRadius: "3px", fontSize: "11px", color: "#00F5FF",
    fontFamily: "'IBM Plex Mono', monospace", marginBottom: "2px",
  },
  change: {
    fontSize: "9px", color: "#2a5070", cursor: "pointer",
    letterSpacing: "0.05em", marginLeft: "2px",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function LocationPicker({ lang = "es", onComplete }) {
  const [continent, setContinent] = useState(null);
  const [country,   setCountry]   = useState(null);
  const [region,    setRegion]    = useState(null);

  const isEs = lang === "es";

  function pickContinent(c) {
    setContinent(c); setCountry(null); setRegion(null);
  }
  function pickCountry(c) {
    setCountry(c); setRegion(null);
    // If no regions defined for this country, complete immediately
    if (!REGIONS[c.id]) {
      onComplete(c.label, c.norm);
    }
  }
  function pickRegion(r) {
    setRegion(r);
    const munis = MUNICIPALITIES[r.id];
    // If no municipalities, complete with country + region
    if (!munis) {
      onComplete(`${country.label}, ${r.label}`, country.norm);
    }
  }
  function pickMunicipality(m) {
    onComplete(`${country.label}, ${region.label}, ${m}`, country.norm);
  }

  const countries     = continent ? COUNTRIES[continent.id] || []      : [];
  const regions       = country   ? REGIONS[country.id]    || []      : [];
  const municipalities = region   ? MUNICIPALITIES[region.id] || []   : [];
  const showMunis     = region && municipalities.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>

      {/* Continent */}
      {continent ? (
        <div style={sty.badge}>
          ✓ {isEs ? continent.es : continent.en}
          <span style={sty.change} onClick={() => pickContinent(null)}>
            {isEs ? "cambiar" : "change"}
          </span>
        </div>
      ) : (
        <div>
          <span style={sty.sectionLabel}>{isEs ? "Continente" : "Continent"}</span>
          <div style={sty.list}>
            {CONTINENTS.map((c, i) => (
              <div key={c.id} style={sty.option} onClick={() => pickContinent(c)}>
                <span style={sty.num}>{i + 1}</span>
                <span>{isEs ? c.es : c.en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Country */}
      {continent && (
        country ? (
          <div style={sty.badge}>
            ✓ {country.label}
            <span style={sty.change} onClick={() => pickCountry(null) || setRegion(null)}>
              {isEs ? "cambiar" : "change"}
            </span>
          </div>
        ) : (
          <div>
            <span style={sty.sectionLabel}>{isEs ? "País" : "Country"}</span>
            <div style={sty.list}>
              {countries.map((c, i) => (
                <div key={c.id} style={sty.option} onClick={() => pickCountry(c)}>
                  <span style={sty.num}>{i + 1}</span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Region */}
      {country && regions.length > 0 && (
        region ? (
          <div style={sty.badge}>
            ✓ {region.label}
            <span style={sty.change} onClick={() => setRegion(null)}>
              {isEs ? "cambiar" : "change"}
            </span>
          </div>
        ) : (
          <div>
            <span style={sty.sectionLabel}>
              {isEs ? "Departamento / Estado" : "State / Region"}
            </span>
            <div style={sty.list}>
              {regions.map((r, i) => (
                <div key={r.id} style={sty.option} onClick={() => pickRegion(r)}>
                  <span style={sty.num}>{i + 1}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Municipality */}
      {showMunis && (
        <div>
          <span style={sty.sectionLabel}>
            {isEs ? "Municipio / Ciudad" : "Municipality / City"}
          </span>
          <div style={sty.list}>
            {municipalities.map((m, i) => (
              <div key={m} style={sty.option} onClick={() => pickMunicipality(m)}>
                <span style={sty.num}>{i + 1}</span>
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
