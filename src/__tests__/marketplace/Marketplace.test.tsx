/**
 * El HTML que sirve el servidor, antes de JavaScript: lo que ve quien no tiene
 * JS, WebGL o un ancho de escritorio (A01, A04, A06, A08, A09). La escena 3D no
 * se monta aquí (es solo cliente y WebGL no existe en Node): se prueba que el 2D
 * y los controles HTML equivalentes están siempre.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import Hero from "@/src/components/marketplace/Hero";
import Oportunidades from "@/src/components/marketplace/Oportunidades";
import { SIN_FILTROS } from "@/src/lib/secop/filtros-vitrina";
import type { ConsultaDisponible, Oportunidad } from "@/src/lib/marketplace/tipos";

function op(p: Partial<Oportunidad> = {}): Oportunidad {
  return {
    id: "CO1.REQ.1",
    referencia: "LP-001",
    objeto: "OPTIMIZACIÓN DE LA PTAP MUNICIPAL",
    entidad: "Alcaldía de Buga",
    departamentoCodigo: "76",
    departamento: "Valle del Cauca",
    municipio: "Buga",
    tipo: "ptap",
    estado: "Publicado",
    estadoApertura: "Abierto",
    etapaCalculada: null,
    precioBaseCop: "2450000000",
    fechaPublicacion: "2026-11-01",
    fechaRecepcion: "2099-12-31",
    fichaHref: "/licitaciones/optimizacion-ptap--CO1.REQ.1",
    secopHref: null,
    ...p,
  };
}

function datos(p: Partial<ConsultaDisponible> = {}): ConsultaDisponible {
  return {
    estado: "disponible",
    consultadoEn: "2026-11-12T12:00:00.000Z",
    actualizadoEn: "2026-11-12T10:00:00.000Z",
    total: 278,
    items: [
      op(),
      op({
        id: "CO1.REQ.2",
        tipo: "otros",
        precioBaseCop: null,
        fichaHref: "/licitaciones/x--CO1.REQ.2",
      }),
    ],
    porDepartamento: [
      { codigo: "76", nombre: "Valle del Cauca", slug: "valle-del-cauca", total: 42 },
      { codigo: "05", nombre: "Antioquia", slug: "antioquia", total: 100 },
    ],
    sinUbicacion: 3,
    metricas: {
      abiertas: 278,
      entidades: 96,
      valorEstimadoCop: "1800000000000",
      procesosConValor: 250,
    },
    departamentoSeleccionado: null,
    departamentoInvalido: false,
    ...p,
  };
}

const hero = (
  d: ConsultaDisponible | { estado: "no-disponible"; consultadoEn: string },
  f = SIN_FILTROS
) => renderToStaticMarkup(<Hero datos={d} filtros={f} />);

describe("Hero (HTML de servidor)", () => {
  const html = hero(datos());

  it("un solo h1 con el titular aprobado", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Oportunidades de infraestructura hídrica");
    expect(html).toContain("en Colombia");
  });

  it("el fondo es decorativo (alt vacío), con variante móvil", () => {
    expect(html).toContain('alt=""');
    expect(html).toContain("hero-atmosphere-mobile.webp");
    expect(html).toContain("hero-atmosphere.webp");
  });

  it("el buscador es un formulario GET con etiqueta visible y destino /marketplace", () => {
    expect(html).toMatch(/<form[^>]*method="get"[^>]*action="\/marketplace"/);
    expect(html).toContain('for="mk-q"');
    expect(html).toContain('name="q"');
    expect(html).toContain('name="numero"');
    expect(html).toContain('name="departamento"');
  });

  it("las tres familias son enlaces con su nombre escrito", () => {
    for (const [tipo, nombre] of [
      ["potable", "Agua potable"],
      ["residual", "Aguas residuales"],
      ["redes", "Redes y alcantarillado"],
    ]) {
      expect(html).toContain(`href="/marketplace?tipo=${tipo}"`);
      expect(html).toContain(nombre);
    }
  });

  it("los indicadores salen de la consulta completa, con su cobertura", () => {
    expect(html).toContain("278");
    expect(html).toContain("96");
    expect(html).toContain("1,8 billones");
    expect(html).toContain("250 de 278 publican presupuesto");
  });

  it("el mapa 2D y el selector HTML equivalente están siempre (A08)", () => {
    expect(html).toContain('href="/marketplace?departamento=valle-del-cauca"');
    expect(html).toContain("Valle del Cauca, 42 oportunidades");
    expect(html).toContain("Ver por departamento");
    expect(html).toContain("Ubicación de la entidad contratante, no del lugar de la obra");
    expect(html).toContain("3 procesos no tienen ubicación disponible");
  });

  it("sin cuerpo de widget: ni borde ni cabecera de panel alrededor del mapa", () => {
    expect(html).not.toMatch(/<(header|figure|fieldset)[^>]*class="[^"]*mapa/i);
  });

  it("con una familia activa la marca con aria-current y un segundo clic la quita", () => {
    const h = hero(datos(), { ...SIN_FILTROS, tipo: "residual" });
    expect(h).toMatch(/<a(?=[^>]*aria-current="true")(?=[^>]*href="\/marketplace")[^>]*>/);
    expect(h).not.toMatch(/<a(?=[^>]*aria-current="true")(?=[^>]*tipo=potable)[^>]*>/);
  });

  it("la región elegida muestra su cifra, la salida a resultados y cómo quitarla", () => {
    const h = hero(
      datos({
        total: 42,
        departamentoSeleccionado: {
          codigo: "76",
          nombre: "Valle del Cauca",
          slug: "valle-del-cauca",
        },
      }),
      { ...SIN_FILTROS, departamento: "valle-del-cauca" }
    );
    expect(h).toContain("42 oportunidades");
    expect(h).toContain('href="#resultados"');
    expect(h).toContain("Quitar departamento");
    expect(h).toContain("(seleccionado)");
  });

  it("un departamento inválido se dice y se puede retirar", () => {
    const h = hero(datos({ departamentoInvalido: true }), {
      ...SIN_FILTROS,
      departamento: "atlantida",
    });
    expect(h).toContain("no existe");
    expect(h).toContain("Retirar el filtro");
  });

  it("la búsqueda por número retira los indicadores y lo explica", () => {
    const h = hero(datos({ metricas: null }), { ...SIN_FILTROS, numero: "CO1.REQ.1" });
    expect(h).not.toContain("Entidades contratantes");
    expect(h).toContain("incluye cerrados");
  });

  it("sin cobertura no inventa: «No informado» y «No disponible», no $0", () => {
    const h = hero(
      datos({
        metricas: { abiertas: 0, entidades: null, valorEstimadoCop: null, procesosConValor: 0 },
      })
    );
    expect(h).toContain("No informado");
    expect(h).toContain("No disponible");
    expect(h).not.toContain("$0");
  });

  it("la fuente caída ofrece Reintentar y conserva la navegación, sin KPIs ni marcadores", () => {
    const h = hero({ estado: "no-disponible", consultadoEn: "2026-11-12T12:00:00.000Z" });
    expect(h).toContain("Reintentar");
    expect(h).toContain('role="alert"');
    expect(h).toContain("Ir a la vitrina");
    expect(h).not.toContain("Oportunidades activas");
    expect(h).not.toContain('<svg viewBox="0 0 420');
    expect(h).toContain('name="q"'); // el buscador sigue
  });
});

describe("Oportunidades (destacadas y resultados)", () => {
  const render = (d: ConsultaDisponible, f = SIN_FILTROS, pagina = 1) =>
    renderToStaticMarkup(<Oportunidades datos={d} filtros={f} pagina={pagina} />);

  it("sin filtros: «Oportunidades destacadas» y «Ver todas», con el total de la consulta", () => {
    const h = render(datos());
    expect(h).toContain("Oportunidades destacadas");
    expect(h).toContain("278 oportunidades abiertas a ofertas"); // no las 2 de la página
    expect(h).toContain("Ver todas las oportunidades");
    expect(h).toContain('href="/licitaciones"');
  });

  it("el catálogo sin filtros ofrece una cuadrícula y permite seguir explorando", () => {
    const h = render(datos());
    expect(h).toContain('aria-label="Cuadrícula de oportunidades"');
    expect(h).toContain('href="/marketplace?pagina=2#resultados"');
  });

  it("con filtros: «Resultados», vitrina con los mismos filtros y paginación", () => {
    const h = render(datos({ total: 40 }), { ...SIN_FILTROS, tipo: "potable" }, 2);
    expect(h).toContain(">Resultados<");
    expect(h).toContain('href="/licitaciones?tipo=potable"');
    expect(h).toContain("página 2 de 4");
    expect(h).toContain('href="/marketplace?tipo=potable#resultados"'); // anterior → página 1
    expect(h).toContain("pagina=3#resultados");
    expect(h).toContain('aria-live="polite"');
  });

  it("la tarjeta enlaza la ficha canónica y rotula la foto como ilustrativa", () => {
    const h = render(datos());
    expect(h).toContain('href="/licitaciones/optimizacion-ptap--CO1.REQ.1"');
    expect(h).toContain("Imagen ilustrativa");
    expect(h).toContain("oportunidad-ptap-640.webp");
    expect(h).toContain("Ver Ficha Viva");
    expect(h).toContain("Sede de la entidad");
    expect(h).toContain("Buga, Valle del Cauca");
    expect(h).toContain("$2.450 M");
    expect(h).toContain("Optimización de la PTAP municipal"); // objeto legible, no en mayúsculas
  });

  it("sin tipo confirmado no hay foto ni leyenda, y sin precio dice «No publicado»", () => {
    const h = render(
      datos({
        items: [
          op({ tipo: null, precioBaseCop: null }),
          op({ id: "CO1.REQ.3", tipo: "otros", fichaHref: "/licitaciones/y--CO1.REQ.3" }),
        ],
      })
    );
    expect(h).not.toContain("<img");
    expect(h).not.toContain("Imagen ilustrativa");
    expect(h).toContain("Sin tipo confirmado");
    expect(h).toContain("Sin subsistema identificado");
    expect(h).toContain("No publicado");
  });

  it("un proceso cerrado (búsqueda por número) se rotula, no se vende como abierto", () => {
    const h = render(
      datos({
        total: 1,
        items: [
          op({
            estadoApertura: "Cerrado",
            estado: "Adjudicado",
            fechaRecepcion: "2026-01-10",
            etapaCalculada: "Plazo cumplido",
          }),
        ],
      }),
      { ...SIN_FILTROS, numero: "LP-001" }
    );
    expect(h).toContain("PLAZO CUMPLIDO");
    expect(h).toContain("Cerrada");
  });

  it("cero resultados es un estado válido con salida", () => {
    const h = render(datos({ total: 0, items: [] }), { ...SIN_FILTROS, q: "xyz" });
    expect(h).toContain("Ninguna oportunidad coincide");
    expect(h).toContain("Limpiar filtros");
    expect(h).toContain("Ir a la vitrina");
  });

  it("atribuye SECOP II, la licencia y el DANE, y no toca el nombre de un proveedor", () => {
    const h = render(datos());
    expect(h).toContain("SECOP II");
    expect(h).toContain("CC BY-SA 4.0");
    expect(h).toContain("Marco Geoestadístico Nacional 2025");
    expect(h).toContain("Última sincronización");
  });
});
