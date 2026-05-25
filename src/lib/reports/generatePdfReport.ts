/**
 * PDF report generator for Hydro_Agent — Fase 4: Informe PDF profesional.
 *
 * Generates an A4 technical memo at firmable/professional level with:
 *   - Cover with project data, owner, responsible professional, report number, disclaimer
 *   - Table of contents
 *   - Per-page headers and footers
 *   - Full normative hierarchy table
 *   - Calculation sections (septic tank + drainage field)
 *   - Compliance checklist (visual ✓/✗)
 *   - Geospatial verification block
 *   - Country-specific next steps
 *   - Normative references
 *   - Signature / sign-off area
 *
 * Uses pdfkit (backend-only generation).
 */

import PDFDocument from 'pdfkit';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { SepticTankResult } from '@/src/lib/calculations/septicTank';
import type { DrainageFieldResult } from '@/src/lib/calculations/drainageField';
import type { CteValidationResult } from '@/src/lib/validation/cteValidator';
import {
  COLOMBIA_NORMS,
  BOGOTA_POT,
  DESIGN_CRITERIA,
  COLOMBIA_NEXT_STEPS,
  COLOMBIA_REFERENCIAS_NORMATIVAS,
} from '@/src/lib/config/regulatory_framework';
import type { GeospatialResult } from '@/src/lib/validation/geospatialValidator';

// ─────────────────────────────────────────────────────────────────────────
// Public interfaces
// ─────────────────────────────────────────────────────────────────────────

export interface ProjectInfo {
  /** Project name / title */
  nombre: string;
  /** Location / municipality */
  ubicacion: string;
  /** Optional: owner / client name */
  propietario?: string;
  /** Optional: responsible professional (name + title) */
  redactor?: string;
  /** Optional: professional license number (COPNIA for Colombia) */
  matricula?: string;
  /** Optional: report number. Auto-generated from UUID if omitted. */
  numero_memoria?: string;
  /** Optional: date string. Defaults to today. */
  fecha?: string;
}

export interface GeoLocationData {
  lat?: number;
  lon?: number;
  address?: string;
  elevation_m?: number;
  temp_media_c?: number;
  etp_media_mm_dia?: number;
  clima_tipo?: string;
  precipitacion_anual_mm?: number | null;
  dept?: string;
  mun?: string;
  vereda?: string;
  cedula?: string;
  matricula_inmobiliaria?: string;
  area_predio_m2?: number;
  tenencia?: string;
  zoning?: string;
  authority?: string;
  authorityFull?: string;
  viability_status?: string;
  viability_title?: string;
}

export interface PdfReportInput {
  septic_tank?: SepticTankResult;
  drainage_field?: DrainageFieldResult;
  validation?: CteValidationResult;
  proyecto: ProjectInfo;
  norm_code?: string;
  location_data?: GeoLocationData;
}

export interface PdfReportResult {
  report_id: string;
  download_url: string;
  file_path: string;
  generated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const REPORTS_DIR = join(process.cwd(), 'public', 'reports');

const PAGE_W = 595.28;  // A4 width in points
const PAGE_H = 841.89;  // A4 height in points
const MARGIN_L = 55;
const MARGIN_R = 55;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const HEADER_H = 36;    // Reserved at top for recurring header
const FOOTER_Y = PAGE_H - 28; // Footer baseline

const C = {
  primary:   '#1a3f5c',
  secondary: '#2c6e96',
  accent:    '#0097b2',
  text:      '#1e2d3a',
  textLight: '#5a6e7e',
  success:   '#2e6b48',
  warning:   '#8a6020',
  error:     '#8a3030',
  divider:   '#c8d8e4',
  bgLight:   '#f4f8fb',
  bgWarn:    '#fef9ec',
  bgOk:      '#f0f8f3',
  bgErr:     '#fdf1f1',
};

// ─────────────────────────────────────────────────────────────────────────
// Location detection
// ─────────────────────────────────────────────────────────────────────────

function isColombiaProject(input: PdfReportInput): boolean {
  if (input.norm_code === 'ras') return true;
  const ub = (input.proyecto.ubicacion ?? '').toLowerCase();
  return ['colombia','bogot','medell','cali','barranquilla','cartagena',
          'bucaramanga','cundinamarca','antioquia','valle del cauca']
    .some(k => ub.includes(k));
}

function isBogotaProject(input: PdfReportInput): boolean {
  const ub = (input.proyecto.ubicacion ?? '').toLowerCase();
  return ub.includes('bogot');
}

// ─────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────

function ensureReportsDir(): void {
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
}

function formatDate(date?: string): string {
  if (date) return date;
  return new Date().toLocaleDateString('es-ES', { year:'numeric', month:'long', day:'numeric' });
}

function sectionLabel(n: number, title: string): string {
  return `${n}. ${title}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Per-page header & footer (registered via pageAdded event)
// ─────────────────────────────────────────────────────────────────────────

function registerHeaderFooter(
  doc: PDFKit.PDFDocument,
  proyecto: ProjectInfo,
  reportId: string,
  getPageNum: () => number
): void {
  doc.on('pageAdded', () => {
    const pg = getPageNum();
    if (pg <= 1) return; // Skip cover page

    // ── Header bar ─────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, HEADER_H).fill('#f0f6fa');
    doc.rect(0, HEADER_H, PAGE_W, 0.5).fill(C.divider);

    doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8)
      .text('HYDROSTACK', MARGIN_L, 10);
    doc.fillColor(C.textLight).font('Helvetica').fontSize(7.5)
      .text(`Memoria Técnica · ${proyecto.nombre}`, MARGIN_L + 80, 11);

    const pgText = `Pág. ${pg}`;
    const memText = proyecto.numero_memoria ?? reportId.slice(0, 8).toUpperCase();
    doc.fillColor(C.textLight).font('Helvetica').fontSize(7.5)
      .text(`Mem. N° ${memText}`, PAGE_W - MARGIN_R - 120, 11, { width: 60, align: 'right' });
    doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8)
      .text(pgText, PAGE_W - MARGIN_R - 50, 10, { width: 45, align: 'right' });

    // Reset cursor below header
    doc.y = HEADER_H + 10;

    // ── Footer ──────────────────────────────────────────────────────────
    doc.rect(0, FOOTER_Y - 10, PAGE_W, 0.5).fill(C.divider);
    doc.fillColor(C.textLight).font('Helvetica').fontSize(7)
      .text(
        `Generado por HydroStack · Report ID: ${reportId} · ${formatDate()}`,
        MARGIN_L, FOOTER_Y - 4, { width: CONTENT_W, align: 'center' }
      );
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Drawing helpers
// ─────────────────────────────────────────────────────────────────────────

function drawDivider(doc: PDFKit.PDFDocument): void {
  doc.strokeColor(C.divider).lineWidth(0.5)
    .moveTo(MARGIN_L, doc.y).lineTo(PAGE_W - MARGIN_R, doc.y).stroke();
  doc.moveDown(0.4);
}

function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  title: string,
  n?: number
): void {
  // Add page if near footer
  if (doc.y > PAGE_H - 180) { doc.addPage(); }

  doc.moveDown(0.7);
  const label = n !== undefined ? `${n}. ${title}` : title;

  doc.rect(MARGIN_L - 5, doc.y - 2, CONTENT_W + 10, 20).fill('#e8f2f9');
  doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(13)
    .text(label, MARGIN_L, doc.y + 2);
  doc.moveDown(0.25);
  drawDivider(doc);
  doc.fillColor(C.text).font('Helvetica').fontSize(10);
}

function drawSubtitle(doc: PDFKit.PDFDocument, text: string): void {
  doc.moveDown(0.4);
  doc.fillColor(C.secondary).font('Helvetica-Bold').fontSize(10.5).text(text);
  doc.moveDown(0.15);
  doc.fillColor(C.text).font('Helvetica').fontSize(10);
}

function drawKeyValue(doc: PDFKit.PDFDocument, key: string, value: string): void {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text).text(`${key}: `, { continued: true });
  doc.font('Helvetica').fillColor(C.textLight).text(value);
}

function drawTable(
  doc: PDFKit.PDFDocument,
  rows: Array<{ label: string; value: string; norm?: string }>
): void {
  const lW = 195, vX = MARGIN_L + lW + 10, nX = vX + 120;

  for (const row of rows) {
    if (doc.y > PAGE_H - 100) { doc.addPage(); }
    const y = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor(C.text).text(row.label, MARGIN_L, y, { width: lW });
    doc.font('Helvetica-Bold').fillColor(C.primary).text(row.value, vX, y, { width: 115 });
    if (row.norm) {
      doc.font('Helvetica').fontSize(7).fillColor(C.accent)
        .text(row.norm, nX, y + 1.5, { width: 115 });
    }
    doc.moveDown(0.45);
  }
}

function drawCheckRow(
  doc: PDFKit.PDFDocument,
  ok: boolean,
  label: string,
  value: string,
  norm?: string
): void {
  if (doc.y > PAGE_H - 80) { doc.addPage(); }

  const y = doc.y;
  const badgeColor = ok ? C.success : C.error;
  const bgColor = ok ? C.bgOk : C.bgErr;

  doc.rect(MARGIN_L, y, CONTENT_W, 18).fill(bgColor);
  doc.rect(MARGIN_L, y, 22, 18).fill(badgeColor);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(8)
    .text(ok ? '✓' : '✗', MARGIN_L + 5, y + 5);

  doc.fillColor(C.text).font('Helvetica').fontSize(9)
    .text(label, MARGIN_L + 28, y + 4, { width: 230 });
  doc.fillColor(ok ? C.success : C.error).font('Helvetica-Bold').fontSize(9)
    .text(value, MARGIN_L + 265, y + 4, { width: 120 });
  if (norm) {
    doc.fillColor(C.accent).font('Helvetica').fontSize(7)
      .text(norm, MARGIN_L + 390, y + 5, { width: 95 });
  }

  doc.moveDown(1.0);
}

// ─────────────────────────────────────────────────────────────────────────
// Cover page
// ─────────────────────────────────────────────────────────────────────────

function drawCover(
  doc: PDFKit.PDFDocument,
  proyecto: ProjectInfo,
  reportId: string,
  colombia: boolean
): void {
  // ── Top bar ──────────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, 72).fill(C.primary);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(28)
    .text('HYDROSTACK', MARGIN_L, 18);
  doc.font('Helvetica').fontSize(10)
    .text('Sistema de Ingeniería Hidráulica y Saneamiento', MARGIN_L, 50);

  // Report number + date — top right of bar
  const memNum = proyecto.numero_memoria ?? reportId.slice(0, 8).toUpperCase();
  doc.font('Helvetica').fontSize(8).fillColor('rgba(255,255,255,0.7)')
    .text(`Mem. N° ${memNum}`, PAGE_W - MARGIN_R - 120, 22, { width: 120, align: 'right' })
    .text(formatDate(proyecto.fecha), PAGE_W - MARGIN_R - 120, 34, { width: 120, align: 'right' });

  // ── Report type label ─────────────────────────────────────────────────
  doc.y = 100;
  doc.fillColor(C.text).font('Helvetica-Bold').fontSize(22)
    .text('Memoria Técnica', MARGIN_L, doc.y);
  doc.moveDown(0.3);
  doc.fontSize(13).fillColor(C.secondary).font('Helvetica')
    .text('Sistema Individual de Tratamiento de Aguas Residuales Domésticas (SITARD)', MARGIN_L, doc.y, { width: CONTENT_W });
  doc.moveDown(2);

  // ── Project info box ──────────────────────────────────────────────────
  const boxY = doc.y;
  const boxH = 160;
  doc.rect(MARGIN_L, boxY, CONTENT_W, boxH).fillAndStroke(C.bgLight, C.divider);

  const col1 = MARGIN_L + 16;
  const col2 = MARGIN_L + 145;
  let ry = boxY + 14;

  const infoRow = (label: string, value: string, y: number) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.textLight).text(label, col1, y, { width: 120 });
    doc.font('Helvetica').fontSize(10).fillColor(C.text).text(value, col2, y, { width: CONTENT_W - 145 - 16 });
  };

  infoRow('PROYECTO:', proyecto.nombre, ry);
  ry += 20;
  infoRow('UBICACIÓN:', proyecto.ubicacion, ry);
  ry += 20;

  if (proyecto.propietario) {
    infoRow('PROPIETARIO:', proyecto.propietario, ry);
    ry += 20;
  }

  if (proyecto.redactor) {
    infoRow('ELABORADO POR:', proyecto.redactor, ry);
    ry += 20;
  }

  if (proyecto.matricula) {
    infoRow('MATRÍCULA PROF.:', proyecto.matricula, ry);
    ry += 20;
  }

  infoRow('FECHA:', formatDate(proyecto.fecha), ry);
  ry += 20;

  const normLine = colombia
    ? 'Res. 0330/2017 MinVivienda · Dec. 1076/2015 MADS · Res. 0631/2015'
    : 'CTE DB-HS 5 · RD 1620/2007';
  infoRow('NORMATIVA APLICADA:', normLine, ry);

  doc.y = boxY + boxH + 20;

  // ── Disclaimer box ────────────────────────────────────────────────────
  const dY = doc.y;
  doc.rect(MARGIN_L, dY, CONTENT_W, 70).fillAndStroke(C.bgWarn, '#d4a820');

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.warning)
    .text('AVISO IMPORTANTE — Carácter orientativo', MARGIN_L + 12, dY + 10, { width: CONTENT_W - 24 });

  doc.font('Helvetica').fontSize(8).fillColor('#6b5010')
    .text(
      'Esta memoria técnica ha sido generada de forma automatizada con fines orientativos. ' +
      'NO constituye un diseño definitivo ni reemplaza la firma de un ingeniero matriculado. ' +
      'Para trámites ante autoridades (permiso de vertimientos, licencia de construcción) ' +
      'se requiere un proyecto firmado por profesional habilitado ante COPNIA (Colombia) o colegio equivalente.',
      MARGIN_L + 12, dY + 26, { width: CONTENT_W - 24, lineGap: 1.5 }
    );

  doc.y = dY + 85;

  // ── Table of contents placeholder ─────────────────────────────────────
  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.primary).text('Contenido', MARGIN_L);
  doc.moveDown(0.4);

  const tocItems = [
    '1. Marco Normativo',
    '2. Caudales y Dimensionado de Fosa Séptica',
    '3. Dimensionado del Campo de Infiltración',
    '4. Verificación de Cumplimiento Normativo',
    '5. Verificaciones Geoespaciales del Sitio',
    colombia ? '6. Próximos Pasos — Trámite en Colombia' : '6. Próximos Pasos',
    '7. Referencias Normativas',
    '8. Firma y Declaración Profesional',
  ];

  for (const item of tocItems) {
    doc.font('Helvetica').fontSize(9.5).fillColor(C.text)
      .text(`  ${item}`, MARGIN_L + 10, doc.y, { width: CONTENT_W - 10 });
    doc.moveDown(0.35);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Section 1: Normative framework table
// ─────────────────────────────────────────────────────────────────────────

function drawNormativeSection(
  doc: PDFKit.PDFDocument,
  colombia: boolean,
  sn: number
): void {
  drawSectionTitle(doc, 'Marco Normativo', sn);
  doc.moveDown(0.2);

  if (colombia) {
    doc.font('Helvetica').fontSize(9.5).fillColor(C.textLight)
      .text(
        'La presente memoria se elabora bajo la jerarquía normativa vigente en Colombia ' +
        'para el diseño de sistemas individuales de tratamiento de aguas residuales domésticas (SITARD). ' +
        'Los artículos citados corresponden a las exigencias específicas aplicadas en cada sección.',
        MARGIN_L, doc.y, { width: CONTENT_W, lineGap: 1.5 }
      );
    doc.moveDown(0.7);

    const norms = [
      {
        label: COLOMBIA_NORMS.primary.shortLabel,
        value: COLOMBIA_NORMS.primary.label,
        norm: COLOMBIA_NORMS.primary.roleInHierarchy,
      },
      {
        label: COLOMBIA_NORMS.effluent.shortLabel,
        value: COLOMBIA_NORMS.effluent.label,
        norm: COLOMBIA_NORMS.effluent.roleInHierarchy,
      },
      {
        label: COLOMBIA_NORMS.environmental_permit.shortLabel,
        value: COLOMBIA_NORMS.environmental_permit.label,
        norm: COLOMBIA_NORMS.environmental_permit.roleInHierarchy,
      },
      {
        label: COLOMBIA_NORMS.technical_reference.shortLabel,
        value: COLOMBIA_NORMS.technical_reference.label,
        norm: COLOMBIA_NORMS.technical_reference.roleInHierarchy,
      },
    ];

    drawSubtitle(doc, 'Jerarquía normativa aplicada');
    drawTable(doc, norms);

    doc.moveDown(0.4);
    drawSubtitle(doc, 'Criterios clave de diseño con trazabilidad normativa');

    const dc = DESIGN_CRITERIA;
    const criteria = [
      { label: 'Dotación mínima por usuario',            value: `${dc.dotacion_vivienda.value} ${dc.dotacion_vivienda.unit}`, norm: dc.dotacion_vivienda.article },
      { label: 'Tiempo de retención hidráulica (TRH)',   value: `${dc.trh_minimo.value} días mínimo`,                        norm: dc.trh_minimo.article },
      { label: 'Acumulación de lodos',                   value: `${dc.lodos_acumulacion.value} ${dc.lodos_acumulacion.unit}`, norm: dc.lodos_acumulacion.article },
      { label: 'Volumen mínimo de diseño',               value: `${dc.volumen_minimo.value} ${dc.volumen_minimo.unit}`,       norm: dc.volumen_minimo.article },
      { label: 'Profundidad mínima del tanque',          value: `${dc.profundidad_minima.value} m`,                           norm: dc.profundidad_minima.article },
      { label: 'Relación largo/ancho del tanque',        value: `${dc.relacion_lw.value}`,                                    norm: dc.relacion_lw.article },
      { label: 'Separación mínima a pozos de agua',      value: '30 m',                                                       norm: 'Res. 0330/2017 Art. 143' },
      { label: 'Separación mínima a cuerpos de agua',    value: '30 m',                                                       norm: 'Res. 0330/2017 Art. 144' },
      { label: 'Separación mínima a edificaciones',      value: '5 m',                                                        norm: 'Res. 0330/2017 Art. 143' },
      { label: 'Nivel freático mínimo (fondo sistema)',  value: '1.20 m',                                                     norm: dc.nivel_freatico.article },
    ];

    drawTable(doc, criteria);

  } else {
    // Spain / international
    drawSubtitle(doc, 'Normativa aplicada');
    drawTable(doc, [
      { label: 'CTE DB-HS 5',   value: 'Saneamiento — Evacuación de aguas',       norm: 'Código Técnico de la Edificación' },
      { label: 'RD 1620/2007',  value: 'Reutilización de aguas depuradas',         norm: 'Real Decreto' },
      { label: 'NTE-ISS',       value: 'Instalaciones de Salubridad: Saneamiento', norm: 'Norma Tecnológica' },
    ]);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Section 2: Septic tank
// ─────────────────────────────────────────────────────────────────────────

function drawSepticTankSection(
  doc: PDFKit.PDFDocument,
  tank: SepticTankResult,
  colombia: boolean,
  sn: number
): void {
  drawSectionTitle(doc, 'Caudales y Dimensionado de Fosa Séptica', sn);

  const dc = DESIGN_CRITERIA;
  doc.moveDown(0.2);

  // ── Flow suite ──────────────────────────────────────────────────────
  drawSubtitle(doc, 'Caudales de diseño');
  const cr = tank.coeficiente_retorno ?? 0.85;
  const k1 = tank.k1_dia ?? 1.3;
  const k2 = tank.k2_hora ?? 2.0;

  drawTable(doc, [
    {
      label: `Q_AR medio  (n × q × Cr; Cr=${cr})`,
      value: `${tank.caudal_diario_litros.toLocaleString('es-ES')} L/día  (${tank.caudal_segundos} L/s)`,
      norm: colombia ? dc.dotacion_vivienda.article : undefined,
    },
    {
      label: `Q_max diario  (K₁=${k1} × Q_med)`,
      value: `${(tank.caudal_max_diario_litros ?? Math.round(tank.caudal_diario_litros * k1)).toLocaleString('es-ES')} L/día`,
    },
    {
      label: `Q_max horario  (K₁×K₂=${k1}×${k2})`,
      value: `${(tank.caudal_max_horario_litros ?? Math.round(tank.caudal_diario_litros * k1 * k2)).toLocaleString('es-ES')} L/día equiv.`,
    },
    {
      label: 'Q_mínimo  (0.30 × Q_med)',
      value: `${(tank.caudal_minimo_litros ?? Math.round(tank.caudal_diario_litros * 0.3)).toLocaleString('es-ES')} L/día`,
    },
  ]);

  // ── Temperature correction ──────────────────────────────────────────
  if (tank.temperatura_agua_c !== undefined && tank.factor_temperatura !== undefined) {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.textLight)
      .text(
        `Corrección térmica (Van't Hoff): T_agua = ${tank.temperatura_agua_c}°C → ` +
        `θ = 1.07^(T–25) = ${tank.factor_temperatura.toFixed(3)} → ` +
        `TRH mínimo ajustado = ${tank.trh_minimo_corregido_dias ?? tank.tiempo_retencion_dias} días (Res. 0330/2017 Art. 138).`,
        MARGIN_L, doc.y, { width: CONTENT_W, lineGap: 1.5 }
      );
    doc.moveDown(0.5);
  }

  // ── Volumes ──────────────────────────────────────────────────────────
  drawSubtitle(doc, 'Volúmenes del tanque');
  const vl = tank._metadata?.volumen_liquido_litros;
  const vs = tank._metadata?.volumen_lodos_litros;
  const vn = tank._metadata?.volumen_natas_litros;

  drawTable(doc, [
    {
      label: `V_L — líquido  (Q_med × TRH = ${tank.caudal_diario_litros} × ${tank.tiempo_retencion_dias})`,
      value: vl !== undefined ? `${vl.toLocaleString('es-ES')} L` : '—',
      norm: colombia ? dc.trh_minimo.article : undefined,
    },
    {
      label: `V_S — lodos  (50 L/hab·año × ${tank.intervalo_limpieza_anos ?? 3} años)`,
      value: vs !== undefined ? `${vs.toLocaleString('es-ES')} L` : '—',
      norm: colombia ? dc.lodos_acumulacion.article : undefined,
    },
    {
      label: 'V_N — natas  (0.70 × V_S)',
      value: vn !== undefined ? `${vn.toLocaleString('es-ES')} L` : '—',
      norm: colombia ? 'RAS 2000 Tít. E §E.5' : undefined,
    },
    {
      label: 'V_diseño = V_L + V_S + V_N',
      value: `${tank.volumen_util_litros.toLocaleString('es-ES')} L  (${(tank.volumen_util_litros / 1000).toFixed(2)} m³)`,
      norm: colombia ? dc.volumen_minimo.article : undefined,
    },
    {
      label: 'TRH verificado a Q_max horario',
      value: `${tank.trh_verificado_q_max_h_dias ?? '—'} días`,
      norm: colombia ? dc.trh_minimo.article : undefined,
    },
  ]);

  // ── Dimensions ────────────────────────────────────────────────────────
  drawSubtitle(doc, 'Dimensiones del tanque');
  drawTable(doc, [
    {
      label: 'Largo × Ancho × Profundidad útil',
      value: `${tank.dimensiones.largo_m} m × ${tank.dimensiones.ancho_m} m × ${tank.dimensiones.alto_util_m} m`,
      norm: colombia ? dc.profundidad_minima.article : undefined,
    },
    {
      label: 'Altura total (con borde libre)',
      value: `${tank.dimensiones.alto_total_m} m`,
    },
    {
      label: 'Número de compartimentos',
      value: `${tank.num_compartimentos}`,
      norm: colombia ? dc.relacion_lw.article : undefined,
    },
  ]);
}

// ─────────────────────────────────────────────────────────────────────────
// Section 3: Drainage field
// ─────────────────────────────────────────────────────────────────────────

function drawDrainageSection(
  doc: PDFKit.PDFDocument,
  field: DrainageFieldResult,
  colombia: boolean,
  sn: number
): void {
  drawSectionTitle(doc, 'Dimensionado del Campo de Infiltración', sn);

  const dc = DESIGN_CRITERIA;
  doc.moveDown(0.2);

  // Methodology note
  if (field.metodologia) {
    const m = field.metodologia;
    let metodNote = `Fuente de Ka: ${m.fuente_ka.replace(/_/g,' ')}`;
    if (m.t_perc_min_cm !== undefined) {
      metodNote += ` · T_perc = ${m.t_perc_min_cm} min/cm · Ka = ${m.ka_crites_tchobanoglous ?? field.ka_l_m2_dia} L/m²·día`;
    }
    metodNote += ` · ${m.norma_ref}`;
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(C.textLight)
      .text(metodNote, MARGIN_L, doc.y, { width: CONTENT_W, lineGap: 1.5 });
    doc.moveDown(0.5);
  }

  const rows: Array<{ label: string; value: string; norm?: string }> = [
    {
      label: 'Tipo de sistema',
      value: field.tipo_sistema.replace(/_/g, ' '),
    },
    {
      label: 'Ka bruto / Ka efectivo',
      value: `${field.ka_bruto_l_m2_dia} / ${field.ka_l_m2_dia} L/m²·día${field.etp_correccion_aplicada ? ' (ETP aplicada)' : ''}`,
    },
    {
      label: 'Factor de seguridad (FS)',
      value: `${field.factor_seguridad}×`,
      norm: colombia ? dc.factor_seguridad_campo?.article : undefined,
    },
    {
      label: 'Superficie neta (antes de FS)',
      value: `${field.dimensiones.superficie_neta_m2} m²`,
    },
    {
      label: 'Superficie de diseño (A = A_neta × FS)',
      value: `${field.dimensiones.superficie_diseno_m2} m²`,
      norm: colombia ? dc.factor_seguridad_campo?.article : undefined,
    },
    {
      label: 'Profundidad del sistema',
      value: `${field.dimensiones.profundidad_m} m`,
      norm: colombia ? dc.nivel_freatico.article : undefined,
    },
  ];

  if (field.dimensiones.longitud_total_zanjas_m !== null) {
    rows.push(
      {
        label: 'Longitud total de zanjas',
        value: `${field.dimensiones.longitud_total_zanjas_m} m`,
        norm: colombia ? dc.longitud_max_zanja?.article : undefined,
      },
      {
        label: 'Número de zanjas × longitud por zanja',
        value: `${field.dimensiones.num_zanjas} × ${field.dimensiones.longitud_por_zanja_m ?? '—'} m`,
      },
      {
        label: 'Separación entre zanjas',
        value: `${field.dimensiones.separacion_zanjas_m} m`,
        norm: colombia ? dc.separacion_zanjas?.article : undefined,
      },
      {
        label: 'Ancho de zanja',
        value: `${field.dimensiones.ancho_zanja_m} m`,
        norm: colombia ? dc.ancho_zanja?.article : undefined,
      }
    );
  }

  if (field.dimensiones.elevacion_monticulo_m !== undefined) {
    rows.push({
      label: 'Elevación sobre rasante (montículo)',
      value: `${field.dimensiones.elevacion_monticulo_m} m`,
    });
  }

  drawTable(doc, rows);

  // Field warnings
  if (field.validacion.avisos.length > 0) {
    doc.moveDown(0.3);
    for (const aviso of field.validacion.avisos) {
      doc.rect(MARGIN_L, doc.y, CONTENT_W, 2).fill(C.warning);
      doc.moveDown(0.15);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.warning)
        .text(`⚠  ${aviso}`, MARGIN_L + 8, doc.y, { width: CONTENT_W - 16, lineGap: 1.5 });
      doc.moveDown(0.4);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Section 4: Compliance checklist
// ─────────────────────────────────────────────────────────────────────────

function drawComplianceSection(
  doc: PDFKit.PDFDocument,
  validation: CteValidationResult,
  sn: number
): void {
  drawSectionTitle(doc, 'Verificación de Cumplimiento Normativo', sn);

  doc.moveDown(0.2);

  // Overall status badge
  const cumple = validation.cumple;
  const statusBg = cumple ? C.bgOk : C.bgErr;
  const statusColor = cumple ? C.success : C.error;
  const statusText = cumple ? '✓  CUMPLE NORMATIVA' : '✗  NO CUMPLE — REVISAR BLOQUEANTES';

  doc.rect(MARGIN_L, doc.y, CONTENT_W, 24).fill(statusBg);
  doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(12)
    .text(statusText, MARGIN_L + 12, doc.y + 5);
  doc.moveDown(1.4);

  // Blockers
  if (validation.bloqueantes.length > 0) {
    drawSubtitle(doc, 'Bloqueantes — requieren corrección antes de tramitar');
    for (const issue of validation.bloqueantes) {
      if (doc.y > PAGE_H - 100) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.error)
        .text(`[${issue.codigo}] ${issue.articulo}`, MARGIN_L, doc.y);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.text)
        .text(issue.descripcion, MARGIN_L + 10, doc.y, { width: CONTENT_W - 10, lineGap: 1.5 });
      doc.moveDown(0.5);
      drawDivider(doc);
    }
  }

  // Warnings
  if (validation.advertencias.length > 0) {
    doc.moveDown(0.2);
    drawSubtitle(doc, 'Advertencias — recomendable corregir');
    for (const issue of validation.advertencias) {
      if (doc.y > PAGE_H - 100) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.warning)
        .text(`[${issue.codigo}] ${issue.articulo}`, MARGIN_L, doc.y);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.text)
        .text(issue.descripcion, MARGIN_L + 10, doc.y, { width: CONTENT_W - 10, lineGap: 1.5 });
      doc.moveDown(0.5);
      drawDivider(doc);
    }
  }

  if (validation.bloqueantes.length === 0 && validation.advertencias.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(C.textLight)
      .text('No se detectaron bloqueantes ni advertencias. El diseño cumple los criterios de dimensionamiento verificados.', MARGIN_L);
    doc.moveDown(0.5);
  }

  // ── Visual checklist ─────────────────────────────────────────────────
  doc.moveDown(0.3);
  drawSubtitle(doc, 'Checklist de requisitos Res. 0330/2017');

  const checkItems: Array<{ label: string; ok: boolean; value: string; norm: string }> = [];

  // Build checklist from bloqueantes/advertencias codes
  const blockedCodes = new Set(validation.bloqueantes.map(b => b.codigo));
  const warnCodes    = new Set(validation.advertencias.map(w => w.codigo));

  const allChecks = [
    { codigo: 'TRH',    label: 'TRH ≥ mínimo normativo',                    norm: 'Art. 138' },
    { codigo: 'VOL',    label: 'Volumen útil ≥ mínimo (m³)',                 norm: 'Art. 135' },
    { codigo: 'PROF',   label: 'Profundidad útil ≥ 1.20 m',                 norm: 'Art. 136' },
    { codigo: 'ANCHO',  label: 'Ancho interno ≥ 0.60 m',                    norm: 'Art. 136' },
    { codigo: 'REL_LW', label: 'Relación L/W dentro de rangos',             norm: 'Art. 136' },
    { codigo: 'CVO',    label: 'Carga volumétrica orgánica ≤ 0.30 kg/m³·d', norm: 'Art. 139' },
    { codigo: 'SRT',    label: 'Tiempo de retención de sólidos ≥ 20 días',  norm: 'Art. 140' },
    { codigo: 'NF',     label: 'Nivel freático ≥ 1.20 m bajo el campo',     norm: 'Art. 144' },
    { codigo: 'POZO',   label: 'Distancia a captaciones ≥ 30 m',            norm: 'Art. 143' },
    { codigo: 'EDIF',   label: 'Distancia a edificaciones ≥ 5 m',           norm: 'Art. 143' },
  ];

  for (const chk of allChecks) {
    const ok = !blockedCodes.has(chk.codigo) && !warnCodes.has(chk.codigo);
    const bloq = validation.bloqueantes.find(b => b.codigo === chk.codigo);
    const warn = validation.advertencias.find(w => w.codigo === chk.codigo);
    const valueStr = ok ? 'Cumple' : bloq ? 'NO CUMPLE' : 'ADVERTENCIA';
    checkItems.push({ label: chk.label, ok, value: valueStr, norm: `Res. 0330/2017 ${chk.norm}` });
  }

  for (const item of checkItems) {
    drawCheckRow(doc, item.ok, item.label, item.value, item.norm);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Section 5: Geospatial verification
// ─────────────────────────────────────────────────────────────────────────

function drawGeospatialSection(
  doc: PDFKit.PDFDocument,
  geo: GeospatialResult,
  sn: number
): void {
  drawSectionTitle(doc, 'Verificaciones Geoespaciales del Sitio', sn);

  doc.moveDown(0.2);

  const cumple = geo.cumple;
  const statusBg = cumple ? C.bgOk : C.bgErr;
  const statusColor = cumple ? C.success : C.error;

  doc.rect(MARGIN_L, doc.y, CONTENT_W, 24).fill(statusBg);
  doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(12)
    .text(cumple ? '✓  SITIO APTO' : '✗  RESTRICCIONES DETECTADAS', MARGIN_L + 12, doc.y + 5);
  doc.moveDown(1.4);

  for (const check of geo.checks) {
    if (doc.y > PAGE_H - 120) doc.addPage();

    const badgeColor = check.estado === 'OK' ? C.success : check.estado === 'ALERTA' ? C.warning : C.error;
    const y = doc.y;

    doc.rect(MARGIN_L, y, 20, 14).fill(badgeColor);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(6.5)
      .text(check.estado === 'OK' ? '✓ OK' : check.estado === 'ALERTA' ? '⚠ ALT' : '✗ BLQ', MARGIN_L + 1, y + 4);

    doc.fillColor(C.text).font('Helvetica-Bold').fontSize(9)
      .text(check.parametro, MARGIN_L + 26, y, { width: CONTENT_W - 26 });

    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(8.5).fillColor(C.textLight)
      .text(check.mensaje, MARGIN_L + 26, doc.y, { width: CONTENT_W - 26, lineGap: 1.5 });

    if (check.sugerencia) {
      doc.moveDown(0.15);
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.warning)
        .text(`↳ ${check.sugerencia}`, MARGIN_L + 26, doc.y, { width: CONTENT_W - 26 });
    }

    doc.moveDown(0.15);
    doc.font('Helvetica').fontSize(7).fillColor(C.accent)
      .text(check.norma, MARGIN_L + 26, doc.y);
    doc.moveDown(0.55);
    drawDivider(doc);
  }

  if (geo.alternativas_tecnologicas && geo.alternativas_tecnologicas.length > 0) {
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.warning)
      .text('Alternativas tecnológicas recomendadas por nivel freático alto:');
    doc.moveDown(0.3);
    for (const alt of geo.alternativas_tecnologicas) {
      doc.font('Helvetica').fontSize(9).fillColor(C.text)
        .text(`• ${alt}`, MARGIN_L + 10, doc.y, { width: CONTENT_W - 10 });
      doc.moveDown(0.3);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Section 6: Next steps
// ─────────────────────────────────────────────────────────────────────────

function drawNextStepsColombia(doc: PDFKit.PDFDocument, sn: number): void {
  drawSectionTitle(doc, 'Próximos Pasos — Trámite en Colombia', sn);

  doc.moveDown(0.2);

  COLOMBIA_NEXT_STEPS.forEach((step, i) => {
    if (doc.y > PAGE_H - 130) doc.addPage();

    const y = doc.y;
    doc.circle(MARGIN_L + 10, y + 8, 10).fill(C.primary);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9)
      .text(`${i + 1}`, MARGIN_L + 6, y + 4);

    doc.fillColor(C.text).font('Helvetica-Bold').fontSize(10)
      .text(step.title, MARGIN_L + 26, y, { width: CONTENT_W - 26 });

    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor(C.textLight)
      .text(step.body, MARGIN_L + 26, doc.y, { width: CONTENT_W - 26, lineGap: 1.5 });
    doc.moveDown(0.7);
    drawDivider(doc);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Section 7: References
// ─────────────────────────────────────────────────────────────────────────

function drawReferences(doc: PDFKit.PDFDocument, refs: string[], sn: number): void {
  drawSectionTitle(doc, 'Referencias Normativas', sn);
  doc.moveDown(0.2);

  for (const ref of refs) {
    doc.font('Helvetica').fontSize(9).fillColor(C.textLight)
      .text(`• ${ref}`, MARGIN_L + 10, doc.y, { width: CONTENT_W - 10 });
    doc.moveDown(0.35);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Section 8: Signature / sign-off
// ─────────────────────────────────────────────────────────────────────────

function drawSignatureSection(
  doc: PDFKit.PDFDocument,
  proyecto: ProjectInfo,
  sn: number
): void {
  drawSectionTitle(doc, 'Firma y Declaración Profesional', sn);

  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(9.5).fillColor(C.textLight)
    .text(
      'El profesional responsable declara que los criterios de dimensionamiento aplicados ' +
      'corresponden a la normativa vigente y que la presente memoria técnica ha sido elaborada ' +
      'con suficiente información para su carácter orientativo. La ejecución definitiva requiere ' +
      'visita de campo, estudio de suelo y firma en planos constructivos.',
      MARGIN_L, doc.y, { width: CONTENT_W, lineGap: 2 }
    );

  doc.moveDown(1.5);

  // Signature area — two columns
  const colW = (CONTENT_W - 40) / 2;
  const col2X = MARGIN_L + colW + 40;

  // Column 1: Professional
  const c1Y = doc.y;
  doc.rect(MARGIN_L, c1Y, colW, 90).stroke(C.divider);

  doc.font('Helvetica').fontSize(8.5).fillColor(C.textLight)
    .text('Nombre del profesional:', MARGIN_L + 8, c1Y + 10);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text)
    .text(proyecto.redactor ?? '___________________________', MARGIN_L + 8, c1Y + 24, { width: colW - 16 });

  doc.font('Helvetica').fontSize(8.5).fillColor(C.textLight)
    .text('Matrícula profesional:', MARGIN_L + 8, c1Y + 46);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text)
    .text(proyecto.matricula ?? '___________________________', MARGIN_L + 8, c1Y + 60);

  doc.font('Helvetica').fontSize(8).fillColor(C.textLight)
    .text('Firma: _________________________________', MARGIN_L + 8, c1Y + 76);

  // Column 2: Date and project owner
  doc.rect(col2X, c1Y, colW, 90).stroke(C.divider);

  doc.font('Helvetica').fontSize(8.5).fillColor(C.textLight)
    .text('Propietario / Cliente:', col2X + 8, c1Y + 10);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text)
    .text(proyecto.propietario ?? '___________________________', col2X + 8, c1Y + 24, { width: colW - 16 });

  doc.font('Helvetica').fontSize(8.5).fillColor(C.textLight)
    .text('Fecha:', col2X + 8, c1Y + 46);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text)
    .text(formatDate(proyecto.fecha), col2X + 8, c1Y + 60);

  doc.font('Helvetica').fontSize(8).fillColor(C.textLight)
    .text('Firma: _________________________________', col2X + 8, c1Y + 76);

  doc.y = c1Y + 110;

  // HydroStack watermark / generation note
  doc.moveDown(0.8);
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.textLight)
    .text(
      `Generado automáticamente por HydroStack · Hydro_Agent · ${formatDate()} · ` +
      'Verificar datos de campo antes de uso definitivo.',
      MARGIN_L, doc.y, { width: CONTENT_W, align: 'center' }
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Bogotá POT note
// ─────────────────────────────────────────────────────────────────────────

function drawPotNoteBogota(doc: PDFKit.PDFDocument): void {
  if (doc.y > PAGE_H - 100) doc.addPage();
  doc.moveDown(0.5);

  const dY = doc.y;
  doc.rect(MARGIN_L, dY, CONTENT_W, 55).fillAndStroke(C.bgWarn, '#d4a820');

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.warning)
    .text(`⚠  ${BOGOTA_POT.label}`, MARGIN_L + 12, dY + 10, { width: CONTENT_W - 24 });

  doc.font('Helvetica').fontSize(8).fillColor('#6b5010')
    .text(BOGOTA_POT.note, MARGIN_L + 12, dY + 26, { width: CONTENT_W - 24, lineGap: 1.5 });

  doc.y = dY + 68;
}

// ─────────────────────────────────────────────────────────────────────────
// Location & climate section (Fase 6)
// ─────────────────────────────────────────────────────────────────────────

function drawLocationSection(doc: PDFKit.PDFDocument, geo: GeoLocationData, sn: number): void {
  drawSectionTitle(doc, 'Datos de Geolocalización del Predio', sn);

  doc.moveDown(0.3);

  // Coordinate block
  const rows: [string, string][] = [];
  if (geo.lat != null && geo.lon != null) {
    rows.push(['Latitud (WGS84 / MAGNA-SIRGAS geog.)', `${geo.lat.toFixed(6)}°`]);
    rows.push(['Longitud (WGS84 / MAGNA-SIRGAS geog.)', `${geo.lon.toFixed(6)}°`]);
    rows.push(['Sistema geodésico', 'WGS84 ≡ MAGNA-SIRGAS geográfico (EPSG:4686)']);
    rows.push(['Referencia OSM', `openstreetmap.org/#map=15/${geo.lat.toFixed(4)}/${geo.lon.toFixed(4)}`]);
  }
  if (geo.address)   rows.push(['Dirección (Nominatim/OSM)', geo.address.slice(0, 90)]);
  if (geo.dept)      rows.push(['Departamento', geo.dept]);
  if (geo.mun)       rows.push(['Municipio', geo.mun]);
  if (geo.vereda)    rows.push(['Vereda / Corregimiento', geo.vereda]);
  if (geo.cedula)    rows.push(['Cédula catastral (IGAC)', geo.cedula]);
  if (geo.matricula_inmobiliaria) rows.push(['Matrícula inmobiliaria (ORIP)', geo.matricula_inmobiliaria]);
  if (geo.area_predio_m2) rows.push(['Área del predio', `${geo.area_predio_m2.toLocaleString('es-CO')} m²`]);
  if (geo.tenencia)  rows.push(['Tipo de tenencia', geo.tenencia]);
  if (geo.zoning)    rows.push(['Régimen POT', geo.zoning]);

  // Draw table
  let y = doc.y;
  const colKey = 190;
  const colVal = CONTENT_W - colKey;
  rows.forEach(([k, v], i) => {
    const bg = i % 2 === 0 ? '#f5f8fa' : '#ffffff';
    doc.rect(MARGIN_L, y, CONTENT_W, 15).fillColor(bg).fill();
    doc.rect(MARGIN_L, y, CONTENT_W, 15).strokeColor(C.divider).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(C.textLight)
      .text(k, MARGIN_L + 5, y + 4, { width: colKey - 8, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text)
      .text(v, MARGIN_L + colKey + 5, y + 4, { width: colVal - 8, lineBreak: false });
    y += 15;
  });
  doc.y = y + 10;

  // Viability block
  if (geo.viability_status) {
    const viabColors: Record<string, string> = {
      viable: '#1a5c2a', alerta: '#7a5800', bloqueante: '#7a1a1a',
    };
    const viabBg: Record<string, string> = {
      viable: '#e8f5ec', alerta: '#fff8e1', bloqueante: '#fdecea',
    };
    const color = viabColors[geo.viability_status] ?? C.textLight;
    const bg    = viabBg[geo.viability_status]    ?? '#f5f8fa';

    doc.moveDown(0.4);
    const vY = doc.y;
    doc.rect(MARGIN_L, vY, CONTENT_W, 40).fillColor(bg).fill();
    doc.rect(MARGIN_L, vY, CONTENT_W, 40).strokeColor(color).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(color)
      .text(`Viabilidad SITARD: ${geo.viability_status?.toUpperCase()} — ${geo.viability_title ?? ''}`,
        MARGIN_L + 8, vY + 8, { width: CONTENT_W - 16 });
    doc.y = vY + 48;
  }

  // Authority + climate side by side
  doc.moveDown(0.4);
  const halfW = (CONTENT_W - 12) / 2;

  if (geo.authorityFull) {
    const aY = doc.y;
    doc.rect(MARGIN_L, aY, halfW, 55).fillColor('#f0f4f8').fill();
    doc.rect(MARGIN_L, aY, halfW, 55).strokeColor(C.divider).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent)
      .text('Autoridad ambiental competente', MARGIN_L + 8, aY + 8, { width: halfW - 16 });
    doc.font('Helvetica').fontSize(8).fillColor(C.textLight)
      .text(geo.authorityFull, MARGIN_L + 8, aY + 22, { width: halfW - 16, lineGap: 1 });
    doc.y = aY + 63;
  }

  if (geo.elevation_m != null || geo.temp_media_c != null) {
    const climX = MARGIN_L + halfW + 12;
    const aY = doc.y;
    doc.rect(climX, aY, halfW, 55).fillColor('#f0f4f8').fill();
    doc.rect(climX, aY, halfW, 55).strokeColor(C.divider).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent)
      .text('Datos climáticos (Open-Meteo)', climX + 8, aY + 8, { width: halfW - 16 });
    const climLines = [
      geo.elevation_m != null ? `Altitud: ${geo.elevation_m} m.s.n.m.` : '',
      geo.temp_media_c != null ? `T media: ${geo.temp_media_c}°C` : '',
      geo.etp_media_mm_dia != null ? `ETP estimada: ${geo.etp_media_mm_dia} mm/día` : '',
      geo.clima_tipo ? `Clima: ${geo.clima_tipo}` : '',
    ].filter(Boolean).join(' · ');
    doc.font('Helvetica').fontSize(8).fillColor(C.textLight)
      .text(climLines, climX + 8, aY + 22, { width: halfW - 16, lineGap: 1 });
    doc.y = aY + 63;
  }

  doc.moveDown(0.5);
}

// ─────────────────────────────────────────────────────────────────────────
// Main PDF generation function
// ─────────────────────────────────────────────────────────────────────────

export async function generatePdfReport(input: PdfReportInput): Promise<PdfReportResult> {
  ensureReportsDir();

  const report_id = randomUUID();
  const filename  = `${report_id}.pdf`;
  const file_path = join(REPORTS_DIR, filename);
  const download_url = `/reports/${filename}`;

  const colombia = isColombiaProject(input);
  const bogota   = isBogotaProject(input);

  return new Promise((resolve, reject) => {
    try {
      let pageCount = 0;

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: HEADER_H + 14, bottom: 55, left: MARGIN_L, right: MARGIN_R },
        info: {
          Title: `Memoria Técnica — ${input.proyecto.nombre}`,
          Author: input.proyecto.redactor ?? 'Hydro_Agent (HydroStack)',
          Subject: 'SITARD — Sistema Individual de Tratamiento de Aguas Residuales Domésticas',
          Keywords: colombia
            ? 'Res. 0330/2017, Dec. 1076/2015, Res. 0631/2015, fosa séptica, SITARD, Colombia'
            : 'CTE DB-HS 5, RD 1620/2007, fosa séptica',
        },
      });

      // Track page count for header/footer
      doc.on('pageAdded', () => { pageCount++; });

      // Register per-page header & footer (skip page 1 = cover)
      registerHeaderFooter(doc, input.proyecto, report_id, () => pageCount);

      const stream = createWriteStream(file_path);
      doc.pipe(stream);

      // Page 1: Cover (pageAdded fires → pageCount becomes 1 → header skipped)
      pageCount = 1;
      drawCover(doc, input.proyecto, report_id, colombia);

      // Start content pages
      doc.addPage();

      // Section counter
      let sn = 1;

      // 0. Location data (Fase 6) — if provided
      if (input.location_data) {
        drawLocationSection(doc, input.location_data, sn++);
      }

      // 1. Normative framework
      drawNormativeSection(doc, colombia, sn++);

      // 2. Septic tank
      if (input.septic_tank) {
        drawSepticTankSection(doc, input.septic_tank, colombia, sn++);
      }

      // 3. Drainage field
      if (input.drainage_field) {
        drawDrainageSection(doc, input.drainage_field, colombia, sn++);
      }

      // 4. Compliance checklist
      if (input.validation) {
        drawComplianceSection(doc, input.validation, sn++);
      }

      // 5. Geospatial
      if (input.validation?.verificaciones_geoespaciales) {
        drawGeospatialSection(doc, input.validation.verificaciones_geoespaciales, sn++);
      }

      // 6. Next steps
      if (colombia) {
        drawNextStepsColombia(doc, sn++);
        if (bogota) drawPotNoteBogota(doc);
      }

      // 7. References
      const refs = colombia
        ? COLOMBIA_REFERENCIAS_NORMATIVAS
        : (input.validation?.referencias_normativas ?? []);
      if (refs.length > 0) {
        drawReferences(doc, refs, sn++);
      }

      // 8. Signature
      drawSignatureSection(doc, input.proyecto, sn);

      doc.end();

      stream.on('finish', () => {
        resolve({ report_id, download_url, file_path, generated_at: new Date().toISOString() });
      });

      stream.on('error', (err) => {
        reject(new Error(`Failed to write PDF: ${err.message}`));
      });
    } catch (error) {
      reject(error);
    }
  });
}
