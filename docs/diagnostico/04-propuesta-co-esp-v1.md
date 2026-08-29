# Propuesta de contenido — cuestionario `co-esp-v1` (E.S.P., Ley 142)

**Fecha:** 2026-08-29 · Camino (A) de [`03-variante-ley-142.md`](03-variante-ley-142.md).

> ## ⚠️ ESTE CONTENIDO NO ESTÁ VALIDADO
>
> `co-apsb-v1` se copió literal de un prototipo **ya validado normativamente**.
> Para la Ley 142 **no existe ese insumo**, así que lo de abajo lo redacté yo.
> Es una propuesta razonada, no una fuente. **Nada de esto debe entrar a código
> ni publicarse sin que alguien con criterio jurídico lo revise** — §7 lista
> exactamente qué hay que verificar y con quién.
>
> Cuando se apruebe, el archivo `co-esp-v1.ts` debe decir en su docstring que
> el contenido es propio y aprobado en tal fecha, **no** que viene de una
> fuente externa como sí ocurre con `co-apsb-v1`.

---

## 1. Qué hace distinto a este cuestionario

`co-apsb-v1` puede prometer un veredicto universal porque la Ley 80/1150 define
tres peldaños con requisitos objetivos e iguales en todo el país. **La Ley 142
no tiene eso**: el artículo 31 (modificado por la Ley 689 de 2001) somete los
contratos de las E.S.P. al derecho privado, y **cada empresa fija sus
modalidades y sus topes en su propio manual de contratación**, aprobado por su
junta directiva.

Consecuencias de diseño, las tres importantes:

1. **No hay escalón.** La pregunta "¿a qué escalón puedes aspirar?" no tiene
   respuesta. El resultado devuelve `escalon: null`.
2. **El eje deja de ser la habilitación legal y pasa a ser la relación
   comercial.** A una E.S.P. no le acreditas capacidad ante un registro
   estatal: te inscribes en *su* registro de proveedores y compites por *sus*
   invitaciones.
3. **Lo que sobrevive de la Ley 80 es poco pero decisivo.** Las inhabilidades e
   incompatibilidades y el pago de seguridad social siguen pesando — ver §7.1,
   porque es justo lo que hay que verificar.

## 2. A quién le está hablando

Las E.S.P. de agua que más publican, con su cuantía media (datos reales,
2026-08-29):

| Procesos | Media | Entidad |
|---|---|---|
| 5 821 | $1 047 M | Acueducto y Alcantarillado de Bogotá |
| 1 672 | $418 M | Empresa de Obras Sanitarias de Caldas |
| 1 059 | $2 170 M | Empresas Públicas de Medellín |
| 696 | $198 M | Aguas de Manizales |
| 632 | $526 M | ACUAVALLE |
| 471 | $392 M | Empresas Públicas de Armenia |

**Dato que cambia el tono del cuestionario:** la media de EPM son $2 170 M y la
del Acueducto de Bogotá $1 047 M. No es el terreno de "tu primer contrato".
Quien responda esto probablemente ya tenga empresa andando, y el cuestionario
debe tratarlo como tal en vez de repetir el registro de "empieza por aquí" que
tiene sentido en mínima cuantía.

---

## 3. Las 8 preguntas — PROPUESTA

Ocho y no diez: cinco de las de `co-apsb-v1` no aplican (RUP, UNSPSC, escalón,
y las dos que giran alrededor del RUP). Promesa de portada: **8 preguntas ·
2 minutos**. Máximo 10 puntos por pregunta → **total 0-80**, que se normaliza a
0-100 para reusar las bandas.

### Categorías

| id | Etiqueta | Preguntas | Máx |
|---|---|---|---|
| `registro` | Registro ante la empresa | 1 | 10 |
| `juridica` | Situación jurídica | 2 | 20 |
| `experiencia` | Experiencia | 1 | 10 |
| `financiera` | Capacidad financiera | 2 | 20 |
| `tecnica` | Capacidad técnica | 1 | 10 |
| `estrategia` | Estrategia | 1 | 10 |

### 1 · `registro` — Registro ante la empresa
**¿Estás inscrito en el registro de proveedores de la empresa a la que le
quieres vender?**
*Ayuda:* Las E.S.P. grandes mantienen su propio registro y suelen invitar solo
a quien ya está dentro. Es gratuito, se hace en el portal de cada empresa, y es
el paso que más gente se salta.

| Opción | Pts | Flag |
|---|---|---|
| Sí, en una o varias | 10 | — |
| Me inscribí pero no sé si quedó activo | 6 | `registro_dudoso` |
| No, todavía no | 1 | `registro_no` |
| No sabía que existía | 0 | `registro_no` |

### 2 · `juridica` — Inhabilidades
**¿Han verificado inhabilidades e incompatibilidades de la empresa y del
representante legal?**
*Ayuda:* Contratar bajo derecho privado no borra el régimen de inhabilidades.
Un reporte activo del representante legal compromete a toda la empresa.

| Opción | Pts | Flag |
|---|---|---|
| Sí, verificados y limpios | 10 | — |
| Nunca los hemos revisado | 4 | `inhab_rev` |
| Sabemos que hay un reporte activo | 0 | `inhab_mal` **(absoluto)** |

### 3 · `juridica` — Seguridad social
**¿La empresa está al día en seguridad social y parafiscales?**
*Ayuda:* Se acredita igual que en la contratación estatal y no admite mora.

| Opción | Pts | Flag |
|---|---|---|
| Sí, al día | 10 | — |
| Con alguna mora pendiente | 2 | `pila_mora` **(absoluto)** |
| No tenemos empleados vinculados | 6 | `pila_sin` |

### 4 · `experiencia` — Experiencia certificada
**¿Qué contratos terminados puedes certificar?**
*Ayuda:* Sin RUP de por medio, la experiencia se acredita con la certificación
del contratante: objeto, valor, plazo y actividades. Los contratos con otras
E.S.P. pesan más que los estatales.

| Opción | Pts | Flag |
|---|---|---|
| Varios, incluyendo con otras E.S.P. | 10 | — |
| Con entidades públicas | 8 | — |
| Solo con privados | 6 | — |
| Trabajos hechos, sin certificación | 2 | `exp_informal` |
| Ninguno todavía | 0 | `exp_cero` |

### 5 · `financiera` — Estados financieros
**¿Los estados financieros están al día y firmados?**
*Ayuda:* El manual de cada empresa define qué indicadores mira, pero todos
parten del mismo balance. Si están atrasados, no hay conversación posible.

| Opción | Pts | Flag |
|---|---|---|
| Sí, con revisor fiscal | 10 | — |
| Sí, firmados por contador | 8 | — |
| Existen pero están atrasados | 3 | `fin_atraso` |
| No los tenemos preparados | 0 | `fin_no` |

### 6 · `financiera` — Espalda financiera
**¿Podrías sostener la obra si te pagan a 60 o 90 días?**
*Ayuda:* Es la pregunta que más contratos hunde. Estas empresas manejan
cuantías medias de cientos de millones y pagan contra actas.

| Opción | Pts | Flag |
|---|---|---|
| Sí, con recursos propios | 10 | — |
| Sí, con cupo de crédito aprobado | 8 | — |
| Tendríamos que conseguir financiación | 4 | `flujo` |
| No, ese plazo nos rompe | 1 | `flujo_no` |

### 7 · `tecnica` — Capacidad técnica
**¿Cuentas con ingeniero con matrícula vigente y experiencia en el RAS?**
*Ayuda:* Civil, sanitario o ambiental. Para obra de acueducto y alcantarillado
importa el manejo del reglamento técnico del sector (Resolución 0330 de 2017).

| Opción | Pts | Flag |
|---|---|---|
| Sí, en nómina y con experiencia en el sector | 10 | — |
| Sí, con matrícula, sin experiencia específica en RAS | 7 | `tec_ras` |
| Disponible por contrato cuando se necesite | 6 | — |
| No tenemos a nadie identificado | 1 | `tec_no` |

### 8 · `estrategia` — Puerta de entrada
**¿Has hablado con el área que contrata, o solo esperas la invitación?**
*Ayuda:* En derecho privado la relación comercial es parte del proceso, no un
atajo. Presentarse antes de que salga la invitación es legítimo y habitual.

| Opción | Pts | Flag |
|---|---|---|
| Sí, tenemos contacto con el área técnica | 10 | — |
| Hemos escrito pero sin respuesta | 6 | — |
| No, solo miramos las publicaciones | 3 | `puerta` |

---

## 4. Remedios — PROPUESTA

**Duros (4):** `inhab_mal` ⭐, `pila_mora` ⭐, `registro_no`, `fin_no`
**Blandos (7):** `registro_dudoso`, `inhab_rev`, `pila_sin`, `exp_informal`,
`exp_cero`, `fin_atraso`, `flujo`, `flujo_no`, `tec_ras`, `tec_no`, `puerta`

⭐ = **absoluto**, mismos dos que en `co-apsb-v1` y por la misma razón: rigen en
cualquier modalidad y contradicen cualquier veredicto optimista.

`registro_no` es duro pero **no** absoluto: sin registro no te invitan, pero
inscribirse toma días y no invalida el resto del diagnóstico. Es el equivalente
funcional de `secop_no`.

Los textos de remedio quedan pendientes de redactar; primero conviene cerrar
las preguntas.

---

## 5. Salida: qué devuelve en vez de escalón

```ts
{
  version: "co-esp-v1",
  puntajeTotal,          // 0-100, normalizado desde 0-80
  banda,                 // mismos umbrales: 78 / 58 / 35
  puntajeAreas,          // 6 categorías propias
  escalon: null,         // ← la Ley 142 no tiene escalera
  estadoRup: null,       // ← no aplica
  bloqueantes, bloqueoAbsoluto,
}
```

En vez de la escalera de tres peldaños, el resultado muestra **la vía de
entrada**: inscribirse en el registro de proveedores de las E.S.P. que operan
en su zona, con enlace al portal de cada una. Es concreto y verificable, a
diferencia de un escalón que no existe.

**Reusar las bandas 78/58/35 es una decisión que hay que tomar a conciencia**,
no un arrastre: se calibraron para otro cuestionario, con otras preguntas. Si
se reusan, que sea porque alguien las revisó contra estas ocho.

---

## 6. Qué habría que cambiar en el código

1. **Migración `0016`:** `diagnostico.escalon` pasa a nullable. Preferible a un
   valor centinela tipo `no_aplica`, que acabaría colándose en la UI.
2. **Registro de cuestionarios:** hoy `calcular.ts` importa `co-apsb-v1`
   directamente. Pasaría a un mapa `version → catálogo`, y
   `calcularDiagnostico(respuestas, version)`. `mapDiagnosticoRow` **ya
   ramifica por versión** — ese `if` se escribió para esto.
3. **Normalizar el puntaje.** 8 preguntas × 10 = 80. O se normaliza a 100 (y se
   documenta), o las bandas se recalibran a la escala de 80. Recomiendo
   normalizar: mantiene una sola escala en la UI y en la base.
4. **Elegir variante.** Una pregunta previa ("¿a quién le quieres vender: a una
   alcaldía o a una empresa de servicios públicos?") antes de la pregunta 1.
   Rompe el "10 preguntas · 3 minutos" de la portada actual, así que la portada
   hay que rehacerla.
5. **`co-apsb-v1.ts` no se toca.** Congelado, con filas apuntando a él.
6. `pareceEsp` de `regimen-especial.ts` se reusa para sugerir la variante y para
   listar las E.S.P. de la zona del usuario.

---

## 7. Lo que hay que verificar antes de aprobar esto

Esta es la parte importante del documento. Redacté las preguntas con criterio
de producto; **estas afirmaciones necesitan respaldo jurídico**:

### 7.1 Crítico — determina si dos preguntas son correctas
- **¿El régimen de inhabilidades e incompatibilidades aplica a los contratos de
  las E.S.P., y con qué alcance?** La pregunta 2 y el bloqueante `inhab_mal`
  dependen enteramente de esto. Sé que no desaparece por contratar bajo derecho
  privado, pero **no puedo precisar el alcance ni citar el artículo de memoria**,
  y aquí una imprecisión es cara.
- **¿La certificación de aportes a seguridad social se exige igual?** Misma
  situación con la pregunta 3 y `pila_mora`.
- **¿Cambia algo según la composición del capital** (oficial, mixta, privada)?
  EPM y el Acueducto de Bogotá son oficiales; puede que no se les aplique lo
  mismo que a una E.S.P. privada.

### 7.2 Verificable sin abogado, mirando los manuales
- ¿Qué E.S.P. tienen registro de proveedores en línea y en qué portal? Nombrarlos
  con enlace es la parte más útil del resultado.
- ¿Los manuales publicados de EAAB, EPM y ACUAVALLE piden algo que este
  cuestionario no pregunta? Son públicos.
- ¿Los plazos de pago de 60-90 días de la pregunta 6 son realistas? Sale de los
  manuales o de hablar con proveedores.

### 7.3 De producto, para ti
- ¿Reusar las bandas 78/58/35 o recalibrarlas? (§5)
- ¿Ocho preguntas o menos? Con cuantías medias de cientos de millones, el
  público es más experto y tolera menos obviedades.
- ¿La variante se elige con una pregunta previa o con dos entradas distintas?

---

## 8. Gate

Nada de esto entra a código hasta que apruebes §3 y §4, y hasta que §7.1 tenga
respuesta. Si prefieres, puedo:

- ajustar preguntas y puntajes sobre esta propuesta las veces que haga falta;
- reducir el alcance a lo que **no** necesita respaldo jurídico (registro de
  proveedores, financiero, experiencia, técnica) y dejar fuera inhabilidades y
  parafiscales hasta verificarlas;
- o construir primero la maquinaria multi-cuestionario de §6, que es
  independiente del contenido y quedaría lista para cuando lo haya.
