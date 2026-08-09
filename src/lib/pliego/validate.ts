/**
 * Validador de consistencia de la extracción (lo que hace VERIFICABLE el test
 * binario de Fase 0, en vez de confiar en el modelo).
 *
 * Checks DUROS (vuelven `ok=false`):
 *   · aritmética por ítem: cantidad × valor_unitario = valor_total (±1 peso por
 *     el redondeo al peso que exigen los pliegos).
 *   · capítulos duplicados (mismo nombre normalizado) → señal de "mezcla de
 *     capítulos" o doble conteo.
 *   · cita faltante: un ítem con valor pero sin `cita_textual` → posible
 *     alucinación (grounding roto), lo que exige el gate de Fase 0.
 *
 * NOTAS informativas (no afectan `ok`):
 *   · suma de los valor_total vs presupuesto_oficial_cop. Puede diferir
 *     legítimamente cuando el IVA es global del formato, así que se reporta para
 *     que un humano lo juzgue, no como fallo de extracción.
 */

import { NO_ENCONTRADO, type PliegoExtraction } from "./schema";

export interface Inconsistencia {
  tipo: "aritmetica_item" | "capitulo_duplicado" | "cita_faltante";
  ubicacion: string;
  detalle: string;
}

export interface ValidationReport {
  ok: boolean;
  inconsistencias: Inconsistencia[];
  notas: string[];
}

/** Tolerancia por ítem: los pliegos redondean al peso (≥0.5 sube). */
const TOLERANCIA_ITEM = 1;

export function validatePliego(p: PliegoExtraction): ValidationReport {
  const inconsistencias: Inconsistencia[] = [];
  const notas: string[] = [];

  // 1. Aritmética por ítem + cita faltante (grounding).
  for (const cap of p.capitulos) {
    cap.items.forEach((item, j) => {
      const etiquetaItem = item.codigo !== NO_ENCONTRADO ? item.codigo : `ítem ${j + 1}`;
      const ubicacion = `${cap.nombre} › ${etiquetaItem}: ${item.descripcion}`;
      const esperado = item.cantidad * item.valor_unitario;
      if (Math.abs(esperado - item.valor_total) > TOLERANCIA_ITEM) {
        inconsistencias.push({
          tipo: "aritmetica_item",
          ubicacion,
          detalle: `cantidad×valor_unitario=${esperado} ≠ valor_total=${item.valor_total}`,
        });
      }
      if (!item.cita_textual.trim()) {
        inconsistencias.push({
          tipo: "cita_faltante",
          ubicacion,
          detalle: "el ítem no trae cita_textual — no verificable contra el documento",
        });
      }
    });
  }

  // 2. Capítulos duplicados.
  const conteo = new Map<string, number>();
  for (const cap of p.capitulos) {
    const key = cap.nombre.trim().toLowerCase();
    conteo.set(key, (conteo.get(key) ?? 0) + 1);
  }
  for (const [key, n] of conteo) {
    if (n > 1) {
      inconsistencias.push({
        tipo: "capitulo_duplicado",
        ubicacion: key,
        detalle: `el capítulo aparece ${n} veces`,
      });
    }
  }

  // 3. Nota informativa: suma de ítems vs presupuesto oficial.
  const totalItems = p.capitulos.reduce((n, c) => n + c.items.length, 0);
  const sumaItems = p.capitulos.reduce(
    (acc, c) => acc + c.items.reduce((s, it) => s + it.valor_total, 0),
    0
  );
  const tolSuma = Math.max(totalItems, 1);
  if (Math.abs(sumaItems - p.presupuesto_oficial_cop) > tolSuma) {
    notas.push(
      `La suma de los ítems (${sumaItems}) difiere del presupuesto oficial ` +
        `(${p.presupuesto_oficial_cop}). Puede deberse a IVA global del formato ` +
        `o a ítems faltantes — verificar.`
    );
  }

  return { ok: inconsistencias.length === 0, inconsistencias, notas };
}
