"use client";
import { useState, useEffect } from "react";
import { C } from "./calculator/calculatorStyles";
import {
  calculatePumpingSchedule,
  calculateCloggingRisk,
  getInspectionChecklist,
} from "@/src/lib/calculations/maintenance";

// ─── Constants ──────────────────────────────────────────────────────────────

const SOIL_OPTIONS = [
  { value: "grava",          label: "Grava / Arena gruesa",        vida: "20–30 años" },
  { value: "arena_media",    label: "Arena media",                 vida: "18–25 años" },
  { value: "arena_fina",     label: "Arena fina",                  vida: "15–20 años" },
  { value: "limo_franco",    label: "Limo / Franco arenoso",       vida: "12–18 años" },
  { value: "arcilla_franca", label: "Arcilla franca",              vida: "8–14 años" },
  { value: "arcilla",        label: "Arcilla (marginal)",          vida: "5–9 años" },
];

const EVENT_TYPES = [
  { value: "limpieza",    label: "Vaciado / Limpieza",    icon: "🪣" },
  { value: "inspeccion",  label: "Inspección",            icon: "🔍" },
  { value: "reparacion",  label: "Reparación",            icon: "🔧" },
  { value: "otro",        label: "Otro",                  icon: "📋" },
];

const ALERT_COLORS = {
  ok:      { c: "#00FF88", rgb: "0,255,136",   label: "OK"      },
  proximo: { c: "#FFB020", rgb: "255,176,32",  label: "PRÓXIMO" },
  urgente: { c: "#FF7030", rgb: "255,112,48",  label: "URGENTE" },
  vencido: { c: "#FF5050", rgb: "255,80,80",   label: "VENCIDO" },
};

const RISK_COLORS = {
  bajo:     { c: "#00FF88", rgb: "0,255,136"   },
  moderado: { c: "#FFB020", rgb: "255,176,32"  },
  alto:     { c: "#FF7030", rgb: "255,112,48"  },
  critico:  { c: "#FF5050", rgb: "255,80,80"   },
};

const EVENTS_KEY  = "hs_maint_events";
const CALC_LS_KEY = "hs_calc_data";

const SOIL_IDX_TO_MAINT = [
  "grava",          // 0: Gravel / Coarse sand
  "arena_media",    // 1: Medium sand
  "arena_fina",     // 2: Fine sand
  "limo_franco",    // 3: Sandy loam
  "limo_franco",    // 4: Silt / Loam
  "arcilla_franca", // 5: Clay loam / Silt clay
  "arcilla",        // 6: Clay (unsuitable)
  "arena_fina",     // 7: Manual perc. test (default)
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadEvents() {
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]"); } catch { return []; }
}

function saveEvents(evs) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(evs));
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Kpi({ value, unit, label, color }) {
  return (
    <div style={C.kpi} className="hs-kpi">
      <div style={C.kv(color || "#00d4ff")}>{value}</div>
      <div style={C.ku}>{unit}</div>
      <div style={C.kl}>{label}</div>
    </div>
  );
}

function AlertBadge({ level, label }) {
  const ac = ALERT_COLORS[level] || ALERT_COLORS.ok;
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: "20px",
      background: `rgba(${ac.rgb},0.12)`, border: `1px solid rgba(${ac.rgb},0.3)`,
      color: ac.c, fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em",
      fontFamily: "'Orbitron',sans-serif",
    }}>
      {label || ac.label}
    </span>
  );
}

// ─── Tab: Cronograma ────────────────────────────────────────────────────────

function TabSchedule({ schedule, fs }) {
  if (!schedule) {
    return (
      <div style={C.empty}>
        <div style={{ fontSize: "48px", opacity: 0.15 }}>📅</div>
        <div style={{ fontSize: "14px", color: "#2a5070" }}>Ingresa la fecha de instalación</div>
      </div>
    );
  }

  const { alerta, dias_para_proximo, mensaje_alerta, eventos, fecha_instalacion_display } = schedule;
  const ac = ALERT_COLORS[alerta];

  return (
    <div>
      {/* Alert banner */}
      <div style={{
        background: `rgba(${ac.rgb},0.06)`, border: `1px solid rgba(${ac.rgb},0.2)`,
        borderLeft: `4px solid ${ac.c}`, borderRadius: "8px",
        padding: "14px 18px", marginBottom: "20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <AlertBadge level={alerta} />
          <span style={{ fontSize: "10px", color: ac.c, fontWeight: "700" }}>
            {dias_para_proximo !== null && dias_para_proximo < 0
              ? `VENCIDO hace ${Math.abs(dias_para_proximo)} días`
              : dias_para_proximo !== null
              ? `${dias_para_proximo} días para próximo vaciado`
              : "Todos los vaciados completados"}
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "#a0c8d8", lineHeight: "1.6" }}>{mensaje_alerta}</div>
      </div>

      {/* KPI row */}
      <div style={{ ...C.g3, marginBottom: "20px" }}>
        <Kpi
          value={dias_para_proximo !== null ? Math.abs(dias_para_proximo) : "—"}
          unit="días"
          label={dias_para_proximo !== null && dias_para_proximo < 0 ? "de retraso" : "para vaciado"}
          color={ac.c}
        />
        <Kpi value={fs} unit="años" label="Intervalo limpieza" color="#00d4ff" />
        <Kpi
          value={eventos.filter(e => e.estado === "completado").length}
          unit="vaciados"
          label="Completados"
          color="#4A9AEA"
        />
      </div>

      {/* Section header */}
      <div style={C.sec}><span>Cronograma de vaciados</span><div style={C.ln} /></div>

      {/* Timeline */}
      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute", left: "18px", top: "8px", bottom: "8px",
          width: "2px", background: "rgba(0,245,255,0.08)",
        }} />

        {eventos.map((ev, i) => {
          const isNext = ev.estado === "proximo";
          const isDone = ev.estado === "completado";
          const dotColor = isDone ? "#2a4060" : isNext ? ac.c : "#1e4060";
          const textColor = isDone ? "#2a5070" : isNext ? "#E8F8FF" : "#4A7A8A";

          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: "14px",
              marginBottom: "12px", position: "relative",
            }}>
              {/* Dot */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                background: isDone ? "rgba(42,64,96,0.4)" : `rgba(${ac.rgb},0.10)`,
                border: `2px solid ${dotColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: "700", color: dotColor,
                fontFamily: "'Orbitron',sans-serif", zIndex: 1,
              }}>
                {isDone ? "✓" : ev.numero}
              </div>

              {/* Content */}
              <div style={{
                flex: 1, background: isNext ? `rgba(${ac.rgb},0.04)` : "rgba(255,255,255,0.01)",
                border: `1px solid ${isNext ? `rgba(${ac.rgb},0.2)` : "rgba(0,245,255,0.06)"}`,
                borderRadius: "6px", padding: "10px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", color: textColor, fontWeight: isNext ? "700" : "400" }}>
                    {ev.fecha_display}
                  </span>
                  {isNext && <AlertBadge level={alerta} label="PRÓXIMO" />}
                  {isDone && (
                    <span style={{ fontSize: "9px", color: "#2a5070", fontFamily: "'IBM Plex Mono',monospace" }}>
                      completado
                    </span>
                  )}
                </div>
                {ev.dias_restantes !== null && (
                  <div style={{ fontSize: "10px", color: isNext ? ac.c : "#2a6080" }}>
                    {ev.dias_restantes >= 0
                      ? `En ${ev.dias_restantes} días`
                      : `Hace ${Math.abs(ev.dias_restantes)} días`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "14px", fontSize: "9px", color: "#2a5070", fontFamily: "'IBM Plex Mono',monospace" }}>
        Instalación: {fecha_instalacion_display} · Intervalo: {fs} años · Norma: Res. 0330/2017 Art. 139
      </div>
    </div>
  );
}

// ─── Tab: Checklist ──────────────────────────────────────────────────────────

function TabChecklist({ onSaveInspection }) {
  const items = getInspectionChecklist();
  const [checks, setChecks] = useState(() => Object.fromEntries(items.map(i => [i.id, null]))); // null=pending, true=ok, false=fail
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const toggle = (id, val) => setChecks(prev => ({ ...prev, [id]: prev[id] === val ? null : val }));

  const ok    = Object.values(checks).filter(v => v === true).length;
  const fail  = Object.values(checks).filter(v => v === false).length;
  const total = items.length;

  const handleSave = () => {
    onSaveInspection({ checks, notes, fecha: todayISO() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Group by category
  const categories = [...new Set(items.map(i => i.categoria))];

  return (
    <div>
      {/* Summary row */}
      <div style={{ ...C.g3, marginBottom: "20px" }}>
        <Kpi value={ok}       unit="OK"     label="Ítems aprobados" color="#00FF88" />
        <Kpi value={fail}     unit="FALLA"  label="Ítems con falla" color="#FF5050" />
        <Kpi value={total - ok - fail} unit="pendiente" label="Sin evaluar" color="#4A7A8A" />
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <div style={C.sec}><span>{cat}</span><div style={C.ln} /></div>
          {items.filter(i => i.categoria === cat).map(item => {
            const v = checks[item.id];
            return (
              <div key={item.id} style={{
                background: v === true  ? "rgba(0,255,136,0.03)"
                          : v === false ? "rgba(255,80,80,0.03)"
                          : "rgba(255,255,255,0.01)",
                border: `1px solid ${v === true  ? "rgba(0,255,136,0.15)"
                                    : v === false ? "rgba(255,80,80,0.15)"
                                    : "rgba(0,245,255,0.06)"}`,
                borderRadius: "6px", padding: "12px 14px", marginBottom: "8px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  {/* Pass/Fail buttons */}
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0, marginTop: "1px" }}>
                    <button onClick={() => toggle(item.id, true)} style={{
                      width: "28px", height: "22px", border: "1px solid",
                      borderColor: v === true ? "#00FF88" : "rgba(0,255,136,0.25)",
                      background: v === true ? "rgba(0,255,136,0.15)" : "transparent",
                      color: v === true ? "#00FF88" : "#1e4060",
                      borderRadius: "3px", cursor: "pointer", fontSize: "11px", fontWeight: "700",
                    }}>✓</button>
                    <button onClick={() => toggle(item.id, false)} style={{
                      width: "28px", height: "22px", border: "1px solid",
                      borderColor: v === false ? "#FF5050" : "rgba(255,80,80,0.25)",
                      background: v === false ? "rgba(255,80,80,0.15)" : "transparent",
                      color: v === false ? "#FF5050" : "#1e4060",
                      borderRadius: "3px", cursor: "pointer", fontSize: "11px", fontWeight: "700",
                    }}>✗</button>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", color: "#E8F8FF", fontWeight: "600", marginBottom: "3px" }}>
                      {item.descripcion}
                    </div>
                    <div style={{ fontSize: "10px", color: "#4A7A8A", lineHeight: "1.5", marginBottom: v === false ? "6px" : "0" }}>
                      {item.criterio}
                    </div>
                    {v === false && (
                      <div style={{
                        fontSize: "10px", color: "#FF7030", lineHeight: "1.5",
                        padding: "6px 10px", background: "rgba(255,80,80,0.04)",
                        border: "1px solid rgba(255,80,80,0.1)", borderRadius: "4px",
                      }}>
                        ↳ {item.accion_si_falla}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Notes + Save */}
      <div style={{ marginTop: "16px" }}>
        <div style={{ ...C.ig, marginBottom: "10px" }}>
          <label style={C.lbl}>Observaciones generales</label>
          <textarea
            style={{
              ...C.inp, minHeight: "60px", resize: "vertical", fontSize: "11px",
              lineHeight: "1.6",
            }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Condiciones del sitio, hallazgos relevantes..."
          />
        </div>
        <button
          onClick={handleSave}
          style={{
            background: saved ? "rgba(0,255,136,0.15)" : "transparent",
            border: `1px solid ${saved ? "#00FF88" : "#00F5FF"}`,
            color: saved ? "#00FF88" : "#00F5FF",
            padding: "9px 20px", borderRadius: "4px", cursor: "pointer",
            fontSize: "10px", fontWeight: "700", fontFamily: "'Orbitron',sans-serif",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}
        >
          {saved ? "✓ Guardado" : "Guardar inspección"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Registro ───────────────────────────────────────────────────────────

function TabRegistry() {
  const [events, setEvents]     = useState(() => loadEvents());
  const [tipo,   setTipo]       = useState("limpieza");
  const [fecha,  setFecha]      = useState(todayISO);
  const [contr,  setContr]      = useState("");
  const [notas,  setNotas]      = useState("");
  const [adding, setAdding]     = useState(false);

  const addEvent = () => {
    const ev = {
      id: Date.now(),
      tipo, fecha, contratista: contr, notas,
    };
    const updated = [ev, ...events];
    setEvents(updated);
    saveEvents(updated);
    setContr(""); setNotas(""); setAdding(false);
  };

  const removeEvent = (id) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    saveEvents(updated);
  };

  const typeInfo = (t) => EVENT_TYPES.find(e => e.value === t) || EVENT_TYPES[3];

  return (
    <div>
      {/* Add event button / form */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          style={{
            background: "transparent", border: "1px dashed rgba(0,245,255,0.3)",
            color: "#00F5FF", padding: "10px 20px", borderRadius: "6px",
            cursor: "pointer", fontSize: "10px", fontWeight: "700",
            fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "20px", width: "100%",
          }}
        >
          + Registrar evento
        </button>
      ) : (
        <div style={{
          background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.12)",
          borderRadius: "8px", padding: "16px", marginBottom: "20px",
        }}>
          <div style={{ ...C.g2, marginBottom: "8px" }}>
            <div style={C.ig}>
              <label style={C.lbl}>Tipo de evento</label>
              <select style={C.sel} value={tipo} onChange={e => setTipo(e.target.value)}>
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div style={C.ig}>
              <label style={C.lbl}>Fecha</label>
              <input style={C.inp} type="date" value={fecha}
                onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div style={{ ...C.ig, marginBottom: "8px" }}>
            <label style={C.lbl}>Contratista / Empresa</label>
            <input style={{ ...C.inp, fontSize: "11px" }} type="text"
              placeholder="Nombre de la empresa o técnico..."
              value={contr} onChange={e => setContr(e.target.value)} />
          </div>
          <div style={{ ...C.ig, marginBottom: "12px" }}>
            <label style={C.lbl}>Observaciones</label>
            <textarea
              style={{ ...C.inp, minHeight: "52px", resize: "vertical", fontSize: "11px", lineHeight: "1.6" }}
              placeholder="Volumen vaciado, hallazgos, materiales usados..."
              value={notas} onChange={e => setNotas(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addEvent} style={{
              background: "rgba(0,245,255,0.1)", border: "1px solid #00F5FF",
              color: "#00F5FF", padding: "7px 18px", borderRadius: "4px", cursor: "pointer",
              fontSize: "10px", fontWeight: "700", fontFamily: "'Orbitron',sans-serif",
            }}>
              Guardar
            </button>
            <button onClick={() => setAdding(false)} style={{
              background: "transparent", border: "1px solid rgba(0,245,255,0.2)",
              color: "#4A7A8A", padding: "7px 14px", borderRadius: "4px", cursor: "pointer",
              fontSize: "10px",
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Event list */}
      {events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#2a5070", fontSize: "12px" }}>
          Sin eventos registrados. Agrega el primer registro de mantenimiento.
        </div>
      ) : (
        events.map((ev, i) => {
          const t = typeInfo(ev.tipo);
          return (
            <div key={ev.id} style={{
              display: "flex", alignItems: "flex-start", gap: "12px",
              padding: "12px 14px", marginBottom: "8px",
              background: "rgba(255,255,255,0.01)",
              border: "1px solid rgba(0,245,255,0.07)", borderRadius: "6px",
            }}>
              <div style={{ fontSize: "20px", flexShrink: 0 }}>{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <span style={{ fontSize: "11px", color: "#E8F8FF", fontWeight: "600" }}>
                    {t.label}
                  </span>
                  <span style={{ fontSize: "10px", color: "#4A7A8A", fontFamily: "'IBM Plex Mono',monospace" }}>
                    {new Date(ev.fecha).toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" })}
                  </span>
                </div>
                {ev.contratista && (
                  <div style={{ fontSize: "10px", color: "#4A7A8A", marginBottom: "3px" }}>
                    {ev.contratista}
                  </div>
                )}
                {ev.notas && (
                  <div style={{ fontSize: "10px", color: "#2a6080", lineHeight: "1.5" }}>
                    {ev.notas}
                  </div>
                )}
              </div>
              <button onClick={() => removeEvent(ev.id)} style={{
                background: "transparent", border: "none", color: "#1e3050",
                cursor: "pointer", fontSize: "14px", padding: "0 4px",
                "&:hover": { color: "#FF5050" },
              }}>×</button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Tab: Colmatación ─────────────────────────────────────────────────────────

function TabClogging({ risk }) {
  if (!risk) {
    return (
      <div style={C.empty}>
        <div style={{ fontSize: "48px", opacity: 0.15 }}>⏳</div>
        <div style={{ fontSize: "14px", color: "#2a5070" }}>Ingresa la fecha de instalación y tipo de suelo</div>
      </div>
    );
  }

  const rc = RISK_COLORS[risk.riesgo];
  const pct = Math.min(risk.porcentaje_vida_util, 100);

  return (
    <div>
      {/* Risk level badge */}
      <div style={{
        background: `rgba(${rc.rgb},0.06)`, border: `1px solid rgba(${rc.rgb},0.2)`,
        borderLeft: `4px solid ${rc.c}`, borderRadius: "8px",
        padding: "14px 18px", marginBottom: "20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{
            background: `rgba(${rc.rgb},0.12)`, border: `1px solid rgba(${rc.rgb},0.3)`,
            color: rc.c, padding: "2px 10px", borderRadius: "20px",
            fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em",
            fontFamily: "'Orbitron',sans-serif",
          }}>
            RIESGO {risk.riesgo.toUpperCase()}
          </span>
          <span style={{ fontSize: "10px", color: rc.c, fontWeight: "700" }}>
            {risk.anos_operacion.toFixed(1)} años de operación
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "#a0c8d8", lineHeight: "1.6", marginBottom: "8px" }}>
          {risk.mensaje}
        </div>
        <div style={{ fontSize: "10px", color: "#4A7A8A", lineHeight: "1.6" }}>
          ↳ {risk.recomendacion}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: "9px", color: "#4A7A8A", marginBottom: "6px",
          fontFamily: "'IBM Plex Mono',monospace",
        }}>
          <span>Vida útil consumida: {risk.porcentaje_vida_util}%</span>
          <span>{risk.vida_util_min_anos}–{risk.vida_util_max_anos} años estimados</span>
        </div>
        <div style={{
          height: "12px", background: "rgba(0,245,255,0.05)",
          border: "1px solid rgba(0,245,255,0.1)", borderRadius: "6px",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: `linear-gradient(90deg, #00FF88, ${rc.c})`,
            borderRadius: "6px", transition: "width 0.6s ease",
          }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: "9px", color: "#2a5070", marginTop: "4px",
          fontFamily: "'IBM Plex Mono',monospace",
        }}>
          <span>Instalación</span>
          <span>Sustitución estimada: ~{Math.round(risk.anos_operacion + risk.anos_restantes_estimados)} años</span>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ ...C.g3, marginBottom: "20px" }}>
        <Kpi
          value={risk.anos_operacion.toFixed(1)}
          unit="años"
          label="En operación"
          color="#00d4ff"
        />
        <Kpi
          value={risk.anos_restantes_estimados}
          unit="años est."
          label="Vida restante"
          color={rc.c}
        />
        <Kpi
          value={risk.vida_util_media_anos}
          unit="años"
          label={`Vida útil (${SOIL_OPTIONS.find(s => s.value === risk.tipo_suelo)?.label.split(' / ')[0] || risk.tipo_suelo})`}
          color="#4A9AEA"
        />
      </div>

      {/* Soil note */}
      <div style={{
        padding: "10px 14px", background: "rgba(0,212,255,0.03)",
        border: "1px solid rgba(0,212,255,0.08)", borderRadius: "6px",
        fontSize: "10px", color: "#4A7A8A", lineHeight: "1.6",
      }}>
        Referencia: Crites & Tchobanoglous (1998) · Res. 0330/2017 Art. 143–145 ·
        La vida útil depende de la carga hidráulica, mantenimiento del tanque séptico y
        calidad del efluente (Res. 0631/2015).
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MaintenanceCalculator() {
  const today = todayISO();

  // ── State ──────────────────────────────────────────────────────────────
  const [fechaInstal, setFechaInstal]   = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 2);
    return d.toISOString().slice(0, 10);
  });
  const [intervalo,   setIntervalo]     = useState(3);
  const [usuarios,    setUsuarios]      = useState(4);
  const [volTanque,   setVolTanque]     = useState("");
  const [tipoSuelo,   setTipoSuelo]     = useState("arena_fina");
  const [anosOp,      setAnosOp]        = useState("");
  const [activeTab,   setActiveTab]     = useState("cronograma");
  const [fromCalc,    setFromCalc]      = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CALC_LS_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.users      != null) setUsuarios(d.users);
      if (d.cleanYears != null) setIntervalo(d.cleanYears);
      if (d.vtot       != null) setVolTanque(String(Math.round(d.vtot * 1000)));
      if (d.soilIdx    != null) setTipoSuelo(SOIL_IDX_TO_MAINT[d.soilIdx] ?? "arena_fina");
      setFromCalc(true);
    } catch {}
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────
  const schedule = (() => {
    try {
      return calculatePumpingSchedule({ fecha_instalacion: fechaInstal, intervalo_limpieza_anos: intervalo });
    } catch { return null; }
  })();

  const risk = (() => {
    try {
      return calculateCloggingRisk({
        fecha_instalacion: fechaInstal,
        tipo_suelo: tipoSuelo,
        anos_campo_operacion: anosOp !== "" ? +anosOp : undefined,
      });
    } catch { return null; }
  })();

  const handleSaveInspection = ({ checks, notes, fecha }) => {
    const events = loadEvents();
    const failItems = Object.entries(checks)
      .filter(([, v]) => v === false)
      .map(([id]) => id);
    events.unshift({
      id: Date.now(),
      tipo: "inspeccion",
      fecha,
      contratista: "",
      notas: `Inspección: ${Object.values(checks).filter(v => v === true).length}/${getInspectionChecklist().length} OK. Fallas: [${failItems.join(", ")}]. ${notes}`,
    });
    saveEvents(events);
  };

  const TABS = [
    { id: "cronograma", label: "Cronograma" },
    { id: "checklist",  label: "Checklist" },
    { id: "registro",   label: "Registro" },
    { id: "colmatacion",label: "Colmatación" },
  ];

  // ── Alert accent for header ────────────────────────────────────────────
  const alertColor = schedule ? ALERT_COLORS[schedule.alerta].c : "#00F5FF";

  return (
    <div style={C.root}>
      {/* Header */}
      <div style={C.hdr}>
        <div style={C.logo}>MAINT</div>
        <div>
          <div style={{ fontSize: "10px", color: "#E8F8FF", fontWeight: "700" }}>
            Mantenimiento SITARD
          </div>
          <div style={C.lsub}>Cronograma · Checklist · Registro · Colmatación</div>
        </div>
        {fromCalc && (
          <a href="/calculators/fosa-septica" style={{fontSize:"9px",color:"#4A7A8A",border:"1px solid rgba(0,245,255,0.08)",padding:"4px 9px",borderRadius:"4px",textDecoration:"none",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.06em"}} className="no-print">
            ← Diseño
          </a>
        )}
        {schedule && (
          <div style={{ marginLeft: fromCalc ? "8px" : "auto" }}>
            <AlertBadge level={schedule.alerta} />
          </div>
        )}
      </div>

      <div style={C.layout}>
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <div style={C.side}>
          <div style={C.sideInner}>
            <div style={C.slab}>Sistema</div>

            <div style={{ ...C.ig, marginBottom: "6px" }}>
              <label style={C.lbl}>Fecha de instalación</label>
              <input style={C.inp} className="hs-inp" type="date"
                value={fechaInstal} max={today}
                onChange={e => setFechaInstal(e.target.value)} />
            </div>

            <div style={{ ...C.ig, marginBottom: "6px" }}>
              <label style={C.lbl}>Intervalo limpieza (años)</label>
              <input style={C.inp} className="hs-inp" type="number"
                min={1} max={5} step={1} value={intervalo}
                onChange={e => setIntervalo(+e.target.value)} />
              <span style={C.inote}>Res. 0330/2017 Art. 139 — típico: 3 años</span>
            </div>

            <div style={{ ...C.ig, marginBottom: "6px" }}>
              <label style={C.lbl}>Usuarios permanentes</label>
              <input style={C.inp} className="hs-inp" type="number"
                min={1} max={50} step={1} value={usuarios}
                onChange={e => setUsuarios(+e.target.value)} />
            </div>

            <div style={{ ...C.ig, marginBottom: "6px" }}>
              <label style={C.lbl}>Volumen del tanque (L) <span style={{ color: "#1e4060" }}>opt.</span></label>
              <input style={C.inp} className="hs-inp" type="number"
                min={500} step={100} value={volTanque} placeholder="ej. 2500"
                onChange={e => setVolTanque(e.target.value)} />
            </div>

            <div style={C.slab}>Campo de infiltración</div>

            <div style={{ ...C.ig, marginBottom: "6px" }}>
              <label style={C.lbl}>Tipo de suelo</label>
              <select style={C.sel} value={tipoSuelo}
                onChange={e => setTipoSuelo(e.target.value)}>
                {SOIL_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label} ({s.vida})</option>
                ))}
              </select>
            </div>

            <div style={{ ...C.ig, marginBottom: "6px" }}>
              <label style={C.lbl}>Años en operación campo <span style={{ color: "#1e4060" }}>opt.</span></label>
              <input style={C.inp} className="hs-inp" type="number"
                min={0} max={50} step={0.5} value={anosOp} placeholder="Auto desde instalación"
                onChange={e => setAnosOp(e.target.value)} />
              <span style={C.inote}>
                {risk ? `${risk.porcentaje_vida_util}% vida útil consumida` : "Calculado desde fecha instalación"}
              </span>
            </div>

            {/* Quick summary */}
            {schedule && (
              <>
                <div style={C.slab}>Resumen</div>
                <div style={{
                  padding: "10px 12px",
                  background: `rgba(${ALERT_COLORS[schedule.alerta].rgb},0.05)`,
                  border: `1px solid rgba(${ALERT_COLORS[schedule.alerta].rgb},0.15)`,
                  borderRadius: "6px", fontSize: "10px", lineHeight: "1.7",
                  color: "#a0c8d8",
                }}>
                  <div>
                    <span style={{ color: "#4A7A8A" }}>Próximo vaciado: </span>
                    <span style={{ color: ALERT_COLORS[schedule.alerta].c, fontWeight: "700" }}>
                      {schedule.proximo_vaciado?.fecha_display || "—"}
                    </span>
                  </div>
                  {risk && (
                    <div>
                      <span style={{ color: "#4A7A8A" }}>Campo: </span>
                      <span style={{ color: RISK_COLORS[risk.riesgo].c, fontWeight: "600" }}>
                        {risk.riesgo.toUpperCase()} ({risk.porcentaje_vida_util}%)
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Main panel ──────────────────────────────────────────────── */}
        <div style={C.main}>
          {/* Tab bar */}
          <div style={C.tabBar}>
            {TABS.map(t => (
              <button key={t.id} style={C.tabBtn(activeTab === t.id)}
                onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={C.content}>
            {activeTab === "cronograma"  && <TabSchedule schedule={schedule} fs={intervalo} />}
            {activeTab === "checklist"   && <TabChecklist onSaveInspection={handleSaveInspection} />}
            {activeTab === "registro"    && <TabRegistry />}
            {activeTab === "colmatacion" && <TabClogging risk={risk} />}
          </div>
        </div>
      </div>
    </div>
  );
}
