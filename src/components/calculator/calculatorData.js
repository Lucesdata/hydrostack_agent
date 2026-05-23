// Calculator reference data and pure helpers.
// Numeric per-norm cost factors (sludge rate, retention, dimensional minimums)
// are read from the shared NormativeRegistry so this engine and the agent's
// calculate_septic_tank tool cannot drift apart.

import { getNormative } from "@/src/lib/config/normativeRegistry";

// Calculator UI norm codes ↔ canonical NormativeRegistry codes.
// (The calculator inherited shorter "au"/"esp" codes; the registry uses
// "asnzs"/"cte" everywhere else.)
const CALC_TO_REGISTRY = { epa: "epa", uk: "uk", au: "asnzs", esp: "cte", ras: "ras" };

const NORMS = {
  epa: { name:"EPA (USA)",           flag:"🇺🇸", ref:"EPA 625/R-06/003",     dotacion:75, unit:"GPD/bed" },
  uk:  { name:"UK Building Regs",    flag:"🇬🇧", ref:"UK Part H",            dotacion:200, unit:"L/person/day" },
  au:  { name:"AS/NZS 1547 (AU/NZ)", flag:"🇦🇺", ref:"AS/NZS 1547:2012",     dotacion:200, unit:"L/person/day" },
  esp: { name:"Spain (CTE)",         flag:"🇪🇸", ref:"CTE DB-HS5",           dotacion:160, unit:"L/person/day" },
  ras: { name:"Colombia (RAS)",      flag:"🇨🇴", ref:"RAS 2017 Título J",    dotacion:120, unit:"L/person/day" },
};

const getParams = (norm, temp) => {
  const code = CALC_TO_REGISTRY[norm] ?? "epa";
  const d = getNormative(code).defaults;
  return {
    trhDays:    d.retentionDays(temp),
    sludgeRate: d.sludgeRate(temp),
    scumFactor: d.scumFactor,
    minVolume:  d.minVolumeM3,
    minDepth:   d.minDepthM,
    minWidth:   d.minWidthM,
    minLength:  d.minLengthM,
    tempLabel:  d.tempLabel(temp),
  };
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

export { NORMS, getParams, USE_TYPES, SOILS, EDU, computeNorm, fmt, fmtI };
