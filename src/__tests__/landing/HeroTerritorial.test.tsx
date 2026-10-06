import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import { procesoPortada } from "./fixtures-portada";

/**
 * El hero con ficha central (spec 2026-10-06-hero-ficha-central; antes, cinco
 * minifichas en fila). Se
 * renderiza el HTML que llega al navegador: es lo que ve quien no tiene JS y
 * lo que hidrata React.
 */

const cinco = [1, 2, 3, 4, 5].map((i) =>
  procesoPortada({ id: `CO1.REQ.${i}`, numeroProceso: `00${i}-LP-2026` })
);

const html = renderToStaticMarkup(
  <HeroTerritorial procesos={cinco} mapa={<div data-testid="mapa">Mapa</div>} />
);

describe("HeroTerritorial", () => {
  it("copy de la referencia, un solo h1 y el encabezado de las tarjetas", () => {
    expect(html).toContain("<span>Explora el mapa.</span> <span>Entiende cada proceso.</span>");
    expect(html).toContain(
      "Encuentra procesos de agua y saneamiento y revisa sus condiciones en una ficha."
    );
    expect(html.match(/<h1/g)).toHaveLength(1);
    // Sin título visible sobre las tarjetas (2026-10-04): la lista se nombra sola.
    expect(html).not.toContain("Procesos para explorar</h2>");
    // Los objetos de las tarjetas son h2: no se salta nivel bajo el h1.
    expect(html).not.toContain("<h3");
  });

  it("incluye búsqueda guiada y conserva el mapa sin ficha individual ni lista de departamentos", () => {
    // Desde el 2026-10-05 el modal envía a la vitrina, el único buscador.
    expect(html).toContain('action="/licitaciones"');
    expect(html).not.toContain("/licitaciones/explorar");
    expect(html).toContain('name="tipo"');
    expect(html).toContain('name="actividad"');
    expect(html).toContain('name="numero"');
    expect(html).not.toContain("Busca por entidad u objeto");
    expect(html).not.toContain("PROCESO SECOP II");
    expect(html).not.toContain("Objeto · Presupuesto · Plazos · Requisitos");
    expect(html).not.toContain("como lista");
    expect(html).not.toContain("Opciones del mapa");
  });

  it("una sola ficha, la del primer proceso, activa, con su número y un solo enlace", () => {
    expect(html).toContain('<ul class="aqMinifichas" aria-label="Proceso para explorar">');
    expect(html.match(/<li class="aqMini"/g)).toHaveLength(1);
    const [p] = cinco;
    expect(html).toContain(`data-proceso="${p.id}" data-familia="potable" data-activo=""`);
    expect(html).toContain(
      `<span class="sr-only">Proceso: </span><span translate="no">${p.numeroProceso}</span>`
    );
    expect(html.match(new RegExp(`href="${p.href}"`, "g"))).toHaveLength(1);
    expect(html).toContain(`aria-label="Ver ficha del proceso ${p.numeroProceso}: ${p.objeto}"`);
    for (const otro of cinco.slice(1)) expect(html).not.toContain(`href="${otro.href}"`);
  });

  it("navegación de la ficha: ←, un punto por proceso, «1 de 5» y →", () => {
    expect(html).toContain('aria-label="Proceso anterior"');
    expect(html).toContain('aria-label="Proceso siguiente"');
    for (const i of [1, 2, 3, 4, 5]) expect(html).toContain(`aria-label="Ver proceso ${i}"`);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toContain('data-activo="" aria-label="Ver proceso 1" aria-current="true"');
    expect(html).toMatch(/>1(<!-- -->)? de (<!-- -->)?5</);
    // La ficha y su navegación van en la columna del mensaje, antes del mapa.
    expect(html.indexOf("Proceso siguiente")).toBeLessThan(html.indexOf('data-testid="mapa"'));
  });

  it("la línea del mapa en móvil dice el proceso activo, nunca un texto de espera", () => {
    expect(html).toContain("<strong>Valle del Cauca</strong> · $2.450 M · Agua potable");
    expect(html).not.toContain("Desliza las tarjetas");
  });

  it("orden de la minificha (opción B): objeto, entidad, estado, categoría, lugar, presupuesto, número, acceso", () => {
    const inicio = html.indexOf('<li class="aqMini"');
    const tarjeta = html.slice(inicio, html.indexOf("</li>", inicio));
    const orden = [
      "Obra de prueba",
      "Municipio de Prueba",
      "Abierto",
      "Agua potable",
      "Cali · Valle del Cauca",
      "$2.450 millones",
      "Proceso:",
      "Ver ficha",
    ].map((t) => tarjeta.indexOf(t));
    expect(orden.every((i) => i >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  it("datos ausentes: texto explícito, nunca $0 ni «Abierto» sin respaldo", () => {
    const parcial = renderToStaticMarkup(
      <HeroTerritorial
        procesos={[
          procesoPortada({
            id: "CO1.REQ.9",
            presupuesto: null,
            municipio: null,
            tipoProyecto: null,
            abierto: false,
            estado: "Adjudicado",
            entidad: null,
          }),
        ]}
      />
    );
    expect(parcial).toContain("Presupuesto no disponible");
    expect(parcial).not.toContain("$0");
    expect(parcial).toContain(">Valle del Cauca</span>");
    expect(parcial).toContain("Sin subsistema identificado");
    // La pastilla lo acorta para caber en una fila (236 px); el texto completo
    // queda en su `title` (2026-10-05).
    expect(parcial).toContain(
      '<span class="aqMiniCategoria" title="Sin subsistema identificado">Sin subsistema</span>'
    );
    expect(parcial).toContain("Adjudicado");
    expect(parcial).not.toContain(">Abierto<");
    // La leyenda añade la categoría neutra solo cuando hace falta.
    expect(html).not.toContain("Sin subsistema identificado");
  });

  it("solo la leyenda de colores bajo el mapa; sin notas ni créditos (2026-10-04)", () => {
    for (const t of ["Agua potable", "Aguas residuales", "Redes y alcantarillado"]) {
      expect(html).toContain(t);
    }
    expect(html).toContain('aria-label="Categorías del proceso"');
    expect(html).not.toContain("Valores en COP");
    expect(html).not.toContain("geoBoundaries");
    expect(html).not.toMatch(/\b1 – 10\b|procesos abiertos por departamento/i);
  });

  it("menos de cinco candidatos: un punto por cada uno, sin rellenos; con uno, sin navegación", () => {
    const dos = renderToStaticMarkup(<HeroTerritorial procesos={cinco.slice(0, 2)} />);
    expect(dos.match(/<li class="aqMini"/g)).toHaveLength(1);
    expect(dos.match(/aria-label="Ver proceso \d"/g)).toHaveLength(2);
    expect(dos).not.toContain("EJEMPLO");
    const uno = renderToStaticMarkup(<HeroTerritorial procesos={cinco.slice(0, 1)} />);
    expect(uno.match(/<li class="aqMini"/g)).toHaveLength(1);
    expect(uno).not.toContain("Proceso siguiente");
  });

  it("vacío y error se distinguen, sin tarjetas", () => {
    const vacio = renderToStaticMarkup(<HeroTerritorial procesos={[]} />);
    const error = renderToStaticMarkup(<HeroTerritorial procesos={null} />);
    expect(vacio).toContain("No hay procesos disponibles para mostrar en este momento.");
    expect(error).toContain("No pudimos cargar los procesos. Inténtalo de nuevo.");
    for (const h of [vacio, error]) expect(h).not.toContain('class="aqMini"');
  });

  it("el mapa del servidor se monta una sola vez", () => {
    expect(html.match(/data-testid="mapa"/g)).toHaveLength(1);
  });

  it("sin sorteo ni peticiones en el cliente: la selección llega del servidor", () => {
    for (const ruta of [
      "src/components/landing/hero-territorial/HeroTerritorial.jsx",
      "src/components/landing/hero-territorial/Minifichas.jsx",
      "src/components/landing/PortadaCliente.jsx",
    ]) {
      const fuente = readFileSync(ruta, "utf8");
      expect(fuente, ruta).not.toContain("Math.random");
      expect(fuente, ruta).not.toContain("fetch(");
      // El único temporizador es el del recorrido (recorrido.js), que no
      // cambia la selección: aquí no hay rotación de contenido.
      expect(fuente, ruta).not.toMatch(/setInterval|scrollIntoView/);
    }
  });
});

it("muestra el contexto del subsistema en la tarjeta sin exigir interacción", () => {
  const p = { ...cinco[0], contextoTipo: "Según descripción: Acueducto." };
  const con = renderToStaticMarkup(<HeroTerritorial procesos={[p]} />);
  expect(con).toContain("Según descripción: Acueducto.");
});
