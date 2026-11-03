import { expect, it } from "vitest";
import { GeoResolver } from "@/src/lib/transform/writers";
import { mapContratoRow } from "@/src/lib/transform/mapCanonical";

const geo = new GeoResolver(
  new Map([
    ["caldas", "05129"],
    ["antioquia", "05000"],
    ["manizales", "17001"],
    ["boyaca", "15000"],
    ["medellin", "05001"],
  ])
);
it("Caldas departamento no se resuelve al municipio homónimo de Antioquia", () => {
  expect(geo.resolve({ departamento: "caldas", municipio: "manizales" })).toBe("17001");
  expect(geo.resolve({ departamento: "caldas", municipio: null })).toBe("17000");
  expect(geo.resolve({ departamento: "caldas", municipio: "medellin" })).toBe("17000");
  expect(geo.resolve({ departamento: "antioquia", municipio: "caldas" })).toBe("05129");
});
it("un municipio fuera de cobertura conserva el departamento confirmado", () => {
  expect(geo.resolve({ departamento: "boyaca", municipio: "guayata" })).toBe("15000");
});
it("el contrato separa sede de entidad de localización del contrato", () => {
  const c = mapContratoRow({
    id_contrato: "CO1.PCCNTR.1",
    nit_entidad: "890801052",
    departamento: "Caldas",
    ciudad: "Manizales",
    localizaci_n: "Colombia, Antioquia, Medellín",
  });
  expect(c.geo).toEqual({ departamento: "antioquia", municipio: "medellin" });
  expect(c).toHaveProperty("entidadGeo", { departamento: "caldas", municipio: "manizales" });
});
it("identidad oficial de la Gobernación de Caldas prevalece sobre una sede cruda errónea", () => {
  expect(geo.resolveEntidad("890801052", { departamento: "antioquia", municipio: "caldas" })).toBe(
    "17001"
  );
  expect(geo.resolveEntidad("999999999", { departamento: "antioquia", municipio: "caldas" })).toBe(
    "05129"
  );
});
it("Guayatá con metadatos centinela se resuelve por NIT a Boyacá, sin leer el objeto", () => {
  expect(geo.resolveEntidad("891800896", { departamento: null, municipio: null })).toBe("15000");
});
