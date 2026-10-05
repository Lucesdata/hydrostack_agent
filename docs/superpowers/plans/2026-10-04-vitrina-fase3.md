# Vitrina, fase 3 — ganchos de vuelta (spec y plan, 2026-10-04)

Continúa `2026-10-04-vitrina-radar.md`. Pide aprobación antes de escribir código
porque **toca el esquema** (una migración) y añade una capacidad
(`docs/CONDUCTA.md` §4).

## 1. Reconocimiento: lo que ya existe

Casi todo lo que pedía la fase 3 ya está construido para las alertas; faltaba
ponerlo donde está la intención, en la vitrina.

| Pieza | Dónde | Qué hace hoy |
|---|---|---|
| Procesos que sigue una cuenta | tabla `coincidencia` (`schema/cuentas.ts`) | La llenan el perfil (`recordCoincidencias`, cron de alertas) y los filtros (`correrFiltrosActivos`, cron `tick`). **Nunca se borran** (`onConflictDoNothing`). |
| Correo con cambios de lo que sigues | `src/lib/al/notificacion/recopilar.ts` + `digest-agregado.ts` | El correo diario empieza por «Cambios en procesos que sigues» (adendas y adjudicaciones), con un `JOIN coincidencia`. |
| Búsquedas guardadas | tabla `al_filtros_usuario`, `POST /api/al/filtros`, `/mis-filtros` | Criterios por cuenta: palabras clave, UNSPSC, `divipola` (por prefijo), modalidad y valor mín./máx. El cron convierte lo que casa en `coincidencia` y avisa por correo. |
| Coincidencias con el perfil | `getMatchesForPerfil()` | Hasta 25 abiertos con veredicto no `FAIL`, dentro de la cobertura. Lo usa `/mis-coincidencias`. |
| Capacidad | `acceso/politica.ts` | `filtros` y `perfil_guardar` son `gratis`. |

Lo que **no** existe:
- marcar un proceso a mano;
- distinguir una coincidencia guardada a mano de una que vino del perfil o de un filtro;
- filtrar por tipo de obra en un filtro guardado.

## 2. Spec: qué se construye

**G1 · Seguir un proceso.** En la tarjeta de la vitrina, en el panel del Radar y
en la ficha: «☆ Seguir» / «★ Siguiendo». Seguir un proceso lo mete en «lo que
sigues»: aparece en `/mis-coincidencias` y sus adendas y su adjudicación llegan
en el correo diario. Es el «Guardar» del plan, con un nombre que dice lo que
hace.
- Sin cuenta: el botón lleva a `/registro?next=<la misma página>`. Seguir pide
  cuenta porque el aviso es por correo.
- Dejar de seguir quita la marca. Si el proceso también casa con el perfil o
  con un filtro, el cron puede volver a traerlo: se dice en la ayuda del botón.

**G2 · Guardar la búsqueda como alerta.** Junto a los filtros activos de la
vitrina: «🔔 Avisarme de procesos nuevos así». Crea un filtro en
`al_filtros_usuario` con los criterios de la vitrina y lleva a `/mis-filtros`,
donde se ve y se edita.
- `q` pasa a `palabrasClave` [q], `departamento` a `divipola` [código del
  departamento], `presupuesto` a `valorMin` y `tipo` a la columna nueva
  `tipos_proyecto` (§3).
- El nombre por defecto se compone de los filtros: «PTAR · Boyacá · desde $500 M».
- **Diferencia que hay que decir en pantalla:** en la vitrina `q` busca también
  en la entidad y el municipio; en la alerta, la palabra clave se busca en el
  texto del proceso. Antes de guardar se enseña un resumen de lo que va a
  vigilar.
- Sin filtros activos no hay botón: una alerta de «todo» sería un correo de
  cientos de procesos.

**G3 · Estante «Para ti».** Con sesión y perfil completo, encima de los
resultados de `/licitaciones` (sin filtros, primera página): una franja plegable
con los 4 primeros de `getMatchesForPerfil()` y «Ver los N →» a
`/mis-coincidencias`. Sin sesión o sin perfil no se pinta nada: el aviso «Define
tu perfil» de la fase 1b ya ocupa ese sitio.

### Criterios de aceptación

1. Seguir un proceso desde la vitrina lo hace aparecer en `/mis-coincidencias`
   y en «Cambios en procesos que sigues» del siguiente correo, si cambia.
2. «Siguiendo» se ve en las tres superficies tras recargar, y en ninguna para
   otra cuenta. Toda consulta va por cuenta, nunca por un id que mande el cliente.
3. Una alerta creada desde `/licitaciones?tipo=ptar&departamento=boyaca&presupuesto=500`
   aparece en `/mis-filtros` con esos tres criterios. El cron solo trae PTAR de
   Boyacá desde $500 M, y lo que descarta queda en `al_descartes` con su motivo
   (también `tipo_fuera`).
4. Las páginas ISR de la vitrina siguen siendo ISR: el estado «Siguiendo» y el
   estante se piden en el navegador o solo en la base dinámica.
5. La tabla tocada sigue con RLS; las pruebas de PGlite corren con la migración
   nueva.

## 3. Plan técnico

### Esquema: una migración aditiva (`drizzle/0025`)

- `coincidencia.origen text` nullable: `'manual'` para lo seguido a mano. NULL
  sigue significando «perfil o filtro», como hoy, y **ninguna consulta actual
  cambia**.
- `al_filtros_usuario.tipos_proyecto text[]` nullable: NULL o vacío = sin
  restricción, igual que las demás listas del filtro.

No se crea ninguna tabla. Las dos tablas ya tienen `.enableRLS()`. Se genera con
`npm run db:generate` y se prueba en PGlite; **aplicarla en la Supabase viva es
un paso tuyo** (`npm run db:migrate` con `DATABASE_URL`): desde la sesión no hay
acceso a la base. El código nuevo se despliega después de aplicarla.

### G1 · Seguir

- `src/lib/seguir/store.ts`: `seguir(cuenta, usuarioId, procesoId)` inserta con
  `origen 'manual'` y `veredicto_overall 'UNKNOWN'`; si ya existe (por perfil o
  filtro), no hace nada. `dejarDeSeguir` borra solo si `origen = 'manual'`.
  `seguidos(cuenta, ids[])` devuelve cuáles de esas ids sigue la cuenta. Todo
  filtra por `usuario_id` de la sesión, como el resto de `coincidencia`.
- `POST/DELETE /api/seguir` y `GET /api/seguir?ids=` (máx. 25), con
  `autorizar("seguir")`. Capacidad nueva `seguir: "gratis"` en `politica.ts`.
- `BotonSeguir.tsx`, isla de cliente. En la tarjeta va fuera del `<Link>` (un
  enlace no puede llevar un botón dentro): la tarjeta pasa a tener una capa de
  enlace y el botón encima. Un solo `GET` por página para el estado.
- Ficha y panel: el mismo botón en la cabecera.

### G2 · Alerta desde la vitrina

- `filtroDesdeVitrina(filtros, departamentoCodigo)` (puro) → el cuerpo de
  `POST /api/al/filtros`; `validarFiltro` acepta `tiposProyecto`.
- `evaluar-filtro.ts`: una regla más, `tipo_fuera`, sobre `proceso.tipo_proyecto`,
  que hay que añadir a la selección de `buscar-candidatos.ts` (hoy no lo trae).
  Va con su prueba de descarte.
- `/mis-filtros` muestra y edita el tipo de obra.
- En la vitrina, un `<details>` con el resumen de lo que se va a vigilar y el
  botón; sin sesión, a `/registro?next=`.

### G3 · Para ti

- En `app/licitaciones/page.js`, solo sin filtros y en la página 1: si hay
  sesión con perfil completo, `getMatchesForPerfil()` en paralelo con la
  página. La ruta ya es dinámica.
- `EstanteParaTi.tsx` (servidor): cuatro minitarjetas y «Ver los N →».

### Riesgos

- **Orden de despliegue:** si el código llega antes que la migración, las
  consultas que nombran `origen` o `tipos_proyecto` fallan. Se mitiga aplicando
  la migración primero; las lecturas nuevas van envueltas para degradar a «sin
  seguir» en vez de romper la página.
- **Recursión del «dejar de seguir»:** un proceso que casa con el perfil vuelve
  al día siguiente. Se dice en la ayuda del botón; no se añade una lista de
  «descartados» en esta fase.
- **Coste de `getMatchesForPerfil` por visita** a `/licitaciones` con sesión:
  una consulta de 25 filas. Si pesa, se cachea por usuario unos minutos.

## 4. Tareas, en orden y verificables por separado

1. Migración `0025` + esquema + prueba de PGlite (columnas nulas, RLS intacto).
   **Hecha** (`drizzle/0025_seguir_y_tipos_en_filtros.sql`,
   `src/__tests__/db/migracion-0025.db.test.ts`). Pendiente de aplicar en la base
   viva (D4).
2. Capacidad `seguir` + `store` + `/api/seguir` + pruebas (aislamiento por cuenta,
   no borra lo que no es manual). **Hecha** (`src/lib/seguir/store.ts`,
   `app/api/seguir/route.ts`). Aislamiento por `COALESCE(account_id, usuario_id)`,
   el criterio de `recopilar.ts`, porque las filas del perfil no traen
   `account_id`. Un id que no es un proceso vivo no crea fila. Las escrituras
   exigen `Content-Type: application/json`.
3. `BotonSeguir` en tarjeta, panel y ficha + render sin JS + contraste.
   **Hecha** (`src/components/secop/seguir/BotonSeguir.tsx`). En la vitrina,
   `ProveedorSeguir` pide el estado de las nueve tarjetas en un solo
   `GET /api/seguir`; la ficha (ISR) pide el suyo. En la tarjeta el botón va
   fuera del `<a>`, posicionado sobre el pie. Sin sesión (401) lleva a
   `/registro?next=`. Lo seguido por perfil o filtro sale «★ Siguiendo» con una
   ayuda y no se puede dejar desde ahí. Medido `--accent-ocean` sobre
   `--surface-alt`.
4. `tipos_proyecto` en el filtro: validar, evaluar (`tipo_fuera`), `/mis-filtros`.
   **Hecha.** `validarFiltro` acepta `tiposProyecto` (los cinco de
   `TIPOS_PROYECTO`); `evaluarFiltro` descarta con `tipo_fuera` y deja pasar los
   procesos sin tipo (el hueco es del clasificador, como la cuantía); `otros` sí
   cuenta como tipo. `VERSION_FILTRO` sube a `filtro-v2`. `/mis-filtros` lo crea
   con casillas, lo muestra en el resumen y lo conserva al pausar (el PUT
   reemplaza el filtro entero). Prueba de punta a punta en PGlite.
5. «Avisarme de procesos nuevos así» en la vitrina + `filtroDesdeVitrina` probado.
   **Hecha.** `src/lib/secop/alerta-vitrina.ts` (puro) traduce los filtros:
   `q` → `palabrasClave`, `tipo` → `tiposProyecto`, departamento → `divipola`
   (código de 2 dígitos, que la lista de departamentos ahora trae) y
   `presupuesto` → `valorMin`. El orden solo no ofrece alerta. `AlertaVitrina.tsx`
   es un `<details>` bajo los filtros: enseña lo que va a vigilar, avisa de que
   la palabra se busca en el texto del proceso y no en la entidad, deja cambiar
   el nombre y manda a `POST /api/al/filtros`; sin sesión, al registro. Probado
   que el cuerpo pasa `validarFiltro` tal cual.
6. Estante «Para ti». **Hecha.** `src/lib/secop/para-ti.ts` usa la misma regla
   que `/mis-coincidencias` (perfil completo → `getMatchesForPerfil`; mínimo →
   `getMatchesForPerfilMinimo`) y `EstanteParaTi.tsx` pinta las 4 primeras con su
   estado (Encaja, Revisar, Faltan datos) y «Ver las N en Mis coincidencias».
   Solo en `/licitaciones` sin filtros y en la página 1, con sesión y perfil
   guardado; un fallo deja la vitrina sin estante. Las páginas ISR
   (`/licitaciones/pagina/N`) no lo llevan: no leen la sesión.
7. Documentación (CLAUDE.md, PENDIENTES) y PR.

## 5. Decisiones del usuario (2026-10-04)

- **D1. «Guardar» es «Seguir»:** reutiliza `coincidencia` (columna `origen`) y trae
  los avisos por correo. No hay lista de guardados aparte.
- **D2. El tipo de obra entra en los filtros guardados:** columna
  `al_filtros_usuario.tipos_proyecto` y regla `tipo_fuera` en el motor.
- **D3. «Para ti» solo para cuentas con perfil**, calculado en el servidor.
- **D4. La migración la aplica el usuario** en la Supabase viva
  (`npm run db:migrate`) antes de fusionar. El PR la trae generada y probada en
  PGlite.

## 6. Cambio del 2026-10-05: «Seguir» se sustituye por «Guardar»

La Supabase viva está al límite del plan y no admite migraciones por ahora. En
`main` entró el PR #109 con «Guardar» y `/mis-procesos`, guardado en
`senal_usuario` y **sin migración**. Por decisión del usuario:

- **D1 queda sustituida.** Salen `src/lib/seguir/`, `/api/seguir`,
  `BotonSeguir`, la capacidad `seguir` y la columna `coincidencia.origen`. La
  tarjeta de la vitrina y el panel del Radar usan `BotonGuardar` dentro de
  `ProcesosCuenta`, igual que la ficha y el buscador guiado. Lo guardado no
  genera avisos por correo: eso era lo que traía reutilizar `coincidencia`.
- **La `0025` se reduce a `al_filtros_usuario.tipos_proyecto`**
  (`drizzle/0025_tipos_proyecto_en_filtros.sql`). Sigue haciendo falta aplicarla
  antes de fusionar, porque el cron de filtros lee todas las columnas de la tabla.
- Las tareas 2 y 3 de arriba describen lo que hubo, no lo que hay.
