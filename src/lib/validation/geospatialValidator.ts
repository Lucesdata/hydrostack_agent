/**
 * Geospatial constraints validator for septic systems (SITARD).
 *
 * Verifies minimum setback distances and site suitability per:
 *   Resolución 0330/2017 Art. 143–145 (Colombia)
 *   RAS 2000 Título E, Sección E.6 (technical reference)
 *
 * Returns structured OK / ALERTA / BLOQUEANTE results with alternative
 * technology suggestions when high water table makes standard infiltration
 * unfeasible.
 */

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type CheckEstado = 'OK' | 'ALERTA' | 'BLOQUEANTE';

export interface GeospatialInput {
  /** Distance from drainage field to nearest drinking water well (m). Min: 30 m. */
  distancia_pozos_m?: number;
  /** Distance from drainage field to nearest water body or ronda hídrica (m). Min: 30 m. */
  distancia_cuerpo_agua_m?: number;
  /** Distance from system components to buildings or property boundaries (m). Min: 5 m. */
  distancia_edificaciones_m?: number;
  /** Distance from drainage field to deep-rooted trees (m). Min: 3 m. */
  distancia_arboles_m?: number;
  /**
   * True if the system is located hydraulically DOWNSTREAM of all water supply intakes.
   * The drainage field must never be uphill from wells or springs that supply water.
   */
  aguas_abajo_captaciones?: boolean;
  /**
   * Measured depth to seasonal high water table from ground surface (m).
   * The bottom of any trench must be at least 1.20 m above the maximum water table.
   * Res. 0330/2017 Art. 144.
   */
  nivel_freatico_medido_m?: number;
  /**
   * Depth of drainage field installation from ground surface to bottom of trench (m).
   * Typical: 0.60–0.90 m for zanjas filtrantes.
   * Used to calculate clearance above water table.
   */
  profundidad_instalacion_m?: number;
}

export interface GeospatialCheck {
  parametro: string;
  valor_informado: string;
  minimo_requerido: string;
  norma: string;
  estado: CheckEstado;
  mensaje: string;
  sugerencia?: string;
}

export interface GeospatialResult {
  cumple: boolean;
  tiene_alertas: boolean;
  checks: GeospatialCheck[];
  /** Suggested alternative technologies when high water table makes standard infiltration unfeasible */
  alternativas_tecnologicas?: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Setback minimums — Res. 0330/2017 Art. 143–145
// ─────────────────────────────────────────────────────────────────────────

const MINIMOS = {
  distancia_pozos_m:         30,   // Art. 143 — contamination protection for supply wells
  distancia_cuerpo_agua_m:   30,   // Art. 144 — ronda hídrica and water bodies
  distancia_edificaciones_m:  5,   // Art. 143 — buildings and property limits
  distancia_arboles_m:        3,   // Art. 143 — deep-rooted trees (root damage + clogging)
  nivel_freatico_libre_m:   1.20,  // Art. 144 — clearance from bottom of trench to high N.F.
};

// ─────────────────────────────────────────────────────────────────────────
// Alternative technologies (when N.F. is too high or soil unsuitable)
// ─────────────────────────────────────────────────────────────────────────

const ALTERNATIVAS_NF_ALTO = [
  'Montículo filtrante (mound system) — eleva el campo sobre el terreno natural para crear distancia al N.F.',
  'FAFA + campo de dispersión somero — Filtro Anaerobio de Flujo Ascendente seguido de campo elevado sobre geomembrana.',
  'Humedal subsuperficial de flujo horizontal — trata el efluente sin infiltrar al suelo; descarga en cuerpo receptor con permiso.',
  'Pozo de absorción profunda con revestimiento filtrante — solo viable si hay suelo permeable por debajo del N.F. alto.',
];

// ─────────────────────────────────────────────────────────────────────────
// Main validation function
// ─────────────────────────────────────────────────────────────────────────

export function validateGeospatialConstraints(input: GeospatialInput): GeospatialResult {
  const checks: GeospatialCheck[] = [];
  let tiene_bloqueantes = false;
  let tiene_alertas = false;
  let sugiere_alternativas = false;

  // ── 1. Distance to supply wells ────────────────────────────────────────
  if (input.distancia_pozos_m !== undefined) {
    const val = input.distancia_pozos_m;
    const min = MINIMOS.distancia_pozos_m;
    let estado: CheckEstado;
    let mensaje: string;

    if (val >= min) {
      estado = 'OK';
      mensaje = `Distancia a pozos (${val} m) cumple el mínimo normativo (${min} m).`;
    } else if (val >= min * 0.7) {
      estado = 'ALERTA';
      tiene_alertas = true;
      mensaje = `Distancia a pozos (${val} m) inferior al mínimo (${min} m). Riesgo moderado de contaminación de captación.`;
    } else {
      estado = 'BLOQUEANTE';
      tiene_bloqueantes = true;
      mensaje = `Distancia a pozos (${val} m) muy inferior al mínimo (${min} m). BLOQUEANTE: riesgo grave de contaminación de captación de agua potable.`;
    }

    checks.push({
      parametro: 'Distancia a pozos de abastecimiento',
      valor_informado: `${val} m`,
      minimo_requerido: `${min} m`,
      norma: 'Res. 0330/2017 Art. 143',
      estado,
      mensaje,
      sugerencia: estado !== 'OK'
        ? 'Reubicar el campo de infiltración aguas abajo y lejos del pozo. Si no es posible, consultar tratamiento terciario.'
        : undefined,
    });
  }

  // ── 2. Distance to water bodies / ronda hídrica ───────────────────────
  if (input.distancia_cuerpo_agua_m !== undefined) {
    const val = input.distancia_cuerpo_agua_m;
    const min = MINIMOS.distancia_cuerpo_agua_m;
    let estado: CheckEstado;
    let mensaje: string;

    if (val >= min) {
      estado = 'OK';
      mensaje = `Distancia a cuerpo de agua (${val} m) cumple el mínimo (${min} m).`;
    } else {
      estado = 'BLOQUEANTE';
      tiene_bloqueantes = true;
      mensaje = `Distancia a cuerpo de agua o ronda hídrica (${val} m) inferior al mínimo (${min} m). Posible afectación de recurso hídrico superficial.`;
    }

    checks.push({
      parametro: 'Distancia a cuerpos de agua / ronda hídrica',
      valor_informado: `${val} m`,
      minimo_requerido: `${min} m`,
      norma: 'Res. 0330/2017 Art. 144',
      estado,
      mensaje,
      sugerencia: estado !== 'OK'
        ? 'Verificar con SDA / CAR la ronda de protección hídrica aplicable (Decreto 2245/2017). Puede requerirse tecnología de descarga cero.'
        : undefined,
    });
  }

  // ── 3. Distance to buildings and property boundaries ──────────────────
  if (input.distancia_edificaciones_m !== undefined) {
    const val = input.distancia_edificaciones_m;
    const min = MINIMOS.distancia_edificaciones_m;
    let estado: CheckEstado;
    let mensaje: string;

    if (val >= min) {
      estado = 'OK';
      mensaje = `Distancia a edificaciones (${val} m) cumple el mínimo (${min} m).`;
    } else {
      estado = 'BLOQUEANTE';
      tiene_bloqueantes = true;
      mensaje = `Distancia a edificaciones o linderos (${val} m) inferior al mínimo (${min} m). Riesgo de daño estructural y acceso a gases.`;
    }

    checks.push({
      parametro: 'Distancia a edificaciones y linderos',
      valor_informado: `${val} m`,
      minimo_requerido: `${min} m`,
      norma: 'Res. 0330/2017 Art. 143',
      estado,
      mensaje,
      sugerencia: estado !== 'OK'
        ? 'Reubicar el sistema. Si el predio es pequeño, evaluar tanque compacto + sistema de tratamiento alternativo.'
        : undefined,
    });
  }

  // ── 4. Distance to deep-rooted trees ──────────────────────────────────
  if (input.distancia_arboles_m !== undefined) {
    const val = input.distancia_arboles_m;
    const min = MINIMOS.distancia_arboles_m;
    let estado: CheckEstado;
    let mensaje: string;

    if (val >= min) {
      estado = 'OK';
      mensaje = `Distancia a árboles de raíz profunda (${val} m) cumple el mínimo (${min} m).`;
    } else if (val >= min * 0.5) {
      estado = 'ALERTA';
      tiene_alertas = true;
      mensaje = `Distancia a árboles (${val} m) inferior al mínimo (${min} m). Riesgo de intrusión de raíces en tuberías y zanjas.`;
    } else {
      estado = 'BLOQUEANTE';
      tiene_bloqueantes = true;
      mensaje = `Distancia a árboles (${val} m) muy inferior al mínimo (${min} m). Alta probabilidad de obstrucción por raíces.`;
    }

    checks.push({
      parametro: 'Distancia a árboles de raíz profunda',
      valor_informado: `${val} m`,
      minimo_requerido: `${min} m`,
      norma: 'Res. 0330/2017 Art. 143',
      estado,
      mensaje,
      sugerencia: estado !== 'OK'
        ? 'Instalar barrera de raíces (geomembrana vertical HDPE a 60 cm) entre el árbol y las tuberías, o reubicar.'
        : undefined,
    });
  }

  // ── 5. Slope position (upstream vs. downstream of water intakes) ───────
  if (input.aguas_abajo_captaciones !== undefined) {
    const ok = input.aguas_abajo_captaciones === true;
    const estado: CheckEstado = ok ? 'OK' : 'BLOQUEANTE';
    if (!ok) tiene_bloqueantes = true;

    checks.push({
      parametro: 'Posición respecto a captaciones de agua',
      valor_informado: ok ? 'Aguas abajo ✓' : 'Aguas arriba o no verificado',
      minimo_requerido: 'Siempre aguas abajo de captaciones',
      norma: 'Res. 0330/2017 Art. 144 — principio hidráulico general',
      estado,
      mensaje: ok
        ? 'El sistema está ubicado hidráulicamente aguas abajo de todas las captaciones de agua. Correcto.'
        : 'El sistema está ubicado aguas arriba de captaciones. BLOQUEANTE: los efluentes pueden contaminar las fuentes de abastecimiento.',
      sugerencia: !ok
        ? 'Reubicar el sistema para que quede siempre aguas abajo del punto de captación más próximo.'
        : undefined,
    });
  }

  // ── 6. Water table clearance ───────────────────────────────────────────
  if (input.nivel_freatico_medido_m !== undefined) {
    const nf = input.nivel_freatico_medido_m;
    const prof_install = input.profundidad_instalacion_m ?? 0.75;  // default trench depth
    const clearance = nf - prof_install;
    const min_clearance = MINIMOS.nivel_freatico_libre_m;

    let estado: CheckEstado;
    let mensaje: string;

    if (clearance >= min_clearance) {
      estado = 'OK';
      mensaje = `Distancia libre entre fondo de zanja y N.F. máximo: ${clearance.toFixed(2)} m ≥ ${min_clearance} m. Cumple Art. 144.`;
    } else if (clearance >= 0.5) {
      estado = 'ALERTA';
      tiene_alertas = true;
      sugiere_alternativas = true;
      mensaje = `Distancia libre fondo de zanja – N.F. (${clearance.toFixed(2)} m) insuficiente (mín. ${min_clearance} m). El sistema estándar puede saturarse en temporada húmeda.`;
    } else {
      estado = 'BLOQUEANTE';
      tiene_bloqueantes = true;
      sugiere_alternativas = true;
      mensaje = `Distancia libre fondo de zanja – N.F. (${clearance.toFixed(2)} m) muy inferior al mínimo (${min_clearance} m). Sistema estándar inviable — riesgo de mezcla con agua subterránea.`;
    }

    checks.push({
      parametro: 'Nivel freático — distancia libre sobre N.F.',
      valor_informado: `N.F. a ${nf} m; instalación a ${prof_install} m → libre: ${clearance.toFixed(2)} m`,
      minimo_requerido: `${min_clearance} m libres entre fondo de zanja y N.F. máximo`,
      norma: 'Res. 0330/2017 Art. 144',
      estado,
      mensaje,
      sugerencia: estado !== 'OK'
        ? `N.F. alto (${nf} m). Considerar tecnología alternativa (ver "Alternativas tecnológicas" abajo).`
        : undefined,
    });
  }

  return {
    cumple:          !tiene_bloqueantes,
    tiene_alertas,
    checks,
    alternativas_tecnologicas: sugiere_alternativas ? ALTERNATIVAS_NF_ALTO : undefined,
  };
}
