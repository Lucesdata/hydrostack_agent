/**
 * Accesos del hero a los servicios de AquaLicita.
 *
 * Los accesos con href solo apuntan a páginas disponibles. El explorador
 * comercial depende de CI_COMERCIAL_HABILITADO=1 en servidor; Talent
 * Intelligence no tiene todavía interfaz pública ni vacantes verificadas.
 * Gemelos digitales enlaza únicamente a una página explicativa.
 */
export function serviciosDelHero(comercialDisponible = false) {
  return [
    {
      id: "comercial",
      titulo: "Inteligencia comercial",
      detalle: comercialDisponible ? "Explorar oportunidades" : "En activación",
      href: comercialDisponible ? "/comercial/explorar" : null,
    },
    {
      id: "radar",
      titulo: "Radar institucional",
      detalle: "Consultar entidades",
      href: "/licitaciones/entidades",
    },
    {
      id: "adjudicados",
      titulo: "Proyectos adjudicados",
      detalle: "Consultar resultados",
      href: "/proyectos-adjudicados",
    },
    {
      id: "gemelos",
      titulo: "Gemelos digitales",
      detalle: "Conocer el concepto",
      href: "/gemelos-digitales",
    },
    {
      id: "talento",
      titulo: "Talento técnico",
      detalle: "Validación documental en curso",
      href: null,
    },
  ];
}
