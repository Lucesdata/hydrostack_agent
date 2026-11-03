/** Dominio oficial SECOP II. Validar origen no certifica que el expediente exista. */
export function urlSecopDe(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "community.secop.gov.co" ||
      url.port ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch (error) {
    // La fuente puede contener texto no URL: se omite el enlace.
    if (error instanceof TypeError) return null;
    throw error;
  }
}
