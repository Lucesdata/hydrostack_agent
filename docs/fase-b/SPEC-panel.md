# Especificación del panel — Fase B

Fecha: 2026-08-25
Depende de: [`PLAN-recorrido-oferente.md`](./PLAN-recorrido-oferente.md)
Hermano público: [`SPEC-portada-v2.md`](./SPEC-portada-v2.md)
Referencia visual: lienzo de mockups aprobado el 2026-08-25 —
<https://claude.ai/code/artifact/21a499e3-38e9-46c8-804d-26bfeb41794d>
(5 mesas: primer ingreso, panel en uso, coincidencias, pliego, hoja de sistema).
Referencia externa analizada: capturas de `bid.tendios.com` del 2026-08-25.

Esto es un plan de **maquetación y navegación** para el área autenticada.
No cambia una sola regla de negocio: ni el semáforo, ni el matching, ni el
extractor. Cuando este documento y el plan de recorrido choquen, el choque
está declarado en el §2 — no se resuelve en silencio.

---

## 0. El encargo, en una frase

Dar al área autenticada una **carcasa de aplicación** —menú lateral en dos
mitades, barra superior, panel lateral derecho— y una **home nueva
(`/panel`) que se abre sola al terminar el registro**, metiendo dentro los
módulos que ya existen sin reescribir su lógica.

Dictado por el usuario, textual: *"el dashboard se abrirá automáticamente
apenas el usuario se registre"*, *"con las herramientas que hemos creado
propias del proyecto"* y *"en vez de Vera crearemos más adelante una IA que
se llamará AguaLicita"*.

Decisiones tomadas por el usuario el 2026-08-25:

| Pregunta | Respuesta |
|---|---|
| Identidad visual | Tema claro AquaLicita — se copia la estructura de Tendios, no su piel oscura |
| Alcance v1 | Carcasa + home + rediseño por dentro de los módulos |
| AguaLicita | Espacio reservado y visible, marcado «Pronto». Sin lógica de chat |

---

## 1. El principio: se copia la carcasa, no la piel

De Tendios se toman **tres** cosas, las mismas que el plan de recorrido ya
autorizaba a copiar:

1. La partición de la navegación en dos mitades: **Descubrir** y
   **Mis procesos**.
2. La mecánica del alta que termina en una pantalla «hemos configurado
   esto para ti» y aterriza en resultados propios.
3. El principio de que el usuario nunca ve una pantalla vacía.

No se toma nada más. Ni el fondo oscuro, ni el violeta neón, ni el contador
de millones de licitaciones, ni el pipeline de CRM de seis estados, ni
Organizaciones / Contactos / Directorios.

**El filtro sigue siendo el del plan:** *¿esto funciona con cuarenta
procesos al mes, o necesita cuarenta mil?* Todo lo que necesita cuarenta
mil se queda fuera, por bien resuelto que esté.

---

## 2. El conflicto con el plan de Fase B, declarado

`PLAN-recorrido-oferente.md` fija doce pasos en orden `1 → 2 → 4 → 3`. Este
panel **adelanta el paso 10** («partir el menú») y le añade una home
autenticada que el plan no contemplaba en ningún paso. Además el plan dice,
literalmente, dos cosas que hay que mirar de frente:

> *«Nada de dashboards con ratio de victorias hasta que haya volumen que
> medir.»*

**Se respeta.** No hay ratio de victorias, ni valor de pipeline, ni
conversión, ni ninguna métrica de rendimiento comercial en ninguna de las
cinco pantallas. Las únicas cifras del panel son de inventario y de estado
(§6).

> *«No se rediseña la portada hasta el paso 10.»*

**No aplica.** La portada pública no se toca en absoluto: este documento
empieza donde termina el login.

**Lo que sí cambia respecto al plan:** el orden. Con el panel construido,
los pasos 6, 8 y 9 (guardar un proceso, estados, avisos de cronograma)
dejan de ser opcionales — la home los presupone. El orden efectivo pasa a
ser `10 → 6 → 8 → 9 → …`, y los pasos 2, 3 y 4 (experiencia, perfil antes
del login, NIT que ya sabe) siguen bloqueados por el §9.1.

Esta reordenación **es la decisión que el usuario aprobó** al pedir el
panel. Queda escrita aquí para que dentro de tres meses no parezca un
descuido.

### 2.1 Y con la portada — aquí no hay conflicto, hay coincidencia

Sacar `/soluciones` y `/asistente/operacion` del menú **no es una decisión
nueva de este spec.** `PLAN-textos-portada.md` §3 ya la tomó para la cara
pública: reduce las cinco puertas de `INTENT_ROUTES` a **dos** (busco
contratos, tengo un pliego que descifrar), baja esas mismas dos rutas a una
banda aparte titulada *«No vienes a licitar»*, y degrada
`/asistente/ejecucion` de puerta a final del recorrido.

El panel hace exactamente la misma partición, un nivel más adentro. La
espina del oferente es la misma a los dos lados del login, y eso es
deliberado: quien entró por la puerta 01 de la portada encuentra el mismo
recorrido dentro, sin que se le crucen las otras audiencias.

**La única fricción real es con `SPEC-portada-v2.md` §2**, que encuadra
AquaLicita como plataforma de tratamiento de aguas donde licitar es *una
función entre cinco*. Pero ese choque ya está arbitrado por el propio spec
de portada, que se declara subordinado en materia de palabras: *«el plan
hermano de textos manda sobre las palabras… cuando choquen, gana el de
textos»*. El panel se alinea con el que gana.

---

## 3. Sistema visual — cero tokens nuevos

Todo sale de `app/globals.css`. No se define ni un color, ni un radio, ni
un tamaño de fuente que no exista ya.

| Uso | Token | Valor |
|---|---|---|
| Fondo de la aplicación | `--bg` | `#FAFAF7` |
| Superficie de menú, barra y tarjetas | `--surface` | `#FFFFFF` |
| Superficie hundida (chips, avatar, franjas) | `--surface-alt` | `#F4F4EE` |
| Tinta principal | `--ink-900` | `#0A1F1C` |
| Tinta secundaria | `--ink-600` | `#525B5A` |
| Tinta terciaria y etiquetas mono | `--ink-300` | `#6B746F` |
| Línea | `--line` / `--line-soft` | `#E5E5E0` / `#E8E8E2` |
| Acento | `--accent` | `#0369A1` |
| Acento suave (fondo del ítem activo) | `--accent-faint` | `rgba(3,105,161,.04)` |
| Borde de acento | `--accent-soft` | `rgba(3,105,161,.13)` |
| Gradiente del logotipo | `--accent-river` → `--accent-ocean` | `#7DD3FC` → `#0C4A6E` |
| Verde / ámbar / rojo de estado | `--success` / `--warning` / `--danger` | `#16A34A` / `#D97706` / `#DC2626` |

Tipografía sin cambios: `--font-sans` (Inter, vía `next/font`) para todo el
texto; `--font-mono` (JetBrains Mono) para identificadores, cifras,
etiquetas en versalitas y cualquier dato que venga de SECOP. La regla es
la misma que ya rige en `SecopExplorer`: **si el dato viene de la fuente,
va en mono**.

### 3.1 Métricas de la carcasa

| Pieza | Medida | Nota |
|---|---|---|
| Menú lateral | `248 px` | Fijo. No colapsable en v1 |
| Barra superior | `56 px` | Reusa `--nav-h`, ya existente |
| Panel AguaLicita abierto | `340 px` | Ver §7 |
| Panel AguaLicita colapsado (rail) | `56 px` | Estado por defecto en los módulos |
| Padding del área de contenido | `28–34 px` | |
| Radio de tarjeta | `--radius-lg` `12 px` | |
| Radio de control | `--radius-md` `8 px` | |
| Altura mínima de fila pulsable | `44 px` | |

Ítem de menú activo: fondo `--accent-faint`, texto `--accent`, peso 600 y
una barra interior de `2 px` a la izquierda (`box-shadow: inset 2px 0 0`).
Es el mismo tratamiento que `.clr-nav-link[aria-current="page"]` ya usa en
la barra pública, girado a vertical.

### 3.2 Iconografía

SVG en línea, trazo `1.6`, rejilla de `18 px`, `currentColor`. **Ni un
emoji.** Diez iconos en total: lupa, diana, libro abierto, marcador,
documento, campana, persona, controles, destello y flecha (esta última para
las llamadas a la acción, no para el menú). Se dibujan una vez en
`src/components/panel/icons.tsx` y no se importa ninguna librería.

---

## 4. Anatomía, pantalla por pantalla

### P1 · Primer ingreso — `/panel` recién registrado

**Es la pantalla que motiva todo el encargo.** Se abre sola al terminar el
registro (§5.2). Cierra el paso 5 del plan: *«nadie ve una pantalla vacía
después de registrarse»*.

Tiene **dos estados**, y la diferencia entre ellos es el bloqueo del §9.1:

**P1-a · con perfil mínimo** (el estado dibujado en el mockup). Requiere que
sector y zona se hayan elegido antes o durante el alta.

1. Chip `Cuenta lista` con marca de verificación.
2. Titular: *«Con lo que nos dijiste, ya te dejamos tres cosas hechas»*.
   El titular **entrega, no saluda**. Nada de «Hola, Giovanny».
3. Tres tarjetas numeradas `01 / 02 / 03`, con la hairline de acento
   superior que ya tiene `.clr-card`:
   - **N coincidencias** — con el desglose real `n en verde · n en ámbar ·
     n en rojo`.
   - **Alerta diaria activa** — con la hora real de `alerta_preferencias.horaEnvio`.
   - **Perfil precargado** — solo si el NIT devolvió contratos; si no, la
     tercera tarjeta se sustituye por «Perfil guardado» sin la línea de
     procedencia.
4. **«Empieza por estas dos»**: las coincidencias en verde, máximo dos, con
   botón `Seguir este proceso`. Si no hay ninguna en verde, el bloque pasa a
   «Empieza por revisar estas dos» con las de ámbar, y el botón es
   `Ver por qué`.
5. Franja de honestidad al pie: qué falta en el perfil y qué consecuencia
   tiene (*«sin los indicadores financieros del RUP, la compuerta de
   habilitación se queda en `?`»*).

**P1-b · sin perfil.** El usuario llega con cuenta pero sin sector ni zona.
El área de contenido monta `SectorZonaSetup`
(`src/components/oferente/SectorZonaSetup.tsx`, ya existe y ya funciona)
como bloque inline, con el mismo titular reescrito: *«Dinos dos cosas y
calculamos tus coincidencias»*. Al guardar, la misma ruta re-renderiza en
P1-a. **No hay redirección intermedia y no hay página en blanco.**

> P1-b es el estado real hasta que se desbloquee el §9.1. Si se implementa
> el panel sin resolver ese bloqueo, P1-b es lo que verá el 100 % de los
> usuarios nuevos, y P1-a es una pantalla que no existe todavía.

### P2 · Panel en uso — `/panel` con historia

Misma ruta, mismo componente, distinta densidad: es lo que ve alguien que
ya siguió procesos. Rejilla de dos columnas, `1.55fr / 1fr`.

**Encabezado.** Título `Tu panel` y una frase de inventario, no de
marketing: *«Este mes SECOP II abrió 14 procesos de agua y saneamiento por
$8.412 M. Seis cruzan con tu sector y tu zona.»* Los tres números salen de
`getEnJuegoMes()` y del conteo de matches. Si alguno viene `null`, la frase
degrada a la variante corta sin ese dato — nunca a un cero inventado.

**Columna A**

- **«Lo que corre»** — hasta tres avisos, ordenados por urgencia. Tres
  tipos, cada uno con su borde izquierdo de `2 px`:
  - Cierre próximo (`--danger` si ≤ 5 días, `--warning` si ≤ 10), con el
    número de días en mono a la izquierda. **Solo para procesos seguidos
    con pliego extraído** — sin pliego no hay fecha de cierre que contar
    (§6.4b).
  - Adenda nueva sobre un proceso seguido (`--warning`).
  - Pliego guardado sin analizar (`--line`, neutro).
  Si no hay ningún aviso, el bloque **no se renderiza**. No hay estado
  «todo en orden» decorativo.
- **«Coincidencias nuevas»** — hasta dos tarjetas, con el semáforo
  completo. Enlace `Ver las N →` al módulo.

**Columna B**

- **Tu perfil** — barra de completitud y la consecuencia de lo que falta,
  con un solo botón.
- **Mis procesos** — los cinco estados con su conteo. Los estados en cero
  se muestran atenuados con `—`, no se ocultan: la forma del pipeline es
  información.
- **Agosto en SECOP II** — seis barras, procesos abiertos por mes, con un
  pie que explica por qué el número es pequeño: *«Es un mercado de decenas,
  no de miles — por eso aquí no hay filtros de criba.»*

### P3 · Mis coincidencias — `/panel/coincidencias`

Es `/mis-coincidencias` con jerarquía nueva. **La lógica no se toca**:
`getMatchesForPerfil` / `getMatchesForPerfilMinimo` y `verdict.ts` siguen
igual.

- Segmentos en píldora: `Las N` · `Puedes ofertar · n` · `Revísalo · n` ·
  `No aplica · n`. **No son filtros facetados** — son cuatro cortes fijos
  sobre una lista corta.
- Tarjeta por proceso, con borde izquierdo de `2 px` en el color del
  veredicto, título en sentence case, línea de procedencia en mono
  (`ENTIDAD · REFERENCIA · DEPARTAMENTO · UNSPSC`), cuantía y plazo a la
  derecha. **El plazo es cuenta atrás solo si hay pliego extraído**; si no,
  es `Abierto` / `Cerrado` a secas (§6.4b).
- Semáforo: la píldora del veredicto **primero**, las cinco compuertas
  después, en el orden `Sector · Cuantía · Plazo · Ubicación ·
  Habilitación`, con los glifos `✓ ! ✕ ?` ya definidos en
  `.clr-verdict-gate--*`.
- **Regla nueva y obligatoria:** toda compuerta en `WARN` o `FAIL` escribe
  una línea de porqué bajo una separación punteada, con el nombre de la
  compuerta en mono versalitas y la razón en prosa. Un `UNKNOWN` escribe
  qué haría falta para resolverlo. Un veredicto sin razón es un bug.
- Los `FAIL` **se atenúan a `opacity .78`, no se ocultan.** Llevan
  `Ocultar de mi lista` como única acción.
- Pie: qué pasó con los procesos que no cruzaron, contados y clasificados
  (*«5 están fuera de Antioquia y 3 son de residuos sólidos»*), con enlace
  al buscador.

### P4 · Pliego analizado — `/panel/pliegos/[procesoId]`

Es la vista de lectura de una extracción **ya persistida** (§6.2). Dos
columnas iguales.

- **Requisitos habilitantes** — por requisito: glifo de resultado
  (`✓` verde / `✕` rojo / `?` gris), enunciado, y el valor del usuario
  contrastado a la derecha (`tuyo: 2,1`). Bajo cada uno, la **cita textual**
  con página y párrafo, en mono sobre `--bg` con filete izquierdo.
- **Marca de origen por campo**, no por documento: chip `Reglas` (neutro) o
  `LLM · confianza` (acento). Lo que propuso el modelo lleva además una
  línea que dice explícitamente que hay que verificarlo. Esto ya lo devuelve
  `/api/pliego/extract` en su campo `origen` — solo hay que mostrarlo.
- **Presupuesto oficial** — tabla de ítems con código en mono. El ítem cuya
  aritmética no cuadra se resalta con fondo `rgba(217,119,6,.05)` y muestra
  el cálculo esperado bajo el total impreso. Al pie, suma de ítems contra
  presupuesto declarado.
- **«Lo que no cuadra en este pliego»** — las inconsistencias de
  `ValidationReport` como tarjetas con severidad, enunciado y ubicación
  (`pág. 12 vs. pág. 63`). Acción: `Exportar para la audiencia`.
- El mockup dibuja un botón `Abrir el taller de la oferta`. **En v1 no se
  renderiza** — el destino no existe todavía (§9.2). Cuando el spec y el
  mockup discrepen, manda el spec.

### P5 · Hoja de sistema

No es una pantalla del producto. Es la mesa del lienzo que documenta las
cinco reglas y el mapa de rutas, para revisión de diseño.

---

## 5. Navegación

### 5.1 El menú

| Mitad | Ítems | Criterio |
|---|---|---|
| **Descubrir** | Procesos abiertos · Mis coincidencias · Cómo participar | Lo que todavía no es tuyo |
| **Mis procesos** | Seguidos · Pliegos analizados · Alertas | Lo que ya decidiste mirar |
| **Pie** (sin título) | Mi perfil · Preferencias · tarjeta de cuenta | Identidad y ajustes |

**Sale del menú del panel** (sigue existiendo y sigue enlazado desde la
portada): `/soluciones` y `/asistente/operacion`.

**Se pospone:** colapsar las tres rutas de búsqueda en una sola es el paso
11 del plan y **no entra en este spec**. En v1, `Procesos abiertos` apunta
a `/licitaciones/explorar` tal cual está. Cambiar eso a la vez que se
introduce la carcasa mezcla dos cosas que conviene poder revertir por
separado.

Los conteos junto a cada ítem (`14`, `6`, `5`, `2`) son reales o son `—`.
Nunca `0` decorativo cuando el dato no se pudo cargar.

### 5.2 La apertura automática tras el registro

El mecanismo ya está montado; solo cambia el destino por defecto.

1. `app/registro/page.tsx` — el `next` por defecto pasa de `"/"` a
   `"/panel"`.
2. `app/login/page.tsx` — mismo cambio, para que el rebote por confirmación
   de correo termine también en el panel.
3. `src/lib/supabase/actions.ts` — `safeNext()` mantiene su defensa contra
   open-redirect; solo cambia el valor de reserva a `"/panel"`.
4. `app/auth/callback/route.ts` — mismo valor de reserva, para Google OAuth
   y para el enlace de verificación de correo.

**Las dos rutas de alta y sus destinos:**

| Camino | Dónde aterriza |
|---|---|
| Correo + contraseña con sesión inmediata | `/panel` directo |
| Correo + contraseña con confirmación pendiente | `/login?notice=check_email`, y tras confirmar, `/panel` |
| Google OAuth | `/auth/callback` → `/panel` |

5. `middleware.ts` — `/panel` entra en `PROTECTED_PREFIXES`. Sin sesión,
   redirige a `/login?next=/panel`.

### 5.3 Mapa de rutas

| Hoy | Mañana | Qué cambia |
|---|---|---|
| — | `/panel` | **Nueva.** Home autenticada, destino de registro y login |
| `/mis-coincidencias` | `/panel/coincidencias` | Redirección permanente. Lógica intacta |
| `/pliego` | `/panel/pliegos` (índice) | La subida sigue donde está; el índice lista lo persistido |
| — | `/panel/pliegos/[procesoId]` | **Nueva.** Lectura de una extracción guardada |
| — | `/panel/seguidos` | **Nueva.** Depende del §8.2 |
| `/cuenta` | `/panel/preferencias` | Redirección. El formulario por dentro no cambia |
| `/perfil` | `/panel/perfil` | Redirección. `PerfilForm` no se toca |
| `/licitaciones/*` | sin cambios | Se enlazan desde el menú, conservan su layout actual |
| `/` · `/nosotros` · `/soluciones` · `/asistente/*` | sin cambios | La cara pública conserva su navbar |

Las redirecciones son **permanentes y se quedan**: hay correos de alerta ya
enviados que apuntan a `/mis-coincidencias`, y `envio_log` no se reescribe.

---

## 6. De dónde sale cada cifra

**Regla que gobierna esta sección: si el dato no se puede obtener, se dice
`—`.** Es el patrón de degradación honesta que ya usa
`app/api/landing-stats/route.ts`, y aplica a todas las cifras del panel sin
excepción.

### 6.1 Lo que ya existe y solo hay que leer

| Dato del panel | Origen | Estado |
|---|---|---|
| Procesos abiertos del mes | `countProcesosDbCached({apertura:"Abierto", desde})` — **sobre la ingesta** | Listo |
| Hidratación de un proceso a `SecopProceso` | `searchProcesosDb` + `mapDbRowToProceso` | Listo |
| Definición del sector agua | `KEYWORDS_AGUA` en `secop/config.ts` | Listo — **única definición viva** |
| Coincidencias y su veredicto | `getMatchesForPerfil` / `…Minimo` + `verdict.ts` | Listo |
| Coincidencias sin ver (badge) | tabla `coincidencia`, campo `vista_en` | Listo |
| Completitud del perfil | `isPerfilCompleto()` sobre `oferente_perfil` | Listo — el % es nuevo (§6.3) |
| Hora de la alerta y si está activa | tabla `alerta_preferencias` | Listo |
| Estado del pliego por proceso | `getPliegoStatusForProcesos()` | Listo |
| Fecha de cierre de un proceso | `getPliegoStatusForProcesos().fechaCierre` — **solo si hay pliego extraído** (§6.4b) | Listo, pero parcial por naturaleza |
| Apertura (Abierto/Cerrado) sin pliego | `SecopProceso.estadoApertura` | Listo |
| Extracción completa y validación | tabla `pliego_proceso` | Listo |

### 6.1.1 La regla: el panel se alimenta de la ingesta

Instrucción del owner del 2026-08-25: *«debemos reutilizar todo lo que se
ha construido, hablo de los datos y su ingesta»*. En concreto:

- **El panel no consulta SECOP en vivo.** `landingStats.ts`
  (`getEnJuegoMes`, `getNuevos7d`, `getDestacado`) va contra Socrata vía
  `sodaFetch` y es correcto para la **portada pública**, donde no hay
  sesión ni base garantizada. Dentro del panel se usa `db-search.ts`.
- **Una sola definición de «agua y saneamiento».** Hoy son las
  `KEYWORDS_AGUA` aplicadas con `ILIKE` sobre `raw_record.payload` en
  `prepare()`. Cualquier consulta nueva del panel la reusa, no la copia.
- **`mapDbRowToProceso` es la bisagra** entre la ingesta y el semáforo:
  convierte una fila de `proceso` en el `SecopProceso` que consume
  `verdict.ts`. Nada del panel arma ese objeto a mano.
- **Si la capa no llega, se amplía.** Ejemplos que este spec autoriza:
  `SecopQuery.procesoIds` (hidratar procesos seguidos) y
  `countProcesosPorMesDb` (la serie). Ambos viven en `db-search.ts`.

> ⚠️ **`clasificacion_sectorial` sigue vacía.** Está documentado en la
> cabecera de `cached-db-search.ts` y arrastrado desde julio de 2026.
> Cualquier consulta del panel que filtre por `sector_agua = true` devuelve
> cero. Por eso el filtro vivo es el de palabras clave — que además escanea
> sin índice (~10 s en frío), razón por la que existe `cached-db-search.ts`
> y por la que el panel debe usar siempre las versiones cacheadas.

### 6.2 Corrección al plan de recorrido

El paso 7 del plan dice: *«No perder el pliego. La extracción se persiste y
queda colgada del proceso guardado (hoy se pierde al recargar)»*.

**Está hecho a medias, y la mitad hecha es la difícil.** `pliego_proceso`
existe, `uploadPliego()` en `src/lib/secop/pliego-upload.ts` hace upsert por
`procesoId` con la extracción y el `ValidationReport` completos, y
`getPliegoStatusForProcesos()` ya los lee en `/mis-coincidencias`.

Lo que sí se pierde al recargar es **la página `/pliego` suelta**, que es un
componente cliente sin persistencia: sube, extrae, muestra y olvida.

**Consecuencia para este spec:** P4 no necesita tabla nueva ni migración.
Es una vista de lectura sobre datos que ya están en Postgres. El trabajo es
de interfaz.

### 6.3 Lo que hay que calcular

- **Porcentaje de completitud del perfil.** Hoy `isPerfilCompleto()`
  devuelve un booleano. Hace falta una función pura nueva —
  `perfilCompletitud(p): { pct, faltan[] }` en `src/lib/oferente/` — que
  devuelva el porcentaje **y la lista de lo que falta**, porque la interfaz
  nombra el hueco, no solo lo mide. Es aritmética sobre campos, sin
  consulta: se testea sola.
- **Serie de seis meses.** Un agregado nuevo, pero **dentro de
  `db-search.ts`** (`countProcesosPorMesDb`), para que reuse el `prepare()`
  que ya define el filtro de sector. No es una consulta paralela.

### 6.4 Lo que hay que construir — «Seguidos», decidido el 2026-08-25

Procesos seguidos, sus seis estados y los avisos de «Lo que corre» **entran
en v1**. Decisión del owner; cierra el punto 2 del §10.

Consecuencia: el panel nace con las dos columnas completas, y los pasos 6 y
8 del plan de recorrido (guardar un proceso, los estados) dejan de ser
trabajo futuro y pasan a ser parte de este spec. Lo que se construye está
en el §8.2.

**Lo que sigue degradado, y por dos razones distintas:**

**a) El aviso de *adenda nueva* no entra.** Detectar que un proceso seguido
cambió exige comparar la versión ingerida con la anterior, y eso es el paso
9 del plan («el calendario avisa»). Se diseña ahora y se enciende cuando
exista el paso 9 — no se simula mientras tanto.

**b) La cuenta atrás de cierre solo existe si hay pliego extraído.** Esto
es una restricción del dato, no una decisión de diseño, y hay que decirla
sin rodeos:

> `fechaCierre` **no existe en el dataset Procesos de SECOP.** Vive en el
> cronograma del pliego. Está documentado en el propio contrato de
> `VerdictProcessInput` (`src/lib/secop/verdict.ts`, campo `fechaCierre`,
> decisión D1) y es la razón de que `plazoGate` en Nivel 0 se resuelva solo
> con `estadoApertura` (`Cerrado`→FAIL, `Abierto`→WARN, ninguno→UNKNOWN).

Consecuencia para las tres pantallas que muestran plazos:

| Situación | Qué se muestra |
|---|---|
| Proceso con pliego extraído (`pliego_proceso` tiene fila) | `cierra 14 sep · 20 días`, en cuenta atrás, desde `getPliegoStatusForProcesos().fechaCierre` |
| Proceso sin pliego | `Abierto` o `Cerrado` a secas, desde `estadoApertura`. **Sin número de días** |
| Ninguno de los dos | `—` |

Por tanto el aviso «cierre próximo» de «Lo que corre» **solo se emite para
procesos seguidos que además tienen pliego extraído**. Los mockups pintan
la cuenta atrás en todas las tarjetas: eso es el estado ideal, no el de v1.
Es además un argumento de producto a favor de subir el pliego, y conviene
que la interfaz lo diga en vez de esconderlo.

---

## 7. AguaLicita — qué se construye y qué no

**Se construye:** el hueco. Tres estados.

| Estado | Ancho | Dónde |
|---|---|---|
| A · rail | `56 px` | Por defecto en los módulos. Un icono, sin ruido |
| B · reservado | `340 px` | Se abre y **explica qué hará**. No simula respuestas |
| C · activo | `340 px` | **Sin diseñar.** Se diseña cuando exista la lógica |

**No se construye:** ninguna llamada a ningún modelo, ningún historial,
ningún componente de conversación. El campo de entrada del estado B está
atenuado y no acepta foco.

El contenido del estado B dice tres cosas y ninguna más: que el espacio
está reservado, qué contexto tendrá cuando exista (el proceso abierto y su
veredicto, el perfil y lo que le falta, el pliego extraído con su cita), y
que estará acotado a la pantalla activa en vez de ser un chat general.

**El compromiso, escrito para que se pueda cobrar:** reservar los `340 px`
evita rehacer el layout después, pero un panel que ocupa una quinta parte
del ancho y no responde nada es una promesa a la vista todo el tiempo.
**Si el 2026-10-25 AguaLicita no tiene lógica, el estado B se retira y se
queda solo el rail.** No se deja «por si acaso».

Nota de nombre: el plan de recorrido rechaza explícitamente *«un agente de
chat generalista»* y prefiere *«los dos asistentes con contexto acotado que
ya existen»* (`/asistente/ejecucion`, `/asistente/operacion`, sobre
`AssistantChat` y las tablas `conversacion` / `mensaje`). El estado B es
compatible con eso: describe un asistente acotado, no uno general. Si
AguaLicita acaba siendo la marca de esos dos asistentes en vez de un motor
nuevo, este spec no hay que cambiarlo.

---

## 8. Mapa de archivos

### 8.1 Lo que se crea

```
app/panel/layout.tsx                    Carcasa: menú + barra + rail. Server component
app/panel/page.tsx                      P1 y P2 — misma ruta, dos densidades
app/panel/coincidencias/page.tsx        P3
app/panel/pliegos/page.tsx              Índice de extracciones persistidas
app/panel/pliegos/[procesoId]/page.tsx  P4
app/panel/perfil/page.tsx               Monta PerfilForm sin tocarlo
app/panel/preferencias/page.tsx         Mueve el contenido de /cuenta

src/components/panel/Sidebar.tsx        Menú en dos mitades
src/components/panel/Topbar.tsx         Migas + buscador + estado de sincronía
src/components/panel/AguaLicitaPanel.tsx  Estados A y B. Sin lógica de chat
src/components/panel/icons.tsx          Los diez SVG
src/components/panel/AvisoRow.tsx       Fila de «Lo que corre»
src/components/panel/VerdictCard.tsx    Tarjeta de coincidencia con porqués

src/lib/oferente/completitud.ts         perfilCompletitud() — función pura
```

### 8.2 «Seguidos» — en v1

```
src/lib/db/schema/seguimiento.ts        tabla proceso_seguido
drizzle/0013_proceso_seguido.sql        migración
src/lib/seguimiento/guardar.ts          seguir / dejar de seguir (idempotente)
src/lib/seguimiento/listar.ts           por usuario, agrupado por estado
src/lib/seguimiento/estado.ts           transición de estado + máquina pura
src/components/panel/EstadoSelect.tsx   control de cambio de estado
app/panel/seguidos/page.tsx             lista agrupada por estado
```

Igual que `pliego_proceso`, `proceso_seguido` referencia el **id nativo de
SECOP** (`text`, tipo `CO1.REQ.xxxx`), no el uuid interno de la tabla
`proceso`: es el criterio que ya siguen `coincidencia.procesoId` y
`pliego_proceso.procesoId`, y el único id que conoce el motor de matching.
Índice único `(usuarioId, procesoId)` para que seguir dos veces sea
idempotente.

La transición de estado se implementa como **función pura sobre un mapa de
transiciones permitidas**, separada de la escritura en base. Así se testea
sin base de datos, que es la única parte de esto con reglas de verdad.

`proceso_seguido` es **multi-tenant y no hay RLS** (`CLAUDE.md` §4). Cada
consulta que la toque lleva `WHERE usuarioId = …` en código de aplicación,
igual que `coincidencia` y `oferente_perfil`. Esto se audita a mano en
revisión; no hay red de seguridad debajo.

Estados, tal como los fija el plan de recorrido:
`En revisión → Voy a presentar → Presentada → Subsanando → Adjudicada / No adjudicada`.

> ⚠️ Antes de aplicar la migración: el `DROP INDEX
> "raw_record_payload_gin_idx"` que libera ~101 MB **ya está escrito** en
> `drizzle/0003_spotty_jack_power.sql`. Lo que no consta en el repositorio
> es si llegó a aplicarse en la base de producción de Neon, que tiene un
> límite de 512 MB. Comprobar el tamaño real **antes** de escribir el SQL
> nuevo, no después. La siguiente migración libre es la `0013`.

### 8.3 Lo que se toca de lo existente

```
middleware.ts                    añade "/panel" a PROTECTED_PREFIXES
app/registro/page.tsx            next por defecto → "/panel"
app/login/page.tsx               next por defecto → "/panel"
src/lib/supabase/actions.ts      valor de reserva de safeNext → "/panel"
app/auth/callback/route.ts       valor de reserva de next → "/panel"
app/mis-coincidencias/page.tsx   pasa a redirect permanente
app/cuenta/page.tsx              pasa a redirect permanente
app/perfil/page.tsx              pasa a redirect permanente
app/globals.css                  clases .pnl-* nuevas, ningún token nuevo
```

### 8.4 Lo que no se toca, y es deliberado

`src/lib/secop/verdict.ts` · `src/lib/matching/*` ·
`src/lib/pliego/extractPliegoHybrid.ts` · `src/lib/pliego/validate.ts` ·
`src/lib/alertas/*` · `PerfilForm` · `SectorZonaSetup` · `app/page.js` y
toda la cara pública.

Si la implementación necesita cambiar cualquiera de estos, **es señal de
que el diseño está mal**, no de que el archivo esté mal. Volver aquí antes
de tocarlos.

---

## 9. Decisiones abiertas

### 9.1 Bloqueante — el alcance de «no perfilar usuarios»

`PENDIENTES.md` §11 deja sin definir si la regla *«no perfilar usuarios»*
alcanza a la infraestructura de cuentas y alertas (perfil de oferente,
correo, hora de envío, con opt-in y unsubscribe) o solo al tracking
encubierto de visitantes anónimos.

**Qué bloquea exactamente:** la tarjeta `03 · Perfil precargado` de P1-a,
que autocompleta desde la tabla `contrato` a partir del NIT. Y con ella, el
estado P1-a entero: sin datos de perfil no hay «tres cosas hechas».

**Es una decisión de una frase que solo puede tomar el owner.** Hasta que se
tome, P1-b (§4) es la única pantalla de primer ingreso que se puede
construir. El panel se puede implementar entero sin resolver esto; lo que
no se puede es prometer P1-a.

### 9.2 El taller de la oferta

El botón `Abrir el taller de la oferta` de P4 apunta al **movimiento 3** del
plan, que el propio plan deja sin especificar: *«se especifica cuando se
llegue: lo aprendido en los pasos 6–9 va a cambiar su forma»*.

En v1 el botón **no se renderiza**. Un botón que no lleva a ninguna parte es
peor que su ausencia. Vuelve cuando exista el destino.

> El plan avisa de la tensión y aquí se repite: el movimiento 3 es donde
> está el dinero, y este panel lo empuja aún más lejos en la cola. Si
> aparece un usuario dispuesto a pagar por armar su oferta, ese usuario
> tiene prioridad sobre este panel.

### 9.3 Menor — el buscador de la barra superior

La barra superior dibuja un campo `Buscar proceso, entidad o NIT` con `⌘K`.
Hoy hay tres rutas de búsqueda (`/licitaciones`, `/licitaciones/explorar`,
`/licitaciones/descubrir`) y colapsarlas es el paso 11.

**En v1 el campo es un enlace**, no un buscador: lleva a
`/licitaciones/explorar` con el foco puesto. No se implementa paleta de
comandos.

### 9.4 Menor — responsive

Los mockups son de escritorio a `1600 × 980`. Por debajo de `--bp-lg`
(`1024 px`) el menú lateral pasa a cajón y el rail de AguaLicita
desaparece; la rejilla de dos columnas de P2 colapsa a una, columna A
primero. **No está dibujado.** Se resuelve en implementación siguiendo el
patrón de `.clr-mobile-menu`, que ya existe.

---

## 10. Lo que hay que resolver antes de implementar

1. ~~**Decidir si «Seguidos» entra en v1.**~~ **Resuelto el 2026-08-25: sí
   entra.** Ver §6.4 y §8.2.
2. **Tomar la decisión del §9.1** — el alcance de «no perfilar usuarios».
   Una frase del owner. **Sigue abierta.** Determina si se construye P1-a o
   solo P1-b; no bloquea nada más.
3. **Comprobar el tamaño de la base en Neon** antes de escribir la
   migración `0013`. Ahora es obligatorio, no precautorio: «Seguidos» en v1
   significa que hay migración sí o sí.
4. **Fijar la fecha de revisión de AguaLicita** (§7). La propuesta es
   2026-10-25; si no se fija, el estado B se queda para siempre.

Ninguno de los tres que siguen abiertos bloquea escribir el plan de
implementación. El plan asume **P1-b como línea base** —la pantalla que hay
que construir de todas formas— y deja P1-a como un paso condicional al §9.1.
