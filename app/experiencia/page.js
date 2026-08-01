"use client";
import ScrollFilm from "@/src/components/experiencia/ScrollFilm";

/* Cadena de clips: cada uno ocupa una banda [start, end] del scroll global.
   Las costuras (.38 y .66) llevan crossfade — se leen como "zambullida". */
const CLIPS = [
  { src: "/experiencia/01-planos.mp4", start: 0, end: 0.38 },
  { src: "/experiencia/02-planta.mp4", start: 0.38, end: 0.66 },
  { src: "/experiencia/03-interior.mp4", start: 0.66, end: 1 },
];

const SECTIONS = [
  { t: 0.02, eyebrow: "EL PLANO", title: "Todo empieza en el papel.",
    body: "Un diseño bien pensado vale más que mil correcciones en obra.",
    tags: ["Diseño", "Cálculos", "Planos"] },
  { t: 0.09, eyebrow: "EL MODELO", title: "El plano cobra vida.",
    body: "De las líneas al modelo 3D: cada equipo dimensionado antes de existir.",
    tags: ["Modelo 3D", "Dimensionamiento"] },
  { t: 0.2, eyebrow: "LA OBRA", title: "El modelo dirige la obra.",
    body: "Construcción guiada por el diseño: cada pieza aparece exactamente donde debe.",
    tags: ["Replanteo", "Montaje"] },
  { t: 0.32, eyebrow: "LA PUESTA EN MARCHA", title: "Lista para arrancar.",
    body: "Presiones y caudales verificados; el agua empieza a correr.",
    tags: ["Pruebas", "Comisionamiento"] },
  { t: 0.43, eyebrow: "LA PLANTA", title: "Toda la planta, en marcha.",
    body: "Cada equipo conectado y operando como un solo sistema.",
    tags: ["Operación", "Sistema completo"] },
  { t: 0.56, eyebrow: "EL CORAZÓN", title: "El tanque principal trabaja.",
    body: "Mezcla y tratamiento continuo en el corazón del proceso.",
    tags: ["Tratamiento", "Mezcla"] },
  { t: 0.7, eyebrow: "POR DENTRO", title: "Entramos al agua.",
    body: "Dentro del tanque, el vórtice hace su trabajo.",
    tags: ["Interior", "Vórtice"] },
  { t: 0.78, eyebrow: "LA CONDUCCIÓN", title: "El agua sigue su camino.",
    body: "De equipo en equipo, sin fugas y sin pérdidas de carga.",
    tags: ["Tubería", "Caudal"] },
  { t: 0.87, eyebrow: "LA FILTRACIÓN", title: "Etapa por etapa, más limpia.",
    body: "Columnas de filtrado y válvulas que controlan cada paso del proceso.",
    tags: ["Filtros", "Válvulas"] },
  { t: 0.97, eyebrow: "LA DESCARGA", title: "Del papel a la descarga.",
    body: "El ciclo completo, tal como el modelo lo predijo. Así se diseña con HydroStack.",
    tags: [], cta: "Explorar HydroStack" },
];

export default function ExperienciaPage() {
  return (
    <ScrollFilm
      clips={CLIPS}
      sections={SECTIONS}
      heightVh={1350}
      ctaHref="/calculators"
    />
  );
}
