# Plan — vista por municipios

**Estado: plan, sin ejecutar (2026-09-26).** Es el punto 12 de la lista de
mejoras de la portada. Se decidió escribir el plan antes de tocar datos: el
trabajo cambia la base de producción y no se puede medir desde un entorno sin
`DATABASE_URL`. Nada de lo que sigue está hecho.

---

## 1. Por qué está bloqueado hoy

| Pieza | Hoy | Lo que pide la vista municipal |
|---|---|---|
| `geografia` | 33 departamentos + unos 60 municipios (62 medidos en la base el 2026-09-15; `data/dane/divipola.ts` tiene hoy 98 entradas con municipio) | los ~1.122 municipios del DIVIPOLA |
| `geografia_alias` | una fila por **nombre** (`texto_normalizado` UNIQUE) | nombre **+ departamento** (ver §2) |
| Geometría | `data/geo/departamentos.geo.json`, 33 polígonos, 33 kB | polígonos municipales |
| Procesos resueltos a municipio | los que caen en esos ~60 | todos los que traen `ciudad_entidad` |

Lo que no se resuelve a municipio **no se pierde**: `GeoResolver.resolve()`
(`src/lib/transform/writers.ts`) cae al departamento (`DD000`). Por eso el mapa
departamental funciona y el municipal no.

---

## 2. El obstáculo que no estaba anotado: los homónimos

`GeoResolver` busca el municipio **solo por su nombre**, y `geografia_alias`
tiene `texto_normalizado` como UNIQUE. Con 60 municipios no chocaba. Con el
DIVIPOLA completo, sí: en Colombia hay nombres repetidos entre departamentos
(La Unión, San Pedro, Villanueva, Buenavista, Albania, Sucre, Santa Bárbara…).
Con la llave actual, **el segundo que se cargue pisa al primero**, y los
procesos de uno se pintarían en el otro sin ningún error.

Consecuencia: antes de cargar nada hay que cambiar la llave del alias a
`(departamento_codigo, texto_normalizado)` y que `resolve()` busque el
municipio **dentro del departamento** que ya resolvió. Es una migración de
esquema (`drizzle/00xx`) más un cambio en el transform. Las pistas ya existen:
`GeoHints` trae `departamento` y `municipio` por separado
(`src/lib/transform/mapCanonical.ts`).

---

## 3. Lo que dice (y no dice) el dato

Antes de dibujar hay que tener claro qué se pinta. La geografía del proceso es
**la de la entidad contratante**: los procesos no traen una localización propia
(`src/lib/transform/orchestrator.ts`, al resolver la geografía), y el mapa ya lo dice ("Según ubicación de
la entidad contratante"). A nivel de departamento eso casi coincide con la
obra. A nivel municipal no:

- Una **gobernación** tiene sede en la capital y contrata obras en todo el
  departamento. En el mapa municipal, todo eso se pintaría en la capital.
- Lo mismo pasa con las empresas departamentales de servicios públicos, los
  PDA y las CAR.

El `SPEC-GEOMETRIA-MAPA.md` §1 ya lo advertía: a nivel municipal "no son un
mapa, son un artefacto de dónde está la sede de quien contrata". **Esto hay que
medirlo antes de construir la vista** (§5, paso 3). Si la capital concentra la
mayoría de los procesos de su departamento, la vista municipal no enseña nada
que no enseñe ya el departamental.

---

## 4. Dónde viviría: no en la portada

La portada tiene presupuesto (`npm run presupuesto`: 125 kB de JS de primera
carga) y el SVG se paga dos veces, en el HTML y en el payload RSC
(`data/geo/README.md`). Los 33 departamentos ya se tuvieron que simplificar de
3.740 a 1.973 coordenadas para caber. Unos 1.122 municipios no caben ahí a
ninguna simplificación que siga siendo un mapa.

Propuesta: **un mapa municipal por departamento**, en la faceta
`/licitaciones/departamento/[slug]`. Serían unos 34 municipios de media por
página (125 en Antioquia), servidos como SVG de servidor igual que el
departamental. La portada no cambia.

---

## 5. Pasos, en orden

Cada paso se puede parar sin dejar nada roto.

1. **Crosswalk completo.** Generar `data/dane/divipola-completo.ts` (o un JSON)
   desde el DIVIPOLA vigente del DANE, con su procedencia documentada como en
   `data/geo/README.md`. Test: 1.122 ± el número oficial y ningún código
   repetido. *No toca la base.*
2. **Llave del alias con departamento** (§2). Migración + `GeoResolver`
   buscando `departamento → municipio`. Test con homónimos reales. La tabla
   nueva o modificada nace con `.enableRLS()`.
3. **Medir antes de dibujar**, en una copia o en solo lectura sobre la base
   viva:
   - qué parte de los procesos abiertos trae `ciudad_entidad` resoluble;
   - por departamento, qué parte cae en la capital (§3).
   Si la capital se lleva casi todo, **el plan se para aquí** y se anota por
   qué.
4. **Siembra y re-resolución** en la base viva: `db:seed-geografia` con el
   crosswalk completo y un backfill de `geografia_id` sobre `proceso`,
   `entidad` y `contrato`. Idempotente, por lotes y con conteos antes y
   después, igual que `db:tipo-proyecto`. **Lo corre el dueño de la base**:
   desde aquí no hay `DATABASE_URL`.
5. **Geometría municipal** del MGN 2025 (mismo servicio del DANE, capa de
   municipio), simplificada con mapshaper como la departamental y **partida por
   departamento** (`data/geo/municipios/DD.geo.json`). Con su test de contrato
   y un tope de peso por archivo.
6. **La vista.** Coropleta municipal en la faceta de departamento, con los
   mismos escalones fijos que el mapa del país (`src/lib/mapa/escala.ts`),
   rayado para "sin procesos" y la misma nota sobre la ubicación de la entidad.

---

## 6. Lo que se necesita del dueño del proyecto

- Aprobar la migración del paso 2: cambia una tabla que usa la ingesta diaria.
- Correr los pasos 3 y 4 contra la base viva, o dar acceso para hacerlo.
- Decidir con la medida del paso 3 delante si la vista municipal sigue.
