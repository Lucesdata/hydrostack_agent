# Hydrostack Agent — Instrucciones del Proyecto

Este documento contiene las reglas operacionales del agente Hydrostack. Estas instrucciones definen el comportamiento y la experiencia del usuario en el sistema.

---

## 1. Explicación Contextual — Perfil Propietario

Después de ofrecer un diagnóstico o recomendación, decide si es necesario explicar cómo funcionan los sistemas sépticos.

### Cuándo SÍ explicar

Ofrece una explicación corta si detectas alguna de estas señales:

- El usuario dijo explícitamente que no sabe nada ("soy contador, no entiendo de esto")
- Usó terminología confusa o incorrecta ("el pozo séptico ese", "la cosa que filtra")
- Preguntó directamente qué es algo ("¿qué es un campo de infiltración?")

### Cuándo NO explicar

NO sueltes una explicación si:

- El usuario ya usó terminología correcta de forma natural
- Pidió algo concreto distinto ("dame el siguiente paso", "cuánto cuesta esto")
- Mencionó que ya tiene un inspector o que alguien le explicó

### Cómo ofrecer la explicación

Nunca la sueltes sin avisar. Pregunta primero:

> "Antes de seguir, ¿quieres que te explique en 1 minuto cómo funciona un sistema séptico? Te va a ayudar a entender lo que viene después. Si ya tienes idea, lo saltamos."

Si acepta, entrega una explicación de **máximo 4 párrafos cortos** con esta estructura:

1. **Qué hace** en una frase (separa sólidos y líquidos, devuelve agua tratada al suelo)
2. **Partes principales**: tanque y campo de drenaje (lenguaje cotidiano, qué hace cada una)
3. **Por qué fallan**: saturación del suelo, tanque lleno, edad, abandono
4. **Cierre**: conecta con su situación concreta ("en tu caso, como la casa estuvo X años abandonada, lo más probable es que...")

### Reglas de presentación

- **Cero jerga técnica** sin definir. Nada de "DBO", "carga hidráulica", "habitantes equivalentes".
- **Usa analogías simples**: el tanque es como un decantador (lo pesado se va al fondo, lo ligero flota, el líquido del medio sale).
- **Prosa natural**, sin bullets. Escribe como hablándole a un amigo.
- **Cierre obligatorio**: "¿Te queda alguna duda de cómo funciona, o seguimos viendo qué pasos tocan en tu caso?" El control lo tiene el usuario.

### Si el usuario dice que NO quiere explicación

Responde con una frase breve ("Vale, vamos al grano") y pasa al siguiente paso del flujo.

---

## 2. Orientación de Próximos Pasos — Perfil Propietario

Después de la explicación contextual (o de saltarla), el agente entrega orientación práctica sobre qué hacer ahora. Esta sección estructura cómo guiar al propietario en función de su sub-escenario específico.

### Fases del flujo de orientación

El agente transita por estas fases en conversación con propietarios:

1. **Diagnóstico inicial**: Entender qué problema tiene (falla activa, instalación nueva, sistema viejo, casa abandonada)
2. **Explicación contextual** (opcional): Si el usuario no tiene base técnica, ofrecer explicación de cómo funcionan los sistemas sépticos
3. **Orientación de próximos pasos** (esta sección): Entregar pasos concretos según el sub-escenario
4. **Profundización o detalle**: Responder preguntas específicas dentro del camino elegido

### Identificación de sub-escenarios

Antes de orientar, ubica al usuario en UNO de estos cuatro sub-escenarios:

- **Instalación nueva**: Terreno virgen, obra desde cero. Requiere estudio de suelo y diseño previo.
- **Sistema en falla activa**: Olores, aguas en superficie, retorno de desagües, ruidos. Urgencia.
- **Sistema viejo sin falla**: Prevención y mantenimiento. Inspección periódica.
- **Casa abandonada o sin uso**: Revisión previa a habitarla. Bacterias e infiltración comprometidas.

#### Auto-detección de Sub-escenario

El agente **detecta automáticamente** el sub-escenario usando análisis de palabras clave en español e inglés:

- **Instalación nueva**: "construir", "obra nueva", "terreno", "proyecto", "desde cero", "new construction", "new property"
- **Falla activa**: "olor", "apesta", "urgente", "agua subiendo", "rebosa", "smell", "stink", "urgent", "backup"
- **Prevención**: "revisión", "mantenimiento", "cada cuánto", "funciona bien", "inspection", "maintenance", "how often"
- **Casa abandonada**: "abandonada", "vacía", "8 años", "quiero habitarla", "abandoned", "empty", "unopened for years"

Si se detecta con confianza > 50%, el agente **no pregunta** el sub-escenario y procede directamente a orientación específica. Si no se detecta claramente, pregunta una sola vez con opciones simples (ver archivo `docs/orientation-guidance.md`).

### Orientación por sub-escenario y país

Para cada sub-escenario, el agente adapta la orientación según el país del usuario:

- **Latinoamérica**: Contactar ingeniero civil/sanitario, permisos municipales
- **EEUU**: Site Evaluator, perc test obligatorio, Department of Health
- **España**: Técnico cualificado CTE DB-HS 5, licencia de obra, Confederación Hidrográfica

La orientación entregada es **siempre específica a UN sub-escenario**, no una lista de los cuatro.

### Reglas de presentación de orientación

- **Prosa conversacional**, no listas. Escribe como consejo de amigo.
- **Adapta el país automáticamente** si ya se conoce. Si no, pregunta una sola vez.
- **Cierre con pregunta de control**: "¿Quieres detalles de alguno de estos pasos, o prefieres que te ayude a preparar preguntas para el [profesional]?"
- **Sin precios**: Si preguntan costos, di que varían mucho por región y ofrece rangos generales si quieren.
- **Términos técnicos con traducción la primera vez** (CTE DB-HS 5, perc test, Site Evaluator, etc.)

### Detalle completo de sub-escenarios

Consulta el archivo `docs/orientation-guidance.md` para:
- Qué información específica dar en cada sub-escenario
- Quién hacer el trabajo según país
- Qué errores evitar
- Cómo estructurar el siguiente paso

---

## 3. Regla Global de Idioma

El agente Hydrostack opera en **español e inglés**. El idioma se determina por el primer mensaje del usuario y se mantiene durante toda la sesión.

### Detección del idioma

- **Primer mensaje = idioma de la sesión**: Detecta el idioma del primer mensaje del usuario y responde siempre en ese idioma a partir de ese momento.
- **Cambios de idioma dentro de la sesión**: Si el usuario cambia de idioma a mitad de conversación, cámbialo tú también en la siguiente respuesta. **No preguntes ni comentes el cambio.**
- **Mensajes ambiguos**: Si el primer mensaje es ambiguo ("Hi" o "Hola" sin más contexto), responde en el mismo idioma de ese saludo.

### Reglas de consistencia

- **Una respuesta = un idioma**: Una respuesta completa se da enteramente en un solo idioma. **Nunca mezcles español e inglés en la misma respuesta**, salvo para citar términos técnicos oficiales que solo existen en un idioma (ejemplo: "Site Evaluator" en EEUU queda en inglés, con traducción entre paréntesis la primera vez).

### Términos normativos bilingües

Mantén estos términos en su idioma original, con traducción la primera vez:

- `CTE DB-HS 5` → en español queda igual; en inglés: "CTE DB-HS 5 (Spanish Technical Building Code)"
- `perc test` → en inglés queda igual; en español: "perc test (prueba de percolación)"

### Contenido dinámico por idioma

Las siguientes secciones se entregan **siempre en el idioma activo de la conversación**:

- Opciones de perfil (propietario, profesional, contratista, explorando)
- Sub-puntos de guías de diagnóstico
- Explicaciones contextuales
- Cualquier explicación sobre sistemas sépticos

### Cambios explícitos de idioma

Si el usuario dice "respóndeme en inglés" o "answer in Spanish", cambia inmediatamente y mantén ese idioma hasta que indique lo contrario.

---

## 4. Flujo de Detección de Perfil

Al primer contacto, identifica el perfil del usuario mediante preguntas naturales:

- **Propietario**: Casa propia, responsable del mantenimiento, busca información práctica.
- **Profesional**: Inspector, diseñador, ingeniero, conocimiento técnico.
- **Contratista**: Instalador, mantenedor, experiencia en campo.
- **Explorando**: Investiga, compara opciones, no tiene decisión aún.

Guarda el perfil detectado en memoria para futuras referencias en la sesión.

---

## 5. Implementación Técnica — Auto-detección

La auto-detección de sub-escenarios se implementa con:

- **Archivo**: `src/lib/agent/subscenario-detector.ts`
- **Función**: `detectSubscenario(userMessage: string)` → `{subscenario, confidence, detectedKeywords}`
- **Inyección**: En `app/api/agent/route.ts` POST
- **Umbral**: Confianza > 50% para activar detección
- **Idiomas**: Español e inglés (palabras clave combinadas)

**Flujo**:
1. Mensaje del usuario llega a `/api/agent`
2. Se detecta el sub-escenario si `userProfile === "owner"` y no hay uno previo
3. Si se detecta con confianza > 50%, se inyecta como contexto al agente
4. El agente NO pregunta por el sub-escenario; procede directamente a orientación

---

## 6. Configuración Técnica

- **Modelo de inferencia**: Groq (llama-3.3-70b-versatile) para rapidez
- **Respuestas**: Breves, concretas, sin explicaciones innecesarias a menos que se solicite
- **API Key Groq**: Almacenada en variables de entorno
- **Framework**: Next.js 15 con React

---

## 7. Roadmap de Desarrollo — Fases de Mejora Técnica

Estas fases aplican al módulo de cálculo SITARD (fosa séptica + campo de infiltración), no al comportamiento conversacional del agente.

### Estado

| Fase | Descripción | Estado | Fecha |
|------|-------------|--------|-------|
| 0 | Corrección normativa crítica | ✅ Completada | 2026-05-23 |
| 1 | Completar el cálculo básico | ✅ Completada | 2026-05-24 |
| 2 | UI geoespacial — formulario de campo | ✅ Completada | 2026-05-25 |
| 3 | Campo de drenaje mejorado | ✅ Completada | 2026-05-25 |
| 4 | Informe PDF profesional | ✅ Completada | 2026-05-25 |
| 5 | Calculadora de mantenimiento | ✅ Completada | 2026-05-25 |
| 6 | Geolocalización real (Leaflet + Open-Meteo) | ✅ Completada | 2026-05-25 |

---

### Fase 0 — Corrección normativa crítica ✅

**Qué se corrigió:**
- Norma principal: RAS 2000 Título E → **Resolución 0330/2017** (Art. 134–145)
- Añadida Resolución 0631/2015 como criterio de efluentes
- Añadido Decreto 1076/2015 como marco de permiso ambiental
- Corregido error en "Próximos pasos": "concepto favorable PSMV" → "permiso de vertimientos ante SDA/CAR" (el PSMV es instrumento municipal, NO del usuario)
- Añadida nota POT Bogotá (Decreto 555/2021): SITARD solo aplica en suelo rural/suburbano

**Archivos creados/modificados:**
- `src/lib/config/regulatory_framework.ts` — jerarquía normativa completa con trazabilidad por artículo
- `src/lib/config/normativeRegistry.ts` — mínimos CTE/RAS actualizados
- `app/api/agent/route.ts` — system prompt corregido

---

### Fase 1 — Completar el cálculo básico ✅

**Qué se corrigió/añadió:**
- **V_N (natas)**: `0.7 × V_S` en vez del erróneo `0.25 × V_L` → +525 L para caso ejemplo
- **Intervalo limpieza**: default 3 años (era 1 año hardcodeado — bug crítico) → triplica V_S
- **Coeficiente retorno**: Cr = 0.85 (era 1.00 — sobreestimaba caudal)
- **Suite de caudales**: Q_med, Q_max_diario (K1=1.3), Q_max_horario (K1×K2), Q_min (0.30×Q_med)
- **TRH verificado a Q_max_horario**
- **Corrección por temperatura (Van't Hoff)**: θ = 1.07^(T–25); Bogotá T≈14–16°C → TRH mín. 2.0 días
- **Verificaciones geoespaciales**: pozos ≥30 m, cuerpos de agua ≥30 m, edificaciones ≥5 m, árboles ≥3 m, N.F. clearance ≥1.20 m

**Archivos creados/modificados:**
- `src/lib/calculations/septicTank.ts` — reescritura completa
- `src/lib/validation/geospatialValidator.ts` — nuevo: OK/ALERTA/BLOQUEANTE + alternativas tecnológicas
- `src/lib/validation/cteValidator.ts` — integra verificaciones geoespaciales
- `src/lib/agent/tools/calculateSepticTank.ts` — nuevos parámetros: Cr, T_agua, intervalo_limpieza
- `src/lib/agent/tools/validateAgainstCte.ts` — nuevo bloque `geoespacial` en el schema del tool
- `src/lib/reports/generatePdfReport.ts` — sección de caudales, desglose de volúmenes, sección geoespacial

**Impacto en caso ejemplo** (5 pers., Bogotá, Cr=0.85, T=15°C, 3 años limpieza):
- V_diseño: 1,500 L → 2,975 L (+98 %)
- Q_med: 1,000 → 850 L/día; Q_max_h: 2,210 L/día

---

### Fase 2 — UI Geoespacial (Formulario de campo)

**Objetivo:** Conectar el backend `validateGeospatialConstraints()` con el formulario de la calculadora para que el usuario pueda ingresar datos de campo y ver los resultados en pantalla.

**Qué se debe implementar:**

1. **Campos nuevos en el formulario** (`src/app/calculators/fosa-septica/` o el componente de formulario activo):
   - Distancia a pozos de abastecimiento (m)
   - Distancia a cuerpos de agua / ronda hídrica (m)
   - Distancia a edificaciones y linderos (m)
   - Distancia a árboles de raíz profunda (m)
   - Posición respecto a captaciones (checkbox: "aguas abajo de todas las captaciones")
   - Nivel freático medido (m desde la superficie)
   - Profundidad de instalación de zanjas (m, default 0.75)

2. **Sección de resultados geoespaciales** en el UI:
   - Tarjeta por cada parámetro con badge OK (verde) / ALERTA (amarillo) / BLOQUEANTE (rojo)
   - Descripción del problema y sugerencia si no es OK
   - Bloque "Alternativas tecnológicas" si N.F. alto (<1.5 m)

3. **Integración con el agente**: los campos geoespaciales deben incluirse en el context que el agente recibe al llamar `validate_against_cte`

**Archivos a modificar:**
- Formulario principal de la calculadora (identificar ruta exacta antes de empezar)
- `app/api/agent/route.ts` si se necesita pasar el contexto geoespacial

---

### Fase 3 — Campo de drenaje mejorado

**Objetivo:** Hacer el dimensionamiento del campo de infiltración más preciso y profesional.

**Qué se debe implementar:**

1. **Prueba de percolación (perc test)**:
   - Input: tiempo de descenso de 25 mm (minutos)
   - Cálculo: tasa de percolación T_perc (min/cm) y conversión a Ka (L/m²·día) con la tabla de Crites & Tchobanoglous
   - Si no hay perc test, mantener tabla de Ka por tipo de suelo como fallback

2. **Corrección por evapotranspiración** (climas fríos de altura):
   - Para Bogotá y altiplanos: reducción de Ka efectiva del 10–15 % en temporada seca
   - Parámetro opcional: ETP_media_mm_dia

3. **Tipos alternativos de campo**:
   - Zanja filtrante (actual)
   - Montículo filtrante (mound) — para N.F. alto o suelo poco permeable
   - Cámara de infiltración (chamber system)
   - Campo de aspersión (solo en zonas permitidas)

4. **Factor de seguridad configurable**:
   - Default: FS = 1.20
   - Rango: 1.10–1.50 con justificación normativa

**Archivos a modificar:**
- `src/lib/calculations/drainageField.ts`
- `src/lib/agent/tools/calculateDrainageField.ts`
- Formulario del campo de drenaje en el UI

---

### Fase 4 — Informe PDF profesional

**Objetivo:** Elevar el informe a nivel de memoria técnica firmable por ingeniero.

**Qué se debe implementar:**

1. **Portada**:
   - Logo HydroStack + datos del proyecto (nombre, dirección, propietario, profesional responsable)
   - Número de memoria y fecha
   - Disclaimer de carácter orientativo vs. definitivo

2. **Sección normativa** (ya parcialmente en PDF):
   - Jerarquía normativa aplicada con artículos citados
   - Tabla de criterios de diseño usados con fuente normativa

3. **Sección de verificación de cumplimiento**:
   - Checklist visual CTE/RES-0330 con ✓/✗ por cada requisito
   - Bloque de verificaciones geoespaciales (añadido en Fase 1, mejorar presentación)

4. **Sección de próximos pasos** (personalizada por país/ciudad):
   - Colombia: permiso de vertimientos (SDA/CAR), estudio de suelo, ingeniero matriculado
   - España: CTE DB-HS 5, licencia de obra, confederación hidrográfica

5. **Área de firma** al final:
   - Nombre, matrícula profesional, firma, fecha

6. **Mejoras visuales**:
   - Headers/footers consistentes en todas las páginas
   - Tabla de contenido
   - Numeración de secciones alineada con PDFKit `doc.page`

**Archivos a modificar:**
- `src/lib/reports/generatePdfReport.ts` — secciones nuevas
- `app/api/generate-pdf/route.ts` o similar — verificar que acepta datos del profesional

---

### Fase 5 — Calculadora de mantenimiento

**Objetivo:** Ayudar al propietario/operador a planificar el mantenimiento del sistema una vez instalado.

**Qué se debe implementar:**

1. **Cronograma de limpieza de lodos**:
   - Input: fecha de instalación, intervalo de limpieza (años), número de personas
   - Output: próximas fechas de vaciado con alarma visual

2. **Checklist de inspección**:
   - Verificación de tapas, ventilación, efluente, olores, nivel de lodos
   - Exportable a PDF

3. **Registro de eventos**:
   - Fecha de limpieza, contratista, observaciones
   - Historial de la vida del sistema

4. **Alerta de colmatación**:
   - Basada en años de operación y tipo de suelo
   - Señal visual cuando el campo puede estar próximo a saturarse (típico: 15–25 años)

**Archivos nuevos:**
- `src/lib/calculations/maintenance.ts`
- `src/app/calculators/mantenimiento/page.jsx` (nueva ruta)
- Componente de cronograma y checklist

---

## Notas Finales

Estas instrucciones son **obligatorias** y definen el comportamiento del agente. Cualquier cambio debe documentarse aquí y actualizarse en memoria.

Última actualización: 2026-05-25
- **Auto-detección de sub-escenarios**: Agregada en fase 1 de mejoras de propietarios (2026-05-18)
- **Fase 0 — Corrección normativa**: Completada (2026-05-23)
- **Fase 1 — Cálculo básico**: Completada (2026-05-25)
- **Fase 3 — Campo de drenaje mejorado**: Completada (2026-05-25)
- **Fase 4 — Informe PDF profesional**: Completada (2026-05-25)
  - Header/footer en cada página (pageAdded event)
  - Portada expandida: propietario, matrícula, N° memoria, disclaimer
  - Tabla de contenido en portada
  - Sección 1: Marco normativo con jerarquía y tabla de criterios
  - Sección 4: Checklist visual ✓/✗ por requisito (Res. 0330/2017)
  - Numeración de secciones corregida y consistente (1–8)
  - Sección 8: Área de firma con nombre, matrícula, propietario, fecha
  - Tool: nuevos campos proyecto.propietario, .matricula, .numero_memoria
  - Perc test ASTM D6391 (25 mm descent) → Ka vía Crites & Tchobanoglous
- **Fase 2 — UI Geoespacial**: Completada (2026-05-25)
  - Los inputs ya estaban en el formulario; `runGeoCalc()` y tab "Site Checks" ya implementados
  - Integración con agente: `FormState` extendido con 9 campos geoespaciales
  - `saveFormState()` guarda distancias, N.F., posición vs. captaciones y resultado del geo-check
  - `app/api/agent/route.ts` inyecta sección "Site conditions" en el contexto del agente al chatear
- **Fase 5 — Calculadora de mantenimiento**: Completada (2026-05-25)
  - `src/lib/calculations/maintenance.ts`: funciones puras de cálculo (pumping schedule, clogging risk, inspection checklist)
  - `src/components/MaintenanceCalculator.jsx`: UI 4 tabs (Cronograma, Checklist, Registro, Colmatación)
  - `app/calculators/mantenimiento/page.jsx`: nueva ruta `/calculators/mantenimiento`
  - Card añadida en `/calculators` (grid), i18n ES+EN añadido
  - Persistencia de eventos en localStorage clave `hs_maint_events`
  - Corrección ETP para altiplanos fríos (hasta −20% Ka)
  - Factor de seguridad FS configurable (1.10–1.50, default 1.20)
  - 6 tipos de sistema: zanjas, lecho, pozo, montículo, cámara, aspersión
  - UI: toggle min/cm vs 25mm, sección Drainage Field Design, resultados detallados
