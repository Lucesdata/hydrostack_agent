"use client";
import { useState } from "react";
import LaminaTecnica from "./LaminaTecnica";
import IsometricDiagram3D from "./IsometricDiagram3D";
import { saveFormState } from "@/src/lib/state/clientStore";
import { NORMS, getParams, USE_TYPES, SOILS, EDU, computeNorm, fmt, fmtI } from "./calculator/calculatorData";
import { DetailedSchematic, HydraulicProfile } from "./calculator/CalculatorSchematics";
import { C } from "./calculator/calculatorStyles";

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
  const [res,        setRes]        = useState(null);
  const [eduMode,    setEduMode]    = useState(false);
  const [showComp,   setShowComp]   = useState(false);
  const [compRes,    setCompRes]    = useState(null);
  const [activeTab,  setActiveTab]  = useState("resumen");
  const [projectName, setProjectName] = useState("");
  const [location,    setLocation]    = useState("");
  const [designer,    setDesigner]    = useState("");

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
    const q_inf=isManual?Math.min(70/Math.sqrt(Math.max(percT,0.1)),80):soil.q;
    const soilOk=isManual?percT<=30:soil.ok;
    const A_inf=soilOk&&q_inf>0?(Qd*1000)/q_inf:null;
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
      soilOk,q_inf,A_inf,L_zanjas:A_inf?A_inf/0.6:null,minA,p,
      // hidráulica
      nu,Aflow,Vflow,chkVflow,Dh,Re,chkRe,Fr,chkFr,hLiq_m,
      hf_entrada,hf_contraccion,hf_fosa,hf_tabiques,hf_salida,hf_total,hf_cm,
      vPipe,vs,vs_mday,chkSed,remSS_camp};
  };

  const calculate = () => {
    const r=runCalc(); setRes(r);
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
      calculated: true
    };
    saveFormState(formState);
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

  const TABS = [
    {id:"resumen",        label:"Summary"},
    {id:"corte",          label:"Longitudinal Section"},
    {id:"hidraulica",     label:"Hydraulics"},
    {id:"verificaciones", label:"Code Checks"},
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
              <div style={{...C.ig,marginTop:"8px"}}>
                <label style={C.lbl}>Perc. Time (min/cm)</label>
                <input style={C.inp} type="number" min={0.1} step={0.5} value={percT}
                  onChange={e=>{setPercT(+e.target.value);setRes(null);}}/>
                <span style={C.inote}>q ≈ {fmt(Math.min(70/Math.sqrt(Math.max(percT,0.1)),80),0)} L/m²·day</span>
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

                      <div style={C.sec}><span>Leach Field Design</span><div style={C.ln}/></div>
                      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1e4060",borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
                        {r.soilOk&&r.A_inf?(
                          <>
                            <div style={{...C.g3,marginBottom:"10px"}}>
                              <div style={C.kpi} className="hs-kpi"><div style={C.kv("#00d4ff")}>{fmt(r.q_inf,0)}</div><div style={C.ku}>L/m²·day</div><div style={C.kl}>Infiltration Rate</div></div>
                              <div style={C.kpi} className="hs-kpi"><div style={C.kv("#00d4ff")}>{fmt(r.A_inf,1)}</div><div style={C.ku}>m²</div><div style={C.kl}>Leach Field Area</div></div>
                              <div style={C.kpi} className="hs-kpi"><div style={C.kv("#00d4ff")}>{fmt(r.L_zanjas,1)}</div><div style={C.ku}>m length</div><div style={C.kl}>Trench length (0.6m)</div></div>
                            </div>
                            <div style={C.warn}>Verify with in-situ percolation test. Min. distance to water supply: 50 m (EPA); 30 m (UK/AU).</div>
                          </>
                        ):(
                          <div style={C.ck(false)}><span style={C.ci(false)}>✗</span><span style={C.ct}>Soil unsuitable for direct infiltration. Use alternative system.</span></div>
                        )}
                      </div>

                      <div style={C.sec}><span>Calculation Summary</span><div style={C.ln}/></div>
                      <div style={C.fml}>
                        <div>📐 <strong style={{color:"#7ab0d0"}}>{n.ref}</strong> — {USE_TYPES[useType].icon} {USE_TYPES[useType].label} · T={temp}°C ({r.p.tempLabel}) · {r.chambers}C</div>
                        <div>Q={users}×{dotacion}×{retCoef}/1000=<strong style={{color:"#a0c8e0"}}>{fmt(r.Qd,4)}m³/d ({fmt(r.Qd*1000/86400,2)}L/s)</strong></div>
                        <div>Vl={fmt(r.Vl)}m³ · Vs={fmt(r.Vs)}m³ · Vn={fmt(r.Vn)}m³ → <strong style={{color:"#00d4ff"}}>Vtot={fmt(r.Vtot)}m³</strong></div>
                        <div>W={fmt(r.W)}m · L={fmt(r.L)}m · Área={fmt(r.Area)}m² · CVO={fmt(r.CVO,4)}kg/m³·d · SRT={fmtI(r.SRT)}d</div>
                        <div>v={fmt(r.Vflow*1000,3)}mm/s · Re={fmtI(r.Re)} · Fr={r.Fr.toExponential(2)} · hf={fmt(r.hf_cm,2)}cm · ν={r.nu.toExponential(3)}m²/s</div>
                        {r.A_inf&&<div>A_inf={fmt(r.A_inf,1)}m² · L_zanjas={fmt(r.L_zanjas,1)}m</div>}
                      </div>
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
