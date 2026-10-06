# Ficha Viva: los datos que faltan para no dejar contradicciones sin decir

**Fecha:** 2026-10-06 · **Estado:** spec en borrador. Faltan las mediciones
M11–M13 y las decisiones D1–D5 del usuario. Sin código. · **Flujo:**
`docs/CONDUCTA.md` §4. Esto es el QUÉ; el CÓMO va en un plan aparte cuando el
spec se apruebe.

**Antecede:** `2026-10-05-ficha-viva-ciclo-de-vida.md`, que en «Fuera de
alcance» dejó para un spec propio estos datos: PAA, CDP, garantías, fuentes de
recursos, detalle de las modificaciones, lista de documentos y lugar de
ejecución.

## Por qué

La página del SECOP que trajo el usuario (OPA-ST-07-2023, `CO1.REQ.5354189`)
tiene contradicciones que la ficha de hoy **no puede ver** porque no ingiere el
dato:

| En la página del SECOP | Dato que haría falta | ¿Lo tenemos hoy? |
|---|---|---|
| Dos presupuestos: 995.976.833 (proceso) y 996.477.546 (PAA) | Línea del Plan Anual de Adquisiciones | No |
| Dos fuentes de recursos («Otros recursos», «Recursos propios») | Fuentes de recursos del contrato | **Llega en el conjunto de contratos y se descarta** |
| CDP sin validar | CDP o saldo de CDP | Solo `saldo_cdp`, en contratos, **descartado** |
| «Dirección de ejecución» = la sede de la empresa | Lugar de ejecución | No (otro conjunto de datos) |
| Sin garantías | Garantías del contrato | No (otro conjunto de datos) |
| El contrato cambió, pero no se ve qué cambió | Detalle de modificaciones | No (otro conjunto de datos) |
| La minuta firmada ya está entre los documentos | Lista de documentos | No (otro conjunto de datos) |

La regla R1 del spec anterior («una verdad por proceso») exige que, cuando dos
fuentes oficiales digan cosas distintas, la ficha diga **las dos** y cuál manda.
Sin el dato, la ficha calla, y callar sobre una contradicción conocida es letra
pequeña.

## Hallazgo del reconocimiento: la mitad ya llega y se tira

Se revisó la muestra de esquema guardada en el repo (`samples/*.columns.json` y
`samples/_stats.json`, 500 filas por conjunto, generada el 2026-06-05). La
ingesta pide los dos conjuntos completos a Socrata, pero el transform solo
escribe en `proceso` y `contrato` las columnas que ya existen, y después
`vaciarPayloads` deja el `payload` de `raw_record` en `NULL`. **Lo demás se
pierde.** En la muestra (no es solo agua; las cifras son orientativas):

**Conjunto de procesos (`p6dx-8zbt`), descartado hoy:**

| Campo | Lleno en la muestra | Para qué sirve en la ficha |
|---|---|---|
| `duracion` + `unidad_de_duracion` | 89 % | El plazo de ejecución **como duración** («12 meses»), no como una fecha mal rotulada |
| `fecha_de_apertura_efectiva` | 55 % | Cuándo se abrieron las ofertas de verdad |
| `respuestas_al_procedimiento`, `proveedores_unicos_con` | 35 % | **Cuántas ofertas llegaron**: el dato que más pide una empresa |
| `justificaci_n_modalidad_de` | 100 % | Por qué esa modalidad (régimen especial: «Regla aplicable») |
| `nombre_de_la_unidad_de` | 100 % | Qué dependencia contrata |
| `numero_de_lotes` | 4 % | Explica C4 (contrato mayor que el presupuesto) cuando hay lotes |

**Conjunto de contratos (`jbjy-vk9h`), descartado hoy:**

| Campo | Lleno en la muestra | Para qué sirve |
|---|---|---|
| `origen_de_los_recursos`, `destino_gasto` | 96–100 % | De dónde sale el dinero y si es inversión o funcionamiento |
| Seis fuentes: `presupuesto_general_de_la_nacion_pgn`, `sistema_general_de_participaciones`, `sistema_general_de_regal_as`, `recursos_propios_alcald_as_…`, `recursos_propios`, `recursos_de_credito` | 0,4–9 % cada una (la mayoría en 0) | **Las dos fuentes de recursos** del ejemplo, con su cifra |
| `saldo_cdp` | 69 % | Que hay disponibilidad presupuestal y cuánta |
| `dias_adicionados` | casi nunca | Prórroga en días (hoy se deduce de las fechas) |
| `liquidaci_n`, `fecha_inicio_liquidacion`, `fecha_fin_liquidacion` | — | Si el contrato se liquidó: el final real de la vida del proceso |
| `habilita_pago_adelantado`, `valor_de_pago_adelantado` | 10 % | Anticipo |
| `valor_pendiente_de_ejecucion` | 93 % | Lo que falta por ejecutar **según el SECOP** (nunca como avance de obra) |

`prorrogable`, `valor_facturado`, `valor_pagado` y `valor_pendiente_pago` ya se
guardan.

**Campos que nunca se ingieren ni se muestran (privacidad, regla nueva R8 de
este spec):** `nombre_del_banco`, `tipo_de_cuenta`, `n_mero_de_cuenta`; los
documentos de identidad y el género del representante legal; nombre y documento
del supervisor, del ordenador del gasto y del ordenador de pago. Son datos de
personas naturales o datos financieros que no explican el proceso. La decisión
del 2026-10-05 de excluir personas naturales se extiende a ellos.

## Lo que no llega: conjuntos de datos aparte

Desde este entorno no se puede consultar datos.gov.co (el proxy lo bloquea), así
que **los identificadores no están verificados**. Se nombran por su título en el
catálogo, que es lo que `datasetResolver` usa para resolver el id vigente:

| Conjunto (título aproximado) | Dato | Identificador | Encaje |
|---|---|---|---|
| «Vista SECOP II - Ubicaciones ejecución contratos» | Departamento y municipio **de ejecución** | `5p2a-fyvn` (encontrado por búsqueda, sin verificar) | Corrige la regla de la sede: hoy el mapa, la compuerta de zona y el hero usan la sede de la entidad |
| «SECOP II - Modificaciones a contratos» | Tipo (adición, prórroga, cesión, suspensión…), fecha y descripción | por verificar | «Cómo se contrató» dice **qué** cambió y cuándo, no solo la diferencia de cifras |
| «SECOP II - Garantías» | Tipo de póliza, aseguradora, valor y vigencia | por verificar | «Exige garantías / no exige» con dato, no con el pliego |
| «SECOP II - Plan Anual de Adquisiciones» (detalle) | Línea del PAA con su valor | por verificar | El segundo presupuesto del ejemplo |
| Documentos del proceso (archivos) | Nombre, tipo y fecha de cada documento | por verificar | Señal de minuta firmada, adendas y pliego definitivo |

## Reglas

- **R8 — Privacidad.** Ningún dato de persona natural ni financiero personal
  entra en la base, aunque la fuente lo publique (lista arriba).
- **R9 — Dos fuentes, dos cifras.** Si el proceso y el PAA (o el proceso y el
  contrato) dan cifras distintas, la ficha pinta las dos, con su fuente, y dice
  cuál usa. Nunca las suma ni elige en silencio.
- **R10 — Lugar de ejecución por encima de la sede.** Cuando exista, la ficha,
  el mapa y la compuerta de zona usan el lugar de ejecución y lo rotulan así; la
  sede de la entidad se rotula «sede de la entidad», como hoy. Sin dato de
  ejecución no cambia nada (D2 del 2026-09-28 sigue: la zona es `WARN`).
- **R11 — Sin avance de obra.** `valor_pendiente_de_ejecucion`, pagado y
  facturado se rotulan «según el SECOP» y nunca se convierten en porcentaje de
  avance (sigue el criterio del spec anterior).
- **R12 — Desde 2026.** Igual que el ciclo de vida: los campos nuevos se
  rellenan para procesos publicados desde el 1 de enero de 2026; los anteriores
  se quedan como están.

## Contradicciones nuevas para «Revisa antes de confiar»

Continúan la numeración C1–C7. Ninguna se publica sin medirla antes (como C4).

| Id | Condición | Texto |
|---|---|---|
| C8 | Presupuesto del proceso ≠ valor de su línea del PAA | «El proceso dice X; el Plan Anual de Adquisiciones, Y. Manda el del proceso.» |
| C9 | Más de una fuente de recursos con valor | No es error: se explica («Se paga con dos fuentes: …»). Solo es contradicción si la suma no da el valor del contrato |
| C10 | Contrato firmado y `saldo_cdp` = 0 o ausente | «El SECOP no muestra disponibilidad presupuestal para este contrato.» (por calibrar: puede ser normal en régimen especial) |
| C11 | Lugar de ejecución en otro departamento que la sede | No es error: se dice dónde se ejecuta |
| C12 | Modificación en el SECOP sin cambio en valor ni fechas del contrato (o al revés) | «El contrato cambió y el SECOP no lo refleja en sus cifras.» |

## Restricciones que mandan

1. **Espacio.** La base viva está en el plan Free de Supabase (500 MB). El
   `VACUUM FULL` del 2026-09-15 la dejó en 201 MB, y el CLAUDE.md dice que la
   migración `0025` de la vitrina sigue esperando por el límite del plan. Hay
   que medir (M11) antes de añadir nada.
2. **Migraciones.** Los campos de procesos y contratos son columnas nuevas, y
   modificaciones y garantías son tablas nuevas (con `.enableRLS()`). Todas son
   migraciones sobre la base viva.
3. **Los payloads ya se vaciaron.** Para rellenar los procesos de 2026 hay que
   **volver a pedirlos a Socrata**: no hay copia local. Con R12 es acotado
   (M11 dice cuántos).
4. **Campos volátiles.** `src/lib/ingest/sources.ts` saca del hash del payload
   `respuestas_al_procedimiento`, `saldo_cdp`, `valor_pendiente_de_ejecucion` y
   otros: si solo cambia uno de ellos, el registro no se vuelve a transformar.
   Guardarlos tal cual los dejaría congelados en la primera lectura (ya pasa con
   `valor_pagado`). El plan tiene que decidir si salen de esa lista o si se
   muestran con la fecha en que se leyeron («según el SECOP el 12 de mayo»).
5. **Red.** Las pruebas de esquema de los conjuntos nuevos tienen que correr
   donde se llegue a datos.gov.co (Vercel, GitHub Actions o el navegador del
   usuario), no en este entorno.

## Mediciones pendientes

- **M11 — Espacio y universo.** `scripts/sql/medir-espacio-ingesta.sql` (una
  consulta, solo lectura, probada en local). Devuelve el tamaño de la base, las
  diez tablas más pesadas, `raw_record` por fuente y cuántos procesos y contratos
  de 2026 habría que volver a pedir.
- **M12 — Esquema real de los conjuntos nuevos.** Abrir en el navegador, para
  cada conjunto de la tabla anterior,
  `https://www.datos.gov.co/resource/<id>.json?$limit=1` y anotar el id vigente,
  las columnas y si trae `id_del_proceso` o `id_contrato` (la llave para
  enlazarlo). Sin llave, el conjunto no sirve.
- **M13 — Llenado en agua.** Cuando se tenga M12, medir qué parte de los
  procesos de agua de 2026 tiene cada dato: un campo lleno en el 2 % no se
  diseña igual que uno lleno en el 90 %.

## Propuesta de orden (para decidir en D1)

- **Etapa A — lo que ya llega (sin conjuntos nuevos).** Guardar los campos de
  procesos y contratos de las tablas de arriba, rellenar 2026 volviendo a
  pedirlo, y pintarlos en la ficha: duración, ofertas recibidas, fuentes de
  recursos, CDP, liquidación, anticipo. Resuelve dos de las siete filas del
  ejemplo y añade el dato de ofertas recibidas, que no estaba en la lista. Una
  migración de columnas.
- **Etapa B — lugar de ejecución.** Es el que más cambia el producto (mapa,
  hero, compuerta de zona). Un conjunto nuevo y una tabla.
- **Etapa C — modificaciones y garantías.** Dos conjuntos y dos tablas.
- **Etapa D — PAA y documentos.** El PAA se publica por entidad y año, no por
  proceso: enlazarlo puede no ser posible (lo dirá M12). Documentos: solo
  metadatos, nunca los archivos.

## Decisiones del usuario

- **D1 — Orden.** ¿A → B → C → D, o empezar por el lugar de ejecución (B)?
- **D2 — Espacio.** Si M11 muestra poco margen: ¿pasar a un plan de pago de
  Supabase, o limitar todo esto a procesos de agua desde 2026 (R12) y seguir en
  Free?
- **D3 — Ofertas recibidas.** ¿Se muestra «Llegaron N ofertas» en la ficha y en
  la tarjeta? Es público en el SECOP, pero es nuevo en el producto.
- **D4 — Representante legal.** Hoy no se guarda. ¿Se mantiene así? (La
  propuesta es sí, por R8.)
- **D5 — Documentos.** ¿Lista de documentos con enlace al SECOP, o solo señales
  (hay minuta, hay adendas) sin la lista?

## Fuera de alcance

- Descargar o leer documentos (el extractor de pliegos sigue siendo la vía).
- Avance físico de obra, interventoría e informes de supervisión: la fuente no
  los publica.
- Historial de versiones del proceso (`al_proceso_evento` sigue como está).
- SECOP I.
