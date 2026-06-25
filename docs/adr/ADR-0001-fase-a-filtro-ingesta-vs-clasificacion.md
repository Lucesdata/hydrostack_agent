# ADR-0001: Fase A — ¿filtrar la ingesta por red sectorial o clasificar el firehose nacional?

**Status:** Accepted
**Date:** 2026-06-24
**Deciders:** Giovanny (owner del proyecto) — sign-off 2026-06-24
**Contexto de spec:** "Ingesta Sectorial Nacional + Gate de Accesibilidad Documental (SECOP II)", Fase A/B.

---

## Context

La spec de ingesta sectorial plantea (B1) ingerir **"solo lo que pasa Fase A"**. La
arquitectura ya construida (decisiones D18/D20 de Fase 0.x) optó por lo contrario:
**ingesta amplia + clasificación recomputable post-ingesta**, para no perder recall y
poder recalcular la pertenencia sectorial sin re-ingerir.

En la primera versión de este plan recomendé "no filtrar, solo clasificar". Antes de
cerrar la decisión medí el volumen real contra Socrata, y los números obligan a
revisar esa recomendación.

### Hechos medidos (2026-06-24, en vivo contra `datos.gov.co`)

| Métrica | Valor |
|---|---|
| Procesos nacionales totales (`p6dx-8zbt`) | **8.726.701** |
| Procesos que matchean la red de agua (solo keywords, nombre+descripción) | **80.081** |
| Proporción sectorial sobre el total nacional | **0,92 %** (ratio ≈ **100:1**) |
| Formato real de `codigo_principal_de_categoria` | `V1.80111500` (prefijo `V1.` confirmado) |
| Valor centinela de UNSPSC | `UNSPECIFIED` (sin código → depende 100 % de keywords) |
| Contratos totales (`jbjy-vk9h`) | `count(1)` excedió el timeout de 60 s (dataset pesado); se asume orden de magnitud similar (millones) |

El dato decisivo es el **100:1**: ingerir 8,7 M de filas nacionales para conservar
~80 K relevantes es un desperdicio de almacenamiento y de coste de transform de dos
órdenes de magnitud, y carga al cron y a Socrata sin beneficio.

### Fuerzas en juego

- **Recall** — no perder procesos del sector mal codificados en UNSPSC (los `UNSPECIFIED`
  solo se pescan por texto).
- **Recomputabilidad (D18/D20)** — poder recalcular `clasificacion_sectorial` sin
  re-ingerir cuando cambien diccionarios/pesos/umbrales.
- **Coste/almacenamiento** — `raw_record` es append-only; cada snapshot nacional se
  guarda para siempre.
- **Cortesía con SECOP/Socrata** — el cron diario no debería barrer 8,7 M de filas.

---

## Decision

Adoptar la **Opción C (híbrida)**: filtrar en la ingesta por una **red sectorial
deliberadamente AMPLIA** (unión de señales: keywords ∪ familias UNSPSC candidatas ∪,
a futuro, allowlist de NIT), y correr el clasificador/score **dentro** de ese universo
para precisión y para la bandera `sector_agua`.

**Regla de diseño que se deriva (invariante):**
> El filtro de ingesta debe ser un **superconjunto** de toda señal que use el
> clasificador. Subir `CLASIFICADOR_VERSION` o recalibrar umbrales debe poder
> recomputarse **sin re-ingesta** sobre el universo ya aterrizado. Solo **ampliar la red
> de ingesta** (p. ej. sumar el padrón SSPD/SUI) requiere un backfill puntual.

Esto preserva la recomputabilidad de D18/D20 *dentro del universo sectorial*, que es lo
único que importa, y descarta el 99 % nacional irrelevante en origen.

---

## Options Considered

### Opción A — Ingesta nacional completa + clasificación post-hoc
(Mi recomendación original, ahora descartada.)

| Dimensión | Evaluación |
|---|---|
| Complejidad | Baja (la ingesta no cambia; ya está construida) |
| Coste/almacenamiento | **Inaceptable** — ~8,7 M filas procesos + millones de contratos en `raw_record` para usar <1 % |
| Recall | Máximo |
| Recomputabilidad | Total |
| Cortesía con Socrata | Mala (barrido nacional diario) |

**Pros:** recall total; recomputabilidad total; cero filtro que mantener.
**Cons:** 100:1 de desperdicio; coste de transform sobre 8,7 M; cron lento; presión sobre Socrata.

### Opción B — Filtro sectorial ESTRECHO en la ingesta (B1 literal de la spec)
Filtrar con el mismo criterio "preciso" del clasificador (solo lo que ya es `sector_agua` alta).

| Dimensión | Evaluación |
|---|---|
| Complejidad | Media (inyectar `$where` en keyset/sweep) |
| Coste/almacenamiento | Mínimo |
| Recall | **Riesgo** — lo que el filtro estrecho no pesca, nunca aterriza |
| Recomputabilidad | **Rota** — recalibrar para subir recall exige re-ingerir |
| Cortesía con Socrata | Buena |

**Pros:** mínimo almacenamiento; cron liviano.
**Cons:** acopla ingesta y clasificación; cada mejora de recall = re-ingesta; viola D18/D20.

### Opción C — Red sectorial AMPLIA en ingesta + clasificación dentro (elegida)

| Dimensión | Evaluación |
|---|---|
| Complejidad | Media (un módulo de "red de ingesta" + `$where` en keyset/sweep) |
| Coste/almacenamiento | Bajo (~80–150 K procesos, ~100x menos que nacional) |
| Recall | Alto *dentro del sector* (la red amplia es superconjunto del clasificador) |
| Recomputabilidad | Preservada dentro del universo ingerido |
| Cortesía con Socrata | Buena |

**Pros:** equilibra los cuatro ejes; recomputación barata; coste sano; respeta D18/D20 con un matiz explícito.
**Cons:** hay que mantener y versionar "la red"; ampliarla obliga a un backfill puntual; el `$where` de keyset se vuelve `(red) AND (cursor)`.

---

## Trade-off Analysis

El eje que decide es el **100:1**. Elimina la Opción A por coste.

Entre B y C la diferencia es **dónde** vive el límite de recall:

- En **B**, el límite de recall lo fija el *query de ingesta* (estrecho) → mejorar recall
  = re-ingerir (caro, rompe D18/D20).
- En **C**, el límite de recall lo fija una *red amplia* (unión de señales), y el
  clasificador solo mueve **precisión** dentro de ese límite → mejorar precisión o
  recalibrar = recomputar sobre lo ya aterrizado (barato). Solo mejorar recall *más allá
  de la red* exige backfill, evento raro y planificable.

C es estrictamente mejor que B en recomputabilidad al mismo coste de almacenamiento, a
cambio de mantener un módulo "red de ingesta" (que de todos modos hace falta para A2).

---

## Consequences

**Se vuelve más fácil:**
- Transform y clasificación corren sobre ~80–150 K filas, no 8,7 M.
- Recomputar `clasificacion_sectorial` (subir versión, recalibrar umbrales A3) es barato.
- El cron diario es liviano y cortés con Socrata.

**Se vuelve más difícil:**
- `buildKeysetPage`/`buildSweepPage` ([pagination.ts](../../src/lib/ingest/pagination.ts))
  deben ANDear el `$where` sectorial con la condición de cursor — hoy el keyset asume que
  el `$where` es solo el cursor.
- Hay que definir y **versionar** la red de ingesta en un único módulo, reutilizado por la
  ingesta (Fase B) y por el clasificador (Fase A) para no divergir.
- Ampliar la red (p. ej. al incorporar el padrón SSPD/SUI como allowlist de NIT) obliga a
  un **backfill** de la ventana histórica.

**A revisitar:**
- Confirmar el volumen real de **contratos** (`jbjy-vk9h`) — el `count(1)` no terminó.
- Si la red amplia + UNSPSC empuja el universo muy por encima de ~150 K, reconsiderar el
  presupuesto de `raw_record`.

---

## Action Items

1. [x] **Sign-off del owner** para mover este ADR a `Accepted` (decisión bloqueante de Fase A/B). — ✅ 2026-06-24
2. [ ] Crear un módulo único `ingest-net` (keywords ∪ familias UNSPSC ∪ allowlist NIT) que
       exponga: (a) el `$where` SoQL para la ingesta, (b) las señales para el clasificador.
       Fuente de verdad compartida con [config.ts](../../src/lib/secop/config.ts) y
       [dictionaries.ts](../../src/lib/classify/dictionaries.ts).
3. [ ] Inyectar el `$where` sectorial en `buildKeysetPage`/`buildSweepPage` (AND con cursor),
       con tests que verifiquen que el cursor sigue siendo correcto bajo el AND.
4. [ ] **Paso 1 (A1)** queda como prerrequisito: deriva las familias UNSPSC que alimentan la
       red de ingesta. La red NO se congela hasta tener A1.
5. [ ] Confirmar `count` de contratos y dimensionar `raw_record`.
6. [ ] Documentar la política **"ampliar la red ⇒ backfill puntual"** en la spec de ingesta
       ([0.2-spec-ingesta.md](../fase-0/0.2-spec-ingesta.md)).

---

## Relación con el plan general

- Confirma la **secuencia**: A1 (derivar UNSPSC) sigue siendo el primer paso — ahora con un
  segundo propósito: poblar la red de ingesta, no solo el clasificador.
- Reescribe **B1**: la ingesta deja de ser "nacional completa"; pasa a "nacional filtrada
  por la red sectorial amplia".
- No afecta **B2/C/D** (eje de acceso documental), que siguen pendientes tal cual.
