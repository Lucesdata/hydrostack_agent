import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import { procesoPortada } from "./fixtures-portada";

/**
 * El hero con los tres destacados (spec 2026-10-07-hero-tres-destacados; antes,
 * una ficha central con 30 procesos al azar). Se renderiza el HTML que llega al
 * navegador: es lo que ve quien no tiene JS y lo que hidrata React.
 */

const TIPO = { potable: "acueducto", residual: "ptar", redes: "alcantarillado" } as const;
const tres = (["potable", "residual", "redes"] as const).map((familia, i) => ({
  familia,
  proceso: procesoPortada({
    id: `CO1.REQ.${i + 1}`,
    numeroProceso: `00${i + 1}-LP-2026`,
    tipoProyecto: TIPO[familia],
  }),
  cierre: "2026-10-20",
  holgado: true,
}));
const cinco = tres.map((d) => d.proceso);

const html = renderToStaticMarkup(
  <HeroTerritorial destacados={tres} mapa={<div data-testid="mapa">Mapa</div>} />
);

/** Los destacados con solo `proceso` para la primera pestaña. */
const conUno = (p: (typeof cinco)[number]) => [
  { ...tres[0], proceso: p },
  ...tres.slice(1).map((d) => ({ ...d, proceso: null, cierre: null, holgado: false })),
];

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

  it("una sola ficha, la del primer destacado, activa, con su número y un solo enlace", () => {
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

  it("tres pestañas, una por familia, con la primera elegida", () => {
    expect(html).toContain('role="tablist" aria-label="Proceso más relevante por tipo de obra"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    for (const t of ["Agua potable", "Agua residual", "Redes"]) expect(html).toContain(t);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toMatch(/id="aq-pestana-potable"[^>]*aria-selected="true"[^>]*tabindex="0"/);
    expect(html).toMatch(/id="aq-pestana-redes"[^>]*aria-selected="false"[^>]*tabindex="-1"/);
    expect(html).toMatch(/role="tabpanel" class="[^"]*" aria-labelledby="aq-pestana-potable"/);
    // Pestañas y ficha van en la columna del mensaje, antes del mapa.
    expect(html.indexOf('role="tablist"')).toBeLessThan(html.indexOf('data-testid="mapa"'));
    // Sin la navegación de la ficha central ni «Ver otros».
    expect(html).not.toContain("Proceso siguiente");
    expect(html).not.toContain("Ver otros");
  });

  it("la regla que eligió el proceso va escrita, y el enlace a los demás de su familia", () => {
    expect(html).toContain(
      "El de mayor presupuesto entre los que reciben ofertas 5 días o más. Cierre: 20 oct 2026."
    );
    expect(html).toContain('href="/licitaciones?tipo=potable&amp;orden=valor"');
    expect(html).toMatch(/Ver más de agua potable, de mayor a menor(<!-- -->)?\s*presupuesto/);
  });

  it("una pestaña sin proceso lo dice; no la rellena con otro", () => {
    const vacio = renderToStaticMarkup(
      <HeroTerritorial destacados={tres.map((d) => ({ ...d, proceso: null, cierre: null }))} />
    );
    expect(vacio).not.toContain('class="aqMini"');
    expect(vacio).toMatch(/Hoy no hay procesos de (<!-- -->)?agua potable(<!-- -->)? con/);
    expect(vacio).toContain('href="/licitaciones?tipo=potable&amp;orden=valor"');
  });

  it("si la primera familia no tiene proceso, abre la primera que sí", () => {
    const sinPotable = renderToStaticMarkup(
      <HeroTerritorial
        destacados={[{ ...tres[0], proceso: null, cierre: null }, ...tres.slice(1)]}
      />
    );
    expect(sinPotable).toMatch(/id="aq-pestana-residual"[^>]*aria-selected="true"/);
    expect(sinPotable).toContain(`data-proceso="${cinco[1].id}"`);
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
        destacados={conUno(
          procesoPortada({
            id: "CO1.REQ.9",
            presupuesto: null,
            municipio: null,
            tipoProyecto: null,
            abierto: false,
            estado: "Adjudicado",
            entidad: null,
          })
        )}
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
    // La leyenda solo nombra las tres familias de las pestañas.
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

  it("con un solo destacado no hay recorrido; con dos o más, se puede pausar", () => {
    expect(html).toContain("Pausar recorrido");
    const uno = renderToStaticMarkup(<HeroTerritorial destacados={conUno(cinco[0])} />);
    expect(uno).not.toContain("Pausar recorrido");
  });

  it("error de carga: aviso, sin pestañas ni tarjetas", () => {
    const error = renderToStaticMarkup(<HeroTerritorial destacados={null} />);
    expect(error).toContain("No pudimos cargar los procesos. Inténtalo de nuevo.");
    expect(error).not.toContain('class="aqMini"');
    expect(error).not.toContain('role="tablist"');
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
  const con = renderToStaticMarkup(<HeroTerritorial destacados={conUno(p)} />);
  expect(con).toContain("Según descripción: Acueducto.");
});
