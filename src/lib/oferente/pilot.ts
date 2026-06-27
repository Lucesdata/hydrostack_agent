/**
 * Seed del oferente piloto (D3 — datos mono-tenant como config; el tipo ya es
 * multi-tenant). Mientras no exista la tabla `oferente_perfil`, este objeto es la
 * única instancia de perfil que consume el veredicto Nivel 0.
 *
 * ⚠️  VALORES ILUSTRATIVOS — AJUSTAR A LA REALIDAD DE LA EMPRESA.
 *  · `sectoresUnspsc`, `cobertura` y `cuantiaObjetivo` son defaults representativos
 *    de un contratista de agua/saneamiento (para que el demo del semáforo muestre
 *    variedad). NO son datos confirmados de la empresa.
 *  · Los indicadores RUP y `kCapacidadResidualCop` quedan en placeholder: en
 *    Nivel 0 NO afectan el veredicto (Habilitación es Nivel 2). El owner los pone
 *    desde el certificado RUP vigente cuando estén a mano.
 *
 * Diseño: docs/fase-a/nivel-0-perfil-y-veredicto.md (§3, §7).
 */

import type { OferenteProfile } from './types';

export const OFERENTE_PILOTO: OferenteProfile = {
  id: 'oferente-piloto-valle',
  tipoPersona: 'juridica',
  // Familias UNSPSC típicas de obra/servicios de agua y saneamiento (coinciden con
  // las señales STRONG+CONTEXT del clasificador): 83101 acueducto/alcantarillado,
  // 72141 obra civil, 81101 ingeniería, 77101 ambiental. Ajustar a las reales.
  sectoresUnspsc: ['83101', '72141', '81101', '77101'],
  capacidadFinanciera: {
    // TODO(owner): reemplazar con los indicadores del RUP vigente (no afectan N0).
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
  // Rango de cuantía ilustrativo (COP). TODO(owner): ajustar al objetivo real.
  cuantiaObjetivo: { minCop: 50_000_000, maxCop: 8_000_000_000 },
};
