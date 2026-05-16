// Pure infiltration-field / soakaway sizing logic — extracted from
// components/SepticTankCalculator.jsx (runCalc, lines ~611-614 and SOILS table).

const SOILS = {
  gravel:      { label_es: "Grava / Arena gruesa", label_en: "Gravel / Coarse sand", T_min_per_cm: 0.5,  q_l_m2_day: 80, ok: true  },
  sand:        { label_es: "Arena",                label_en: "Sand",                 T_min_per_cm: 2.0,  q_l_m2_day: 60, ok: true  },
  loamy_sand:  { label_es: "Arena limosa",         label_en: "Loamy sand",           T_min_per_cm: 5.0,  q_l_m2_day: 40, ok: true  },
  sandy_loam:  { label_es: "Limo arenoso",         label_en: "Sandy loam",           T_min_per_cm: 10.0, q_l_m2_day: 25, ok: true  },
  loam:        { label_es: "Limo / Franco",        label_en: "Loam",                 T_min_per_cm: 18.0, q_l_m2_day: 15, ok: true  },
  silty_clay:  { label_es: "Arcilla limosa",       label_en: "Silty clay",           T_min_per_cm: 30.0, q_l_m2_day: 8,  ok: true  },
  clay:        { label_es: "Arcilla (no apto)",    label_en: "Clay (not suitable)",  T_min_per_cm: 99.0, q_l_m2_day: 0,  ok: false },
};

export const SOIL_KEYS = Object.keys(SOILS);

const TRENCH_WIDTH_M = 0.6;        // typical trench width
const PERC_T_OK_MAX  = 30;         // min/cm threshold above which soil is not suitable

/**
 * Size an infiltration field (soakaway trenches) for a SITARD effluent.
 *
 * @param {Object} input
 * @param {number} [input.Qd_m3_day]          Daily wastewater flow (m³/day). If omitted,
 *                                            computed from users × dotacion × return_coef.
 * @param {number} [input.users]              Equivalent inhabitants (used if Qd_m3_day omitted).
 * @param {number} [input.dotacion_lpd=160]   Per-capita demand (L/person/day).
 * @param {number} [input.return_coef=0.80]   Wastewater return coefficient.
 * @param {string} [input.soil_type]          One of: gravel, sand, loamy_sand, sandy_loam,
 *                                            loam, silty_clay, clay, manual.
 * @param {number} [input.perc_test_min_per_cm] Percolation test result (min/cm). Required when
 *                                            soil_type = "manual".
 * @param {number} [input.trench_width_m=0.6] Trench width for length estimation.
 */
export function evaluateSoilInfiltration(input) {
  const trenchW = numDef(input?.trench_width_m, TRENCH_WIDTH_M);

  // Resolve flow Qd
  let Qd = num(input?.Qd_m3_day);
  let qdSource = "direct";
  if (!Number.isFinite(Qd) || Qd <= 0) {
    const users    = num(input?.users);
    const dotacion = numDef(input?.dotacion_lpd, 160);
    const retCoef  = clamp(numDef(input?.return_coef, 0.80), 0.5, 1);
    if (!Number.isFinite(users) || users <= 0) {
      return {
        ok: false,
        error: "Need either Qd_m3_day or users (positive number) to size the infiltration field.",
      };
    }
    Qd = (users * dotacion * retCoef) / 1000;
    qdSource = "from_users";
  }

  // Resolve soil and hydraulic rate q (L/m²·day)
  const soilType = (input?.soil_type ?? "").toString();
  let q_inf;
  let soilOk;
  let soilLabelEs;
  let soilLabelEn;
  let percT;

  if (soilType === "manual") {
    percT = num(input?.perc_test_min_per_cm);
    if (!Number.isFinite(percT) || percT <= 0) {
      return {
        ok: false,
        error: "soil_type='manual' requires perc_test_min_per_cm > 0 (minutes per cm).",
      };
    }
    // EPA-style approximation: q = min(70/√T, 80) L/m²·day
    q_inf  = Math.min(70 / Math.sqrt(Math.max(percT, 0.1)), 80);
    soilOk = percT <= PERC_T_OK_MAX;
    soilLabelEs = "Test de percolación in situ";
    soilLabelEn = "On-site percolation test";
  } else if (SOILS[soilType]) {
    const s = SOILS[soilType];
    q_inf       = s.q_l_m2_day;
    soilOk      = s.ok;
    soilLabelEs = s.label_es;
    soilLabelEn = s.label_en;
    percT       = s.T_min_per_cm;
  } else {
    return {
      ok: false,
      error: `Unknown soil_type '${soilType}'. Valid: ${SOIL_KEYS.join(", ")}, or 'manual' with perc_test_min_per_cm.`,
    };
  }

  if (!soilOk || q_inf <= 0) {
    return {
      ok: true,
      inputs: {
        Qd_m3_day: round(Qd, 3),
        qd_source: qdSource,
        soil_type: soilType,
        perc_test_min_per_cm: round(percT, 1),
        trench_width_m: trenchW,
      },
      soil: {
        type: soilType,
        label_es: soilLabelEs,
        label_en: soilLabelEn,
        q_l_m2_day: round(q_inf, 1),
        T_min_per_cm: round(percT, 1),
        suitable: false,
      },
      results: null,
      recommendations: [
        "Suelo no apto para infiltración directa por baja permeabilidad.",
        "Alternativa: filtro de arena, humedal artificial o vertido controlado a cauce (consultar normativa local).",
        "Si hay duda, repetir el test de percolación en al menos 3 puntos del terreno.",
      ],
    };
  }

  const A_inf  = (Qd * 1000) / q_inf;        // m² (Qd m³/d × 1000 = L/d  ÷  L/m²·d)
  const L_tren = A_inf / trenchW;            // m of trench at the given width

  // Practical recommendations
  const recs = [];
  if (percT > 18) {
    recs.push("Permeabilidad baja: considera aumentar el área de seguridad un 25–50 % o evaluar humedal artificial como alternativa.");
  }
  if (L_tren > 60) {
    recs.push(`Longitud total (${round(L_tren, 1)} m) elevada: divide en varias zanjas paralelas con distribuidor para repartir el caudal.`);
  }
  if (percT <= 5) {
    recs.push("Suelo muy permeable: verifica la separación a pozos de captación (≥ 30 m en CTE DB-HS 5) y a freático (≥ 1 m por debajo del fondo).");
  }
  if (recs.length === 0) {
    recs.push("Distribución correcta: usa zanjas paralelas de 0.6 m de ancho y profundidad 0.6–0.9 m, con grava 20–40 mm y tubería ranurada DN 100.");
  }

  return {
    ok: true,
    inputs: {
      Qd_m3_day: round(Qd, 3),
      qd_source: qdSource,
      soil_type: soilType,
      perc_test_min_per_cm: round(percT, 1),
      trench_width_m: trenchW,
    },
    soil: {
      type: soilType,
      label_es: soilLabelEs,
      label_en: soilLabelEn,
      q_l_m2_day: round(q_inf, 1),
      T_min_per_cm: round(percT, 1),
      suitable: true,
    },
    results: {
      A_inf_m2:        round(A_inf, 2),
      L_trenches_m:    round(L_tren, 1),
      n_trenches_25m:  Math.max(1, Math.ceil(L_tren / 25)),
      hydraulic_rate_l_m2_day: round(q_inf, 1),
    },
    recommendations: recs,
  };
}

function num(v)           { return typeof v === "number" ? v : Number(v); }
function numDef(v, d)     { const n = num(v); return Number.isFinite(n) ? n : d; }
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
function round(v, d = 2)  { const f = Math.pow(10, d); return Math.round(v * f) / f; }
