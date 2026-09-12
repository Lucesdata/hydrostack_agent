/**
 * Redacción de cada motivo de descarte. El código (`sin_unspsc_ni_keyword`,
 * `fuera_de_cuantia`...) es para la base; esto es para el usuario.
 *
 * Vive en su propio módulo, separado de `page.tsx`, porque Next.js rechaza
 * en build cualquier export nombrado en un archivo `page.tsx` que no sea uno
 * de los pocos que reconoce (`default`, `metadata`, `dynamic`...): un
 * `export const EXPLICA` ahí revienta con "EXPLICA is not a valid Page
 * export field". Aquí no hay esa restricción.
 *
 * Es la fuente única de estos textos. Hubo una copia literal en el home
 * (`MOTIVOS` en S5Descartes.jsx) vigilada por un test; esa sección se absorbió
 * en S3Motor como paso 04 el 2026-09-12 y la copia se borró con ella, así que
 * ya no hay dos listas que puedan divergir.
 */
export const EXPLICA: Record<string, string> = {
  sin_unspsc_ni_keyword:
    "Ni el código UNSPSC ni el texto del objeto coincidieron con ningún criterio",
  segmento_80_excluido:
    "Segmento UNSPSC 80 (gestión y personal): se excluye en la ingesta porque midió ~0 % de relevancia",
  palabra_excluida: "Contenía una de tus palabras excluidas",
  fuera_de_cuantia: "El presupuesto queda fuera del rango que fijaste",
  fuera_de_zona: "La entidad no está en las zonas que seleccionaste",
  entidad_no_listada: "La entidad no está en tu lista",
  modalidad_no_listada: "La modalidad de contratación no está en tu lista",
};
