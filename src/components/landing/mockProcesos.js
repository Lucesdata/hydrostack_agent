// src/components/landing/mockProcesos.js
// Datos ficticios de procesos de contratación pública del sector agua y
// saneamiento en Colombia. Fácil de reemplazar por datos reales de
// SECOP/Neon Postgres más adelante (mismo shape, `href` pasa de null a
// una ruta real).

const mockProcesos = [
  { id: "p1", entidad: "EAAB",               valor: "$4.850 M", ciudad: "Bogotá",      departamento: "Cundinamarca",   sector: "Alcantarillado",   href: null },
  { id: "p2", entidad: "Aguas de Cartagena",  valor: "$2.310 M", ciudad: "Cartagena",   departamento: "Bolívar",        sector: "PTAR",             href: null },
  { id: "p3", entidad: "EPM",                 valor: "$7.120 M", ciudad: "Medellín",    departamento: "Antioquia",      sector: "Acueducto rural",  href: null },
  { id: "p4", entidad: "Findeter",            valor: "$1.980 M", ciudad: "Bucaramanga", departamento: "Santander",      sector: "PSMV",             href: null },
  { id: "p5", entidad: "Aguas del Huila",     valor: "$980 M",   ciudad: "Neiva",       departamento: "Huila",          sector: "Acueducto rural",  href: null },
  { id: "p6", entidad: "ESP Pasto",           valor: "$1.450 M", ciudad: "Pasto",       departamento: "Nariño",         sector: "Alcantarillado",   href: null },
  { id: "p7", entidad: "Aguas de Cali",       valor: "$3.640 M", ciudad: "Cali",        departamento: "Valle del Cauca",sector: "PTAR",             href: null },
  { id: "p8", entidad: "Aqualia Colombia",    valor: "$620 M",   ciudad: "Montería",    departamento: "Córdoba",        sector: "PSMV",             href: null },
];

export default mockProcesos;
