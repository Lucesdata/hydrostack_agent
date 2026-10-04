/**
 * Los `estado_actual` que cuentan como abiertos (junto con
 * `estado_apertura = 'Abierto'`; la regla entera y su porqué, en
 * `condicionAbierto()` de `agregados.ts`).
 *
 * Vive aparte, sin base, para que el contrato del hero
 * (`src/lib/landing/proceso-portada.ts`), que también corre en el navegador,
 * aplique la misma lista sin arrastrar el cliente de Postgres.
 */
export const ESTADOS_ABIERTO = ["Publicado", "Abierto"] as const;
