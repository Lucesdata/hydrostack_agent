"use client";
import { useState } from "react";
import LaminaTecnica from "./LaminaTecnica";
import IsometricDiagram3D from "./IsometricDiagram3D";

const NORMS = {
  epa: { name:"EPA (USA)",           flag:"🇺🇸", ref:"EPA 625/R-06/003",     dotacion:75, unit:"GPD/bed" },
  uk:  { name:"UK Building Regs",    flag:"🇬🇧", ref:"UK Part H",            dotacion:200, unit:"L/person/day" },
  au:  { name:"AS/NZS 1547 (AU/NZ)", flag:"🇦🇺", ref:"AS/NZS 1547:2012",     dotacion:200, unit:"L/person/day" },
  esp: { name:"Spain (CTE)",         flag:"🇪🇸", ref:"CTE DB-HS5",           dotacion:160, unit:"L/person/day" },
  ras: { name:"Colombia (RAS)",      flag:"🇨🇴", ref:"RAS 2017 Título J",    dotacion:120, unit:"L/person/day" },
};

const getParams = (norm, temp) => {
  // EPA (USA) - temperatures in Celsius converted from Fahrenheit
  if (norm==="epa") {
    if (temp>=20)      return {trhDays:1.5, sludgeRate:65, scumFactor:0.25, minVolume:3.785, minDepth:1.0, minWidth:0.9, minLength:1.8, tempLabel:"≥68°F (≥20°C)"};
    if (temp>=10)      return {trhDays:2.0, sludgeRate:80, scumFactor:0.25, minVolume:3.785, minDepth:1.0, minWidth:0.9, minLength:1.8, tempLabel:"50–66°F (10–19°C)"};
    return             {trhDays:2.5, sludgeRate:95, scumFactor:0.25, minVolume:3.785, minDepth:1.0, minWidth:0.9, minLength:1.8, tempLabel:"<50°F (<10°C)"};
  }
  // UK Building Regulations - Part H
  if (norm==="uk") {
    if (temp>=15)      return {trhDays:1.5, sludgeRate:50, scumFactor:0.25, minVolume:1.5, minDepth:1.0, minWidth:0.75, minLength:1.5, tempLabel:"≥59°F (≥15°C)"};
    if (temp>=10)      return {trhDays:2.0, sludgeRate:65, scumFactor:0.25, minVolume:1.5, minDepth:1.0, minWidth:0.75, minLength:1.5, tempLabel:"50–58°F (10–14°C)"};
    return             {trhDays:2.5, sludgeRate:75, scumFactor:0.25, minVolume:1.5, minDepth:1.0, minWidth:0.75, minLength:1.5, tempLabel:"<50°F (<10°C)"};
  }
  // AS/NZS 1547 (Australia/New Zealand)
  if (norm==="au") {
    if (temp>=15)      return {trhDays:1.5, sludgeRate:55, scumFactor:0.30, minVolume:1.5, minDepth:1.2, minWidth:0.9, minLength:1.5, tempLabel:"≥59°F (≥15°C)"};
    if (temp>=10)      return {trhDays:2.0, sludgeRate:70, scumFactor:0.30, minVolume:1.5, minDepth:1.2, minWidth:0.9, minLength:1.5, tempLabel:"50–58°F (10–14°C)"};
    if (temp>=5)       return {trhDays:2.5, sludgeRate:85, scumFactor:0.30, minVolume:1.5, minDepth:1.2, minWidth:0.9, minLength:1.5, tempLabel:"41–49°F (5–9°C)"};
    return             {trhDays:3.0, sludgeRate:100, scumFactor:0.30, minVolume:1.5, minDepth:1.2, minWidth:0.9, minLength:1.5, tempLabel:"<41°F (<5°C)"};
  }
  // Spain (CTE DB-HS5) - legacy
  if (norm==="esp") {
    if (temp>=15)      return {trhDays:1.0, sludgeRate:50, scumFactor:0.25, minVolume:1.5, minDepth:1.0, minWidth:0.75, minLength:1.5, tempLabel:"≥59°F (≥15°C)"};
    return             {trhDays:1.5, sludgeRate:60, scumFactor:0.25, minVolume:1.5, minDepth:1.0, minWidth:0.75, minLength:1.5, tempLabel:"<59°F (<15°C)"};
  }
  // RAS Colombia - legacy
  if (norm==="ras") {
    if (temp>=20)      return {trhDays:1.5, sludgeRate:40, scumFactor:0.30, minVolume:1.0, minDepth:1.2, minWidth:0.6, minLength:1.5, tempLabel:"≥68°F (≥20°C)"};
    if (temp>=10)      return {trhDays:2.0, sludgeRate:50, scumFactor:0.30, minVolume:1.0, minDepth:1.2, minWidth:0.6, minLength:1.5, tempLabel:"50–67°F (10–19°C)"};
    return             {trhDays:2.5, sludgeRate:60, scumFactor:0.30, minVolume:1.0, minDepth:1.2, minWidth:0.6, minLength:1.5, tempLabel:"<50°F (<10°C)"};
  }
  // Default to EPA if unrecognized
  return {trhDays:1.5, sludgeRate:65, scumFactor:0.25, minVolume:3.785, minDepth:1.0, minWidth:0.9, minLength:1.8, tempLabel:"≥68°F (≥20°C)"};
};

const USE_TYPES = {
  dom:   {label:"Residential",    icon:"🏠", dotacion:75, dboIn:200, ssIn:225, note:"Single/multi-family home (75 GPD/bedroom)"},
  com:   {label:"Commercial",     icon:"🏢", dotacion:50, dboIn:150, ssIn:150, note:"Office, retail, restaurant (50 GPD/person)"},
  edu:   {label:"Educational",    icon:"🏫", dotacion:20, dboIn:200, ssIn:220, note:"School, university (20 GPD/person)"},
  hosp:  {label:"Healthcare",     icon:"🏥", dotacion:75, dboIn:350, ssIn:350, note:"Hospital, clinic (75 GPD/patient)"},
  hotel: {label:"Hospitality",    icon:"🏨", dotacion:60, dboIn:250, ssIn:280, note:"Hotel, B&B (60 GPD/guest)"},
  ind:   {label:"Industrial/Admin", icon:"🏭", dotacion:30, dboIn:400, ssIn:450, note:"Industrial office (30 GPD/person)"},
};

const SOILS = [
  {label:"Gravel / Coarse sand",  T:0.5,  q:100, ok:true, desc:"Excellent drainage (ASTM D6391: <2 min)" },
  {label:"Medium sand",           T:2.0,  q:70,  ok:true, desc:"Good drainage (2–4 min)" },
  {label:"Fine sand",             T:5.0,  q:50,  ok:true, desc:"Moderate drainage (4–8 min)" },
  {label:"Sandy loam",            T:10.0, q:30,  ok:true, desc:"Moderate-poor drainage (8–16 min)" },
  {label:"Silt / Loam",           T:18.0, q:15,  ok:true, desc:"Poor drainage (16–32 min)" },
  {label:"Clay loam / Silt clay", T:40.0, q:5,   ok:false, desc:"Very poor (>32 min) – marginal" },
  {label:"Clay (unsuitable)",     T:99.0, q:0,   ok:false, desc:"Not suitable for infiltration" },
  {label:"Manual (perc. test)",   T:null, q:null,ok:true,  desc:"Enter results from ASTM D6391 test" },
];

const EDU = {
  Qd:  "Design flow (Qd) = occupants × daily rate × return coefficient. Coefficient C (0.75–0.85) is the fraction of water returning to the system; rest is lost to evapotranspiration and other uses.",
  Vl:  "Liquid volume (Vl) = flow × hydraulic retention time (HRT). HRT varies with temperature: warmer = faster anaerobic digestion = shorter HRT needed. Cold climates require longer retention.",
  Vs:  "Sludge volume (Vs) = occupants × sludge rate (kg/person/year) × years between pumpings. Rate increases in cold climates where digestion is slower.",
  Vn:  "Scum volume (Vn) is the floating layer of grease and light materials. Typically 25–30% of liquid volume; must be included in total tank design.",
  OVL: "Organic volumetric loading (OVL) = (BOD₅ in × daily flow) / tank volume. Maximum safe: 0.30 kg BOD₅/m³·day. Above this, anaerobic digestion becomes overloaded.",
  SRT: "Solids retention time (SRT) = sludge volume / daily sludge production (days). Minimum 20 days ensures microorganisms have time for complete digestion. If SRT < 20d, sludge accumulates faster.",
  Inf: "Leach field absorbs septic tank effluent. Area = daily flow / soil infiltration rate (from percolation test). If soil is poor, field becomes very large or secondary treatment needed.",
};

const computeNorm = (normKey, users, dotacion, retCoef, temp, cleanYears, depth) => {
  const p=getParams(normKey,temp);
  const Qd=users*dotacion*retCoef/1000;
  const Vl=Qd*p.trhDays, Vs=users*p.sludgeRate*cleanYears/1000, Vn=p.scumFactor*Vl;
  let Vtot=Vl+Vs+Vn; const minA=Vtot<p.minVolume; if(minA)Vtot=p.minVolume;
  const Area=Vtot/depth, W=Math.sqrt(Area/2), L=2*W;
  const Gs=users*p.sludgeRate/365/1000, SRT=Gs>0?Vs/Gs:0;
  const chambers=users>50||Vtot>10?3:users>5||Vtot>2?2:1;
  return {Vl,Vs,Vn,Vtot,L,W,SRT,minA,trhDays:p.trhDays,chambers,tempLabel:p.tempLabel};
};

const fmt  = (v, d=2) => Number(v).toFixed(d);
const fmtI = (v)      => Math.round(v);

// ─── Arrow marker helper ──────────────────────────────────────────────────────
const ArrowMarkers = () => (
  <defs>
    <marker id="arrowE" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#2a5070"/>
    </marker>
    <marker id="arrowW" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
      <path d="M6,0 L0,3 L6,6 Z" fill="#2a5070"/>
    </marker>
    <marker id="arrowS" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
      <path d="M0,0 L3,6 L6,0 Z" fill="#2a5070"/>
    </marker>
    <marker id="arrowN" markerWidth="6" markerHeight="6" refX="3" refY="1" orient="auto">
      <path d="M0,6 L3,0 L6,6 Z" fill="#2a5070"/>
    </marker>
    <pattern id="crossHatch" patternUnits="userSpaceOnUse" width="6" height="6">
      <line x1="0" y1="6" x2="6" y2="0" stroke="#1e3a55" strokeWidth="0.7"/>
    </pattern>
    <pattern id="dots" patternUnits="userSpaceOnUse" width="5" height="5">
      <circle cx="2" cy="2" r="0.7" fill="#2a4a60"/>
    </pattern>
  </defs>
);

// ─── Dimension line helper ────────────────────────────────────────────────────
const DimLine = ({x1,y1,x2,y2,label,offset=0,orient="h",color="#2a5070"}) => {
  const isH = orient==="h";
  const ox = isH ? 0 : offset;
  const oy = isH ? offset : 0;
  const mx = (x1+x2)/2+ox, my = (y1+y2)/2+oy;
  const tick = 5;
  return (
    <g>
      <line x1={x1+ox} y1={y1+oy} x2={x2+ox} y2={y2+oy} stroke={color} strokeWidth="0.8"
        markerStart={isH?"url(#arrowW)":"url(#arrowN)"}
        markerEnd={isH?"url(#arrowE)":"url(#arrowS)"}/>
      {isH ? (
        <>
          <line x1={x1} y1={y1} x2={x1+ox} y2={y1+oy} stroke={color} strokeWidth="0.5" strokeDasharray="2,2"/>
          <line x1={x2} y1={y2} x2={x2+ox} y2={y2+oy} stroke={color} strokeWidth="0.5" strokeDasharray="2,2"/>
          <text x={mx} y={my-3} fill={color} fontSize="7" textAnchor="middle" fontFamily="monospace">{label}</text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1} x2={x1+ox} y2={y1+oy} stroke={color} strokeWidth="0.5" strokeDasharray="2,2"/>
          <line x1={x2} y1={y2} x2={x2+ox} y2={y2+oy} stroke={color} strokeWidth="0.5" strokeDasharray="2,2"/>
          <text x={mx-4} y={my} fill={color} fontSize="7" textAnchor="end" fontFamily="monospace"
            transform={`rotate(-90,${mx-4},${my})`}>{label}</text>
        </>
      )}
    </g>
  );
};

// ─── Corte transversal detallado ──────────────────────────────────────────────
function DetailedSchematic({ r, freeboard }) {
  const W=640, H=340;
  const ML=90, MR=72, MT=52, MB=68;
  const tW=W-ML-MR, tH=H-MT-MB;
  const x0=ML, y0=MT;

  // Zone heights (proportional to actual volumes)
  const Area = r.Vtot / r.depth;
  const hNata  = r.Vn / Area;
  const hLiq   = r.Vl / Area;
  const hSludge= r.Vs / Area;
  const hBuf   = Math.max(r.depth - hNata - hLiq - hSludge, 0);
  const totalD = r.depth + freeboard;

  // SVG y-coordinates (y increases downward)
  const scaleY = tH / totalD;
  const yWater = y0 + freeboard * scaleY;       // water surface
  const yNataB = yWater + hNata * scaleY;       // bottom of scum zone
  const yLiqB  = yNataB + hLiq * scaleY;        // bottom of liquid zone
  const ySludB = yLiqB + hSludge * scaleY;      // bottom of sludge zone
  const yBot   = y0 + tH;                        // tank bottom

  // Chamber dividers
  const div1 = r.chambers>=2 ? x0+tW*(r.chambers===3?0.5:2/3) : null;
  const div2 = r.chambers===3 ? x0+tW*0.75 : null;

  // T-pipes
  const subIn  = Math.min(0.30 * scaleY, (yLiqB-yNataB)*0.7); // 30cm submergence in SVG px
  const subOut = Math.min(0.40 * scaleY, (yLiqB-yNataB)*0.8); // 40cm
  const pipeY_in  = yNataB;
  const pipeY_out = yNataB + 4;
  const pipeD  = fmtI(r.dPipe*1000);
  const ventD  = fmtI(r.dVent*1000);
  const ventXs = [x0+28, ...(div1?[div1+28]:[]), ...(div2?[div2+28]:[])];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{display:"block",margin:"14px 0 0",background:"rgba(0,0,0,0.12)",borderRadius:"6px"}}>
      <ArrowMarkers/>

      {/* Title */}
      <text x={x0+tW/2} y={14} fill="#4a7fa5" fontSize="8" textAnchor="middle" fontFamily="monospace" letterSpacing="2">CORTE LONGITUDINAL — FOSA SÉPTICA</text>

      {/* Ground surface */}
      <line x1={x0-30} y1={y0} x2={x0+tW+30} y2={y0} stroke="#3a7050" strokeWidth="1.2" strokeDasharray="8,4"/>
      <text x={x0-32} y={y0+4} fill="#3a7050" fontSize="6" textAnchor="end" fontFamily="monospace">NTT</text>
      {/* Ground hatch below line */}
      {[0,6,12,18,24].map(i=>(
        <line key={i} x1={x0-30+i*14} y1={y0} x2={x0-30+i*14-8} y2={y0+8} stroke="#2a5040" strokeWidth="0.7"/>
      ))}
      {[0,6,12,18].map(i=>(
        <line key={i} x1={x0+tW+i*14} y1={y0} x2={x0+tW+i*14-8} y2={y0+8} stroke="#2a5040" strokeWidth="0.7"/>
      ))}

      {/* Freeboard zone */}
      <rect x={x0} y={y0} width={tW} height={yWater-y0} fill="rgba(20,60,100,0.3)" stroke="none"/>
      <text x={x0+tW-6} y={y0+(yWater-y0)/2+3} fill="#3a5070" fontSize="6" textAnchor="end" fontFamily="monospace">BL = {fmt(freeboard)}m</text>

      {/* Water surface line */}
      <line x1={x0} y1={yWater} x2={x0+tW} y2={yWater} stroke="#00d4ff" strokeWidth="1" strokeDasharray="8,3" opacity="0.6"/>
      <text x={x0-4} y={yWater+4} fill="#00d4ff" fontSize="6" textAnchor="end" fontFamily="monospace">NL</text>

      {/* Natas zone */}
      <rect x={x0+1} y={yWater} width={tW-2} height={yNataB-yWater} fill="rgba(180,140,50,0.20)"/>
      <text x={x0+tW/2} y={(yWater+yNataB)/2+4} fill="#9a8040" fontSize="7" textAnchor="middle" fontFamily="monospace">
        NATAS (Vn) — {fmt(r.Vn)} m³ — h ≈ {fmt(hNata,2)} m
      </text>

      {/* Liquid zone */}
      <rect x={x0+1} y={yNataB} width={tW-2} height={yLiqB-yNataB} fill="rgba(0,140,200,0.09)"/>
      <text x={x0+tW/2} y={(yNataB+yLiqB)/2+4} fill="#3a7fa5" fontSize="7" textAnchor="middle" fontFamily="monospace">
        LIQUID ZONE (Vl) — {fmt(r.Vl)} m³ — HRT = {r.p.trhDays} days — h ≈ {fmt(hLiq,2)} m
      </text>

      {/* Sludge zone */}
      <rect x={x0+1} y={yLiqB} width={tW-2} height={ySludB-yLiqB} fill="rgba(100,65,30,0.25)"/>
      <text x={x0+tW/2} y={(yLiqB+ySludB)/2+4} fill="#7a5030" fontSize="7" textAnchor="middle" fontFamily="monospace">
        SLUDGE (Vs) — {fmt(r.Vs)} m³ — {r.p.sludgeRate} L/person·year — h ≈ {fmt(hSludge,2)} m
      </text>

      {/* Buffer zone (if min volume applied) */}
      {hBuf > 0.01 && (
        <rect x={x0+1} y={ySludB} width={tW-2} height={yBot-ySludB} fill="rgba(30,100,80,0.08)"/>
      )}

      {/* Tank walls */}
      <rect x={x0} y={y0} width={tW} height={tH} fill="none" stroke="#2a6090" strokeWidth="2.5" rx="2"/>

      {/* Chamber dividers */}
      {div1 && (
        <g>
          <rect x={div1-4} y={y0} width={8} height={tH} fill="url(#crossHatch)" stroke="#1e4060" strokeWidth="1"/>
          <text x={(x0+div1)/2} y={y0+16} fill="#4a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">
            CHAMBER 1 — {fmt(r.chambers===3?r.L*0.5:r.L*2/3)}m
          </text>
          <text x={div2?(div1+div2)/2:div1+(x0+tW-div1)/2} y={y0+16} fill="#4a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">
            CHAMBER 2 — {fmt(r.chambers===3?r.L*0.25:r.L*1/3)}m
          </text>
        </g>
      )}
      {div2 && (
        <g>
          <rect x={div2-4} y={y0} width={8} height={tH} fill="url(#crossHatch)" stroke="#1e4060" strokeWidth="1"/>
          <text x={(div2+x0+tW)/2} y={y0+16} fill="#4a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">
            CHAMBER 3 — {fmt(r.L*0.25)}m
          </text>
        </g>
      )}
      {r.chambers===1 && (
        <text x={x0+tW/2} y={y0+16} fill="#4a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">SINGLE CHAMBER</text>
      )}

      {/* ── T-pipe ENTRADA ── */}
      <line x1={x0-36} y1={pipeY_in} x2={x0} y2={pipeY_in} stroke="#00d4ff" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1={x0} y1={pipeY_in} x2={x0} y2={pipeY_in+subIn} stroke="#00d4ff" strokeWidth="3.5" strokeLinecap="round"/>
      {/* arrow */}
      <polygon points={`${x0-36},${pipeY_in-4} ${x0-24},${pipeY_in} ${x0-36},${pipeY_in+4}`} fill="#00d4ff"/>
      <text x={x0-38} y={pipeY_in-6} fill="#00d4ff" fontSize="7" textAnchor="end" fontFamily="monospace">INLET</text>
      <text x={x0-38} y={pipeY_in+6} fill="#4a7fa5" fontSize="6" textAnchor="end" fontFamily="monospace">Ø{pipeD}mm</text>
      {/* submergence annotation */}
      <line x1={x0+6} y1={pipeY_in} x2={x0+6} y2={pipeY_in+subIn} stroke="#00a0c0" strokeWidth="0.8" strokeDasharray="2,2"
        markerStart="url(#arrowN)" markerEnd="url(#arrowS)"/>
      <text x={x0+9} y={pipeY_in+subIn/2+3} fill="#3a8090" fontSize="6" fontFamily="monospace">12" (30cm)</text>

      {/* ── T-pipe OUTLET ── */}
      <line x1={x0+tW} y1={pipeY_out+5} x2={x0+tW+36} y2={pipeY_out+5} stroke="#4ab0c0" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1={x0+tW} y1={pipeY_out+5} x2={x0+tW} y2={pipeY_out+5+subOut} stroke="#4ab0c0" strokeWidth="3.5" strokeLinecap="round"/>
      <polygon points={`${x0+tW+36},${pipeY_out+1} ${x0+tW+24},${pipeY_out+5} ${x0+tW+36},${pipeY_out+9}`} fill="#4ab0c0"/>
      <text x={x0+tW+38} y={pipeY_out-1} fill="#4ab0c0" fontSize="7" fontFamily="monospace">OUTLET</text>
      <text x={x0+tW+38} y={pipeY_out+11} fill="#4a7fa5" fontSize="6" fontFamily="monospace">Ø{pipeD}mm</text>
      <line x1={x0+tW-6} y1={pipeY_out+5} x2={x0+tW-6} y2={pipeY_out+5+subOut} stroke="#2a8090" strokeWidth="0.8" strokeDasharray="2,2"
        markerStart="url(#arrowN)" markerEnd="url(#arrowS)"/>
      <text x={x0+tW-8} y={pipeY_out+5+subOut/2+3} fill="#3a8090" fontSize="6" textAnchor="end" fontFamily="monospace">40 cm</text>

      {/* ── Ventilaciones ── */}
      {ventXs.map((vx,i)=>(
        <g key={i}>
          <rect x={vx-3} y={y0-30} width={6} height={30} fill="rgba(60,100,120,0.3)" stroke="#3a6080" strokeWidth="1" rx="1"/>
          <rect x={vx-5} y={y0-32} width={10} height={4} fill="#3a6080" rx="1"/>
          <text x={vx} y={y0-36} fill="#3a6080" fontSize="6" textAnchor="middle" fontFamily="monospace">Ø{ventD}</text>
          <text x={vx} y={y0-28} fill="#2a5060" fontSize="5" textAnchor="middle" fontFamily="monospace">VENT</text>
        </g>
      ))}

      {/* ── COTAS ── */}
      {/* Total depth (far left) */}
      <DimLine x1={x0} y1={y0} x2={x0} y2={yBot} label={`H=${fmt(r.hT)}m`} offset={-60} orient="v" color="#3a6080"/>
      {/* Useful depth (left) */}
      <DimLine x1={x0} y1={yWater} x2={x0} y2={yBot} label={`h=${fmt(r.depth)}m`} offset={-35} orient="v" color="#2a7090"/>
      {/* Freeboard (left, small) */}
      <DimLine x1={x0} y1={y0} x2={x0} y2={yWater} label={`FB=${fmt(freeboard)}m`} offset={-35} orient="v" color="#2a5060"/>
      {/* Length (bottom) */}
      <DimLine x1={x0} y1={yBot} x2={x0+tW} y2={yBot} label={`L = ${fmt(r.L)} m`} offset={28} orient="h" color="#3a6080"/>
      {/* Width label */}
      <text x={x0+tW/2} y={yBot+50} fill="#2a5070" fontSize="7" textAnchor="middle" fontFamily="monospace">
        W = {fmt(r.W)} m   ·   Area = {fmt(r.Vtot/r.depth,2)} m²
      </text>

      {/* Zone height annotations (right side) */}
      <DimLine x1={x0+tW} y1={yWater} x2={x0+tW} y2={yNataB} label={`${fmt(hNata,2)}m`} offset={48} orient="v" color="#7a6030"/>
      <DimLine x1={x0+tW} y1={yNataB} x2={x0+tW} y2={yLiqB}  label={`${fmt(hLiq,2)}m`}  offset={48} orient="v" color="#2a6080"/>
      <DimLine x1={x0+tW} y1={yLiqB}  x2={x0+tW} y2={ySludB}  label={`${fmt(hSludge,2)}m`} offset={48} orient="v" color="#6a4020"/>

    </svg>
  );
}

// ─── Perfil hidráulico ────────────────────────────────────────────────────────
function HydraulicProfile({ r, freeboard }) {
  const W=640, H=260;
  const ML=70, MR=30, MT=36, MB=52;
  const pW=W-ML-MR, pH=H-MT-MB;
  const x0=ML, y0=MT;

  // Zone heights in meters
  const Area    = r.Vtot / r.depth;
  const hSludge = r.Vs / Area;
  const hLiq    = r.Vl / Area;
  const hNata   = r.Vn / Area;

  // Elevations (reference: bottom of tank = 0.0m)
  const elBot   = 0;
  const elSludS = hSludge;                  // top of sludge
  const elLiqS  = hSludge + hLiq;           // top of liquid zone
  const elWS    = hSludge + hLiq + hNata;   // water surface ≈ r.depth
  const elTop   = r.depth + freeboard;      // top of tank

  // T-pipe inverts
  const elInletInv  = elWS - 0.30;  // 30cm below WS
  const elOutletInv = elWS - 0.40;  // 40cm below WS

  // Inlet pipe upstream elevation (slightly higher, hydraulic gradient)
  const elInletUpstream = elWS + 0.05; // 5cm above WS (headloss)

  // Scale
  const elMax = elTop + 0.3;
  const elMin = elBot - 0.15;
  const elRange = elMax - elMin;
  const toY = (el) => y0 + pH - (el - elMin) / elRange * pH;
  const toX = (f)  => x0 + pW * f;

  // Key horizontal positions
  const xInPipe   = toX(0.04);
  const xInWall   = toX(0.12);
  const xCh1      = r.chambers>=2 ? toX(r.chambers===3?0.48:0.56) : null;
  const xCh2      = r.chambers===3 ? toX(0.74) : null;
  const xOutWall  = toX(0.88);
  const xOutPipe  = toX(0.96);

  // Gradient line points
  const gradPoints = [
    [xInPipe,  toY(elInletUpstream)],
    [xInWall,  toY(elWS)],
    ...(xCh1 ? [[xCh1, toY(elWS-0.02)]] : []),
    ...(xCh2 ? [[xCh2, toY(elWS-0.04)]] : []),
    [xOutWall, toY(elWS-0.05)],
    [xOutPipe, toY(elOutletInv)],
  ];
  const gradPath = gradPoints.map((p,i)=>`${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ");

  // Elevation grid lines
  const gridEls = [];
  for (let el=Math.ceil(elMin*4)/4; el<=elMax; el+=0.25) gridEls.push(el);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{display:"block",margin:"14px 0 0",background:"rgba(0,0,0,0.12)",borderRadius:"6px"}}>
      <ArrowMarkers/>

      {/* Title */}
      <text x={x0+pW/2} y={14} fill="#4a7fa5" fontSize="8" textAnchor="middle" fontFamily="monospace" letterSpacing="2">PERFIL HIDRÁULICO LONGITUDINAL</text>
      <text x={x0+pW/2} y={24} fill="#2a5070" fontSize="6" textAnchor="middle" fontFamily="monospace">Referencia: fondo de la fosa = 0.00 m</text>

      {/* Grid */}
      {gridEls.map((el,i)=>(
        <g key={i}>
          <line x1={x0} y1={toY(el)} x2={x0+pW} y2={toY(el)} stroke="#0d2035" strokeWidth="0.5"/>
          <text x={x0-4} y={toY(el)+3} fill="#2a4a60" fontSize="6" textAnchor="end" fontFamily="monospace">{fmt(el,2)}</text>
        </g>
      ))}

      {/* Y-axis label */}
      <text x={x0-52} y={y0+pH/2} fill="#3a6080" fontSize="7" textAnchor="middle" fontFamily="monospace"
        transform={`rotate(-90,${x0-52},${y0+pH/2})`}>Cota (m)</text>

      {/* Zones background */}
      {/* Sludge */}
      <rect x={xInWall} y={toY(elSludS)} width={xOutWall-xInWall} height={toY(elBot)-toY(elSludS)}
        fill="rgba(100,65,30,0.25)" stroke="none"/>
      {/* Liquid */}
      <rect x={xInWall} y={toY(elLiqS)} width={xOutWall-xInWall} height={toY(elSludS)-toY(elLiqS)}
        fill="rgba(0,140,200,0.09)" stroke="none"/>
      {/* Natas */}
      <rect x={xInWall} y={toY(elWS)} width={xOutWall-xInWall} height={toY(elLiqS)-toY(elWS)}
        fill="rgba(180,140,50,0.20)" stroke="none"/>
      {/* Freeboard */}
      <rect x={xInWall} y={toY(elTop)} width={xOutWall-xInWall} height={toY(elWS)-toY(elTop)}
        fill="rgba(20,60,100,0.25)" stroke="none"/>

      {/* Tank walls */}
      <rect x={xInWall} y={toY(elTop)} width={xOutWall-xInWall} height={toY(elBot)-toY(elTop)}
        fill="none" stroke="#2a6090" strokeWidth="2.5" rx="1"/>
      {/* Tank floor fill */}
      <rect x={xInWall} y={toY(elBot)} width={xOutWall-xInWall} height={6} fill="#1e4060"/>

      {/* Chamber dividers */}
      {xCh1 && <rect x={xCh1-3} y={toY(elTop)} width={6} height={toY(elBot)-toY(elTop)} fill="rgba(30,64,96,0.6)" stroke="#2a5070" strokeWidth="1"/>}
      {xCh2 && <rect x={xCh2-3} y={toY(elTop)} width={6} height={toY(elBot)-toY(elTop)} fill="rgba(30,64,96,0.6)" stroke="#2a5070" strokeWidth="1"/>}

      {/* Water surface line */}
      <line x1={xInWall} y1={toY(elWS)} x2={xOutWall} y2={toY(elWS)}
        stroke="#00d4ff" strokeWidth="1.2" strokeDasharray="6,3" opacity="0.7"/>

      {/* Hydraulic gradient line */}
      <path d={gradPath} fill="none" stroke="#ff8c00" strokeWidth="1.8" strokeDasharray="5,3" opacity="0.9"/>
      <text x={xInPipe+2} y={toY(elInletUpstream)-5} fill="#ff8c00" fontSize="6" fontFamily="monospace">LGH</text>

      {/* Inlet pipe */}
      <line x1={xInPipe} y1={toY(elInletUpstream)} x2={xInWall} y2={toY(elInletInv)}
        stroke="#00d4ff" strokeWidth="4" strokeLinecap="round"/>
      <polygon points={`${xInPipe-2},${toY(elInletUpstream)-4} ${xInPipe+10},${toY(elInletUpstream)} ${xInPipe-2},${toY(elInletUpstream)+4}`} fill="#00d4ff"/>
      {/* T-pipe vertical inlet */}
      <line x1={xInWall} y1={toY(elInletInv)} x2={xInWall} y2={toY(elInletInv-0.30)}
        stroke="#00d4ff" strokeWidth="4" strokeLinecap="round"/>
      <text x={xInPipe-2} y={toY(elInletUpstream)-8} fill="#00d4ff" fontSize="6" textAnchor="middle" fontFamily="monospace">IN</text>

      {/* Outlet pipe */}
      <line x1={xOutWall} y1={toY(elOutletInv)} x2={xOutPipe} y2={toY(elOutletInv-0.02)}
        stroke="#4ab0c0" strokeWidth="4" strokeLinecap="round"/>
      <polygon points={`${xOutPipe+2},${toY(elOutletInv-0.02)-4} ${xOutPipe-10},${toY(elOutletInv-0.02)} ${xOutPipe+2},${toY(elOutletInv-0.02)+4}`} fill="#4ab0c0"/>
      {/* T-pipe vertical outlet */}
      <line x1={xOutWall} y1={toY(elOutletInv)} x2={xOutWall} y2={toY(elOutletInv-0.40)}
        stroke="#4ab0c0" strokeWidth="4" strokeLinecap="round"/>
      <text x={xOutPipe+2} y={toY(elOutletInv-0.02)-8} fill="#4ab0c0" fontSize="6" fontFamily="monospace">OUT</text>

      {/* Elevation annotations */}
      {[
        {el:elWS,    label:`NL = ${fmt(elWS,2)} m`, color:"#00d4ff"},
        {el:elSludS, label:`Lodos = ${fmt(elSludS,2)} m`, color:"#7a5030"},
        {el:elInletInv, label:`Inv. in = ${fmt(elInletInv,2)} m`, color:"#3a9aaa"},
        {el:elOutletInv,label:`Inv. out = ${fmt(elOutletInv,2)} m`, color:"#2a8090"},
      ].map((a,i)=>(
        <g key={i}>
          <line x1={xOutWall+2} y1={toY(a.el)} x2={x0+pW} y2={toY(a.el)} stroke={a.color} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5"/>
          <text x={x0+pW+2} y={toY(a.el)+3} fill={a.color} fontSize="5.5" fontFamily="monospace">{a.label}</text>
        </g>
      ))}

      {/* Zone labels */}
      <text x={(xInWall+xOutWall)/2} y={toY(elBot)+14} fill="#5a3520" fontSize="6" textAnchor="middle" fontFamily="monospace">SLUDGE ({fmt(hSludge,2)}m)</text>
      <text x={(xInWall+(xCh1||xOutWall))/2} y={toY(elSludS+hLiq/2)+3} fill="#3a7fa5" fontSize="6" textAnchor="middle" fontFamily="monospace">LIQUID ZONE ({fmt(hLiq,2)}m)</text>
      <text x={(xInWall+xOutWall)/2} y={toY(elLiqS+hNata/2)+3} fill="#9a8040" fontSize="6" textAnchor="middle" fontFamily="monospace">SCUM ({fmt(hNata,2)}m)</text>
      <text x={(xInWall+xOutWall)/2} y={toY(elWS+freeboard/2)+3} fill="#3a5070" fontSize="6" textAnchor="middle" fontFamily="monospace">FREEBOARD ({fmt(freeboard,2)}m)</text>

      {/* Legend */}
      <line x1={x0} y1={y0+pH+38} x2={x0+18} y2={y0+pH+38} stroke="#ff8c00" strokeWidth="1.5" strokeDasharray="4,2"/>
      <text x={x0+20} y={y0+pH+41} fill="#ff8c00" fontSize="6" fontFamily="monospace">Energy Grade Line (EGL)</text>
      <line x1={x0+130} y1={y0+pH+38} x2={x0+148} y2={y0+pH+38} stroke="#00d4ff" strokeWidth="1.2" strokeDasharray="5,2"/>
      <text x={x0+150} y={y0+pH+41} fill="#00d4ff" fontSize="6" fontFamily="monospace">Water Level (WL)</text>
    </svg>
  );
}

// ─── Estilos — Design System HMI Cyberpunk ───────────────────────────────────
const C = {
  // ── Layout ──
  root:      {display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",overflow:"hidden",fontFamily:"'IBM Plex Mono',monospace",background:"#020C10",color:"#E8F8FF"},
  hdr:       {flexShrink:0,borderBottom:"1px solid rgba(0,245,255,0.10)",padding:"0 24px",height:"52px",display:"flex",alignItems:"center",gap:"14px",background:"rgba(2,12,16,0.9)",boxShadow:"0 1px 32px rgba(0,0,0,0.6)"},
  layout:    {flex:1,display:"flex",overflow:"hidden"},

  // ── Sidebar ──
  side:      {width:"280px",flexShrink:0,borderRight:"1px solid rgba(0,245,255,0.08)",overflowY:"auto",display:"flex",flexDirection:"column",background:"rgba(4,24,32,0.6)"},
  sideInner: {padding:"10px 14px",flex:1},
  slab:      {fontSize:"8px",letterSpacing:"0.16em",textTransform:"uppercase",color:"#4A7A8A",marginBottom:"5px",marginTop:"10px",fontWeight:"700"},
  calcWrap:  {padding:"10px 14px",borderTop:"1px solid rgba(0,245,255,0.08)",background:"rgba(2,12,16,0.5)",flexShrink:0},

  // ── Panel principal ──
  main:      {flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  tabBar:    {flexShrink:0,borderBottom:"1px solid rgba(0,245,255,0.08)",display:"flex",padding:"0 20px",gap:"2px",background:"rgba(2,12,16,0.4)"},
  tabBtn:    (a)=>({padding:"10px 18px",border:"none",borderBottom:a?"2px solid #00F5FF":"2px solid transparent",marginBottom:"-1px",background:a?"rgba(0,245,255,0.06)":"none",color:a?"#00F5FF":"#4A7A8A",cursor:"pointer",fontSize:"10px",fontFamily:"inherit",fontWeight:a?"600":"400",whiteSpace:"nowrap",letterSpacing:"0.06em",transition:"color 0.15s,background 0.15s"}),
  content:   {flex:1,overflowY:"auto",padding:"20px 28px"},

  // ── Estado vacío ──
  empty:     {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:"10px"},

  // ── Header typography ──
  logo:      {fontSize:"18px",fontWeight:"900",color:"#00F5FF",fontFamily:"'Orbitron',sans-serif",textShadow:"0 0 16px rgba(0,245,255,0.4)"},
  lsub:      {fontSize:"8px",color:"#4A7A8A",letterSpacing:"0.16em",textTransform:"uppercase"},
  badge:     {marginLeft:"auto",fontSize:"8px",color:"#4A7A8A",letterSpacing:"0.12em",textTransform:"uppercase",border:"1px solid rgba(0,245,255,0.12)",padding:"3px 12px",borderRadius:"3px"},

  // ── Separadores de sección ──
  sec:       {fontSize:"9px",letterSpacing:"0.16em",textTransform:"uppercase",color:"#4A7A8A",marginBottom:"12px",marginTop:"22px",display:"flex",alignItems:"center",gap:"10px",fontWeight:"700"},
  ln:        {flex:1,height:"1px",background:"linear-gradient(90deg,rgba(0,245,255,0.15),transparent)"},

  // ── Sidebar inputs ──
  ig:        {display:"flex",flexDirection:"column",gap:"3px"},
  lbl:       {fontSize:"9px",color:"#4A7A8A",fontWeight:"600",letterSpacing:"0.06em"},
  inp:       {background:"rgba(4,24,32,0.9)",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"4px",padding:"5px 8px",color:"#E8F8FF",fontSize:"12px",fontFamily:"'IBM Plex Mono',monospace",width:"100%",boxSizing:"border-box",outline:"none",transition:"border-color 0.2s"},
  sel:       {background:"rgba(4,24,32,0.9)",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"4px",padding:"5px 8px",color:"#E8F8FF",fontSize:"11px",fontFamily:"inherit",width:"100%",boxSizing:"border-box",outline:"none",transition:"border-color 0.2s"},
  inote:     {fontSize:"8px",color:"#4A7A8A",lineHeight:"1.3"},

  // ── Grids ──
  g2:        {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"},
  g3:        {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"},
  g4:        {display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"12px"},

  // ── Botones tipo uso ──
  utg:       {display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"5px"},
  utb:       (a)=>({background:a?"rgba(0,255,136,0.08)":"rgba(4,24,32,0.6)",border:a?"1.5px solid rgba(0,255,136,0.35)":"1px solid rgba(0,245,255,0.08)",borderRadius:"6px",padding:"6px 4px",cursor:"pointer",color:a?"#00FF88":"#4A7A8A",textAlign:"center",transition:"all 0.15s"}),

  // ── Botones norma ──
  ngn:       {display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"5px"},
  nbn:       (a)=>({background:a?"rgba(0,245,255,0.07)":"rgba(4,24,32,0.6)",border:a?"1.5px solid rgba(0,245,255,0.35)":"1px solid rgba(0,245,255,0.08)",borderRadius:"6px",padding:"6px",cursor:"pointer",color:a?"#00F5FF":"#4A7A8A",textAlign:"center",transition:"all 0.15s"}),

  // ── Cards de resultado ──
  card:      {background:"#041820",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"10px",padding:"16px 20px",marginBottom:"12px",position:"relative",overflow:"hidden"},
  ri:        (hi)=>({background:hi?"rgba(0,245,255,0.05)":"rgba(4,24,32,0.8)",border:"1px solid rgba(0,245,255,0.12)",borderLeft:hi?"3px solid #00F5FF":"3px solid rgba(0,245,255,0.12)",borderRadius:"8px",padding:"12px 14px",textAlign:"center"}),
  rv:        (hi)=>({fontSize:"26px",fontWeight:"700",color:hi?"#00F5FF":"#6ac8e8",lineHeight:1.1,fontFamily:"'Orbitron',sans-serif"}),
  ru:        {fontSize:"9px",color:"#4A7A8A",marginTop:"3px",letterSpacing:"0.06em"},
  rl:        {fontSize:"9px",color:"#4A7A8A",marginTop:"5px",lineHeight:"1.4"},

  // ── Barra de dimensiones ──
  dr:        {display:"flex",gap:"14px",flexWrap:"wrap",alignItems:"center",background:"rgba(0,245,255,0.03)",border:"1px solid rgba(0,245,255,0.10)",borderRadius:"8px",padding:"12px 16px",marginBottom:"12px"},
  db:        {textAlign:"center"},
  dl:        {fontSize:"8px",color:"#4A7A8A",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"2px"},
  dv:        {fontSize:"17px",fontWeight:"700",color:"#00F5FF",fontFamily:"'Orbitron',sans-serif"},

  // ── Checks ──
  ck:        (ok)=>({display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",marginBottom:"4px",background:ok?"rgba(0,255,136,0.04)":"rgba(255,176,32,0.04)",border:`1px solid ${ok?"rgba(0,255,136,0.15)":"rgba(255,176,32,0.15)"}`,borderLeft:`3px solid ${ok?"#00FF88":"#FFB020"}`,borderRadius:"6px"}),
  ci:        (ok)=>({fontSize:"13px",color:ok?"#00FF88":"#FFB020",fontWeight:"700",minWidth:"16px",flexShrink:0}),
  ct:        {color:"#E8F8FF",flex:1,fontSize:"11px"},
  cv:        (ok)=>({background:ok?"rgba(0,255,136,0.12)":"rgba(255,176,32,0.12)",color:ok?"#00FF88":"#FFB020",fontWeight:"600",fontSize:"10px",fontFamily:"'IBM Plex Mono',monospace",padding:"2px 8px",borderRadius:"20px",whiteSpace:"nowrap",flexShrink:0}),

  // ── KPI cards ──
  kpi:       {background:"#041820",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"8px",padding:"12px",textAlign:"center"},
  kv:        (c)=>({fontSize:"22px",fontWeight:"700",color:c||"#00F5FF",fontFamily:"'Orbitron',sans-serif",lineHeight:1.1}),
  ku:        {fontSize:"9px",color:"#4A7A8A",marginTop:"3px",letterSpacing:"0.06em"},
  kl:        {fontSize:"9px",color:"#4A7A8A",marginTop:"5px",lineHeight:"1.4"},

  // ── Tuberías ──
  pr:        {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"},
  pc:        {background:"rgba(0,245,255,0.03)",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"8px",padding:"12px 14px"},
  pt:        {fontSize:"9px",color:"#4A7A8A",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"6px"},
  pv:        {fontSize:"18px",fontWeight:"700",color:"#00F5FF",fontFamily:"'Orbitron',sans-serif"},
  ps:        {fontSize:"9px",color:"#4A7A8A",marginTop:"3px",lineHeight:"1.4"},

  // ── Efluente ──
  er:        {display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:"12px",marginBottom:"10px"},
  eb:        (c)=>({background:`rgba(${c},0.05)`,border:`1px solid rgba(${c},0.14)`,borderRadius:"8px",padding:"12px",textAlign:"center"}),
  ev:        {fontSize:"22px",fontWeight:"700",fontFamily:"'Orbitron',sans-serif"},
  el:        {fontSize:"9px",color:"#4A7A8A",marginTop:"3px"},
  ea:        {color:"#4A7A8A",fontSize:"18px",textAlign:"center"},

  // ── Misceláneos ──
  tag:       (c)=>({display:"inline-block",background:`rgba(${c},0.07)`,border:`1px solid rgba(${c},0.2)`,borderRadius:"20px",padding:"2px 10px",fontSize:"10px",color:`rgb(${c})`,marginRight:"6px",fontWeight:"600"}),
  warn:      {marginTop:"10px",padding:"9px 13px",background:"rgba(255,176,32,0.04)",border:"1px solid rgba(255,176,32,0.15)",borderLeft:"3px solid #FFB020",borderRadius:"6px",fontSize:"10px",color:"#FFB020",lineHeight:"1.6"},
  fml:       {padding:"14px 16px",background:"rgba(4,24,32,0.9)",border:"1px solid rgba(0,245,255,0.10)",borderRadius:"8px",fontSize:"10px",color:"#4A7A8A",lineHeight:"2.0",fontFamily:"'IBM Plex Mono',monospace"},
  eduBox:    {marginTop:"8px",padding:"10px 14px",background:"rgba(0,255,136,0.03)",border:"1px solid rgba(0,255,136,0.12)",borderLeft:"3px solid rgba(0,255,136,0.4)",borderRadius:"6px",fontSize:"10px",color:"#00FF88",lineHeight:"1.7"},
  tbl:       {width:"100%",borderCollapse:"collapse",fontSize:"11px"},
  th:        {padding:"8px 12px",borderBottom:"1px solid rgba(0,245,255,0.10)",color:"#4A7A8A",textAlign:"right",fontWeight:"600"},
  th0:       {padding:"8px 12px",borderBottom:"1px solid rgba(0,245,255,0.10)",color:"#4A7A8A",textAlign:"left",fontWeight:"600"},
  td:        {padding:"7px 12px",borderBottom:"1px solid rgba(4,24,32,0.8)",color:"#7ab8c8",textAlign:"right"},
  td0:       {padding:"7px 12px",borderBottom:"1px solid rgba(4,24,32,0.8)",color:"#4A7A8A",textAlign:"left"},
  tdHi:      {padding:"7px 12px",borderBottom:"1px solid rgba(4,24,32,0.8)",color:"#00F5FF",fontWeight:"700",textAlign:"right"},
  tBtn:      (a,c)=>({padding:"7px 14px",background:a?`rgba(${c},0.1)`:"rgba(4,24,32,0.6)",border:a?`1px solid rgba(${c},0.3)`:"1px solid rgba(0,245,255,0.08)",borderRadius:"20px",cursor:"pointer",color:a?`rgb(${c})`:"#4A7A8A",fontSize:"10px",fontFamily:"inherit",fontWeight:a?"600":"400",transition:"all 0.15s"}),
  pBtn:      {padding:"7px 18px",background:"transparent",border:"1px solid rgba(0,245,255,0.3)",borderRadius:"20px",cursor:"pointer",color:"#00F5FF",fontSize:"10px",fontFamily:"inherit",fontWeight:"600",transition:"all 0.2s"},
  foot:      {textAlign:"center",fontSize:"8px",color:"#4A7A8A",marginTop:"24px",letterSpacing:"0.1em",paddingBottom:"16px"},
};

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
    if (typeof window !== "undefined") {
      localStorage.setItem("hydrostack_formstate", JSON.stringify(formState));
    }
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
