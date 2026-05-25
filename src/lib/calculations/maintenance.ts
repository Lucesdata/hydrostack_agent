/**
 * Pure calculation functions for septic system maintenance planning.
 *
 * Fase 5 — Calculadora de mantenimiento:
 * - Pumping schedule with alarm status
 * - Drainage field clogging risk (by years of operation + soil type)
 * - Inspection checklist items
 */

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type SoilType =
  | 'grava'           // Gravel / coarse sand — 20-25 yr
  | 'arena_media'     // Medium sand — 18-22 yr
  | 'arena_fina'      // Fine sand — 15-18 yr
  | 'limo_franco'     // Sandy loam / silt loam — 12-16 yr
  | 'arcilla_franca'  // Clay loam — 8-12 yr
  | 'arcilla';        // Clay — 5-8 yr (often unsuitable)

export type AlertLevel = 'ok' | 'proximo' | 'urgente' | 'vencido';
export type RiskLevel  = 'bajo' | 'moderado' | 'alto' | 'critico';

export interface MaintenanceInput {
  /** ISO date string "YYYY-MM-DD" of system installation */
  fecha_instalacion: string;
  /** Pumping interval in years (1–5, default 3) */
  intervalo_limpieza_anos: number;
  /** Number of permanent residents */
  usuarios: number;
  /** Tank volume in liters (optional, used for context) */
  volumen_tanque_l?: number;
  /** Soil type — used for drainage field clogging risk */
  tipo_suelo?: SoilType;
  /** Years the drainage field has been in operation (defaults to years since install) */
  anos_campo_operacion?: number;
}

export interface PumpingEvent {
  numero: number;
  fecha_iso: string;
  fecha_display: string;
  estado: 'completado' | 'proximo' | 'futuro';
  /** Positive = days in the future; negative = days overdue; null if far future */
  dias_restantes: number | null;
}

export interface PumpingSchedule {
  fecha_instalacion_display: string;
  fecha_primer_vaciado_display: string;
  eventos: PumpingEvent[];
  proximo_vaciado: PumpingEvent | null;
  dias_para_proximo: number | null;
  alerta: AlertLevel;
  /** User-facing message */
  mensaje_alerta: string;
}

export interface CloggingRisk {
  tipo_suelo: SoilType;
  anos_operacion: number;
  vida_util_min_anos: number;
  vida_util_max_anos: number;
  vida_util_media_anos: number;
  anos_restantes_estimados: number;
  porcentaje_vida_util: number; // 0–100+
  riesgo: RiskLevel;
  mensaje: string;
  recomendacion: string;
}

export interface InspectionItem {
  id: string;
  categoria: string;
  descripcion: string;
  criterio: string;
  accion_si_falla: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

/** Expected service life range (years) by soil type — Crites & Tchobanoglous */
const VIDA_UTIL: Record<SoilType, { min: number; max: number }> = {
  grava:          { min: 20, max: 30 },
  arena_media:    { min: 18, max: 25 },
  arena_fina:     { min: 15, max: 20 },
  limo_franco:    { min: 12, max: 18 },
  arcilla_franca: { min:  8, max: 14 },
  arcilla:        { min:  5, max:  9 },
};

const SOIL_LABELS: Record<SoilType, string> = {
  grava:          'Grava / Arena gruesa',
  arena_media:    'Arena media',
  arena_fina:     'Arena fina',
  limo_franco:    'Limo / Franco arenoso',
  arcilla_franca: 'Arcilla franca / Limo arcilloso',
  arcilla:        'Arcilla (marginalmente apto)',
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ─────────────────────────────────────────────────────────────────────────
// Pumping schedule
// ─────────────────────────────────────────────────────────────────────────

export function calculatePumpingSchedule(
  input: Pick<MaintenanceInput, 'fecha_instalacion' | 'intervalo_limpieza_anos'>
): PumpingSchedule {
  const install    = parseDate(input.fecha_instalacion);
  const interval   = Math.max(1, Math.min(5, input.intervalo_limpieza_anos));
  const today      = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate 6 pumping events from install date
  const eventos: PumpingEvent[] = [];
  for (let i = 1; i <= 6; i++) {
    const fecha = addYears(install, interval * i);
    const diasRestantes = daysBetween(today, fecha);

    let estado: PumpingEvent['estado'];
    if (diasRestantes < -14) {
      estado = 'completado';
    } else if (diasRestantes <= 365) {
      estado = 'proximo';
    } else {
      estado = 'futuro';
    }

    eventos.push({
      numero: i,
      fecha_iso: fecha.toISOString().slice(0, 10),
      fecha_display: formatDate(fecha),
      estado,
      dias_restantes: estado === 'completado' ? null : diasRestantes,
    });
  }

  // Find the next upcoming event (smallest positive or least-negative)
  const upcomingEvents = eventos.filter(e => e.dias_restantes !== null);
  const proximo = upcomingEvents.length > 0
    ? upcomingEvents.reduce((a, b) =>
        (a.dias_restantes! < b.dias_restantes!) ? a : b
      )
    : null;

  const dias = proximo?.dias_restantes ?? null;

  // Alert level
  let alerta: AlertLevel;
  let mensaje_alerta: string;

  if (dias === null) {
    alerta = 'ok';
    mensaje_alerta = 'Todos los vaciados programados se han completado. Continuar con el intervalo establecido.';
  } else if (dias < 0) {
    alerta = 'vencido';
    mensaje_alerta = `Vaciado VENCIDO hace ${Math.abs(dias)} días. Llamar al servicio de limpieza urgente.`;
  } else if (dias <= 30) {
    alerta = 'urgente';
    mensaje_alerta = `Vaciado en ${dias} días. Contactar empresa de limpieza esta semana.`;
  } else if (dias <= 90) {
    alerta = 'proximo';
    mensaje_alerta = `Próximo vaciado en ${dias} días. Planificar con anticipación.`;
  } else {
    alerta = 'ok';
    mensaje_alerta = `Próximo vaciado en ${dias} días (${proximo!.fecha_display}). Sin acción inmediata requerida.`;
  }

  return {
    fecha_instalacion_display: formatDate(install),
    fecha_primer_vaciado_display: formatDate(addYears(install, interval)),
    eventos,
    proximo_vaciado: proximo,
    dias_para_proximo: dias,
    alerta,
    mensaje_alerta,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Drainage field clogging risk
// ─────────────────────────────────────────────────────────────────────────

export function calculateCloggingRisk(
  input: Pick<MaintenanceInput, 'fecha_instalacion' | 'tipo_suelo' | 'anos_campo_operacion'>
): CloggingRisk {
  const soil = input.tipo_suelo ?? 'arena_fina';
  const vidaUtil = VIDA_UTIL[soil];
  const media = (vidaUtil.min + vidaUtil.max) / 2;

  // Years of field operation
  let anosOp = input.anos_campo_operacion;
  if (anosOp === undefined) {
    const install = parseDate(input.fecha_instalacion);
    anosOp = Math.max(0, (Date.now() - install.getTime()) / (365.25 * 86_400_000));
  }
  anosOp = Math.round(anosOp * 10) / 10;

  const pct = Math.round((anosOp / media) * 100);
  const anosRestantes = Math.max(0, Math.round(media - anosOp));

  let riesgo: RiskLevel;
  let mensaje: string;
  let recomendacion: string;

  if (pct < 50) {
    riesgo = 'bajo';
    mensaje = `El campo de infiltración ha usado el ${pct}% de su vida útil estimada. Sin señales de colmatación en esta etapa.`;
    recomendacion = 'Mantener inspecciones anuales. Evitar raíces sobre el campo. No verter grasas ni sólidos al sistema.';
  } else if (pct < 75) {
    riesgo = 'moderado';
    mensaje = `El campo ha superado el ${pct}% de su vida útil estimada. La tasa de infiltración puede empezar a reducirse.`;
    recomendacion = 'Programar inspección de campo con ingeniero sanitario. Evaluar si el efluente cumple Res. 0631/2015. Considerar dosificación de bacterias anaeróbicas para extender vida útil.';
  } else if (pct < 90) {
    riesgo = 'alto';
    mensaje = `Campo en el ${pct}% de vida útil. Alta probabilidad de colmatación parcial. Monitorear encharcamientos superficiales.`;
    recomendacion = 'Contratar evaluación técnica urgente. Medir permeabilidad residual in-situ. Planificar rehabilitación: descanso rotacional, subsolado, o ampliación del campo.';
  } else {
    riesgo = 'critico';
    mensaje = `Campo en o próximo al 100% de su vida útil estimada. Riesgo de fallo inminente.`;
    recomendacion = 'Sustituir o rehabilitar el campo de infiltración de inmediato. Contactar SDA/CAR para permiso de modificación del SITARD. Evaluar tecnologías alternativas (montículo, humedal construido).';
  }

  return {
    tipo_suelo: soil,
    anos_operacion: anosOp,
    vida_util_min_anos: vidaUtil.min,
    vida_util_max_anos: vidaUtil.max,
    vida_util_media_anos: media,
    anos_restantes_estimados: anosRestantes,
    porcentaje_vida_util: pct,
    riesgo,
    mensaje,
    recomendacion,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Inspection checklist
// ─────────────────────────────────────────────────────────────────────────

export function getInspectionChecklist(): InspectionItem[] {
  return [
    {
      id: 'tapas',
      categoria: 'Estructura',
      descripcion: 'Tapas de acceso en buen estado',
      criterio: 'Sin grietas, con pernos o anclaje, sin riesgo de caída accidental',
      accion_si_falla: 'Reemplazar tapa dañada. Instalar tapa con bloqueo si hay riesgo de acceso de menores.',
    },
    {
      id: 'ventilacion',
      categoria: 'Estructura',
      descripcion: 'Tubo de ventilación libre',
      criterio: 'Sin obstrucciones (hojas, nidos, tapas cerradas). Altura ≥ 0.50 m sobre terreno',
      accion_si_falla: 'Limpiar obstrucción. Extender tubo si es necesario. Sin ventilación, el sistema genera gases y presuriza mal.',
    },
    {
      id: 'nivel_lodos',
      categoria: 'Lodos',
      descripcion: 'Nivel de lodos dentro del límite',
      criterio: 'Capa de lodos < 50% del volumen útil. Medir con vara de sondeo (paño blanco atado)',
      accion_si_falla: 'Programar vaciado con empresa de limpieza certificada. No verter lodos en campo sin tratamiento.',
    },
    {
      id: 'natas',
      categoria: 'Lodos',
      descripcion: 'Capa de natas controlada',
      criterio: 'Capa flotante < 30% del volumen. Debe quedar espacio libre entre natas y tapa de salida',
      accion_si_falla: 'Incluir en el vaciado. Reducir vertimiento de grasas y aceites al sistema.',
    },
    {
      id: 'efluente',
      categoria: 'Efluente',
      descripcion: 'Efluente claro sin sólidos',
      criterio: 'Salida translúcida, sin sólidos flotantes ni olor intenso de H₂S',
      accion_si_falla: 'Sólidos en efluente indican colmatación de tabiques o sobrecarga hidráulica. Inspeccionar deflectores internos.',
    },
    {
      id: 'olores',
      categoria: 'Efluente',
      descripcion: 'Sin olores excesivos en superficie',
      criterio: 'Olor leve tolerable; olor fuerte a H₂S o amoníaco es señal de fallo',
      accion_si_falla: 'Verificar ventilación del tanque. Si persiste, evaluar carga orgánica y posible sobrecarga del sistema.',
    },
    {
      id: 'campo_superficie',
      categoria: 'Campo de infiltración',
      descripcion: 'Sin encharcamiento superficial',
      criterio: 'Ninguna zona del campo debe mostrar agua superficial o suelo saturado',
      accion_si_falla: 'Encharcamiento indica colmatación o N.F. alto temporal. Suspender uso si persiste > 48h. Consultar ingeniero.',
    },
    {
      id: 'campo_vegetacion',
      categoria: 'Campo de infiltración',
      descripcion: 'Vegetación adecuada sobre el campo',
      criterio: 'Solo pasto o plantas herbáceas. Sin árboles ni arbustos de raíz profunda a < 3 m',
      accion_si_falla: 'Remover árboles o instalar barrera de raíces (geomembrana HDPE) si hay árboles inamovibles.',
    },
    {
      id: 'tuberia_entrada',
      categoria: 'Conexiones',
      descripcion: 'Tubería de entrada sin fugas',
      criterio: 'Sin escapes en uniones, collarines o codos de entrada. Pendiente visible hacia el tanque',
      accion_si_falla: 'Reparar fugas inmediatamente. Fugas externas pueden contaminar suelo y agua superficial.',
    },
    {
      id: 'tuberia_salida',
      categoria: 'Conexiones',
      descripcion: 'Tubería de salida y distribución en buen estado',
      criterio: 'Sin obstrucciones, colapso de tubería o entrada de raíces. Caja de distribución (si existe) sin sedimentos',
      accion_si_falla: 'Limpiar con hidrojetting. Revisar posibles daños por raíces. Reemplazar tramos dañados.',
    },
    {
      id: 'distancias',
      categoria: 'Distancias de seguridad',
      descripcion: 'Distancias normativas mantenidas',
      criterio: 'Ninguna edificación, pozo o cuerpo de agua se ha acercado al sistema (Res. 0330/2017 Art. 143)',
      accion_si_falla: 'Documentar infracción. Informar a autoridad ambiental si hay captación de agua comprometida.',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// Soil label export
// ─────────────────────────────────────────────────────────────────────────

export { SOIL_LABELS, VIDA_UTIL };
