/**
 * Catálogo local de códigos UNSPSC (clase, 8 dígitos) para el sector agua,
 * saneamiento y obra civil — insumo del paso "Clasificación" del perfil RUP.
 * Semilla curada a mano; no pretende ser exhaustivo (UNSPSC completo son
 * decenas de miles de clases). Mismo formato normalizado que
 * `matchesSectorNet`/`sectorialGate` (sin prefijo "V1.").
 */

export interface UnspscCatalogEntry {
  codigo: string; // 8 dígitos
  label: string;
}

export const UNSPSC_CATALOG: UnspscCatalogEntry[] = [
  // Segmento 83 — Servicios públicos y relacionados con el sector público
  { codigo: '83101500', label: 'Acueducto y distribución de agua potable' },
  { codigo: '83101600', label: 'Alcantarillado y aguas residuales' },
  { codigo: '83101700', label: 'Tratamiento y potabilización de agua' },
  { codigo: '83101800', label: 'Gestión de residuos sólidos' },
  // Segmento 72 — Servicios de edificación, construcción y mantenimiento
  { codigo: '72141100', label: 'Construcción de redes de acueducto' },
  { codigo: '72141200', label: 'Construcción de redes de alcantarillado' },
  { codigo: '72141300', label: 'Obra civil — construcción general' },
  { codigo: '72102900', label: 'Mantenimiento de infraestructura hidráulica' },
  // Segmento 81 — Servicios basados en ingeniería, investigación y tecnología
  { codigo: '81101500', label: 'Interventoría de obras civiles' },
  { codigo: '81101700', label: 'Diseño y consultoría en ingeniería hidráulica' },
  { codigo: '81101800', label: 'Estudios y diseños de plantas de tratamiento' },
  // Segmento 77 — Servicios ambientales
  { codigo: '77101500', label: 'Gestión y monitoreo ambiental' },
  { codigo: '77101600', label: 'Servicios de saneamiento ambiental' },
  // Segmento 40 — Componentes y suministros de distribución de materiales
  { codigo: '40141600', label: 'Bombas y equipos de bombeo hidráulico' },
  { codigo: '40142200', label: 'Válvulas y accesorios para tubería' },
  // Segmento 41 — Equipo de laboratorio, medición y observación
  { codigo: '41103400', label: 'Equipos de medición y calidad de agua' },
];

/** Normaliza texto para comparar sin distinguir mayúsculas ni tildes. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Busca por texto libre en la etiqueta o por prefijo del código. Vacío = todo. */
export function searchUnspsc(query: string): UnspscCatalogEntry[] {
  const q = normalize(query.trim());
  if (!q) return UNSPSC_CATALOG;
  return UNSPSC_CATALOG.filter(
    (c) => normalize(c.label).includes(q) || c.codigo.startsWith(query.trim()),
  );
}
