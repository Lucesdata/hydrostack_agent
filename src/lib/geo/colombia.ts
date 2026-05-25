/**
 * Colombia administrative data — departments, municipalities, and
 * their corresponding environmental authorities (CAR/AAC).
 *
 * Sources: IDEAM, MADS, Ley 99/1993 regional authority map.
 */

export interface Municipality {
  id: string;
  name: string;
  bigCity?: boolean; // likely has sewer network → SITARD caution
}

export interface Department {
  id: string;
  name: string;
  authority: string;       // short acronym
  authorityFull: string;   // full name
  municipalities: Municipality[];
}

export const DEPARTMENTS: Department[] = [
  {
    id: 'BOG',
    name: 'Bogotá D.C.',
    authority: 'SDA',
    authorityFull: 'Secretaría Distrital de Ambiente — Bogotá',
    municipalities: [
      { id: 'BOG-BOG', name: 'Bogotá D.C.', bigCity: true },
      { id: 'BOG-SUM', name: 'Localidad de Sumapaz (rural)' },
    ],
  },
  {
    id: 'CUN',
    name: 'Cundinamarca',
    authority: 'CAR',
    authorityFull: 'Corporación Autónoma Regional de Cundinamarca (CAR)',
    municipalities: [
      { id: 'CUN-SOA', name: 'Soacha', bigCity: true },
      { id: 'CUN-FAC', name: 'Facatativá' },
      { id: 'CUN-ZIP', name: 'Zipaquirá' },
      { id: 'CUN-CHI', name: 'Chía' },
      { id: 'CUN-CAJ', name: 'Cajicá' },
      { id: 'CUN-SOG', name: 'Sogamoso de Cundinamarca' },
      { id: 'CUN-LCA', name: 'La Calera' },
      { id: 'CUN-GUA', name: 'Guasca' },
      { id: 'CUN-CHO', name: 'Choachí' },
      { id: 'CUN-UBA', name: 'Ubaté' },
      { id: 'CUN-VIL', name: 'Villapinzón' },
      { id: 'CUN-FUS', name: 'Fusagasugá' },
      { id: 'CUN-GIR', name: 'Girardot', bigCity: true },
      { id: 'CUN-ANS', name: 'Anapoima' },
      { id: 'CUN-APU', name: 'Apulo' },
      { id: 'CUN-TBI', name: 'Tobia (Nocaima)' },
      { id: 'CUN-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'ANT',
    name: 'Antioquia',
    authority: 'CORANTIOQUIA',
    authorityFull: 'Corporación Autónoma Regional del Centro de Antioquia (CORANTIOQUIA)',
    municipalities: [
      { id: 'ANT-MED', name: 'Medellín', bigCity: true },
      { id: 'ANT-BEL', name: 'Bello', bigCity: true },
      { id: 'ANT-ENV', name: 'Envigado' },
      { id: 'ANT-ITA', name: 'Itagüí', bigCity: true },
      { id: 'ANT-SAB', name: 'Sabaneta' },
      { id: 'ANT-CAL', name: 'Caldas' },
      { id: 'ANT-RIO', name: 'Rionegro' },
      { id: 'ANT-GUA', name: 'Guarne' },
      { id: 'ANT-SAN', name: 'Santa Fe de Antioquia' },
      { id: 'ANT-YAR', name: 'Yarumal' },
      { id: 'ANT-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'VAL',
    name: 'Valle del Cauca',
    authority: 'CVC',
    authorityFull: 'Corporación Autónoma Regional del Valle del Cauca (CVC)',
    municipalities: [
      { id: 'VAL-CAL', name: 'Cali', bigCity: true },
      { id: 'VAL-PAL', name: 'Palmira', bigCity: true },
      { id: 'VAL-BUE', name: 'Buenaventura' },
      { id: 'VAL-TUL', name: 'Tuluá' },
      { id: 'VAL-CAR', name: 'Cartago' },
      { id: 'VAL-DAR', name: 'Dagua' },
      { id: 'VAL-JAM', name: 'Jamundí' },
      { id: 'VAL-YUM', name: 'Yumbo', bigCity: true },
      { id: 'VAL-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'SAN',
    name: 'Santander',
    authority: 'CDMB',
    authorityFull: 'Corporación para la Defensa de la Meseta de Bucaramanga (CDMB) / CAS',
    municipalities: [
      { id: 'SAN-BUC', name: 'Bucaramanga', bigCity: true },
      { id: 'SAN-FLO', name: 'Floridablanca' },
      { id: 'SAN-GIR', name: 'Girón' },
      { id: 'SAN-PIE', name: 'Piedecuesta' },
      { id: 'SAN-BAR', name: 'Barrancabermeja', bigCity: true },
      { id: 'SAN-VEL', name: 'Vélez' },
      { id: 'SAN-SOC', name: 'Socorro' },
      { id: 'SAN-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'BOY',
    name: 'Boyacá',
    authority: 'CORPOBOYACÁ',
    authorityFull: 'Corporación Autónoma Regional de Boyacá (CORPOBOYACÁ)',
    municipalities: [
      { id: 'BOY-TUN', name: 'Tunja', bigCity: true },
      { id: 'BOY-DUI', name: 'Duitama' },
      { id: 'BOY-SOG', name: 'Sogamoso' },
      { id: 'BOY-CHI', name: 'Chiquinquirá' },
      { id: 'BOY-PAI', name: 'Paipa' },
      { id: 'BOY-SAM', name: 'Samacá' },
      { id: 'BOY-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'TOL',
    name: 'Tolima',
    authority: 'CORTOLIMA',
    authorityFull: 'Corporación Autónoma Regional del Tolima (CORTOLIMA)',
    municipalities: [
      { id: 'TOL-IBA', name: 'Ibagué', bigCity: true },
      { id: 'TOL-ESP', name: 'Espinal' },
      { id: 'TOL-NEI', name: 'Neiva' },
      { id: 'TOL-HON', name: 'Honda' },
      { id: 'TOL-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'HUI',
    name: 'Huila',
    authority: 'CAM',
    authorityFull: 'Corporación Autónoma Regional del Alto Magdalena (CAM)',
    municipalities: [
      { id: 'HUI-NEI', name: 'Neiva', bigCity: true },
      { id: 'HUI-PIT', name: 'Pitalito' },
      { id: 'HUI-GAR', name: 'Garzón' },
      { id: 'HUI-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'CAL',
    name: 'Caldas',
    authority: 'CORPOCALDAS',
    authorityFull: 'Corporación Autónoma Regional de Caldas (CORPOCALDAS)',
    municipalities: [
      { id: 'CAL-MAN', name: 'Manizales', bigCity: true },
      { id: 'CAL-CHI', name: 'Chinchiná' },
      { id: 'CAL-PAL', name: 'Palestina' },
      { id: 'CAL-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'RIS',
    name: 'Risaralda',
    authority: 'CARDER',
    authorityFull: 'Corporación Autónoma Regional de Risaralda (CARDER)',
    municipalities: [
      { id: 'RIS-PER', name: 'Pereira', bigCity: true },
      { id: 'RIS-DOS', name: 'Dosquebradas', bigCity: true },
      { id: 'RIS-SAN', name: 'Santa Rosa de Cabal' },
      { id: 'RIS-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'QUI',
    name: 'Quindío',
    authority: 'CRQ',
    authorityFull: 'Corporación Autónoma Regional del Quindío (CRQ)',
    municipalities: [
      { id: 'QUI-ARM', name: 'Armenia', bigCity: true },
      { id: 'QUI-CAL', name: 'Calarcá' },
      { id: 'QUI-MON', name: 'Montenegro' },
      { id: 'QUI-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'NAR',
    name: 'Nariño',
    authority: 'CORPONARIÑO',
    authorityFull: 'Corporación Autónoma Regional de Nariño (CORPONARIÑO)',
    municipalities: [
      { id: 'NAR-PAS', name: 'Pasto', bigCity: true },
      { id: 'NAR-TUM', name: 'Tumaco' },
      { id: 'NAR-IPI', name: 'Ipiales' },
      { id: 'NAR-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'CAU',
    name: 'Cauca',
    authority: 'CRC',
    authorityFull: 'Corporación Autónoma Regional del Cauca (CRC)',
    municipalities: [
      { id: 'CAU-POP', name: 'Popayán', bigCity: true },
      { id: 'CAU-SOG', name: 'Santander de Quilichao' },
      { id: 'CAU-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'MET',
    name: 'Meta',
    authority: 'CORMACARENA',
    authorityFull: 'Corporación para el Desarrollo Sostenible del Área de Manejo Especial La Macarena (CORMACARENA)',
    municipalities: [
      { id: 'MET-VIL', name: 'Villavicencio', bigCity: true },
      { id: 'MET-GRA', name: 'Granada' },
      { id: 'MET-ACA', name: 'Acacías' },
      { id: 'MET-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'ATL',
    name: 'Atlántico',
    authority: 'CRA',
    authorityFull: 'Corporación Autónoma Regional del Atlántico (CRA)',
    municipalities: [
      { id: 'ATL-BAR', name: 'Barranquilla', bigCity: true },
      { id: 'ATL-SOL', name: 'Soledad', bigCity: true },
      { id: 'ATL-MAL', name: 'Malambo' },
      { id: 'ATL-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'BOL',
    name: 'Bolívar',
    authority: 'CSB',
    authorityFull: 'Corporación Autónoma Regional del Canal del Dique (CARDIQUE) / CSB',
    municipalities: [
      { id: 'BOL-CAR', name: 'Cartagena de Indias', bigCity: true },
      { id: 'BOL-MAG', name: 'Magangué' },
      { id: 'BOL-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'NSA',
    name: 'Norte de Santander',
    authority: 'CORPONOR',
    authorityFull: 'Corporación Autónoma Regional de la Frontera Nororiental (CORPONOR)',
    municipalities: [
      { id: 'NSA-CUC', name: 'Cúcuta', bigCity: true },
      { id: 'NSA-OCN', name: 'Ocaña' },
      { id: 'NSA-OTR', name: 'Otro municipio' },
    ],
  },
  {
    id: 'OTR',
    name: 'Otro departamento',
    authority: 'CAR local',
    authorityFull: 'Corporación Autónoma Regional competente según Ley 99/1993',
    municipalities: [
      { id: 'OTR-OTR', name: 'Otro municipio' },
    ],
  },
];

export function getDepartment(deptId: string): Department | undefined {
  return DEPARTMENTS.find(d => d.id === deptId);
}

export function getMunicipality(deptId: string, munId: string): Municipality | undefined {
  return getDepartment(deptId)?.municipalities.find(m => m.id === munId);
}

export function getAuthority(deptId: string): { authority: string; authorityFull: string } {
  const dept = getDepartment(deptId);
  if (!dept) return { authority: 'No determinada', authorityFull: 'Consultar autoridad ambiental local' };

  // Bogotá special case: always SDA regardless of municipality
  if (deptId === 'BOG') {
    return { authority: 'SDA', authorityFull: 'Secretaría Distrital de Ambiente — Bogotá D.C.' };
  }

  return { authority: dept.authority, authorityFull: dept.authorityFull };
}
