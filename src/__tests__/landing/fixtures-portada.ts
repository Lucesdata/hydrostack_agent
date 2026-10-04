import type { ProcesoPortada } from "@/src/lib/landing/proceso-portada";

/** Un proceso del hero para las pruebas. Los datos son de prueba, no de SECOP. */
export function procesoPortada(over: Partial<ProcesoPortada> & { id: string }): ProcesoPortada {
  return {
    numeroProceso: `REF-${over.id}`,
    objeto: `Obra de prueba ${over.id}`,
    entidad: "MUNICIPIO DE PRUEBA",
    abierto: true,
    estado: "Publicado",
    tipoProyecto: "acueducto",
    presupuesto: 2_450_000_000,
    moneda: "COP",
    departamentoCodigo: "76",
    departamento: "Valle del Cauca",
    municipio: "Cali",
    ubicacion: "entidad",
    href: `/licitaciones/obra-de-prueba--${over.id}`,
    ...over,
  };
}
