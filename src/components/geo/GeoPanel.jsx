"use client";
import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import PropertyDataForm from "./PropertyDataForm";
import { checkSITARDViability, determineCompetentAuthority, getClimateData } from "@/src/lib/geo/zoning";
import { getDepartment, getMunicipality } from "@/src/lib/geo/colombia";

const LocationPickerMap = dynamic(
  () => import("./LocationPickerMap"),
  { ssr: false, loading: () => <div style={mapLoading}>Cargando mapa…</div> }
);

const mapLoading = {
  height: "340px", display: "flex", alignItems: "center", justifyContent: "center",
  background: "#041820", border: "1px solid #1a4060", borderRadius: "6px",
  color: "#2a6080", fontSize: "11px",
};

const LS_KEY = "hs_geo_data";

// ── Color helpers ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
  viable:     { c: "#00FF88", rgb: "0,255,136",   label: "VIABLE"     },
  alerta:     { c: "#FFB020", rgb: "255,176,32",  label: "ALERTA"     },
  bloqueante: { c: "#FF5050", rgb: "255,80,80",   label: "BLOQUEANTE" },
};

// ── Styles ────────────────────────────────────────────────────────────────
const S = {
  root: {
    minHeight: "calc(100vh - 52px)",
    background: "linear-gradient(135deg,#0a1628 0%,#0d2137 60%,#0a1f35 100%)",
    padding: "clamp(20px,4vw,40px) clamp(14px,4vw,24px) 80px",
    fontFamily: "'IBM Plex Sans',system-ui,sans-serif",
  },
  inner: { maxWidth: "1100px", margin: "0 auto" },
  hdr: { marginBottom: "28px" },
  tag: { fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", color: "#4a7fa5", fontFamily: "'IBM Plex Mono',monospace", marginBottom: "8px" },
  title: { fontFamily: "'IBM Plex Mono',monospace", fontSize: "26px", fontWeight: "700", color: "#e2f0f7", marginBottom: "6px" },
  sub: { fontSize: "12px", color: "#4a7fa5" },
  layout: { display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px", alignItems: "start" },
  panel: { background: "rgba(255,255,255,0.02)", border: "1px solid #1a4060", borderRadius: "10px", padding: "20px" },
  panelTitle: { fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", color: "#4a7fa5", fontFamily: "'IBM Plex Mono',monospace", marginBottom: "14px" },
  resultCard: (status) => ({
    background: `rgba(${STATUS_COLORS[status].rgb},0.06)`,
    border: `1px solid rgba(${STATUS_COLORS[status].rgb},0.2)`,
    borderLeft: `3px solid ${STATUS_COLORS[status].c}`,
    borderRadius: "8px", padding: "14px 16px", marginBottom: "12px",
  }),
  badge: (status) => ({
    display: "inline-block", fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em",
    color: STATUS_COLORS[status].c, fontFamily: "'Orbitron',sans-serif",
    marginBottom: "5px",
  }),
  cardTitle: { fontSize: "12px", color: "#e2f0f7", fontWeight: "600", marginBottom: "5px" },
  cardText:  { fontSize: "10px", color: "#7ab0d0", lineHeight: "1.6" },
  cardNorm:  { fontSize: "9px",  color: "#2a6080", marginTop: "5px", fontFamily: "'IBM Plex Mono',monospace" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginBottom: "12px" },
  kpi: { background: "#041820", border: "1px solid #0d2035", borderRadius: "6px", padding: "10px", textAlign: "center" },
  kpiv: (c) => ({ fontSize: "18px", fontWeight: "700", color: c, fontFamily: "'Orbitron',sans-serif", lineHeight: 1 }),
  kpiu: { fontSize: "8px", color: "#4a7fa5", marginTop: "2px" },
  kpil: { fontSize: "9px", color: "#2a6080", marginTop: "4px" },
  saveBtn: {
    width: "100%", background: "transparent", border: "1px solid #00F5FF",
    color: "#00F5FF", fontSize: "10px", fontWeight: "700", letterSpacing: "0.14em",
    textTransform: "uppercase", cursor: "pointer", padding: "11px", borderRadius: "4px",
    fontFamily: "'Orbitron',sans-serif", marginTop: "12px",
  },
  savedBanner: {
    marginTop: "10px", padding: "8px 12px", background: "rgba(0,255,136,0.06)",
    border: "1px solid rgba(0,255,136,0.2)", borderRadius: "6px",
    fontSize: "10px", color: "#00FF88", textAlign: "center",
  },
  sec: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", marginTop: "4px" },
  secLabel: { fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "#2a5070", fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "nowrap" },
  secLine: { flex: 1, height: "1px", background: "#0d2035" },
  climSpinner: { fontSize: "10px", color: "#2a6080", padding: "8px 0" },
};

export default function GeoPanel() {
  const [location,  setLocation]  = useState(null);          // { lat, lon, address }
  const [propData,  setPropData]  = useState({});
  const [viability, setViability] = useState(null);
  const [authority, setAuthority] = useState(null);
  const [climate,   setClimate]   = useState(null);
  const [climLoad,  setClimLoad]  = useState(false);
  const [climErr,   setClimErr]   = useState(null);
  const [saved,     setSaved]     = useState(false);

  // Fetch climate whenever coordinates change
  useEffect(() => {
    if (!location?.lat || !location?.lon) return;
    setClimLoad(true); setClimErr(null);
    getClimateData(location.lat, location.lon)
      .then(setClimate)
      .catch(() => setClimErr("No se pudieron obtener datos climáticos. Verificar conexión."))
      .finally(() => setClimLoad(false));
  }, [location?.lat, location?.lon]);

  // Recompute authority + viability when relevant fields change
  useEffect(() => {
    if (!propData.dept) { setAuthority(null); setViability(null); return; }
    const dept = getDepartment(propData.dept);
    const mun  = getMunicipality(propData.dept, propData.mun ?? "");
    setAuthority(determineCompetentAuthority(propData.dept));
    if (propData.zoning) {
      setViability(checkSITARDViability(propData.zoning, propData.dept, mun?.bigCity ?? false));
    }
  }, [propData.dept, propData.mun, propData.zoning]);

  const handleSave = () => {
    const data = { location, propData, viability, authority, climate, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isComplete = location && propData.dept && propData.mun;

  return (
    <div style={S.root}>
      <div style={S.inner}>
        <div style={S.hdr}>
          <div style={S.tag}>geo · fase 6</div>
          <h1 style={S.title}>Geolocalización del Predio</h1>
          <p style={S.sub}>Ubicación en mapa · datos catastrales · viabilidad SITARD · autoridad ambiental · clima</p>
        </div>

        <div style={S.layout}>
          {/* LEFT: Map + PropertyDataForm */}
          <div>
            <div style={S.panel}>
              <div style={S.panelTitle}>1 — Ubicación en mapa</div>
              <LocationPickerMap value={location} onChange={setLocation} height={360} />
            </div>

            <div style={{ ...S.panel, marginTop: "16px" }}>
              <div style={S.panelTitle}>2 — Datos del predio</div>
              <PropertyDataForm value={propData} onChange={setPropData} />
            </div>
          </div>

          {/* RIGHT: Results sidebar */}
          <div style={{ position: "sticky", top: "12px" }}>
            {/* Viability */}
            <div style={S.panel}>
              <div style={S.panelTitle}>Viabilidad SITARD</div>
              {viability ? (
                <div style={S.resultCard(viability.status)}>
                  <div style={S.badge(viability.status)}>
                    {viability.status === "viable" ? "✓" : viability.status === "alerta" ? "⚠" : "✗"}{" "}
                    {STATUS_COLORS[viability.status].label}
                  </div>
                  <div style={S.cardTitle}>{viability.title}</div>
                  <div style={S.cardText}>{viability.message}</div>
                  <div style={S.cardNorm}>{viability.norma}</div>
                </div>
              ) : (
                <div style={{ fontSize: "10px", color: "#2a6080" }}>
                  Seleccionar departamento y régimen POT para evaluar viabilidad.
                </div>
              )}

              {/* Authority */}
              {authority && (
                <>
                  <div style={{ ...S.sec, marginTop: "14px" }}>
                    <div style={S.secLabel}>Autoridad ambiental</div>
                    <div style={S.secLine} />
                  </div>
                  <div style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: "6px", padding: "12px 14px", marginBottom: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#00d4ff", fontFamily: "'Orbitron',sans-serif", marginBottom: "4px" }}>
                      {authority.authority}
                    </div>
                    <div style={{ fontSize: "10px", color: "#7ab0d0", marginBottom: "6px" }}>{authority.authorityFull}</div>
                    <div style={{ fontSize: "9px", color: "#4a7fa5", marginBottom: "4px" }}>📋 {authority.tramite}</div>
                    <div style={{ fontSize: "9px", color: "#2a6080", fontFamily: "'IBM Plex Mono',monospace" }}>🌐 {authority.contactHint}</div>
                  </div>
                </>
              )}

              {/* Climate */}
              <>
                <div style={S.sec}>
                  <div style={S.secLabel}>Datos climáticos</div>
                  <div style={S.secLine} />
                </div>
                {climLoad && <div style={S.climSpinner}>Consultando Open-Meteo…</div>}
                {climErr  && <div style={{ fontSize: "10px", color: "#FF5050" }}>{climErr}</div>}
                {!climLoad && climate && (
                  <>
                    <div style={S.kpiGrid}>
                      <div style={S.kpi}>
                        <div style={S.kpiv("#a0c8e0")}>{climate.elevation_m}</div>
                        <div style={S.kpiu}>m.s.n.m.</div>
                        <div style={S.kpil}>Altitud</div>
                      </div>
                      <div style={S.kpi}>
                        <div style={S.kpiv("#00d4ff")}>{climate.temp_media_c}</div>
                        <div style={S.kpiu}>°C</div>
                        <div style={S.kpil}>T media</div>
                      </div>
                      <div style={S.kpi}>
                        <div style={S.kpiv("#FFB020")}>{climate.etp_media_mm_dia}</div>
                        <div style={S.kpiu}>mm/día</div>
                        <div style={S.kpil}>ETP est.</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "10px", color: "#4a7fa5", marginBottom: "6px" }}>
                      Clima: <strong style={{ color: "#7ab0d0" }}>{climate.clima_tipo}</strong>
                    </div>
                    <div style={{ fontSize: "10px", color: "#4a7fa5", marginBottom: "4px" }}>
                      T min/max: {climate.temp_min_c}°C / {climate.temp_max_c}°C
                    </div>
                    {climate.precipitacion_anual_mm && (
                      <div style={{ fontSize: "10px", color: "#4a7fa5" }}>
                        Precipitación est.: ~{climate.precipitacion_anual_mm} mm/año
                      </div>
                    )}
                    <div style={{ fontSize: "9px", color: "#1e4060", marginTop: "6px" }}>
                      {climate.fuente}
                    </div>
                    <div style={{ fontSize: "9px", color: "#00FF88", marginTop: "4px" }}>
                      ✓ T={climate.temp_media_c}°C y ETP={climate.etp_media_mm_dia} mm/día se aplicarán automáticamente en la calculadora.
                    </div>
                  </>
                )}
                {!climLoad && !climate && !climErr && (
                  <div style={{ fontSize: "10px", color: "#2a6080" }}>
                    Fijar ubicación en el mapa para obtener temperatura, altitud y ETP.
                  </div>
                )}
              </>

              {/* Save button */}
              <button style={S.saveBtn} onClick={handleSave} disabled={!isComplete}>
                {isComplete ? "▶ Guardar y aplicar a calculadora" : "Completar ubicación y departamento"}
              </button>
              {saved && (
                <div style={S.savedBanner}>
                  ✓ Datos guardados — ve a la calculadora para ver los datos aplicados.
                </div>
              )}
            </div>

            {/* Coordinates summary */}
            {location && (
              <div style={{ ...S.panel, marginTop: "12px" }}>
                <div style={S.panelTitle}>Coordenadas</div>
                {[
                  ["Latitud (WGS84)", `${location.lat.toFixed(6)}°`],
                  ["Longitud (WGS84)", `${location.lon.toFixed(6)}°`],
                  ["Sistema", "MAGNA-SIRGAS geográfico (EPSG:4686)"],
                  ["OSM", `openstreetmap.org/#map=15/${location.lat.toFixed(4)}/${location.lon.toFixed(4)}`],
                ].map(([k, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "5px", gap: "8px" }}>
                    <span style={{ color: "#4a7fa5" }}>{k}</span>
                    <span style={{ color: "#a0c8d8", fontFamily: "'IBM Plex Mono',monospace", textAlign: "right", wordBreak: "break-all" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
