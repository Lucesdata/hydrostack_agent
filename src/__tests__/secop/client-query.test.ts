import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildProcesosWhere, ORDER_SOQL, countProcesos, buildAguaWhereContratos } from '@/src/lib/secop/client';
import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from '@/src/lib/secop/config';

const F = FIELDS_PROCESOS;
const C = FIELDS_CONTRATOS;

vi.mock('@/src/lib/secop/datasetResolver', () => ({
  resolveDatasetId: vi.fn().mockResolvedValue('p6dx-8zbt'),
}));

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

  it('agrega el filtro de sub-sector cuando se pide', () => {
    const w = buildProcesosWhere({ soloAgua: false, sector: 'ptar' });
    expect(w).toContain('PTAR');
  });

  it('con sector, NO agrega también el OR amplio de KEYWORDS_AGUA (evita excluir por AND)', () => {
    // soloAgua no se pasa (default true): antes del fix esto ANDeaba
    // buildAguaWhere() con el filtro de sector, excluyendo procesos que solo
    // matchean un término exclusivo de KEYWORDS_AGUA (p. ej. "PSMV", que no
    // está en SECTOR_KEYWORDS.acueducto).
    const w = buildProcesosWhere({ sector: 'acueducto' });
    expect(w).not.toContain('PSMV');
    expect(w).toContain('CAPTACIÓN');
  });
});

describe('ORDER_SOQL', () => {
  it('mapea fecha y valor a las columnas SoQL correctas', () => {
    expect(ORDER_SOQL.fecha).toBe(`${F.fechaPublicacion} DESC`);
    expect(ORDER_SOQL.valor).toBe(`${F.precioBase} DESC`);
  });
});

describe('countProcesos', () => {
  const okResponse = (body: unknown) =>
    ({ ok: true, json: async () => body }) as Response;

  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('devuelve el count numérico de la respuesta SODA', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([{ count: '2208' }]));
    expect(await countProcesos({ soloAgua: false })).toBe(2208);
  });

  it('pide $select=count(*) con el mismo $where', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([{ count: '1' }]));
    await countProcesos({ soloAgua: false, apertura: 'Abierto' });
    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(url.searchParams.get('$select')).toBe('count(*) as count');
    expect(url.searchParams.get('$where')).toContain("= 'Abierto'");
  });

  it('devuelve undefined si la consulta falla (nunca bloquea resultados)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('boom'));
    expect(await countProcesos({ soloAgua: false })).toBeUndefined();
  });

  it('devuelve undefined si el count no es numérico', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([{ count: 'NaN?' }]));
    expect(await countProcesos({ soloAgua: false })).toBeUndefined();
  });

  it('devuelve undefined si la respuesta SODA viene vacía', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([]));
    expect(await countProcesos({ soloAgua: false })).toBeUndefined();
  });
});

describe('buildAguaWhereContratos', () => {
  it('construye el OR de keywords contra objeto_del_contrato', () => {
    const w = buildAguaWhereContratos();
    expect(w).toContain(`upper(${C.objeto}) like '%ACUEDUCTO%'`);
    expect(w).toContain(`upper(${C.objeto}) like '%PTAR%'`);
    expect(w).toContain(' OR ');
  });
});
