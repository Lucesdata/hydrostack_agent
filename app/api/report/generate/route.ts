/**
 * POST /api/report/generate
 *
 * Direct PDF report generation from the /build wizard — no LLM involved.
 *
 * Translates the client-side form state (saved by SepticTankCalculator) into
 * the inputs of the canonical tool executors, runs them, and produces the PDF.
 *
 * Body shape:
 *   {
 *     proyecto: { nombre, ubicacion, propietario?, redactor?, matricula?, numero_memoria?, fecha? },
 *     formState: object  // hydrostack_formstate contents from localStorage
 *   }
 */

import { NextResponse } from "next/server";
import {
  executeCalculateSepticTank,
  type ExecuteToolInput as SepticInput,
} from "@/src/lib/agent/tools/calculateSepticTank";
import {
  executeCalculateDrainageField,
  type ExecuteDrainageFieldInput,
} from "@/src/lib/agent/tools/calculateDrainageField";
import {
  executeValidateAgainstCte,
  type ExecuteValidateAgainstCteInput,
} from "@/src/lib/agent/tools/validateAgainstCte";
import { executeGeneratePdfReport } from "@/src/lib/agent/tools/generatePdfReport";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────
// FormState → tool input translators
//
// The septic calculator saves a wide formState. We pull only the fields the
// tool executors recognise. tipo_uso is not exposed in the calculator UI today
// so we default to vivienda_unifamiliar (the owner profile's primary case).
// ─────────────────────────────────────────────────────────────────────────

type FormState = {
  users?: number;
  dotacion?: number;
  retCoef?: number;
  temp?: number;
  cleanYears?: number;
  normKey?: string;
  soilPermeability?: "high" | "medium" | "low" | "none";
  // Geospatial
  distPozos?: number;
  distCuerpoAgua?: number;
  distEdific?: number;
  distArboles?: number;
  aguasAbajo?: boolean | string;
  nivelFreatico?: number;
  profInstal?: number;
};

function septicInputFromFormState(fs: FormState): SepticInput {
  return {
    habitantes_equivalentes: fs.users,
    tipo_uso: "vivienda_unifamiliar",
    dotacion_litros_hab_dia: fs.dotacion,
    coeficiente_retorno: fs.retCoef,
    temperatura_agua_c: fs.temp,
    intervalo_limpieza_anos: fs.cleanYears,
    norm_code: fs.normKey,
  };
}

const SOIL_TO_PERM_M_DIA: Record<string, number> = {
  // Indicative values that the drainage tool can size against. The validator
  // will flag if these conflict with the CTE/RAS thresholds.
  high: 1.0,
  medium: 0.3,
  low: 0.05,
  none: 0.0,
};

function drainageInputFromFormState(fs: FormState, dailyFlowL: number): ExecuteDrainageFieldInput | null {
  if (!dailyFlowL || dailyFlowL <= 0) return null;
  const perm = fs.soilPermeability ? SOIL_TO_PERM_M_DIA[fs.soilPermeability] : undefined;
  if (perm === undefined || perm <= 0) return null;
  return {
    caudal_diario_l: dailyFlowL,
    permeabilidad_suelo_m_dia: perm,
    tipo_sistema: "zanjas_filtrantes",
    nivel_freatico_m: fs.nivelFreatico,
    distancia_pozo_agua_m: fs.distPozos,
  };
}

function geoespacialFromFormState(fs: FormState): ExecuteValidateAgainstCteInput["geoespacial"] {
  const out: Record<string, unknown> = {};
  if (typeof fs.distPozos === "number") out.distancia_pozos_m = fs.distPozos;
  if (typeof fs.distCuerpoAgua === "number") out.distancia_cuerpo_agua_m = fs.distCuerpoAgua;
  if (typeof fs.distEdific === "number") out.distancia_edificaciones_m = fs.distEdific;
  if (typeof fs.distArboles === "number") out.distancia_arboles_m = fs.distArboles;
  if (typeof fs.aguasAbajo === "boolean") out.aguas_abajo_captaciones = fs.aguasAbajo;
  if (typeof fs.nivelFreatico === "number") out.nivel_freatico_medido_m = fs.nivelFreatico;
  if (typeof fs.profInstal === "number") out.profundidad_instalacion_m = fs.profInstal;
  return Object.keys(out).length ? (out as ExecuteValidateAgainstCteInput["geoespacial"]) : undefined;
}

// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: { proyecto?: unknown; formState?: FormState };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido — se esperaba JSON." }, { status: 400 });
  }

  const proyecto = body.proyecto as
    | { nombre?: string; ubicacion?: string; [k: string]: unknown }
    | undefined;
  const formState = body.formState;

  if (!proyecto?.nombre || !proyecto?.ubicacion) {
    return NextResponse.json(
      {
        error: "Faltan datos del proyecto.",
        missing_fields: [
          ...(!proyecto?.nombre ? ["proyecto.nombre"] : []),
          ...(!proyecto?.ubicacion ? ["proyecto.ubicacion"] : []),
        ],
      },
      { status: 400 },
    );
  }

  if (!formState || !formState.users) {
    return NextResponse.json(
      {
        error: "No hay cálculo de fosa séptica guardado. Completa el paso de Fosa antes de generar el informe.",
        missing_fields: ["formState.users"],
      },
      { status: 400 },
    );
  }

  // 1) Septic tank
  let septicResult;
  try {
    septicResult = await executeCalculateSepticTank(septicInputFromFormState(formState));
  } catch (e) {
    return NextResponse.json(
      { error: `Cálculo de fosa séptica falló: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  // 2) Drainage field (optional)
  let drainageResult;
  const dailyFlowL = (septicResult as { caudal_diario_l?: number; Q_diario_l?: number })?.caudal_diario_l
    ?? (septicResult as { Q_diario_l?: number })?.Q_diario_l
    ?? ((formState.users ?? 0) * (formState.dotacion ?? 200) * (formState.retCoef ?? 0.85));
  const drainageInput = drainageInputFromFormState(formState, dailyFlowL);
  if (drainageInput) {
    try {
      drainageResult = await executeCalculateDrainageField(drainageInput);
    } catch {
      // Drainage is best-effort — if it fails, continue with septic only.
      drainageResult = undefined;
    }
  }

  // 3) Validation
  let validationResult;
  try {
    validationResult = await executeValidateAgainstCte({
      septic_tank: septicResult,
      drainage_field: drainageResult,
      geoespacial: geoespacialFromFormState(formState),
      norm_code: formState.normKey,
    });
  } catch {
    validationResult = undefined;
  }

  // 4) PDF
  const pdf = await executeGeneratePdfReport({
    septic_tank: septicResult,
    drainage_field: drainageResult,
    validation: validationResult,
    proyecto: proyecto as Parameters<typeof executeGeneratePdfReport>[0]["proyecto"],
  });

  if ("error" in pdf) {
    return NextResponse.json(pdf, { status: 400 });
  }
  return NextResponse.json(pdf);
}
