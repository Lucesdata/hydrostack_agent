"use client";
import { createContext, useContext, useState } from "react";

const translations = {
  es: {
    nav: {
      calculators: "Calculadoras",
      assistant: "Asistente",
      about: "Acerca de",
      lang: "EN",
    },
    landing: {
      tagline: "Ingeniería de agua y saneamiento",
      subtitle: "Herramientas de cálculo técnico para ingenieros, estudiantes y profesionales del sector hídrico. Normas internacionales. Resultados precisos.",
      cta: "Explorar calculadoras",
      ctaSub: "Acceso libre · Sin registro",
      feat1Title: "Multi-normativa",
      feat1Desc: "RAS Colombia, España, EN 12566, EPA. Selecciona la norma y los parámetros se ajustan automáticamente.",
      feat2Title: "Rigor técnico",
      feat2Desc: "Verificaciones normativas, diseño hidráulico, SRT, carga orgánica, perfil hidráulico y memoria de cálculo.",
      feat3Title: "Modo educativo",
      feat3Desc: "Explicaciones paso a paso para cada fórmula. Diseñado para ingenieros y estudiantes por igual.",
      feat4Title: "Exportable",
      feat4Desc: "Genera tu memoria de cálculo lista para imprimir o presentar al cliente.",
      modulesTitle: "Módulos disponibles",
      modulesComingSoon: "Próximamente",
      footerDesc: "Herramienta de ingeniería de agua y saneamiento.",
    },
    calculators: {
      pageTitle: "Calculadoras",
      pageSubtitle: "Selecciona el sistema a dimensionar",
      septicTitle: "Fosa Séptica",
      septicDesc: "Dimensionamiento completo: volúmenes, cámaras, tuberías, verificaciones y campo de infiltración.",
      septicNorms: "RAS · España · EN 12566 · EPA",
      open: "Abrir calculadora",
      soon: "Próximamente",
      imhoffTitle: "Tanque Imhoff",
      imhoffDesc: "Cámara de sedimentación y digestión de lodos. Cálculo según normas internacionales.",
      lodsTitle: "Lodos Activados",
      lodsDesc: "Sistemas de tratamiento biológico aerobio. Dimensionamiento de reactores y sedimentadores.",
      uasbTitle: "Reactor UASB",
      uasbDesc: "Reactor anaeróbico de flujo ascendente. Velocidades de flujo, tiempo de retención y carga orgánica.",
      filterTitle: "Filtro Percolador",
      filterDesc: "Dimensionamiento de filtros biológicos para tratamiento secundario de aguas residuales.",
      potTitle: "Potabilización",
      potDesc: "Coagulación, floculación, sedimentación, filtración y desinfección. Plantas de agua potable.",
    },
    badge: {
      free: "Acceso libre",
      norms: "4 normas internacionales",
      edu: "Modo educativo",
    }
  },
  en: {
    nav: {
      calculators: "Calculators",
      assistant: "Assistant",
      about: "About",
      lang: "ES",
    },
    landing: {
      tagline: "Water & Sanitation Engineering",
      subtitle: "Technical calculation tools for engineers, students and water sector professionals. International standards. Accurate results.",
      cta: "Explore calculators",
      ctaSub: "Free access · No registration",
      feat1Title: "Multi-standard",
      feat1Desc: "RAS Colombia, Spain, EN 12566, EPA. Select the standard and parameters adjust automatically.",
      feat2Title: "Technical rigor",
      feat2Desc: "Code checks, hydraulic design, SRT, organic load, hydraulic profile and calculation report.",
      feat3Title: "Educational mode",
      feat3Desc: "Step-by-step explanations for each formula. Designed for engineers and students alike.",
      feat4Title: "Exportable",
      feat4Desc: "Generate your calculation report ready to print or present to the client.",
      modulesTitle: "Available modules",
      modulesComingSoon: "Coming soon",
      footerDesc: "Water and sanitation engineering tool.",
    },
    calculators: {
      pageTitle: "Calculators",
      pageSubtitle: "Select the system to design",
      septicTitle: "Septic Tank",
      septicDesc: "Full sizing: volumes, chambers, pipes, code checks and infiltration field.",
      septicNorms: "RAS · Spain · EN 12566 · EPA",
      open: "Open calculator",
      soon: "Coming soon",
      imhoffTitle: "Imhoff Tank",
      imhoffDesc: "Sedimentation and sludge digestion chamber. Sizing per international standards.",
      lodsTitle: "Activated Sludge",
      lodsDesc: "Aerobic biological treatment systems. Reactor and settler sizing.",
      uasbTitle: "UASB Reactor",
      uasbDesc: "Upflow anaerobic sludge blanket reactor. Flow velocities, retention time and organic load.",
      filterTitle: "Trickling Filter",
      filterDesc: "Biological filter sizing for secondary wastewater treatment.",
      potTitle: "Water Treatment",
      potDesc: "Coagulation, flocculation, sedimentation, filtration and disinfection. Drinking water plants.",
    },
    badge: {
      free: "Free access",
      norms: "4 international standards",
      edu: "Educational mode",
    }
  }
};

const LangContext = createContext({ lang: "es", t: translations.es, toggle: () => {} });

export function LangProvider({ children }) {
  const [lang, setLang] = useState("es");
  const toggle = () => setLang(l => l === "es" ? "en" : "es");
  return (
    <LangContext.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
