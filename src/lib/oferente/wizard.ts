/**
 * Mini-wizard de perfil de oferente — construye un `OferenteProfile` a partir
 * de las respuestas del wizard (3-4 pasos), limitado a los campos que las
 * compuertas Nivel 0 leen: `sectoresUnspsc` (Sectorial), `cobertura`
 * (Ubicación), `cuantiaObjetivo` (Cuantía). `capacidadFinanciera` y
 * `kCapacidadResidualCop` quedan en placeholder — Habilitación es Nivel 2 y
 * SIEMPRE UNKNOWN en Nivel 0 (ver verdict.ts).
 *
 * Este perfil vive en localStorage del navegador (sin cuenta), un único
 * perfil por navegador.
 */

import type { OferenteProfile, TipoPersona } from './types';

/** Un solo perfil por navegador — id fijo, sin necesidad de generar uno. */
export const OFERENTE_LOCAL_ID = 'oferente-local';

export interface SectorOption {
  codigo: string;
  label: string;
}

/** Familias UNSPSC típicas de agua y saneamiento (mismas que el seed piloto). */
export const SECTOR_OPTIONS: SectorOption[] = [
  { codigo: '83101', label: 'Acueducto y alcantarillado' },
  { codigo: '72141', label: 'Obra civil' },
  { codigo: '81101', label: 'Ingeniería y consultoría' },
  { codigo: '77101', label: 'Servicios ambientales' },
];

export interface WizardAnswers {
  tipoPersona: TipoPersona;
  sectoresUnspsc: string[];
  departamentos: string[];
  municipios?: string[];
  minCop: number;
  maxCop: number;
}

export function buildOferenteProfile(answers: WizardAnswers): OferenteProfile {
  return {
    id: OFERENTE_LOCAL_ID,
    tipoPersona: answers.tipoPersona,
    sectoresUnspsc: answers.sectoresUnspsc,
    capacidadFinanciera: {
      capitalTrabajoCop: 0,
      indiceLiquidez: 0,
      indiceEndeudamiento: 0,
      razonCoberturaIntereses: 0,
      fuente: 'manual',
      vigenciaHasta: null,
    },
    kCapacidadResidualCop: null,
    cobertura: {
      departamentos: answers.departamentos,
      municipios: answers.municipios ?? [],
    },
    cuantiaObjetivo: { minCop: answers.minCop, maxCop: answers.maxCop },
  };
}
