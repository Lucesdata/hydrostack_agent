export type Route =
  | "normativa"
  | "dimensionado"
  | "suelo"
  | "materiales"
  | "mantenimiento"

export type ConditionKey =
  | "form_empty"          // Sin datos en el formulario
  | "form_partial"        // Algunos datos, sin resultado calculado
  | "form_calculated"     // Resultado calculado disponible
  | "norm_ras"            // Normativa RAS Colombia aplicada
  | "norm_esp"            // Normativa España (CTE DB-HS5) aplicada
  | "norm_eu"             // Normativa Europa (EN 12566-1) aplicada
  | "norm_epa"            // Normativa EPA (USA) aplicada
  | "soil_low_perm"       // Permeabilidad baja detectada (T > 18 horas)
  | "soil_not_apt"        // Suelo no apto para infiltración (arcilla pura)
  | "soil_manual"         // Suelo manual (test de percolación in situ)
  | "temp_cold"           // Temperatura < 10°C
  | "always"              // Disponible siempre

export interface CatalogQuestion {
  id: string              // formato "ruta-NN", ej: "norm-01", "dim-03"
  route: Route
  text: string            // Pregunta tal como la verá el usuario
  conditions: ConditionKey[]  // Cuándo puede ofrecerse al usuario
  intent: string          // Resumen interno: qué debe responder el agente
  references?: string[]   // Normas/secciones aplicables
}

export const CATALOG: CatalogQuestion[] = [
  // ─── RUTA: NORMATIVA ──────────────────────────────────────────────────────
  {
    id: "norm-01",
    route: "normativa",
    text: "¿Cuál es la norma que aplica para mi ubicación?",
    conditions: ["form_empty", "form_partial", "always"],
    intent: "Explicar qué norma se está usando (RAS/CTE/EN 12566/EPA) según la selección del usuario. Mencionar que la norma define requisitos mínimos para T_r (tiempo de retención), separaciones a pozos de agua, volumen mínimo, y dimensiones.",
    references: ["RAS Título J 2017", "CTE DB-HS5", "EN 12566-1", "EPA Onsite Wastewater"]
  },

  {
    id: "norm-02",
    route: "normativa",
    text: "¿Por qué el volumen mínimo cambia según la norma?",
    conditions: ["form_calculated"],
    intent: "Explicar que cada norma define un volumen mínimo basado en su experiencia regional. RAS: 1.0 m³, España: 1.5 m³, Europa: 2.0 m³, EPA: 3.785 m³. Esto refleja criterios de durabilidad, acceso para mantenimiento y desempeño digestión anaerobia en climas distintos.",
    references: ["RAS Título J 2017 §E.4.1.4", "CTE DB-HS5 §4.3.2", "EN 12566-1 §3", "EPA 625/R-06/003"]
  },

  {
    id: "norm-03",
    route: "normativa",
    text: "¿Cuál debe ser la distancia mínima entre la fosa y fuentes de agua?",
    conditions: ["form_calculated", "norm_ras", "norm_epa"],
    intent: "Indicar la separación mínima según norma: RAS establece 30 m a pozos de agua, EPA establece 15 m. Mencionar que esta separación protege la calidad del agua subterránea ante posibles infiltraciones de efluente parcialmente tratado.",
    references: ["RAS Título J §E.4.2.3", "EPA 625/R-06/003 §5.2"]
  },

  {
    id: "norm-04",
    route: "normativa",
    text: "¿Cómo afecta la temperatura al tiempo de retención?",
    conditions: ["form_calculated"],
    intent: "Mostrar que el T_r varía con temperatura porque los microorganismos anaerobios digieren materia orgánica más rápido a mayor T. Ejemplos: RAS a ≥20°C: 1.5d, a <10°C: 2.5d. Clima frío requiere más días para digestión completa. Informar T_r aplicado: {r.p.trhDays} días ({r.p.tempLabel}).",
    references: ["RAS Título J §E.4.1.2", "EN 12566-1 Table 2"]
  },

  {
    id: "norm-05",
    route: "normativa",
    text: "¿Cuáles son las dimensiones mínimas (largo, ancho, profundidad)?",
    conditions: ["form_calculated"],
    intent: "Indicar que la norma aplicada ({norm_name}) define mínimos para permitir sedimentación, evitar cortocircuitos, y facilitar acceso. Mostrar: minWidth, minLength, minDepth según norma. Validar que calculado cumple: L={r.L}m ≥ {r.p.minLength}m, W={r.W}m ≥ {r.p.minWidth}m, depth={r.depth}m ≥ {r.p.minDepth}m.",
    references: ["RAS Título J §E.4.1.1", "CTE DB-HS5 §4.3.1", "EN 12566-1 §3.5"]
  },

  {
    id: "norm-06",
    route: "normativa",
    text: "¿Qué es la carga volumétrica orgánica (CVO) y cuál es el límite?",
    conditions: ["form_calculated"],
    intent: "Explicar que CVO = (DBO₅ influente × caudal) / Vtot, expresada en kg/m³·día. Límite máximo: 0.30 kg/m³·día. Por encima, la fosa se sobrecarga y la digestión anaerobia colapsa. Resultado actual: CVO={r.CVO} kg/m³·día, estado={r.chkCVO?'✓ Aceptable':'✗ CRÍTICO'}.",
    references: ["RAS Título J §E.4.3.2", "EN 12566-1 §3.3"]
  },

  {
    id: "norm-07",
    route: "normativa",
    text: "¿Qué significa que el SRT sea menor a 20 días?",
    conditions: ["form_calculated"],
    intent: "Explicar que SRT (Solids Retention Time) = volumen lodos / producción diaria de lodos. Mínimo 20 días garantiza que microorganismos anaerobios permanecen el tiempo suficiente para digerir sólidos. Si SRT < 20d, los lodos no se digieren completamente y se acumulan más rápido. Actual: SRT={r.SRT} días, estado={r.chkSRT?'✓ Aceptable':'✗ CRÍTICO'}.",
    references: ["RAS Título J §E.4.3.1", "WEF Design of Wastewater Treatment Facilities"]
  },

  // ─── RUTA: DIMENSIONADO ──────────────────────────────────────────────────
  {
    id: "dim-01",
    route: "dimensionado",
    text: "¿Por qué la calculadora arroja este volumen específico?",
    conditions: ["form_calculated"],
    intent: "Desglosar el volumen total: Vl (líquido) = caudal × T_r, Vs (lodos) = usuarios × tasa_acumulación × años, Vn (natas) = factor × Vl. Mostrar los tres componentes con valores: Vl={r.Vl}m³, Vs={r.Vs}m³, Vn={r.Vn}m³, Vtot={r.Vtot}m³. Si {r.minA}, indicar que se aplicó el mínimo normativo ({r.p.minVolume}m³).",
    references: ["RAS Título J §E.4.1", "CTE DB-HS5 §4.3"]
  },

  {
    id: "dim-02",
    route: "dimensionado",
    text: "¿Qué pasa si aumento la cantidad de usuarios?",
    conditions: ["form_partial", "form_calculated"],
    intent: "Explicar que aumentar usuarios incrementa: (1) caudal diario Q_d, por tanto Vl aumenta; (2) producción de lodos Vs aumenta. Ambos impactan Vtot directamente. También puede cambiar número de cámaras (1→2→3 según volumen). Ej: si usuarios={users}, Qd={r.Qd}m³/día.",
    references: ["RAS Título J §E.4.1"]
  },

  {
    id: "dim-03",
    route: "dimensionado",
    text: "¿Cuál es el rango típico de volumen para una vivienda como la mía?",
    conditions: ["form_calculated"],
    intent: "Para vivienda doméstica (tipo_uso='Doméstico'), dar rangos según número de usuarios: 1-3 hab: 1.5-3.0 m³; 4-6 hab: 2.5-4.5 m³; 7-10 hab: 4.0-7.0 m³. Comentar que el resultado actual ({r.Vtot}m³) está en rango típico o fuera. Referencia: este cálculo sigue {norm_name}.",
    references: ["CTE DB-HS5 Anexo E", "RAS Título J Ejemplos"]
  },

  {
    id: "dim-04",
    route: "dimensionado",
    text: "¿Qué significa que aparezca 'mín. normativo aplicado'?",
    conditions: ["form_calculated"],
    intent: "Significa que el volumen calculado (Vl+Vs+Vn) fue menor que el volumen mínimo exigido por la norma. Calculadora automáticamente usa el mínimo. Ej: calculado {r.Vtot_calc}m³, pero norma exige mín {r.p.minVolume}m³, por tanto Vtot={r.p.minVolume}m³. Esto garantiza desempeño mínimo asegurado.",
    references: ["RAS Título J §E.4.1.4", "CTE DB-HS5 §4.3.2"]
  },

  {
    id: "dim-05",
    route: "dimensionado",
    text: "¿Cómo afecta el período de limpieza (vaciado) al volumen?",
    conditions: ["form_partial", "form_calculated"],
    intent: "El período de limpieza define cuántos años se acumulan lodos sin vaciar. Vs = usuarios × tasa_acumulación × años_limpieza. Si cambio periodo de {cleanYears} a X años, Vs varía proporcionalmente. Períodos más largos → mayor Vtot necesario. Período actual: {cleanYears} años.",
    references: ["RAS Título J §E.4.1.3", "EN 12566-1 §3.4"]
  },

  {
    id: "dim-06",
    route: "dimensionado",
    text: "¿Es sensible el resultado si cambio la temperatura?",
    conditions: ["form_calculated"],
    intent: "Sí, muy sensible. Temperatura afecta T_r (varía 1.0–4.0 días según norma y clima). Menor T_r → menor Vl → menor Vtot. En climas fríos (T<10°C) el T_r aumenta significativamente. Ajuste de temperatura de {temp}°C a X°C cambia T_r de {r.p.trhDays}d a otro valor y recalcula todo. Efecto en Vtot es directo.",
    references: ["RAS Título J Table E.4.1", "EN 12566-1 Table 2"]
  },

  {
    id: "dim-07",
    route: "dimensionado",
    text: "¿Por qué la calculadora sugiere 1, 2 o 3 cámaras?",
    conditions: ["form_calculated"],
    intent: "El número de cámaras mejora sedimentación y retención. Regla: usuarios >50 o Vtot >10 m³ → 3 cámaras; usuarios >5 o Vtot >2 m³ → 2 cámaras; sino → 1 cámara. Actual: {r.chambers} cámaras. Esto permite mayor contacto del efluente con biomasa anaeróbica.",
    references: ["RAS Título J §E.4.1.1", "CTE DB-HS5 §4.3.3"]
  },

  // ─── RUTA: SUELO ─────────────────────────────────────────────────────────
  {
    id: "suelo-01",
    route: "suelo",
    text: "¿Mi tipo de suelo es apto para un SITARD (fosa + infiltración)?",
    conditions: ["form_partial", "form_calculated"],
    intent: "Verificar que suelo seleccionado sea apto (ok=true). Si suelo seleccionado es 'Arcilla (no apto)' o similar, responder NO: arcilla pura no infiltra; es necesaria alternativa. Si es apto, responder SÍ con la tasa q estimada. Tipo seleccionado: {soil_label}, q={soil.q} L/m²·día, apto={soil.ok}.",
    references: ["RAS Título J §E.4.2.1", "EN 12566-1 §4.1"]
  },

  {
    id: "suelo-02",
    route: "suelo",
    text: "¿Qué pasa si mi suelo tiene baja permeabilidad?",
    conditions: ["form_calculated", "soil_low_perm"],
    intent: "Suelo con baja permeabilidad (T > 18 horas, ej: limo/franco/arcilla limosa) requiere campo de infiltración más grande para infiltrar el mismo caudal. La tasa q es baja (8–25 L/m²·día vs 60–80 en arenas). Alternativas: (1) aumentar área del campo, (2) usar zanjas más profundas, (3) considerar humedal artificial o pozo filtrante. Actual: T={soil.T}h, q={soil.q} L/m²·día.",
    references: ["RAS Título J §E.4.2.2", "EN 12566-1 §4.2"]
  },

  {
    id: "suelo-03",
    route: "suelo",
    text: "¿Qué pasa si mi suelo NO es apto (arcilla pura)?",
    conditions: ["form_calculated", "soil_not_apt"],
    intent: "Si suelo es arcilla pura (T≈99h, q=0), SITARD es inviable. No hay infiltración. Alternativas según RAS/CTE: (1) Humedal artificial (constructed wetland) de tratamiento; (2) Pozo filtrante profundo con grava y arena; (3) Vertido a cauce natural si existe, con tratamiento complementario; (4) Llevar efluente a planta central. Recomendación: consultar estudios geotécnicos locales.",
    references: ["RAS Título J §E.4.2.3", "CTE DB-HS5 §4.4.2"]
  },

  {
    id: "suelo-04",
    route: "suelo",
    text: "¿Cómo se obtiene la tasa de infiltración (q) del suelo?",
    conditions: ["form_partial", "form_calculated", "soil_manual"],
    intent: "Si usa tabla predefinida, q está asociado a tipo de suelo. Si selecciona 'Manual (test perc.)', debe ingresar tiempo de percolación (min/cm) del ensayo in situ. La fórmula es aprox: q ≈ 70/√T en L/m²·día. El test de percolación es el único método preciso; la tabla es orientativa. Actual: {soil_label}.",
    references: ["RAS Título J Anexo E.4.2.1", "ASTM D6391"]
  },

  {
    id: "suelo-05",
    route: "suelo",
    text: "¿Cuál es el tamaño mínimo del campo de infiltración?",
    conditions: ["form_calculated"],
    intent: "Área = caudal diario / q del suelo. A_inf = {r.Qd*1000} L/día ÷ {soil.q} L/m²·día = X m². Campo debe ser al menos esta área, preferiblemente 20–30% mayor para seguridad. Profundidad típica 0.6–1.0 m. Si q es muy baja (suelo limo/arcilla), el campo puede resultar muy grande → considerar alternativas.",
    references: ["RAS Título J §E.4.2.2", "EN 12566-1 §4"]
  },

  // ─── RUTA: MATERIALES ────────────────────────────────────────────────────
  {
    id: "mat-01",
    route: "materiales",
    text: "¿Conviene construir la fosa prefabricada o in situ?",
    conditions: ["form_calculated", "always"],
    intent: "Ventajas prefabricado: calidad garantizada, instalación rápida, acceso a materiales estandarizados (PEAD, fibra), garantía fabricante, ahorros en mano de obra. Ventajas in situ: adaptación a espacio, menor costo inicial, control local. Recomendación según contexto: zona urbana/acceso → prefabricado; zona rural → evaluar disponibilidad. Volumen actual: {r.Vtot}m³ es apto para ambas.",
    references: ["CTE DB-HS5 §4.2", "RAS Título J §E.3.2"]
  },

  {
    id: "mat-02",
    route: "materiales",
    text: "¿Cuál es mejor material: hormigón o polietileno (PEAD)?",
    conditions: ["form_calculated", "always"],
    intent: "Hormigón: más resistente mecánicamente, vida útil 40+ años, requiere mantenimiento periódico de grietas. PEAD: ligero, resistente a raíces, vida útil 30+ años, costo similar o menor. En zonas con agua freática alta, PEAD evita problemas de flotación. Elección depende de suelo, disponibilidad local y presupuesto. Ambos cumplen normativa.",
    references: ["CTE DB-HS5 §4.2.2", "EN 12566 Materiales"]
  },

  {
    id: "mat-03",
    route: "materiales",
    text: "¿Cuál debe ser el diámetro de los tubos de entrada y salida?",
    conditions: ["form_calculated"],
    intent: "Calculadora propone Ø {r.dPipe*1000:.0f} mm calculado desde caudal máximo {r.Qd*1000/86400:.2f} L/s con mínimo de 100 mm. Entrada debe estar sumergida ≥30 cm bajo superficie del agua; salida ≥40 cm bajo la más profunda. Tubería debe tener pendiente mínima 1–2% para evitar depósitos y zonas de turbulencia.",
    references: ["RAS Título J §E.4.4.1", "CTE DB-HS5 §4.3.4", "EN 12566-1 §3.6"]
  },

  {
    id: "mat-04",
    route: "materiales",
    text: "¿Cómo se debe ventilar correctamente la fosa?",
    conditions: ["form_calculated"],
    intent: "Fosa requiere ventilación pasiva para expulsar gases (CH₄, H₂S, CO₂). Tubo de ventilación: Ø {r.dVent*1000:.0f} mm, mínimo Ø100 mm (entrada), uno por cámara. Debe estar ≥0.5 m sobre cubierta de edificación más próxima. Salida con rejilla anti-insectos. Foso especialmente importante en invierno (atmósfera estancada) y zonas con vientos bajos.",
    references: ["RAS Título J §E.4.4.2", "CTE DB-HS5 §4.3.5"]
  },

  {
    id: "mat-05",
    route: "materiales",
    text: "¿Qué registros de inspección debo instalar?",
    conditions: ["form_calculated", "always"],
    intent: "Mínimo un registro accesible en tapa de cada cámara. Para {r.chambers} cámara(s) → {r.chambers} registro(s) de acceso mínimo 0.50–0.60 m de diámetro (debe permitir entrada de persona). Campos de infiltración requieren cajas de inspección cada 20–30 m de longitud de zanja para vigilar colmatación y funcionamiento. Registros facilitan inspección visual, medida de lodos, y trabajos de mantenimiento futuro.",
    references: ["RAS Título J §E.4.4.3", "CTE DB-HS5 §4.4.1", "EN 12566-1 §5.4"]
  },

  {
    id: "mat-06",
    route: "materiales",
    text: "¿Qué espesor de hormigón o PEAD se recomienda?",
    conditions: ["form_calculated", "always"],
    intent: "Para fosa séptica prefabricada: Hormigón armado típico 8–10 cm pared, 10–12 cm fondo (debe verificarse con fabricante o ingeniero estructural); PEAD: espesor 8–10 mm según resistencia mecánica. Para fosa in situ de hormigón colado: mínimo 10–15 cm pared y 12–15 cm fondo (depende cálculo de presiones). A profundidad actual {r.depth}m + borde libre {freeboard}m = {r.depth+freeboard}m total, si supera 2.0 m requiere revisión por profesional. Material debe resistir presión hidrostática y cargas de tierra.",
    references: ["CTE DB-HS5 §4.2.3", "UNE-EN 13369 (Elementos prefabricados)"]
  },

  // ─── RUTA: MANTENIMIENTO ─────────────────────────────────────────────────
  {
    id: "mant-01",
    route: "mantenimiento",
    text: "¿Cada cuánto tiempo debo vaciar la fosa?",
    conditions: ["form_calculated"],
    intent: "Período de limpieza definido en cálculo: {cleanYears} años. Significa vaciar y limpiar completamente fosa (lodos + natas). Frecuencia real depende de: (1) tasa acumulación lodos (varía T/norma), (2) producción semanal observada. Inspeccionar anualmente; si lodos ocupan >50% altura, anticipar vaciado. Producción estimada: {r.Gs_day*365:.1f} kg/año.",
    references: ["RAS Título J §E.5.1", "CTE DB-HS5 §5"]
  },

  {
    id: "mant-02",
    route: "mantenimiento",
    text: "¿Cuáles son los signos de que la fosa no está funcionando correctamente?",
    conditions: ["form_calculated", "always"],
    intent: "Signos de fallo: (1) olores muy fuertes (H₂S sin diluir) → anaerobia desequilibrada; (2) efluente turbio/marrón → no hay sedimentación; (3) natas flotantes excesivas o sumergidas → imbalance C/N; (4) agua encharcada alrededor → infiltración fallida; (5) tuberías con depósitos visibles → bajapendiente o cortocircuitos. Cada signo requiere diagnóstico diferente.",
    references: ["RAS Título J §E.5.2", "WEF Design Manual"]
  },

  {
    id: "mant-03",
    route: "mantenimiento",
    text: "¿Con qué frecuencia debo inspeccionar la fosa y el campo?",
    conditions: ["form_calculated", "always"],
    intent: "Inspección recomendada: Fosa séptica: 1–2 veces/año (mínimo anual después de primer año). Campo de infiltración: anual, observando si agua se encharca, olores, vegetación muerta. Registros de inspección deben documentarse para mantener garantía y trazabilidad. Primera inspección: 6 meses después de puesta en marcha.",
    references: ["RAS Título J §E.5.3", "CTE DB-HS5 §5.2"]
  },

  {
    id: "mant-04",
    route: "mantenimiento",
    text: "¿Qué hacer si el campo de infiltración se colmata (no infiltra)?",
    conditions: ["form_calculated", "soil_low_perm"],
    intent: "Colmatación ocurre cuando la capa superficial del suelo se obstruye por biofilm y partículas. Síntomas: agua encharcada, olores. Remedios: (1) Dejar descansar campo 1–2 meses (reposo); (2) aumentar área de distribución con nuevas zanjas; (3) cambiar a humedal artificial con tratamiento secundario; (4) elevar cota de infiltración si hay espacio. Si sucede con mucha frecuencia, es posible que el suelo original sea más impermeable de lo estimado → realizar nuevo test de percolación.",
    references: ["RAS Título J §E.5.2.2", "EN 12566-3"]
  },

  {
    id: "mant-05",
    route: "mantenimiento",
    text: "¿Cómo se gestiona la disposición de los lodos extraídos?",
    conditions: ["form_calculated"],
    intent: "Lodos extraídos deben ser: (1) retirados por empresa autorizada con equipo de bombeo de vacío (camión tanque), (2) trasladados a planta de tratamiento local o (3) compostados in situ si volúmenes son pequeños (< 100 L cada 3 años). Bajo ningún caso verter directamente al suelo sin tratamiento. Lodos son biosolidos y pueden contener patógenos. Costo vaciado típico: 200–500 USD por evento, depende de acceso y regulación local.",
    references: ["RAS Título J §E.5.1", "WPCF Op&Maint Manual"]
  },

  {
    id: "mant-06",
    route: "mantenimiento",
    text: "¿Hay algo que NO debo echar a la fosa séptica?",
    conditions: ["form_calculated", "always"],
    intent: "Prohibido: (1) Grasas/aceites de cocina (se solidifican y colmatan); (2) Papel no biodegradable, plásticos, textiles; (3) Químicos agresivos (lejía, desengrasantes industriales) → matan biomasa anaeróbica; (4) Medicamentos en cantidad (alteran microbiota); (5) Residuos sólidos. Solo: agua residual doméstica (WC, ducha, cocina sin grasa). Nunca usar selladores químicos que afirman 'limpiar' fosa → causan desequilibrio biológico.",
    references: ["RAS Título J §E.5.3", "CTE DB-HS5 §5.3"]
  },

  {
    id: "mant-07",
    route: "mantenimiento",
    text: "¿Qué documentación debo guardar sobre mi sistema?",
    conditions: ["form_calculated", "always"],
    intent: "Documentación clave: (1) Planos de diseño e instalación (ubicación, cotas, tuberías); (2) Certificado de construcción/inspección inicial; (3) Registro de vaciados (fechas, volúmenes); (4) Inspecciones visuales (fotos, notas); (5) Cambios/reparaciones realizadas. Mantener archivo por 5+ años. Esto facilita diagnóstico futuro si falla, y acredita mantenimiento ante autoridades.",
    references: ["RAS Título J §E.5", "CTE DB-HS5 §6"]
  },
]
