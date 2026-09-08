# Alinear el home con el producto construido

**Fecha:** 2026-09-08
**Estado:** aprobado, pendiente de plan de implementación

---

## 1. El problema

El home describe un lector de pliegos con buscador. El producto es un motor de
vigilancia de contratación con filtros auditables, inteligencia de competidores
y alertas. Entre una cosa y la otra hay seis commits `feat(al)` (Fases 1–6) y el
módulo completo de diagnóstico, y ninguno tiene una sola mención en la portada.

Conteo de la base viva (Supabase, 2026-09-08):

| Tabla | Filas | En el home |
|---|---:|---|
| `proceso` | 90.076 | parcial (ticker) |
| `al_proceso_estado` | 50.584 | no |
| `al_oferentes_historico` | 27.035 | **no** |
| `al_sanciones` | 2.114 | **no** |
| `al_descartes` | 3.119 | **no** |
| `al_proceso_evento` | 1.053 | no |
| `al_filtros_usuario` | 4 | **no** |
| `al_reportes` | 2 | **no** |

Y del otro lado, lo que el home sí vende:

| Tabla | Filas | Peso en el home |
|---|---:|---|
| `pliego_proceso` | **0** | pilar en S2 y S3 |
| `conversacion` / `mensaje` / `documento` | **0** | 2 de 5 rutas de intención |
| `lista_espera_mercado` | **0** | tarjeta propia en la rejilla |

El home dedica su superficie a lo que nunca se ha usado y calla lo único que ya
es un activo verificable.

### Defectos concretos, verificados

1. **`S4Invitation` miente por omisión.** Promete «Prueba sin cuenta · Resultado
   en 2 minutos» y enlaza a `/licitaciones`. La frase describe exactamente
   `/diagnostico`, que existe y no se menciona en ninguna parte del home.
2. **`S5DarkClosing` promete «Sin suscripción»** cuando `politica.ts` ya declara
   `pliego_extraer` y `asistentes` como `pro`.
3. **`S6Footer` tiene dos enlaces rotos:** `/terms` y `/privacy` no existen como
   rutas en `app/`.
4. **`IntentJourney.jsx` es código muerto:** 518 líneas, cero consumidores. Su
   array vive duplicado en línea dentro de `page.js`.
5. **`app/page.js` son 1008 líneas** que mezclan datos, CSS, tres componentes
   internos y la composición.

---

## 2. Decisiones tomadas

| # | Decisión | Alternativa descartada |
|---|---|---|
| D1 | El eje del home es el **motor de datos**; el **diagnóstico** es la puerta sin fricción | Encabezar con competidores (no explica el producto a quien llega frío) o con pliegos (0 uso) |
| D2 | Pliegos y asistentes **bajan** de pilar a capacidad listada | Mantenerlos arriba: sería anunciar un cheque que hoy no se cobra |
| D3 | Se muestran **cifras reales**, sin insinuar tracción ni casos de éxito | Etiqueta de beta (frena registros) · sin cifras (desperdicia el mejor activo) |
| D4 | Se **conserva el lenguaje blueprint** (hero, PlantaHero, tokens, tipografía) | Rediseño visual: mucho más trabajo y arriesga una identidad ya resuelta |
| D5 | La tarjeta «Vendo o fabrico» **sale del home**; endpoint y tabla intactos | Conservarla o moverla al pie |
| D6 | Las cifras salen de **Postgres por Drizzle**, nunca de Socrata en vivo | Extender `landingStats.ts`, que consulta Socrata |
| D7 | Cada sección **declara su nivel de acceso** junto a su promesa | Descubrir el muro después del clic, que es lo que pasa hoy |

### D7 en detalle

`src/lib/acceso/politica.ts` ya es la única fuente de verdad de quién puede qué.
El home pasa a obedecerla en vez de contradecirla:

| Sin cuenta | Cuenta gratis | Pro |
|---|---|---|
| `explorar` · `detalle_proceso` · `veredicto_resumen` · `diagnostico` | `veredicto_detalle` · `diagnostico_historial` · `perfil_guardar` · `coincidencias` · `alertas` · `filtros` · `competidores` | `pliego_extraer` · `asistentes` |

---

## 3. Arquitectura

### 3.1 Mapa de secciones

| # | Bloque | Estado | Enlaza a |
|---|---|---|---|
| 0 | `ProcesosTicker` | sin cambios | `/licitaciones` |
| 1 | Hero | reescrito | `/diagnostico` · `/licitaciones` |
| 2 | La puerta: diagnóstico | **nuevo**, sustituye a `S4Invitation` | `/diagnostico` |
| 3 | El motor en cuatro pasos | **nuevo**, sustituye a `S2WhyAquaLicita` + `S3EverythingInOne` | `/licitaciones` `/mis-filtros` `/mis-coincidencias` `/cuenta` |
| 4 | Quién compite | **nuevo** | `/competidores` |
| 5 | Qué se descarta | **nuevo** | `/auditoria` |
| 6 | Rutas de intención | podado | `/pliego` `/asistente/*` `/soluciones` |
| 7 | Cierre | reescrito | `/diagnostico` |
| 8 | Pie | corregido | varios |

### 3.2 Contenido y puerta de cada bloque

**1 · Hero.** Cifras verificables. CTA primario `Ver si estás listo →` a
`/diagnostico`, etiquetado *sin cuenta*; secundario a `/licitaciones`.

> **90.076** procesos del sector vigilados · **27.035** registros de quién se
> presentó y a qué precio · **2.114** sanciones cruzadas

**2 · La puerta.** Cumple por fin lo que `S4Invitation` ya prometía. Describe lo
que devuelve `calcularDiagnostico`: banda de preparación (`listo` / `casi` /
`en_camino` / `inicio`), escalón de contratación y plan de acción.
Determinístico y sin IA — se dice, porque es una virtud.

**3 · El motor, cuatro pasos.** Cada paso con enlace y nivel:

1. Se vigila el sector — clasificación y red sectorial · *sin cuenta*
2. Tus reglas lo filtran — `/mis-filtros`, motor determinista · *gratis*
3. Ves por qué calificas o no — compuertas; resumen *sin cuenta*, detalle *gratis*
4. Te avisamos — alerta diaria y reportes permanentes · *gratis*

**4 · Quién compite.** `27.035` registros y `2.114` sanciones. Etiqueta *cuenta
gratuita*. El dato más difícil de replicar que tiene el producto.

**5 · Qué se descarta.** Los siete motivos reales del mapa `EXPLICA` de
`app/auditoria/page.tsx`, tal cual están redactados. El argumento: *un criterio
estrecho no produce errores, produce silencio*.

> **Sin cifras.** `descartesPorMotivo()` va por `accountId`: los 3.119 descartes
> son de cada cuenta, no un total del sistema. Publicarlos como cifra global
> sería el mismo defecto que el mock del ticker (`PENDIENTES.md` §3).

**6 · Rutas de intención.** Sale «vendo o fabrico». Pliegos y asistentes se
quedan marcados *pro*. Queda por decidir si además se marcan *en preparación*
(ver §6, Q1).

**7 · Cierre y pie.** Fuera el emoji y «Sin suscripción». Los tres checks pasan
a ser ciertos. El pie gana las rutas ausentes y pierde los dos enlaces rotos.

### 3.3 Capa de datos

**`src/lib/landing/cifras.ts`** (nuevo). Tres conteos por Drizzle contra
Postgres, que son exactamente los que consumen las secciones 1 y 4 — y ninguno
más, para que no haya cifras huérfanas que envejezcan sin dueño:

| Campo | Origen | Lo consume |
|---|---|---|
| `procesosVigilados` | `count(proceso)` | Hero |
| `oferentesHistoricos` | `count(al_oferentes_historico)` | Hero · Quién compite |
| `sanciones` | `count(al_sanciones)` | Hero · Quién compite |

`Promise.allSettled`, cada uno degrada a `null` por separado — el patrón que ya
usa `app/api/landing-stats/route.ts`. Cacheado con `revalidate` largo: se mueven
por día, no por minuto.

**`/api/landing-stats`** se extiende con un bloque `sector`. No se crea endpoint
nuevo y el contrato actual (`nuevos7d`, `enJuego`, `destacado`) no se toca, así
`LandingCards` sigue funcionando sin cambios.

**Ningún número se escribe a mano en el JSX.** Si la consulta falla, la cifra
cae a `—` y la frase sigue siendo cierta sin ella.

### 3.4 Deuda que el trabajo obliga a tocar

- **`IntentJourney.jsx` se borra.** Dejarlo mientras se reescribe el home
  garantiza que alguien lo edite creyendo que es el vivo.
- **`page.js` adelgaza.** Cada sección nueva nace como componente en
  `src/components/landing/`, siguiendo el patrón `S2…S6` existente. `page.js` se
  queda con el hero, el fondo blueprint y la composición.

---

## 4. Verificación

El riesgo de este trabajo no es que se vea mal: es volver a prometer cosas que
no se cumplen. La verificación ataca eso.

**Test de coherencia de enlaces** (`src/__tests__/landing/`). Recorre las rutas
declaradas en los datos del home y falla si alguna no existe como `page` en
`app/`. Atrapa hoy mismo `/terms` y `/privacy`.

**Test de coherencia de acceso.** Cada sección declara su `Capacidad`; el test la
cruza contra `NIVEL_MINIMO` y falla si la etiqueta visible no coincide con la
política real. La política deja de gobernar solo el servidor y pasa a gobernar
también lo que el home promete.

**Test de degradación.** Con las cifras en `null`, el home renderiza y ninguna
frase queda rota ni aparece un `NaN`.

**Verificación en navegador.** Home anónimo y con sesión, móvil y escritorio,
consola limpia. Con capturas.

**Comandos:** `npm run test` · `npm run lint` · `npm run build`

---

## 5. Fuera de alcance

Pendientes reales que rozan este trabajo y no entran:

- El correo sin configurar (`PENDIENTES.md` §0)
- Aplicar `drizzle/0017` (columna `plan`, comiteada y sin correr)
- Decidir el acceso a `GEMINI_API_KEY` por usuario
- Activar la frontera `pro` en los handlers de `pliego_extraer` y `asistentes`
- Crear las páginas `/terms` y `/privacy` (aquí solo se dejan de enlazar)

---

## 6. Preguntas abiertas

**Q1.** ¿Pliegos y asistentes se marcan solo *pro*, o también *en preparación*?
Con sus tres tablas a cero y la clave de Gemini sin resolver, enviar tráfico ahí
hoy es enviarlo a un muro. Se decide al implementar el bloque 6.
