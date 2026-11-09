import { clasificarFamiliasPersonal, type StaffFamily } from "./role-taxonomy";

/** Extracción conservadora basada en texto: no genera vacantes ni candidatos. */
export interface RequisitoPersonalV0 {
  linea: number;
  cargoOriginal: string;
  familias: StaffFamily[];
  experienciaGeneralAnios: number | null;
  experienciaEspecificaAnios: number | null;
  dedicacionPorcentaje: number | null;
  tipo: "obligatorio" | "puntuable" | "opcional" | "por_verificar";
  evidencia: {
    fragmento: string;
    literalEnEntrada: true;
    documentoVerificado: false;
  };
  version: "talent-rules-v0";
}

const NEGACION =
  /\b(?:no se (?:requiere|exige|solicita)|sin necesidad de|no (?:es|ser[aá]) obligatorio|se excluye)\b/i;
const PERSONAL =
  /(?:ingenier[oa]|especialista|profesional|t[eé]cnic[oa]|operador(?:a)?|dibujante|delineante|modelador|interventor|supervisor|residente|director|gerente|auxiliar|instrumentista|coordinador)/i;
const REQUISITO =
  /(?:personal|equipo|perfil|cargo|profesional|ingenier|especialista|t[eé]cnic|operador|dibujante|interventor|residente|director|coordinador|requerid|exigid|mínim|m[ií]nim)/i;
const DATO_PERSONAL =
  /\b(?:c[eé]dula|documento de identidad|pasaporte|tel[eé]fono|correo electr[oó]nico)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;

function extraerAnios(linea: string, tipo: "general" | "especifica"): number | null {
  const palabra = tipo === "general" ? "general" : "espec[ií]fica";
  const antes = new RegExp(
    `(?:experiencia\\s+${palabra})[^.\\n]{0,55}?(\\d{1,2})\\s*a[nñ]os?`,
    "i",
  );
  const despues = new RegExp(
    `(\\d{1,2})\\s*a[nñ]os?[^.\\n]{0,40}?(?:de\\s+)?experiencia\\s+${palabra}`,
    "i",
  );
  const m = linea.match(antes) ?? linea.match(despues);
  return m ? Number(m[1]) : null;
}

function extraerDedicacion(linea: string): number | null {
  const m =
    linea.match(/dedicaci[oó]n[^.\n]{0,35}?(\d{1,3})\s*%/i) ??
    linea.match(/(\d{1,3})\s*%\s*de\s*dedicaci[oó]n/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 100 ? n : null;
}

function tipoDeRequisito(linea: string): RequisitoPersonalV0["tipo"] {
  if (/opcional|podr[aá] contar|podr[aá] incluir/i.test(linea)) return "opcional";
  if (/puntaje|puntuaci[oó]n|se valorar[aá]|otorga puntos|factor de evaluaci[oó]n/i.test(linea)) {
    return "puntuable";
  }
  if (/deber[aá]|debe contar|se exige|se requiere|m[ií]nimo|obligatori|equipo m[ií]nimo/i.test(linea)) {
    return "obligatorio";
  }
  return "por_verificar";
}

/**
 * Primer paso sobre texto previamente obtenido de un pliego.
 * No descarga documentos, ni procesa CV o datos personales.
 * Todos los fragmentos son literales de entrada; NO están verificados contra PDF.
 */
export function extraerRequisitosPersonalDeTexto(texto: string): RequisitoPersonalV0[] {
  if (!texto.trim()) return [];
  const lineas = texto.split(/\r?\n/);
  const salida: RequisitoPersonalV0[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const fragmento = lineas[i].replace(/\s+/g, " ").trim();
    if (fragmento.length < 12 || fragmento.length > 800) continue;
    if (!PERSONAL.test(fragmento) || !REQUISITO.test(fragmento)) continue;
    if (NEGACION.test(fragmento) || DATO_PERSONAL.test(fragmento)) continue;
    const familias = clasificarFamiliasPersonal(fragmento);
    if (familias.length === 0) continue;
    salida.push({
      linea: i + 1,
      cargoOriginal: fragmento,
      familias,
      experienciaGeneralAnios: extraerAnios(fragmento, "general"),
      experienciaEspecificaAnios: extraerAnios(fragmento, "especifica"),
      dedicacionPorcentaje: extraerDedicacion(fragmento),
      tipo: tipoDeRequisito(fragmento),
      evidencia: {
        fragmento,
        literalEnEntrada: true,
        documentoVerificado: false,
      },
      version: "talent-rules-v0",
    });
  }
  return salida;
}
