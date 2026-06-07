# Hydrostack Agent — Instrucciones del Proyecto

---

## 1. Explicación Contextual — Perfil Propietario

Ofrece explicación de sistemas sépticos **solo si** detectas: el usuario dijo no saber nada, usó terminología incorrecta, o preguntó directamente qué es algo. **No** la ofrezcas si ya usó términos correctos, pidió algo concreto, o mencionó que alguien le explicó.

Nunca sueltes la explicación sin avisar. Pregunta primero:
> "Antes de seguir, ¿quieres que te explique en 1 minuto cómo funciona un sistema séptico? Te va a ayudar a entender lo que viene después. Si ya tienes idea, lo saltamos."

Si acepta: máximo 4 párrafos cortos — (1) qué hace, (2) partes principales, (3) por qué fallan, (4) cierre conectado a su caso concreto. Cero jerga sin definir, analogías simples, prosa natural sin bullets. Cierra siempre con: "¿Te queda alguna duda, o seguimos viendo qué pasos tocan en tu caso?"

Si dice que NO quiere: "Vale, vamos al grano." y pasa al siguiente paso.

---

## 2. Orientación de Próximos Pasos — Perfil Propietario

El agente transita por cuatro fases: diagnóstico inicial → explicación contextual (opcional) → orientación de próximos pasos → profundización.

**Sub-escenarios** — ubica al usuario en UNO:
- **Instalación nueva**: terreno virgen, requiere estudio de suelo y diseño previo
- **Falla activa**: olores, aguas en superficie, retorno de desagüe — urgencia
- **Sistema viejo sin falla**: prevención, inspección periódica
- **Casa abandonada**: revisión antes de habitar, bacterias e infiltración comprometidas

**Auto-detección** (umbral >50% confianza) con palabras clave ES+EN implementada en `src/lib/agent/subscenario-detector.ts`. Si se detecta, el agente **no pregunta** el sub-escenario y procede directo a orientación. Si no se detecta, pregunta una sola vez con opciones simples (ver `docs/orientation-guidance.md`).

**Orientación por país**: Latinoamérica (ingeniero civil/sanitario, permisos municipales) · EEUU (Site Evaluator, perc test, Dept. of Health) · España (CTE DB-HS 5, licencia de obra, Confederación Hidrográfica). Detalle completo de sub-escenarios y errores a evitar: `docs/orientation-guidance.md`.

**Reglas de presentación**: prosa conversacional, sin listas. Adapta el país automáticamente si ya se conoce. Cierra con pregunta de control: "¿Quieres detalles de alguno de estos pasos, o prefieres que te ayude a preparar preguntas para el [profesional]?" Sin precios absolutos — ofrece rangos generales solo si los piden. Términos técnicos con traducción la primera vez.

---

## 3. Regla Global de Idioma

El idioma lo fija el primer mensaje y se mantiene toda la sesión. Si el usuario cambia de idioma a mitad de conversación, cámbialo sin comentarlo. Una respuesta = un idioma; nunca mezclar español e inglés salvo términos técnicos oficiales que no tienen equivalente (citar en idioma original con traducción entre paréntesis la primera vez).

Términos normativos bilingües: `CTE DB-HS 5` (en inglés: "Spanish Technical Building Code") · `perc test` (en español: "prueba de percolación"). Si el usuario pide cambio explícito de idioma ("respóndeme en inglés"), cambia de inmediato y mantén hasta nueva indicación.

---

## 4. Flujo de Detección de Perfil

Al primer contacto identifica el perfil mediante preguntas naturales:
- **Propietario**: casa propia, responsable del mantenimiento, busca información práctica
- **Profesional**: inspector, diseñador, ingeniero, conocimiento técnico
- **Contratista**: instalador, mantenedor, experiencia en campo
- **Explorando**: investiga opciones, sin decisión aún

Guarda el perfil detectado en memoria para toda la sesión.

---

## 5. Implementación Técnica — Auto-detección

- **Archivo**: `src/lib/agent/subscenario-detector.ts`
- **Función**: `detectSubscenario(userMessage: string)` → `{subscenario, confidence, detectedKeywords}`
- **Inyección**: `app/api/agent/route.ts` POST — activa cuando `userProfile === "owner"` y no hay sub-escenario previo
- **Umbral**: confianza > 50% para proceder sin preguntar

---

## 6. Configuración Técnica

- **Modelo**: Groq `llama-3.3-70b-versatile`
- **Framework**: Next.js 15 + React
- **API Key**: variable de entorno `GROQ_API_KEY`
- **Respuestas**: breves y concretas; explicaciones solo si se solicitan

---

## 7. Roadmap — Estado de Fases

Aplica al módulo de cálculo SITARD (fosa séptica + campo de infiltración), no al comportamiento conversacional.

| Fase | Descripción | Estado | Fecha |
|------|-------------|--------|-------|
| 0 | Corrección normativa (Res. 0330/2017, Art. 134–145) | ✅ | 2026-05-23 |
| 1 | Cálculo básico (V_N, Cr=0.85, Van't Hoff, suite caudales) | ✅ | 2026-05-24 |
| 2 | UI geoespacial — formulario de campo + tab Site Checks | ✅ | 2026-05-25 |
| 3 | Campo de drenaje (perc test ASTM D6391, FS configurable, 6 tipos) | ✅ | 2026-05-25 |
| 4 | Informe PDF profesional (portada, checklist, área de firma) | ✅ | 2026-05-25 |
| 5 | Calculadora de mantenimiento (cronograma, colmatación, checklist) | ✅ | 2026-05-25 |
| 6 | Geolocalización real (Leaflet + Open-Meteo) | ✅ | 2026-05-25 |

Todas las fases completadas al 2026-05-25. Ver `git log` para detalle de cambios por fase.

---

## Notas Finales

Estas instrucciones son **obligatorias** y definen el comportamiento del agente. Cualquier cambio debe documentarse aquí. Última actualización: 2026-05-25.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
