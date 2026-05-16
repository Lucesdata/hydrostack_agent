// Pure septic-tank sizing logic — extracted from components/SepticTankCalculator.jsx.
// Used both by the UI calculator (eventually) and by Hydro_Agent's `size_septic_tank` tool.

export const NORMS = {
  ras: { name: "RAS Colombia", flag: "🇨🇴", ref: "Título J — RAS 2017",   dotacion: 120 },
  esp: { name: "España",       flag: "🇪🇸", ref: "NTE-ISD / CTE DB-HS 5",  dotacion: 160 },
  eu:  { name: "Europa",       flag: "🇪🇺", ref: "EN 12566-1",             dotacion: 150 },
  epa: { name: "EE.UU.",       flag: "🇺🇸", ref: "EPA Onsite Wastewater",  dotacion: 190 },
};

function getParams(norm, temp) {
  if (norm === "ras") {
    if (temp >= 20) return { trhDays: 1.5, sludgeRate: 40, scumFactor: 0.30, minVolume: 1.0, minDepth: 1.2, minWidth: 0.6,  minLength: 1.5, tempLabel: "T ≥ 20°C" };
    if (temp >= 10) return { trhDays: 2.0, sludgeRate: 50, scumFactor: 0.30, minVolume: 1.0, minDepth: 1.2, minWidth: 0.6,  minLength: 1.5, tempLabel: "T 10–19°C" };
    return            { trhDays: 2.5, sludgeRate: 60, scumFactor: 0.30, minVolume: 1.0, minDepth: 1.2, minWidth: 0.6,  minLength: 1.5, tempLabel: "T < 10°C" };
  }
  if (norm === "esp") {
    if (temp >= 15) return { trhDays: 1.0, sludgeRate: 50, scumFactor: 0.25, minVolume: 1.5, minDepth: 1.0, minWidth: 0.75, minLength: 1.5, tempLabel: "T ≥ 15°C" };
    return            { trhDays: 1.5, sludgeRate: 60, scumFactor: 0.25, minVolume: 1.5, minDepth: 1.0, minWidth: 0.75, minLength: 1.5, tempLabel: "T < 15°C" };
  }
  if (norm === "eu") {
    if (temp >= 15) return { trhDays: 2.0, sludgeRate: 55, scumFactor: 0.30, minVolume: 2.0, minDepth: 1.2, minWidth: 0.75, minLength: 1.5, tempLabel: "T ≥ 15°C" };
    if (temp >= 5)  return { trhDays: 3.0, sludgeRate: 70, scumFactor: 0.30, minVolume: 2.0, minDepth: 1.2, minWidth: 0.75, minLength: 1.5, tempLabel: "T 5–14°C" };
    return            { trhDays: 4.0, sludgeRate: 85, scumFactor: 0.30, minVolume: 2.0, minDepth: 1.2, minWidth: 0.75, minLength: 1.5, tempLabel: "T < 5°C" };
  }
  // epa
  if (temp >= 15) return { trhDays: 1.5, sludgeRate: 65, scumFactor: 0.25, minVolume: 3.785, minDepth: 1.0, minWidth: 0.9, minLength: 1.8, tempLabel: "T ≥ 15°C" };
  return            { trhDays: 2.0, sludgeRate: 80, scumFactor: 0.25, minVolume: 3.785, minDepth: 1.0, minWidth: 0.9, minLength: 1.8, tempLabel: "T < 15°C" };
}

/**
 * Size a single-family / community septic tank.
 *
 * @param {Object} input
 * @param {number} input.users          Equivalent inhabitants (required).
 * @param {"ras"|"esp"|"eu"|"epa"} [input.norm="esp"]  Regulatory standard.
 * @param {number} [input.temp_c=18]    Mean ambient temperature (°C).
 * @param {number} [input.dotacion_lpd] Per-capita water demand (L/person/day). Defaults to norm dotacion.
 * @param {number} [input.return_coef=0.80]  Wastewater return coefficient (0.75–0.85).
 * @param {number} [input.clean_years=2]      Sludge cleaning interval (years).
 * @param {number} [input.depth_m=1.5]        Effective liquid depth (m).
 */
export function sizeSepticTank(input) {
  const users      = num(input?.users);
  const norm       = (input?.norm && NORMS[input.norm]) ? input.norm : "esp";
  const temp       = numDef(input?.temp_c, 18);
  const retCoef    = clamp(numDef(input?.return_coef, 0.80), 0.5, 1);
  const cleanYears = clamp(numDef(input?.clean_years, 2), 0.5, 10);
  const depth      = clamp(numDef(input?.depth_m, 1.5), 0.8, 3);
  const dotacion   = numDef(input?.dotacion_lpd, NORMS[norm].dotacion);

  if (!Number.isFinite(users) || users <= 0) {
    return { ok: false, error: "users must be a positive number (equivalent inhabitants)" };
  }

  const p   = getParams(norm, temp);
  const Qd  = (users * dotacion * retCoef) / 1000;          // m³/day
  const Vl  = Qd * p.trhDays;                                // liquid volume
  const Vs  = (users * p.sludgeRate * cleanYears) / 1000;   // sludge volume
  const Vn  = p.scumFactor * Vl;                             // scum volume
  let   Vtot = Vl + Vs + Vn;
  const minApplied = Vtot < p.minVolume;
  if (minApplied) Vtot = p.minVolume;

  const Area = Vtot / depth;
  const W    = Math.sqrt(Area / 2);
  const L    = 2 * W;

  const Gs  = (users * p.sludgeRate) / 365 / 1000;          // m³/day sludge generation
  const SRT = Gs > 0 ? Vs / Gs : 0;                          // days

  const chambers = users > 50 || Vtot > 10 ? 3
                  : users > 5 || Vtot > 2   ? 2
                  : 1;

  return {
    ok: true,
    inputs: {
      users, norm, temp_c: temp, dotacion_lpd: dotacion,
      return_coef: retCoef, clean_years: cleanYears, depth_m: depth,
    },
    norm: {
      key: norm,
      name: NORMS[norm].name,
      flag: NORMS[norm].flag,
      ref: NORMS[norm].ref,
      temp_band: p.tempLabel,
    },
    params: {
      trh_days: p.trhDays,
      sludge_rate_l_pers_year: p.sludgeRate,
      scum_factor: p.scumFactor,
      min_volume_m3: p.minVolume,
    },
    results: {
      Q_AR_m3_day:  round(Qd, 3),
      Vl_m3:        round(Vl, 3),
      Vs_m3:        round(Vs, 3),
      Vn_m3:        round(Vn, 3),
      Vtot_m3:      round(Vtot, 3),
      Vtot_liters:  Math.round(Vtot * 1000),
      length_m:     round(L, 2),
      width_m:      round(W, 2),
      depth_m:      depth,
      area_m2:      round(Area, 2),
      chambers,
      SRT_days:     round(SRT, 1),
      min_volume_applied: minApplied,
    },
    checks: {
      depth_ok:  depth >= p.minDepth,
      width_ok:  W >= p.minWidth,
      length_ok: L >= p.minLength,
      srt_ok:    SRT >= 20,
    },
    notes: minApplied
      ? `El volumen calculado (${round(Vl + Vs + Vn, 2)} m³) está por debajo del mínimo normativo (${p.minVolume} m³); se aplica el mínimo.`
      : null,
  };
}

function num(v)              { return typeof v === "number" ? v : Number(v); }
function numDef(v, d)        { const n = num(v); return Number.isFinite(n) ? n : d; }
function clamp(v, lo, hi)    { return Math.min(Math.max(v, lo), hi); }
function round(v, d = 2)     { const f = Math.pow(10, d); return Math.round(v * f) / f; }
