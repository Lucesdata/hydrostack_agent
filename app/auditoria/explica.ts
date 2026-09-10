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
 * Se exporta porque `S5Descartes.jsx` mantiene una copia literal de estos
 * mismos textos en el home (`MOTIVOS`) y `src/__tests__/landing/explica.test.ts`
 * verifica que las dos no diverjan.
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
