import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseFormulario1Xls } from '@/src/lib/pliego/rules/parseFormulario1';
import { ParseoNoConfiable } from '@/src/lib/pliego/rules/errors';

async function workbookBuffer(filas: unknown[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Presupuesto');
  filas.forEach((fila) => ws.addRow(fila));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe('parseFormulario1Xls', () => {
  it('detecta encabezados por firma de columna, no por posición fija, y mapea ítems', async () => {
    const buffer = await workbookBuffer([
      ['Formulario 1 - Formulario de Presupuesto Oficial'],
      [],
      ['Ítem', 'Descripción', 'Unidad', 'Cantidad', 'Valor Unitario', 'Valor Total'],
      ['1.1', 'Excavación manual', 'M3', 10, 50000, 500000],
      ['1.2', 'Concreto 3000 PSI', 'M3', 5, 800000, 4000000],
    ]);
    const capitulos = await parseFormulario1Xls(buffer);
    expect(capitulos).toHaveLength(1);
    expect(capitulos[0].items).toHaveLength(2);
    expect(capitulos[0].items[0]).toMatchObject({
      codigo: '1.1',
      descripcion: 'Excavación manual',
      unidad: 'M3',
      cantidad: 10,
      valor_unitario: 50000,
      valor_total: 500000,
    });
  });

  it('agrupa en capítulos nuevos cada vez que aparece una fila de solo texto (sin cantidades)', async () => {
    const buffer = await workbookBuffer([
      ['Ítem', 'Descripción', 'Unidad', 'Cantidad', 'Valor Unitario', 'Valor Total'],
      ['CIMENTACIONES PLANTA SANTA BARBARA'],
      ['1.1', 'Excavación manual', 'M3', 10, 50000, 500000],
      ['PLANTA DE TRATAMIENTO SANTA BARBARA'],
      ['2.1', 'Filtro de arena', 'UND', 1, 2000000, 2000000],
    ]);
    const capitulos = await parseFormulario1Xls(buffer);
    expect(capitulos.map((c) => c.nombre)).toEqual([
      'CIMENTACIONES PLANTA SANTA BARBARA',
      'PLANTA DE TRATAMIENTO SANTA BARBARA',
    ]);
    expect(capitulos[0].items).toHaveLength(1);
    expect(capitulos[1].items).toHaveLength(1);
  });

  it('parsea números en formato colombiano cuando la celda es texto ("1.234.567,89")', async () => {
    const buffer = await workbookBuffer([
      ['Ítem', 'Descripción', 'Unidad', 'Cantidad', 'Valor Unitario', 'Valor Total'],
      ['1.1', 'Excavación manual', 'M3', '10', '50.000,00', '500.000,00'],
    ]);
    const capitulos = await parseFormulario1Xls(buffer);
    expect(capitulos[0].items[0].valor_unitario).toBe(50000);
    expect(capitulos[0].items[0].valor_total).toBe(500000);
  });

  it('lanza ParseoNoConfiable si no encuentra fila de encabezados reconocible', async () => {
    const buffer = await workbookBuffer([
      ['Columna A', 'Columna B', 'Columna C'],
      ['x', 'y', 'z'],
    ]);
    await expect(parseFormulario1Xls(buffer)).rejects.toThrow(ParseoNoConfiable);
  });

  it('lanza ParseoNoConfiable si hay encabezados pero ningún ítem válido debajo', async () => {
    const buffer = await workbookBuffer([
      ['Ítem', 'Descripción', 'Unidad', 'Cantidad', 'Valor Unitario', 'Valor Total'],
      [],
      [],
    ]);
    await expect(parseFormulario1Xls(buffer)).rejects.toThrow(ParseoNoConfiable);
  });

  it('lanza ParseoNoConfiable si el archivo no es un Excel válido', async () => {
    await expect(parseFormulario1Xls(Buffer.from('no soy un excel'))).rejects.toThrow(ParseoNoConfiable);
  });
});
