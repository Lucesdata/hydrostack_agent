/**
 * Integration tests for tool composition.
 *
 * Tests the tool registry and chained execution WITHOUT calling the LLM.
 * This verifies that tools can be composed: output of one feeds into the next.
 */

import { describe, it, expect } from 'vitest';
import { executeTool, listToolNames, tools } from '@/src/lib/agent/tools';

describe('Tool registry', () => {
  it('should register exactly 4 tools', () => {
    const names = listToolNames();
    expect(names).toHaveLength(4);
    expect(names).toContain('calculate_septic_tank');
    expect(names).toContain('calculate_drainage_field');
    expect(names).toContain('validate_against_cte');
    expect(names).toContain('generate_pdf_report');
  });

  it('should expose 4 tool definitions for the LLM', () => {
    expect(tools).toHaveLength(4);
    for (const tool of tools) {
      expect((tool as any).type).toBe('function');
      expect((tool as any).function.name).toBeTruthy();
      expect((tool as any).function.description).toBeTruthy();
      expect((tool as any).function.parameters).toBeTruthy();
    }
  });
});

describe('Tool composition (chained execution)', () => {
  it('should chain calculate_septic_tank → calculate_drainage_field', async () => {
    // Step 1: Calculate septic tank
    const tankResult: any = await executeTool('calculate_septic_tank', {
      habitantes_equivalentes: 6,
      tipo_uso: 'vivienda_unifamiliar',
    });

    expect(tankResult.caudal_diario_litros).toBeGreaterThan(0);

    // Step 2: Feed caudal into drainage field
    const fieldResult: any = await executeTool('calculate_drainage_field', {
      caudal_diario_l: tankResult.caudal_diario_litros,
      permeabilidad_suelo_m_dia: 0.864,
    });

    expect(fieldResult.tipo_sistema).toBe('zanjas_filtrantes');
    expect(fieldResult.dimensiones.superficie_diseno_m2).toBeGreaterThan(0);
  });

  it('should chain all 4 tools end-to-end (tank → drainage → validate → PDF)', async () => {
    const tank: any = await executeTool('calculate_septic_tank', {
      habitantes_equivalentes: 7,
      tipo_uso: 'vivienda_unifamiliar',
    });

    const drainage: any = await executeTool('calculate_drainage_field', {
      caudal_diario_l: tank.caudal_diario_litros,
      permeabilidad_suelo_m_dia: 0.864,
    });

    const validation: any = await executeTool('validate_against_cte', {
      septic_tank: tank,
      drainage_field: drainage,
      contexto: {
        distancia_vivienda_m: 10,
        distancia_pozo_m: 50,
      },
    });

    expect(validation.cumple).toBe(true);

    // PDF generation
    const pdf: any = await executeTool('generate_pdf_report', {
      septic_tank: tank,
      drainage_field: drainage,
      validation,
      proyecto: {
        nombre: 'Test Project',
        ubicacion: 'Test Location',
      },
    });

    expect(pdf.report_id).toBeTruthy();
    expect(pdf.download_url).toContain('/reports/');
  });

  it('should produce blocking issue when distance to well < 30 m', async () => {
    const tank: any = await executeTool('calculate_septic_tank', {
      habitantes_equivalentes: 7,
      tipo_uso: 'vivienda_unifamiliar',
    });

    const drainage: any = await executeTool('calculate_drainage_field', {
      caudal_diario_l: tank.caudal_diario_litros,
      permeabilidad_suelo_m_dia: 0.864,
    });

    const validation: any = await executeTool('validate_against_cte', {
      septic_tank: tank,
      drainage_field: drainage,
      contexto: {
        distancia_pozo_m: 15, // BLOCKING
      },
    });

    expect(validation.cumple).toBe(false);
    expect(validation.bloqueantes.length).toBeGreaterThan(0);
  });

  it('should error when generate_pdf_report is called without project info', async () => {
    const result: any = await executeTool('generate_pdf_report', {
      // No proyecto provided
    });

    expect(result.error).toBeTruthy();
    expect(result.missing_fields).toContain('proyecto.nombre');
  });

  it('should reject invalid input via executor validation', async () => {
    await expect(
      executeTool('calculate_septic_tank', {
        habitantes_equivalentes: -5, // invalid
        tipo_uso: 'vivienda_unifamiliar',
      })
    ).rejects.toThrow();
  });

  it('should throw on unknown tool', async () => {
    await expect(executeTool('nonexistent_tool', {})).rejects.toThrow('Tool not found');
  });
});
