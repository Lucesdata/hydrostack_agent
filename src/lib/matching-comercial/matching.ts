/**
 * Motor de matching comercial (CI-10). PURO: sin base de datos, sin IA, sin IO.
 * Spec: docs/superpowers/specs/2026-11-09-commercial-intelligence-datos.md §6.
 *
 * Empareja una empresa comercial con un OBJETIVO (una necesidad de suministro
 * ligada a un contrato, o un proceso abierto) y devuelve TRES cosas separadas,
 * que nunca se funden en un solo número:
 *   1. Afinidad técnica (0–100): cuánto se parece lo que ofrece la empresa a lo
 *      que el texto menciona. **No es una probabilidad de venta ni de
 *      adjudicación** y el resultado no la expone con ningún nombre.
 *   2. Calidad de la evidencia (A–D): cuánto respalda el objetivo. Es
 *      independiente de la afinidad: más evidencia no sube la afinidad.
 *   3. Demanda: una ETIQUETA (el estado de la necesidad), no un puntaje.
 *
 * Lo que no se puede evaluar NO resta en silencio: se lista en `faltaConfirmar`.
 * Las compuertas duras (contrato cerrado, necesidad descartada, sin cobertura…)
 * excluyen, y la exclusión también se explica.
 *
 * Los pesos son una HIPÓTESIS a calibrar con el piloto, no un resultado medido.
 */
import type { TipoProyecto } from "@/src/lib/classify/tipo-proyecto";
import { NODO_POR_CODIGO, type NodoTecnologia } from "@/src/lib/tecnologia/taxonomia-v1";
import type { RolEmpresa } from "@/src/lib/empresa/validar";

export const VERSION_ALGORITMO_MATCHING = "1.0.0-borrador";

/** Pesos de la afinidad (suman 100 como máximo). Hipótesis, a calibrar en el piloto. */
export const PESOS = {
  exacta: 60,
  relacionada: 40, // padre ↔ hijo
  hermana: 20, // mismo padre
  especificaciones: 20,
  tipoProyecto: 10,
  documentada: 10,
} as const;

export type Calidad = "A" | "B" | "C" | "D";
export type EstadoDato = "declarado" | "documentado" | "verificado";
export type EstadoNecesidad =
  | "inferida"
  | "documentada"
  | "confirmada"
  | "abierta"
  | "cubierta"
  | "descartada"
  | "suspendida"
  | "cerrada";

export interface CapacidadMatching {
  nodoCodigo: string;
  estadoDato: EstadoDato;
  marcas: readonly string[];
  especificaciones: Record<string, unknown> | null;
}

export interface EmpresaMatching {
  id: string;
  roles: readonly RolEmpresa[];
  verificacion: "sin_verificar" | "en_revision" | "verificada" | "rechazada" | "revocada";
  capacidades: readonly CapacidadMatching[];
  /** DIVIPOLA de 2 (departamento) o 5 (municipio) dígitos. */
  cobertura: readonly string[];
  coberturaNacional: boolean;
  /** Claves de `atributos` con valor (soporte_tecnico, monedas, garantias…). */
  atributos: Record<string, readonly string[]>;
}

export interface EvidenciaMatching {
  tipoFuente:
    "secop_campo" | "pliego_usuario" | "documento_oficial" | "declaracion_empresa" | "inferencia";
  verificada: boolean;
  /** Para `secop_campo`: columna de donde sale (objeto, descripcion, unspsc, …). */
  campo?: string;
  cita?: string;
  documento?: string;
}

export interface ObjetivoMatching {
  id: string;
  tipo: "necesidad" | "proceso";
  nodoCodigo: string;
  tipoProyecto: TipoProyecto | null;
  /** DIVIPOLA de 2 o 5 dígitos; `null` si se desconoce. */
  divipola: string | null;
  especificaciones: Record<string, unknown> | null;
  evidencias: readonly EvidenciaMatching[];
  /** Solo necesidades. */
  estadoNecesidad?: EstadoNecesidad;
  /** Solo necesidades: ¿el contrato sigue vigente? `null` = se desconoce. */
  contratoVigente?: boolean | null;
  /** Solo procesos: ¿recibe ofertas hoy? */
  recibeOfertas?: boolean | null;
}

export interface Nota {
  codigo: string;
  texto: string;
}
export interface Paso {
  paso: "ver_detalle" | "seguir" | "completar_perfil" | "solicitar_cotizacion" | "contactar";
  disponible: boolean;
  nota?: string;
}
export interface Explicacion {
  queCoincide: Nota[];
  porQue: Nota[];
  evidencias: {
    tipoFuente: EvidenciaMatching["tipoFuente"];
    verificada: boolean;
    campo?: string;
    cita?: string;
    documento?: string;
  }[];
  faltaConfirmar: Nota[];
  restricciones: Nota[];
  pasos: Paso[];
}

export type MotivoExclusion =
  | "empresa_no_habilitada"
  | "necesidad_no_vigente"
  | "proceso_no_abierto"
  | "contrato_no_vigente"
  | "actividad_incompatible"
  | "sin_cobertura"
  | "sin_afinidad_tecnica";

export interface Demanda {
  estado: EstadoNecesidad | "convocatoria_abierta";
  etiqueta: string;
}

/**
 * El repo compila con `strict: false`, donde un discriminante booleano no
 * estrecha la unión: los campos del otro caso van como `?: undefined`.
 */
export interface CoincidenciaComercial {
  excluido: false;
  empresaId: string;
  objetivoId: string;
  afinidad: number;
  calidadEvidencia: Calidad;
  demanda: Demanda;
  explicacion: Explicacion;
  versionAlgoritmo: string;
  motivo?: undefined;
}
export interface ExclusionComercial {
  excluido: true;
  empresaId: string;
  objetivoId: string;
  motivo: MotivoExclusion;
  explicacion: Explicacion;
  versionAlgoritmo: string;
  afinidad?: undefined;
  calidadEvidencia?: undefined;
  demanda?: undefined;
}
export type ResultadoMatching = CoincidenciaComercial | ExclusionComercial;

// ── Calidad de la evidencia ──────────────────────────────────────────────────

const ORDEN_CALIDAD: Record<Calidad, number> = { A: 3, B: 2, C: 1, D: 0 };
/** Columnas estructuradas de SECOP: dicen algo específico sin depender de texto libre. */
const CAMPOS_ESTRUCTURADOS = new Set(["unspsc", "valor", "fecha_fin", "estado"]);

function calidadDe(e: EvidenciaMatching): Calidad {
  if ((e.tipoFuente === "pliego_usuario" || e.tipoFuente === "documento_oficial") && e.verificada)
    return "A";
  if (e.tipoFuente === "secop_campo" && e.verificada) {
    return e.campo && CAMPOS_ESTRUCTURADOS.has(e.campo) ? "B" : "C";
  }
  // Declaración de un representante verificado del contratista: dato específico, no un documento.
  if (e.tipoFuente === "declaracion_empresa" && e.verificada) return "B";
  return "D";
}

/** A: pliego/documento con cita verificada · B: campo específico · C: texto libre corto · D: inferencia o nada. */
export function calidadDeEvidencia(evidencias: readonly EvidenciaMatching[]): Calidad {
  let mejor: Calidad = "D";
  for (const e of evidencias) {
    const c = calidadDe(e);
    if (ORDEN_CALIDAD[c] > ORDEN_CALIDAD[mejor]) mejor = c;
  }
  return mejor;
}

// ── Compuertas ───────────────────────────────────────────────────────────────

const ROLES_BIEN: readonly RolEmpresa[] = [
  "fabricante_internacional",
  "fabricante_colombiano",
  "distribuidor_autorizado",
  "representante_comercial",
  "importador",
  "integrador_tecnologico",
];
const ROLES_SERVICIO: readonly RolEmpresa[] = [
  "empresa_ingenieria",
  "empresa_constructora",
  "prestador_servicios_especializados",
  "consultora",
  "instalacion_mantenimiento",
  "operador_infraestructura",
  "integrador_tecnologico",
];

function actividadCompatible(roles: readonly RolEmpresa[], nodo: NodoTecnologia): boolean {
  if (roles.length === 0 || nodo.naturaleza === "mixto") return true; // sin roles no se puede juzgar
  const validos = nodo.naturaleza === "bien" ? ROLES_BIEN : ROLES_SERVICIO;
  return roles.some((r) => validos.includes(r));
}

function cubre(cobertura: readonly string[], nacional: boolean, divipola: string): boolean {
  if (nacional) return true;
  return cobertura.some((c) =>
    divipola.length === 2
      ? c.startsWith(divipola)
      : c.length === 2
        ? divipola.startsWith(c)
        : c === divipola
  );
}

// ── Afinidad ─────────────────────────────────────────────────────────────────

interface Relacion {
  tipo: "exacta" | "relacionada" | "hermana";
  puntos: number;
  capacidad: CapacidadMatching;
}

function mejorRelacion(
  objetivo: NodoTecnologia,
  caps: readonly CapacidadMatching[]
): Relacion | null {
  let mejor: Relacion | null = null;
  for (const c of caps) {
    const n = NODO_POR_CODIGO[c.nodoCodigo];
    if (!n) continue;
    let r: Relacion | null = null;
    if (n.codigo === objetivo.codigo) r = { tipo: "exacta", puntos: PESOS.exacta, capacidad: c };
    else if (n.codigo === objetivo.padre || n.padre === objetivo.codigo)
      r = { tipo: "relacionada", puntos: PESOS.relacionada, capacidad: c };
    else if (n.padre !== null && n.padre === objetivo.padre)
      r = { tipo: "hermana", puntos: PESOS.hermana, capacidad: c };
    if (!r) continue;
    const documentada = (x: Relacion) => x.capacidad.estadoDato !== "declarado";
    if (
      mejor === null ||
      r.puntos > mejor.puntos ||
      (r.puntos === mejor.puntos &&
        (Number(documentada(r)) > Number(documentada(mejor)) ||
          (documentada(r) === documentada(mejor) && c.nodoCodigo < mejor.capacidad.nodoCodigo)))
    ) {
      mejor = r;
    }
  }
  return mejor;
}

function esNumero(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Compara solo las claves que AMBAS partes declaran. `_max`/`max_`: la empresa debe alcanzarlo; `_min`/`min_`: no exceder. */
function compararEspecificaciones(
  empresa: Record<string, unknown> | null,
  objetivo: Record<string, unknown> | null
): { comparables: number; compatibles: number; conflictos: string[] } {
  const r = { comparables: 0, compatibles: 0, conflictos: [] as string[] };
  if (!empresa || !objetivo) return r;
  for (const clave of Object.keys(objetivo).sort()) {
    if (!(clave in empresa)) continue;
    const t = objetivo[clave];
    const e = empresa[clave];
    r.comparables++;
    let ok: boolean;
    if (esNumero(t) && esNumero(e)) {
      if (/(^|_)max(_|$)/.test(clave)) ok = e >= t;
      else if (/(^|_)min(_|$)/.test(clave)) ok = e <= t;
      else ok = e === t;
    } else {
      ok = String(e).trim().toLowerCase() === String(t).trim().toLowerCase();
    }
    if (ok) r.compatibles++;
    else r.conflictos.push(clave);
  }
  return r;
}

const ETIQUETA_DEMANDA: Record<EstadoNecesidad | "convocatoria_abierta", string> = {
  inferida: "Inferida: el texto la menciona; nadie la ha confirmado",
  documentada: "Documentada: hay un documento que la respalda",
  confirmada: "Confirmada por el contratista",
  abierta: "Abierta a recibir propuestas",
  cubierta: "Cubierta",
  descartada: "Descartada",
  suspendida: "Suspendida",
  cerrada: "Cerrada",
  convocatoria_abierta: "Convocatoria abierta: recibe ofertas",
};

const PASOS_BASE: Paso[] = [
  { paso: "ver_detalle", disponible: true },
  { paso: "seguir", disponible: true },
  {
    paso: "contactar",
    disponible: false,
    nota: "El contacto entre partes no está disponible en el MVP.",
  },
];

function vacia(): Explicacion {
  return {
    queCoincide: [],
    porQue: [],
    evidencias: [],
    faltaConfirmar: [],
    restricciones: [],
    pasos: [],
  };
}

function excluir(
  empresa: EmpresaMatching,
  objetivo: ObjetivoMatching,
  motivo: MotivoExclusion,
  texto: string
): ExclusionComercial {
  const explicacion = vacia();
  explicacion.porQue.push({ codigo: motivo, texto });
  return {
    excluido: true,
    empresaId: empresa.id,
    objetivoId: objetivo.id,
    motivo,
    explicacion,
    versionAlgoritmo: VERSION_ALGORITMO_MATCHING,
  };
}

export function emparejar(empresa: EmpresaMatching, objetivo: ObjetivoMatching): ResultadoMatching {
  const nodo = NODO_POR_CODIGO[objetivo.nodoCodigo];
  if (!nodo) {
    return excluir(
      empresa,
      objetivo,
      "sin_afinidad_tecnica",
      "La categoría del objetivo no está en la taxonomía."
    );
  }

  // ── Compuertas duras ───────────────────────────────────────────────────────
  if (empresa.verificacion === "rechazada" || empresa.verificacion === "revocada") {
    return excluir(
      empresa,
      objetivo,
      "empresa_no_habilitada",
      "La verificación de tu empresa fue rechazada o revocada."
    );
  }
  if (objetivo.tipo === "necesidad") {
    const e = objetivo.estadoNecesidad;
    if (e === "descartada" || e === "suspendida" || e === "cerrada") {
      return excluir(empresa, objetivo, "necesidad_no_vigente", `La necesidad está ${e}.`);
    }
    if (objetivo.contratoVigente === false) {
      return excluir(empresa, objetivo, "contrato_no_vigente", "El contrato ya no está vigente.");
    }
  } else if (objetivo.recibeOfertas !== true) {
    return excluir(
      empresa,
      objetivo,
      "proceso_no_abierto",
      "El proceso no recibe ofertas hoy: no es una oportunidad abierta."
    );
  }
  if (!actividadCompatible(empresa.roles, nodo)) {
    return excluir(
      empresa,
      objetivo,
      "actividad_incompatible",
      nodo.naturaleza === "bien"
        ? "Esta categoría es un bien o equipo y tus roles declarados no incluyen suministro."
        : "Esta categoría es un servicio y tus roles declarados no incluyen prestarlo."
    );
  }
  const declaraCobertura = empresa.coberturaNacional || empresa.cobertura.length > 0;
  if (
    objetivo.divipola &&
    declaraCobertura &&
    !cubre(empresa.cobertura, empresa.coberturaNacional, objetivo.divipola)
  ) {
    return excluir(
      empresa,
      objetivo,
      "sin_cobertura",
      "El objetivo está fuera del territorio que declaraste cubrir."
    );
  }
  const rel = mejorRelacion(nodo, empresa.capacidades);
  if (!rel) {
    return excluir(
      empresa,
      objetivo,
      "sin_afinidad_tecnica",
      "Ninguna de tus capacidades se relaciona con esta categoría."
    );
  }

  // ── Afinidad ───────────────────────────────────────────────────────────────
  let afinidad = rel.puntos;
  const ex = vacia();
  const nombre = nodo.nombre_es;
  const capNombre =
    NODO_POR_CODIGO[rel.capacidad.nodoCodigo]?.nombre_es ?? rel.capacidad.nodoCodigo;

  ex.queCoincide.push({ codigo: `categoria_${rel.tipo}`, texto: `${capNombre} ↔ ${nombre}` });
  ex.porQue.push({
    codigo: `relacion_${rel.tipo}`,
    texto:
      rel.tipo === "exacta"
        ? `Tu capacidad «${capNombre}» es la misma categoría que menciona el objetivo.`
        : rel.tipo === "relacionada"
          ? `Tu capacidad «${capNombre}» está en la misma familia que «${nombre}» (más general o más específica).`
          : `Tu capacidad «${capNombre}» es una categoría hermana de «${nombre}»: afinidad parcial.`,
  });

  if (objetivo.tipoProyecto && nodo.tipos.includes(objetivo.tipoProyecto)) {
    afinidad += PESOS.tipoProyecto;
    ex.porQue.push({
      codigo: "tipo_proyecto",
      texto: `La categoría es habitual en proyectos de tipo ${objetivo.tipoProyecto}.`,
    });
  }

  const spec = compararEspecificaciones(rel.capacidad.especificaciones, objetivo.especificaciones);
  if (spec.comparables > 0) {
    afinidad += Math.round((PESOS.especificaciones * spec.compatibles) / spec.comparables);
    ex.porQue.push({
      codigo: "especificaciones",
      texto: `${spec.compatibles} de ${spec.comparables} especificaciones comparables son compatibles.`,
    });
    if (spec.conflictos.length > 0) {
      ex.restricciones.push({
        codigo: "especificacion_no_compatible",
        texto: `No coinciden: ${spec.conflictos.join(", ")}.`,
      });
    }
  } else {
    ex.faltaConfirmar.push({
      codigo: "especificaciones_sin_comparar",
      texto: "No hay especificaciones declaradas en ambos lados para compararlas.",
    });
  }

  if (rel.capacidad.estadoDato !== "declarado") {
    afinidad += PESOS.documentada;
    ex.porQue.push({
      codigo: "capacidad_documentada",
      texto: `Tu capacidad está ${rel.capacidad.estadoDato}.`,
    });
  } else {
    ex.faltaConfirmar.push({
      codigo: "capacidad_solo_declarada",
      texto: "Tu capacidad solo está declarada: documentarla aumenta la afinidad.",
    });
  }

  // ── Calidad de la evidencia (independiente de la afinidad) ────────────────
  const calidad = calidadDeEvidencia(objetivo.evidencias);
  ex.evidencias = objetivo.evidencias.map((e) => ({
    tipoFuente: e.tipoFuente,
    verificada: e.verificada,
    ...(e.campo ? { campo: e.campo } : {}),
    ...(e.cita ? { cita: e.cita } : {}),
    ...(e.documento ? { documento: e.documento } : {}),
  }));
  if (calidad === "C" || calidad === "D") {
    ex.faltaConfirmar.push({
      codigo: "evidencia_debil",
      texto:
        calidad === "D"
          ? "Sin evidencia verificable: solo hay una inferencia."
          : "La evidencia es un texto libre corto, no un documento.",
    });
  }

  // ── Demanda (etiqueta) ─────────────────────────────────────────────────────
  const estado: Demanda["estado"] =
    objetivo.tipo === "proceso" ? "convocatoria_abierta" : (objetivo.estadoNecesidad ?? "inferida");
  if (objetivo.tipo === "necesidad") {
    if (estado === "inferida" || estado === "documentada") {
      ex.faltaConfirmar.push({
        codigo: "demanda_sin_confirmar",
        texto:
          "Nadie ha confirmado que esta compra esté pendiente: solo el contratista puede hacerlo.",
      });
    }
    if (objetivo.contratoVigente !== true) {
      ex.faltaConfirmar.push({
        codigo: "vigencia_desconocida",
        texto: "No se conoce la vigencia del contrato.",
      });
    }
    ex.restricciones.push({
      codigo: "decide_el_contratista",
      texto: "El contratista decide a quién compra.",
    });
  }
  ex.restricciones.push({
    codigo: "sin_contacto_en_mvp",
    texto:
      "AquaLicita no contacta ni intermedia en esta versión, ni verifica listas restrictivas ni emite declaraciones de cumplimiento.",
  });

  // ── Lo que no se puede evaluar, a la vista ─────────────────────────────────
  if (empresa.roles.length === 0) {
    ex.faltaConfirmar.push({
      codigo: "roles_no_declarados",
      texto: "No declaraste tus roles: no se pudo verificar la actividad.",
    });
  }
  if (!declaraCobertura) {
    ex.faltaConfirmar.push({
      codigo: "cobertura_no_declarada",
      texto: "No declaraste cobertura territorial.",
    });
  }
  if (!objetivo.divipola) {
    ex.faltaConfirmar.push({
      codigo: "ubicacion_desconocida",
      texto: "No se conoce la ubicación del objetivo.",
    });
  }
  if ((empresa.atributos.soporte_tecnico ?? []).length === 0) {
    ex.faltaConfirmar.push({
      codigo: "soporte_posventa_no_declarado",
      texto: "No declaraste soporte posventa.",
    });
  }
  if (
    !["monedas", "garantias", "condiciones_importacion_entrega"].every(
      (k) => (empresa.atributos[k] ?? []).length > 0
    )
  ) {
    ex.faltaConfirmar.push({
      codigo: "condiciones_comerciales_desconocidas",
      texto:
        "Faltan condiciones comerciales conocidas (monedas, garantías, importación y entrega).",
    });
  }

  // ── Pasos ──────────────────────────────────────────────────────────────────
  ex.pasos = PASOS_BASE.map((p) => ({ ...p }));
  if (
    ex.faltaConfirmar.some(
      (f) => f.codigo === "capacidad_solo_declarada" || f.codigo === "soporte_posventa_no_declarado"
    )
  ) {
    ex.pasos.splice(2, 0, { paso: "completar_perfil", disponible: true });
  }
  if (objetivo.tipo === "necesidad" && estado === "abierta") {
    ex.pasos.splice(ex.pasos.length - 1, 0, {
      paso: "solicitar_cotizacion",
      disponible: false,
      nota: "Función futura: aún no existe el flujo de cotización.",
    });
  }

  return {
    excluido: false,
    empresaId: empresa.id,
    objetivoId: objetivo.id,
    afinidad: Math.min(100, Math.max(0, Math.round(afinidad))),
    calidadEvidencia: calidad,
    demanda: { estado, etiqueta: ETIQUETA_DEMANDA[estado] },
    explicacion: ex,
    versionAlgoritmo: VERSION_ALGORITMO_MATCHING,
  };
}

/** Afinidad ↓, luego mejor calidad de evidencia, luego id (orden estable y reproducible). */
export function ordenarCoincidencias<
  T extends { id: string; afinidad: number; calidadEvidencia: Calidad },
>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) =>
      b.afinidad - a.afinidad ||
      ORDEN_CALIDAD[b.calidadEvidencia] - ORDEN_CALIDAD[a.calidadEvidencia] ||
      a.id.localeCompare(b.id)
  );
}
