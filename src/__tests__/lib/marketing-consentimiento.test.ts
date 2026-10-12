import { describe, expect, it } from "vitest";
import {
  contactosACsv,
  estadoDesdeFilas,
  SENAL_ALTA,
  SENAL_BAJA,
} from "@/src/lib/marketing/consentimiento";

const t = (s: number) => new Date(2026, 9, 12, 10, 0, s);

describe("estadoDesdeFilas", () => {
  it("sin filas: sin_dato", () => expect(estadoDesdeFilas([])).toBe("sin_dato"));
  it("ignora otras señales", () =>
    expect(estadoDesdeFilas([{ senal: "uso:extractor_pliego", creadoEn: t(1) }])).toBe("sin_dato"));
  it("gana la última", () => {
    expect(
      estadoDesdeFilas([
        { senal: SENAL_BAJA, creadoEn: t(2) },
        { senal: SENAL_ALTA, creadoEn: t(1) },
      ])
    ).toBe("baja");
    expect(
      estadoDesdeFilas([
        { senal: SENAL_ALTA, creadoEn: t(3) },
        { senal: SENAL_BAJA, creadoEn: t(2) },
      ])
    ).toBe("alta");
  });
  it("a igual instante gana la baja", () =>
    expect(
      estadoDesdeFilas([
        { senal: SENAL_ALTA, creadoEn: t(1) },
        { senal: SENAL_BAJA, creadoEn: t(1) },
      ])
    ).toBe("baja"));
});

describe("contactosACsv", () => {
  it("escapa comillas y comas y neutraliza fórmulas", () => {
    const csv = contactosACsv([
      { email: "a@b.co", nombre: 'Ana "la" Pérez, S.A.' },
      { email: "c@d.co", nombre: "=HYPERLINK(1)" },
    ]);
    expect(csv).toBe(
      'email,nombre\na@b.co,"Ana ""la"" Pérez, S.A."\nc@d.co,\'=HYPERLINK(1)\n'
    );
  });
});
