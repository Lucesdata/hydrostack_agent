import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ExploradorOportunidades from "@/src/components/comercial/ExploradorOportunidades";
import type { Oportunidad, ResultadoExplorador } from "@/src/lib/comercial/explorador";
import {
  parametrosDesdeUrl,
  type ParametrosExplorador,
} from "@/src/lib/comercial/explorador-params";

const conv: Oportunidad = {
  tipo: "convocatoria",
  id: "CO1.REQ.1",
  href: "/licitaciones/estudios--CO1.REQ.1",
  objeto: "Estudios y diseños de estación de bombeo",
  entidad: "Entidad Valle",
  sede: "Zarzal, Valle del Cauca",
  tipoProyecto: "ptar",
  valor: 480000000,
  fechaRecepcion: "2099-01-01",
  diasRestantes: 12,
  fechaFin: null,
  estado: null,
  contratista: null,
  tecnologias: [
    { codigo: "BOM", nombre: "Bombeo y equipos hidráulicos", cita: "estación de bombeo" },
  ],
};
const cont: Oportunidad = {
  tipo: "contrato",
  id: "CO1.PCCNTR.1",
  href: "/comercial/contratos/CO1.PCCNTR.1",
  objeto: "Reposición de redes",
  entidad: "Entidad Valle",
  sede: null,
  tipoProyecto: "alcantarillado",
  valor: null,
  fechaRecepcion: null,
  diasRestantes: null,
  fechaFin: "2026-09-30",
  estado: "En ejecución",
  contratista: "Consorcio A",
  tecnologias: [],
};
const resultado = (
  filas: Oportunidad[],
  extra: Partial<ResultadoExplorador> = {}
): ResultadoExplorador => ({
  total: filas.length,
  filas,
  descartadasPorContexto: 0,
  porPagina: 20,
  ...extra,
});
const P = (extra: Partial<ParametrosExplorador> = {}): ParametrosExplorador => ({
  ...parametrosDesdeUrl({}),
  ...extra,
});
const html = (p = P(), r: ResultadoExplorador | null = resultado([conv, cont]), error = false) =>
  renderToStaticMarkup(<ExploradorOportunidades params={p} resultado={r} error={error} />);

describe("ExploradorOportunidades", () => {
  it("muestra siempre la etapa con glifo y nombre, y el aviso de qué es la tecnología", () => {
    const h = html();
    expect(h).toMatch(/▷ Convocatoria · recibe ofertas/);
    expect(h).toMatch(/▶ En ejecución/);
    expect(h).toMatch(/no es un dato oficial/);
    expect(h).toMatch(/no demuestra una compra pendiente/);
  });

  it("la tecnología detectada lleva su rótulo «(AquaLicita)» y la cita en el título", () => {
    const h = html();
    expect(h).toMatch(/Bombeo y equipos hidráulicos \(AquaLicita\)/);
    expect(h).toMatch(/title="Detectado en el texto: «estación de bombeo»"/);
  });

  it("convocatoria: presupuesto, días al cierre y enlace a la ficha existente", () => {
    const h = html();
    expect(h).toMatch(/Presupuesto: \$480\.000\.000/);
    expect(h).toMatch(/en 12 días/);
    expect(h).toMatch(/href="\/licitaciones\/estudios--CO1\.REQ\.1"/);
  });

  it("contrato: contratista, «sin dato» y el aviso de no-avance físico", () => {
    const h = html();
    expect(h).toMatch(/Contratista: Consorcio A/);
    expect(h).toMatch(/Valor actual: sin dato/);
    expect(h).toMatch(/no indica avance físico/);
    expect(h).toMatch(/href="\/comercial\/contratos\/CO1\.PCCNTR\.1"/);
  });

  it("la ubicación se rotula como sede de la entidad", () => {
    expect(html()).toMatch(/sede de la entidad: Zarzal, Valle del Cauca/);
  });

  it("el formulario es un GET con las cuatro listas y conserva el valor elegido", () => {
    const h = html(
      P({ etapa: "ejecucion", tecnologia: "BOM.SUM", tipo: "potable", departamento: "76" })
    );
    expect(h).toMatch(/method="get"/);
    for (const n of ["etapa", "tecnologia", "tipo", "departamento"])
      expect(h).toMatch(new RegExp(`name="${n}"`));
    expect(h).toMatch(/<option value="BOM\.SUM" selected/);
    expect(h).toMatch(/<option value="ejecucion" selected/);
    expect(h).toMatch(/Quitar filtros/);
  });

  it("cada control tiene su etiqueta", () => {
    for (const id of ["f-etapa", "f-tec", "f-tipo", "f-dep"])
      expect(html()).toMatch(new RegExp(`for="${id}"`));
  });

  it("dice cuántas filas se ocultaron por negación o contexto", () => {
    const h = html(
      P({ tecnologia: "BOM.SUM" }),
      resultado([conv], { total: 3, descartadasPorContexto: 2 })
    );
    expect(h).toMatch(/3 coincidencias de texto/);
    expect(h).toMatch(/2 de esta página se ocultaron/);
  });

  it("paginación: anterior y siguiente conservan los filtros", () => {
    const h = html(P({ tecnologia: "INS", pagina: 2 }), resultado([conv], { total: 70 }));
    expect(h).toMatch(/href="\/comercial\/explorar\?tecnologia=INS"[^>]*rel="prev"/);
    expect(h).toMatch(/href="\/comercial\/explorar\?tecnologia=INS&amp;pagina=3"[^>]*rel="next"/);
    expect(h).toMatch(/página 2 de 4/);
  });

  it("sin resultados lo dice y ofrece quitar filtros; con error no inventa cifras", () => {
    expect(html(P({ tipo: "ptar" }), resultado([]))).toMatch(/No hay resultados/);
    const e = html(P(), null, true);
    expect(e).toMatch(/role="alert"/);
    expect(e).toMatch(/no muestra cifras simuladas/);
  });

  it("recorta objetos muy largos", () => {
    const largo = { ...conv, objeto: "x".repeat(400) };
    expect(html(P(), resultado([largo]))).toMatch(/x{237}…/);
  });
});
