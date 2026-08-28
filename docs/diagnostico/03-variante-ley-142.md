# Variante Ley 142 — reconocimiento y diseño

**Fecha:** 2026-08-28 · **Pendiente #12 de `PENDIENTES.md`.**
**Estado:** diseño. Sin código todavía — hay una decisión de producto y un
insumo de contenido que resolver antes.

---

## 0. Resumen

El pendiente se abrió con esta frase: *"el 55 % de los procesos son de régimen
especial, así que la variante Ley 142 es el siguiente movimiento obvio"*.

Al ir a los datos, la premisa se sostiene a medias y aparecen **dos problemas
que cambian el trabajo**:

1. **"Régimen especial" no es sinónimo de Ley 142.** Ese cajón mezcla empresas
   de servicios públicos con hospitales, universidades, Ecopetrol y el Banco de
   la República — regímenes distintos, con leyes distintas. Cerca de un tercio
   no es Ley 142.
2. **La Ley 142 no tiene una escalera de contratación.** Y la escalera es el
   corazón del diagnóstico actual. Bajo derecho privado no hay mínima cuantía,
   ni menor cuantía, ni licitación pública: **cada empresa fija sus propias
   reglas en su manual de contratación**. Un cuestionario no puede devolver un
   escalón universal porque no existe.

El segundo problema no se arregla escribiendo diez preguntas nuevas. Cambia qué
puede prometer el producto, y por eso este documento se detiene antes del
código.

---

## 1. Los datos

`SELECT` sobre `proceso` unido a `entidad` (2026-08-28, 89 585 procesos).

### 1.1 El cajón de "régimen especial"

| | Procesos | % del cajón |
|---|---|---|
| **Total "Contratación régimen especial"** (con y sin ofertas) | **51 290** | 100 % |
| Parecen E.S.P. (Ley 142), por nombre de entidad | 31 188 | 60,8 % |
| E.S.E. — hospitales (Ley 100) | 3 735 | 7,3 % |
| Universidades (Ley 30, autonomía) | 1 579 | 3,1 % |
| Resto sin clasificar | ~14 800 | ~28,8 % |

El "resto" incluye más ESP que el patrón de nombre no atrapa —EMCALI, ACUASAN,
"Empresa de Servicios Públicos de Sopó"— y también entidades que no lo son:
Ecopetrol (416), Banco de la República (364). **La cifra real de ESP está entre
el 61 % y el 75 % del cajón**, no en el 100 %.

Las mayores son exactamente las que importan para agua y saneamiento: Acueducto
de Bogotá (5 821), EMPOCALDAS (1 672), EPM (1 059), Aguas de Manizales (696),
ACUAVALLE (632).

### 1.2 Consecuencia técnica

**No hay ningún campo en los datos que diga "esta entidad es una E.S.P. de la
Ley 142".** `entidad.nivel_gobierno` solo distingue Territorial / Nacional /
Corporación Autónoma. Identificarlas exige una heurística sobre
`entidad.nombre` (buscar `E.S.P.`, `ACUEDUCTO`, `EMPRESAS PÚBLICAS`…), con dos
trampas comprobadas:

- **`E.S.E.` no es `E.S.P.`** — un patrón descuidado mete hospitales.
- Muchas ESP no llevan la sigla: "EMPRESAS MUNICIPALES DE CALI", "ACUASAN".

Antes de cablear esa heurística habría que decidir cuánto falso positivo se
tolera, y dónde vive: si es un campo derivado en `entidad` (como
`clasificacion_sectorial`) o un helper de lectura.

---

## 2. El problema de fondo: no hay escalera que subir

El diagnóstico actual funciona porque la Ley 80/1150 define **tres peldaños
con requisitos objetivos y universales**: mínima cuantía no pide RUP, menor
cuantía sí, licitación pública añade documentos tipo. Eso es lo que permite que
diez preguntas sobre la empresa devuelvan un veredicto que vale para cualquier
proceso del país.

Bajo la Ley 142 eso desaparece:

- El artículo 31 (modificado por la Ley 689 de 2001) somete los contratos de
  las ESP **al derecho privado**. No aplican los procedimientos de la Ley 80.
- Cada empresa aprueba su **propio manual de contratación** en su junta
  directiva, con sus propias modalidades (invitación pública, invitación
  privada, contratación directa) y **sus propios topes en salarios mínimos**.
- El RUP no es exigible. La experiencia, los indicadores financieros y las
  garantías los define el manual de cada empresa, no una norma nacional.

**Traducción para el producto:** la pregunta "¿a qué escalón puedes aspirar
hoy?" no tiene respuesta bajo la Ley 142. La respuesta honesta es *"depende del
manual de la empresa a la que le quieras vender"*, y eso es un producto
distinto: no un cuestionario sobre la empresa oferente, sino una ficha por cada
entidad contratante.

Es el mismo tipo de límite que ya encontramos con `habilitacionGate`: la
información no está donde el diseño la suponía.

---

## 3. Tres caminos, con su coste y lo que prometen

### (A) Cuestionario `co-esp-v1` con salida sin escalón — *recomendado*

Un segundo cuestionario, más corto (6-7 preguntas), que **no devuelve escalón**
sino un estado de preparación para vender a una E.S.P.: capacidad de facturar,
experiencia demostrable, cupo de póliza, inscripción en los registros de
proveedores de las ESP grandes (EAAB, EPM y ACUAVALLE tienen el suyo), y
régimen de inhabilidades, que **sí sigue aplicando**.

- **Promete lo que puede cumplir.** Nada de inventar topes que dependen de un
  manual que no tenemos.
- **Coste técnico:** medio. Obliga a los cambios de §4.
- **Coste de contenido:** hay que redactarlo y validarlo. No existe fuente.

### (B) Solo explicar, sin cuestionario nuevo — *el más barato*

Cuando el usuario tiene diagnóstico y mira un proceso de régimen especial de
una E.S.P., mostrar una nota: *"esta empresa contrata bajo derecho privado
(Ley 142); su manual de contratación fija sus propios requisitos, y tu escalón
de la Ley 80 no aplica aquí"*, con enlace al manual si la entidad lo publica.

- **Coste:** bajo. Reusa la heurística de §1.2 y nada más.
- **Cierra el agujero real**: hoy el usuario ve el aviso de escalón callado en
  la mitad del catálogo y no sabe por qué.
- **No responde** qué le falta para venderle a una ESP.

### (C) Ficha por entidad, con su manual de contratación — *el producto de verdad*

Extraer los manuales de contratación de las ESP grandes y modelar sus topes y
requisitos, igual que ya se hace con los pliegos. Ahí sí se puede decir "para
EPM necesitas X".

- **Coste:** alto. Es un módulo, no una variante. Necesita fuente documental
  por entidad y un extractor.
- Es la respuesta correcta a largo plazo.

**Recomendación:** hacer **(B) ya** —cierra el silencio actual, es barato y no
promete nada falso— y abrir **(A)** cuando haya contenido validado. **(C)**
como línea aparte del roadmap, no como variante del diagnóstico.

---

## 4. Qué habría que cambiar en el código (para A)

Lo levanto ahora porque condiciona la decisión, no porque haya que hacerlo ya.

1. **`diagnostico.escalon` es `NOT NULL`.** Un cuestionario sin escalón obliga a
   migración `0016`: o la columna se hace nullable, o se añade un valor
   `no_aplica`. Prefiero nullable — un valor centinela se acaba colando en la
   UI.
2. **El catálogo deja de ser único.** Hoy `calcular.ts` importa
   `co-apsb-v1` directamente. Haría falta un registro por versión y que
   `calcularDiagnostico` reciba cuál usar. `mapDiagnosticoRow` **ya está
   preparado**: degrada los derivados cuando `version` no es la vigente, y ese
   `if` fue escrito justo para esto.
3. **Elegir variante.** Alguien tiene que decidir qué cuestionario responde el
   usuario: una pregunta previa ("¿a quién le quieres vender?") o dos entradas
   distintas. Afecta a la portada y a la promesa de "10 preguntas · 3 minutos".
4. **`co-apsb-v1.ts` no se toca.** Está congelado y hay filas apuntando a él.

---

## 5. Lo que necesito para seguir

**Decisión de producto:** ¿(A), (B) o (B) ahora y (A) después?

**Si va (A), el contenido.** Las 10 preguntas de `co-apsb-v1` se copiaron
literales de un prototipo ya validado normativamente. **Para la Ley 142 no
existe ese insumo**, y no voy a inventar preguntas, puntajes ni umbrales sobre
contratación pública y presentarlos como validados: es exactamente el tipo de
contenido donde equivocarse le cuesta dinero a una empresa pequeña. Dos formas
de resolverlo:

- Traes la fuente, como pasó con el HTML, y se copia literal.
- La redacto yo como **propuesta explícitamente no validada**, en un Markdown
  aparte, y la revisas antes de que entre a código — el mismo trato que
  acordamos en `02-cuestionario-co-apsb-v1.md` §3 opción (B).

Puedo hacer **(B) inmediatamente** sin ninguno de los dos: no añade contenido
normativo, solo dice en voz alta lo que la ley ya dice y explica un silencio
que hoy el usuario no entiende.
