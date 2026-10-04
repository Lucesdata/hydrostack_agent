import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/src/lib/mis-procesos/actions", () => ({
  guardarPersonalAction: vi.fn(),
  quitarPersonalAction: vi.fn(),
  borrarRecientesAction: vi.fn(),
}));
import ListasMisProcesos from "@/src/components/mis-procesos/ListasMisProcesos";
import type { ProcesoPersonal } from "@/src/lib/mis-procesos/types";
const p: ProcesoPersonal = {
  procesoId: "CO1.REQ.42",
  objeto: "PTAR de prueba",
  entidad: "Entidad",
  referencia: "R-42",
  estadoApertura: "Cerrado",
  valorEstimado: "0",
  disponible: true,
  guardado: true,
  fecha: "2026-10-04T10:00:00Z",
};
it("listas separadas con cerrado e identificador, sin presupuesto inventado", () => {
  const html = renderToStaticMarkup(
    <ListasMisProcesos listas={{ guardados: [p], recientes: [], pagina: 1, totalGuardados: 1 }} />
  );
  expect(html).toContain("Guardados");
  expect(html).toContain("Recientes");
  expect(html).toContain("Cerrado");
  expect(html).toContain("CO1.REQ.42");
  expect(html).toContain("R-42");
  expect(html).toContain("Sin presupuesto publicado");
  expect(html).not.toContain("$0");
});
it("retirado conserva quitar y no ofrece enlace a ficha", () => {
  const html = renderToStaticMarkup(
    <ListasMisProcesos
      listas={{
        guardados: [{ ...p, disponible: false }],
        recientes: [],
        pagina: 1,
        totalGuardados: 1,
      }}
    />
  );
  expect(html).toContain("no está disponible");
  expect(html).toContain("Quitar");
  expect(html).not.toContain("/licitaciones/ptar-de-prueba--CO1.REQ.42");
});
