# Rediseño de portada y vitrina — estado y traspaso

**Fecha de corte:** 2026-09-15 · **Rama:** `main`, **sin commitear** · 933 tests en
verde, build y lint limpios.

Este documento existe para que otra persona —u otro modelo— pueda retomar el
trabajo sin reconstruir el contexto. Léelo entero antes de tocar nada: hay
decisiones que parecen arbitrarias y no lo son, y trampas del entorno que cuestan
una hora cada una si se descubren a golpes.

El spec original define seis tareas (0 a 5). Abajo, qué está hecho, qué falta y
qué lo bloquea.

---

## 1. Estado por tarea

### ✅ Tarea 0 — Reconocimiento
Completa. Los hallazgos que importan están repartidos por este documento.

### ✅ Tarea 1 — Taxonomía de cinco tipos
Completa y **en producción**.

- `src/lib/classify/tipo-proyecto.ts` — los cinco valores como constante
  compartida (`TIPOS_PROYECTO`, `TIPO_PROYECTO`, `TIPO_POR_SLUG`) y el
  clasificador. 18 tests.
- `drizzle/0024` aplicada: `proceso.tipo_proyecto` + `_confianza`, `_segundo`,
  `_version`, con índice.
- Backfill de las 90.622 filas hecho. Reparto: acueducto 31.498 ·
  alcantarillado 12.225 · ptar 7.712 · ptap 5.577 · otros 33.610.
- Cableado en la ingesta (`writers.ts`), en INSERT y en `ON CONFLICT`.
- Recomputar: `npm run db:tipo-proyecto --todas` tras subir
  `CLASIFICADOR_TIPO_VERSION`.

Abierto como **decisión de producto**, no como trabajo: `PENDIENTES.md` §28
(7.496 filas con etiqueta elegida por convención) y §29 (`otros` es el 35 % de
los abiertos y sería la barra más larga de la faceta).

### 🟡 Tarea 2 — Landing de escritorio · **EL GRUESO FALTA**

**`app/page.js` sigue intacto con sus diez secciones.** Es el bloque central del
spec y está parado — ver §2 de este documento.

| Sub-bloque | Estado |
|---|---|
| 2.1 Ticker | sin tocar; el spec dice "se queda tal cual" pero vive dentro de la página vieja |
| 2.2 Hero + mapa | ❌ **bloqueado por el TopoJSON** |
| 2.3 Banda de métricas | ❌ |
| 2.4 Navega por los datos | ❌ las tres tarjetas; su capa de datos y sus rutas destino **sí existen** |
| 2.5 Vitrina | ❌ (es la Tarea 3) |

Traslados de secciones: **hechos** la ilustración isométrica → `/nosotros` y
"Qué te llevas sin pagar" → `/precios` (ruta nueva). **Pendientes**:
"Inteligencia de mercado" → `/competidores`, bajar las 4 puertas a 2, eliminar
"Cómo funciona", eliminar el cierre, y convertir la fila de 4 métricas en banda
propia.

**Sí está construida toda la capa que la portada necesitará:**

- `src/lib/secop/agregados.ts` — los tres `GROUP BY` (territorio, tipo, clase de
  entidad) y la definición única de "abierto". No había ningún agregado en el
  producto antes de esto.
- `src/lib/secop/clase-entidad.ts` — cinco clases, regla escrita una vez y
  emitida a TypeScript y a SQL.
- `src/lib/secop/facetas.ts` + las tres familias de rutas.

### 🟡 Tarea 3 — Vitrina

**Hechos los cimientos**, ya funcionando en las rutas facetadas:

- `src/lib/secop/semaforo.ts` — modelo de vista puro. 14 tests.
- `src/components/secop/semaforo/` — el componente, dos disposiciones.
- `src/components/secop/lista/FilaProceso.tsx` — la fila densa.

**Pendiente la vitrina en sí**: encabezado con conteo y selector de orden, la
**fila de perfil** en cuarta posición, el **contador de descartados** y la
paginación. Vive en la portada, así que hereda el bloqueo — salvo la fila de
perfil, que además necesita persistencia sin cuenta (ver §5).

### 🟢 Tarea 4 — Ficha pública

Construida y verificada en el navegador: `app/licitaciones/[slug]/page.tsx`.

- Slug: `texto-legible--CO1.REQ.N`. El doble guion es deliberado (§4).
- `generateMetadata` con objeto + municipio + tipo; Schema.org
  `GovernmentService`; canónica.
- `app/sitemap.ts` (fijas + 43 facetas + 2.000 fichas recientes) y
  `app/robots.ts`. No existía ninguno de los dos.
- Las filas de las listas ya enlazan aquí y no al SECOP II.

**Pendientes de la Tarea 4:**
1. La versión **relativa** del semáforo (con perfil). Hoy solo la absoluta.
2. El **título global del sitio** — el spec pide proponer alternativa y no se
   hizo.
3. El **coste estimado de invocaciones** del ISR, que el spec pide
   explícitamente antes de fijar el intervalo. Hoy: fichas `revalidate = 3600`,
   facetas `1800`, sitemap `21600`. Nadie ha echado la cuenta contra el plan
   Hobby.

### 🟢 Tarea 5 — Limpieza

Hechos: corchetes fuera de los CTA que sobreviven, nav y pie derivados de una
sola fuente, numeración `01/ 02/` eliminada, nav nuevo (Licitaciones · Pliegos ·
Alertas · Nosotros), mono en mayúsculas solo en etiquetas de métricas, `/cuenta`
y `/mis-coincidencias` alcanzables.

Resultó que las listas de navegación eran **tres**, no dos: el menú de usuario
era una tercera, y la única que enlazaba `/perfil` y `/diagnostico/historial`,
dos rutas que ni siquiera estaban en el catálogo. Ahora las tres salen de
`src/components/landing/seccionesHome.js` (`NAV_PRINCIPAL`, `COLUMNAS_PIE`,
`MENU_CUENTA`) y hay tests que impiden que una ruta con nombre quede sin puerta.

**Pendiente**: el `OferenteWizard` sigue guardando en `localStorage`.

---

## 2. El bloqueo: geometría del mapa

El hero del spec es 5/12 de mensaje y 7/12 de mapa departamental. **No hay
geometría en el repo:** `data/dane/divipola.ts` es un crosswalk de nombres y
códigos (23 KB de texto, sin polígonos) y `public/` solo tiene un PNG.

Decidido con el usuario el 2026-09-15:

- **Él aporta el TopoJSON** de límites departamentales.
- **Coropleta sin marcadores.** `geografia` no tiene coordenadas y solo cubre
  **62 de los ~1.122 municipios**, así que los puntos por municipio que pedía el
  spec no se pueden pintar con datos reales.

**Contrato que espera el código cuando llegue el archivo:** un TopoJSON (o
GeoJSON) de los 33 departamentos donde cada geometría lleve el **código DIVIPOLA
de dos dígitos** como propiedad. Es la llave que une con
`geografia.departamento_codigo`, que es lo que devuelve
`procesosPorDepartamento()`. Si el archivo trae solo nombres, habrá que
slugificarlos y cruzarlos con `slugificar()` — funciona, pero es más frágil.

No se montó un hero provisional a propósito: diseñarlo sin mapa significa
diseñarlo dos veces.

---

## 3. Realidad de los datos — lo que está vacío

Medido sobre la base viva el 2026-09-15. **Esto condiciona qué se puede construir
y qué no.** No inventar cifras para rellenar estos huecos.

| Tabla / campo | Estado | Qué bloquea |
|---|---|---|
| `requisitos_proceso` | **0 filas** | "Qué exige el pliego" (bloque 4 de la ficha) |
| `pliego_proceso` | **0 filas** | cronograma, anticipo, plazo de ejecución, parámetro técnico |
| `documento` | **0 filas** | bloque de documentos |
| `document_access` | 90.454 UNKNOWN, 167 NOT_PUBLISHED, 1 RESTRICTED, **0 PUBLIC** | el extractor de pliegos no tiene nada que extraer |
| `clasificacion_sectorial` | **0 filas** | nada hoy; el filtro "solo agua" va por keywords |
| **Fecha de cierre** | **no existe en el dataset** | el spec pide ordenar por "cierre más próximo" y pintar cuenta regresiva. Solo 121 de los 35.222 abiertos tienen `fecha_recepcion` futura |
| `al_oferentes_historico` | **27.035 filas, 5.674 oferentes, 14.245 procesos** | ✅ sí hay datos: alimenta "Quién suele competir aquí" |
| `geografia` | 33 departamentos completos, **62 municipios de ~1.122**, sin coordenadas | coropleta sí, marcadores no |
| Procesos sin geografía | **5.645 de 35.222 abiertos** | la suma por departamento nunca cuadra con el total. Es correcto; hay que decirlo donde se muestre |

---

## 4. Decisiones que NO hay que deshacer

Cada una costó una medición. Revertirlas sin leer el porqué reintroduce un fallo.

1. **La paleta NO cambió a crema.** El spec pedía `#F7F5EF` / `#1D6FA5`. Medido:
   2,3 % de diferencia en el fondo y 6,1 % en el acento, a cambio de bajar
   `--ink-300` por debajo de AA y colapsar `--surface-alt` contra el fondo
   (1,01:1, el mismo color). Se adoptó el **vocabulario** (`--text-primary`,
   `--surface-elevated`, `--border`, `--card`…) como alias. Detalle en
   `CLAUDE.md` §3.

2. **`--surface` NO significa el crema.** Vale blanco en 18 sitios. El crema es
   `--bg`.

3. **Los tres colores semánticos están en el escalón −700** (`#15803D`,
   `#B45309`, `#B91C1C`). Los −600 anteriores no llegaban a AA como texto de
   11,5 px. Lo vigila `src/__tests__/design/contraste.test.ts`, que lee los
   tokens reales del CSS y también comprueba los tintes `rgba()` — que es donde
   se caía el rojo.

4. **El clasificador de tipo es textual, no por UNSPSC.** La clase 831015
   concentra 16.444 procesos y contiene los cuatro tipos a la vez. El UNSPSC solo
   desempata.

5. **Se poda la razón social del texto antes de clasificar.** Sin eso, un
   contrato de imprimir facturas de una "Empresa de Acueducto, Alcantarillado y
   Aseo" puntúa como acueducto. 27.641 filas llevan poda.

6. **Coincidencia por palabra completa, nunca por subcadena.** `colector` casaba
   dentro de `recolector` y etiquetaba 1.890 procesos como alcantarillado. El
   mismo fallo apareció **dos veces más** el mismo día: en un test que buscaba
   `excluded.tipo_proyecto` con `includes()` (casaba dentro de
   `excluded.tipo_proyecto_confianza` y no detectaba nada) y en el slug SQL de
   departamento. Desconfía de todo `includes()` sobre identificadores.

7. **Las rutas facetadas no leen `searchParams`.** Leerlo las marca como
   dinámicas y cada visita es una invocación facturable. La paginación va en el
   camino (`/pagina/2`).

8. **`generateStaticParams` devuelve `[]` a propósito** en facetas y ficha.
   Prerrenderizar ataría cada build a la base de producción — se probó y las
   consultas fallaban contra el pooler.

9. **La fila densa no tiene columna de presupuesto ni de lugar.** El spec dibuja
   cinco columnas, pero esa fila asume un semáforo **con perfil**. Sin perfil la
   compuerta enuncia el valor y la fila decía "$350 M" dos veces. Se quitaron las
   columnas, no el semáforo. Cuando haya perfil, la cifra puede volver.

10. **El semáforo tiene un quinto estado, `DATO`.** Los cuatro de `verdict.ts`
    presuponen un perfil; sin él, pintar verde diría "calificas" en vez de "el
    proceso es de acueducto".

11. **El slug de la ficha usa doble guion** (`texto--CO1.REQ.N`). Partir por el
    último `-` truncaría el id en cuanto el objeto lleve un guion, que es casi
    siempre.

---

## 5. Deuda conocida, con su porqué

Todo en `PENDIENTES.md` §22–§36. Los que más pesan:

- **§27 resuelto**, pero ojo: si se sube `CLASIFICADOR_TIPO_VERSION` hay que
  correr el backfill o conviven dos versiones.
- **§22 / §23** — el semáforo VIEJO (`clr-elig-seg--unknown` en
  `SecopExplorer.tsx`) pinta UNKNOWN con `--line`: 1,26:1 contra la tarjeta
  cuando un elemento no textual exige 3:1. Es invisible. El componente nuevo ya
  no tiene ese fallo; el viejo se retira cuando la vitrina sustituya esa
  superficie.
- **§24** — `body { background: var(--deep1) }` en `globals.css`: el body se
  pinta casi negro con un token del tema oscuro muerto. No se ha observado que
  se vea, pero está ahí.
- **§31** — `raw_record` ocupa 247 MB con los payloads **ya vacíos**: ~200 MB
  recuperables con `VACUUM FULL`. La base está a 505 MB contra el techo de 500
  del plan Free. Es la palanca grande para la cuota.
- **§36** — seis archivos del repo no pasan Prettier y **ninguno es de este
  trabajo**: `db-search.ts`, `ProcesosTicker.jsx`, `S5DarkClosing.jsx`,
  `nombres.test.ts`, `app-url.test.ts`, `writers-campos.test.ts`. El CI exige
  formato, así que **cualquier PR falla por esto** antes de mirar el contenido.

---

## 6. Trampas del entorno

Las cuatro me mordieron a mí. Están aquí para que no muerdan dos veces.

1. **Nunca `npm run build` con el servidor de desarrollo levantado.** La build de
   producción pisa `.next` y la página sale en negro con "Cannot find module
   ./vendor-chunks". Parece un fallo del código y no lo es. Parar el preview,
   `rm -rf .next`, reiniciar.

2. **Un `UPDATE` masivo puede tumbar la base.** Postgres no actualiza en sitio:
   reescribe la fila y deja la vieja muerta. Un `UPDATE` de las 90.622 filas de
   `proceso` (138 MB) puede añadir otros 138 MB. Con la base a 505 MB contra un
   techo de 500, eso deja el proyecto sin escritura. El backfill de la Tarea 1
   creció **1 MB** porque va en lotes de 2.000 con `VACUUM` cada 5 — copiar ese
   patrón (`scripts/backfill-tipo-proyecto.ts`), no inventar otro.

3. **Las capturas del navegador salen negras si el panel está oculto.** La página
   no se pinta mientras no se muestra. No es un defecto del producto. Verificar
   por DOM (`read_page`, `javascript_tool`) cuando pase.

4. **Los scripts de edición por búsqueda de texto se quedan obsoletos** en cuanto
   Prettier reformatea entre tanda y tanda. Como la escritura ocurre al final,
   el archivo no se toca y `tsc` dice "ok" sobre código sin cambiar. **Verificar
   contra `git diff`, no contra la salida del propio script.**

---

## 6 bis. Coste del ISR — medido el 2026-09-15

El spec pedía estimar las invocaciones antes de fijar los intervalos. Aquí está.

**Tiempo de generación por página** (solo consultas a la base, medias de 3
corridas en caliente):

| Página | ms |
|---|---:|
| faceta `/tipo/ptar` | 68 |
| faceta `/departamento/antioquia` | 306 |
| faceta `/entidad/esp` | **363** (era 2.612 — ver abajo) |
| ficha (proceso + competidores) | 109 |
| agregados de portada (4 consultas) | 836 |
| sitemap (43 facetas + 2.000 fichas) | 260 |

**La faceta de entidad se optimizó 7×.** El `CASE` de expresiones regulares que
deriva la clase se evaluaba en el JOIN, o sea una vez por proceso —21.262 veces
para ESP— cuando la clase depende solo de la entidad. Pasado a subconsulta sobre
`entidad` (4.223 filas), 2.612 ms → 363, con totales idénticos.

Se probó el mismo truco en el agregado de la portada y **no sirvió**: 884 ms
frente a 783, o sea peor. Ahí hacen falta todas las clases de todos modos, así
que no hay nada que podar. Está revertido y anotado en el código para que nadie
lo reintente pensando que es una mejora obvia.

**Lo que decide el intervalo no es el coste: es la cadencia de la ingesta.**
`vercel.json` tiene `"crons": []` — nada dispara `/api/cron/ingest`, y alguien la
ejecuta a mano. Las altas llegan a saltos: 12, 11, 10, 9 y 3 de septiembre.
Revalidar cada 30 minutos regeneraba 48 veces al día un dato que cambia cada dos
o tres.

| | antes | ahora | techo de regeneraciones/día |
|---|---|---|---|
| facetas (43) | 30 min | **6 h** | 2.064 → 172 |
| fichas (2.000 en sitemap) | 1 h | **12 h** | 48.000 → 4.000 |
| sitemap | 6 h | **12 h** | 4 → 2 |
| **total** | | | **50.068 → 4.174** |

Ese techo asume que CADA página se pide en CADA ventana, cosa que con el tráfico
actual no pasa ni de lejos: ISR solo regenera cuando alguien pide la página
después de que expire, así que el coste real lo marca el tráfico, no el
intervalo. El techo sirve para saber que no hay sorpresa aunque el tráfico
llegue.

**Consecuencia que no es de ISR pero sale de aquí:** el cron de ingesta no está
programado. Mientras siga así, la frescura del producto depende de que alguien se
acuerde de correrlo.

---

## 6 ter. Línea base de peso — 2026-09-15

El criterio de aceptación dice que Lighthouse en móvil **no puede bajar respecto
de la versión actual**, y nadie había medido esa "versión actual": sin línea base,
el criterio no se puede comprobar ni antes ni después.

Lighthouse no está instalado en el proyecto y añadir la dependencia es decisión
del usuario, así que se deja la métrica que **sí** es comparable y que más pesa en
la puntuación móvil: el JS de primera carga de la build de producción.

| Ruta | First Load JS |
|---|---:|
| **`/` (portada)** | **113 kB** ← la que el rediseño va a tocar |
| `/diagnostico` | 112 kB |
| `/licitaciones/explorar` | 106 kB |
| `/licitaciones/descubrir` | 99,7 kB |
| `/licitaciones` | 95,1 kB |
| `/licitaciones/[slug]` (ficha) | 94,1 kB |
| `/licitaciones/{tipo,departamento,entidad}/[slug]` | 94,1 kB |
| `/nosotros` | 93,8 kB |
| base compartida | 87,1 kB |
| `/asistente/*` | 140 kB (las más pesadas del sitio) |

Dos lecturas que importan:

1. **Las rutas nuevas no añaden JS**: 226 B sobre la base compartida. Son
   componentes de servidor y el semáforo y la fila densa no llevan cliente. Sea
   cual sea el resultado de Lighthouse, no lo empeoran ellas.
2. **La portada está en 113 kB** y es la que el rediseño va a tocar. Ahí es donde
   está el riesgo: una librería de mapas se lleva fácil 40–150 kB. Si el número
   sube mucho por encima de 113, el criterio de aceptación se incumple. Conviene
   elegir el renderizado del mapa con esta cifra delante — un SVG dibujado desde
   el TopoJSON sin librería cuesta 0 kB de dependencia.

Para una línea base de Lighthouse de verdad hacen falta dos cosas que no se
hicieron por no decidir por el usuario: instalar la CLI (`npm i -D lighthouse`) o
correrla contra el sitio desplegado. Medirla contra el servidor de desarrollo
sería engañoso — sin minificar y con el overhead de dev, no se parece a
producción.

---

## 7. Próximos pasos, en orden

**Sin bloqueo — se puede hacer ya:**

1. Los seis archivos de Prettier (§36). Un comando, desbloquea el CI.
2. ~~Título global del sitio~~ y ~~coste de invocaciones~~ — **hechos el
   2026-09-15**, ver §6 bis.
3. Mover "Inteligencia de mercado" a `/competidores`, que no depende del mapa.
4. **Lighthouse en móvil**: hay línea base de peso (§6 ter) pero no de
   Lighthouse. Decidir si se instala la CLI o se mide contra el sitio desplegado;
   medirla contra el servidor de desarrollo sería engañoso.
5. El semáforo **relativo** (con perfil) en la ficha. `buildVerdict` ya existe;
   falta traer el perfil del usuario y llamar a `compuertasDesdeVeredicto()`, que
   ya está escrita y probada.

**Bloqueado hasta el TopoJSON:**

6. El hero con el mapa, la banda de métricas, "Navega por los datos" y la
   vitrina — o sea, `app/page.js` entero.

**Necesita una decisión antes de tocar código:**

7. Persistencia del perfil sin cuenta, para la fila de perfil de la vitrina. El
   patrón ya resuelto en este repo es el de `diagnostico`: `session_token` en
   cookie httpOnly y fila anónima reclamable al registrarse. Toca esquema.

---

## 8. Cómo verificar que sigue todo en pie

```
npm test            # 933 tests
npm run build       # 0 errores  (con el preview PARADO)
npm run lint        # 0 errores
npx prettier --check "src/**/*" "app/**/*"
```

Las pruebas que valen la pena conocer, porque vigilan cosas que ya se rompieron
una vez:

- `src/__tests__/design/contraste.test.ts` — lee los tokens reales del CSS y
  falla si el contraste baja, tintes incluidos.
- `src/__tests__/transform/writers-upsert-completo.test.ts` — que toda columna
  no-PK se reescriba en el `ON CONFLICT`.
- `src/__tests__/landing/nombres.test.ts` — que ninguna ruta con nombre quede sin
  puerta en el nav, el pie o el menú de usuario.
- `src/__tests__/classify/tipo-proyecto.test.ts` — los casos reales que fijaron
  las reglas de poda y de palabra completa.

Rutas que se pueden abrir a mano para comprobar a ojo:

```
/licitaciones/tipo/ptar
/licitaciones/departamento/valle-del-cauca
/licitaciones/entidad/esp
/licitaciones/<objeto-slug>--CO1.REQ.<n>
/precios
/sitemap.xml
```
