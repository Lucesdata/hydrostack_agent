"use client";
import { useState, useEffect } from "react";
import { DEPARTMENTS } from "@/src/lib/geo/colombia";
import { C } from "@/src/components/calculator/calculatorStyles";

const TENURE_OPTIONS = [
  { value: "propio",      label: "Propio / Propietario" },
  { value: "arrendamiento", label: "Arrendamiento" },
  { value: "comodato",    label: "Comodato / Préstamo de uso" },
  { value: "posesion",    label: "Posesión" },
  { value: "otro",        label: "Otro" },
];

const ZONING_OPTIONS = [
  { value: "rural",      label: "Rural" },
  { value: "suburbano",  label: "Suburbano" },
  { value: "expansion",  label: "Suelo de expansión" },
  { value: "urbano",     label: "Urbano" },
  { value: "protegido",  label: "Protección ambiental" },
];

const S = {
  section: {
    background: "rgba(255,255,255,0.02)", border: "1px solid #1a4060",
    borderRadius: "8px", padding: "14px 16px", marginBottom: "12px",
  },
  sectionTitle: {
    fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase",
    color: "#4a7fa5", fontFamily: "'IBM Plex Mono',monospace", marginBottom: "12px",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" },
  grid1: { display: "grid", gridTemplateColumns: "1fr", gap: "8px" },
  ig: { display: "flex", flexDirection: "column", gap: "3px" },
  lbl: { fontSize: "9px", color: "#4a7fa5", letterSpacing: "0.04em", textTransform: "uppercase" },
  inp: {
    background: "#041820", border: "1px solid #1a4060", borderRadius: "4px",
    color: "#e2f0f7", fontSize: "11px", padding: "7px 9px",
    fontFamily: "'IBM Plex Sans',system-ui,sans-serif", outline: "none",
    width: "100%", boxSizing: "border-box",
  },
  sel: {
    background: "#041820", border: "1px solid #1a4060", borderRadius: "4px",
    color: "#e2f0f7", fontSize: "11px", padding: "7px 9px",
    fontFamily: "'IBM Plex Sans',system-ui,sans-serif", outline: "none",
    width: "100%",
  },
  note: { fontSize: "9px", color: "#2a6080", marginTop: "1px" },
};

export default function PropertyDataForm({ value = {}, onChange }) {
  const [dept,     setDept]     = useState(value.dept     ?? "");
  const [mun,      setMun]      = useState(value.mun      ?? "");
  const [vereda,   setVereda]   = useState(value.vereda   ?? "");
  const [direccion,setDireccion]= useState(value.direccion ?? "");
  const [cedula,   setCedula]   = useState(value.cedula   ?? "");
  const [matricula,setMatricula]= useState(value.matricula ?? "");
  const [areaPredio,setAreaPredio]= useState(value.areaPredio ?? "");
  const [tenencia, setTenencia] = useState(value.tenencia ?? "propio");
  const [zoning,   setZoning]   = useState(value.zoning   ?? "rural");

  const municipalities = dept
    ? (DEPARTMENTS.find(d => d.id === dept)?.municipalities ?? [])
    : [];

  // Reset municipio when dept changes
  const handleDept = (v) => {
    setDept(v); setMun("");
    emit({ dept: v, mun: "", vereda, direccion, cedula, matricula, areaPredio, tenencia, zoning });
  };

  const emit = (patch = {}) => {
    onChange?.({
      dept, mun, vereda, direccion, cedula, matricula, areaPredio, tenencia, zoning,
      ...patch,
    });
  };

  // Emit on any change
  useEffect(() => {
    emit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept, mun, vereda, direccion, cedula, matricula, areaPredio, tenencia, zoning]);

  const bind = (set, key) => (e) => {
    set(e.target.value);
  };

  return (
    <div>
      {/* Administrative location */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Ubicación administrativa</div>
        <div style={{ ...S.grid2, marginBottom: "8px" }}>
          <div style={S.ig}>
            <label style={S.lbl}>Departamento</label>
            <select style={S.sel} value={dept} onChange={e => handleDept(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div style={S.ig}>
            <label style={S.lbl}>Municipio</label>
            <select style={S.sel} value={mun} onChange={e => { setMun(e.target.value); emit({ mun: e.target.value }); }} disabled={!dept}>
              <option value="">— Seleccionar —</option>
              {municipalities.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={S.grid1}>
          <div style={S.ig}>
            <label style={S.lbl}>Vereda / Corregimiento / Sector</label>
            <input style={S.inp} type="text" placeholder="Ej. Vereda El Rosal, Corregimiento Pasquilla..."
              value={vereda} onChange={bind(setVereda, "vereda")} onBlur={() => emit({ vereda })} />
          </div>
          <div style={S.ig}>
            <label style={S.lbl}>Dirección rural / Nomenclatura</label>
            <input style={S.inp} type="text" placeholder="Ej. Km 4 vía Bogotá-La Calera, Finca El Pinar..."
              value={direccion} onChange={bind(setDireccion, "direccion")} onBlur={() => emit({ direccion })} />
          </div>
        </div>
      </div>

      {/* Cadastral data */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Datos catastrales</div>
        <div style={S.grid2}>
          <div style={S.ig}>
            <label style={S.lbl}>Cédula catastral</label>
            <input style={S.inp} type="text" placeholder="Ej. 25754000000000010013"
              value={cedula} onChange={bind(setCedula, "cedula")} onBlur={() => emit({ cedula })} />
            <span style={S.note}>IGAC — 20 dígitos</span>
          </div>
          <div style={S.ig}>
            <label style={S.lbl}>Matrícula inmobiliaria</label>
            <input style={S.inp} type="text" placeholder="Ej. 50N-123456"
              value={matricula} onChange={bind(setMatricula, "matricula")} onBlur={() => emit({ matricula })} />
            <span style={S.note}>ORIP — formato OFICINA-NÚMERO</span>
          </div>
          <div style={S.ig}>
            <label style={S.lbl}>Área del predio (m²)</label>
            <input style={S.inp} type="number" min={0} step={1} placeholder="Ej. 5000"
              value={areaPredio} onChange={bind(setAreaPredio, "areaPredio")} onBlur={() => emit({ areaPredio })} />
          </div>
          <div style={S.ig}>
            <label style={S.lbl}>Tipo de tenencia</label>
            <select style={S.sel} value={tenencia} onChange={e => { setTenencia(e.target.value); emit({ tenencia: e.target.value }); }}>
              {TENURE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* POT zoning */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Régimen del POT</div>
        <div style={S.ig}>
          <label style={S.lbl}>Clasificación del suelo según POT municipal</label>
          <select style={S.sel} value={zoning} onChange={e => { setZoning(e.target.value); emit({ zoning: e.target.value }); }}>
            {ZONING_OPTIONS.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
          </select>
          <span style={S.note}>
            Consultar el Acuerdo Municipal del POT · Res. 0330/2017 Art. 134 define suelos aptos para SITARD
          </span>
        </div>
      </div>
    </div>
  );
}
