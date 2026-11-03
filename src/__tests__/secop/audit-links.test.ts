import { expect, it } from "vitest";
import { urlSecopDe } from "@/src/lib/secop/datos-decision";
import { validarId, validarIds } from "@/src/lib/mis-procesos/validacion";
it.each([
  "https://community.secop.gov.co.evil.test/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.42",
  "https://evil.test/CO1.NTC.42",
  "http://community.secop.gov.co/x",
  "https://user:pass@community.secop.gov.co/x",
  "javascript:alert(1)",
])("no publica un enlace oficial falso: %s", (url) => expect(urlSecopDe(url)).toBeNull());
it("conserva un expediente HTTPS oficial y su identificador NTC", () => {
  const url =
    "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.42";
  expect(urlSecopDe(url)).toBe(url);
});
it("permite consultar y guardar procesos NTC sin romper el lote de guardados", () => {
  expect(validarId("co1.ntc.42")).toBe("CO1.NTC.42");
  expect(validarIds("CO1.REQ.1,CO1.NTC.42")).toEqual(["CO1.REQ.1", "CO1.NTC.42"]);
  expect(() => validarId("CO1.PCCNTR.42")).toThrow();
});

import { extractUrlProceso } from "@/src/lib/secop/recientes";
import { mapProcesoRow } from "@/src/lib/transform/mapCanonical";
it("la ingesta y las tarjetas recientes tampoco aceptan enlaces ajenos a SECOP", () => {
  expect(
    mapProcesoRow({ id_del_proceso: "CO1.REQ.1", urlproceso: { url: "https://evil.test/x" } }).url
  ).toBeNull();
  expect(extractUrlProceso({ url: "https://evil.test/x" })).toBeNull();
});
