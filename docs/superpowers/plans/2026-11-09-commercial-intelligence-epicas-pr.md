# Commercial & Supply Intelligence — Épicas, plan de PR, pruebas y riesgos (entregables 16, 17, 19)

Fecha: 2026-11-09 · Estado: borrador. Flujo CONDUCTA: SPEC → PLAN → TAREAS →
IMPLEMENTACIÓN → PRUEBAS → PR. Cada PR contra `main`, con los cinco checks en
verde. Sin migraciones aplicadas por el agente; las migraciones se prueban con
`npm run local:preparar` y se aplican a la base viva solo con aprobación expresa.

## Épicas

| Épica | Objetivo | Depende de |
|---|---|---|
| E0 Gobierno | Cerrar decisiones D1–D15, acordar con TI | — |
| E1 Taxonomía tecnológica | v1 versionada + clasificador puro | E0 (D14) |
| E2 Viabilidad de evidencia | Medir texto de SECOP (go/no-go B) | E1 |
| E3 Perfil de empresa | Perfil internacional con estados por dato | D1, D13 |
| E4 Contratistas y consorcios | Perfil NIT, representación, integrantes si hay fuente | D3, D10 |
| E5 Necesidades de suministro | Evidencia, estados, suspensión | E2 aprobada |
| E6 Matching comercial | Algoritmo y explicación | E1, E3, E5 |
| E7 Interfaz | Prototipos → pantallas | E3, E6 |
| E8 Seguimiento y alertas | Guardar, seguir, alertas con consentimiento | E6 |
| E9 Market analytics | Paneles con rótulo de origen | datos existentes |
| E10 Seguridad y cumplimiento | Revisión jurídica, auditoría, antiabuso | transversal |
| E11 Piloto Valle del Cauca | Métricas del PRD §14 | E6 |
| E12 RFQ (solo diseño) | Ya cubierto en datos §9 | — |

## Plan de PR (entregable 16)

| PR | Contenido | Toca prod/DB | Gate |
|---|---|---|---|
| CI-00 | Estos 4 documentos | No | Revisión del usuario y de TI |
| CI-01 | `src/lib/tecnologia/`: taxonomía v1 (datos TS), sinónimos, clasificador puro + tests (falsos positivos, negaciones) | No | Aprobación D14; revisión sectorial |
| CI-02 | Spike de viabilidad: script de solo lectura que etiqueta 217 contratos del Valle y mide precisión/cobertura de `objeto`; informe en `docs/` | No (lectura) | **Go/no-go de B (D5)** |
| CI-03 | Plan de datos aprobado + añadir tablas a `docs/sdd/00-esqueleto.md` | No | Revisión arquitectónica con TI |
| CI-04 | Migración + esquema Drizzle (`tec_*`, `empresa_*`, `evidencia`, `necesidad_*`, `representacion_proveedor`, `consorcio_integrante`*, `contrato_cambio`, `seguimiento_comercial`, `auditoria_accion`) con `.enableRLS()`; probada en PGlite/local | **Migración** | Aprobación explícita; medir cuota (D11) |
| CI-05 | Perfil de empresa: servicio, acciones, capacidad en `politica.ts`, tests de aislamiento | Cuenta | Plan aprobado (toca auth/cuentas) |
| CI-06 | Prototipos HTML de las 9 pantallas (sin datos reales) | No | Aprobación visual |
| CI-07 | Línea base `contrato_cambio` (instrumentada por etapa) | Ingesta | Plan aprobado |
| CI-08 | Contratista: perfil NIT, reclamación, verificación, revocación, auditoría | Auth | Compartido con TI (D10) |
| CI-09 | Necesidades: generación por reglas + máquina de estados + suspensión | DB | Resultado CI-02 |
| CI-10 | Matching comercial + explicación + tests | No | Pesos revisados |
| CI-11 | Pantallas: explorador, ficha comercial, radar de suministros (mobile-first) | Rutas públicas/privadas | Aprobación render/ISR |
| CI-12 | Seguimiento y alertas con consentimiento | Correo | Resend operativo, política de datos |
| CI-13 | Market analytics (reuso de agregados) | Consultas | Rendimiento medido |
| CI-14 | Piloto y medición | — | Participantes reales |

\* `consorcio_integrante` solo si D3 encuentra fuente.

Cada PR: una cosa a la vez, sin dependencias nuevas sin decisión del usuario,
pega la salida de `npm test`, `npm run build` (preview parado), `npm run lint`,
`npx prettier --check "src/**/*" "app/**/*"`.

## Estrategia de pruebas (entregable 17)

- **Puras:** clasificador, afinidad, calidad de evidencia, transiciones (tabla de transiciones exhaustiva, incluyendo «IA no puede confirmar»).
- **PGlite con migraciones reales:** unicidad, deduplicación, suspensión, aislamiento por `usuario_id`, RLS activa en todas las tablas nuevas (test que enumera tablas sin RLS).
- **Falsos positivos y negaciones:** corpus etiquetado de textos de `objeto` del Valle; negaciones («no incluye», «sin suministro»); homónimos.
- **Documentos incompletos y contratos cerrados:** necesidad se suspende; ficha dice «sin datos».
- **Privacidad:** ningún `representante_legal`, persona natural ni `actor_id` en respuestas; snapshots de DTO.
- **Seguridad:** acceso por nivel, representación revocada pierde permisos al instante, límites de tasa.
- **Contraste/estado:** colores nuevos medidos en `contraste.test.ts`.
- **E2E local:** `npm run local:recorrido` ampliado con el flujo de perfil → coincidencia.
- **Aceptación del piloto:** métricas del PRD §14.

## Matriz de riesgos (entregable 19)

| Riesgo | Prob. | Impacto | Mitigación | Dueño |
|---|---|---|---|---|
| Texto de SECOP insuficiente para necesidades | Alta | Alto | Spike CI-02; B degradable a descubrimiento | Producto |
| Falsos positivos de necesidad | Media | Alto | Reglas + negaciones + calidad A–D + «Inferida» siempre rotulada | Datos |
| Suplantación de contratista | Media | Alto | Verificación manual + dominio + revocación + auditoría | Seguridad |
| Datos personales (representante, persona natural) | Media | Alto | Excluir, no exponer `raw_attrs`, tests de DTO | Seguridad |
| Duplicar mecanismos con TI | Alta | Medio | D10, `EvidenceRef` común, revisión conjunta | Arquitectura |
| Cuota de base de datos | Media | Medio | Medir (D11); evidencia con texto corto y hash, sin PDFs | Datos |
| Estado SECOP erróneo (H8) | Media | Medio | Regla «Seleccionado + adjudicatario»; métrica en piloto | Datos |
| Términos de reutilización SECOP | Baja/Media | Alto | Revisión legal (D6) antes de monetizar | Legal |
| Conducta anticompetitiva percibida | Baja | Alto | No mostrar ofertas privadas ni sugerir precios | Legal |
| Sin i18n | Alta | Medio | EN mínimo (D13) | Producto |
| Landing sobrecargada | Baja | Medio | Rutas `/comercial/*`; portada intacta | Diseño |

## Lo que queda por verificar antes de código

1. Existencia de un dataset público de integrantes de consorcio (D3).
2. Resultado numérico del spike CI-02.
3. Cuota actual de la base y Storage (D11).
4. Que `npm test`/`build`/`lint` estén en verde en `main` (no se ejecutaron aquí).
5. Aprobación del usuario sobre D1–D15 y acuerdo con TI sobre D10.

## Avance CI-06 (2026-11-09) — prototipos

`docs/commercial-intelligence/prototipos/` (`index.html` + 9 pantallas + `prototipos.css` + `capturas/` en móvil 390 px y escritorio 1280 px). HTML estático con **datos ficticios**, sin tocar rutas, la portada ni el hero; mismos tokens de `app/globals.css`. Verificado en Chromium: sin desbordamiento horizontal a 390 px y a 1280 px; el estado nunca va solo en color (glifo + nombre; rayado para las clasificaciones de AquaLicita); modo oscuro y movimiento reducido respetados. Cada pantalla trae su pregunta de decisión en `index.html`. **Pendiente: aprobación visual del usuario antes de CI-11.** No se probó con lector de pantalla ni se midió el contraste de los chips con las herramientas del repo (los tokens son los medidos de `globals.css`).
