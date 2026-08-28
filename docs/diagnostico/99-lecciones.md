# Lecciones del módulo de diagnóstico

**Fecha:** 2026-08-28 · **Fases 0 a 4 completas.**

Lo que pedía el protocolo: qué asunción resultó falsa durante la
implementación y qué habría cambiado si se hubiera sabido en la Fase 0.

---

## La asunción falsa que más costó

**Creí que el diagnóstico podía alimentar `habilitacionGate`.**

Lo escribí así en la spec (Fase 4, pasos 2 y 3): el diagnóstico poblaría
`experiencia` y `capacidadFinanciera` del perfil, y prellenaría el perfil
mínimo de `/mis-coincidencias`. Era razonable: el prompt lo planteaba, el
reconocimiento confirmó que esos campos existen en `OferenteProfile` y que
están vacíos para casi todos los usuarios, y el hueco encajaba.

Es falso, y se vio en cuanto llegó el contenido real del cuestionario. Las diez
preguntas son **cualitativas y declarativas**: preguntan *si* tienen los
códigos UNSPSC identificados, no cuáles; *qué tipo* de contratos pueden
certificar, no su valor en SMMLV; *si* los estados financieros están firmados,
no los indicadores. Y no preguntan zona ni cuantía en ningún momento.

`habilitacionGate` consume `ExperienciaContrato[]` con valor en SMMLV y
`CapacidadFinancieraRUP` con seis indicadores numéricos. **El diagnóstico no
puede producir ni uno solo de esos datos.** Los pasos 2 y 3 de la Fase 4, tal
como estaban escritos, no eran implementables.

### Qué habría cambiado saberlo en la Fase 0

La Fase 0 auditó el repositorio a fondo —rutas, gating, esquema, semáforo,
tokens, tests— y produjo un informe que resistió bien las cuatro fases:
ninguna de sus conclusiones sobre el código resultó equivocada. Pero **auditó
solo la mitad del problema.** El módulo tiene dos insumos, el código y el
contenido, y el contenido llegó tres pasos después de que se hubiera diseñado
la integración que dependía de él.

Con el HTML sobre la mesa en la Fase 0, la Fase 4 se habría diseñado desde el
principio como quedó al final:

- El panel de bloqueantes a nivel de cuenta como uso **principal**, no como una
  de cinco viñetas.
- **Escalón → `modalidad` del proceso** identificado desde el arranque. Es el
  enlace más fuerte con el producto y no lo vimos hasta reescribir la Fase 4:
  `SecopProceso.modalidad` ya existe en el ELT y el escalón es exactamente la
  llave que lo cruza. Sigue pendiente.
- Sector + Zona planteados desde el inicio como un paso posterior al resultado,
  y no como un "prellenado" que nunca pudo existir.

**Regla para la próxima vez:** cuando un módulo declare una fuente de verdad
externa —un HTML, un CSV, un documento normativo—, esa fuente entra en la
Fase 0. Un reconocimiento que solo mira el código está incompleto por
definición si la mitad de la especificación vive fuera de él.

---

## Otras asunciones que cayeron, por fase

### Fase 1 — el contenido no era el que decía ser

- **"17 remedios".** Son 16 (6 duros, 10 blandos). Error mío de aritmética al
  transcribir. Lo destapó un test de integridad que compara los flags usados
  contra las claves del catálogo. **Lección:** los invariantes de contenido
  —cuántos hay, que sumen 100, que ningún flag apunte al vacío— son tan
  testeables como la lógica, y salen gratis.
- **El prototipo se contradecía a sí mismo** y nadie lo había notado: 90 puntos
  con una inhabilidad activa mostraba "puedes presentarte esta misma semana"
  tres párrafos encima de "la oferta se rechaza sin evaluar nada más". Se
  reportó en vez de arreglarlo por cuenta propia, y la decisión fue no tocar el
  puntaje sino sobreescribir el titular.
- **La escalera ya se autocorregía.** Al analizar qué bloqueantes debían ser
  absolutos, resultó que `rup_no` y `rup_vencido` no necesitan regla: sin RUP
  vigente el escalón cae a mínima cuantía por construcción, y la mínima cuantía
  no exige RUP. El prototipo era más coherente de lo que parecía; el agujero
  real eran dos flags, no seis. **Lección:** antes de añadir una regla, mirar
  si el sistema ya la resuelve por otro camino.

### Fase 2 — la base tenía la última palabra

- **Postgres reordena las claves de un `jsonb`** al almacenarlo (por longitud,
  luego alfabéticamente). Un smoke test contra la Supabase real marcó "ida y
  vuelta distinta"; los datos estaban intactos y lo equivocado era comparar con
  `JSON.stringify`. **Lección:** los mocks no prueban el mapeo de tipos. Media
  hora de smoke test contra la base real valió más que cualquier test unitario
  adicional. Queda anotado en el docstring del store.
- **El reclamo necesitaba tres enganches, no uno.** El prompt decía "en el
  callback de Supabase Auth". El alta con contraseña y sesión inmediata, y el
  login normal, no pasan por ahí.
- **La cookie tenía que morir al reclamarse.** No lo tenía previsto: sin
  borrarla, en un navegador compartido la siguiente cuenta que iniciara sesión
  heredaría el diagnóstico de otra persona. Se borra al reclamar y al cerrar
  sesión.

### Fase 3 — lo que solo se ve renderizando

- Dos defectos de maquetación del medidor que ningún test habría detectado: la
  escala lateral medía el bloque entero en vez del vaso, y en móvil la lectura
  caía debajo del vaso en vez de al lado.
- Una **falsa alarma bien atajada**: `window.scrollTo` parecía no funcionar.
  Antes de "arreglarlo", se comprobó en la home —meses en producción— y hacía
  lo mismo: era el `scroll-behavior: smooth` global, que no anima con el panel
  oculto. **Lección:** ante un comportamiento raro, comprobar primero si es
  preexistente. Arreglar lo que no está roto es peor que no tocarlo.

### Fase 4 — el resumen no puede numerar como el detalle

- El panel de cuenta numeraba 01-03 los tres primeros duros, con dos
  consecuencias malas: la numeración no coincidía con la del plan completo, y
  el bloqueante absoluto —el 4.º duro por orden de pregunta— quedaba fuera de
  la lista. Se retiró la numeración. **Solo se vio renderizando**, en una ruta
  temporal, porque `/mis-coincidencias` exige sesión.
- **Un `.tsx` no se puede importar desde un test** en este repo: el tsconfig de
  Next usa `jsx: "preserve"` y esbuild no lo transforma bajo Vitest. Esa es la
  razón de fondo por la que el repo no tiene tests de componentes, y no se
  supo hasta intentarlo. Empujó a mover la lógica pura fuera del componente,
  que era además el sitio correcto.

---

## Lo que la Fase 0 sí evitó

Vale la pena registrarlo, porque el reconocimiento no salió gratis:

- Habría construido **CQRS, repositories y value objects** en un repo que no
  usa ninguno de los tres: una isla arquitectónica de un solo módulo.
- Habría **configurado Vitest** encima de una suite de 64 archivos ya existente.
- Habría usado una **paleta y una tipografía que no están en `globals.css`** y
  habría inventado glassmorphism, que el tema claro no tiene.
- Habría escrito la FK como `uuid` contra una tabla `usuarios` que no existe
  (es `usuario`, y su `id` es `text`).
- Habría creado una tabla **sin RLS**, reabriendo el agujero que se cerró el
  2026-08-26.
- Habría metido el endpoint bajo el middleware, convirtiendo el `fetch()` del
  cuestionario en un 200 con el HTML de `/login`.

---

## Estado al cerrar

Cuatro fases, cinco commits, 71 archivos de test y 533 tests en verde.
`verdict.ts` sin tocar y la invariante D18 intacta.

**Escalón → `modalidad`: construido** (2026-08-28, después de cerrar la Fase 4).
La tabla de equivalencias salió de un `SELECT DISTINCT modalidad` sobre las
89 585 filas de `proceso`: 15 valores distintos. Al clasificarlos apareció un
dato de producto que no esperábamos: **el 79 % del catálogo no corresponde a
ningún peldaño de la escalera**, y más de la mitad (55 %) es "Contratación
régimen especial" — el régimen privado de la Ley 142 que el propio disclaimer
del diagnóstico declara fuera de alcance. El aviso calla ahí a propósito.
Sobre lo que sí es clasificable, un oferente en mínima cuantía ve el aviso en
el 10 % de los procesos, y uno en licitación pública nunca.

**Sin verificar a mano:** el reclamo con una cuenta real. Está cubierto por
tests de `reclamar.ts` y del callback, pero no se probó de punta a punta
porque requiere credenciales.
