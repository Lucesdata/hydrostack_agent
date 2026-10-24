# Matriz de datos para ampliar la Ficha Viva (M11–M13) y primer lote

**Fecha:** 2026-10-24 · **Estado:** análisis con mediciones, **sin código ni migración**.
Continúa `2026-10-06-ficha-viva-datos-nuevos.md` (que sigue siendo el QUÉ; esto aporta las
mediciones M11, M12 y M13 que ese spec dejó pendientes) y corrige varias de sus cifras.

## Método y límites

- **Base viva** (`hydrostacks`, Supabase eu-west-1): solo `SELECT`, `EXPLAIN`,
  `pg_stat_statements` y `pgstattuple`. Nada escrito.
- **datos.gov.co** (Socrata): consultas públicas de lectura desde el navegador integrado
  (`$limit`, `count`, `$where … in (…)`). El proxy de este entorno no llega a ese host.
- **Muestras:** 200 procesos y 120 contratos de procesos publicados desde 2026-01-01, de
  nuestra propia base, ordenados por `md5` (reproducible), medidos el 2026-10-24. Son una
  muestra de **un día**; los porcentajes tienen un margen de ±7 puntos (n=120–200) y no
  son estables en el tiempo. Donde se dice «lleno» se entiende «con dato útil» (positivo
  o texto no vacío y distinto de «No definido»).
- Los identificadores de conjunto están verificados con el catálogo de Socrata
  (`api.us.socrata.com`) el mismo día; el spec del 2026-10-06 los llamaba «por verificar».

## M11 — Espacio y crecimiento

| Medida | Valor |
|---|---|
| Base | **334,5 MB** de 500 MB (Free) → 165 MB libres |
| Tablas | `raw_record` 104 MB, `proceso` 94 MB, `contrato` 49 MB, `al_proceso_evento` 26 MB, `al_proceso_estado` 20 MB |
| `raw_record` | 133.552 filas, **0 con payload**; heap de 87,9 MB con **73,5 % libre (64,6 MB)** |
| `proceso` | 93.717 filas, 82 MB de heap, 6,3 % libre |
| Universo 2026 | **15.320** procesos y **5.172** contratos de esos procesos |

**Crecimiento orgánico** (altas por mes de `created_at`/`ingested_at`, sin contar el
llenado inicial de agosto): ≈ 2.000 procesos, ≈ 900 contratos y ≈ 3.000 `raw_record` al
mes. Con ≈ 1,0 KB (proceso), 1,2 KB (contrato) y 0,8 KB (`raw_record`) por fila con
índices, son **≈ 5,5 MB/mes**; con las tablas `al_*` el orden es **6–8 MB/mes**. A ese
ritmo los 165 MB duran **más de 20 meses**.

**El espacio libre de `raw_record` no es una reserva ociosa:** el `payload` se vacía tras
transformar (`vaciarPayloads`) y los huecos los reutilizan los registros nuevos. No hace
falta `VACUUM FULL` por ahora y no conviene contarlo como espacio recuperable.

**Coste estimado de las etapas** (ordenes de magnitud, ±2×, sin índices nuevos de peso):

| Etapa | Filas nuevas / columnas | Tamaño |
|---|---|---|
| A (columnas en `proceso` y `contrato`), solo 2026 | 15.320 + 5.172 filas, ≈ 150 B y 120 B | ≈ 3 MB (≈ 19 MB si fueran las 93.717 y 39.890) |
| B (ubicaciones de ejecución) | ≈ 5.200 contratos × 1,1 ubicaciones | < 1 MB |
| C (modificaciones aprobadas + garantías) | ≈ 12.000 + ≈ 11.000 filas | ≈ 6 MB |

Total de A–C en 2026: **< 15 MB**. Conclusión para **D2**: por espacio **no hace falta
pasar a un plan de pago**; basta R12 («desde 2026»). El riesgo real no es el disco: es la
**CPU compartida** (los timeouts de #155). Una tabla nueva no pesa si no entra en el
camino caliente de la ficha; sí pesaría una consulta nueva sin índice.

## M12 — Esquema real y llave de enlace

| Conjunto | Id verificado | Filas (2026-10-24) | Llave hacia nosotros |
|---|---|---|---|
| Procesos | `p6dx-8zbt` | ya ingerido | `id_del_proceso` = `proceso.secop_proceso_id` (200/200 encontrados) |
| Contratos | `jbjy-vk9h` | ya ingerido | `id_contrato` = `contrato.secop_contrato_id` (118/120 encontrados) |
| Ubicaciones de ejecución | `gra4-pcp2` (el `5p2a-fyvn` «Vista» devolvió vacío) | 6.428.420 | `id_contrato`; trae `proceso_de_compra` = `CO1.BDOS.n` |
| Modificaciones a contratos | `u8cx-r425` | — | `id_contrato` |
| Garantías | `gjp9-cutm` | — | `id_contrato` |
| PAA detalle / encabezado | `9sue-ezhx` / `b6m4-qgqv` | — | **sin llave directa**: `procesos_relacionados`, `url_proceso`, `id_plan_anual_de_adquisiciones` (por entidad y año) |
| Archivos de descarga | `dmgg-8hin` (2026) y uno por año | — | `proceso`, `n_mero_de_contrato`; **un id distinto por año** |
| Ejecución de contratos | `mfmm-jqmq` | — | `identificadorcontrato` |

**Hallazgo de enlace:** `proceso.portafolio_id` (`CO1.BDOS.n`) existe en los 15.320
procesos de 2026, pero **no es único por proceso** (en la muestra, varios `CO1.REQ`
comparten el mismo `BDOS`). Enlazar por portafolio atribuiría datos de un contrato a
varios procesos. **La llave correcta es siempre `id_contrato`.**

## M13 — Cobertura en agua, 2026 (muestras de §«Método»)

| Campo | Cobertura | Lectura |
|---|---|---|
| `duracion` > 0 / `unidad_de_duracion` | **89 %** / 100 % (día, mes, semana, año) | utilizable; 11 % es «sin dato», no «0 meses» |
| `respuestas_al_procedimiento`, `proveedores_unicos_con` > 0 | **27 %** | solo tiene sentido con ofertas ya recibidas; en abiertos 0 ≠ «sin ofertas» |
| `proveedores_invitados` > 0 | 10 % | sin valor para la ficha |
| `numero_de_lotes` > 1 | 2 % | no justifica el campo |
| `justificaci_n_modalidad_de`, `nombre_de_la_unidad_de` | 100 % texto | texto libre de la entidad; decidir si se muestra |
| `fecha_de_apertura_efectiva` | **no existe con ese nombre** en `p6dx-8zbt` | el spec del 2026-10-06 se equivocó o lo renombraron; descartar hasta verificarlo |
| `origen_de_los_recursos` / `destino_gasto` | 100 % / 96 % («Distribuido», «Recursos Propios»; «Inversión», «Funcionamiento») | utilizable |
| Fuentes de recursos > 0 | SGP **27 %**, recursos propios **29 %**, PGN 6 %, crédito 1 %, regalías 0 % | utilizable como «se paga con…» |
| `saldo_cdp` > 0 | **4 %** (5 de 118) | **no sirve para «hay disponibilidad»**: ver C10 |
| `dias_adicionados` > 0 | **14 %** | prórroga explícita en días (hoy se deduce de fechas) |
| `liquidaci_n` | 100 % (Sí/No) | utilizable; `fecha_inicio_liquidacion` no existe con ese nombre |
| `habilita_pago_adelantado` / `valor_de_pago_adelantado` | 0 % positivo | sin caso en agua 2026: descartar |
| `valor_pendiente_de_ejecucion` > 0 | **92 %** | siempre «según el SECOP», nunca avance (R11) |
| Ubicaciones | **120/120** contratos (131 filas: 11 contratos con 2 o más lugares) | cobertura plena, pero **solo para procesos con contrato** |
| Modificaciones | **29 %** de los contratos (35/120) | ver significado abajo |
| Garantías | **38 %** de los contratos (46/120) | todas «Contrato de Seguro» en la muestra |
| Ejecución con avance real | **2,5 %** (3/120) | demasiado raro para mostrarlo |

## Matriz

Leyenda de **cambio**: C = columna nueva, T = tabla nueva (con `.enableRLS()`), H = tocar
`volatileFields` del hash (`src/lib/ingest/sources.ts`).

| Campo | Fuente | Llave | Cobertura | Significado | Privacidad | Cambio | Incertidumbre |
|---|---|---|---|---|---|---|---|
| Duración (+ unidad) | `p6dx-8zbt` | `id_del_proceso` | 89 % | plazo de ejecución como duración | ninguna | C (2 col.) | `0` = sin dato |
| Ofertas recibidas | `p6dx-8zbt` | `id_del_proceso` | 27 % | cuántos oferentes respondieron | agregado, sin nombres | C + **H** | hoy «volátil»: se congelaría en la primera lectura; D3 |
| Justificación de modalidad, unidad contratante | `p6dx-8zbt` | `id_del_proceso` | 100 % | por qué esa modalidad; qué dependencia | texto libre: puede traer nombres (R8) | C | decidir si se muestra o solo se guarda |
| Origen y destino del gasto | `jbjy-vk9h` | `id_contrato` | 96–100 % | de dónde sale el dinero, inversión o funcionamiento | ninguna | C (2 col.) | valores como «Distribuido» necesitan glosario (R7) |
| Fuentes de recursos con valor | `jbjy-vk9h` | `id_contrato` | 1–29 % c/u | «se paga con SGP y recursos propios» | ninguna | C (5 col.) | C9 solo si la suma no cuadra con el valor |
| Días adicionados | `jbjy-vk9h` | `id_contrato` | 14 % | prórroga en días declarada | ninguna | C | complementa, no sustituye, la deducción por fechas |
| Liquidación (Sí/No) | `jbjy-vk9h` | `id_contrato` | 100 % | si el contrato se liquidó | ninguna | C | sin fecha: no se sabe cuándo |
| `valor_pendiente_de_ejecucion` | `jbjy-vk9h` | `id_contrato` | 92 % | saldo por ejecutar según SECOP | ninguna | C + **H** | es volátil: rotular con fecha de lectura; nunca avance |
| Lugar de ejecución | `gra4-pcp2` | `id_contrato` | 100 % de contratos | departamento y municipio de ejecución | ninguna | T (+ mapeo de nombres a DIVIPOLA vía `geografia_alias`) | **no existe para procesos sin contrato** (los del hero, abiertos); varios lugares por contrato; texto con separador `»` |
| Modificaciones aprobadas | `u8cx-r425` | `id_contrato` | 29 % | cambios de valor (`valor_modificacion` > 0) y plazo (`dias_extendidos` > 0) | `proposito_modificacion` es texto libre | T | **casi la mitad de las filas son borradores («En Edición»)**: solo `Aprobado`, `Aceptado por el Proveedor`, `Publicado`; el tipo no viene codificado |
| Garantías | `gjp9-cutm` | `id_contrato` | 38 % | existe póliza, aseguradora, valor, vigencia | `asegurado`/`beneficiario` pueden ser personas: **no ingerir** | T | «sin garantías» no se afirma: 62 % sin filas puede ser dato ausente |
| PAA (línea) | `9sue-ezhx` | sin llave directa | **no medida** | segundo presupuesto (C8) | ninguna | T | enlace por `procesos_relacionados`/URL sin verificar |
| Documentos del proceso | `dmgg-8hin` + uno por año | `proceso` | **no medida** | nombre, tipo y fecha de archivos | nombres de archivo con datos personales posibles | T (solo metadatos) | un conjunto por año; D5 |
| Avance real de ejecución | `mfmm-jqmq` | `identificadorcontrato` | 2,5 % | porcentaje que declara el contratista en su plan | autodeclarado | — | **no se ingiere** (R11 y cobertura) |

## Correcciones al spec del 2026-10-06

1. «Lo que no llega» dejaba los ids «por verificar»: están en la tabla de M12.
2. **C10 («saldo_cdp = 0 → sin disponibilidad») no debe implementarse**: dispararía en el
   96 % de los contratos de agua de 2026. El propio spec lo marcaba «por calibrar»; la
   medición dice que el campo no mide lo que se creía.
3. `fecha_de_apertura_efectiva` y `fecha_inicio_liquidacion` no existen con esos nombres.
4. «El avance físico no lo publica la fuente» es **casi cierto, no cierto**: existe
   `mfmm-jqmq` con avance real, pero cubre el 2,5 % y es autodeclarado. Sigue fuera.
5. «El lugar de ejecución corrige el mapa, el hero y la compuerta de zona»: **solo para
   procesos con contrato**. Los abiertos del hero no tienen lugar de ejecución en la
   fuente hasta que se adjudican. R10 sigue valiendo, con ese alcance.
6. C11/C12 dependen de B y C y no se miden aquí.

## Primer lote propuesto (para decidir en D1)

**Lote 1 — columnas de lo que ya llega** (ningún conjunto nuevo, una sola migración de
columnas, solo desde 2026, R12):

- `duracion` + `unidad_de_duracion`, `origen_de_los_recursos`, `destino_gasto`,
  fuentes de recursos con valor, `dias_adicionados`, `liquidaci_n`.
- **Fuera del lote:** `saldo_cdp`, anticipo, lotes, invitados, `fecha_de_apertura_efectiva`.
- **Con decisión previa:** «ofertas recibidas» (D3) y `valor_pendiente_de_ejecucion`,
  porque exigen sacar el campo de `volatileFields` o guardar la fecha de lectura.
- Se rellena volviendo a pedir a Socrata los **15.320 procesos y 5.172 contratos** de
  2026 (los payloads ya se vaciaron). Coste en disco ≈ 3 MB.

**Lote 2 — lugar de ejecución para procesos con contrato** (tabla nueva): el que más
cambia el producto, pero con la salvedad de arriba y con la regla de varios lugares por
contrato por definir.

**Lote 3 — modificaciones aprobadas**; **no** garantías, PAA ni documentos hasta medir su
cobertura y su enlace.

Cada lote tendrá su spec corta, su plan y su migración, aprobados antes de escribir
código (`docs/CONDUCTA.md` §4). **Nada de esto se aplica en este PR.**

## Decisiones que necesito (D1–D5 con la evidencia)

- **D1:** Lote 1 → 2 → 3, o el lugar de ejecución primero (cambia más el producto pero
  cubre solo contratados).
- **D2:** quedarse en Free con R12 (recomendado por espacio); el límite real es CPU.
- **D3:** «Llegaron N ofertas»: 27 % de cobertura y sin sentido en abiertos; si se hace,
  solo en procesos cerrados a ofertas y con fecha de lectura.
- **D4:** representante legal: seguir sin guardarlo (R8).
- **D5:** documentos: metadatos sin lista hasta medir `dmgg-8hin`.
