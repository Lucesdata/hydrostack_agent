/**
 * Seed del oferente piloto (D3 — datos mono-tenant como config; el tipo ya es
 * multi-tenant). Mientras no exista la tabla `oferente_perfil`, este objeto es la
 * única instancia de perfil que consume el veredicto Nivel 0.
 *
 * ⚠️  VALORES DE EJEMPLO — REEMPLAZAR CON LOS DATOS REALES.
 *  · Los indicadores RUP y la cuantía objetivo son datos reales de la empresa
 *    (certificado RUP vigente). Aquí van placeholders solo para que el tipo
 *    compile y el flujo corra. NO son cifras reales.
 *  · En Nivel 0 los indicadores RUP aún NO afectan el veredicto (Habilitación es
 *    Nivel 2); sí afecta `cuantiaObjetivo` (compuerta Cuantía) y `cobertura`.
 *
 * Diseño: docs/fase-a/nivel-0-perfil-y-veredicto.md (§3, §7).
 */

import type { OferenteProfile } from './types';

export const OFERENTE_PILOTO: OferenteProfile = {
  id: 'oferente-piloto-valle',
  tipoPersona: 'juridica',
  // Familia UNSPSC 83101 = acueducto/alcantarillado (water-exclusiva, coincide con
  // la señal STRONG de la red sectorial). Ajustar a las familias/clases reales.
  sectoresUnspsc: ['83101'],
  capacidadFinanciera: {
    // TODO(owner): reemplazar con los indicadores del RUP vigente.
    capitalTrabajoCop: 0,
    indiceLiquidez: 0,
    indiceEndeudamiento: 0,
    razonCoberturaIntereses: 0,
    fuente: 'manual',
    vigenciaHasta: null, // TODO(owner): fecha de vigencia del RUP (ISO).
  },
  // TODO(owner): K de capacidad residual real (COP), o null si no aplica.
  kCapacidadResidualCop: null,
  // Piloto: Valle del Cauca (DIVIPOLA depto '76'); Cali ('76001') como municipio.
  cobertura: { departamentos: ['76'], municipios: ['76001'] },
  // TODO(owner): rango de cuantía objetivo real (COP). Ejemplo placeholder:
  cuantiaObjetivo: { minCop: 100_000_000, maxCop: 5_000_000_000 },
};
