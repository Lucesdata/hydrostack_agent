"use client";
import { useState } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const RANGES = [
  { label: "1",          value: 1  },
  { label: "2",          value: 2  },
  { label: "3",          value: 3  },
  { label: "4",          value: 4  },
  { label: "5",          value: 5  },
  { label: "6",          value: 6  },
  { label: "7",          value: 7  },
  { label: "8",          value: 8  },
  { label: "9",          value: 9  },
  { label: "10",         value: 10 },
  { label: "11 – 15",    value: 13 },
  { label: "16 – 20",    value: 18 },
  { label: "21 – 30",    value: 25 },
  { label: "31 – 50",    value: 40 },
  { label: "51 – 100",   value: 75 },
  { label: "+ de 100",   value: 120 },
];

const COMMERCIAL_THRESHOLD = 11; // personas → show use type

const USE_TYPES = {
  es: [
    { id: "vivienda",      label: "Vivienda familiar permanente"             },
    { id: "hospedaje",     label: "Alquiler de habitaciones / hospedaje"     },
    { id: "hotel",         label: "Hotel o pensión"                          },
    { id: "vacacional",    label: "Centro vacacional / campamento"           },
    { id: "restaurante",   label: "Restaurante o cafetería"                  },
    { id: "oficinas",      label: "Oficinas / uso comercial"                 },
    { id: "institucional", label: "Colegio / institución"                    },
    { id: "otro",          label: "Otro tipo de uso"                         },
  ],
  en: [
    { id: "vivienda",      label: "Permanent family home"                    },
    { id: "hospedaje",     label: "Room rental / lodging"                    },
    { id: "hotel",         label: "Hotel or guesthouse"                      },
    { id: "vacacional",    label: "Vacation resort / campsite"               },
    { id: "restaurante",   label: "Restaurant or café"                       },
    { id: "oficinas",      label: "Office / commercial use"                  },
    { id: "institucional", label: "School / institution"                     },
    { id: "otro",          label: "Other use"                                },
  ],
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
  option: (selected) => ({
    display: "flex", alignItems: "center", gap: "10px",
    padding: "7px 10px", cursor: "pointer",
    background: selected ? "rgba(0,245,255,0.1)" : "transparent",
    borderBottom: "1px solid rgba(0,245,255,0.05)",
    fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px",
    color: selected ? "#00F5FF" : "#7ab8c8", userSelect: "none",
    transition: "background 0.12s",
  }),
  num: {
    fontSize: "10px", color: "#2a5070",
    minWidth: "20px", textAlign: "right", flexShrink: 0,
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    padding: "4px 10px", background: "rgba(0,245,255,0.07)",
    border: "1px solid rgba(0,245,255,0.18)", borderRadius: "3px",
    fontSize: "11px", color: "#00F5FF",
    fontFamily: "'IBM Plex Mono', monospace", marginBottom: "2px",
  },
  change: {
    fontSize: "9px", color: "#2a5070", cursor: "pointer",
    letterSpacing: "0.05em", marginLeft: "2px",
  },
  note: {
    fontSize: "10px", color: "#4A7A8A", fontFamily: "'IBM Plex Mono', monospace",
    padding: "6px 8px", background: "rgba(0,245,255,0.03)",
    border: "1px solid rgba(0,245,255,0.08)", borderRadius: "3px",
    lineHeight: 1.5,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PeoplePicker({ lang = "es", onComplete }) {
  const [range,   setRange]   = useState(null); // { label, value }
  const [useType, setUseType] = useState(null); // { id, label }

  const isEs = lang === "es";
  const useTypes = USE_TYPES[isEs ? "es" : "en"];
  const needsUseType = range && range.value >= COMMERCIAL_THRESHOLD;

  function pickRange(r) {
    setRange(r);
    setUseType(null);
    // If below threshold, default to vivienda and complete
    if (r.value < COMMERCIAL_THRESHOLD) {
      onComplete(r.value, "vivienda", r.label);
    }
  }

  function pickUseType(ut) {
    setUseType(ut);
    onComplete(range.value, ut.id, range.label);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* Range selector */}
      {range ? (
        <div style={sty.badge}>
          ✓ {range.label} {isEs ? "persona(s)" : "person(s)"}
          <span style={sty.change} onClick={() => { setRange(null); setUseType(null); }}>
            {isEs ? "cambiar" : "change"}
          </span>
        </div>
      ) : (
        <div>
          <span style={sty.sectionLabel}>
            {isEs ? "Número de personas" : "Number of people"}
          </span>
          <div style={sty.list}>
            {RANGES.map((r, i) => (
              <div key={r.value} style={sty.option(false)} onClick={() => pickRange(r)}>
                <span style={sty.num}>{i + 1}</span>
                <span>{r.label} {isEs ? "persona(s)" : "person(s)"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Use type — only when >= threshold */}
      {needsUseType && (
        useType ? (
          <div style={sty.badge}>
            ✓ {useType.label}
            <span style={sty.change} onClick={() => setUseType(null)}>
              {isEs ? "cambiar" : "change"}
            </span>
          </div>
        ) : (
          <div>
            <div style={{ ...sty.note, marginBottom: "8px" }}>
              {isEs
                ? "Con más de 10 personas el tipo de uso afecta el diseño. ¿Cómo se usa esta propiedad?"
                : "With more than 10 people, the use type affects the design. How is this property used?"}
            </div>
            <div style={sty.list}>
              {useTypes.map((ut, i) => (
                <div key={ut.id} style={sty.option(false)} onClick={() => pickUseType(ut)}>
                  <span style={sty.num}>{i + 1}</span>
                  <span>{ut.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

    </div>
  );
}
