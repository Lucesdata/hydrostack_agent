"use client";
import { useState } from "react";
import LocationPicker from "./LocationPicker";
import PeoplePicker from "./PeoplePicker";

const SOIL_OPTIONS = {
  es: [
    { value: "high",    label: "Arena — alta permeabilidad" },
    { value: "medium",  label: "Franco o limo — media" },
    { value: "low",     label: "Arcilla — baja permeabilidad" },
    { value: "unknown", label: "No lo sé aún" },
  ],
  en: [
    { value: "high",    label: "Sand — high permeability" },
    { value: "medium",  label: "Loam / silt — medium" },
    { value: "low",     label: "Clay — low permeability" },
    { value: "unknown", label: "I don't know yet" },
  ],
};

const sty = {
  wrap: { marginTop: "4px", display: "flex", flexDirection: "column", gap: "14px" },
  label: {
    fontSize: "10px", color: "#4A7A8A", letterSpacing: "0.1em",
    textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: "5px", display: "block",
  },
  soilList: {
    border: "1px solid rgba(0,245,255,0.12)", borderRadius: "4px",
    background: "rgba(0,10,14,0.5)", overflow: "hidden",
  },
  soilOption: (selected) => ({
    display: "flex", alignItems: "center", gap: "10px",
    padding: "7px 10px", cursor: "pointer",
    background: selected ? "rgba(0,245,255,0.1)" : "transparent",
    borderBottom: "1px solid rgba(0,245,255,0.05)",
    fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px",
    color: selected ? "#00F5FF" : "#7ab8c8", userSelect: "none",
  }),
  num: {
    fontSize: "10px", color: "#2a5070",
    minWidth: "20px", textAlign: "right", flexShrink: 0,
  },
  locationBadge: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    padding: "5px 10px", background: "rgba(0,245,255,0.07)",
    border: "1px solid rgba(0,245,255,0.2)", borderRadius: "3px",
    fontSize: "11px", color: "#00F5FF",
    fontFamily: "'IBM Plex Mono', monospace",
  },
};

export default function BuildSystemFlow({ onSubmit, lang = "es" }) {
  const [people,   setPeople]   = useState(null); // { value, useType, label }
  const [location, setLocation] = useState(null); // { label, norm }
  const [suelo,    setSuelo]    = useState("unknown");

  const isEs = lang === "es";
  const soilOpts = SOIL_OPTIONS[isEs ? "es" : "en"];
  const canSubmit = people && location;

  function handleLocationComplete(label, norm) {
    setLocation({ label, norm });
  }

  function handlePeopleComplete(value, useType, rangeLabel) {
    setPeople({ value, useType, label: rangeLabel });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ personas: people.value, personasLabel: people.label, tipoUso: people.useType, ubicacion: location.label, suelo, norm: location.norm });
  }

  return (
    <form onSubmit={handleSubmit} style={sty.wrap}>

      {/* Personas */}
      <div>
        <label style={sty.label}>
          {isEs ? "Personas en la vivienda" : "People in the household"}
        </label>
        {people ? (
          <div style={sty.locationBadge}>
            ✓ {people.label} {isEs ? "persona(s)" : "person(s)"}
            <span
              onClick={() => setPeople(null)}
              style={{ cursor: "pointer", color: "#4A7A8A", fontSize: "9px" }}
            >
              {isEs ? "cambiar" : "change"}
            </span>
          </div>
        ) : (
          <PeoplePicker lang={lang} onComplete={handlePeopleComplete} />
        )}
      </div>

      {/* Location picker */}
      <div>
        <label style={sty.label}>
          {isEs ? "Ubicación" : "Location"}
        </label>
        {location ? (
          <div style={sty.locationBadge}>
            ✓ {location.label}
            <span
              onClick={() => setLocation(null)}
              style={{ cursor: "pointer", color: "#4A7A8A", fontSize: "9px" }}
            >
              {isEs ? "cambiar" : "change"}
            </span>
          </div>
        ) : (
          <LocationPicker lang={lang} onComplete={handleLocationComplete} />
        )}
      </div>

      {/* Soil type */}
      <div>
        <label style={sty.label}>
          {isEs ? "Tipo de suelo (aproximado)" : "Soil type (approximate)"}
        </label>
        <div style={sty.soilList}>
          {soilOpts.map((o, i) => (
            <div
              key={o.value}
              style={sty.soilOption(suelo === o.value)}
              onClick={() => setSuelo(o.value)}
            >
              <span style={sty.num}>{i + 1}</span>
              <span>{o.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          background: canSubmit ? "rgba(0,245,255,0.12)" : "rgba(0,245,255,0.04)",
          border: `1px solid ${canSubmit ? "rgba(0,245,255,0.35)" : "rgba(0,245,255,0.08)"}`,
          borderRadius: "4px", padding: "9px 16px",
          color: canSubmit ? "#00F5FF" : "#2a5070",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px",
          letterSpacing: "0.08em", cursor: canSubmit ? "pointer" : "not-allowed",
          fontWeight: 700, alignSelf: "flex-start",
        }}
      >
        {isEs ? "DISEÑAR MI SISTEMA →" : "DESIGN MY SYSTEM →"}
      </button>

    </form>
  );
}
