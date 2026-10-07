/** Un instante de procesamiento/ingesta, distinto de las columnas DATE del proceso. */
export function fechaInstanteColombia(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return null;
  return instante.toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
