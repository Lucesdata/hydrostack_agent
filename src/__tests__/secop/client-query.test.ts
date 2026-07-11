import { describe, it, expect } from 'vitest';
import { buildProcesosWhere, ORDER_SOQL } from '@/src/lib/secop/client';
import { FIELDS_PROCESOS } from '@/src/lib/secop/config';

const F = FIELDS_PROCESOS;

describe('buildProcesosWhere', () => {
  it('sin filtros (y sin agua) devuelve cadena vacía', () => {
    expect(buildProcesosWhere({ soloAgua: false })).toBe('');
  });

  it('incluye la cláusula de apertura cuando se pide', () => {
    const w = buildProcesosWhere({ soloAgua: false, apertura: 'Abierto' });
    expect(w).toBe(`${F.estadoApertura} = 'Abierto'`);
  });

  it('combina apertura con otros filtros usando AND', () => {
    const w = buildProcesosWhere({
      soloAgua: false,
      departamento: 'CAUCA',
      apertura: 'Abierto',
    });
    expect(w).toContain(`upper(${F.departamento}) = 'CAUCA'`);
    expect(w).toContain(' AND ');
    expect(w).toContain(`${F.estadoApertura} = 'Abierto'`);
  });

  it('escapa comillas simples en filtros de texto', () => {
    const w = buildProcesosWhere({ soloAgua: false, estado: "O'Neil" });
    expect(w).toContain("O''Neil");
  });

  it('con soloAgua default incluye el OR de keywords del sector', () => {
    const w = buildProcesosWhere({});
    expect(w).toContain('like');
  });
});

describe('ORDER_SOQL', () => {
  it('mapea fecha y valor a las columnas SoQL correctas', () => {
    expect(ORDER_SOQL.fecha).toBe(`${F.fechaPublicacion} DESC`);
    expect(ORDER_SOQL.valor).toBe(`${F.precioBase} DESC`);
  });
});
