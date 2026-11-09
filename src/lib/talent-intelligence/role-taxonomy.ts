/**
 * Taxonomía V0 de personal requerido en pliegos. No clasifica candidatos.
 */
export const STAFF_FAMILIES = [
  "ENG_HYD",
  "ENG_SAN",
  "ENG_ENV",
  "ENG_CIV",
  "ENG_ELEC",
  "ENG_MECH",
  "DES_CAD",
  "DES_BIM",
  "GIS",
  "OPS_PLANT",
  "TECH_INST",
  "TECH_EM",
  "CONS_SUP",
  "MGMT_PROJECT",
  "ADMIN_PROC",
  "SST",
] as const;

export type StaffFamily = (typeof STAFF_FAMILIES)[number];

const REGLAS: ReadonlyArray<{ code: StaffFamily; pattern: RegExp }> = [
  {
    code: "ENG_HYD",
    pattern: /ingenier[oa] (?:hidr[aá]ulic[oa]|de recursos h[ií]dricos)|especialista (?:en )?hidr[aá]ulic[oa]/i,
  },
  {
    code: "ENG_SAN",
    pattern: /ingenier[oa] sanitari[oa]|especialista (?:en )?(?:tratamiento de aguas|saneamiento)/i,
  },
  { code: "ENG_ENV", pattern: /ingenier[oa] ambiental|especialista ambiental/i },
  { code: "ENG_CIV", pattern: /ingenier[oa] civil/i },
  { code: "ENG_ELEC", pattern: /ingenier[oa] electricista|ingenier[oa] el[eé]ctric[oa]/i },
  { code: "ENG_MECH", pattern: /ingenier[oa] mec[aá]nic[oa]/i },
  { code: "DES_CAD", pattern: /dibujante|delineante|proyectista|autocad|civil\s*3d/i },
  { code: "DES_BIM", pattern: /modelador(?:a)? bim|coordinador(?:a)? bim|revit/i },
  { code: "GIS", pattern: /especialista (?:en )?(?:sig|gis|geoinformaci[oó]n)|analista sig/i },
  { code: "OPS_PLANT", pattern: /operador(?:a)? de (?:ptap|ptar|planta de tratamiento)/i },
  {
    code: "TECH_INST",
    pattern: /instrumentista|t[eé]cnic[oa] (?:de|en) (?:instrumentaci[oó]n|automatizaci[oó]n|control)|especialista (?:en )?scada/i,
  },
  {
    code: "TECH_EM",
    pattern: /t[eé]cnic[oa] electromec[aá]nic[oa]|t[eé]cnic[oa] de mantenimiento/i,
  },
  {
    code: "CONS_SUP",
    pattern: /interventor(?:a)?|supervisor(?:a)? de obra|residente de interventor[ií]a/i,
  },
  {
    code: "MGMT_PROJECT",
    pattern: /director(?:a)? de proyecto|gerente de proyecto|residente de obra|programador(?:a)? de obra/i,
  },
  {
    code: "ADMIN_PROC",
    pattern: /profesional (?:de|en) (?:contrataci[oó]n|compras|presupuesto|gesti[oó]n documental)|auxiliar administrativ[oa]/i,
  },
  {
    code: "SST",
    pattern: /(?:profesional|coordinador(?:a)?|especialista) (?:en|de) (?:sst|seguridad y salud en el trabajo)/i,
  },
];

export function clasificarFamiliasPersonal(texto: string): StaffFamily[] {
  return REGLAS.filter((regla) => regla.pattern.test(texto)).map((regla) => regla.code);
}
