// ─── Norm tables ─────────────────────────────────────────────────────────────
// Dotación (L/person/day) — daily per-capita water consumption by norm and use

const DOTACION = {
  ras:   { vivienda: 200, hospedaje: 150, hotel: 300, vacacional: 120, restaurante: 70,  oficinas: 60, institucional: 50, otro: 200 },
  epa:   { vivienda: 284, hospedaje: 210, hotel: 400, vacacional: 170, restaurante: 95,  oficinas: 90, institucional: 75, otro: 284 },
  cte:   { vivienda: 200, hospedaje: 150, hotel: 280, vacacional: 120, restaurante: 70,  oficinas: 60, institucional: 50, otro: 200 },
  asnzs: { vivienda: 200, hospedaje: 150, hotel: 280, vacacional: 120, restaurante: 70,  oficinas: 60, institucional: 50, otro: 200 },
  uk:    { vivienda: 200, hospedaje: 150, hotel: 280, vacacional: 120, restaurante: 70,  oficinas: 60, institucional: 50, otro: 200 },
};

// Hydraulic retention time (days) — Tiempo de retención hidráulica
const RETENTION = {
  ras:   { vivienda: 1.5, hospedaje: 1.0, hotel: 1.0, vacacional: 1.5, restaurante: 1.0, oficinas: 1.0, institucional: 1.0, otro: 1.5 },
  epa:   { vivienda: 2.0, hospedaje: 1.5, hotel: 1.5, vacacional: 2.0, restaurante: 1.5, oficinas: 1.5, institucional: 1.5, otro: 2.0 },
  cte:   { vivienda: 3.0, hospedaje: 2.0, hotel: 2.0, vacacional: 3.0, restaurante: 2.0, oficinas: 2.0, institucional: 2.0, otro: 3.0 },
  asnzs: { vivienda: 2.0, hospedaje: 1.5, hotel: 1.5, vacacional: 2.0, restaurante: 1.5, oficinas: 1.5, institucional: 1.5, otro: 2.0 },
  uk:    { vivienda: 2.0, hospedaje: 1.5, hotel: 1.5, vacacional: 2.0, restaurante: 1.5, oficinas: 1.5, institucional: 1.5, otro: 2.0 },
};

// Minimum tank volume (liters) by norm
const MIN_TANK_L = { ras: 1500, epa: 3785, cte: 2000, asnzs: 2000, uk: 2700 };

// Soil absorption rate (L/m²/day)
const SOIL_RATE = { high: 60, medium: 30, low: 12, unknown: 20 };

// Normative label for display
export const NORM_LABEL = {
  ras:   "RAS 2000 — Título E",
  epa:   "EPA Onsite Wastewater",
  cte:   "CTE DB-HS 5",
  asnzs: "AS/NZS 1547:2012",
  uk:    "BS EN 12566-3",
};

// ─── Main calculation ─────────────────────────────────────────────────────────

export function calculateSepticSystem({ personas, tipoUso, norm, suelo }) {
  const n     = Number(personas);
  const nKey  = norm   in DOTACION    ? norm   : "ras";
  const uKey  = tipoUso in DOTACION[nKey] ? tipoUso : "vivienda";
  const sKey  = suelo  in SOIL_RATE   ? suelo  : "unknown";

  // ── Daily flow
  const dotacion = DOTACION[nKey][uKey];       // L/person/day
  const qDaily   = dotacion * n;               // L/day

  // ── Tank volume
  const tr       = RETENTION[nKey][uKey];      // days
  const vLiq     = qDaily * tr;                // L — liquid retention
  const vSludge  = n * 50 * 3;                 // L — sludge (50 L/p·yr × 3 yr)
  const vCalc    = vLiq + vSludge;
  const vMin     = MIN_TANK_L[nKey] || 1500;
  const vTankL   = Math.max(vCalc, vMin);
  const vTankM3  = vTankL / 1000;

  // ── Tank dimensions  (L:W = 3:1, H = 1.40 m)
  const H = 1.40;
  const W = r2(Math.sqrt(vTankM3 / (H * 3)));
  const L = r2(3 * W);

  // ── Drainage field
  const kSoil         = SOIL_RATE[sKey];               // L/m²/day
  const aField        = r2((qDaily / kSoil) * 1.2);    // m² with 20 % safety
  const trenchW       = 0.60;                           // m
  const totalTrLen    = aField / trenchW;               // m
  const nTrenches     = Math.max(1, Math.ceil(totalTrLen / 30));
  const trenchLen     = r2(totalTrLen / nTrenches);

  // ── Warnings
  const warnings = [];
  if (sKey === "low")     warnings.push("clay_soil");
  if (sKey === "unknown") warnings.push("unknown_soil");
  if (n > 100)            warnings.push("large_system");

  return {
    norm:      nKey,
    normLabel: NORM_LABEL[nKey],
    personas:  n,
    tipoUso:   uKey,
    dotacion,
    qDaily:    Math.round(qDaily),
    tr,
    tank: {
      volumeL:  Math.round(vTankL),
      volumeM3: r2(vTankM3),
      dims:     { L, W, H },
    },
    field: {
      area:       aField,
      soilRate:   kSoil,
      nTrenches,
      trenchLen,
      trenchW,
    },
    warnings,
  };
}

function r2(n) { return Math.round(n * 100) / 100; }
