export type Route =
  | "standards"
  | "sizing"
  | "soil"
  | "materials"
  | "maintenance"

export type ConditionKey =
  | "form_empty"          // No data entered in form
  | "form_partial"        // Some data entered, no calculation result yet
  | "form_calculated"     // Calculation result available
  | "norm_epa"            // EPA (USA) standard applied
  | "norm_uk"             // UK Building Regulations applied
  | "norm_asnzs"          // AS/NZS 1547 (Australia/NZ) applied
  | "norm_cte"            // CTE DB-HS5 (Spain) applied
  | "soil_low_perm"       // Low permeability detected (T > 18 hours)
  | "soil_not_apt"        // Soil not suitable for infiltration (pure clay)
  | "soil_manual"         // Manual soil test (in-situ percolation)
  | "temp_cold"           // Temperature < 10°C
  | "always"              // Available always

export interface CatalogQuestion {
  id: string              // format "ruta-NN", e.g.: "std-01", "siz-03"
  route: Route
  text: string            // Question as displayed to user (English)
  textEs?: string         // Question as displayed to user (Spanish)
  conditions: ConditionKey[]  // When this question can be offered
  intent: string          // Internal summary: what the assistant should answer
  references?: string[]   // Applicable standards/sections
}

export const CATALOG: CatalogQuestion[] = [
  // ─── STANDARDS ROUTE ──────────────────────────────────────────────────────
  {
    id: "std-01",
    route: "standards",
    text: "Which standard applies to my location?",
    textEs: "¿Qué norma aplica a mi ubicación?",
    conditions: ["form_empty", "form_partial", "always"],
    intent: "Explain which standard is being used (EPA/UK/AS/NZS/CTE) based on location. Mention that the standard defines minimum requirements for retention time (RT), setback distances from water wells, minimum tank volume, and tank dimensions.",
    references: ["EPA 625/R-06/003", "UK Building Regulations H", "AS/NZS 1547", "CTE DB-HS5"]
  },

  {
    id: "std-02",
    route: "standards",
    text: "Why does the minimum tank volume vary by standard?",
    textEs: "¿Por qué varía el volumen mínimo según la norma?",
    conditions: ["form_calculated"],
    intent: "Explain that each standard defines minimum volume based on regional experience. EPA: 1,000 gal (3.79 m³), UK: varies by flow, AS/NZS: typically 1,500 L per person equivalent, CTE: 1.5 m³. These reflect durability, maintenance access, and anaerobic digestion performance in different climates.",
    references: ["EPA 625/R-06/003 §5.1", "UK BR H §H1", "AS/NZS 1547 §3.1", "CTE DB-HS5 §4.3"]
  },

  {
    id: "std-03",
    route: "standards",
    text: "What is the minimum setback distance from water supply sources?",
    textEs: "¿Cuál es la distancia mínima de separación de fuentes de agua potable?",
    conditions: ["form_calculated", "norm_epa", "norm_uk"],
    intent: "Specify minimum setback per standard: EPA typically 15 m, UK typically 30 m, AS/NZS 30 m. These protect groundwater quality from partially treated effluent infiltration. Setback is measured from tank, leach field, or absorption well to nearest well, spring, or water intake.",
    references: ["EPA 625/R-06/003 §5.2", "UK BR H §H3.9", "AS/NZS 1547 §3.7"]
  },

  {
    id: "std-04",
    route: "standards",
    text: "How does temperature affect retention time?",
    textEs: "¿Cómo afecta la temperatura al tiempo de retención?",
    conditions: ["form_calculated"],
    intent: "Show that RT increases in colder climates because anaerobic microorganisms digest organic matter more slowly at lower temperatures. Example: EPA at ≥20°C: 1.5 days, at <10°C: 2.5 days. Cold climates require longer retention for complete sludge digestion. Current RT applied: {r.p.trhDays} days ({r.p.tempLabel}).",
    references: ["EPA 625/R-06/003 Table 5.4", "AS/NZS 1547 Table 3.1"]
  },

  {
    id: "std-05",
    route: "standards",
    text: "What are the minimum tank dimensions (length, width, depth)?",
    textEs: "¿Cuáles son las dimensiones mínimas del tanque (largo, ancho, profundidad)?",
    conditions: ["form_calculated"],
    intent: "Indicate that the applied standard defines minimums to allow sedimentation, avoid short-circuiting, and facilitate maintenance access. Show: minWidth, minLength, minDepth per standard. Verify design meets: L={r.L}m ≥ {r.p.minLength}m, W={r.W}m ≥ {r.p.minWidth}m, depth={r.depth}m ≥ {r.p.minDepth}m.",
    references: ["EPA 625/R-06/003 §5.3", "UK BR H §H1.3", "AS/NZS 1547 §3.2"]
  },

  {
    id: "std-06",
    route: "standards",
    text: "What is organic volumetric loading rate (OVL) and what is the limit?",
    textEs: "¿Qué es la carga orgánica volumétrica (COV) y cuál es el límite?",
    conditions: ["form_calculated"],
    intent: "Explain that OVL = (influent BOD₅ × flow) / tank volume, expressed in kg/m³·day. Maximum typical limit: 0.30 kg/m³·day. Above this, anaerobic digestion becomes overloaded and may fail. Current OVL: {r.OVL} kg/m³·day, status: {r.chkOVL ? '✓ Acceptable' : '✗ CRITICAL'}.",
    references: ["EPA 625/R-06/003 §5.4", "AS/NZS 1547 §3.4"]
  },

  {
    id: "std-07",
    route: "standards",
    text: "What does it mean if solids retention time (SRT) is less than 20 days?",
    textEs: "¿Qué significa si el tiempo de retención de sólidos (TRS) es menor a 20 días?",
    conditions: ["form_calculated"],
    intent: "Explain that SRT (Solids Retention Time) = sludge volume / daily sludge production. Minimum 20 days ensures anaerobic microorganisms remain long enough to digest solids. If SRT < 20 days, sludge does not digest completely and accumulates faster. Current SRT: {r.SRT} days, status: {r.chkSRT ? '✓ Acceptable' : '✗ CRITICAL'}.",
    references: ["WEF Design of Wastewater Treatment Facilities", "AS/NZS 1547 §3.3"]
  },

  // ─── SIZING ROUTE ────────────────────────────────────────────────────────
  {
    id: "siz-01",
    route: "sizing",
    text: "Why does the calculator produce this specific volume?",
    textEs: "¿Por qué la calculadora produce este volumen específico?",
    conditions: ["form_calculated"],
    intent: "Breakdown total volume: Vl (liquid) = flow × retention time, Vs (sludge) = users × accumulation rate × years, Vn (scum) = factor × Vl. Show three components: Vl={r.Vl}m³, Vs={r.Vs}m³, Vn={r.Vn}m³, Vtotal={r.Vtot}m³. If minimum is applied, note that design uses regulatory minimum ({r.p.minVolume}m³).",
    references: ["EPA 625/R-06/003 §5", "UK BR H §H1.3", "AS/NZS 1547 §3"]
  },

  {
    id: "siz-02",
    route: "sizing",
    text: "What happens if I increase the number of occupants?",
    textEs: "¿Qué pasa si aumento el número de ocupantes?",
    conditions: ["form_partial", "form_calculated"],
    intent: "Explain that increasing occupants raises: (1) daily flow Qd, thus Vl increases; (2) sludge production Vs increases. Both directly impact Vtotal. Tank chamber count may also increase (1→2→3 per volume). Example: if occupants={users}, Qd={r.Qd}m³/day.",
    references: ["EPA 625/R-06/003 §5", "UK BR H §H1"]
  },

  {
    id: "siz-03",
    route: "sizing",
    text: "What is the typical volume range for a household like mine?",
    textEs: "¿Cuál es el rango de volumen típico para una vivienda como la mía?",
    conditions: ["form_calculated"],
    intent: "For typical residential use, suggest ranges by occupants: 1-3 persons: 1.5-3.0 m³; 4-6 persons: 2.5-4.5 m³; 7-10 persons: 4.0-7.0 m³. Comment whether current result ({r.Vtot}m³) is typical or not. Reference: this calculation follows {norm_name}.",
    references: ["UK BR H Appendix A", "AS/NZS 1547 Examples"]
  },

  {
    id: "siz-04",
    route: "sizing",
    text: "What does 'regulatory minimum applied' mean?",
    textEs: "¿Qué significa 'se aplicó el mínimo reglamentario'?",
    conditions: ["form_calculated"],
    intent: "Means the calculated volume (Vl+Vs+Vn) was less than the standard minimum. Calculator automatically uses the minimum. Example: calculated {r.Vtot_calc}m³, but standard requires min {r.p.minVolume}m³, so Vtot={r.p.minVolume}m³. This ensures minimum guaranteed performance.",
    references: ["EPA 625/R-06/003 §5.1", "UK BR H §H1.3"]
  },

  {
    id: "siz-05",
    route: "sizing",
    text: "How does the pumping interval affect tank volume?",
    textEs: "¿Cómo afecta el intervalo de vaciado al volumen del tanque?",
    conditions: ["form_partial", "form_calculated"],
    intent: "The pumping interval defines how many years sludge accumulates before emptying. Vs = users × accumulation rate × years between pumpings. Changing interval from {cleanYears} to X years changes Vs proportionally. Longer intervals require larger tanks. Current pumping interval: {cleanYears} years.",
    references: ["EPA 625/R-06/003 §5.2", "AS/NZS 1547 §3.1"]
  },

  {
    id: "siz-06",
    route: "sizing",
    text: "Is the result sensitive to temperature changes?",
    textEs: "¿El resultado es sensible a cambios de temperatura?",
    conditions: ["form_calculated"],
    intent: "Yes, very sensitive. Temperature affects retention time (varies 1.0–4.0 days by standard and climate). Lower RT → smaller Vl → smaller Vtotal. Cold climates increase RT significantly. Changing temperature from {temp}°C to another value changes RT from {r.p.trhDays}d and recalculates everything. Temperature effect on Vtotal is direct.",
    references: ["EPA 625/R-06/003 Table 5.4", "AS/NZS 1547 Table 3.1"]
  },

  {
    id: "siz-07",
    route: "sizing",
    text: "Why does the calculator suggest 1, 2, or 3 compartments?",
    textEs: "¿Por qué la calculadora sugiere 1, 2 o 3 compartimentos?",
    conditions: ["form_calculated"],
    intent: "Multiple compartments improve sedimentation and retention. Rule: occupants >50 or Vtotal >10 m³ → 3 compartments; occupants >5 or Vtotal >2 m³ → 2 compartments; otherwise → 1 compartment. Current: {r.chambers} compartment(s). This allows better contact between effluent and anaerobic biomass.",
    references: ["EPA 625/R-06/003 §5.3", "UK BR H §H1.4"]
  },

  // ─── SOIL ROUTE ──────────────────────────────────────────────────────────
  {
    id: "soil-01",
    route: "soil",
    text: "Is my soil type suitable for a septic system with leach field?",
    textEs: "¿Es mi tipo de suelo apto para un sistema séptico con campo de infiltración?",
    conditions: ["form_partial", "form_calculated"],
    intent: "Verify selected soil is suitable (ok=true). If selected soil is 'Clay (unsuitable)' or similar, answer NO: pure clay does not infiltrate; alternative needed. If suitable, answer YES with estimated infiltration rate q. Selected type: {soil_label}, q={soil.q} L/m²·day, suitable={soil.ok}.",
    references: ["EPA 625/R-06/003 §6.2", "AS/NZS 1547 §4.1"]
  },

  {
    id: "soil-02",
    route: "soil",
    text: "What happens if my soil has low permeability?",
    textEs: "¿Qué pasa si mi suelo tiene baja permeabilidad?",
    conditions: ["form_calculated", "soil_low_perm"],
    intent: "Low permeability soil (T > 18 hours, e.g., silt/loam/clay-loam) requires a larger leach field to infiltrate the same flow. Infiltration rate q is low (8–25 L/m²·day vs 60–80 in sand). Alternatives: (1) increase leach field area with deeper trenches, (2) consider constructed wetland or mound system, (3) evaluate deeper absorption well. Current: T={soil.T}h, q={soil.q} L/m²·day.",
    references: ["EPA 625/R-06/003 §6.3", "AS/NZS 1547 §4.2"]
  },

  {
    id: "soil-03",
    route: "soil",
    text: "What if my soil is not suitable (pure clay)?",
    textEs: "¿Qué hago si mi suelo no es apto (arcilla pura)?",
    conditions: ["form_calculated", "soil_not_apt"],
    intent: "If soil is pure clay (T≈99h, q≈0), septic system with infiltration is not viable. No infiltration will occur. Alternatives per EPA/UK/AS/NZS: (1) Constructed wetland for polishing; (2) Sand/gravel filter mound; (3) Discharge to surface water if permitted, with treatment; (4) Connect to centralized plant. Recommendation: consult local soil investigation and authorities.",
    references: ["EPA 625/R-06/003 §6.4", "UK BR H §H3.27"]
  },

  {
    id: "soil-04",
    route: "soil",
    text: "How is soil infiltration rate (q) determined?",
    textEs: "¿Cómo se determina la tasa de infiltración del suelo (q)?",
    conditions: ["form_partial", "form_calculated", "soil_manual"],
    intent: "If using predefined table, q is associated with soil type. If you select 'Manual (perc. test)', enter the in-situ percolation time (min/cm) measured on site. Formula: q ≈ 70/√T in L/m²·day approximately. Percolation testing is the only precise method; tables are indicative. Current: {soil_label}.",
    references: ["EPA 625/R-06/003 §6.2.1", "ASTM D6391"]
  },

  {
    id: "soil-05",
    route: "soil",
    text: "What is the minimum leach field size?",
    textEs: "¿Cuál es el tamaño mínimo del campo de infiltración?",
    conditions: ["form_calculated"],
    intent: "Area = daily flow / soil infiltration rate. A_leach = {r.Qd*1000} L/day ÷ {soil.q} L/m²·day = X m². Leach field should be at least this area, preferably 20–30% larger for safety. Typical depth 0.6–1.0 m. If q is very low (clay/silt), leach field may be very large → consider alternatives.",
    references: ["EPA 625/R-06/003 §6.3", "AS/NZS 1547 §4"]
  },

  // ─── MATERIALS ROUTE ─────────────────────────────────────────────────────
  {
    id: "mat-01",
    route: "materials",
    text: "Should I install a prefabricated or built-in-place tank?",
    textEs: "¿Instalo un tanque prefabricado o construido in situ?",
    conditions: ["form_calculated", "always"],
    intent: "Prefabricated advantages: guaranteed quality, fast installation, standard materials (HDPE, fiberglass), manufacturer warranty, labor savings. Built-in-place advantages: site adaptation, potentially lower initial cost, local control. Recommendation varies: urban/good access → prefabricated; rural → evaluate local availability. Current volume {r.Vtot}m³ is suitable for both types.",
    references: ["UK BR H §H1.2", "AS/NZS 1547 §5.1"]
  },

  {
    id: "mat-02",
    route: "materials",
    text: "Which is better: concrete or polyethylene (HDPE)?",
    textEs: "¿Qué es mejor: hormigón o polietileno (HDPE)?",
    conditions: ["form_calculated", "always"],
    intent: "Concrete: more mechanically robust, 40+ year life, requires periodic crack maintenance. HDPE: lightweight, root-resistant, 30+ year life, similar or lower cost. In high water table areas, HDPE avoids buoyancy problems. Choice depends on soil, local availability, and budget. Both meet standards.",
    references: ["UK BR H §H1.2", "EN 12566 Materials"]
  },

  {
    id: "mat-03",
    route: "materials",
    text: "What diameter should inlet and outlet pipes be?",
    textEs: "¿Qué diámetro deben tener las tuberías de entrada y salida?",
    conditions: ["form_calculated"],
    intent: "Calculator proposes pipe Ø {r.dPipe*1000:.0f} mm based on maximum flow {r.Qd*1000/86400:.2f} L/s, minimum 100 mm. Inlet must be submerged ≥30 cm below water surface; outlet ≥40 cm below lowest compartment surface. Piping should have minimum 1–2% slope to avoid sediment deposits and dead zones.",
    references: ["EPA 625/R-06/003 §5.5", "UK BR H §H1.5"]
  },

  {
    id: "mat-04",
    route: "materials",
    text: "How should the tank be properly ventilated?",
    textEs: "¿Cómo debe ventilarse correctamente el tanque?",
    conditions: ["form_calculated"],
    intent: "Tank requires passive ventilation to expel gases (CH₄, H₂S, CO₂). Vent pipe: Ø {r.dVent*1000:.0f} mm, minimum Ø100 mm (inlet), one per compartment. Outlet must be ≥0.5 m above nearest building roof. Top with insect-proof screen. Ventilation is especially important in winter (stagnant atmosphere) and low-wind zones.",
    references: ["EPA 625/R-06/003 §5.6", "UK BR H §H1.6"]
  },

  {
    id: "mat-05",
    route: "materials",
    text: "What inspection ports should I install?",
    textEs: "¿Qué registros de inspección debo instalar?",
    conditions: ["form_calculated", "always"],
    intent: "Minimum one accessible inspection port in each compartment lid. For {r.chambers} compartment(s) → {r.chambers} minimum inspection port(s), 0.50–0.60 m diameter (must allow human entry). Leach fields require inspection boxes every 20–30 m along trench length to monitor clogging and performance. Ports enable visual inspection, sludge measurement, and future maintenance.",
    references: ["EPA 625/R-06/003 §5.7", "UK BR H §H1.7"]
  },

  {
    id: "mat-06",
    route: "materials",
    text: "What wall and bottom thickness is recommended?",
    textEs: "¿Qué espesor de paredes y fondo se recomienda?",
    conditions: ["form_calculated", "always"],
    intent: "For prefabricated: concrete 8–10 cm walls, 10–12 cm bottom (verify with manufacturer); HDPE 8–10 mm (per structural rating). For built-in-place concrete: minimum 10–15 cm walls, 12–15 cm bottom (per structural design). Current depth {r.depth}m plus freeboard {freeboard}m = {r.depth+freeboard}m total. If exceeds 2.0 m, requires professional structural review. Material must withstand hydrostatic and soil loads.",
    references: ["UK BR H §H1.2", "EN 13369 (Precast elements)"]
  },

  // ─── MAINTENANCE ROUTE ───────────────────────────────────────────────────
  {
    id: "maint-01",
    route: "maintenance",
    text: "How often should I pump/empty the tank?",
    textEs: "¿Cada cuánto tiempo debo vaciar el tanque?",
    conditions: ["form_calculated"],
    intent: "Pumping interval defined in calculation: {cleanYears} years. Means complete cleaning of tank (sludge + scum). Actual frequency depends on: (1) sludge accumulation rate (varies by standard), (2) observed weekly production. Inspect annually; if sludge occupies >50% tank height, accelerate pumping. Estimated production: {r.Gs_day*365:.1f} kg/year.",
    references: ["EPA 625/R-06/003 §8", "UK BR H §H4"]
  },

  {
    id: "maint-02",
    route: "maintenance",
    text: "What are signs that the tank is not functioning correctly?",
    textEs: "¿Cuáles son las señales de que el tanque no funciona bien?",
    conditions: ["form_calculated", "always"],
    intent: "Failure signs: (1) Very strong odors (H₂S) → anaerobic imbalance; (2) turbid/brown effluent → poor sedimentation; (3) excessive floating scum → C/N imbalance; (4) waterlogging around tank → leakage or infiltration failure; (5) visible sediment in pipes → low slope or short-circuiting. Each sign requires different diagnosis.",
    references: ["EPA 625/R-06/003 §8.3", "WEF Design Manual"]
  },

  {
    id: "maint-03",
    route: "maintenance",
    text: "How often should I inspect tank and leach field?",
    textEs: "¿Con qué frecuencia debo inspeccionar el tanque y el campo de infiltración?",
    conditions: ["form_calculated", "always"],
    intent: "Recommended inspection frequency: Tank: 1–2 times per year (minimum annually after first year). Leach field: annually, checking for waterlogging, odors, dead vegetation. Document all inspections to maintain warranty and traceability. First inspection: 6 months after start-up.",
    references: ["EPA 625/R-06/003 §8.1", "UK BR H §H4.5"]
  },

  {
    id: "maint-04",
    route: "maintenance",
    text: "What do I do if the leach field clogs (stops infiltrating)?",
    textEs: "¿Qué hago si el campo de infiltración se colapsa?",
    conditions: ["form_calculated", "soil_low_perm"],
    intent: "Clogging occurs when soil surface plugs with biofilm and particles. Signs: waterlogging, odors. Remedies: (1) Rest field 1–2 months (natural recovery); (2) expand distribution to new trenches; (3) convert to constructed wetland with secondary treatment; (4) raise infiltration level if space permits. If frequent, soil may be more impermeable than estimated → perform new percolation test.",
    references: ["EPA 625/R-06/003 §8.3", "EN 12566-3"]
  },

  {
    id: "maint-05",
    route: "maintenance",
    text: "How should I manage disposal of extracted sludge?",
    textEs: "¿Cómo debo gestionar los lodos extraídos?",
    conditions: ["form_calculated"],
    intent: "Extracted sludge must: (1) be removed by licensed septage hauler with vacuum truck, (2) be transported to local treatment facility or (3) be composted on-site if volumes are small (<100 L per 3 years). Never discharge directly to soil without treatment. Sludge is biosolid and may contain pathogens. Typical pumping cost: 150–300 USD per visit, depends on access and local regulation.",
    references: ["EPA 625/R-06/003 §8.2", "WPCF Operation & Maintenance Manual"]
  },

  {
    id: "maint-06",
    route: "maintenance",
    text: "What should NOT go into a septic tank?",
    textEs: "¿Qué NO debe entrar en un tanque séptico?",
    conditions: ["form_calculated", "always"],
    intent: "Prohibited: (1) Cooking grease/oils (solidify and clog); (2) non-biodegradable paper, plastics, textiles; (3) harsh chemicals (bleach, industrial degreasers) → kill anaerobic biomass; (4) large quantities of medications (disrupt microbiota); (5) solid waste. Only: domestic wastewater (toilet, shower, sink without grease). Never use chemical tank 'cleaners' claiming to rejuvenate system → disrupt biology.",
    references: ["EPA 625/R-06/003 §8.4", "UK BR H §H4.6"]
  },

  {
    id: "maint-07",
    route: "maintenance",
    text: "What records should I keep about my system?",
    textEs: "¿Qué registros debo llevar de mi sistema?",
    conditions: ["form_calculated", "always"],
    intent: "Keep documentation: (1) Design plans and as-built drawings (location, elevations, pipes); (2) initial inspection certificate; (3) pumping log (dates, volumes); (4) visual inspection notes (photos, observations); (5) repairs/modifications made. Maintain file 5+ years minimum. Aids future troubleshooting and demonstrates maintenance to authorities.",
    references: ["EPA 625/R-06/003 §8", "UK BR H §H4.7"]
  },
]
