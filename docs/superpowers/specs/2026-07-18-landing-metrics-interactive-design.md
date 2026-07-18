# Landing · Métricas interactivas (oportunidad activa + ciclo del proceso)

> Documento de diseño. Depende de la infraestructura Socrata existente
> (`src/lib/secop/client.ts`, `config.ts`) y del patrón de cron ya en producción
> (`app/api/cron/ingest`). No reemplaza `landingStats.ts`/`LandingCards.jsx`
> (las 3 cards actuales) — esto es una sección nueva, `LandingMetrics.jsx`, con
> selector interactivo departamento × sector.

## 0. Problema

La landing necesita dos cifras reales que el usuario pueda filtrar por
departamento y sector (agua/saneamiento) sin disparar queries en vivo a
Socrata en cada interacción — el selector debe leer de una matriz
precalculada. Riesgo a evitar: latencia/rate-limit de Socrata en Vercel Hobby
+ Neon free tier si el filtrado fuera en vivo.

## 1. Hallazgos de la auditoría contra la API real (cambian el alcance)

Antes de diseñar se corrieron queries reales contra `p6dx-8zbt` (Procesos) y
`jbjy-vk9h` (Contratos) en datos.gov.co. Tres hallazgos que invalidaban
supuestos del pedido original:

1. **No existe una taxonomía PTAR/PSMV/acueducto/alcantarillado/ETAP en el
   código.** El único artefacto de "sector" hoy es `KEYWORDS_AGUA`
   ([config.ts](../../../src/lib/secop/config.ts)) — una lista plana de ~13
   keywords para un filtro binario "es agua / no es agua". `SectorialGate`
   (el semáforo de elegibilidad, [verdict.ts](../../../src/lib/secop/verdict.ts))
   no clasifica en sub-sectores: intersecta UNSPSC del perfil del oferente con
   el del proceso, o delega en `clasificacion_sectorial.sector_agua` (tabla
   derivada, boolean, sin desglose y hoy sin poblar). Tampoco hay selector de
   sector en ningún componente. **Decisión (confirmada con el usuario):**
   construir la taxonomía nueva, no reusar nada existente.

2. **"ETAP" es ruido puro en los datos reales.** Se probó `upper(objeto) like
   '%ETAP%'` contra Contratos: 74.018 falsos positivos, todos matcheando la
   palabra "etapa/etapas" (fase de cualquier contrato), cero relacionados con
   plantas de tratamiento. Colombia usa **PTAP** (Planta de Tratamiento de
   Agua Potable) para ese concepto — 1.258 matches limpios verificados a mano.
   **Decisión:** el bucket se muestra con el label `"ETAP"` (como lo pidió el
   usuario) pero sus keywords reales son `PTAP` + variantes largas.

3. **El campo de valor del pedido original no existe para procesos abiertos.**
   El pedido dice "sumar `valor_del_contrato`", pero ese campo solo existe en
   el dataset Contratos (post-adjudicación) — un proceso abierto/en curso no
   tiene contrato todavía. **Decisión:** Métrica 1 usa `precio_base` del
   dataset Procesos, el mismo campo que ya usa `getEnJuegoMes` en
   `landingStats.ts` para la card "$ en juego" existente — es el presupuesto
   oficial disponible antes de adjudicar, consistente con "procesos abiertos".

4. **No hay fecha de adjudicación en el dataset Procesos**, y el join
   Procesos↔Contratos vía `proceso_de_compra` (namespace `CO1.BDOS.*`) contra
   `id_del_proceso` (namespace `CO1.REQ.*`) no coincide — son IDs de sistemas
   distintos. Se probó un join alternativo por
   `referencia_del_proceso`↔`referencia_del_contrato` con 3 casos reales de
   Procesos adjudicados: una referencia devolvió 3 contratos distintos (uno
   con `fecha_de_firma` *anterior* a la publicación del proceso — falso
   positivo por colisión de referencia, no son códigos únicos a nivel país),
   otra devolvió 0 resultados. No es una base confiable para "no inventar
   números". **Decisión (confirmada con el usuario):** la Métrica 2 se
   redefine como **"tiempo de ejecución contractual"** —
   `fecha_de_firma → fecha_de_fin_del_contrato` del dataset Contratos,
   contratos firmados en los últimos 12 meses. Completitud verificada: 15/15
   en muestra real con ambas fechas y `duracion` poblada.

## 2. Arquitectura

```
┌─────────────────────────────┐
│ scripts/generate-landing-    │  tsx, corre a mano o vía cron
│ metrics.ts                   │
│  1. cuenta procesos abiertos │──▶ Socrata p6dx-8zbt (Procesos)
│     por depto (solo deptos   │
│     con actividad real)      │
│  2. por depto × 5 sectores:  │──▶ Socrata p6dx-8zbt (Metrica 1)
│     oportunidad_activa       │──▶ Socrata jbjy-vk9h (Metrica 2)
│     ciclo_proceso            │
│  3. agregado nacional        │
│  4. upsert en Postgres/Neon  │──▶ tabla landing_metrics_cache
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│ GET /api/landing-metrics     │  lee la fila más reciente, cache
│ route.ts                     │  Next revalidate 3600s
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│ LandingMetrics.jsx            │  fetch una vez al montar, selector
│ (client component)            │  depto+sector filtra EN MEMORIA
│                                │  (cero fetch adicional al interactuar)
└─────────────────────────────┘
```

Regeneración: manual (`npm run db:generate-landing-metrics`) o automática vía
`GET /api/cron/landing-metrics`, mismo patrón que `cron/ingest` (CRON_SECRET,
runtime nodejs, `dynamic = "force-dynamic"`). Entrada nueva en `vercel.json`
(`crons` array) — **nota:** Vercel Hobby limita cron jobs (verificar cupo
disponible junto al cron de ingesta ya existente antes de agregar uno nuevo;
si no hay cupo, la regeneración queda solo manual/npm sin bloquear el resto).

## 3. Taxonomía de sectores — `src/lib/secop/sectorKeywords.ts`

Mismo patrón que `KEYWORDS_AGUA`. Un proceso puede matchear **más de un**
bucket (no son mutuamente excluyentes — p. ej. "optimización PTAR
alcantarillado municipal" matchea ambos). El agregado `nacional` del JSON
**no** es la suma de los 5 buckets (se doble-contaría); se calcula aparte con
`buildAguaWhere()` (el filtro amplio ya existente).

```ts
export const SECTOR_KEYWORDS = {
  acueducto: ["acueducto", "agua potable", "abastecimiento de agua",
    "potabilizacion", "captación", "aducción", "red de distribución de agua",
    "micromedición", "macromedición"],
  alcantarillado: ["alcantarillado", "aguas residuales", "agua residual",
    "colector", "interceptor", "emisario", "red de alcantarillado",
    "vertimiento"],
  ptar: ["PTAR", "planta de tratamiento de aguas residuales"],
  psmv: ["PSMV", "plan de saneamiento y manejo de vertimientos"],
  etap: ["PTAP", "planta de tratamiento de agua potable",
    "estación de tratamiento de agua potable"], // label UI: "ETAP"
} as const;

export const SECTOR_LABELS: Record<keyof typeof SECTOR_KEYWORDS, string> = {
  acueducto: "Acueducto", alcantarillado: "Alcantarillado",
  ptar: "PTAR", psmv: "PSMV", etap: "ETAP",
};
```

`buildSectorWhere(sector, field)` genera el mismo tipo de cláusula OR que
`buildAguaWhere()`, parametrizado por el campo (`objeto_del_contrato` en
Contratos, `nombre_del_procedimiento`/`descripci_n_del_procedimiento` en
Procesos).

## 4. Esquema de datos — tabla `landing_metrics_cache`

Nueva tabla en `src/lib/db/schema/landingMetrics.ts` (se agrega el
`export *` a `schema/index.ts`, siguiendo el patrón de las demás):

```ts
export const landingMetricsCache = pgTable('landing_metrics_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  data: jsonb('data').notNull(),          // el JSON completo (§5)
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

Una sola fila vigente (el generador hace `DELETE` + `INSERT`, o
`ORDER BY generated_at DESC LIMIT 1` al leer — más simple que upsert con
constraint única). Migración vía `drizzle-kit generate` + `db:push` (patrón
existente del repo).

## 5. JSON — forma exacta

```jsonc
{
  "fecha_corte": "2026-07-18",
  "combinaciones": [
    {
      "departamento": "Valle del Cauca",
      "sector": "acueducto",
      "oportunidad_activa": { "valor_cop": 450230000000, "n_procesos": 34 },
      "ciclo_proceso": {
        "promedio_dias": 187, "mediana_dias": 152,
        "n_muestra": 41, "muestra_suficiente": true
      }
    }
    // ... una entrada por cada (departamento con actividad real) × (5 sectores)
  ],
  "nacional": {
    "oportunidad_activa": { "valor_cop": 2140000000000, "n_procesos": 512 },
    "ciclo_proceso": { "promedio_dias": 165, "mediana_dias": 140, "n_muestra": 380, "muestra_suficiente": true }
  }
}
```

Combinaciones con `n_procesos: 0` en oportunidad activa se **omiten** del
array (no se listan 33 deptos × 5 sectores a la fuerza, tal como pidió el
usuario) — el front trata "combinación ausente" como cero/sin datos, no como
error.

## 6. Script generador — `scripts/generate-landing-metrics.ts`

Reusa `sodaFetch` y `resolveDatasetId` de `src/lib/secop/client.ts`/
`datasetResolver.ts` — no un cliente nuevo. Pasos:

1. `$select=departamento_entidad, count(*)` agrupado, con el `buildAguaWhere()`
   existente + `estado_de_apertura_del_proceso='Abierto'`, para obtener la
   lista real de departamentos con actividad (evita iterar los 33 a la fuerza).
2. Para cada departamento × 5 sectores: una query de suma+conteo sobre
   Procesos (Métrica 1, agregación server-side vía `$select=sum(...),
   count(*)`, nunca trae filas completas) y una query de fechas sobre
   Contratos filtrada a `fecha_de_firma >= (hoy - 12 meses)` (Métrica 2).
3. Cálculo de promedio/mediana de días en Node (la mediana no es agregable en
   SoQL) — trae solo `fecha_de_firma, fecha_de_fin_del_contrato` de las filas
   matcheadas (con tope de `$limit`, ver §8 rendimiento), no filas completas.
4. Agregado nacional con `buildAguaWhere()` (sin desglose por sector).
5. Upsert en `landing_metrics_cache`.

Best-effort por combinación (como `landingStats.ts`): si una query individual
falla, esa combinación se omite del array (no tumba la corrida completa);
error se loguea con detalle de qué combinación falló.

## 7. `GET /api/landing-metrics`

Lee la fila más reciente de `landing_metrics_cache`, `revalidate: 3600`. Si no
hay fila (primera corrida no se ha ejecutado aún), devuelve `503` con mensaje
claro — el front cae al estado de fallback (§8), nunca inventa datos.

## 8. `LandingMetrics.jsx`

- Un solo `fetch("/api/landing-metrics")` al montar (patrón `useLandingStats`
  ya existente en `LandingCards.jsx`, mismo manejo loading/error/skeleton).
- Selector depto + sector (`<select>`, estilo `clr-select` ya usado en
  `SecopExplorer`), estado inicial = sin filtro → muestra `nacional`.
- Cambiar el selector solo lee del array `combinaciones` ya en memoria (find
  por depto+sector) — cero red.
- Combinación ausente del array (0 procesos) → mostrar "0 procesos abiertos"
  explícitamente, no un placeholder ambiguo.
- Fecha de corte siempre visible: `"Datos SECOP, corte: {fecha_corte
  formateada 'julio 2026'}"`.
- CTA "Ver estos procesos" → `/licitaciones?departamento={dept}&sector={sector}`
  (omite el param si el selector está en "nacional"/sin filtro).

## 9. CTA real (requiere tocar `/licitaciones`)

Hallazgo adicional: `SecopExplorer` hoy **no lee ningún query param al
montar** — ni siquiera `?nuevos=7d`, que `LandingCards.jsx` ya enlaza hoy, es
un link muerto en producción. Y no existe concepto de "sector" en absoluto en
`SecopQuery`/`buildProcesosWhere`.

Para que el nuevo CTA no sea otro link muerto, alcance mínimo necesario:

- `SecopQuery` (`types.ts`) gana `sector?: keyof typeof SECTOR_KEYWORDS`.
- `buildProcesosWhere` (`client.ts`) agrega la cláusula de
  `buildSectorWhere(query.sector, F.nombre/F.descripcion)` cuando viene seteado.
- `SecopExplorer` inicializa `filters` leyendo `useSearchParams()` una vez al
  montar (`departamento`, `sector`) en vez de siempre arrancar vacío.
- No se toca `?nuevos=7d` (fuera de alcance de este trabajo, se deja como
  está).

## 10. Testing

- `sectorKeywords.ts`: test unitario de `buildSectorWhere` (pure, sin red) —
  mismo patrón que `buildProcesosWhere` ya testeado.
- Script generador: no se testea contra Socrata real en CI; se testea la
  función pura de mediana/promedio con arrays fijos.
- `buildProcesosWhere` con `sector` seteado: extiende
  `src/__tests__/secop/` existente.
- Verificación manual en browser (dev server) del selector + CTA, según el
  flujo de verificación estándar del proyecto.

## 11. Fuera de alcance

- Backfill histórico más allá de 12 meses para Métrica 2.
- Automatizar el cron si Vercel Hobby no tiene cupo — queda documentado como
  paso manual (`npm run db:generate-landing-metrics`) sin bloquear el resto.
- Tocar `clasificacion_sectorial` (tabla derivada del pipeline ELT) — este
  trabajo vive enteramente en la capa Socrata-directa, igual que
  `landingStats.ts`, sin dependencia del pipeline canónico.
