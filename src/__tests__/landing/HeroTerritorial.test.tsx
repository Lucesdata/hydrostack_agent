import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HeroTerritorial, {
  claveInicial,
} from "@/src/components/landing/hero-territorial/HeroTerritorial";
import {
  formatPorcentaje,
  porcentajeNacional,
} from "@/src/components/landing/hero-territorial/FichaDepartamento";
import { estadoDesdeRespuesta } from "@/src/components/landing/hero-territorial/ResumenDepartamento";

const departamentos = [
  { clave: "05", label: "Antioquia", slug: "antioquia", n: 5155 },
  { clave: "11", label: "Bogotá D.C.", slug: "bogota-d-c", n: 4820 },
];
/** Filas con detalle: solo con él se ofrecen las opciones del mapa. */
const conDetalle = departamentos.map((d) => ({
  ...d,
  montoAbierto: 1e9,
  nConMonto: 10,
  nuevos7d: 3,
  nEntidades: 40,
  tipos: { acueducto: 1, alcantarillado: 1, ptap: 1, ptar: 1, otros: 1 },
}));
const fila = {
  id: "CO1.REQ.9",
  objeto: "CONSTRUCCIÓN DEL ACUEDUCTO VEREDAL",
  entidad: "MUNICIPIO DE CHÍA",
  ficha: "/licitaciones/construccion-del-acueducto-veredal--CO1.REQ.9",
};
const vivo = { ...estadoDesdeRespuesta({ destacados: [fila] }), reintentar: () => {} };

describe("claveInicial", () => {
  it("el primer departamento con procesos, en el orden del servidor", () => {
    expect(claveInicial(departamentos, 10000)).toBe("05");
    expect(claveInicial([{ ...departamentos[0], n: 0 }, departamentos[1]], 10000)).toBe("11");
  });

  it("sin datos o sin ninguno con procesos, ninguno: no se pide nada", () => {
    expect(claveInicial(departamentos, null)).toBeNull();
    expect(claveInicial([], 10000)).toBeNull();
    expect(claveInicial([{ ...departamentos[0], n: 0 }], 0)).toBeNull();
  });
});

describe("HeroTerritorial", () => {
  it("copy de la referencia aprobada", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain("<span>Explora el mapa.</span> <span>Entiende cada proceso.</span>");
    expect(html).toContain(
      "Encuentra procesos de agua y saneamiento y revisa sus condiciones en una ficha."
    );
    expect(html).toContain('placeholder="Busca por entidad u objeto"');
    expect(html).toContain('aria-label="Buscar fichas de procesos abiertos por entidad u objeto"');
    expect(html).toContain("Explora por departamento");
    expect(html).toContain("Ubicación de la entidad contratante, no de la obra.");
    expect(html).not.toContain("Descubre en qué procesos");
  });

  it("renderiza el mapa una sola vez", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial
        mapa={<div data-testid="mapa-departamental">Mapa</div>}
        departamentos={departamentos}
        totalAbiertos={10000}
      />
    );
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
    expect(html).not.toContain("El mapa no está disponible");
  });

  it("llega al primer departamento con procesos, no a la vista país ni a uno fijo", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain("<h2>Antioquia</h2>");
    expect(html).not.toContain("<h2>Colombia</h2>");
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("Volver a la vista de Colombia");
    const bogotaPrimero = renderToStaticMarkup(
      <HeroTerritorial departamentos={[departamentos[1], departamentos[0]]} totalAbiertos={10000} />
    );
    expect(bogotaPrimero).toContain("<h2>Bogotá D.C.</h2>");
  });

  it("antes de llegar el proceso dice que carga y no enlaza ninguna ficha", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain("Cargando proceso…");
    expect(html).not.toMatch(/href="\/licitaciones\/[^"]*--CO1/);
    expect(html).not.toContain("Mejoramiento de acueducto");
  });

  it("con el proceso, una tarjeta y el enlace a todos los del departamento", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial
        departamentos={departamentos}
        totalAbiertos={10000}
        clave="11"
        resumen={vivo}
      />
    );
    expect(html).toContain("<h2>Bogotá D.C.</h2>");
    expect(html).toContain("Construcción del acueducto veredal");
    expect(html).toMatch(
      /href="\/licitaciones\/construccion-del-acueducto-veredal--CO1\.REQ\.9"[^>]*>Ver ficha/
    );
    expect(html.match(/class="aqTarjeta"/g)).toHaveLength(1);
    expect(html).toMatch(
      /href="\/licitaciones\/departamento\/bogota-d-c"[^>]*>Ver todos los procesos de Bogotá D\.C\./
    );
    expect(html).toContain('role="status">Proceso disponible de Bogotá D.C.</p>');
  });

  it("ni conteo ni % nacional como protagonistas del resultado", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} resumen={vivo} />
    );
    expect(html).not.toContain("del total nacional");
    expect(html).not.toContain("aqFichaCifra");
    expect(html).not.toContain("Ver las 5.155 fichas");
  });

  it("un solo botón lleno, el de la ficha; nada de diagnóstico, precios ni alertas", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} resumen={vivo} />
    );
    expect(html.match(/class="aqVerFicha"/g)).toHaveLength(1);
    expect(html).not.toContain("primaryCta");
    expect(html).not.toContain('href="/diagnostico"');
    expect(html).not.toContain('href="/precios"');
    expect(html.toLowerCase()).not.toContain("alerta");
  });

  it("sin semáforo ni gancho de perfil en el hero (2026-10-02)", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} resumen={vivo} />
    );
    expect(html).not.toContain("sf-");
    expect(html).not.toContain("Crea tu perfil");
    expect(html).not.toContain("Mayor presupuesto abierto");
  });

  it("la vista previa va en una línea del mapa, no en el resultado", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain("Señala un departamento para ver cuántos procesos tiene abiertos.");
    expect(html).not.toContain("Vista previa");
    expect(html).not.toContain("data-atenuado");
  });

  it("las opciones del mapa van plegadas, solo con detalle, y no filtran la tarjeta", () => {
    const sin = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(sin).not.toContain("Opciones del mapa");
    const con = renderToStaticMarkup(
      <HeroTerritorial departamentos={conDetalle} totalAbiertos={10000} />
    );
    expect(con).toContain("<summary>Opciones del mapa</summary>");
    expect(con).toContain('<option value="monto">Monto en juego</option>');
    expect(con.match(/<option value="(acueducto|alcantarillado|ptap|ptar|otros)"/g)).toHaveLength(
      5
    );
    // La ayuda del tipo solo sale con un tipo elegido (estado de cliente).
    expect(con).not.toContain("El tipo cambia el mapa");
  });

  it("la ayuda de la lista dice qué hace cada camino", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain(
      "Elige en la lista para ver una ficha aquí; abre un departamento del mapa para ver todos sus procesos."
    );
    expect(renderToStaticMarkup(<HeroTerritorial />)).not.toContain("Elige en la lista");
  });
});

describe("estados sin departamento (spec §9)", () => {
  it("fallo de agregados: lo dice, sin selección ni cifras de demostración", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial mapa={<div>Mapa</div>} departamentos={departamentos} />
    );
    expect(html).toContain("No hay datos territoriales disponibles en este momento.");
    expect(html).toContain("El mapa no tiene datos disponibles en este momento.");
    expect(html).not.toContain('aria-pressed="true"');
    expect(html).not.toContain("Cargando proceso");
    expect(html).toMatch(/href="\/licitaciones"[^>]*>Explorar todos los procesos/);
    // El buscador usa otra ruta: sigue.
    expect(html).toContain('name="q"');
  });

  it("total nacional cero: Colombia y sin procesos, no un error", () => {
    const html = renderToStaticMarkup(<HeroTerritorial mapa={<div>Mapa</div>} totalAbiertos={0} />);
    expect(html).toContain("<h2>Colombia</h2>");
    expect(html).toContain("No hay procesos abiertos disponibles.");
    expect(html).not.toContain("El mapa no tiene datos disponibles");
  });

  it("hay total pero ninguna geografía: no se asigna a ningún departamento", () => {
    const html = renderToStaticMarkup(<HeroTerritorial totalAbiertos={120} departamentos={[]} />);
    expect(html).toContain("No hay procesos con ubicación resuelta para mostrar aquí.");
    expect(html).not.toContain("Antioquia");
  });

  it("sin mapa lo dice; la lista y la tarjeta siguen", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} resumen={vivo} />
    );
    expect(html).toContain("El mapa no está disponible en este momento.");
    expect(html).toContain("Ver ficha");
    expect(html).toContain("como lista");
  });

  it("no contiene cifras demo", () => {
    const html = renderToStaticMarkup(<HeroTerritorial totalAbiertos={0} />);
    expect(html).not.toContain("35.000");
    expect(html).not.toContain("5.155");
    expect(html).not.toContain("14,6 %");
  });
});

describe("alternativa en texto al mapa", () => {
  it("la lista de departamentos va plegada bajo el mapa", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain('id="aq-lista-departamentos"');
    expect(html).toContain("Ver los 2 departamentos como lista");
    expect(html).toContain("5.155");
    // La lista controla el encabezado del territorio, que existe.
    expect(html).toContain('aria-controls="aq-ficha-territorial"');
    expect(html).toContain('id="aq-ficha-territorial"');
  });

  it("con un departamento no dice «los 1»", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={[departamentos[0]]} totalAbiertos={10000} />
    );
    expect(html).toContain("Ver el departamento como lista");
  });

  it("sin datos no ofrece una lista vacía", () => {
    expect(renderToStaticMarkup(<HeroTerritorial />)).not.toContain("como lista");
  });
});

describe("helpers del comparador", () => {
  it("solo calcula porcentaje con total nacional positivo", () => {
    expect(porcentajeNacional(10, 100)).toBe(10);
    expect(porcentajeNacional(0, 100)).toBe(0);
    expect(porcentajeNacional(0, 0)).toBeNull();
    expect(porcentajeNacional(10, null)).toBeNull();
  });

  it("no dice 0,0 % cuando hay procesos", () => {
    expect(formatPorcentaje(0.014)).toBe("< 0,1 %");
    expect(formatPorcentaje(0)).toBe("0,0 %");
    expect(formatPorcentaje(14.52)).toBe("14,5 %");
    expect(formatPorcentaje(null)).toBe("—");
  });
});
