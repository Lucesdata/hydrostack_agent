/**
 * JSON-LD `Dataset` de la portada, para Google Dataset Search.
 *
 * Describe lo que AquaLicita publica de verdad: los procesos del SECOP II de
 * agua y saneamiento, filtrados del conjunto completo y clasificados por tipo
 * de obra y departamento, cada uno con su ficha. Sin cifras (envejecen y la
 * portada se regenera cada 6 h) y sin `license` ni `distribution`: no hay una
 * licencia decidida para los datos derivados ni un archivo descargable, y
 * declararlos sería inventarlos. `isBasedOn` enlaza los conjuntos de origen en
 * datos.gov.co, que sí son abiertos.
 */

import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import { DATASETS, DATASET_NAMES, SOCRATA_DOMAIN } from "@/src/lib/secop/config";

export function datasetJsonLd(base: string) {
  const raiz = base.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Procesos de contratación pública de agua y saneamiento en Colombia (SECOP II)",
    description:
      "Procesos de contratación pública de agua potable y saneamiento básico publicados en el SECOP II, filtrados del conjunto completo y clasificados por tipo de obra (" +
      TIPOS_PROYECTO.map((t) => TIPO_PROYECTO[t].label).join(", ") +
      ") y por departamento de la entidad contratante. Cada proceso tiene una ficha pública con lo que se contrata, si recibe ofertas y los requisitos para participar.",
    url: `${raiz}/licitaciones`,
    inLanguage: "es",
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "AquaLicita", url: raiz },
    spatialCoverage: { "@type": "Place", name: "Colombia" },
    keywords: [
      "SECOP II",
      "contratación pública",
      "licitaciones",
      "agua potable",
      "saneamiento básico",
      ...TIPOS_PROYECTO.filter((t) => t !== "otros").map((t) => TIPO_PROYECTO[t].label),
    ],
    variableMeasured: [
      "Tipo de proyecto",
      "Departamento de la entidad contratante",
      "Estado del proceso",
      "Presupuesto oficial",
      "Fecha de publicación",
    ],
    isBasedOn: (Object.keys(DATASETS) as (keyof typeof DATASETS)[]).map((k) => ({
      "@type": "Dataset",
      name: DATASET_NAMES[k],
      url: `${SOCRATA_DOMAIN}/d/${DATASETS[k]}`,
    })),
  };
}
