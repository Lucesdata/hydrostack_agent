"use client";
import { useState, useEffect } from "react";
import LaminaTecnica from "./LaminaTecnica";
import IsometricDiagram3D from "./IsometricDiagram3D";
import { saveFormState } from "@/src/lib/state/clientStore";
import { NORMS, getParams, USE_TYPES, SOILS, EDU, computeNorm, fmt, fmtI } from "./calculator/calculatorData";
import { DetailedSchematic, HydraulicProfile } from "./calculator/CalculatorSchematics";
import { C } from "./calculator/calculatorStyles";

const GEO_LS_KEY  = "hs_geo_data";
const CALC_LS_KEY = "hs_calc_data";

export default function HydroStack() {
  const [norm,       setNorm]       = useState("epa");
  const [useType,    setUseType]    = useState("dom");
  const [users,      setUsers]      = useState(4);
  const [dotacion,   setDotacion]   = useState(75);
  const [retCoef,    setRetCoef]    = useState(0.85);
  const [cleanYears, setCleanYears] = useState(3);
  const [depth,      setDepth]      = useState(1.2);
  const [freeboard,  setFreeboard]  = useState(0.30);
  const [temp,       setTemp]       = useState(20);
  const [dboIn,      setDboIn]      = useState(250);
  const [ssIn,       setSsIn]       = useState(280);
  const [soilIdx,    setSoilIdx]    = useState(2);
  const [percT,      setPercT]      = useState(5);

  // ── Fase 6: Geo data loaded from localStorage ──
  const [geoData,    setGeoData]    = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GEO_LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setGeoData(parsed);
      // Auto-fill temperature from climate data
      if (parsed?.climate?.temp_media_c != null) {
        setTemp(Math.round(parsed.climate.temp_media_c));
      }
      // Auto-fill ETP from climate data
      if (parsed?.climate?.etp_media_mm_dia != null) {
        setEtp(parsed.climate.etp_media_mm_dia);
      }
      // Auto-fill project location from geo address
      if (parsed?.location?.address) {
        setLocation(parsed.location.address.slice(0, 80));
      }
    } catch (_) { /* ignore corrupt localStorage */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ── Fase 3: Drainage field improvements ──
  const [percMode,   setPercMode]   = useState("min_cm"); // "min_cm" | "25mm"
  const [percT25,    setPercT25]    = useState(12.5); // 25mm descent time (min)
  const [fs,         setFs]         = useState(1.20); // safety factor
  const [etp,        setEtp]        = useState(0);    // evapotranspiration (mm/day)
  const [drainSys,   setDrainSys]   = useState("auto"); // system type selector
  const [res,        setRes]        = useState(null);
  const [eduMode,    setEduMode]    = useState(false);
  const [showComp,   setShowComp]   = useState(false);
  const [compRes,    setCompRes]    = useState(null);
  const [activeTab,  setActiveTab]  = useState("resumen");
  const [projectName, setProjectName] = useState("");
  const [location,    setLocation]    = useState("");
  const [designer,    setDesigner]    = useState("");

  // ── Geospatial / site conditions (Phase 2) ──
  const [distPozos,      setDistPozos]      = useState("");
  const [distCuerpoAgua, setDistCuerpoAgua] = useState("");
  const [distEdific,     setDistEdific]     = useState("");
  const [distArboles,    setDistArboles]    = useState("");
  const [aguasAbajo,     setAguasAbajo]     = useState("");
  const [nivelFreatico,  setNivelFreatico]  = useState("");
  const [profInstal,     setProfInstal]     = useState(0.75);
  const [geoRes,         setGeoRes]         = useState(null);

  const n    = NORMS[norm];
  const soil = SOILS[soilIdx];
  const isManual = soil.label.startsWith("Manual");

  const applyUseType = (key) => {
    const u=USE_TYPES[key]; setUseType(key);
    setDotacion(u.dotacion); setDboIn(u.dboIn); setSsIn(u.ssIn);
    setRes(null); setCompRes(null);
  };

  const handleNorm = (k) => { setNorm(k); setRes(null); setCompRes(null); };

  const runCalc = () => {
    const p   = getParams(norm, temp);
    const Qd  = users*dotacion*retCoef/1000;
    const Qs  = Qd/86400;
    const Vl  = Qd*p.trhDays;
    const Vs  = users*p.sludgeRate*cleanYears/1000;
    const Vn  = p.scumFactor*Vl;
    let Vtot  = Vl+Vs+Vn; const minA=Vtot<p.minVolume; if(minA)Vtot=p.minVolume;
    const Area=Vtot/depth, W=Math.sqrt(Area/2), L=2*W, hT=depth+freeboard;
    const dPipe=Math.max(Math.sqrt((4*Qs)/(Math.PI*0.75)),0.10);
    const dVent=Vtot<5?0.075:0.100;
    const qS=Qd/Area;
    const Corg=Qd*dboIn/1000, CVO=Corg/Vtot;
    const Gs=users*p.sludgeRate/365/1000, SRT=Gs>0?Vs/Gs:0;
    const dboR=Math.min(0.10+0.14*p.trhDays+0.004*Math.max(temp-10,0),0.50);
    const ssR =Math.min(0.30+0.14*p.trhDays+0.003*Math.max(temp-10,0),0.70);
    // ── Fase 3: Drainage field — improved ─────────────────────────────────────
    // Perc test: either min/cm or 25mm-descent (ASTM D6391)
    const t_perc = isManual ? (percMode==="25mm" ? percT25/2.5 : percT) : (soil.T ?? 99);
    const q_inf_bruto = isManual
      ? Math.min(70/Math.sqrt(Math.max(t_perc,0.1)),80)
      : (soil.q ?? 0);
    const soilOk = isManual ? t_perc<=30 : soil.ok;
    // ETP correction (up to 20%): reduces effective Ka
    const q_inf_eff = (etp>0 && q_inf_bruto>0)
      ? q_inf_bruto * (1 - Math.min(etp/q_inf_bruto, 0.20))
      : q_inf_bruto;
    // System-type Ka multiplier
    const drainSysKey = drainSys==="auto" ? "zanjas_filtrantes" : drainSys;
    const drainKaMult = drainSysKey==="camara_infiltracion" ? 1.5
                      : drainSysKey==="campo_aspersion" ? 2.0 : 1.0;
    const q_inf = q_inf_eff * drainKaMult;
    // Area: net (before FS) and design (after FS)
    const A_net = soilOk&&q_inf>0 ? (Qd*1000)/q_inf : null;
    const A_inf = A_net ? A_net*fs : null;
    // Trench dimensions (zanjas / montículo / cámara share same logic)
    const ancho_z = drainSysKey==="camara_infiltracion" ? 0.9 : 0.6;
    const L_zanjas = A_inf ? A_inf/ancho_z : null;
    const n_zanjas = L_zanjas ? Math.ceil(L_zanjas/30) : null;
    const L_por_zanja = (n_zanjas&&L_zanjas) ? L_zanjas/n_zanjas : null;
    const chambers=users>50||Vtot>10?3:users>5||Vtot>2?2:1;
    const V1=chambers===3?Vtot*0.5:chambers===2?Vtot*2/3:Vtot;
    const V2=chambers===3?Vtot*0.25:chambers===2?Vtot*1/3:0;
    const V3=chambers===3?Vtot*0.25:0;

    // ── Hydraulic design ──────────────────────────────────────────────────────
    // Kinematic viscosity of water per temperature (Vogel approx.) m²/s
    const nu = 1.792e-6 / (1 + 0.03368*temp + 0.000221*temp*temp);

    // Cross-sectional flow area (liquid zone): W × hLiq
    const hLiq_m = Vl / Area;                        // liquid zone height (m)
    const Aflow  = W * hLiq_m;                        // m²

    // Average horizontal flow velocity
    const Vflow  = Qs / Aflow;                        // m/s
    const chkVflow = Vflow <= 0.005;                  // criterion: v < 5 mm/s

    // Hydraulic Reynolds number (Dh = 4A/P, rectangular section)
    const Dh = (4 * Aflow) / (2*(W + hLiq_m));
    const Re = Vflow * Dh / nu;
    const chkRe = Re < 500;                           // laminar criterion

    // Froude number (Fr = v / sqrt(g·h))
    const g  = 9.81;
    const Fr = Vflow / Math.sqrt(g * hLiq_m);
    const chkFr = Fr < 0.1;                          // criterion: Fr << 1 (deep subcritical)

    // Head loss — component-based methodology (Manning + local losses)
    // 1. Loss in inlet pipe (Darcy-Weisbach, f≈0.02 assumed PVC L=0.5m)
    const vPipe = Qs / (Math.PI * dPipe*dPipe / 4);  // pipe flow velocity
    const hf_entrada = 0.02 * (0.5 / dPipe) * (vPipe*vPipe / (2*g));

    // 2. Loss entering tank (coefficient K=0.5, abrupt contraction)
    const hf_contraccion = 0.5 * vPipe*vPipe / (2*g);

    // 3. Loss through tank flow (Manning, n=0.013, hydraulic Dh)
    const n_mann = 0.013;
    const Sf = Math.pow(vPipe * Math.pow(Dh, -2/3) * n_mann, 2);
    const hf_fosa = Sf * L;

    // 4. Loss at internal baffles (K=0.3 per baffle, under-baffle flow)
    const hf_tabiques = (chambers - 1) * 0.3 * vPipe*vPipe / (2*g);

    // 5. Loss at outlet (K=1.0, abrupt expansion)
    const hf_salida = 1.0 * vPipe*vPipe / (2*g);

    const hf_total = hf_entrada + hf_contraccion + hf_fosa + hf_tabiques + hf_salida;
    const hf_cm    = hf_total * 100; // en centímetros

    // Settling velocity (Stokes) — reference particle TSS 50µm, ρ=1050 kg/m³
    const dp   = 50e-6;           // m, typical TSS particle diameter
    const rhoP = 1050;            // kg/m³
    const rhoW = 1000 - 0.003*Math.max(temp-4,0);  // approx. water density
    const vs   = (g * Math.pow(dp,2) * (rhoP-rhoW)) / (18 * nu * rhoW); // m/s
    const chkSed = vs > Vflow;    // particle must settle faster than rise

    // TSS removal efficiency by sedimentation (Camp, 1946)
    const vsc  = Qs / Area;       // overflow velocity (m/s → m/day above)
    const vs_mday = vs * 86400;   // convert to m/day
    const remSS_camp = Math.min(vs_mday / (Qd / Area) * 100, 99); // %

    return {Qd,Qs,Vl,Vs,Vn,Vtot,V1,V2,V3,chambers,L,W,depth,hT,Area,dPipe,dVent,
      chkD:depth>=p.minDepth,chkW:W>=p.minWidth,chkL:L>=p.minLength,chkS:qS<=1.5,qS,
      Corg,CVO,chkCVO:CVO<=0.30,SRT,chkSRT:SRT>=20,Gs_day:Gs,
      dboR,ssR,dboOut:dboIn*(1-dboR),ssOut:ssIn*(1-ssR),
      soilOk,q_inf,q_inf_bruto,q_inf_eff,A_net,A_inf,
      L_zanjas,n_zanjas,L_por_zanja,ancho_z,
      etp_applied:etp>0,t_perc,drainSysKey,minA,p,
      // hidráulica
      nu,Aflow,Vflow,chkVflow,Dh,Re,chkRe,Fr,chkFr,hLiq_m,
      hf_entrada,hf_contraccion,hf_fosa,hf_tabiques,hf_salida,hf_total,hf_cm,
      vPipe,vs,vs_mday,chkSed,remSS_camp};
  };

  // ── Geospatial validation — mirrors geospatialValidator.ts logic (client-side) ──
  const runGeoCalc = () => {
    const hasAny = distPozos !== "" || distCuerpoAgua !== "" || distEdific !== "" ||
                   distArboles !== "" || aguasAbajo !== "" || nivelFreatico !== "";
    if (!hasAny) return null;

    const checks = [];
    let nBloq = 0, nAlert = 0, sugAlt = false;

    const mkCheck = (param, v, min, norma, estado, msg, sugerencia) => {
      if (estado === "BLOQUEANTE") nBloq++;
      else if (estado === "ALERTA") nAlert++;
      checks.push({ param, v, min, norma, estado, msg, sugerencia });
    };

    if (distPozos !== "") {
      const val = +distPozos;
      mkCheck("Dist. a pozos de abastecimiento", `${val} m`, "30 m", "Res. 0330/2017 Art. 143",
        val >= 30 ? "OK" : val >= 21 ? "ALERTA" : "BLOQUEANTE",
        val >= 30 ? `Distancia a pozos (${val} m) cumple el mínimo (30 m).`
                  : val >= 21 ? `Distancia a pozos (${val} m) inferior al mínimo (30 m). Riesgo moderado de contaminación.`
                               : `Distancia a pozos (${val} m) muy inferior al mínimo (30 m). Riesgo grave de contaminación de captación.`,
        val < 30 ? "Reubicar el campo de infiltración aguas abajo y lejos del pozo. Si no es posible, considerar tratamiento terciario." : null);
    }

    if (distCuerpoAgua !== "") {
      const val = +distCuerpoAgua;
      mkCheck("Dist. a cuerpos de agua / ronda hídrica", `${val} m`, "30 m", "Res. 0330/2017 Art. 144",
        val >= 30 ? "OK" : "BLOQUEANTE",
        val >= 30 ? `Distancia a cuerpo de agua (${val} m) cumple el mínimo (30 m).`
                  : `Distancia a cuerpo de agua/ronda hídrica (${val} m) inferior al mínimo (30 m). Posible afectación del recurso hídrico.`,
        val < 30 ? "Verificar con SDA/CAR la ronda de protección hídrica (Decreto 2245/2017). Puede requerirse tecnología de descarga cero." : null);
    }

    if (distEdific !== "") {
      const val = +distEdific;
      mkCheck("Dist. a edificaciones y linderos", `${val} m`, "5 m", "Res. 0330/2017 Art. 143",
        val >= 5 ? "OK" : "BLOQUEANTE",
        val >= 5 ? `Distancia a edificaciones (${val} m) cumple el mínimo (5 m).`
                 : `Distancia a edificaciones/linderos (${val} m) inferior al mínimo (5 m). Riesgo de daño estructural.`,
        val < 5 ? "Reubicar el sistema. Si el predio es pequeño, evaluar tanque compacto + sistema alternativo." : null);
    }

    if (distArboles !== "") {
      const val = +distArboles;
      mkCheck("Dist. a árboles de raíz profunda", `${val} m`, "3 m", "Res. 0330/2017 Art. 143",
        val >= 3 ? "OK" : val >= 1.5 ? "ALERTA" : "BLOQUEANTE",
        val >= 3 ? `Distancia a árboles (${val} m) cumple el mínimo (3 m).`
                 : val >= 1.5 ? `Distancia a árboles (${val} m) inferior al mínimo (3 m). Riesgo de intrusión de raíces.`
                              : `Distancia a árboles (${val} m) muy inferior al mínimo (3 m). Alta probabilidad de obstrucción.`,
        val < 3 ? "Instalar barrera de raíces (geomembrana HDPE a 60 cm) entre árbol y tuberías, o reubicar." : null);
    }

    if (aguasAbajo !== "") {
      const ok = aguasAbajo === "si";
      if (!ok) nBloq++;
      checks.push({ param:"Posición respecto a captaciones de agua", v: ok ? "Aguas abajo ✓" : "Aguas arriba / no verificado",
        min:"Siempre aguas abajo", norma:"Res. 0330/2017 Art. 144",
        estado: ok ? "OK" : "BLOQUEANTE",
        msg: ok ? "El sistema está aguas abajo de todas las captaciones. Correcto."
                : "BLOQUEANTE: sistema puede estar aguas arriba de captaciones. Los efluentes pueden contaminar fuentes de abastecimiento.",
        sugerencia: !ok ? "Reubicar el sistema para que quede siempre aguas abajo del punto de captación más próximo." : null });
    }

    if (nivelFreatico !== "") {
      const nf = +nivelFreatico, prof = profInstal || 0.75;
      const libre = nf - prof;
      const estado = libre >= 1.20 ? "OK" : libre >= 0.5 ? "ALERTA" : "BLOQUEANTE";
      if (estado !== "OK") sugAlt = true;
      mkCheck("Nivel freático — distancia libre sobre N.F.",
        `N.F.=${nf} m; inst.=${prof} m → libre: ${libre.toFixed(2)} m`, "1.20 m libres", "Res. 0330/2017 Art. 144",
        estado,
        estado === "OK"
          ? `Distancia libre fondo de zanja — N.F.: ${libre.toFixed(2)} m ≥ 1.20 m. Cumple Art. 144.`
          : estado === "ALERTA"
            ? `Distancia libre (${libre.toFixed(2)} m) insuficiente (mín. 1.20 m). El sistema puede saturarse en temporada húmeda.`
            : `Distancia libre (${libre.toFixed(2)} m) muy inferior al mínimo. Sistema estándar inviable — riesgo de mezcla con agua subterránea.`,
        estado !== "OK" ? `N.F. alto (${nf} m). Considerar tecnología alternativa (ver sección de alternativas abajo).` : null);
    }

    return { checks, bloqueantes: nBloq, alertas: nAlert, cumple: nBloq === 0, sugAlt };
  };

  const calculate = () => {
    const r=runCalc(); setRes(r);
    const geo=runGeoCalc(); setGeoRes(geo);
    // Save FormState to localStorage for chat integration
    const formState = {
      users, dotacion, retCoef, temp, depth, freeboard, cleanYears, dboIn, ssIn,
      soilType: soilIdx === SOILS.length - 1 ? "manual" : undefined,
      soilPermeability: (() => {
        if (soilIdx === SOILS.length - 1) return undefined; // manual
        if (soilIdx <= 1) return "high";
        if (soilIdx <= 3) return "medium";
        if (soilIdx <= 5) return "low";
        return "none";
      })(),
      normKey: norm,
      calculated: true,
      // Geospatial / site conditions
      ...(distPozos      !== "" && { distPozos:      +distPozos      }),
      ...(distCuerpoAgua !== "" && { distCuerpoAgua: +distCuerpoAgua }),
      ...(distEdific     !== "" && { distEdific:     +distEdific     }),
      ...(distArboles    !== "" && { distArboles:    +distArboles    }),
      ...(aguasAbajo     !== "" && { aguasAbajo                      }),
      ...(nivelFreatico  !== "" && { nivelFreatico:  +nivelFreatico, profInstal }),
      ...(geo            !== null && {
        geoChecked:    true,
        geoBloqueantes: geo.bloqueantes,
        geoAlertas:    geo.alertas,
      }),
    };
    saveFormState(formState);
    try { localStorage.setItem(CALC_LS_KEY, JSON.stringify({ users, cleanYears, soilIdx, vtot: r.Vtot })); } catch {}
    if (showComp) {
      const cr={};
      Object.keys(NORMS).forEach(k=>{cr[k]=computeNorm(k,users,dotacion,retCoef,temp,cleanYears,depth);});
      setCompRes(cr);
    }
  };

  const handleCompare = () => {
    const next=!showComp; setShowComp(next);
    if (next&&res) {
      const cr={};
      Object.keys(NORMS).forEach(k=>{cr[k]=computeNorm(k,users,dotacion,retCoef,temp,cleanYears,depth);});
      setCompRes(cr);
    }
  };

  const EduNote = ({text}) => eduMode ? <div style={C.eduBox}>💡 {text}</div> : null;

  const geoColor = (estado) => {
    if (estado === "OK")         return { c:"#00FF88", rgb:"0,255,136" };
    if (estado === "ALERTA")     return { c:"#FFB020", rgb:"255,176,32" };
    /* BLOQUEANTE */             return { c:"#FF5050", rgb:"255,80,80"  };
  };

  const GeoCheckRow = ({ check }) => {
    const sc = geoColor(check.estado);
    return (
      <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", padding:"10px 14px", marginBottom:"6px",
        background:`rgba(${sc.rgb},0.04)`, border:`1px solid rgba(${sc.rgb},0.15)`,
        borderLeft:`3px solid ${sc.c}`, borderRadius:"6px" }}>
        <span style={{ fontSize:"10px", color:sc.c, fontWeight:"700", minWidth:"76px", flexShrink:0, paddingTop:"2px", letterSpacing:"0.04em" }}>
          {check.estado === "OK" ? "✓ OK" : check.estado === "ALERTA" ? "⚠ ALERTA" : "✗ BLOQUEANTE"}
        </span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"11px", color:"#E8F8FF", fontWeight:"600", marginBottom:"3px" }}>{check.param}</div>
          <div style={{ fontSize:"10px", color:"#4A7A8A", marginBottom:"4px", fontFamily:"'IBM Plex Mono',monospace" }}>
            {check.v} · Mín: {check.min}
          </div>
          <div style={{ fontSize:"10px", color:"#a0c8d8", lineHeight:"1.55" }}>{check.msg}</div>
          {check.sugerencia && (
            <div style={{ fontSize:"10px", color:sc.c, marginTop:"5px", lineHeight:"1.55", opacity:0.9 }}>
              → {check.sugerencia}
            </div>
          )}
          <div style={{ fontSize:"9px", color:"#3a6080", marginTop:"5px", letterSpacing:"0.06em" }}>{check.norma}</div>
        </div>
      </div>
    );
  };

  const TABS = [
    {id:"resumen",        label:"Summary"},
    {id:"corte",          label:"Longitudinal Section"},
    {id:"hidraulica",     label:"Hydraulics"},
    {id:"verificaciones", label:"Code Checks"},
    ...(geoRes ? [{
      id:"sitechecks",
      label: geoRes.bloqueantes > 0 ? `⚠ Site Checks (${geoRes.bloqueantes} bloq.)` : geoRes.alertas > 0 ? `Site Checks (${geoRes.alertas} alert.)` : "Site Checks ✓",
    }] : []),
    ...(showComp && compRes ? [{id:"comparativa", label:"Comparison"}] : []),
    {id:"diagrama3d",     label:"3D Diagram"},
    {id:"lamina",         label:"Technical Sheet"},
  ];

  return (
    <div style={C.root}>
      {/* ── Header ── */}
      <div style={C.hdr}>
        <div>
          <div style={C.logo}>HydroStack</div>
          <div style={C.lsub}>Water &amp; Sanitation Engineering</div>
        </div>
        <div style={C.badge}>Fosa Séptica · v6.0</div>
        {/* Geo badge */}
        {geoData ? (
          <a href="/calculators/geo" style={{fontSize:"9px",color:"#00FF88",border:"1px solid rgba(0,255,136,0.25)",padding:"4px 9px",borderRadius:"4px",textDecoration:"none",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.06em"}}>
            📍 {geoData.propData?.dept ? `${geoData.propData.dept} · ${geoData.climate?.temp_media_c ?? "?"}°C` : "Predio ubicado"} ✓
          </a>
        ) : (
          <a href="/calculators/geo" style={{fontSize:"9px",color:"#2a5070",border:"1px solid rgba(0,245,255,0.08)",padding:"4px 9px",borderRadius:"4px",textDecoration:"none",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.06em"}} className="no-print">
            📍 Ubicar predio
          </a>
        )}
        {res && (
          <a href="/calculators/mantenimiento" style={{fontSize:"9px",color:"#00F5FF",border:"1px solid rgba(0,245,255,0.2)",padding:"4px 9px",borderRadius:"4px",textDecoration:"none",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.06em"}} className="no-print">
            🔧 Mantenimiento →
          </a>
        )}
        {res && (
          <button style={{...C.pBtn,marginLeft:"auto"}} className="hs-pBtn no-print btn-cta"
            onClick={()=>window.print()}>
            🖨 Exportar
          </button>
        )}
      </div>

      {/* ── Layout ── */}
      <div style={C.layout}>

        {/* ── Sidebar ── */}
        <div style={C.side} className="hs-side">
          <div style={C.sideInner}>

            <div style={C.slab}>Tipo de uso</div>
            <div style={C.utg}>
              {Object.entries(USE_TYPES).map(([k,v])=>(
                <button key={k} style={C.utb(useType===k)} className="hs-ubt" onClick={()=>applyUseType(k)}>
                  <div style={{fontSize:"13px",marginBottom:"1px"}}>{v.icon}</div>
                  <div style={{fontSize:"8px",fontWeight:"600"}}>{v.label}</div>
                </button>
              ))}
            </div>

            <div style={C.slab}>Standards</div>
            <div style={C.ngn}>
              {Object.entries(NORMS).map(([k,v])=>(
                <button key={k} style={C.nbn(norm===k)} className="hs-nbt" onClick={()=>handleNorm(k)}>
                  <span style={{fontSize:"13px",display:"block",marginBottom:"1px"}}>{v.flag}</span>
                  <div style={{fontSize:"9px",fontWeight:"600"}}>{v.name}</div>
                </button>
              ))}
            </div>

            <div style={C.slab}>Parameters</div>
            <div style={{...C.g2,gap:"8px"}}>
              {[
                {lbl:"Occupants (persons)", val:users,      set:setUsers,      min:1,   step:1},
                {lbl:norm==="epa"?"Design Flow (GPD/bed)":"Daily Allowance (L/person/d)", val:dotacion,   set:setDotacion,   min:10,  step:5},
                {lbl:"Return Coefficient",  val:retCoef,    set:setRetCoef,    min:0.5, step:0.01},
                {lbl:"Temperature (°C)",    val:temp,       set:setTemp,       min:-5,  step:1},
                {lbl:"Depth - Useful (m)",  val:depth,      set:setDepth,      min:0.8, step:0.1},
                {lbl:"Freeboard (m)",       val:freeboard,  set:setFreeboard,  min:0.1, step:0.05},
                {lbl:"Pumping Interval (years)", val:cleanYears, set:setCleanYears, min:1,   step:1},
                {lbl:"BOD₅ Inlet",          val:dboIn,      set:setDboIn,      min:50,  step:10},
                {lbl:"TSS Inlet",           val:ssIn,       set:setSsIn,       min:50,  step:10},
              ].map((f,i)=>(
                <div key={i} style={C.ig}>
                  <label style={C.lbl}>{f.lbl}</label>
                  <input style={C.inp} className="hs-inp" type="number" min={f.min} step={f.step} value={f.val}
                    onChange={e=>{f.set(+e.target.value);setRes(null);setCompRes(null);}}/>
                </div>
              ))}
            </div>

            <div style={C.slab}>Soil — Infiltration</div>
            <div style={C.ig}>
              <select style={C.sel} className="hs-sel" value={soilIdx} onChange={e=>{setSoilIdx(+e.target.value);setRes(null);}}>
                {SOILS.map((s,i)=><option key={i} value={i}>{s.label}</option>)}
              </select>
              <span style={C.inote}>{isManual?"Enter time →":soil.ok?`q = ${soil.q} L/m²·day`:"Soil unsuitable"}</span>
            </div>
            {isManual&&(
              <div style={{marginTop:"8px"}}>
                {/* Mode toggle */}
                <div style={{display:"flex",gap:"4px",marginBottom:"6px"}}>
                  {[{k:"min_cm",l:"min/cm"},{k:"25mm",l:"25 mm (ASTM)"}].map(m=>(
                    <button key={m.k} onClick={()=>{setPercMode(m.k);setRes(null);}}
                      style={{fontSize:"9px",padding:"3px 8px",border:"1px solid",borderRadius:"3px",cursor:"pointer",
                        background:percMode===m.k?"rgba(0,245,255,0.12)":"transparent",
                        borderColor:percMode===m.k?"#00F5FF":"#1a4060",color:percMode===m.k?"#00F5FF":"#2a6080",
                        fontFamily:"'IBM Plex Mono',monospace"}}>
                      {m.l}
                    </button>
                  ))}
                </div>
                {percMode==="min_cm"?(
                  <div style={C.ig}>
                    <label style={C.lbl}>Perc. Time (min/cm)</label>
                    <input style={C.inp} type="number" min={0.1} step={0.5} value={percT}
                      onChange={e=>{setPercT(+e.target.value);setRes(null);}}/>
                    <span style={C.inote}>Ka ≈ {fmt(Math.min(70/Math.sqrt(Math.max(percT,0.1)),80),0)} L/m²·day</span>
                  </div>
                ):(
                  <div style={C.ig}>
                    <label style={C.lbl}>Time for 25 mm drop (min)</label>
                    <input style={C.inp} type="number" min={0.5} step={0.5} value={percT25}
                      onChange={e=>{setPercT25(+e.target.value);setRes(null);}}/>
                    <span style={C.inote}>
                      T_perc={fmt(percT25/2.5,1)} min/cm · Ka≈{fmt(Math.min(70/Math.sqrt(Math.max(percT25/2.5,0.1)),80),0)} L/m²·day
                    </span>
                  </div>
                )}
              </div>
            )}

            <div style={C.slab}>Project (Technical Sheet)</div>
            {[
              {lbl:"Project Name",    val:projectName, set:setProjectName, ph:"E.g., Residential OWTS..."},
              {lbl:"Location",        val:location,    set:setLocation,    ph:"City, State/Region"},
              {lbl:"Designer/Prepared By", val:designer, set:setDesigner, ph:"Eng. Name"},
            ].map((f,i)=>(
              <div key={i} style={{...C.ig,marginBottom:"5px"}}>
                <label style={C.lbl}>{f.lbl}</label>
                <input style={{...C.inp,fontSize:"10px"}} className="hs-inp" type="text"
                  placeholder={f.ph} value={f.val} onChange={e=>f.set(e.target.value)}/>
              </div>
            ))}

            <div style={C.slab}>Drainage Field Design</div>
            <div style={{...C.inote, marginBottom:"8px", lineHeight:"1.6", color:"#2a6080"}}>
              Safety factor · ETP correction · System type
            </div>
            {/* Safety Factor */}
            <div style={{...C.ig, marginBottom:"5px"}}>
              <label style={C.lbl}>Safety Factor FS</label>
              <input style={C.inp} className="hs-inp" type="number" min={1.10} max={1.50} step={0.05}
                value={fs} onChange={e=>{setFs(+e.target.value);setRes(null);}}/>
              <span style={C.inote}>
                {fs<=1.10?"Well-tested soil":fs<=1.20?"Default (RAS 2017)":fs<=1.30?"Heterogeneous soil":"Marginal / single test"}
              </span>
            </div>
            {/* ETP */}
            <div style={{...C.ig, marginBottom:"5px"}}>
              <label style={C.lbl}>ETP (mm/day) <span style={{color:"#2a5070"}}>(opt.)</span></label>
              <input style={C.inp} className="hs-inp" type="number" min={0} max={12} step={0.5}
                value={etp||""} placeholder="0 = off"
                onChange={e=>{setEtp(+e.target.value||0);setRes(null);}}/>
              <span style={C.inote}>{etp>0?`Bogotá≈3.5 · Medellín≈4.2 · Coast≈7`:"Reduces effective Ka up to 20%"}</span>
            </div>
            {/* System type */}
            <div style={{...C.ig, marginBottom:"5px"}}>
              <label style={C.lbl}>System type</label>
              <select style={{...C.sel,fontSize:"10px"}} value={drainSys}
                onChange={e=>{setDrainSys(e.target.value);setRes(null);}}>
                <option value="auto">Auto (by K / N.F.)</option>
                <option value="zanjas_filtrantes">Zanjas filtrantes</option>
                <option value="monticulo_filtrante">Montículo filtrante</option>
                <option value="camara_infiltracion">Cámara infiltración</option>
                <option value="lecho_filtrante">Lecho filtrante</option>
                <option value="campo_aspersion">Campo aspersión *</option>
                <option value="pozo_filtrante">Pozo filtrante</option>
              </select>
            </div>
            {drainSys==="campo_aspersion"&&(
              <div style={{fontSize:"9px",color:"#FFB020",lineHeight:"1.5",marginBottom:"6px",paddingLeft:"4px"}}>
                * Requires secondary treatment + vertimiento permit (SDA/CAR)
              </div>
            )}

            <div style={C.slab}>Site Conditions <span style={{color:"#2a5070",fontWeight:"400"}}>(optional)</span></div>
            <div style={{...C.inote, marginBottom:"8px", lineHeight:"1.6", color:"#2a6080"}}>
              Geospatial checks · Res. 0330/2017 Art. 143–144
            </div>
            {[
              {lbl:"Dist. to supply wells (m)",   val:distPozos,      set:(v)=>{setDistPozos(v);      setGeoRes(null);}, min:0, step:1,   ph:"min. 30 m"},
              {lbl:"Dist. to water bodies (m)",   val:distCuerpoAgua, set:(v)=>{setDistCuerpoAgua(v); setGeoRes(null);}, min:0, step:1,   ph:"min. 30 m"},
              {lbl:"Dist. to buildings (m)",      val:distEdific,     set:(v)=>{setDistEdific(v);     setGeoRes(null);}, min:0, step:0.5, ph:"min. 5 m"},
              {lbl:"Dist. to deep-root trees (m)",val:distArboles,    set:(v)=>{setDistArboles(v);    setGeoRes(null);}, min:0, step:0.5, ph:"min. 3 m"},
              {lbl:"Measured water table depth (m)", val:nivelFreatico, set:(v)=>{setNivelFreatico(v); setGeoRes(null);}, min:0.1, step:0.1, ph:"depth to N.F."},
              {lbl:"Trench installation depth (m)",  val:profInstal,    set:(v)=>{setProfInstal(+v);   setGeoRes(null);}, min:0.3, step:0.1, ph:"0.75 m"},
            ].map((f,i)=>(
              <div key={i} style={{...C.ig, marginBottom:"5px"}}>
                <label style={C.lbl}>{f.lbl}</label>
                <input style={{...C.inp, fontSize:"10px"}} className="hs-inp" type="number"
                  min={f.min} step={f.step} value={f.val} placeholder={f.ph}
                  onChange={e=>f.set(e.target.value)}/>
              </div>
            ))}
            <div style={{...C.ig, marginBottom:"5px"}}>
              <label style={C.lbl}>Position vs. water intakes</label>
              <select style={{...C.sel, fontSize:"10px"}} value={aguasAbajo}
                onChange={e=>{setAguasAbajo(e.target.value); setGeoRes(null);}}>
                <option value="">— Not informed —</option>
                <option value="si">✓ Downstream (correct)</option>
                <option value="no">✗ Upstream / not verified</option>
              </select>
            </div>

            <div style={{display:"flex",gap:"6px",marginTop:"12px"}} className="no-print">
              <button style={{...C.tBtn(eduMode,"0,200,140"),flex:1,fontSize:"10px"}} onClick={()=>setEduMode(!eduMode)}>📚 Educational</button>
              <button style={{...C.tBtn(showComp,"150,120,255"),flex:1,fontSize:"10px"}} onClick={handleCompare}>⚖ Standards</button>
            </div>

          </div>

          {/* Calculate button fixed at bottom of sidebar */}
          <div style={C.calcWrap} className="no-print">
            <button
              style={{background:"transparent",border:"1px solid #00F5FF",color:"#00F5FF",fontSize:"10px",fontWeight:"700",letterSpacing:"0.14em",textTransform:"uppercase",cursor:"pointer",padding:"11px",borderRadius:"4px",width:"100%",fontFamily:"'Orbitron',sans-serif",transition:"all 0.2s"}}
              className="hs-calc"
              onClick={calculate}
            >▶ Calculate Design</button>
          </div>
        </div>

        {/* ── Panel principal ── */}
        <div style={C.main}>
          {!res ? (
            <div style={C.empty}>
              <div style={{fontSize:"56px",opacity:0.15}}>🧮</div>
              <div style={{fontSize:"15px",color:"#2a5070",fontWeight:"500"}}>Configure parameters</div>
              <div style={{fontSize:"11px",color:"#1a3050"}}>Results will appear here</div>
            </div>
          ) : (()=>{
            const r=res;
            return (
              <>
                {/* Tabs */}
                <div style={C.tabBar}>
                  {TABS.map(tab=>(
                    <button key={tab.id} style={C.tabBtn(activeTab===tab.id)} className="hs-tab" onClick={()=>setActiveTab(tab.id)}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={C.content} className="hs-content">

                  {/* ── Geo viability banner (Fase 6) ── */}
                  {geoData?.viability?.status === "bloqueante" && (
                    <div style={{marginBottom:"14px",padding:"11px 14px",background:"rgba(255,80,80,0.07)",border:"1px solid rgba(255,80,80,0.25)",borderLeft:"3px solid #FF5050",borderRadius:"6px",fontSize:"10px",color:"#FF5050"}}>
                      <strong>✗ SITARD BLOQUEANTE — {geoData.viability.title}</strong><br/>
                      <span style={{color:"#d08080",lineHeight:"1.5",display:"block",marginTop:"4px"}}>{geoData.viability.message}</span>
                      <a href="/calculators/geo" style={{color:"#FF5050",fontSize:"9px",display:"block",marginTop:"5px"}}>→ Revisar geolocalización del predio</a>
                    </div>
                  )}
                  {geoData?.viability?.status === "alerta" && (
                    <div style={{marginBottom:"14px",padding:"9px 13px",background:"rgba(255,176,32,0.04)",border:"1px solid rgba(255,176,32,0.15)",borderLeft:"3px solid #FFB020",borderRadius:"6px",fontSize:"10px",color:"#FFB020"}}>
                      ⚠ {geoData.viability.title} — {geoData.viability.message.slice(0,100)}…
                      <a href="/calculators/geo" style={{color:"#FFB020",fontSize:"9px",display:"block",marginTop:"4px"}}>→ Ver detalle</a>
                    </div>
                  )}
                  {geoData?.climate && (
                    <div style={{marginBottom:"10px",padding:"7px 11px",background:"rgba(0,255,136,0.04)",border:"1px solid rgba(0,255,136,0.12)",borderRadius:"6px",fontSize:"9px",color:"#00FF88",fontFamily:"'IBM Plex Mono',monospace"}}>
                      📍 {geoData.climate.elevation_m} m.s.n.m. · T={geoData.climate.temp_media_c}°C · ETP={geoData.climate.etp_media_mm_dia} mm/día — aplicado automáticamente desde geolocalización
                    </div>
                  )}

                  {/* ── Geospatial banner (visible on all tabs except sitechecks) ── */}
                  {geoRes && activeTab !== "sitechecks" && geoRes.bloqueantes > 0 && (
                    <div style={{marginBottom:"14px",padding:"9px 13px",background:"rgba(255,80,80,0.06)",border:"1px solid rgba(255,80,80,0.2)",borderLeft:"3px solid #FF5050",borderRadius:"6px",fontSize:"10px",color:"#FF5050",cursor:"pointer"}}
                      onClick={()=>setActiveTab("sitechecks")}>
                      ✗ {geoRes.bloqueantes} geospatial check{geoRes.bloqueantes>1?"s":""} BLOCKING — click to view Site Checks tab
                    </div>
                  )}
                  {geoRes && activeTab !== "sitechecks" && geoRes.bloqueantes === 0 && geoRes.alertas > 0 && (
                    <div style={{marginBottom:"14px",padding:"9px 13px",background:"rgba(255,176,32,0.04)",border:"1px solid rgba(255,176,32,0.15)",borderLeft:"3px solid #FFB020",borderRadius:"6px",fontSize:"10px",color:"#FFB020",cursor:"pointer"}}
                      onClick={()=>setActiveTab("sitechecks")}>
                      ⚠ {geoRes.alertas} geospatial alert{geoRes.alertas>1?"s":""} — click to view Site Checks tab
                    </div>
                  )}

                  {/* ── TAB: SUMMARY ── */}
                  {activeTab==="resumen"&&(
                    <>
                      <div style={C.sec}><span>Design Volumes</span><div style={C.ln}/></div>
                      <div style={{...C.g3,marginBottom:"10px"}}>
                        <div style={C.ri(false)}><div style={C.rv(false)}>{fmt(r.Vl)}</div><div style={C.ru}>m³</div><div style={C.rl}>Liquid Volume (Vl)<br/>HRT={r.p.trhDays}d · {r.p.tempLabel}</div></div>
                        <div style={C.ri(false)}><div style={C.rv(false)}>{fmt(r.Vs)}</div><div style={C.ru}>m³</div><div style={C.rl}>Sludge Volume (Vs)<br/>{r.p.sludgeRate}L/person/year×{cleanYears}a</div></div>
                        <div style={C.ri(false)}><div style={C.rv(false)}>{fmt(r.Vn)}</div><div style={C.ru}>m³</div><div style={C.rl}>Scum Volume (Vn)<br/>{(r.p.scumFactor*100).toFixed(0)}%×Vl</div></div>
                      </div>
                      <div style={C.ri(true)}><div style={C.rv(true)}>{fmt(r.Vtot)} m³ · {fmtI(r.Vtot*1000)} L</div><div style={C.rl}>TOTAL VOLUME {r.minA&&<span style={{color:"#b0a060"}}> — min. standard applied</span>}</div></div>
                      <EduNote text={`${EDU.Vl} ${EDU.Vs} ${EDU.Vn}`}/>

                      <div style={C.sec}><span>Dimensions &amp; Chambers</span><div style={C.ln}/></div>
                      <div style={C.dr}>
                        {[{l:"Largo",v:`${fmt(r.L)}m`},{l:"×"},{l:"Ancho",v:`${fmt(r.W)}m`},{l:"×"},{l:"Prof. útil",v:`${fmt(r.depth)}m`},{l:"+"},{l:"BL",v:`${fmt(freeboard)}m`},{l:"="},{l:"Prof. total",v:`${fmt(r.hT)}m`,hi:true},{l:"·"},{l:"Área",v:`${fmt(r.Area)}m²`}]
                          .map((d,i)=>d.v?<div key={i} style={C.db}><div style={C.dl}>{d.l}</div><div style={{...C.dv,color:d.hi?"#00d4ff":"#7dd8f0"}}>{d.v}</div></div>:<div key={i} style={{color:"#1e4060",fontSize:"13px"}}>{d.l}</div>)}
                        <div style={{marginLeft:"auto",textAlign:"center"}}>
                          <div style={C.tag("0,212,255")}>{r.chambers} CHM.</div>
                          <div style={{fontSize:"9px",color:"#4a7fa5",marginTop:"4px"}}>{r.chambers===1?"Single":r.chambers===2?"2/3+1/3":"1/2+1/4+1/4"}</div>
                        </div>
                      </div>

                      <div style={C.sec}><span>Organic Load & Solids Retention</span><div style={C.ln}/></div>
                      <div style={C.g4}>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv("#a0c8e0")}>{fmt(r.Corg,3)}</div><div style={C.ku}>kg BOD₅/day</div><div style={C.kl}>Organic Load</div></div>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv(r.chkCVO?"#00c864":"#ff5050")}>{fmt(r.CVO,4)}</div><div style={C.ku}>kg/m³·day</div><div style={C.kl}>OVL ≤ 0.30</div></div>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv(r.chkSRT?"#00c864":"#ff5050")}>{fmtI(r.SRT)}</div><div style={C.ku}>days</div><div style={C.kl}>SRT ≥ 20d</div></div>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv("#a0c8e0")}>{fmt(r.Gs_day*1000,2)}</div><div style={C.ku}>L/day</div><div style={C.kl}>Sludge Prod.</div></div>
                      </div>

                      <div style={C.sec}><span>Piping &amp; Ventilation</span><div style={C.ln}/></div>
                      <div style={C.pr}>
                        <div style={C.pc}><div style={C.pt}>Inlet T-pipe</div><div style={C.pv}>Ø {fmtI(r.dPipe*1000)} mm</div><div style={C.ps}>Submerged ≥ 30 cm · Q={fmt(r.Qd*1000/86400,2)} L/s</div></div>
                        <div style={C.pc}><div style={C.pt}>Outlet T-pipe</div><div style={C.pv}>Ø {fmtI(r.dPipe*1000)} mm</div><div style={C.ps}>Submerged ≥ 40 cm · deepest point</div></div>
                        <div style={C.pc}><div style={C.pt}>Ventilation</div><div style={C.pv}>Ø {fmtI(r.dVent*1000)} mm</div><div style={C.ps}>{r.chambers} pipe{r.chambers>1?"s":""} · ≥0.5m above roof</div></div>
                      </div>

                      <div style={C.sec}><span>Effluent Quality</span><div style={C.ln}/></div>
                      {[{lbl:"BOD₅",inV:dboIn,outV:r.dboOut,rem:r.dboR},{lbl:"TSS",inV:ssIn,outV:r.ssOut,rem:r.ssR}].map((e,i)=>(
                        <div key={i} style={C.er}>
                          <div style={C.eb("200,100,50")}><div style={{...C.ev,color:"#d08050"}}>{fmtI(e.inV)}</div><div style={C.el}>{e.lbl} inlet (mg/L)</div></div>
                          <div style={C.ea}><div style={{fontSize:"8px",color:"#4a7fa5",marginBottom:"1px"}}>−{fmtI(e.rem*100)}%</div>→</div>
                          <div style={C.eb("0,180,100")}><div style={{...C.ev,color:"#00c864"}}>{fmtI(e.outV)}</div><div style={C.el}>{e.lbl} outlet (mg/L)</div></div>
                        </div>
                      ))}
                      <div style={C.warn}>⚠ Estimated removal efficiencies. Effluent requires secondary treatment before disposal.</div>
                      <div style={C.foot}>HYDROSTACK · WATER &amp; SANITATION ENGINEERING · v6.0</div>
                    </>
                  )}

                  {/* ── TAB: SCHEMATIC ── */}
                  {activeTab==="corte"&&(
                    <>
                      <div style={C.sec}><span>Dimensions &amp; Longitudinal Section</span><div style={C.ln}/></div>
                      <div style={C.dr}>
                        {[{l:"Length",v:`${fmt(r.L)}m`},{l:"×"},{l:"Width",v:`${fmt(r.W)}m`},{l:"×"},{l:"Depth (useful)",v:`${fmt(r.depth)}m`},{l:"+"},{l:"FB",v:`${fmt(freeboard)}m`},{l:"="},{l:"Height (total)",v:`${fmt(r.hT)}m`,hi:true}]
                          .map((d,i)=>d.v?<div key={i} style={C.db}><div style={C.dl}>{d.l}</div><div style={{...C.dv,color:d.hi?"#00d4ff":"#7dd8f0"}}>{d.v}</div></div>:<div key={i} style={{color:"#1e4060",fontSize:"13px"}}>{d.l}</div>)}
                      </div>
                      <DetailedSchematic r={r} freeboard={freeboard}/>
                    </>
                  )}

                  {/* ── TAB: HYDRAULICS ── */}
                  {activeTab==="hidraulica"&&(
                    <>
                      <div style={C.sec}><span>Hydraulic Profile</span><div style={C.ln}/></div>
                      <HydraulicProfile r={r} freeboard={freeboard}/>
                      <div style={{...C.inote,marginTop:"8px",color:"#3a6080",marginBottom:"16px"}}>EGL: Energy Grade Line. Total head loss estimate: ~{fmt(r.hf_cm,1)} cm.</div>

                      <div style={C.sec}><span>Hydraulic KPIs</span><div style={C.ln}/></div>
                      <div style={C.g4}>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv(r.chkVflow?"#00c864":"#ff5050")}>{fmt(r.Vflow*1000,3)}</div><div style={C.ku}>mm/s</div><div style={C.kl}>Flow velocity · &lt;5 mm/s</div></div>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv(r.chkRe?"#00c864":"#ff5050")}>{fmtI(r.Re)}</div><div style={C.ku}>—</div><div style={C.kl}>Reynolds · &lt;500</div></div>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv(r.chkFr?"#00c864":"#ff5050")}>{r.Fr.toExponential(2)}</div><div style={C.ku}>—</div><div style={C.kl}>Froude · &lt;0.10</div></div>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv("#a0c8e0")}>{fmt(r.hf_cm,2)}</div><div style={C.ku}>cm</div><div style={C.kl}>Total head loss</div></div>
                      </div>

                      <div style={C.sec}><span>Head Loss Breakdown</span><div style={C.ln}/></div>
                      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1e4060",borderRadius:"8px",padding:"14px 16px",marginBottom:"16px"}}>
                        {[
                          {lbl:"Inlet pipe (Darcy-W.)",              v:r.hf_entrada,     pct:r.hf_entrada/r.hf_total*100},
                          {lbl:"Contraction (K=0.5)",              v:r.hf_contraccion, pct:r.hf_contraccion/r.hf_total*100},
                          {lbl:"Flow through tank",                v:r.hf_fosa,        pct:r.hf_fosa/r.hf_total*100},
                          {lbl:`Internal baffles (${r.chambers-1}×K=0.3)`,v:r.hf_tabiques,pct:r.hf_tabiques/r.hf_total*100},
                          {lbl:"Outlet expansion (K=1.0)",          v:r.hf_salida,      pct:r.hf_salida/r.hf_total*100},
                        ].map((row,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                            <div style={{fontSize:"10px",color:"#6a9bbf",flex:1}}>{row.lbl}</div>
                            <div style={{fontSize:"10px",color:"#a0c8e0",width:"56px",textAlign:"right",fontFamily:"monospace"}}>{fmt(row.v*100,3)} cm</div>
                            <div style={{width:"90px",height:"6px",background:"#0d2035",borderRadius:"3px",overflow:"hidden"}}>
                              <div style={{width:`${Math.min(row.pct,100)}%`,height:"100%",background:"linear-gradient(90deg,#005580,#00aad4)",borderRadius:"3px"}}/>
                            </div>
                            <div style={{fontSize:"9px",color:"#4a7fa5",width:"32px",textAlign:"right"}}>{fmt(row.pct,1)}%</div>
                          </div>
                        ))}
                        <div style={{display:"flex",justifyContent:"flex-end",borderTop:"1px solid #1e4060",paddingTop:"8px",marginTop:"4px"}}>
                          <div style={{fontSize:"11px",color:"#00d4ff",fontWeight:"700",fontFamily:"monospace"}}>TOTAL: {fmt(r.hf_cm,2)} cm</div>
                        </div>
                      </div>

                      <div style={C.sec}><span>Sedimentation &amp; Flow</span><div style={C.ln}/></div>
                      <div style={C.g4}>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv("#a0c8e0")}>{fmt(r.vs_mday,2)}</div><div style={C.ku}>m/day</div><div style={C.kl}>Stokes Vel.<br/>T={temp}°C</div></div>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv("#a0c8e0")}>{fmt(r.qS,3)}</div><div style={C.ku}>m/day</div><div style={C.kl}>Overflow Rate<br/>Q/Area</div></div>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv(r.chkSed?"#00c864":"#ff5050")}>{fmt(r.remSS_camp,1)}</div><div style={C.ku}>%</div><div style={C.kl}>TSS Removal<br/>Camp (1946)</div></div>
                        <div style={C.kpi} className="hs-kpi"><div style={C.kv("#a0c8e0")}>{(r.nu*1e6).toFixed(3)}</div><div style={C.ku}>×10⁻⁶ m²/s</div><div style={C.kl}>Kinematic Visc.<br/>f(T)</div></div>
                      </div>
                    </>
                  )}

                  {/* ── TAB: CHECKS ── */}
                  {activeTab==="verificaciones"&&(
                    <>
                      <div style={C.sec}><span>Code Compliance Checks — {n.ref}</span><div style={C.ln}/></div>
                      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1e4060",borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
                        {[
                          {ok:r.chkD,  t:"Minimum depth (useful)",       v:`${fmt(r.depth)}m ≥ ${r.p.minDepth}m`},
                          {ok:r.chkW,  t:"Minimum width",               v:`${fmt(r.W)}m ≥ ${r.p.minWidth}m`},
                          {ok:r.chkL,  t:"Minimum length",              v:`${fmt(r.L)}m ≥ ${r.p.minLength}m`},
                          {ok:r.chkS,  t:"Surface loading ≤ 1.5 m/d",   v:`${fmt(r.qS,3)} m/d`},
                          {ok:r.chkCVO,t:"OVL ≤ 0.30 kg/m³·day",        v:`${fmt(r.CVO,4)}`},
                          {ok:r.chkSRT,t:"SRT ≥ 20 days",               v:`${fmtI(r.SRT)} d`},
                          {ok:!r.minA, t:"Volume ≥ min. standard",      v:r.minA?`Min: ${fmt(r.p.minVolume)}m³`:`${fmt(r.Vtot)}m³`},
                        ].map((c,i)=>(
                          <div key={i} style={C.ck(c.ok)}><span style={C.ci(c.ok)}>{c.ok?"✓":"✗"}</span><span style={C.ct}>{c.t}</span><span style={C.cv(c.ok)}>{c.v}</span></div>
                        ))}
                      </div>

                      <div style={C.sec}><span>Hydraulic Checks</span><div style={C.ln}/></div>
                      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1e4060",borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
                        {[
                          {ok:r.chkVflow, t:"Horizontal velocity ≤ 5 mm/s",       v:`${fmt(r.Vflow*1000,3)} mm/s`},
                          {ok:r.chkRe,    t:"Reynolds < 500 (laminar)",           v:`Re = ${fmtI(r.Re)}`},
                          {ok:r.chkFr,    t:"Froude < 0.10 (subcritical)",        v:`Fr = ${r.Fr.toExponential(2)}`},
                          {ok:r.chkSed,   t:"Settling vel. > Overflow rate",      v:`${fmt(r.vs_mday,2)} > ${fmt(r.qS,3)} m/d`},
                          {ok:r.hf_cm<15, t:"Total head loss < 15 cm",            v:`${fmt(r.hf_cm,2)} cm`},
                        ].map((c,i)=>(
                          <div key={i} style={C.ck(c.ok)}><span style={C.ci(c.ok)}>{c.ok?"✓":"✗"}</span><span style={C.ct}>{c.t}</span><span style={C.cv(c.ok)}>{c.v}</span></div>
                        ))}
                      </div>

                      <div style={C.sec}><span>Leach Field Design — Fase 3</span><div style={C.ln}/></div>
                      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1e4060",borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
                        {r.soilOk&&r.A_inf?(
                          <>
                            {/* System type badge */}
                            <div style={{fontSize:"9px",color:"#00F5FF",letterSpacing:"0.08em",fontWeight:"700",marginBottom:"10px",fontFamily:"'Orbitron',sans-serif"}}>
                              {r.drainSysKey==="zanjas_filtrantes"?"ZANJAS FILTRANTES"
                               :r.drainSysKey==="monticulo_filtrante"?"MONTÍCULO FILTRANTE"
                               :r.drainSysKey==="camara_infiltracion"?"CÁMARA INFILTRACIÓN"
                               :r.drainSysKey==="lecho_filtrante"?"LECHO FILTRANTE"
                               :r.drainSysKey==="campo_aspersion"?"CAMPO ASPERSIÓN ⚠"
                               :r.drainSysKey==="pozo_filtrante"?"POZO FILTRANTE":"AUTO"}
                            </div>
                            {/* KPI row 1: Ka values */}
                            <div style={{...C.g3,marginBottom:"8px"}}>
                              <div style={C.kpi} className="hs-kpi">
                                <div style={C.kv("#7ab0d0")}>{fmt(r.q_inf_bruto,0)}</div>
                                <div style={C.ku}>L/m²·day</div>
                                <div style={C.kl}>Ka bruto</div>
                              </div>
                              <div style={C.kpi} className="hs-kpi">
                                <div style={C.kv(r.etp_applied?"#FFB020":"#00d4ff")}>{fmt(r.q_inf,1)}</div>
                                <div style={C.ku}>L/m²·day</div>
                                <div style={C.kl}>Ka efectivo{r.etp_applied?" (−ETP)":""}</div>
                              </div>
                              <div style={C.kpi} className="hs-kpi">
                                <div style={C.kv("#00FF88")}>{fmt(fs,2)}×</div>
                                <div style={C.ku}>FS</div>
                                <div style={C.kl}>Safety factor</div>
                              </div>
                            </div>
                            {/* KPI row 2: Area and trench dimensions */}
                            <div style={{...C.g3,marginBottom:"10px"}}>
                              <div style={C.kpi} className="hs-kpi">
                                <div style={C.kv("#4A9AEA")}>{fmt(r.A_net,1)}</div>
                                <div style={C.ku}>m² net</div>
                                <div style={C.kl}>Area (before FS)</div>
                              </div>
                              <div style={C.kpi} className="hs-kpi">
                                <div style={C.kv("#00d4ff")}>{fmt(r.A_inf,1)}</div>
                                <div style={C.ku}>m² design</div>
                                <div style={C.kl}>Area (build this)</div>
                              </div>
                              {r.n_zanjas&&(
                                <div style={C.kpi} className="hs-kpi">
                                  <div style={C.kv("#00d4ff")}>{r.n_zanjas}</div>
                                  <div style={C.ku}>trenches</div>
                                  <div style={C.kl}>{fmt(r.L_por_zanja,1)} m ea.</div>
                                </div>
                              )}
                            </div>
                            {/* Trench summary */}
                            {r.L_zanjas&&(
                              <div style={{fontSize:"10px",color:"#4A7A8A",fontFamily:"'IBM Plex Mono',monospace",lineHeight:"1.7",marginBottom:"8px"}}>
                                {r.n_zanjas} × {fmt(r.L_por_zanja,1)} m · w={fmt(r.ancho_z,1)} m · sep=2.0 m · L_tot={fmt(r.L_zanjas,1)} m
                                {r.drainSysKey==="monticulo_filtrante"&&" · elev=+0.6 m"}
                              </div>
                            )}
                            {/* Perc test info */}
                            {isManual&&(
                              <div style={{fontSize:"9px",color:"#2a6080",lineHeight:"1.5",marginBottom:"6px"}}>
                                {percMode==="25mm"
                                  ?`Perc (ASTM D6391): ${fmt(percT25,1)} min/25mm → T_perc=${fmt(percT25/2.5,1)} min/cm → Ka=${fmt(Math.min(70/Math.sqrt(Math.max(percT25/2.5,0.1)),80),0)} L/m²·day`
                                  :`Perc: T_perc=${fmt(percT,1)} min/cm → Ka=${fmt(Math.min(70/Math.sqrt(Math.max(percT,0.1)),80),0)} L/m²·day [Crites & Tchobanoglous]`
                                }
                              </div>
                            )}
                            <div style={C.warn}>Res. 0330/2017 Art. 134–145. Verify perc test in-situ (ASTM D6391). Min. 30 m to water supply.</div>
                          </>
                        ):(
                          <div style={C.ck(false)}><span style={C.ci(false)}>✗</span><span style={C.ct}>Soil unsuitable for direct infiltration (T_perc {`>`} 30 min/cm). Consider mound or alternative system.</span></div>
                        )}
                      </div>

                      <div style={C.sec}><span>Calculation Summary</span><div style={C.ln}/></div>
                      <div style={C.fml}>
                        <div>📐 <strong style={{color:"#7ab0d0"}}>{n.ref}</strong> — {USE_TYPES[useType].icon} {USE_TYPES[useType].label} · T={temp}°C ({r.p.tempLabel}) · {r.chambers}C</div>
                        <div>Q={users}×{dotacion}×{retCoef}/1000=<strong style={{color:"#a0c8e0"}}>{fmt(r.Qd,4)}m³/d ({fmt(r.Qd*1000/86400,2)}L/s)</strong></div>
                        <div>Vl={fmt(r.Vl)}m³ · Vs={fmt(r.Vs)}m³ · Vn={fmt(r.Vn)}m³ → <strong style={{color:"#00d4ff"}}>Vtot={fmt(r.Vtot)}m³</strong></div>
                        <div>W={fmt(r.W)}m · L={fmt(r.L)}m · Área={fmt(r.Area)}m² · CVO={fmt(r.CVO,4)}kg/m³·d · SRT={fmtI(r.SRT)}d</div>
                        <div>v={fmt(r.Vflow*1000,3)}mm/s · Re={fmtI(r.Re)} · Fr={r.Fr.toExponential(2)} · hf={fmt(r.hf_cm,2)}cm · ν={r.nu.toExponential(3)}m²/s</div>
                        {r.A_inf&&<div>A_net={fmt(r.A_net,1)}m² · A_diseño={fmt(r.A_inf,1)}m² (FS={fmt(fs,2)}) · Ka_ef={fmt(r.q_inf,1)} L/m²·d{r.etp_applied?` [ETP=${etp}mm/d]`:""}</div>}
                        {r.n_zanjas&&<div>{r.n_zanjas} zanjas × {fmt(r.L_por_zanja,1)}m · w={fmt(r.ancho_z,1)}m · L_tot={fmt(r.L_zanjas,1)}m · {r.drainSysKey}</div>}
                      </div>
                    </>
                  )}

                  {/* ── TAB: SITE CHECKS ── */}
                  {activeTab==="sitechecks"&&geoRes&&(
                    <>
                      <div style={C.sec}><span>Geospatial Verification — Res. 0330/2017 Art. 143–144</span><div style={C.ln}/></div>

                      {/* Summary row */}
                      <div style={{display:"flex",gap:"10px",marginBottom:"16px",flexWrap:"wrap"}}>
                        {[
                          {lbl:"Checks run",   val:geoRes.checks.length,  c:"#4A7A8A"},
                          {lbl:"Blocking",     val:geoRes.bloqueantes,    c:geoRes.bloqueantes>0?"#FF5050":"#00FF88"},
                          {lbl:"Alerts",       val:geoRes.alertas,        c:geoRes.alertas>0?"#FFB020":"#00FF88"},
                          {lbl:"Status",       val:geoRes.cumple?"PASS":"FAIL", c:geoRes.cumple?"#00FF88":"#FF5050"},
                        ].map((s,i)=>(
                          <div key={i} style={{background:"#041820",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"8px",padding:"10px 16px",textAlign:"center",minWidth:"80px"}}>
                            <div style={{fontSize:"20px",fontWeight:"700",color:s.c,fontFamily:"'Orbitron',sans-serif"}}>{s.val}</div>
                            <div style={{fontSize:"9px",color:"#4A7A8A",marginTop:"4px",letterSpacing:"0.06em"}}>{s.lbl}</div>
                          </div>
                        ))}
                      </div>

                      {/* Individual checks */}
                      {geoRes.checks.map((chk,i)=><GeoCheckRow key={i} check={chk}/>)}

                      {/* Alternative technologies when water table is high */}
                      {geoRes.sugAlt&&(
                        <>
                          <div style={C.sec}><span>Alternative Technologies</span><div style={C.ln}/></div>
                          <div style={{background:"rgba(255,176,32,0.03)",border:"1px solid rgba(255,176,32,0.12)",borderRadius:"8px",padding:"14px 16px"}}>
                            <div style={{fontSize:"10px",color:"#FFB020",marginBottom:"10px",fontWeight:"600"}}>
                              ⚠ High water table detected — standard infiltration field may be unfeasible. Consider:
                            </div>
                            {[
                              {t:"Mound system (montículo filtrante)",d:"Raises the field above natural grade to create clearance from N.F. Suitable when N.F. is 0.5–1.20 m."},
                              {t:"UASB + elevated dispersal field (FAFA)",d:"Upflow Anaerobic Sludge Blanket reactor followed by shallow mound field over geomembrane."},
                              {t:"Subsurface flow constructed wetland",d:"Horizontal-flow reed bed treats effluent without ground infiltration; discharges to surface receptor with permit."},
                              {t:"Deep absorption well with filter lining",d:"Only viable if permeable soil exists below the high N.F. zone. Requires geotechnical study."},
                            ].map((alt,i)=>(
                              <div key={i} style={{display:"flex",gap:"10px",marginBottom:"8px",paddingBottom:"8px",borderBottom:"1px solid rgba(255,176,32,0.08)"}}>
                                <span style={{color:"#FFB020",fontSize:"11px",minWidth:"16px"}}>›</span>
                                <div>
                                  <div style={{fontSize:"11px",color:"#E8F8FF",fontWeight:"600",marginBottom:"2px"}}>{alt.t}</div>
                                  <div style={{fontSize:"10px",color:"#4A7A8A",lineHeight:"1.5"}}>{alt.d}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <div style={C.foot}>HYDROSTACK · SITARD · Geospatial Verification · Res. 0330/2017</div>
                    </>
                  )}

                  {/* ── TAB: COMPARISON ── */}
                  {activeTab==="comparativa"&&showComp&&compRes&&(
                    <>
                      <div style={C.sec}><span>Comparison: 5 Standards</span><div style={C.ln}/></div>
                      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1e4060",borderRadius:"8px",padding:"14px"}}>
                        <table style={C.tbl}>
                          <thead><tr>
                            <th style={C.th0}>Parameter</th>
                            {Object.entries(NORMS).map(([k,v])=>(<th key={k} style={{...C.th,color:k===norm?"#00d4ff":"#4a7fa5"}}>{v.flag} {v.name}</th>))}
                          </tr></thead>
                          <tbody>
                            {[
                              {lbl:"HRT (days)",     fn:r=>fmt(r.trhDays,1)},
                              {lbl:"Vl (m³)",        fn:r=>fmt(r.Vl)},
                              {lbl:"Vs (m³)",        fn:r=>fmt(r.Vs)},
                              {lbl:"Vtotal (m³)",    fn:r=>fmt(r.Vtot),hi:true},
                              {lbl:"L (m)",          fn:r=>fmt(r.L)},
                              {lbl:"W (m)",          fn:r=>fmt(r.W)},
                              {lbl:"SRT (days)",     fn:r=>fmtI(r.SRT)},
                              {lbl:"Chambers",       fn:r=>r.chambers},
                            ].map((row,i)=>(
                              <tr key={i}><td style={C.td0}>{row.lbl}</td>
                                {Object.keys(NORMS).map(k=>(<td key={k} style={k===norm&&row.hi?C.tdHi:k===norm?{...C.td,color:"#7ab0d0"}:C.td}>{row.fn(compRes[k])}</td>))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* ── TAB: DIAGRAMA 3D ── */}
                  {activeTab==="diagrama3d"&&(
                    <div style={{height:"100%"}}>
                      <IsometricDiagram3D
                        r={r}
                        projectName={projectName}
                        location={location}
                        designer={designer}
                      />
                    </div>
                  )}

                  {/* ── TAB: LÁMINA TÉCNICA ── */}
                  {activeTab==="lamina"&&(
                    <LaminaTecnica
                      r={r}
                      freeboard={freeboard}
                      meta={{
                        projectName,
                        location,
                        designer,
                        normRef: NORMS[norm]?.ref,
                      }}
                    />
                  )}

                </div>{/* end content */}
              </>
            );
          })()}
        </div>{/* end main */}

      </div>{/* end layout */}
    </div>
  );
}
