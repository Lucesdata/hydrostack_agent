# PLAN — TAL-01 Descubrimiento y MVP informativo
Fecha: 2026-11-09
Estado: borrador técnico para revisión. Este PR solo documenta; no aplica migraciones ni código productivo.

## Hallazgos comprobados de `main`
- `CLAUDE.md`: ELT desde SECOP a `proceso`/`contrato`/`proveedor` y cinco tipos canónicos. Matching de oferente existente.
- `src/lib/secop/etapa.ts`: la fase no equivale a avance físico de obra; contratos sin firma no cuentan como contratados.
- `src/lib/pliego/schema.ts`: esquema de pliego centrado en presupuesto, cronograma y habilitantes; carece de requisitos estructurados de personal.
- `src/lib/pliego/extractPliegoHybrid.ts`: extracción híbrida con Gemini para documento base; su grounding de citas aún necesita verificación robusta.
- `docs/CONDUCTA.md`: spec -> plan -> tareas -> implementar -> validar; nuevas tablas bajo RLS; todas las modificaciones via PR; main despliega producción.
- No se verificó base de datos en vivo, por tanto ninguna cifra de contenido se considera actual.

## Implementación propuesta por PR
### TAL-01 PR documentación (este)
SPEC, taxonomía V0, riesgos, alcance, criterios y plan. No toca producción.
### TAL-02 PR extractor (requiere aprobación)
Diseñar `StaffRequirement` separado del esquema de pliego actual, parser puro + validación de citas y fixtures. Primero medir si acceso documental es suficiente.
### TAL-03 PR datos (requiere aprobación de plan y esquema SDD)
Proponer tablas `staff_requirement`, `staff_evidence` y sus índices/FK exactos tras inspección de `src/lib/db/schema`; migraciones locales y RLS.
### TAL-04 PR UI
Sección informativa en Ficha Viva, con degradación honesta, enlaces oficiales, sin vacantes. Comprobar SEO/ISR/performance.
### TAL-05 PR panel privado
Reclamación/verificación de representante, necesidades internas sin publicación laboral, autorización por petición y logs.
### TAL-06 Piloto
50 expedientes diversos etiquetados, métricas de falsos positivos, entrevistas a empresas, revisión jurídica para decidir TAL-Network.

## Eventos, APIs y privacidad
No se requiere API pública adicional hasta TAL-03. API de lectura solo expone datos de requisitos públicos verificados; escrituras de panel interno requieren claim y usuario autorizado. Jamás publicar datos personales de aspirantes.
Futuros flujos de CV, búsqueda, recomendaciones y remisiones están BLOQUEADOS hasta revisión regulatoria y autorización o aliado habilitado, según corresponda.

## Gate para pasar a código
1. Aprobar SPEC y alcance V0.
2. Auditar esquema Drizzle real y SDD.
3. Confirmar disponibilidad documental de SECOP y licencias.
4. Revisar norma laboral con asesoría local.
5. Registrar plan de migraciones y autorizaciones.
6. Especificar tests y fixtures reales anonimizados.

## Verificación propuesta
`npm test`, `npm run build`, `npm run lint`, `npx prettier --check "src/**/*" "app/**/*"` con entorno local y CI, previo a merge.
Fuentes jurídicas: https://www.serviciodeempleo.gov.co/atencion-a-la-ciudadania/tramite-en-linea/autorizacion/ ; https://cancilleria.gov.co/normograma/compilacion/docs/ley_1636_2013.htm
