// Puro y sin base: lo usa la banda de la portada en el navegador.

/**
 * "hace menos de una hora", "hace 5 h", "hace 3 días". Sin redondeos que
 * rejuvenezcan el dato: se trunca, así que 1 h 59 min es "hace 1 h".
 */
export function haceCuanto(iso: string | null, ahora: Date = new Date()): string | null {
  if (!iso) return null;
  const ms = ahora.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const horas = Math.floor(Math.max(0, ms) / 3_600_000);
  if (horas < 1) return "hace menos de una hora";
  if (horas < 48) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} días`;
}
