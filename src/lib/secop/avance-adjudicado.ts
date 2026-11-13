import { montoConDato } from "./monto";

export function porcentajePagado(pago: string | number | null, valor: string | number | null) {
  const pagado = montoConDato(pago);
  const vigente = montoConDato(valor);
  if (pagado === null || vigente === null || pagado > vigente) return null;
  return (pagado / vigente) * 100;
}
