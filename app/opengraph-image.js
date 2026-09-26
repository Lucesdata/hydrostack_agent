import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ALTO_MAPA, ANCHO_MAPA, construirModeloMapa } from "@/src/lib/mapa/modelo";
import { agregadosPortada } from "@/src/lib/secop/agregados";

/**
 * La imagen que se ve al compartir aqualicita.com en WhatsApp, LinkedIn o X.
 *
 * Hasta el 2026-09-26 no había ninguna: el enlace salía sin vista previa. Pinta
 * el mapa departamental real —el mismo modelo que el hero, así que el color de
 * cada departamento es su escalón de procesos abiertos— y el total nacional.
 *
 * Si la base no responde, la imagen sale igual pero sin cifras y con el mapa en
 * un solo tono, como la portada: nunca una cifra inventada. Se revalida cada
 * 6 h, igual que la portada.
 *
 * `next/og` viene con Next: no es una dependencia nueva. Satori no lee woff2,
 * así que Inter va aparte en woff (400 y 700) en app/fonts/, solo para esto.
 */

export const revalidate = 21600;
export const alt = "Mapa de procesos abiertos de agua y saneamiento por departamento en Colombia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** La rampa del hero (--aq-e0..5 en hero-territorial.module.css). */
const RAMPA = ["#13304a", "#1a5687", "#1f7cc0", "#2aa7e3", "#35d3c0", "#b4f5e4"];

const numero = new Intl.NumberFormat("es-CO");

const fuente = (archivo) => readFile(join(process.cwd(), "app/fonts", archivo));

export default async function Image() {
  const [inter400, inter700] = await Promise.all([
    fuente("inter-latin-400-normal.woff"),
    fuente("inter-latin-700-normal.woff"),
  ]);
  let departamentos = [];
  let totalAbiertos = null;
  try {
    const agregados = await agregadosPortada();
    departamentos = agregados.departamentos;
    totalAbiertos = agregados.totalAbiertos;
  } catch (error) {
    console.error("[opengraph-image] agregados no disponibles:", error);
  }

  const { continente } = construirModeloMapa(departamentos);
  const conDatos = totalAbiertos != null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(135deg, #061423 0%, #0b2239 100%)",
        fontFamily: "Inter",
        color: "#f3f8fc",
        padding: "56px 64px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(155deg, #0ea5e9, #0369a1)",
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 700 }}>AquaLicita</div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 20,
            letterSpacing: 3,
            color: "#4cc9ff",
          }}
        >
          SECOP II · AGUA Y SANEAMIENTO
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 14,
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.08,
          }}
        >
          Licitaciones de agua y saneamiento en Colombia
        </div>

        {conDatos ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 36 }}>
            <div style={{ fontSize: 72, fontWeight: 700, color: "#35d3c0" }}>
              {numero.format(totalAbiertos)}
            </div>
            <div style={{ fontSize: 28, color: "#c3d3e0" }}>procesos abiertos</div>
          </div>
        ) : null}

        <div style={{ display: "flex", marginTop: "auto", fontSize: 22, color: "#9fb4c6" }}>
          Cada proceso con su ficha: qué se contrata, si puedes participar y qué te falta.
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
        <svg width={404} height={500} viewBox={`0 0 ${ANCHO_MAPA} ${ALTO_MAPA}`}>
          {continente.map((e) => (
            <path
              key={e.dpto}
              d={e.d}
              fill={conDatos ? RAMPA[e.escalon.indice] : RAMPA[1]}
              stroke="#061423"
              strokeWidth={0.8}
            />
          ))}
        </svg>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Inter", data: inter400, weight: 400, style: "normal" },
        { name: "Inter", data: inter700, weight: 700, style: "normal" },
      ],
    }
  );
}
