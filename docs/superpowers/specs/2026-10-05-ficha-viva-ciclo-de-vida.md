# Ficha Viva: una verdad por proceso, de la publicación a la ejecución

**Fecha:** 2026-10-05 · **Estado:** spec para revisión del usuario (sin plan ni
código todavía) · **Flujo:** `docs/CONDUCTA.md` §4 — esto es el QUÉ; el CÓMO va
en un plan aparte cuando el spec se apruebe.

## Origen

El usuario definió el camino para lanzar AquaLicita: **primero la información**.
El punto débil de la contratación pública en Colombia es cómo se presentan los
procesos: páginas largas, letra pequeña, campos que no aplican y datos que se
contradicen. Para mostrarlo trajo la página del SECOP del proceso
**OPA-ST-07-2023** (Aguas y Aguas de Pereira, `CO1.REQ.5354189`). Esa página:

- dice *Fase: Presentación de oferta · Estado: Publicado*, pero el contrato se
  **firmó el 24/11/2023, cuatro días antes de publicarse** (28/11/2023), y la
  minuta firmada está entre los documentos;
- da dos presupuestos (995.976.833 en el proceso, 996.477.546 en el PAA) y dos
  fuentes de recursos («Otros recursos» y «Recursos propios»);
- titula una obra y describe dos (Calle 58 y Calle 21);
- llama «Dirección de ejecución» a la sede de la empresa y «Plazo de ejecución» a
  una fecha;
- dedica más espacio al Decreto 248 (alimentos), la Sentencia T-302 (pueblo
  Wayúu), el Acuerdo de Paz y la misión de la empresa que al presupuesto.

Decisiones del usuario en esta conversación:

1. **La Ficha Viva se encarga de explicarlo todo**: de forma directa, sin
   contradicciones, trampas, ruido ni letra pequeña.
2. **Primero el spec**, después el código.
3. **Los procesos ya contratados se muestran, como ficha en ejecución.** La ficha
   no termina cuando se cierran las ofertas: debe abarcar la vida entera del
   proceso.

## Resultado esperado

Cualquier persona —una empresa, un ingeniero, un funcionario o un ciudadano—
abre la ficha de un proceso de agua y en la primera pantalla sabe, sin leer nada
más:

1. **En qué etapa está**, con una sola respuesta: se puede ofertar, se está
   evaluando, ya se contrató, se está ejecutando, terminó o no se llevó a cabo.
2. **Qué se contrata, por cuánto, quién y hasta cuándo**, con etiquetas que
   dicen lo que son.
3. **Qué no cuadra**, si algo no cuadra, dicho en un bloque visible y no en
   letra pequeña.

Lo que la fuente no publica se queda como «por verificar», con el enlace al
expediente. La ficha nunca lo rellena con una suposición.

## Las reglas de la ficha

Son el contrato de presentación. Cada una se tiene que poder comprobar con una
prueba.

**R1. Una sola verdad por pregunta.** Si la fuente da dos respuestas (estado
«Publicado» y contrato firmado), la ficha no pinta las dos. Elige una con la
regla de precedencia escrita en este spec (abajo) y explica la otra en una
línea.

**R2. Primero lo que decide.** Arriba va la etapa y los datos que la acompañan.
Lo demás, debajo y por secciones, como ya hace la ficha interactiva (seis
preguntas, 2026-09-29).

**R3. Ruido fuera.** Un campo vacío, en «No» o en cero, o que no aplica a obras
de agua, no se pinta. Si su ausencia importa, se dice una vez y en palabras:
«No exige garantías», no «¿Solicitud de garantías? No».

**R4. Las contradicciones se señalan.** Las incoherencias que se pueden detectar
con datos ingeridos van en un bloque **«Revisa antes de confiar»**, con la
evidencia de cada lado («el SECOP dice X; el contrato dice Y»). Nunca se
resuelven en silencio y nunca van en letra pequeña.

**R5. Cada etiqueta dice lo que es.** Un plazo es una duración, no una fecha. La
ubicación de la entidad no es el lugar de la obra (regla vigente desde el
2026-09-26). Presupuesto, valor del contrato y pagos son tres cosas distintas.
Las fechas se escriben como día de calendario, sin «12:00:00 AM (UTC-05:00)».

**R6. Nada inventado.** Ni avance de obra deducido de un estado, ni lugar de
ejecución deducido de la sede, ni etapa deducida de una sola señal débil
(reglas vigentes de la ficha, `CLAUDE.md`, «Ficha interactiva móvil»).

**R7. Lenguaje simple.** Modalidades y siglas («régimen especial», «mínima
cuantía», «CDP», «PAA») se explican la primera vez, en una línea, junto al dato.

## El ciclo de vida que muestra la ficha

Siete etapas, y solo esas siete. Cada proceso está en una:

| Etapa | Qué le dice al usuario | Señal que la sostiene |
|---|---|---|
| **Recibe ofertas** | Se puede ofertar hasta tal día. | Abierto a ofertas y recepción no vencida, sin adjudicación ni contrato. |
| **En evaluación** | Ya no recibe ofertas; la entidad está decidiendo. | Cerrado a ofertas (o recepción vencida), sin adjudicación ni contrato. |
| **Adjudicado** | Se eligió a X por $Y; falta firmar. | Adjudicado, sin contrato vinculado. |
| **Contratado** | Contrato firmado; la obra aún no empieza según sus fechas. | Contrato con firma y fecha de inicio futura. |
| **En ejecución** | El contrato está vigente según sus fechas. | Contrato con fecha de inicio pasada y fecha de fin (actual) futura. |
| **Terminado** | El plazo del contrato venció. | Contrato con fecha de fin (actual) pasada. |
| **No se llevó a cabo** | Se declaró desierto, se canceló o se revocó. | Estado del proceso o del contrato que lo dice. |

Más un estado que no es etapa: **Por verificar**, cuando las señales faltan o
se contradicen de forma que ninguna regla las resuelve. La ficha lo dice así y
envía al expediente.

**«En ejecución» y «Terminado» salen de las fechas del contrato, no de un estado
de la fuente.** La fuente no publica un estado de ejecución (hallazgo D-012,
`docs/fase-0/0.6-cierre-fase-0.md`) y no publica avance de obra. La ficha lo
dice junto a la etapa: «Según las fechas del contrato. El SECOP no publica el
avance de la obra». «Terminado» significa que **venció el plazo**, no que la
obra se entregó.

### Regla de precedencia (R1)

De la señal más fuerte a la más débil:

1. Un estado que dice que el proceso **no se llevó a cabo** (desierto, cancelado,
   revocado), salvo que exista contrato firmado: entonces es una contradicción
   (C5) y la etapa queda **Por verificar**.
2. **Contrato firmado** vinculado al proceso → Contratado, En ejecución o
   Terminado, según sus fechas.
3. **Adjudicación** (adjudicado, con adjudicatario o fecha) → Adjudicado.
4. **Apertura a ofertas y fecha de recepción** → Recibe ofertas o En evaluación.
5. **Estado actual del proceso**, solo si no hay nada de lo anterior.

Una señal más fuerte manda sobre una más débil, y la discrepancia se explica en
la línea de la etapa. Con el proceso del ejemplo: «**Ya contratado.** El SECOP
lo muestra en fase de presentación de oferta, pero el contrato se firmó el 24 de
noviembre de 2023».

## Qué muestra la ficha según la etapa

La estructura de seis preguntas (Resumen, ¿Para qué?, Dinero, Plazos,
Responsables, Metas) se conserva. Cambia lo que cada etapa pone arriba y qué
pasa con «Quiero participar»:

- **Recibe ofertas** — como hoy: cierre de ofertas, presupuesto, semáforo,
  pliego y competidores en «Quiero participar».
- **En evaluación** — cuándo cerró la recepción y que la decisión está
  pendiente. «Quiero participar» deja de invitar a ofertar y dice por qué.
- **Adjudicado** — quién ganó, por cuánto y cuánto frente al presupuesto (si
  ambos datos existen).
- **Contratado / En ejecución / Terminado** — contratista, valor del contrato,
  inicio, fin previsto y fin actual. Si el fin o el valor cambiaron, se dice como
  dato, sin juicio: «Se prorrogó 45 días», «Se adicionaron $120 millones». Los
  pagos se muestran solo si la fuente los publica, rotulados como «pagado según
  el SECOP» y nunca como avance.
- **No se llevó a cabo** — qué pasó y cuándo, con el enlace al expediente.

En todas las etapas que no son «Recibe ofertas», **«Quiero participar» se
convierte en «Cómo se contrató»**: modalidad explicada, quién compitió (lo que
hoy da la §7) y el resultado. Es lo que sirve a la empresa para el siguiente
proceso de la misma entidad.

## Contradicciones que se detectan (R4)

Solo las que se pueden comprobar con datos ya ingeridos. Cada una tiene un
código, una condición y una frase.

| Código | Condición | Lo que dice la ficha |
|---|---|---|
| **C1** | Abierto a ofertas (o estado «Publicado») y contrato firmado o adjudicación. | «El SECOP lo muestra abierto, pero ya hay contrato firmado el …». |
| **C2** | Contrato firmado antes de la fecha de publicación del proceso. | «El contrato se firmó el …, antes de publicarse el proceso (…)». |
| **C3** | Abierto a ofertas con la fecha de recepción ya vencida. | «Figura abierto, pero la recepción de ofertas venció el …». |
| **C4** | Valor del contrato por encima del presupuesto publicado. | «El contrato vale $X, más que el presupuesto publicado ($Y)». |
| **C5** | Desierto, cancelado o revocado, pero con contrato firmado. | «Figura como …, pero tiene contrato firmado el …». |
| **C6** | Adjudicado sin adjudicatario publicado. | «Figura adjudicado, pero el SECOP no publica a quién». |
| **C7** | Fecha de fin del contrato anterior a su fecha de inicio. | «Las fechas del contrato no son coherentes: …». |

Una prórroga o una adición **no** son contradicciones: son hechos del contrato y
van en la etapa (arriba), no en «Revisa antes de confiar».

Los umbrales concretos (por ejemplo, si C4 tolera redondeos) se fijan en el
plan, con datos medidos.

## Ruido que no se pinta (R3)

La ficha **no** muestra, aunque la fuente los traiga:

- campos vacíos, «No Definido», «No aplica» y demás centinelas (la ingesta ya
  los convierte en nulo, D3);
- casillas Sí/No sin consecuencia para el lector;
- normas que no aplican a obras de agua (Decreto 248, Sentencia T-302) y misión
  o visión de la entidad;
- zonas horarias y horas de medianoche en fechas que son días.

Hoy la ficha ya pinta solo campos seleccionados, así que esta regla se cumple
casi por construcción. Se escribe para que **ningún campo nuevo** entre sin
pasar por ella.

## Vitrina, búsqueda y portada

- La **vitrina** (`/licitaciones`) y la **portada** siguen siendo de
  **oportunidades**: por defecto solo muestran «Recibe ofertas». Un proceso
  contratado no aparece nunca como oportunidad abierta, aunque el SECOP lo
  marque así (C1).
- Los procesos en otras etapas **tienen ficha pública e indexable** y se llega a
  ellos por enlace directo, desde «Quién suele competir aquí» y desde la
  búsqueda, con un filtro de etapa explícito (decisión pendiente: ver
  preguntas abiertas).
- La tarjeta de un proceso que no recibe ofertas lleva su etapa como pastilla
  («En ejecución», «Terminado»…), nunca «Abierto».

## Caso de prueba: OPA-ST-07-2023

Con los datos de la página del SECOP que trajo el usuario, la ficha debe decir:

> **Alcantarillado y acueducto en dos sectores de Pereira**
> **Etapa: Terminado** — según las fechas del contrato (30 nov 2023 → 27 feb
> 2024). El SECOP no publica el avance de la obra.
> **$995.976.833** · Contrato de obra · 90 días
> **Cómo se contrató:** régimen especial de una empresa de servicios públicos.
> No es una licitación pública: la empresa aplica su propio manual.
> **Revisa antes de confiar:** el SECOP lo muestra en fase de presentación de
> oferta (C1), y el contrato se firmó el 24 nov 2023, antes de publicarse el
> proceso el 28 nov 2023 (C2).

Si el contrato no está vinculado en la base, la etapa no puede ser «Terminado»:
queda lo que digan las señales del proceso, y si se contradicen, «Por
verificar». **Se comprueba contra la base antes del plan**: si este proceso no
está ingerido o no tiene contrato vinculado, se elige otro caso real con las
mismas características y se anota aquí.

## Criterios de aceptación

1. Cada proceso con ficha cae en **exactamente una** de las siete etapas o en
   «Por verificar»; una prueba lo exige sobre combinaciones de señales,
   incluidas las de C1–C7.
2. La etapa se calcula en **un solo sitio** y la usan la ficha, la tarjeta de la
   vitrina, el panel del Radar y la portada. Ningún componente decide «abierto»
   por su cuenta.
3. Ningún proceso con contrato firmado o adjudicación aparece como oportunidad
   en la vitrina, la portada o el buscador guiado.
4. Toda contradicción C1–C7 presente se muestra en «Revisa antes de confiar» con
   las dos fechas o los dos valores que la sostienen; si no hay ninguna, el
   bloque no se pinta.
5. «En ejecución» y «Terminado» llevan siempre la aclaración de que salen de las
   fechas del contrato. Ningún texto afirma avance de obra, entrega ni lugar de
   ejecución.
6. Presupuesto, valor del contrato y pagado tienen etiquetas distintas y nunca
   se suman ni se sustituyen entre sí.
7. «Quiero participar» solo invita a ofertar en «Recibe ofertas»; en las demás
   etapas es «Cómo se contrató».
8. Todo funciona sin JavaScript, como hoy. La ficha sigue en la misma ruta y con
   su caché pública; la etapa entra en el HTML cacheado, y la ficha dice cuándo
   se actualizaron los datos para que una etapa con horas de retraso no parezca
   falsa.
9. Sin migraciones: se usa lo que ya está en `proceso` y `contrato`. Si una etapa
   o una contradicción necesitara un dato que no está, se anota como pendiente y
   no se implementa.
10. El caso de prueba de arriba (o su sustituto medido) se reproduce tal cual.

## Reconocimiento: lo que ya existe (CONDUCTA §1)

- **La base ya tiene casi todas las señales.** `proceso` guarda `fase`,
  `estado_actual`, `estado_apertura`, `fecha_recepcion`, `adjudicado`,
  `adjudicatario`, `valor_adjudicacion` y `fecha_adjudicacion`; `contrato`
  guarda `fecha_firma`, `fecha_inicio`, `fecha_fin_inicial`/`_actual`,
  `valor_inicial`/`_actual`, `estado_actual` y la foto de pagos. Los contratos se
  ingieren con su propia red sectorial y se refrescan por `ultima_actualizacion`
  (`src/lib/ingest/sources.ts`), así que fechas y pagos se mantienen al día.
- **La ficha no las lee.** `ProcesoFicha` (`src/lib/secop/ficha.ts`) no trae
  fase, adjudicación ni contrato, y `aSecopProceso()` fija `fase: ""` y
  `adjudicado: false`. La cabecera decide con `estado_apertura` solo
  (`app/licitaciones/[slug]/page.tsx`, «Abierto / Cerrado a ofertas»). **Con la
  ficha de hoy, el proceso del ejemplo se mostraría como abierto si su
  `estado_apertura` lo dice.** Es la trampa que este spec cierra primero.
- **«Abierto» tiene hoy dos definiciones**: `condicionAbierto()` en
  `agregados.ts` (con `ESTADOS_ABIERTO`) y la de la vitrina; unificarlas es
  PENDIENTES §54. La etapa de este spec es la candidata natural a esa definición
  única, pero unificar los buscadores **no** entra aquí.
- **El vínculo proceso ↔ contrato** se resuelve por `portafolio_id` (D11/H1,
  `src/lib/transform/writers.ts`). En la muestra de la fase 0 había contratos sin
  proceso, exentos como artefacto de la ventana de ingesta. Su cobertura real en
  la base viva **no está medida**.

## Mediciones antes del plan

Sin ellas el plan no se puede cerrar. Se hacen contra la base de Supabase en
modo solo lectura (o, si no está disponible, contra el entorno local) y se pegan
aquí:

1. Cuántos procesos tienen al menos un contrato vinculado, y cuántos contratos
   de agua no encuentran su proceso.
2. Distribución de `estado_actual`, `fase` y `estado_apertura` de `proceso`, y de
   `estado_actual` de `contrato`, para fijar qué valores significan «no se llevó
   a cabo».
3. Cuántos procesos caen en cada contradicción C1–C7. En especial C1: cuántos
   hoy se cuentan como abiertos (`condicionAbierto()`) con contrato o
   adjudicación.
4. Si `CO1.REQ.5354189` está en la base y con qué señales.
5. Cuántos procesos tendrían cada etapa, para saber cuántas fichas «en
   ejecución» y «terminadas» se publicarían.

## Fuera de alcance

- Datos que **no se ingieren hoy**: PAA, CDP, garantías, fuentes de recursos,
  detalle de las modificaciones, lista de documentos y lugar de ejecución. Las
  contradicciones del ejemplo que dependen de ellos (dos presupuestos, dos
  fuentes de recursos, CDP no validado, sin garantías) quedan como trabajo
  posterior de ingesta, con su propio spec.
- Avance físico de obra, interventoría e informes de supervisión: la fuente no
  los publica.
- Alertas por cambio de etapa y «Seguir» un proceso (fase 3 de la vitrina,
  necesita la migración `0025`).
- Cambios de esquema, del clasificador o de la ingesta.

## Preguntas abiertas para el usuario

1. **Búsqueda de procesos no abiertos.** ¿La vitrina debe ofrecer un filtro de
   etapa («En ejecución», «Terminados») para buscarlos, o basta con que existan
   como fichas a las que se llega por enlace y por el buscador guiado? Propuesta:
   filtro explícito y apagado por defecto.
2. **Antigüedad.** ¿Se publican fichas de todos los procesos terminados que hay
   en la base, o solo de los últimos N años? Afecta a cuántas páginas se indexan.
3. **Nombre de la etapa final.** «Terminado» puede leerse como «obra
   entregada». Alternativa más honesta: «Plazo vencido». Propuesta: «Plazo
   cumplido», con la aclaración de que no es acta de entrega.
