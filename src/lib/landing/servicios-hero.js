/**
 * Servicios visibles desde el hero. La tarjeta Comercial tiene una ruta de
 * introducción si el explorador privado no está habilitado en servidor.
 * Talent Intelligence ofrece una página de presentación y metodología,
 * NO vacantes ni requisitos certificados.
 */
export function serviciosDelHero(comercialDisponible = false) {
  return [
    {
      id: "comercial",
      titulo: "Inteligencia Comercial",
      detalle: comercialDisponible ? "Abrir explorador" : "Conocer el servicio",
      href: comercialDisponible ? "/comercial/explorar" : "/comercial",
      destacado: true,
    },
    {
      id: "talento",
      titulo: "Talent Intelligence",
      detalle: "Conocer requisitos profesionales",
      href: "/talento",
      destacado: true,
    },
    {
      id: "radar",
      titulo: "Radar institucional",
      detalle: "Consultar entidades",
      href: "/licitaciones/entidades",
      destacado: false,
    },
    {
      id: "adjudicados",
      titulo: "Proyectos adjudicados",
      detalle: "Consultar resultados",
      href: "/proyectos-adjudicados",
      destacado: false,
    },
    {
      id: "marketplace",
      titulo: "Marketplace",
      detalle: "Explorar en el mapa",
      href: "/marketplace",
      destacado: false,
    },
  ];
}
