# Hydrostack — Instrucciones del Proyecto

HydroStack es una plataforma de inteligencia para contratación pública en
agua y saneamiento sobre SECOP II: exploración de procesos, extracción de
pliegos, perfil de oferente/elegibilidad y alertas. Es el **único producto
activo**. El dominio séptico (calculadoras de fosa séptica, agente
conversacional Hydro_Agent, diagramas 3D) quedó deprecado el 2026-08-08 —
ver [ADR-0002](docs/adr/ADR-0002-deprecacion-dominio-septico.md) y el tag
de git `archive/septic-product-2026-08-08` para su estado previo completo.

---

## 1. Regla Global de Idioma

El idioma lo fija el primer mensaje del usuario y se mantiene toda la
sesión. Si el usuario cambia de idioma a mitad de conversación, cámbialo
sin comentarlo. Una respuesta = un idioma; nunca mezclar español e inglés
salvo términos técnicos oficiales que no tienen equivalente (citar en
idioma original con traducción entre paréntesis la primera vez). Si el
usuario pide cambio explícito de idioma ("respóndeme en inglés"), cambia
de inmediato y mantén hasta nueva indicación.

---

## 2. Dominio del producto

Entidades y flujos principales (ver `AUDITORIA_ARQUITECTONICA_2026-08-08.md`
sección C/D para el detalle completo):

- **Ingesta (ELT)**: SECOP/Socrata → `raw_record` (append-only) →
  transform → entidades canónicas (`proceso`, `contrato`,
  `contrato_evento`, `entidad`, `proveedor`, `geografia`).
- **Clasificación sectorial**: derivada, versionada por
  `clasificadorVersion` (`src/lib/classify/classifier.ts`).
- **Pliegos**: extracción híbrida (reglas + fallback Gemini) —
  `src/lib/pliego/extractPliegoHybrid.ts`, único extractor cableado a
  `/api/pliego/extract`.
- **Oferente / matching**: perfil de oferente (`src/lib/oferente/`) cruzado
  contra oportunidades (`src/lib/matching/`).
- **Alertas**: envío diario idempotente (`src/lib/alertas/`,
  `envio_log` UNIQUE).

## 3. Configuración Técnica

- **Framework**: Next.js 14.2.3 + React 18
- **Base de datos**: Postgres (Neon) vía Drizzle ORM
- **Auth**: Auth.js (NextAuth v5) con Resend (magic link)
- **LLM**: Gemini (extractor de pliegos, `GEMINI_API_KEY`)
- **Diseño**: tokens en `app/globals.css` — `--bg:#FAFAF7`,
  `--accent:#0369A1`

## 4. Seguridad

- Los endpoints `/api/cron/*` exigen `CRON_SECRET` como `Bearer` y fallan
  cerrado (401) si la env var no está definida — ver
  `app/api/cron/{ingest,alertas}/route.ts`.
- No hay RLS en Postgres — la única defensa multi-tenant es el `WHERE
  usuarioId=...` de cada query de aplicación. No asumir que esto está
  resuelto; ver hallazgo F.2 de la auditoría antes de tocar tablas de
  cuentas/oferente.

## 5. Estado del roadmap

Ver `PENDIENTES.md` para pendientes activos y `docs/fase-*/` para el
historial de decisiones de diseño por fase. Para el estado arquitectónico
completo, `AUDITORIA_ARQUITECTONICA_2026-08-08.md` es la referencia vigente
más reciente.

---

## Notas Finales

Estas instrucciones son **obligatorias** y definen el comportamiento del
agente sobre este repositorio. Cualquier cambio debe documentarse aquí.
Última actualización: 2026-08-08.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
