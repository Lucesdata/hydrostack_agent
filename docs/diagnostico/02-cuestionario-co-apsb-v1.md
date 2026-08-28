# Contrato de contenido — cuestionario `co-apsb-v1`

**Fuente de verdad:** [`docs/referencia/diagnostico-referencia.html`](../referencia/diagnostico-referencia.html)
(copiado al repo el 2026-08-27, sha256 `18aefae5…6fb33e`, 34 751 bytes).
Los textos literales —preguntas, ayudas, opciones, remedios, veredictos,
mitos, disclaimer— se copian **de ahí**, no de este documento. Este archivo
fija las **reglas de cálculo** y documenta lo que encontré al leer el
prototipo.

**Estado:** cerrado. Los tres hallazgos de §5 se decidieron el 2026-08-27 y
las decisiones están aplicadas abajo. Ningún puntaje, umbral ni texto del
prototipo se modificó.

---

## 1. Estructura

10 preguntas, opción única, 10 puntos máximos cada una → **puntaje total
entero de 0 a 100**. Seis categorías:

| # | `key` | Categoría | Máx |
|---|---|---|---|
| 1 | `rup` | Habilitación jurídica | 10 |
| 2 | `unspsc` | Habilitación jurídica | 10 |
| 3 | `exp` | Experiencia | 10 |
| 4 | `fin` | Capacidad financiera | 10 |
| 5 | `secop` | Operación en SECOP II | 10 |
| 6 | `poliza` | Capacidad financiera | 10 |
| 7 | `tec` | Capacidad técnica | 10 |
| 8 | `pila` | Habilitación jurídica | 10 |
| 9 | `antec` | Habilitación jurídica | 10 |
| 10 | `union` | Estrategia | 10 |

Máximos por categoría: Habilitación jurídica 40 · Capacidad financiera 20 ·
Experiencia 10 · Capacidad técnica 10 · Operación en SECOP II 10 · Estrategia 10.
**Suman 100.**

Orden de presentación de las barras (constante `CATS`, línea 455): Habilitación
jurídica, Experiencia, Capacidad financiera, Capacidad técnica, Operación en
SECOP II, Estrategia. **No es el orden de las preguntas** — se respeta tal cual.

---

## 2. Matriz de puntajes y flags

Copiada literal de `QUESTIONS` (líneas 338-453). El orden de las opciones es
significativo: es el que fija los atajos de teclado 1..n.

| # | Opción | Pts | Flag |
|---|---|---|---|
| **1 · RUP** | Sí, inscrita y renovada | 10 | — |
| | Inscrita, pero sin renovar este año | 4 | `rup_vencido` |
| | No estamos inscritos | 2 | `rup_no` |
| | No sé qué es el RUP | 0 | `rup_no` |
| **2 · UNSPSC** | Sí, los tenemos identificados | 10 | — |
| | Tenemos RUP pero no sé cuáles quedaron | 5 | `unspsc` |
| | No, todavía no | 1 | `unspsc` |
| **3 · Experiencia** | Varios con entidades públicas | 10 | — |
| | Con empresas privadas o E.S.P. | 8 | — |
| | Uno o dos, pequeños | 5 | — |
| | Trabajos hechos pero sin contrato formal | 2 | `exp_informal` |
| | Ninguno todavía | 0 | `exp_cero` |
| **4 · Financieros** | Sí, con revisor fiscal | 10 | — |
| | Sí, firmados por contador | 8 | — |
| | Existen pero están atrasados | 3 | `fin_atraso` |
| | No los tenemos preparados | 0 | `fin_no` |
| **5 · SECOP II** | Sí, y ya lo hemos usado | 10 | — |
| | Está creado pero nunca lo usamos | 6 | `secop_frio` |
| | No lo hemos creado | 1 | `secop_no` |
| **6 · Póliza** | Sí, ya nos han expedido pólizas | 10 | — |
| | No, pero tenemos con quién gestionarlo | 6 | — |
| | No sabemos si nos aprobarían | 2 | `poliza` |
| **7 · Técnica** | Sí, en nómina | 10 | — |
| | Disponible por contrato cuando se necesite | 8 | — |
| | No tenemos a nadie identificado | 2 | `tec` |
| **8 · PILA** | Sí, al día | 10 | — |
| | Con alguna mora pendiente | 2 | `pila_mora` |
| | No tenemos empleados vinculados | 6 | `pila_sin` |
| **9 · Antecedentes** | Sí, verificados y limpios | 10 | — |
| | Nunca los hemos revisado | 4 | `antec_rev` |
| | Sabemos que hay un reporte activo | 0 | `antec_mal` |
| **10 · Consorcio** | Sí, y ya tenemos aliados posibles | 10 | — |
| | Estaríamos abiertos a buscarlos | 8 | — |
| | Preferimos presentarnos solos | 5 | `solo` |

**16 remedios** en `REMEDIOS` (líneas 457-474), cada uno con `sev`
(`hard`|`soft`), título, párrafo y chips.

- **hard (6):** `antec_mal`, `pila_mora`, `rup_no`, `rup_vencido`, `fin_no`, `secop_no`
- **soft (10):** `fin_atraso`, `secop_frio`, `unspsc`, `exp_cero`, `exp_informal`, `poliza`, `tec`, `antec_rev`, `pila_sin`, `solo`

Los 16 están referenciados por alguna opción: no hay remedios muertos. Un test
del motor lo verifica en ambos sentidos.

Ningún id de flag se repite entre preguntas distintas, y cada pregunta aporta
como máximo un flag → **la lista de bloqueantes nunca tiene duplicados**. No
hace falta deduplicar.

---

## 3. Reglas derivadas

### 3.1 Puntaje

```
puntajeTotal = Σ puntos de las 10 opciones escogidas        → entero 0..100
puntajeArea[cat] = round(Σ puntos de la categoría / máx categoría × 100)
```

El prototipo lo escribe de forma más rebuscada (`liveScore`, línea 488, y
`finish`, línea 538), pero como el máximo total es exactamente 100, ambas
expresiones se reducen a la suma simple de puntos. Nuestro motor usa la suma
directa; el resultado es idéntico, verificable por test.

**Medidor en vivo:** el tanque muestra la **suma acumulada**, no el porcentaje
de lo respondido. En la pregunta 5, con todo perfecto, marca 40 %. Es
deliberado —el tanque se llena— y se conserva.

### 3.2 Bandas del veredicto (línea 542)

| Banda | Umbral | Antetítulo |
|---|---|---|
| `listo` | ≥ 78 | "Listo" |
| `casi` | ≥ 58 | "Casi" |
| `en_camino` | ≥ 35 | "En camino" |
| `inicio` | < 35 | "Punto de partida" |

### 3.3 Etiquetas por área (línea 566) — escala distinta a las bandas

`≥75` → "Listo" (barra normal) · `≥45` → "Parcial" (ámbar) · `<45` → "Pendiente" (rojo).

### 3.4 Escalón (línea 577)

```
tieneRup = puntos(P1) >= 10          // solo "Sí, inscrita y renovada"
tieneExp = puntos(P3) >= 8           // públicas (10) o privadas/E.S.P. (8)

if (tieneRup && tieneExp && total >= 70)  → licitacion_publica
else if (tieneRup && total >= 55)         → menor_cuantia
else                                       → minima_cuantia
```

Nótese que **el escalón no se deriva de la banda**: son dos ejes. Se puede
estar en banda `casi` y en escalón `menor_cuantia`.

### 3.5 Orden del plan de acción (línea 604)

`[...hard, ...soft]`, y dentro de cada grupo **en orden de pregunta**. Sin
pendientes → una única entrada con el texto "No tienes pendientes de
habilitación" (línea 612).

---

## 4. Lo que el diagnóstico **no** captura

Esto corrige lo que asumimos en la Fase 4 de la spec. Las 10 preguntas son
**cualitativas y declarativas**. En ningún momento piden:

- códigos UNSPSC concretos (la P2 pregunta *si los tienen identificados*, no cuáles);
- departamento o zona de operación;
- rango de cuantía objetivo;
- valores numéricos de indicadores financieros (liquidez, endeudamiento, cobertura, patrimonio, ROE, ROA);
- contratos de experiencia con objeto, valor en SMMLV, UNSPSC y año.

**Consecuencia dura:** el diagnóstico **no puede** poblar
`CapacidadFinancieraRUP` ni `ExperienciaContrato[]`, que es exactamente lo que
`habilitacionGate` consume. Tampoco puede prellenar el perfil mínimo
(Sector + Zona) de `/mis-coincidencias`, porque no pregunta ninguno de los dos.

Los pasos 2 y 3 de la Fase 4 tal como estaban escritos **no son ejecutables con
este contenido**. La corrección propuesta está en §6.

---

## 5. Hallazgos y decisiones (cerrados 2026-08-27)

Los tres salen de leer la lógica del prototipo. Cada uno lleva su decisión.

### 5.1 Un bloqueante duro puede convivir con el veredicto "Listo" ⚠

Nada en `finish()` deja que un flag `hard` toque la banda. El caso concreto:

> Empresa con las otras nueve respuestas perfectas (90 pts) que marca
> **"Sabemos que hay un reporte activo"** en antecedentes (0 pts).
> Total 90 → banda `listo` → **"Puedes presentarte a un proceso esta misma
> semana."**
> Y tres párrafos más abajo, el plan abre con: *"Una inhabilidad del
> representante legal o de la empresa hace que la oferta se rechace sin evaluar
> nada más."*

Se contradicen. Lo mismo con `pila_mora` (2 pts → 92 total) y, en menor grado,
con `rup_vencido` y `fin_no`.

**DECISIÓN: no se topa la banda; se añade un estado que la sobreescribe.**

Topar el puntaje sería mentir al revés: con nueve de diez cosas en orden, 90 es
el número honesto. Lo que está mal es el titular, no el puntaje.

- `puntajeTotal`, `puntajeAreas` y `banda` quedan **intactos**, con los umbrales
  validados. No se toca ni un número del prototipo.
- Los remedios ganan un campo `absoluto: boolean`. El resultado expone
  `bloqueoAbsoluto: string[]`.
- Si esa lista no está vacía, el Resultado renderiza un titular propio en vez
  del de la banda, nombrando el bloqueante. El tanque sigue mostrando su 90 %,
  las barras por área no cambian y el plan ya abría con ese remedio.

Es el **único contenido que no proviene del HTML de referencia**; queda marcado
como propio en el docstring de `co-apsb-v1.ts` (constante `VEREDICTO_BLOQUEADO`).

### 5.2 `rup_no` es `hard`, pero el propio remedio dice que no bloquea abajo

El remedio de `rup_no` termina: *"No lo necesitas para mínima cuantía, pero sí
para todo lo demás."* Y la portada abre con "Sin RUP · La mínima cuantía no
exige registro de proponentes". Es decir: la severidad `hard` es **relativa al
escalón**, no absoluta.

**DECISIÓN: `absoluto: true` solo en `antec_mal` y `pila_mora`.** Son los dos
requisitos habilitantes que rigen en toda modalidad, mínima cuantía incluida.

Los otros cuatro `hard` no necesitan regla, y aquí el prototipo era más
coherente de lo que parecía: **la escalera ya se autocorrige**. `tieneRup`
exige los 10 puntos de "inscrita y renovada", así que `rup_no` y `rup_vencido`
fuerzan el escalón a `minima_cuantia` por construcción — y la mínima cuantía no
exige RUP. No hay contradicción que arreglar. Lo mismo con `fin_no`. Y
`secop_no` se resuelve en 1-3 días y gratis, así que no desmiente "esta misma
semana"; ya aparece primero en el plan por ser `hard`.

### 5.3 "Nunca los hemos revisado" (antecedentes) da 4 puntos

`antec_rev` es `soft` y suma 4. No es un problema de habilitación real —no
haber consultado no inhabilita— pero puntúa como si fuera un déficit de la
empresa. **DECISIÓN: se deja tal cual.** Es defendible como proxy de rigor documental, y
cambiarlo movería un umbral validado a cambio de nada. Solo queda señalado por
ser el único ítem donde el puntaje mide un hábito y no una condición.

---

## 6. Corrección a la Fase 4 (aprobada 2026-08-27)

Dado §4, así es como el diagnóstico se conecta de verdad con AquaLicita. El
orden de construcción acordado es (a) → (d) → (b) → (e):

**(a) Panel de bloqueantes a nivel de cuenta.** Los seis `hard` y los once
`soft` se muestran como el plan de acción del usuario, persistido y visible en
`/mis-coincidencias`. Es información real y accionable, y no depende de ningún
pliego. Es el uso principal.

**(b) Escalón → modalidad del proceso. El enlace más fuerte, y no lo teníamos
visto.** `SecopProceso.modalidad` ya existe en el ELT (viene de
`modalidad_de_contratacion`, ver [`types.ts`](../../src/lib/secop/types.ts) y
[`mapCanonical.ts:119`](../../src/lib/transform/mapCanonical.ts)). Con el
escalón del usuario se puede anotar o filtrar cada proceso: *"este es de menor
cuantía; tu escalón hoy es mínima cuantía"*. Requiere un normalizador de
`modalidad` (texto libre de SECOP) construido a partir de un
`SELECT DISTINCT modalidad` sobre la tabla real — no invento la tabla de
equivalencias.

**(c) `EstadoRup` como aviso, no como compuerta.** Confirma la decisión que ya
tomamos: RUP vencido o no inscrito se muestra como bloqueante de cuenta.
`verdict.ts` y la invariante D18 no se tocan.

**(d) Sector + Zona se piden aparte, después del resultado.** Como el
cuestionario no los pregunta y son los dos campos que activan las
coincidencias, van en el paso de conversión: tras el resultado, junto al CTA de
registro, reusando [`SectorZonaSetup`](../../src/components/oferente/SectorZonaSetup.tsx)
tal cual (ya existe, ya escribe `PerfilMinimo`, ya tiene su Server Action). No
se añaden preguntas al cuestionario: rompería "10 preguntas · 3 minutos", que
es la promesa de la portada.

**(e) Lo que se descarta:** poblar `capacidadFinanciera` o `experiencia`
numéricos. Eso sigue siendo trabajo de `RupWizard`. El diagnóstico puede, eso
sí, **enviar al usuario a `RupWizard`** cuando su escalón ya es `menor_cuantia`
o superior — ahí sí tiene sentido pedirle los números.

---

## 7. Elementos de contenido a portar (además de las preguntas)

- **Portada:** antetítulo "10 preguntas · 3 minutos", titular, lede y los tres `facts` (sin RUP / sin pólizas / en consorcio) — líneas 239-257.
- **Veredictos:** cuatro pares antetítulo + titular + párrafo — líneas 542-554.
- **Escalera:** tres peldaños con nombre y descripción, más los tres `routeTitle`/`routeText` según el escalón — líneas 584-594.
- **Mitos:** seis pares afirmación/respuesta — líneas 319-324. Van en el HTML, no en JS: son estáticos.
- **Disclaimer:** línea 333. **Obligatorio portarlo.** Menciona que los umbrales dependen del presupuesto anual de cada entidad y que las E.S.P. contratan bajo derecho privado (Ley 142 de 1994) con manual propio.
- **"Copiar mi plan" e "Imprimir / PDF":** aprobados. Para una empresa que lleva esto a su contador, el PDF es más útil que cualquier correo.
- **`VEREDICTO_BLOQUEADO`:** titular + párrafo para el estado de §5.1. Es el único texto que no sale del HTML de referencia.

---

## 8. Qué queda en `co-apsb-v1.ts`

Un único módulo de datos, tipado, sin lógica:

```ts
export const VERSION_CUESTIONARIO = "co-apsb-v1";
export const CATEGORIAS: readonly Categoria[]      // orden de las barras
export const PREGUNTAS: readonly Pregunta[]        // 10, con key/cat/text/help/opts
export const REMEDIOS: Readonly<Record<RemedioId, Remedio>>  // 16
export const VEREDICTOS: Readonly<Record<BandaPreparacion, TextoVeredicto>>
export const ESCALERA: readonly Peldano[]          // 3
export const MITOS: readonly Mito[]                // 6
export const DISCLAIMER: string
```

La lógica (§3) vive aparte en `calcular.ts`, pura y testeada. El docstring del
módulo debe citar el HTML de referencia y su sha256, para que quede trazable de
dónde salió cada string.

---

**Gate cerrado el 2026-08-27.** Las decisiones de §5 y §6 están aprobadas y son
la base de `co-apsb-v1.ts` y `calcular.ts`.
