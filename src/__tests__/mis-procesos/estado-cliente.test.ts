import { expect, it } from "vitest";
import { crearCargaCuenta } from "@/src/components/mis-procesos/estado-cliente";
it("recuperar foco entrega listas completas nuevas y no reutiliza las iniciales", async () => {
  const estados: any[] = [];
  const urls: string[] = [];
  const listas = {
    usuarioId: "cuenta-a",
    guardados: [{ procesoId: "CO1.REQ.7" }],
    recientes: [{ procesoId: "CO1.REQ.9" }],
    pagina: 2,
    totalGuardados: 26,
  };
  const carga = crearCargaCuenta(
    (e) => estados.push(e),
    async (input) => {
      urls.push(String(input));
      return Response.json(listas);
    }
  );
  await carga.cargar(["CO1.REQ.1"], 2);
  expect(urls[0]).toBe("/api/mis-procesos?page=2");
  expect(estados.at(-1).listas).toEqual(listas);
  expect(estados.at(-1).guardados).toEqual(["CO1.REQ.7"]);
});
it("invalidar sesión descarta una respuesta personal pendiente", async () => {
  const estados: any[] = [];
  let responder!: (r: Response) => void;
  const carga = crearCargaCuenta(
    (e) => estados.push(e),
    () =>
      new Promise((resolve) => {
        responder = resolve;
      })
  );
  const pendiente = carga.cargar(["CO1.REQ.42"]);
  carga.invalidar();
  responder(Response.json({ guardados: ["CO1.REQ.42"] }));
  await pendiente;
  expect(estados.at(-1)).toMatchObject({ estado: "cargando", guardados: [] });
  expect(estados.some((e) => e.guardados.includes("CO1.REQ.42"))).toBe(false);
});
it("un401 limpia guardados y un503 no se interpreta como visitante", async () => {
  const estados: any[] = [];
  let status = 401;
  const carga = crearCargaCuenta(
    (e) => estados.push(e),
    async () => Response.json({ error: "fallo" }, { status })
  );
  await carga.cargar(["CO1.REQ.42"]);
  expect(estados.at(-1).estado).toBe("anonimo");
  status = 503;
  await carga.cargar(["CO1.REQ.42"]);
  expect(estados.at(-1).estado).toBe("error");
});
