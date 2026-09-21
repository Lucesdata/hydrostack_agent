# Auditoría de los specs de landing v1.2 y mapa v1.4

**Fecha:** 2026-09-21 · **Método:** medido contra la base viva de Supabase y el
árbol de trabajo, no estimado. Las consultas son de solo lectura.

Este documento **complementa** los dos specs; no los sustituye. Responde la
Fase 0 que el propio spec del mapa exige antes de escribir código (§9.4, D-M1,
D-M2) y la auditoría que la landing pone como paso 1 de su orden de
construcción (D8, D4).

Resumen en una línea: **los specs son construibles casi enteros, pero tres
piezas se apoyan en datos que no existen y una decisión de ruta rompería lo que
ya está indexado.** Todo lo demás es trabajo normal.

---

## 1. Ficha técnica del spec del mapa §9.4 — completada

```text
Fuente (dataset/vista/tabla):        proceso (Postgres/Supabase), poblada desde
                                     Socrata p6dx-8zbt vía src/lib/ingest
Definición de proceso abierto:       condicionAbierto() en src/lib/secop/agregados.ts
                                     deleted_at IS NULL
                                     AND estado_apertura = 'Abierto'
                                     AND estado_actual IN ('Publicado','Abierto')
                                     → 35.518 procesos hoy

Campo de ubicación de ejecución:     NO EXISTE
  Verificado en la fuente:           las 59 columnas de p6dx-8zbt solo traen
                                     departamento_entidad, ciudad_entidad,
                                     ciudad_de_la_unidad_de, departamento_proveedor
                                     y ciudad_proveedor. Ninguna es el lugar de
                                     ejecución del contrato.
  Cobertura:                         n/a
  ¿Admite varias ubicaciones?:       n/a

Campo de ubicación de entidad:       departamento_entidad + ciudad_entidad
  Nivel:                             municipio (resuelto a DIVIPOLA de 5 dígitos)
  Formato:                           nombre de texto; se resuelve a código con
                                     geografia_alias (puente texto → DIVIPOLA)
  Cobertura en abiertos del sector:  29.840 de 35.518 = 84,0 %

Base aplicada (locationBasis):       'entidad', siempre
Regla de agregación:                 un proceso = una geografia_id = un municipio;
                                     se agrupa por geografia.departamento_codigo
```

**Consecuencias para las decisiones del mapa:**

| Decisión | Estado tras la auditoría |
|---|---|
| D-M1 · umbral de cobertura para usar ejecución | **Cerrada por inexistencia.** No hay campo de ejecución en la fuente, así que el umbral del 90 % nunca llega a evaluarse. Ojo: tal como está redactada, la regla 9.1 podría leerse como que el 84 % de cobertura bloquea el mapa. No es eso: el umbral solo elige *entre* ejecución y entidad. Con base `entidad`, el 16 % restante va a `unlocated`, que es justo lo que el spec ya prevé. |
| D-M2 · varias ubicaciones de ejecución | **Cerrada por inexistencia.** No aplica. |
| D-M3 · base territorial | **Confirmada:** `entidad`, con el aviso obligatorio en la leyenda. |
| D8 (landing) · campos territoriales y cobertura | **Respondida** con esta ficha. |

**`unlocated` real: 5.678 procesos (16,0 %).** La comprobación de coherencia
L-07 cuadra exactamente: 29.840 + 5.678 = 35.518.

### 1.1 Lo que el spec debe decir y hoy no dice

El mapa con base `entidad` no mide dónde se hará la obra, sino **dónde tiene su
sede quien contrata**. Reparto real de los abiertos:

| Departamento | Abiertos |
|---|---:|
| Antioquia (05) | 5.155 |
| Cundinamarca (25) | 3.357 |
| Bogotá D.C. (11) | 2.658 |
| Valle del Cauca (76) | 2.346 |
| Caldas (17) | 1.747 |
| Santander (68) | 1.709 |

Los 29.840 procesos localizados se reparten entre **91 municipios distintos**,
no entre los ~1.122 del país: las entidades contratan desde las capitales. Dos
consecuencias que conviene fijar en el spec:

1. **El mapa se queda a nivel de departamento.** A nivel municipal, 91 puntos
   sobre 1.122 no es un mapa, es un artefacto de la sede.
2. La leyenda "Según ubicación de la entidad contratante" **no es una nota al
   pie, es la definición de lo que se está viendo.** El spec ya la exige (§15.3);
   solo conviene subirla de categoría.

La geometría está lista para recibir: `geografia` tiene los **33 departamentos**,
con Bogotá D.C. (`11`) y San Andrés (`88`) presentes como códigos propios.

---

## 2. Tres piezas de los specs se apoyan en datos que no existen

### 2.1 La fecha de cierre — el hallazgo que más cambia los specs

De los 35.518 procesos abiertos:

| | Procesos | % |
|---|---:|---:|
| Con `fecha_recepcion` (cierre) | 242 | 0,68 % |
| Con cierre en el futuro | 132 | 0,37 % |
| Cierran en 7 días o menos | 88 | 0,25 % |
| Cierre a más de 7 días | **47** | 0,13 % |

Lo que esto toca, en los dos specs:

| Pieza | Qué le pasa |
|---|---|
| Hero 6.5, ficha destacada | La regla "al menos 7 días hasta el cierre" deja **47 candidatos** de 35.518. Funciona, pero elige entre el 0,13 % del inventario. |
| Banda 7.1, "cierran esta semana" | La cifra real hoy es **88**, no 17. Se renderiza, pero un visitante que ve "35.518 abiertos · 88 cierran esta semana" saca una conclusión falsa sobre el resto. |
| Vitrina 8.2, pestaña `Cierran pronto` | 88 fichas. Es una pestaña de tres que cubre el 0,25 % del catálogo. |
| Vitrina 8.3, orden "cierre más próximo" | Solo ordena esas 88. |
| FichaCard 9.2, `Cierra 24 sep · faltan 8 días` | Cae en "Fecha no publicada" en el **99,3 %** de las tarjetas. |
| **Semáforo 9.3 + criterio L-16** | Es el problema serio. L-16 dice que al visitante **solo se le colorea PLAZO**, y PLAZO se calcula con la fecha de cierre. Resultado: el semáforo del visitante sale **gris entero en el 99,3 % de las fichas**. La única función que la tarjeta ofrece a quien llega sin cuenta no funcionaría casi nunca. |

**Por qué pasa y qué hacer.** El esquema ya lo dice: `estado_apertura` es "la
señal real de plazo" (`hechos.ts`), y por eso `condicionAbierto()` se apoya en
él y no en fechas. La fuente publica de forma fiable *si la ventana está
abierta*, no *cuándo se cierra*.

Propuesta concreta para el spec (sustituye a 9.3 en la fila PLAZO):

- **PLAZO para el visitante es binario**, derivado de `estado_apertura`:
  "Abierto para ofertas" en verde, "Cerrado" en gris. Eso sí está en el 100 % de
  las filas y es verdad.
- **La cuenta atrás aparece solo cuando hay fecha** (132 procesos hoy) y entonces
  sí se aplican los umbrales de D3 (15 / 5 días).
- **`Cierran pronto` deja de ser pestaña** y pasa a ser un aviso dentro de la
  ficha y un orden secundario. Una pestaña que cubre el 0,25 % del catálogo
  incumple el principio 2.2.6 del propio spec: parece un camino y es un callejón.
- La banda puede seguir mostrando "88 cierran esta semana" **si el texto dice de
  cuántos**, p. ej. "88 con fecha de cierre esta semana". Sin esa precisión, la
  cifra engaña.

D3 (umbrales 15/5) queda **en suspenso**: validar umbrales con ingenieros sobre
132 procesos de 35.518 es gastar una reunión en el 0,37 % del producto.

### 2.2 D4, los rangos de CUANTÍA por modalidad, no funcionan

Reparto de modalidad entre los abiertos:

| Modalidad | Procesos | % |
|---|---:|---:|
| Contratación régimen especial | 35.115 | **98,9 %** |
| Contratación directa | 147 | 0,4 % |
| Selección Abreviada de Menor Cuantía | 72 | 0,2 % |
| Mínima cuantía | 40 | 0,1 % |
| Licitación pública (las dos formas) | 34 | 0,1 % |
| El resto | 110 | 0,3 % |

El spec propone que la compuerta CUANTÍA muestre en gris "Mínima cuantía",
"Menor cuantía" o "Licitación". Esas tres etiquetas cubren **146 procesos de
35.518**. El 98,9 % de las tarjetas diría "Contratación régimen especial", que no
informa de ninguna cuantía.

No es un defecto de los datos: el sector es de **empresas de servicios públicos
regidas por la Ley 142**, que contratan bajo derecho privado. Es el mismo hecho
que ya tiene abierta la §12 de `PENDIENTES.md` para el cuestionario de
diagnóstico.

**Mejor respuesta para D4:** `valor_estimado` está poblado en **34.783 de 35.518
(97,9 %)**. La compuerta CUANTÍA en gris debe enunciar **la cuantía real
abreviada**, que es lo que el usuario necesita, y los rangos por modalidad
quedan como matiz para el 1,1 % donde la modalidad sí significa algo.

Esto encaja con una decisión ya tomada y medida: la fila densa perdió su columna
de presupuesto porque, sin perfil, la compuerta ya enuncia el valor y la fila
decía "$350 M" dos veces (TRASPASO §4.9). **El FichaCard de 9.1 reintroduce esa
duplicación**: imprime `$2.340 M COP` en el cuerpo y además `○ CUANTÍA` en el
semáforo. Con perfil, el cuerpo lleva la cifra y la compuerta la juzga; sin
perfil, solo una de las dos.

### 2.3 Sentry no existe en el proyecto

Los specs lo dan por hecho dos veces (landing 8.5, mapa §19). No hay ninguna
dependencia de Sentry en `package.json`. Lo que **sí** hay:

- `@vercel/analytics` instalado,
- `src/lib/signals/record-signal.ts`, la captura pasiva de señales.

Los ocho eventos de la §13 deben montarse sobre eso. Añadir Sentry es una
dependencia nueva, o sea una decisión tuya, no del agente.

---

## 3. Dos decisiones del spec que romperían cosas que hoy funcionan

### 3.1 D11: mover el listado a `/procesos`

El spec recomienda `/procesos` y `/procesos/[id]` con 301 desde `/licitaciones`.
Lo que hay construido y en producción bajo `/licitaciones`:

- la ficha `app/licitaciones/[slug]/page.tsx`, con slug `texto--CO1.REQ.N`,
  `generateMetadata`, Schema.org `GovernmentService` y canónica;
- **43 rutas facetadas** en tres familias (`/tipo`, `/departamento`, `/entidad`),
  con su paginación en el camino;
- `app/sitemap.ts` con las 43 facetas y 2.000 fichas recientes, más `robots.ts`;
- tests que impiden que una ruta con nombre quede sin puerta en el nav
  (`nombres.test.ts`).

Renombrar la ruta significa rehacer todo eso, publicar 2.000 canónicas nuevas y
pedirle a Google que reindexe, a cambio de una palabra en la URL.

**D9 y D11 son separables, y conviene separarlas:**

- **D9 (vocabulario) sí:** que header, hero, vitrina y emails digan siempre
  "Fichas de procesos". Es cambio de etiqueta, cuesta poco y cumple el principio
  2.2.2. Además hoy no aparece esa etiqueta en ningún sitio del código.
- **D11 (ruta) no ahora:** `/licitaciones` se queda. La etiqueta y la ruta no
  tienen por qué coincidir, y el usuario lee la etiqueta.

Y un detalle de 9.1: el ID de ejemplo del FichaCard es `CO1.PCCNTR.1234567`, que
es un **id de contrato**. El de proceso es `CO1.REQ.…`, que es el que lleva el
slug de la ficha.

### 3.2 `?departamento=` y `?pagina=2` vuelven la portada dinámica

El spec pide que la selección del mapa escriba `/?departamento=valle-del-cauca`
(§6.4, §22) y que la vitrina pagine con `?pagina=2` (8.4, L-14).

En este repo eso choca con una decisión medida: **las rutas facetadas no leen
`searchParams` a propósito**, porque leerlo las marca como dinámicas y cada
visita pasa a ser una invocación facturable. Por eso la paginación existente va
en el camino (`/pagina/2`). La portada, además, cuesta **836 ms de agregados**;
volverla dinámica es pagar eso en cada visita.

**Propuesta, que además acorta el camino del usuario:** el clic en el mapa no
filtra la portada, **navega a la faceta que ya existe**,
`/licitaciones/departamento/valle-del-cauca`. Esa ruta ya está construida,
prerrenderizada, indexada y paginada, y muestra exactamente las fichas de ese
departamento. Sigue siendo **un clic hasta la lista y dos hasta la ficha**, que
es el objetivo 2.2.5, y de paso el estado del filtro se vuelve compartible sin
inventar parámetros.

Si prefieres conservar el filtro dentro de la portada, la alternativa es una isla
de cliente que filtre una vitrina ya servida, sin tocar `searchParams` en el
servidor; el precedente es `SemaforoConPerfil.tsx`, que cuesta 2,3 kB y mantiene
la ruta estática.

---

## 4. El sistema visual del spec reintroduce un fallo ya corregido

La §4 de la landing propone fondo `#F7F5EF`, acento `#1D6FA5` y un semáforo
`#2E8B57 / #C98A1B / #B23A3A / #8A8F98`. Medido con la misma fórmula que usa el
test del repo, sobre el crema que propone el propio spec:

| Color del spec | Contraste | AA para texto pequeño (4,5:1) |
|---|---:|---|
| Verde `#2E8B57` | 3,89:1 | **FALLA** |
| Ámbar `#C98A1B` | 2,70:1 | **FALLA** |
| Gris `#8A8F98` | 2,98:1 | **FALLA** |
| Rojo `#B23A3A` | 5,41:1 | pasa |

Contra los tokens que hay hoy, sobre el fondo real `#FAFAF7`:

| Color del repo | Contraste | AA |
|---|---:|---|
| Verde `#15803D` | 4,80:1 | pasa |
| Ámbar `#B45309` | 4,80:1 | pasa |
| Rojo `#B91C1C` | 6,19:1 | pasa |

Las compuertas se pintan a 11,5 px. Adoptar la paleta del spec devolvería
exactamente el fallo que se corrigió el 2026-09-15: **el usuario leía bien "no
puedes" y mal "sí puedes"**, porque el rojo pasaba y el verde no. Y
`src/__tests__/design/contraste.test.ts` lo tumbaría en CI.

Los dos acentos son el mismo azul a efectos prácticos: `#1D6FA5` y `#0369A1`
difieren un 6,1 %, y ambos pasan AA con texto blanco (5,43:1 y 5,93:1).

**Recomendación:** mantener los tokens actuales y tomar del spec el
**vocabulario**, que ya existe como alias (`--text-primary`, `--surface-elevated`,
`--accent-deep`, `--border`, `--card`). El spec puede escribirse entero con esos
nombres sin cambiar un píxel.

**Tipografía:** el spec pide IBM Plex Sans Condensed para titulares. Hoy se
cargan cinco familias, 181 kB en 11 archivos, y Plex Sans Condensed sería la
sexta. Con el criterio de rendimiento de §14 delante, si entra esa familia
debería salir otra.

---

## 5. Lo que los specs dan por construir y ya existe

El spec del mapa lo pide explícitamente en su §8 ("leer CLAUDE.md y /docs antes
de implementar"). Esto es lo que encontraría:

| El spec pide | Ya existe |
|---|---|
| Definición única de "abierto" | `condicionAbierto()` y `ESTADOS_ABIERTO` en `src/lib/secop/agregados.ts`. El mapa y la vitrina **deben** importarla, no reescribirla |
| Una sola consulta agregada por departamento | `procesosPorDepartamento()`, ya usada por las rutas facetadas |
| Tabla territorial DIVIPOLA ↔ nombre ↔ slug (§10.3) | `geografia` (33 departamentos, PK DIVIPOLA) + `geografia_alias` (puente texto → código, que es justo la normalización de §10.2) + `slugificar()`. **No hay que crear un archivo nuevo de 33 entradas**; hay que exponer una vista de lo que ya está |
| Semáforo como modelo de vista | `src/lib/secop/semaforo.ts` (14 tests) y `src/components/secop/semaforo/` |
| Tarjeta/fila de proceso | `FilaProceso.tsx` (fila densa) y `PaginaFaceta.tsx` (cabecera con conteo + lista + paginación) |
| Vitrina paginada | Ya funciona en las tres familias facetadas, con paginación por camino |
| Cinco compuertas | `verdict.ts`: `sectorial`, `cuantia`, `plazo`, `ubicacion`, `habilitacion` |
| SEO de la ficha | `generateMetadata`, Schema.org, canónica, `sitemap.ts`, `robots.ts` |
| Nav y pie desde una sola fuente | `seccionesHome.js` (`NAV_PRINCIPAL`, `COLUMNAS_PIE`, `MENU_CUENTA`) |
| Caché/revalidación | ISR ya calibrado: facetas 6 h, fichas 12 h, sitemap 12 h |

**Sobre el objetivo de caché de 1 h** (landing §11): se midió que lo que manda no
es el coste sino la cadencia de la ingesta, que llega a saltos de dos o tres
días. La portada debería revalidar con ese criterio, no con un número redondo.

---

## 6. Huecos del spec, con lo que propongo en cada uno

1. **La regla de las 48 h de la banda (7.2, L-11) sí tiene fuente: `sync_log`.**
   *(Corregido el 2026-09-21: la primera versión de este documento afirmaba que
   no existía tabla de ejecuciones y que nadie disparaba la ingesta. Las dos
   cosas eran falsas; venían de repetir el `"crons": []` del `TRASPASO.md`, que
   está desactualizado.)*
   `sync_log` (`src/lib/db/schema/control.ts`) registra cada corrida por fuente
   con `started_at`, `finished_at`, `status` (`running | ok | failed | partial`)
   y `records_ingested`. La consulta de la banda es
   `max(finished_at) WHERE status='ok'`, que es literalmente "última ejecución
   correcta de la ingesta".
   El cron **está programado y corriendo**: `vercel.json` declara
   `/api/cron/tick` a las `0 11 * * *`, un despachador que existe porque el plan
   Hobby solo admite dos crons, y que ejecuta la ingesta más las etapas del SDD.
   Verificado en la base: corrida `ok` hoy 2026-09-21 a las 11:56 UTC con 113
   procesos y 43 contratos; ayer, 390 y 304.
   **Lo que sí hay que mirar:** entre el 2026-09-12 y el 2026-09-20 no hay
   ninguna corrida, ocho días de silencio que nadie detectó — exactamente lo que
   la regla de las 48 h serviría para enseñar. Y `/api/cron/alertas` **no está
   declarado en `vercel.json`**, pese a que el comentario de `tick` dice que hay
   dos entradas: es el envío diario de alertas, caído, que `PENDIENTES.md` §0 ya
   tiene abierto.
2. **Falta el quinto estado del semáforo.** Sin perfil, el repo no pinta verde:
   usa `DATO`, porque verde diría "usted califica" cuando solo se sabe que el
   proceso es de acueducto. El cuadro 9.3 no lo contempla y debería.
3. **`Ingresar` no es solo Google.** También hay correo y contraseña.
4. **La fila de perfil de la vitrina necesita una decisión de esquema**, no de
   diseño: persistencia sin cuenta, con el patrón de `diagnostico`
   (`session_token` en cookie httpOnly, fila reclamable al registrarse).
5. **El semáforo sobra en la pestaña de adjudicados.** En un proceso ya
   adjudicado, cuatro compuertas de elegibilidad no informan de nada.
6. **La ficha destacada necesita ser determinista sin guardar estado.** La
   rotación "3 días consecutivos" implica memoria. Con el día como semilla sobre
   la lista ordenada de candidatos se consigue lo mismo, sin tabla y sin romper
   la caché.
7. **"La landing no consulta Supabase directamente" (L-20) ya se cumple por
   construcción**, y conviene decir por qué: los datos van por Drizzle con
   conexión Postgres directa; el cliente de Supabase solo se usa para auth. Las
   23 tablas tienen RLS activo sin políticas, así que una consulta desde el
   navegador devolvería `[]`.
8. **La imagen de la planta no está eliminada: está duplicada.** Se añadió a
   `/nosotros` pero **sigue importada y renderizada en la portada**
   (`app/page.js:10` y `:823`). L-02 sigue abierto, y el PNG de 994 kB —el 57 %
   del peso de la portada— se sigue sirviendo en la puerta de entrada.
9. **El título global del sitio ya se fijó** el 2026-09-15; la §12 debería
   contrastarse con el que hay antes de cambiarlo.

---

## 7. Mejoras que propongo añadir a los specs

1. **Convertir L-07 en test, no en revisión visual.** La coherencia
   `suma(mapa) + unlocated = abiertos` es una consulta; hoy da 29.840 + 5.678 =
   35.518. Es el tipo de invariante que se rompe en silencio seis meses después.
2. **Fijar el presupuesto de peso de la portada como criterio de aceptación.**
   Hoy son 113 kB de First Load JS, LCP 384 ms y CLS 0 en producción. El criterio
   "Lighthouse no puede bajar" no es comprobable; "el First Load JS de `/` no
   pasa de 113 kB" sí. Refuerza la decisión de dibujar el SVG sin librería.
3. **Declarar el orden de tabulación del mapa como dato, no como cálculo.** §18
   pide orden alfabético; con la tabla territorial ordenada una vez, sale gratis.
4. **Añadir a la leyenda el número, no solo la base.** "5.678 procesos sin
   ubicación informada (16 %)" dice más que la frase sola, y es el mismo dato que
   evita que el usuario sume y no le cuadre.
5. **Usar `unmatchedCodes` desde el primer día.** Ya existe el mecanismo
   equivalente: `geografia_alias`. Todo nombre nuevo que no resuelva debería
   quedar registrado, porque cada alias que falta es un proceso que desaparece
   del mapa sin avisar.

---

## 8. Orden de construcción revisado

Respecto al orden de la §17 de la landing, con lo que ya existe y lo que
bloquea:

| # | Paso | Estado |
|---|---|---|
| 1 | Auditoría de fuente, campos territoriales y modalidad | **Hecha, es este documento** |
| 2 | Tabla territorial DIVIPOLA ↔ nombre ↔ slug | Reducido a exponer `geografia` + `slugificar()` |
| 3 | Decidir §2.1 (plazo), §2.2 (cuantía), D11 y el filtro del mapa | **Te toca a ti**, bloquea el diseño del FichaCard |
| 4 | FichaCard con las tres variantes | Libre, componiendo `semaforo.ts` |
| 5 | Vitrina: pestañas, filtro, estados | Libre; las pestañas dependen del punto 3 |
| 6 | Banda de datos vivos | Libre salvo la regla de frescura |
| 7 | Geometría y `ColombiaChoropleth` | **Bloqueado: falta el TopoJSON** |
| 8 | Integración mapa ↔ vitrina ↔ URL | Bloqueado por 7 y por la decisión de 3 |
| 9 | Retirar `PlantaHero` de la portada | Libre, y recupera 994 kB |
| 10 | SEO, analítica, accesibilidad, L-01…L-20 | Libre al final |

Los pasos 4, 5, 6 y 9 **no dependen del TopoJSON**. Si quieres avanzar mientras
llega el archivo, ahí es donde hay trabajo real.

---

## 9. Decisiones

### 9.1 Cerradas el 2026-09-21

| # | Decisión | Qué implica |
|---|---|---|
| **A** | **PLAZO es binario, con cuenta atrás parcial.** Sale de `estado_apertura`: "Abierto para ofertas" o "Cerrado", cierto en el 100 % de las filas. La cuenta atrás y los umbrales de D3 solo se aplican a los 132 procesos con fecha de cierre. | `Cierran pronto` **deja de ser pestaña**: pasa a ser un aviso dentro de la ficha y un orden secundario. La vitrina queda con dos pestañas, `Abiertos` y `Adjudicados recientes`. Deroga el criterio L-16 tal como está redactado. |
| **B** | **La cuantía sale de `valor_estimado`**, abreviada, con 97,9 % de cobertura. La modalidad queda como matiz para el 1,1 % donde significa algo. | La compuerta CUANTÍA enuncia la cifra; **el cuerpo de la tarjeta no la repite**. Cierra D4 y evita la duplicación que ya se corrigió en la fila densa (TRASPASO §4.9). |
| **C** | **`/licitaciones` se conserva.** Solo cambia la etiqueta a "Fichas de procesos" en header, hero, vitrina y emails. | D9 se cumple, **D11 se descarta**. No se tocan las 43 rutas facetadas, el sitemap de 2.000 fichas ni las canónicas indexadas. |
| **D** | **El clic del mapa navega a la faceta existente**, `/licitaciones/departamento/[slug]`. | No hay `?departamento=` en la portada, que sigue siendo estática. Sustituye a §6.4 y §22 del spec del mapa: la landing traduce código → slug y **navega**, en vez de filtrar S3 en el sitio. El objetivo 2.2.5 se mantiene: un clic hasta la lista, dos hasta la ficha. |

| **F** | **Se conservan los tokens de color actuales.** `--bg #FAFAF7`, `--accent #0369A1` y el semáforo en el escalón -700, que pasa AA en los tres colores. | Del spec se adopta el **vocabulario**, que ya existe como alias: `--text-primary`, `--text-muted`, `--surface-elevated`, `--accent-deep`, `--border`, `--card`. La §4 de la landing se reescribe con esos nombres. Ningún píxel cambia y `contraste.test.ts` sigue en verde. |
| **G** | **Sentry no se instala.** Los estados de error de la vitrina y el mapa registran con `@vercel/analytics` y `src/lib/signals/record-signal.ts`. | Cero dependencias nuevas en la ruta crítica de una portada que está en 113 kB. Sustituye las menciones a Sentry en landing 8.5 y mapa §19. |
| **H** | **Sin trabajo: el cron ya está programado y corriendo.** `vercel.json` declara `/api/cron/tick` a las `0 11 * * *`, que ejecuta la ingesta. Verificado en `sync_log`: corrida `ok` el 2026-09-21 a las 11:56 UTC. | La decisión se tomó sobre una premisa falsa —ver §6.1— y al ir a aplicarla resultó estar hecha. Queda en su lugar una tarea real: **`/api/cron/alertas` no está declarado** y hubo un hueco de ocho días sin corridas (12→20 de septiembre). |
| **J** | **El perfil sin cuenta se persiste con el patrón de `diagnostico`**: `session_token` en cookie httpOnly, fila anónima reclamable al registrarse, validando que el token tenga forma de UUID antes de usarlo en un `WHERE`. | Toca esquema: tabla nueva, que **nace con `.enableRLS()`**. Desbloquea la fila de perfil de la vitrina (TRASPASO §7, punto 7) y retira el `localStorage` del `OferenteWizard` cuando esté. |

| **I** | **D3 se queda en 15/5 días, sin validación externa**, marcado como provisional en el código. | Tras la decisión A solo afecta a los 132 procesos con fecha de cierre. Se revisa si la fuente empieza a publicar fechas. |
| **K** | **D6 se aplaza** hasta antes del lanzamiento. | Sigue siendo requisito de lanzamiento, no de desarrollo. Llega cuando se escriban `/terms` y `/privacy` (`PENDIENTES.md` §18). |

### 9.2 Abiertas

| # | Pregunta | Estado |
|---|---|---|
| E | TopoJSON de los 33 departamentos | No es decisión: es el archivo que falta. **Es lo único que bloquea el mapa** |
