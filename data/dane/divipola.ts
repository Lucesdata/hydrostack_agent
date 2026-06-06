/**
 * Crosswalk DANE (parcial) — siembra de `geografia` y `geografia_alias`.
 *
 * Cobertura 0.4 (best-effort):
 *   · 33 departamentos completos (incluye Bogotá D.C.).
 *   · 32 capitales departamentales.
 *   · Ciudades adicionales presentes en la muestra de 0.2 (samples/) cuando se
 *     conoce su DIVIPOLA con alta confianza.
 *
 * Convención sintética: dept-only se codifica como "DD000" (e.g., "05000"
 * para Antioquia "departamento sin municipio específico"). DANE solo publica
 * municipios como 5 dígitos; el "000" es nuestro para soportar contratos cuyo
 * único hint geográfico es el departamento.
 *
 * Lo no incluido aquí queda como `geografia_id = NULL` durante el transform y
 * se reporta en la lista de no-resueltos para retomar en 0.6 (carga del CSV
 * DANE completo, ~1100 municipios).
 *
 * Fuente: DANE — Codificación de la División Político-Administrativa de
 * Colombia (DIVIPOLA), vigente al 2025.
 */

export interface DivipolaEntry {
  divipola: string; // 5 dígitos
  departamentoCodigo: string; // 2 dígitos
  departamentoNombre: string;
  municipioCodigo: string; // 3 dígitos ("000" si es dept-only sintético)
  municipioNombre: string | null; // null si es dept-only sintético
  /** Aliases adicionales (variantes ortográficas o nombres alternativos). */
  aliases?: string[];
}

// --- Departamentos (dept-only sintético "DD000") ---
export const DEPARTAMENTOS: DivipolaEntry[] = [
  { divipola: '05000', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '000', municipioNombre: null },
  { divipola: '08000', departamentoCodigo: '08', departamentoNombre: 'Atlántico', municipioCodigo: '000', municipioNombre: null },
  { divipola: '11000', departamentoCodigo: '11', departamentoNombre: 'Bogotá D.C.', municipioCodigo: '000', municipioNombre: null,
    aliases: ['distrito capital de bogota', 'distrito capital', 'bogota dc'] },
  { divipola: '13000', departamentoCodigo: '13', departamentoNombre: 'Bolívar', municipioCodigo: '000', municipioNombre: null },
  { divipola: '15000', departamentoCodigo: '15', departamentoNombre: 'Boyacá', municipioCodigo: '000', municipioNombre: null },
  { divipola: '17000', departamentoCodigo: '17', departamentoNombre: 'Caldas', municipioCodigo: '000', municipioNombre: null },
  { divipola: '18000', departamentoCodigo: '18', departamentoNombre: 'Caquetá', municipioCodigo: '000', municipioNombre: null },
  { divipola: '19000', departamentoCodigo: '19', departamentoNombre: 'Cauca', municipioCodigo: '000', municipioNombre: null },
  { divipola: '20000', departamentoCodigo: '20', departamentoNombre: 'Cesar', municipioCodigo: '000', municipioNombre: null },
  { divipola: '23000', departamentoCodigo: '23', departamentoNombre: 'Córdoba', municipioCodigo: '000', municipioNombre: null },
  { divipola: '25000', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '000', municipioNombre: null },
  { divipola: '27000', departamentoCodigo: '27', departamentoNombre: 'Chocó', municipioCodigo: '000', municipioNombre: null },
  { divipola: '41000', departamentoCodigo: '41', departamentoNombre: 'Huila', municipioCodigo: '000', municipioNombre: null },
  { divipola: '44000', departamentoCodigo: '44', departamentoNombre: 'La Guajira', municipioCodigo: '000', municipioNombre: null,
    aliases: ['guajira'] },
  { divipola: '47000', departamentoCodigo: '47', departamentoNombre: 'Magdalena', municipioCodigo: '000', municipioNombre: null },
  { divipola: '50000', departamentoCodigo: '50', departamentoNombre: 'Meta', municipioCodigo: '000', municipioNombre: null },
  { divipola: '52000', departamentoCodigo: '52', departamentoNombre: 'Nariño', municipioCodigo: '000', municipioNombre: null },
  { divipola: '54000', departamentoCodigo: '54', departamentoNombre: 'Norte de Santander', municipioCodigo: '000', municipioNombre: null },
  { divipola: '63000', departamentoCodigo: '63', departamentoNombre: 'Quindío', municipioCodigo: '000', municipioNombre: null },
  { divipola: '66000', departamentoCodigo: '66', departamentoNombre: 'Risaralda', municipioCodigo: '000', municipioNombre: null },
  { divipola: '68000', departamentoCodigo: '68', departamentoNombre: 'Santander', municipioCodigo: '000', municipioNombre: null },
  { divipola: '70000', departamentoCodigo: '70', departamentoNombre: 'Sucre', municipioCodigo: '000', municipioNombre: null },
  { divipola: '73000', departamentoCodigo: '73', departamentoNombre: 'Tolima', municipioCodigo: '000', municipioNombre: null },
  { divipola: '76000', departamentoCodigo: '76', departamentoNombre: 'Valle del Cauca', municipioCodigo: '000', municipioNombre: null },
  { divipola: '81000', departamentoCodigo: '81', departamentoNombre: 'Arauca', municipioCodigo: '000', municipioNombre: null },
  { divipola: '85000', departamentoCodigo: '85', departamentoNombre: 'Casanare', municipioCodigo: '000', municipioNombre: null },
  { divipola: '86000', departamentoCodigo: '86', departamentoNombre: 'Putumayo', municipioCodigo: '000', municipioNombre: null },
  { divipola: '88000', departamentoCodigo: '88', departamentoNombre: 'Archipiélago de San Andrés, Providencia y Santa Catalina',
    municipioCodigo: '000', municipioNombre: null,
    aliases: ['san andres', 'san andres providencia y santa catalina', 'san andres y providencia', 'archipielago de san andres providencia y santa catalina'] },
  { divipola: '91000', departamentoCodigo: '91', departamentoNombre: 'Amazonas', municipioCodigo: '000', municipioNombre: null },
  { divipola: '94000', departamentoCodigo: '94', departamentoNombre: 'Guainía', municipioCodigo: '000', municipioNombre: null },
  { divipola: '95000', departamentoCodigo: '95', departamentoNombre: 'Guaviare', municipioCodigo: '000', municipioNombre: null },
  { divipola: '97000', departamentoCodigo: '97', departamentoNombre: 'Vaupés', municipioCodigo: '000', municipioNombre: null },
  { divipola: '99000', departamentoCodigo: '99', departamentoNombre: 'Vichada', municipioCodigo: '000', municipioNombre: null },
];

// --- Municipios (capitales departamentales + ciudades comunes en muestra) ---
// Códigos DIVIPOLA oficiales DANE. Solo se incluyen los de alta confianza; el
// resto queda como deuda 0.6 (carga del CSV completo).
export const MUNICIPIOS: DivipolaEntry[] = [
  // Capitales departamentales
  { divipola: '05001', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '001', municipioNombre: 'Medellín' },
  { divipola: '08001', departamentoCodigo: '08', departamentoNombre: 'Atlántico', municipioCodigo: '001', municipioNombre: 'Barranquilla' },
  { divipola: '11001', departamentoCodigo: '11', departamentoNombre: 'Bogotá D.C.', municipioCodigo: '001', municipioNombre: 'Bogotá D.C.',
    aliases: ['bogota'] },
  { divipola: '13001', departamentoCodigo: '13', departamentoNombre: 'Bolívar', municipioCodigo: '001', municipioNombre: 'Cartagena de Indias',
    aliases: ['cartagena'] },
  { divipola: '15001', departamentoCodigo: '15', departamentoNombre: 'Boyacá', municipioCodigo: '001', municipioNombre: 'Tunja' },
  { divipola: '17001', departamentoCodigo: '17', departamentoNombre: 'Caldas', municipioCodigo: '001', municipioNombre: 'Manizales' },
  { divipola: '18001', departamentoCodigo: '18', departamentoNombre: 'Caquetá', municipioCodigo: '001', municipioNombre: 'Florencia' },
  { divipola: '19001', departamentoCodigo: '19', departamentoNombre: 'Cauca', municipioCodigo: '001', municipioNombre: 'Popayán' },
  { divipola: '20001', departamentoCodigo: '20', departamentoNombre: 'Cesar', municipioCodigo: '001', municipioNombre: 'Valledupar' },
  { divipola: '23001', departamentoCodigo: '23', departamentoNombre: 'Córdoba', municipioCodigo: '001', municipioNombre: 'Montería' },
  { divipola: '27001', departamentoCodigo: '27', departamentoNombre: 'Chocó', municipioCodigo: '001', municipioNombre: 'Quibdó' },
  { divipola: '41001', departamentoCodigo: '41', departamentoNombre: 'Huila', municipioCodigo: '001', municipioNombre: 'Neiva' },
  { divipola: '44001', departamentoCodigo: '44', departamentoNombre: 'La Guajira', municipioCodigo: '001', municipioNombre: 'Riohacha' },
  { divipola: '47001', departamentoCodigo: '47', departamentoNombre: 'Magdalena', municipioCodigo: '001', municipioNombre: 'Santa Marta' },
  { divipola: '50001', departamentoCodigo: '50', departamentoNombre: 'Meta', municipioCodigo: '001', municipioNombre: 'Villavicencio' },
  { divipola: '52001', departamentoCodigo: '52', departamentoNombre: 'Nariño', municipioCodigo: '001', municipioNombre: 'Pasto' },
  { divipola: '54001', departamentoCodigo: '54', departamentoNombre: 'Norte de Santander', municipioCodigo: '001', municipioNombre: 'Cúcuta' },
  { divipola: '63001', departamentoCodigo: '63', departamentoNombre: 'Quindío', municipioCodigo: '001', municipioNombre: 'Armenia' },
  { divipola: '66001', departamentoCodigo: '66', departamentoNombre: 'Risaralda', municipioCodigo: '001', municipioNombre: 'Pereira' },
  { divipola: '68001', departamentoCodigo: '68', departamentoNombre: 'Santander', municipioCodigo: '001', municipioNombre: 'Bucaramanga' },
  { divipola: '70001', departamentoCodigo: '70', departamentoNombre: 'Sucre', municipioCodigo: '001', municipioNombre: 'Sincelejo' },
  { divipola: '73001', departamentoCodigo: '73', departamentoNombre: 'Tolima', municipioCodigo: '001', municipioNombre: 'Ibagué' },
  { divipola: '76001', departamentoCodigo: '76', departamentoNombre: 'Valle del Cauca', municipioCodigo: '001', municipioNombre: 'Cali' },
  { divipola: '81001', departamentoCodigo: '81', departamentoNombre: 'Arauca', municipioCodigo: '001', municipioNombre: 'Arauca' },
  { divipola: '85001', departamentoCodigo: '85', departamentoNombre: 'Casanare', municipioCodigo: '001', municipioNombre: 'Yopal' },
  { divipola: '86001', departamentoCodigo: '86', departamentoNombre: 'Putumayo', municipioCodigo: '001', municipioNombre: 'Mocoa' },
  { divipola: '88001', departamentoCodigo: '88', departamentoNombre: 'Archipiélago de San Andrés, Providencia y Santa Catalina',
    municipioCodigo: '001', municipioNombre: 'San Andrés' },
  { divipola: '91001', departamentoCodigo: '91', departamentoNombre: 'Amazonas', municipioCodigo: '001', municipioNombre: 'Leticia' },
  { divipola: '94001', departamentoCodigo: '94', departamentoNombre: 'Guainía', municipioCodigo: '001', municipioNombre: 'Inírida' },
  { divipola: '95001', departamentoCodigo: '95', departamentoNombre: 'Guaviare', municipioCodigo: '001', municipioNombre: 'San José del Guaviare' },
  { divipola: '97001', departamentoCodigo: '97', departamentoNombre: 'Vaupés', municipioCodigo: '001', municipioNombre: 'Mitú' },
  { divipola: '99001', departamentoCodigo: '99', departamentoNombre: 'Vichada', municipioCodigo: '001', municipioNombre: 'Puerto Carreño' },

  // Ciudades grandes adicionales — códigos oficiales DANE.
  { divipola: '05088', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '088', municipioNombre: 'Bello' },
  { divipola: '05266', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '266', municipioNombre: 'Envigado' },
  { divipola: '05360', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '360', municipioNombre: 'Itagüí' },
  { divipola: '05129', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '129', municipioNombre: 'Caldas' },
  { divipola: '05380', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '380', municipioNombre: 'La Estrella' },
  { divipola: '05631', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '631', municipioNombre: 'Sabaneta' },
  { divipola: '05079', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '079', municipioNombre: 'Barbosa' },
  { divipola: '05212', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '212', municipioNombre: 'Copacabana' },
  { divipola: '05045', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '045', municipioNombre: 'Apartadó' },
  { divipola: '05154', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '154', municipioNombre: 'Caucasia' },
  { divipola: '05172', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '172', municipioNombre: 'Chigorodó' },
  { divipola: '05147', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '147', municipioNombre: 'Carepa' },
  { divipola: '05051', departamentoCodigo: '05', departamentoNombre: 'Antioquia', municipioCodigo: '051', municipioNombre: 'Arboletes' },
  { divipola: '08758', departamentoCodigo: '08', departamentoNombre: 'Atlántico', municipioCodigo: '758', municipioNombre: 'Soledad' },
  { divipola: '08433', departamentoCodigo: '08', departamentoNombre: 'Atlántico', municipioCodigo: '433', municipioNombre: 'Malambo' },
  { divipola: '13430', departamentoCodigo: '13', departamentoNombre: 'Bolívar', municipioCodigo: '430', municipioNombre: 'Magangué' },
  { divipola: '13836', departamentoCodigo: '13', departamentoNombre: 'Bolívar', municipioCodigo: '836', municipioNombre: 'Turbaco' },
  { divipola: '13222', departamentoCodigo: '13', departamentoNombre: 'Bolívar', municipioCodigo: '222', municipioNombre: 'Clemencia' },
  { divipola: '15238', departamentoCodigo: '15', departamentoNombre: 'Boyacá', municipioCodigo: '238', municipioNombre: 'Duitama' },
  { divipola: '15759', departamentoCodigo: '15', departamentoNombre: 'Boyacá', municipioCodigo: '759', municipioNombre: 'Sogamoso' },
  { divipola: '15087', departamentoCodigo: '15', departamentoNombre: 'Boyacá', municipioCodigo: '087', municipioNombre: 'Belén' },
  { divipola: '15090', departamentoCodigo: '15', departamentoNombre: 'Boyacá', municipioCodigo: '090', municipioNombre: 'Beteitiva' },
  { divipola: '15097', departamentoCodigo: '15', departamentoNombre: 'Boyacá', municipioCodigo: '097', municipioNombre: 'Boavita' },
  { divipola: '15187', departamentoCodigo: '15', departamentoNombre: 'Boyacá', municipioCodigo: '187', municipioNombre: 'Chita' },
  { divipola: '17653', departamentoCodigo: '17', departamentoNombre: 'Caldas', municipioCodigo: '653', municipioNombre: 'Salamina' },
  { divipola: '17042', departamentoCodigo: '17', departamentoNombre: 'Caldas', municipioCodigo: '042', municipioNombre: 'Anserma' },
  { divipola: '17050', departamentoCodigo: '17', departamentoNombre: 'Caldas', municipioCodigo: '050', municipioNombre: 'Aranzazu' },
  { divipola: '18029', departamentoCodigo: '18', departamentoNombre: 'Caquetá', municipioCodigo: '029', municipioNombre: 'Albania' },
  { divipola: '18094', departamentoCodigo: '18', departamentoNombre: 'Caquetá', municipioCodigo: '094', municipioNombre: 'Belén de los Andaquíes' },
  { divipola: '19022', departamentoCodigo: '19', departamentoNombre: 'Cauca', municipioCodigo: '022', municipioNombre: 'Almaguer' },
  { divipola: '19212', departamentoCodigo: '19', departamentoNombre: 'Cauca', municipioCodigo: '212', municipioNombre: 'Corinto' },
  { divipola: '19473', departamentoCodigo: '19', departamentoNombre: 'Cauca', municipioCodigo: '473', municipioNombre: 'Morales' },
  { divipola: '20011', departamentoCodigo: '20', departamentoNombre: 'Cesar', municipioCodigo: '011', municipioNombre: 'Aguachica' },
  { divipola: '23300', departamentoCodigo: '23', departamentoNombre: 'Córdoba', municipioCodigo: '300', municipioNombre: 'Cereté' },
  { divipola: '23417', departamentoCodigo: '23', departamentoNombre: 'Córdoba', municipioCodigo: '417', municipioNombre: 'Lorica' },
  { divipola: '25040', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '040', municipioNombre: 'Anolaima' },
  { divipola: '25019', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '019', municipioNombre: 'Albán' },
  { divipola: '25099', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '099', municipioNombre: 'Bojacá' },
  { divipola: '25126', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '126', municipioNombre: 'Cajicá' },
  { divipola: '25148', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '148', municipioNombre: 'Caparrapí' },
  { divipola: '25214', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '214', municipioNombre: 'Cota' },
  { divipola: '25754', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '754', municipioNombre: 'Soacha' },
  { divipola: '25430', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '430', municipioNombre: 'Madrid' },
  { divipola: '25473', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '473', municipioNombre: 'Mosquera' },
  { divipola: '25899', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '899', municipioNombre: 'Zipaquirá' },
  { divipola: '25175', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '175', municipioNombre: 'Chía' },
  { divipola: '25817', departamentoCodigo: '25', departamentoNombre: 'Cundinamarca', municipioCodigo: '817', municipioNombre: 'Tocancipá' },
  { divipola: '41013', departamentoCodigo: '41', departamentoNombre: 'Huila', municipioCodigo: '013', municipioNombre: 'Acevedo' },
  { divipola: '41016', departamentoCodigo: '41', departamentoNombre: 'Huila', municipioCodigo: '016', municipioNombre: 'Agrado' },
  { divipola: '41020', departamentoCodigo: '41', departamentoNombre: 'Huila', municipioCodigo: '020', municipioNombre: 'Algeciras' },
  { divipola: '54223', departamentoCodigo: '54', departamentoNombre: 'Norte de Santander', municipioCodigo: '223', municipioNombre: 'Chinácota' },
  { divipola: '63130', departamentoCodigo: '63', departamentoNombre: 'Quindío', municipioCodigo: '130', municipioNombre: 'Calarcá' },
  { divipola: '68276', departamentoCodigo: '68', departamentoNombre: 'Santander', municipioCodigo: '276', municipioNombre: 'Floridablanca' },
  { divipola: '68307', departamentoCodigo: '68', departamentoNombre: 'Santander', municipioCodigo: '307', municipioNombre: 'Girón' },
  { divipola: '68081', departamentoCodigo: '68', departamentoNombre: 'Santander', municipioCodigo: '081', municipioNombre: 'Barrancabermeja' },
  { divipola: '68147', departamentoCodigo: '68', departamentoNombre: 'Santander', municipioCodigo: '147', municipioNombre: 'Cimitarra' },
  { divipola: '70215', departamentoCodigo: '70', departamentoNombre: 'Sucre', municipioCodigo: '215', municipioNombre: 'Corozal' },
  { divipola: '70230', departamentoCodigo: '70', departamentoNombre: 'Sucre', municipioCodigo: '230', municipioNombre: 'Chalán' },
  { divipola: '70708', departamentoCodigo: '70', departamentoNombre: 'Sucre', municipioCodigo: '708', municipioNombre: 'Sincé',
    aliases: ['since'] },
  { divipola: '73168', departamentoCodigo: '73', departamentoNombre: 'Tolima', municipioCodigo: '168', municipioNombre: 'Chaparral' },
  { divipola: '76520', departamentoCodigo: '76', departamentoNombre: 'Valle del Cauca', municipioCodigo: '520', municipioNombre: 'Palmira' },
  { divipola: '76834', departamentoCodigo: '76', departamentoNombre: 'Valle del Cauca', municipioCodigo: '834', municipioNombre: 'Tuluá' },
  { divipola: '76109', departamentoCodigo: '76', departamentoNombre: 'Valle del Cauca', municipioCodigo: '109', municipioNombre: 'Buenaventura' },
  { divipola: '76130', departamentoCodigo: '76', departamentoNombre: 'Valle del Cauca', municipioCodigo: '130', municipioNombre: 'Candelaria' },
  { divipola: '76147', departamentoCodigo: '76', departamentoNombre: 'Valle del Cauca', municipioCodigo: '147', municipioNombre: 'Cartago' },
  { divipola: '76233', departamentoCodigo: '76', departamentoNombre: 'Valle del Cauca', municipioCodigo: '233', municipioNombre: 'Dagua' },
];

export const ALL_DIVIPOLA: DivipolaEntry[] = [...DEPARTAMENTOS, ...MUNICIPIOS];
