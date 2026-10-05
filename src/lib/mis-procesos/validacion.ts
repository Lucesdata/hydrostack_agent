export class ConsultaPersonalInvalidaError extends Error {}
export class ProcesoNoDisponibleError extends Error {}
export function validarId(value: unknown): string {
  if (typeof value !== "string" || value.length > 32 || !/^CO1\.REQ\.\d+$/i.test(value))
    throw new ConsultaPersonalInvalidaError("Identificador de proceso inválido.");
  return value.toUpperCase();
}
export function validarPagina(value: unknown): number {
  const page = value === null || value === undefined ? 1 : Number(value);
  if (!Number.isInteger(page) || page < 1 || page > 1_000_000)
    throw new ConsultaPersonalInvalidaError("Página inválida.");
  return page;
}
export function validarIds(value: string): string[] {
  const ids = [...new Set(value.split(",").map(validarId))];
  if (ids.length > 25) throw new ConsultaPersonalInvalidaError("Demasiados procesos.");
  return ids;
}
