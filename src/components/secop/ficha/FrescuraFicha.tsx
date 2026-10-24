import { etiquetasFrescura, type FrescuraFicha as Frescura } from "@/src/lib/secop/frescura";

/**
 * Fechas de actualización con procedencia. La ficha es ISR: lo que se muestra se
 * leyó al generarla, y puede haber cambios posteriores en la fuente.
 */
export default function FrescuraFicha({ frescura }: { frescura: Frescura }) {
  const e = etiquetasFrescura(frescura);
  return (
    <p className="fi-ayuda" data-frescura>
      {e.sincronizacion}
      <br />
      {e.publicadoSecop}
      <br />
      Datos leídos al generar esta página; puede haber cambios posteriores. Confirma en SECOP II.
    </p>
  );
}
