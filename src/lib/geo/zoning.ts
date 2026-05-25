/**
 * Geospatial + zoning logic for SITARD viability in Colombia.
 *
 * Implements:
 *   - SITARD viability check by POT regime (Decreto 1076/2015, Res. 0330/2017 Art. 134)
 *   - Competent authority determination (Ley 99/1993)
 *   - Climate data from Open-Meteo (free, no API key)
 */

import { getAuthority } from './colombia';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type ZoningType =
  | 'urbano'      // suelo urbano — typically has sewer; SITARD often blocked
  | 'expansion'   // suelo de expansión — transitional
  | 'rural'       // suelo rural — primary domain for SITARD
  | 'suburbano'   // suelo suburbano — corridors, allowed with restrictions
  | 'protegido';  // suelo de protección — restricted for environmental reasons

export type ViabilityStatus = 'viable' | 'alerta' | 'bloqueante';

export interface ViabilityResult {
  status: ViabilityStatus;
  title: string;
  message: string;
  norma: string;
}

export interface AuthorityResult {
  authority: string;
  authorityFull: string;
  contactHint: string;
  tramite: string;
}

export interface ClimateData {
  elevation_m: number;
  temp_media_c: number;
  temp_min_c: number;
  temp_max_c: number;
  precipitacion_anual_mm: number | null; // estimated
  etp_media_mm_dia: number;              // estimated from T and altitude
  clima_tipo: string;                    // "frío de altura", "templado", "cálido", "muy cálido"
  fuente: string;
}

// ─────────────────────────────────────────────────────────────────────────
// SITARD viability by POT zoning
// ─────────────────────────────────────────────────────────────────────────

export function checkSITARDViability(
  zoning: ZoningType,
  deptId: string,
  isBigCity: boolean
): ViabilityResult {
  switch (zoning) {
    case 'urbano':
      if (deptId === 'BOG') {
        return {
          status: 'bloqueante',
          title: 'SITARD no viable — Suelo urbano Bogotá',
          message:
            'En suelo urbano del Distrito Capital la conexión al alcantarillado de la EAAB es obligatoria (Decreto 555/2021 POT Bogotá, Art. 434). El SITARD no es una alternativa en suelo urbano con red disponible.',
          norma: 'Decreto 555/2021 (POT Bogotá) · Res. 0330/2017 Art. 134',
        };
      }
      if (isBigCity) {
        return {
          status: 'bloqueante',
          title: 'SITARD probablemente no viable — Suelo urbano con alcantarillado',
          message:
            'En suelo urbano de municipios con red de alcantarillado disponible, la conexión es obligatoria (Res. 0330/2017 Art. 134). Verificar con la empresa prestadora si hay cobertura en el predio.',
          norma: 'Res. 0330/2017 Art. 134 · Ley 142/1994',
        };
      }
      return {
        status: 'alerta',
        title: 'Verificar disponibilidad de alcantarillado',
        message:
          'Suelo urbano. Si existe red de alcantarillado disponible en la vía frente al predio, la conexión es obligatoria. El SITARD solo procede si no hay servicio disponible. Consultar a la empresa prestadora local.',
        norma: 'Res. 0330/2017 Art. 134 · Ley 142/1994',
      };

    case 'expansion':
      return {
        status: 'alerta',
        title: 'Suelo de expansión — viable con restricciones',
        message:
          'En suelo de expansión el SITARD puede autorizarse si no existe red de alcantarillado. Se requiere concepto favorable del POT y permiso de vertimiento ante la CAR/SDA. Verificar plan parcial del área.',
        norma: 'Ley 388/1997 · Decreto 1076/2015 · Res. 0330/2017 Art. 134',
      };

    case 'rural':
      return {
        status: 'viable',
        title: 'SITARD viable — Suelo rural',
        message:
          'El suelo rural es el ámbito natural del SITARD. Se requiere permiso de vertimiento ante la autoridad ambiental competente (Decreto 1076/2015 Art. 2.2.3.3.4.8) y cumplimiento de Res. 0330/2017.',
        norma: 'Res. 0330/2017 Art. 134–145 · Decreto 1076/2015',
      };

    case 'suburbano':
      return {
        status: 'viable',
        title: 'SITARD viable — Suelo suburbano',
        message:
          'El suelo suburbano admite SITARD con restricciones específicas. La densidad de predios puede requerir sistema colectivo. Verificar normas del corredor suburbano en el POT municipal.',
        norma: 'Decreto 1077/2015 · Res. 0330/2017 Art. 134',
      };

    case 'protegido':
      return {
        status: 'bloqueante',
        title: 'SITARD no viable — Suelo de protección',
        message:
          'En suelo de protección (rondas hídricas, áreas naturales protegidas, zonas de recarga) no se permite ningún sistema de disposición de aguas residuales. El vertimiento está prohibido por Decreto 2245/2017.',
        norma: 'Decreto 2245/2017 · Res. 1207/2014 · Ley 99/1993 Art. 63',
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Competent authority
// ─────────────────────────────────────────────────────────────────────────

export function determineCompetentAuthority(deptId: string): AuthorityResult {
  const { authority, authorityFull } = getAuthority(deptId);

  const tramites: Record<string, string> = {
    SDA:          'Trámite ante la Subdirección de Ecourbanismo de la SDA. Formulario "Permiso de Vertimientos" en ventanilla única.',
    CAR:          'Trámite de Permiso de Vertimientos ante la CAR (Resolución 1351/2017). Ventanilla regional.',
    CVC:          'Permiso de Vertimientos ante la CVC. Ventanilla única regional en Cali.',
    CORANTIOQUIA: 'Trámite ante CORANTIOQUIA. Sede regional según ubicación del predio.',
    CDMB:         'Permiso de Vertimientos ante la CDMB (Área Metropolitana de Bucaramanga) o CAS para municipios externos.',
    CORPOBOYACÁ:  'Trámite ante CORPOBOYACÁ. Ventanilla en Tunja o regional.',
    CORTOLIMA:    'Permiso de Vertimientos ante CORTOLIMA. Sede en Ibagué.',
    CAM:          'Permiso de Vertimientos ante la CAM. Sede en Neiva.',
    CORPOCALDAS:  'Trámite ante CORPOCALDAS. Sede en Manizales.',
    CARDER:       'Permiso de Vertimientos ante CARDER. Sede en Pereira.',
    CRQ:          'Trámite ante CRQ. Sede en Armenia.',
    CORPONARIÑO:  'Permiso de Vertimientos ante CORPONARIÑO. Sede en Pasto.',
    CRC:          'Trámite ante CRC. Sede en Popayán.',
    CORMACARENA:  'Permiso de Vertimientos ante CORMACARENA. Sede en Villavicencio.',
    CRA:          'Trámite ante CRA. Sede en Barranquilla.',
    CSB:          'Permiso de Vertimientos ante CARDIQUE o CSB según municipio.',
    CORPONOR:     'Trámite ante CORPONOR. Sede en Cúcuta.',
  };

  const contacts: Record<string, string> = {
    SDA:          'sda.gov.co · Tel: (601) 3775555',
    CAR:          'car.gov.co · Tel: (601) 3779877',
    CVC:          'cvc.gov.co · Tel: (602) 6200200',
    CORANTIOQUIA: 'corantioquia.gov.co · Tel: (604) 4441011',
    CDMB:         'cdmb.gov.co · Tel: (607) 6344567',
    CORPOBOYACÁ:  'corpoboyaca.gov.co · Tel: (608) 7422050',
    CORTOLIMA:    'cortolima.gov.co · Tel: (608) 2638040',
    CAM:          'cam.gov.co · Tel: (608) 8752828',
    CORPOCALDAS:  'corpocaldas.gov.co · Tel: (606) 8872977',
    CARDER:       'carder.gov.co · Tel: (606) 3140770',
    CRQ:          'crq.gov.co · Tel: (606) 7495050',
    CORPONARIÑO:  'corponarino.gov.co · Tel: (602) 7223377',
    CRC:          'crc.gov.co · Tel: (602) 8209000',
    CORMACARENA:  'cormacarena.gov.co · Tel: (608) 6719166',
    CRA:          'crautonoma.gov.co · Tel: (605) 3315000',
    CSB:          'carsucre.gov.co · Tel: (605) 2820299',
    CORPONOR:     'corponor.gov.co · Tel: (607) 5831415',
  };

  return {
    authority,
    authorityFull,
    contactHint: contacts[authority] ?? 'Consultar directamente la sede regional',
    tramite: tramites[authority] ?? 'Tramitar Permiso de Vertimientos según Decreto 1076/2015 Art. 2.2.3.3.4.8.',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Climate data — Open-Meteo (free, no API key)
// ─────────────────────────────────────────────────────────────────────────

function estimateClimate(elevation_m: number, temp_media_c: number): Pick<ClimateData, 'precipitacion_anual_mm' | 'etp_media_mm_dia' | 'clima_tipo'> {
  // ETP estimation: Thornthwaite simplified by altitude zone
  // Tropical highlands: ETP drops with altitude and temperature
  let etp: number;
  let tipo: string;

  if (temp_media_c < 12) {
    etp = 2.0; tipo = 'muy frío de páramo';
  } else if (temp_media_c < 18) {
    etp = 3.2; tipo = 'frío de altura';
  } else if (temp_media_c < 24) {
    etp = 4.2; tipo = 'templado / semihúmedo';
  } else if (temp_media_c < 28) {
    etp = 5.5; tipo = 'cálido seco';
  } else {
    etp = 7.0; tipo = 'muy cálido / semiárido';
  }

  // Rough precipitation estimate by elevation (Colombia average):
  // Very high alt. = páramo (high rain); mid alt. = moderate; low alt. = variable
  let precip: number | null = null;
  if (elevation_m > 3000) precip = 900;
  else if (elevation_m > 2000) precip = 1200;
  else if (elevation_m > 1000) precip = 2000;
  else precip = 2500;

  return { precipitacion_anual_mm: precip, etp_media_mm_dia: etp, clima_tipo: tipo };
}

export async function getClimateData(lat: number, lon: number): Promise<ClimateData> {
  // 1. Get elevation
  const elevRes = await fetch(
    `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`,
    { signal: AbortSignal.timeout(8000) }
  );
  const elevJson = await elevRes.json();
  const elevation_m = Math.round(elevJson.elevation?.[0] ?? 0);

  // 2. Get temperature (7-day forecast average as climate proxy)
  const fcRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`,
    { signal: AbortSignal.timeout(8000) }
  );
  const fcJson = await fcRes.json();

  const maxArr: number[] = fcJson.daily?.temperature_2m_max ?? [];
  const minArr: number[] = fcJson.daily?.temperature_2m_min ?? [];

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const temp_max_c = Math.round((avg(maxArr) ?? (2600 < elevation_m ? 14 : 25)) * 10) / 10;
  const temp_min_c = Math.round((avg(minArr) ?? (temp_max_c - 8)) * 10) / 10;
  const temp_media_c = Math.round(((temp_max_c + temp_min_c) / 2) * 10) / 10;

  const estimated = estimateClimate(elevation_m, temp_media_c);

  return {
    elevation_m,
    temp_media_c,
    temp_min_c,
    temp_max_c,
    ...estimated,
    fuente: 'Open-Meteo (open-meteo.com) · forecast 7 días · estimaciones climáticas propias',
  };
}
