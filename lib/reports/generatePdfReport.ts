/**
 * PDF report generator for Hydro_Agent.
 *
 * Generates an A4 technical memo with: cover, project data, calculation results,
 * CTE/RD validation, and references. Saves to public/reports/{uuid}.pdf and
 * returns the download URL.
 *
 * Uses pdfkit (lighter than @react-pdf/renderer for backend-only generation).
 */

import PDFDocument from 'pdfkit';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { SepticTankResult } from '@/lib/calculations/septicTank';
import type { DrainageFieldResult } from '@/lib/calculations/drainageField';
import type { CteValidationResult } from '@/lib/validation/cteValidator';

export interface ProjectInfo {
  nombre: string;
  ubicacion: string;
  fecha?: string;
  redactor?: string;
}

export interface PdfReportInput {
  septic_tank?: SepticTankResult;
  drainage_field?: DrainageFieldResult;
  validation?: CteValidationResult;
  proyecto: ProjectInfo;
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
const COLORS = {
  primary: '#1a4a6a',
  secondary: '#3a7090',
  accent: '#00a0c0',
  text: '#2a3a4a',
  textLight: '#5a6a7a',
  success: '#3a7050',
  warning: '#9a7030',
  error: '#a04040',
  divider: '#cfd8dc',
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function ensureReportsDir(): void {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function formatDate(date: string | undefined): string {
  if (date) return date;
  const now = new Date();
  return now.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function drawDivider(doc: PDFKit.PDFDocument): void {
  doc
    .strokeColor(COLORS.divider)
    .lineWidth(0.5)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown(0.5);
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.8);
  doc.fontSize(14).fillColor(COLORS.primary).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  drawDivider(doc);
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(10);
}

function drawKeyValue(doc: PDFKit.PDFDocument, key: string, value: string): void {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(`${key}: `, {
    continued: true,
  });
  doc.font('Helvetica').fillColor(COLORS.textLight).text(value);
}

function drawTable(
  doc: PDFKit.PDFDocument,
  rows: Array<{ label: string; value: string }>
): void {
  const startX = 60;
  const labelWidth = 200;
  const valueX = startX + labelWidth + 10;

  for (const row of rows) {
    const y = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(row.label, startX, y, {
      width: labelWidth,
    });
    doc.font('Helvetica-Bold').fillColor(COLORS.primary).text(row.value, valueX, y);
    doc.moveDown(0.4);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PDF Sections
// ─────────────────────────────────────────────────────────────────────────

function drawCover(doc: PDFKit.PDFDocument, proyecto: ProjectInfo): void {
  // Header bar
  doc.rect(0, 0, 595, 80).fill(COLORS.primary);
  doc.fillColor('white').fontSize(24).font('Helvetica-Bold').text('HYDROSTACK', 50, 30);
  doc.fontSize(11).font('Helvetica').text('Memoria Técnica de Saneamiento Individual', 50, 58);

  doc.moveDown(8);
  doc.fillColor(COLORS.text).fontSize(20).font('Helvetica-Bold').text('Memoria Técnica');
  doc.moveDown(0.3);
  doc.fontSize(14).fillColor(COLORS.secondary).font('Helvetica').text('Sistema individual de tratamiento de aguas residuales (SITARD)');
  doc.moveDown(2);

  // Project info box
  doc.rect(50, doc.y, 495, 120).fillAndStroke('#f5f9fc', COLORS.divider);
  const boxY = doc.y - 110;
  doc.fillColor(COLORS.text).fontSize(10);

  doc.font('Helvetica-Bold').text('Proyecto:', 70, boxY + 15);
  doc.font('Helvetica').text(proyecto.nombre, 170, boxY + 15);

  doc.font('Helvetica-Bold').text('Ubicación:', 70, boxY + 35);
  doc.font('Helvetica').text(proyecto.ubicacion, 170, boxY + 35);

  doc.font('Helvetica-Bold').text('Fecha:', 70, boxY + 55);
  doc.font('Helvetica').text(formatDate(proyecto.fecha), 170, boxY + 55);

  if (proyecto.redactor) {
    doc.font('Helvetica-Bold').text('Redactor:', 70, boxY + 75);
    doc.font('Helvetica').text(proyecto.redactor, 170, boxY + 75);
  }

  doc.font('Helvetica-Bold').text('Normativa:', 70, boxY + 95);
  doc.font('Helvetica').fillColor(COLORS.accent).text('CTE DB-HS 5 · RD 1620/2007', 170, boxY + 95);

  doc.moveDown(3);
}

function drawSepticTankSection(doc: PDFKit.PDFDocument, tank: SepticTankResult): void {
  drawSectionTitle(doc, '1. Dimensionado de Fosa Séptica');

  doc.moveDown(0.3);
  const rows = [
    {
      label: 'Caudal diario de diseño',
      value: `${tank.caudal_diario_litros.toLocaleString('es-ES')} L/día (${tank.caudal_segundos} L/s)`,
    },
    {
      label: 'Volumen útil',
      value: `${tank.volumen_util_litros.toLocaleString('es-ES')} L (${(tank.volumen_util_litros / 1000).toFixed(2)} m³)`,
    },
    {
      label: 'Volumen total (con resguardo)',
      value: `${tank.volumen_total_litros.toLocaleString('es-ES')} L`,
    },
    {
      label: 'Tiempo de retención hidráulica',
      value: `${tank.tiempo_retencion_dias} días`,
    },
    {
      label: 'Número de compartimentos',
      value: `${tank.num_compartimentos}`,
    },
    {
      label: 'Largo × Ancho × Profundidad',
      value: `${tank.dimensiones.largo_m} m × ${tank.dimensiones.ancho_m} m × ${tank.dimensiones.alto_util_m} m (útil)`,
    },
    {
      label: 'Altura total (con resguardo)',
      value: `${tank.dimensiones.alto_total_m} m`,
    },
  ];
  drawTable(doc, rows);
}

function drawDrainageSection(doc: PDFKit.PDFDocument, field: DrainageFieldResult): void {
  drawSectionTitle(doc, '2. Dimensionado del Campo de Infiltración');

  doc.moveDown(0.3);
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Tipo de sistema', value: field.tipo_sistema.replace(/_/g, ' ') },
    {
      label: 'Permeabilidad del suelo (K)',
      value: `${field.permeabilidad_suelo_m_dia} m/día (${field._metadata?.permeabilidad_m_s ?? 'N/A'} m/s)`,
    },
    {
      label: 'Carga hidráulica',
      value: `${field.carga_hidraulica_m_dia} m³/m²·día`,
    },
    {
      label: 'Superficie de infiltración',
      value: `${field.dimensiones.superficie_infiltracion_m2} m²`,
    },
    {
      label: 'Profundidad del sistema',
      value: `${field.dimensiones.profundidad_m} m`,
    },
  ];

  if (field.dimensiones.longitud_total_zanjas_m !== null) {
    rows.push({
      label: 'Longitud total de zanjas',
      value: `${field.dimensiones.longitud_total_zanjas_m} m`,
    });
    rows.push({
      label: 'Número de zanjas',
      value: `${field.dimensiones.num_zanjas}`,
    });
    rows.push({
      label: 'Separación entre zanjas',
      value: `${field.dimensiones.separacion_zanjas_m} m`,
    });
    rows.push({
      label: 'Ancho de zanja',
      value: `${field.dimensiones.ancho_zanja_m} m`,
    });
  }

  drawTable(doc, rows);
}

function drawValidationSection(
  doc: PDFKit.PDFDocument,
  validation: CteValidationResult
): void {
  drawSectionTitle(doc, '3. Validación Normativa');

  doc.moveDown(0.3);
  const status = validation.cumple ? '✓ CUMPLE NORMATIVA' : '✗ NO CUMPLE NORMATIVA';
  const color = validation.cumple ? COLORS.success : COLORS.error;
  doc.fontSize(12).fillColor(color).font('Helvetica-Bold').text(status);
  doc.moveDown(0.6);

  if (validation.bloqueantes.length > 0) {
    doc.fontSize(11).fillColor(COLORS.error).font('Helvetica-Bold').text('Bloqueantes:');
    doc.moveDown(0.3);
    for (const issue of validation.bloqueantes) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.error).text(`[${issue.codigo}] ${issue.articulo}`);
      doc.font('Helvetica').fillColor(COLORS.text).text(issue.descripcion, { indent: 10 });
      doc.moveDown(0.3);
    }
  }

  if (validation.advertencias.length > 0) {
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor(COLORS.warning).font('Helvetica-Bold').text('Advertencias:');
    doc.moveDown(0.3);
    for (const issue of validation.advertencias) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.warning).text(`[${issue.codigo}] ${issue.articulo}`);
      doc.font('Helvetica').fillColor(COLORS.text).text(issue.descripcion, { indent: 10 });
      doc.moveDown(0.3);
    }
  }

  if (validation.bloqueantes.length === 0 && validation.advertencias.length === 0) {
    doc.font('Helvetica').fillColor(COLORS.textLight).text(
      'No se han detectado bloqueantes ni advertencias. El diseño cumple los requisitos verificados ' +
      'del CTE DB-HS 5 y RD 1620/2007.'
    );
  }
}

function drawReferences(doc: PDFKit.PDFDocument, refs: string[]): void {
  drawSectionTitle(doc, '4. Referencias Normativas');
  doc.moveDown(0.3);

  for (const ref of refs) {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.textLight).text(`• ${ref}`);
    doc.moveDown(0.2);
  }

  doc.moveDown(0.5);
  doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica-Oblique').text(
    'Esta memoria tiene carácter orientativo. La ejecución final del proyecto requiere validación por técnico ' +
    'cualificado y solicitud de permisos al organismo competente (Confederación Hidrográfica y Ayuntamiento).'
  );
}

function drawFooter(doc: PDFKit.PDFDocument, reportId: string): void {
  doc.fontSize(7).fillColor(COLORS.textLight).text(
    `Generado por Hydro_Agent · Report ID: ${reportId}`,
    50,
    800,
    { align: 'center', width: 495 }
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main PDF generation function
// ─────────────────────────────────────────────────────────────────────────

export async function generatePdfReport(input: PdfReportInput): Promise<PdfReportResult> {
  ensureReportsDir();

  const report_id = randomUUID();
  const filename = `${report_id}.pdf`;
  const file_path = join(REPORTS_DIR, filename);
  const download_url = `/reports/${filename}`;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Memoria Técnica - ${input.proyecto.nombre}`,
          Author: 'Hydro_Agent (HydroStack)',
          Subject: 'Saneamiento Individual',
          Keywords: 'CTE DB-HS 5, RD 1620/2007, fosa séptica',
        },
      });

      const stream = createWriteStream(file_path);
      doc.pipe(stream);

      // Cover
      drawCover(doc, input.proyecto);

      // Sections
      if (input.septic_tank) {
        drawSepticTankSection(doc, input.septic_tank);
      }
      if (input.drainage_field) {
        drawDrainageSection(doc, input.drainage_field);
      }
      if (input.validation) {
        drawValidationSection(doc, input.validation);
        drawReferences(doc, input.validation.referencias_normativas);
      }

      // Footer on each page
      drawFooter(doc, report_id);

      doc.end();

      stream.on('finish', () => {
        resolve({
          report_id,
          download_url,
          file_path,
          generated_at: new Date().toISOString(),
        });
      });

      stream.on('error', (err) => {
        reject(new Error(`Failed to write PDF: ${err.message}`));
      });
    } catch (error) {
      reject(error);
    }
  });
}
