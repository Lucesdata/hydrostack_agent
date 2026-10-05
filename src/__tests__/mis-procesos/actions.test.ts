import { beforeEach, expect, it, vi } from "vitest";
it("un fallo al confirmar conserva intención y ruta para reintentar", async () => {
  vi.mocked(store.guardarProceso).mockRejectedValueOnce(new Error("base caída"));
  const f = form();
  f.set("volver", "/licitaciones/explorar?modo=tema&sistema=ptar");
  let destino = "";
  try {
    await guardarPersonalAction(f);
  } catch (e) {
    destino = (e as Error).message.replace("REDIRECT:", "");
  }
  const url = new URL(destino, "https://aqualicita.test");
  expect(url.searchParams.get("error")).toBe("servicio");
  expect(url.searchParams.get("guardar")).toBe("CO1.REQ.42");
  expect(url.searchParams.get("volver")).toContain("sistema=ptar");
});
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/src/lib/mis-procesos/acceso", () => ({ cuentaActiva: vi.fn() }));
vi.mock("@/src/lib/mis-procesos/store", () => ({
  guardarProceso: vi.fn(),
  quitarProceso: vi.fn(),
  borrarRecientes: vi.fn(),
}));
import { cuentaActiva } from "@/src/lib/mis-procesos/acceso";
import * as store from "@/src/lib/mis-procesos/store";
import {
  guardarPersonalAction,
  quitarPersonalAction,
  borrarRecientesAction,
} from "@/src/lib/mis-procesos/actions";
const form = () => {
  const f = new FormData();
  f.set("id", "CO1.REQ.42");
  f.set("usuarioId", "victima");
  f.set("confirmar", "si");
  return f;
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(cuentaActiva).mockResolvedValue({ usuarioId: "cuenta-a" });
});
it("confirmar guarda usando sesión y quitar no acepta otro propietario", async () => {
  await expect(guardarPersonalAction(form())).rejects.toThrow("REDIRECT:");
  expect(store.guardarProceso).toHaveBeenCalledWith({ usuarioId: "cuenta-a" }, "CO1.REQ.42");
  await expect(quitarPersonalAction(form())).rejects.toThrow("REDIRECT:");
  expect(store.quitarProceso).toHaveBeenCalledWith("cuenta-a", "CO1.REQ.42");
});
it("borrar recientes no borra guardados", async () => {
  await expect(borrarRecientesAction(form())).rejects.toThrow("REDIRECT:");
  expect(store.borrarRecientes).toHaveBeenCalledWith("cuenta-a");
  expect(store.quitarProceso).not.toHaveBeenCalled();
});
it("fallo de base no confirma éxito ni expone datos internos", async () => {
  vi.mocked(store.guardarProceso).mockRejectedValue(new Error("detalle privado"));
  await expect(guardarPersonalAction(form())).rejects.toThrow(
    "REDIRECT:/mis-procesos?error=servicio"
  );
});
