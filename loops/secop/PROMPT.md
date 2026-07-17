# Loop SECOP — Backlog de mejora continua

Eres un agente corriendo en loop sobre el módulo de licitaciones/SECOP de HydroStack.
Cada iteración: (1) lee `loops/secop/PROGRESS.md`, (2) toma LA SIGUIENTE tarea pendiente
del backlog de abajo, (3) impleméntala, (4) verifica, (5) commitea con mensaje
`loop(secop): <qué hiciste>`, (6) marca el avance en PROGRESS.md. Una tarea (o sub-tarea)
por iteración — no intentes todo de una vez.

## Reglas
- No toques nada fuera de `src/lib/{classify,ingest,transform,secop,pliego}`, `src/__tests__`, `scripts/` y `loops/secop/`.
- Todo cambio de lógica lleva test. `npm test` debe quedar en verde antes de commitear.
- Si una tarea requiere `DATABASE_URL` y no está disponible, márcala BLOQUEADA en PROGRESS.md y pasa a la siguiente.
- Si subes `CLASIFICADOR_VERSION`, documenta por qué en el commit (dispara recomputo, D20).
- Si tras 3 intentos una tarea no converge, márcala ATASCADA con diagnóstico y sigue.

## Backlog (en orden)

### T1 — Calibrar el clasificador sectorial
`src/lib/classify/classifier.ts` declara sus umbrales como PROVISIONALES (D17): los cortes
de tier nunca se calibraron contra muestra etiquetada. Pasos:
1. Crea `src/__tests__/classify/golden-sample.ts`: 60+ casos etiquetados a mano
   (usa registros reales de `samples/` o payloads representativos: acueducto, PTAP,
   alcantarillado como positivos; vías, salud, educación como negativos difíciles —
   incluye trampas tipo "acueducto" en nombre de entidad pero objeto de vías).
2. Crea `scripts/eval-classifier.ts`: corre el golden sample, reporta precisión/recall
   por tier y lista falsos positivos/negativos con su `match_reason`.
3. Itera sobre `dictionaries.ts` y los `weights`/`thresholds` inyectables hasta:
   precisión tier alta ≥ 0.95, recall global ≥ 0.85.
4. **Hecho** = eval pasa umbrales + test que fija el golden sample como regresión.

### T2 — Cerrar hallazgos de la auditoría de proveedores (Fase 0.6 E1)
`scripts/audit-proveedores-0.6.output.txt` dejó hallazgos abiertos:
1. R1.2: patrones `CONSORCIO *` y `UNION TEMPORAL *` llegaron a `proveedor_raw`.
   Decide si son centinela legítimo; si no, amplía `SENTINELS` en normalize.ts con
   patrón genérico (no strings literales) + tests.
2. R1.3: 126 proveedores con `tipo_documento='CC'` y `length(nit_canonico)>=9`.
   Revisa `normalizeTipoDoc` en nit.ts: propone regla (9+ dígitos con DV válido → NIT)
   + tests con los casos del output.
3. **Hecho** = tests en verde. Si hay `DATABASE_URL`, re-corre
   `npm run db:audit-proveedores` y confirma que R1.2/R1.3 quedan limpios.

### T3 — Validador de coherencia de pliegos (MVP)
`docs/secop/uaesp-4182-2026/lagunas.md` documenta 4 inconsistencias reales confirmadas
y dice explícitamente que son material para un "validador de coherencia del pliego".
1. Crea `src/lib/pliego/coherence.ts`: función pura `checkCoherence(extraction)` que
   recibe el JSON de `extractPliego` y devuelve hallazgos `{tipo, severidad, evidencia}`.
2. Implementa UN check por iteración, en este orden: (a) numeraciones de ítems
   inconsistentes entre secciones, (b) listas de sitios/ubicaciones con cardinalidad
   distinta, (c) puntajes que no suman 100, (d) términos de plantilla ajena al tipo
   de contrato (ej. "por metro cúbico" en consultoría).
3. **Hecho** = los 4 checks detectan las 4 lagunas usando
   `docs/secop/uaesp-4182-2026/extraction.json` como fixture de test.

### T4 — Cobertura de rutas API secop
`app/api/secop/**` y `app/api/cron/ingest` tienen poca cobertura directa.
Agrega tests de contrato (parseo de params, shape de respuesta, degradación sin BD).
**Hecho** = cada route handler tiene al menos 3 tests y `npm test` en verde.

## Verificación global (cada iteración, antes de commitear)
```bash
npm test && npx tsc --noEmit
```
