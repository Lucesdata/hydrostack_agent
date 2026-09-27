import S7Acceso from "@/src/components/landing/S7Acceso";

/**
 * /precios — qué se lleva cada quien sin pagar, y qué pide cuenta.
 *
 * La sección vivía en la portada, donde ocupaba un bloque entero para explicar
 * en vez de mostrar. El rediseño de 2026-09 la baja aquí: la portada solo
 * admite bloques que enseñen datos reales o naveguen a ellos.
 *
 * No inventa una tabla de precios. `S7Acceso` deriva sus tres columnas de
 * `seccionesPorNivel()`, o sea del mismo catálogo de rutas que gobierna el
 * navbar y el pie — así que dice exactamente lo que el producto hace hoy, y
 * añadir una ruta la hace aparecer aquí sin tocar esta página. Hoy no hay nada
 * de pago —el análisis de pliego pasó a gratis el 2026-09-27—, así que la
 * columna «plan pro» no se pinta; vuelve sola el día que algo lo sea.
 */
export const metadata = {
  title: "Precios y acceso",
  description: "Qué puedes usar en AquaLicita sin cuenta y qué abre una cuenta gratuita.",
};

export default function PreciosPage() {
  return (
    <div className="clr-page">
      <S7Acceso />
    </div>
  );
}
