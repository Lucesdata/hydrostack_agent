import { describe, expect, it } from "vitest";
import { consultaDesdeParametros, parametrosBusqueda } from "@/src/lib/secop/busqueda-navegacion";
import {
  crearCargaBusqueda,
  rechazoDeConsulta,
} from "@/src/components/landing/hero-territorial/carga-busqueda";

it("un número inválido no permite reintentar la consulta anterior", () => {
  const anterior = { modo: "numero" as const, numero: "R-42" };
  const estado = rechazoDeConsulta(anterior, new Error("Indica el número del proceso."));
  expect(estado).toMatchObject({
    resultado: null,
    cargando: false,
    error: "Indica el número del proceso.",
    tipoError: "validacion",
  });
});

describe("navegación de búsquedas guiadas", () => {
  it("reconstruye todos los criterios y la página al recargar o volver", () => {
    const query = consultaDesdeParametros(
      new URLSearchParams("modo=tema&sistema=ptar&actividad=consultoria&q=bombeo&page=3")
    );
    expect(query).toMatchObject({
      modo: "tema",
      sistema: "ptar",
      actividad: "consultoria",
      q: "bombeo",
      apertura: "Abierto",
      page: 3,
    });
    const roundTrip = consultaDesdeParametros(parametrosBusqueda(query));
    expect(roundTrip).toEqual(query);
  });
  it("la ausencia intencional de apertura no se convierte en solo abiertos", () => {
    const query = consultaDesdeParametros(new URLSearchParams("modo=tema&apertura="));
    expect(query.apertura).toBeUndefined();
    expect(consultaDesdeParametros(parametrosBusqueda(query)).apertura).toBeUndefined();
  });
  it("el número mantiene sus caracteres y no arrastra los filtros temáticos", () => {
    const query = consultaDesdeParametros(
      new URLSearchParams({ modo: "numero", numero: "R%_42", apertura: "Abierto" })
    );
    const params = parametrosBusqueda(query);
    expect(params.get("numero")).toBe("R%_42");
    expect(params.has("apertura")).toBe(false);
    expect(params.has("sistema")).toBe(false);
  });
});

describe("carga cancelable", () => {
  it("una respuesta antigua que ignora la cancelación no reemplaza la nueva", async () => {
    const states: any[] = [];
    const pendientes: ((response: Response) => void)[] = [];
    const carga = crearCargaBusqueda(
      (state) => states.push(state),
      () => new Promise((resolve) => pendientes.push(resolve))
    );
    const vieja = carga.cargar({ modo: "numero", numero: "VIEJO" });
    const nueva = carga.cargar({ modo: "numero", numero: "NUEVO" });
    pendientes[1](Response.json({ items: [], page: 1, pageSize: 5, total: 2 }));
    await nueva;
    pendientes[0](Response.json({ items: [], page: 1, pageSize: 5, total: 99 }));
    await vieja;
    expect(states.at(-1)).toMatchObject({
      cargando: false,
      consulta: { numero: "NUEVO" },
      resultado: { total: 2 },
    });
    expect(states.some((s) => s.resultado?.total === 99)).toBe(false);
  });
  it("al cancelar por cambio de entrada no aparece la respuesta pendiente", async () => {
    const states: any[] = [];
    let responder!: (response: Response) => void;
    const carga = crearCargaBusqueda(
      (state) => states.push(state),
      () =>
        new Promise((resolve) => {
          responder = resolve;
        })
    );
    const pendiente = carga.cargar({ modo: "tema", actividad: "muestreo" });
    carga.cancelar();
    responder(Response.json({ items: [], page: 1, pageSize: 5, total: 1 }));
    await pendiente;
    expect(states.some((s) => s.resultado)).toBe(false);
  });
  it("un fallo de servicio se distingue de cero resultados", async () => {
    const states: any[] = [];
    const carga = crearCargaBusqueda(
      (state) => states.push(state),
      async () => Response.json({ error: "No se pudo consultar AquaLicita" }, { status: 503 })
    );
    await carga.cargar({ modo: "numero", numero: "R42" });
    expect(states.at(-1)).toMatchObject({
      cargando: false,
      resultado: null,
      error: "No se pudo consultar AquaLicita",
    });
  });
});
