/**
 * Los `estado_actual` que cuentan como abiertos (junto con
 * `estado_apertura = 'Abierto'` y una `fecha_recepcion` vigente; la regla entera
 * y su porqué, en `condicionAbierto()` de `agregados.ts`).
 *
 * Vive aparte, sin base, para que el contrato del hero
 * (`src/lib/landing/proceso-portada.ts`), que también corre en el navegador,
 * aplique la misma regla sin arrastrar el cliente de Postgres.
 */
export const ESTADOS_ABIERTO = ["Publicado", "Abierto"] as const;

/**
 * El día de calendario de `hoy` en Colombia (UTC−5, sin horario de verano), como
 * `AAAA-MM-DD`. La recepción cierra al final de ese día: es el mismo día que usa
 * `(now() at time zone 'America/Bogota')::date` en `condicionAbierto()`.
 */
export function diaEnColombia(hoy: Date): string {
  return new Date(hoy.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * La misma regla que `condicionAbierto()`, en JavaScript: el proceso recibe
 * ofertas hoy. Exige una `fecha_recepcion` que no haya vencido; sin ella no se
 * afirma (spec 2026-10-05, M9: el 98 % de los «abiertos» sin fecha es régimen
 * especial que nunca recibe ofertas por el SECOP).
 */
export function recibeOfertas(
  p: { estadoApertura: string | null; estadoActual: string | null; fechaRecepcion?: string | null },
  hoy: Date = new Date()
): boolean {
  return (
    p.estadoApertura === "Abierto" &&
    !!p.estadoActual &&
    (ESTADOS_ABIERTO as readonly string[]).includes(p.estadoActual) &&
    !!p.fechaRecepcion &&
    p.fechaRecepcion.slice(0, 10) >= diaEnColombia(hoy)
  );
}
