# Entorno local sin Supabase

Una copia de AquaLicita que corre entera en tu máquina, sin tocar la Supabase
viva: Postgres local con las migraciones reales, datos de SECOP de muestra y
una sesión de prueba en lugar de Supabase Auth. Sirve para probar un PR antes
de aplicar sus migraciones en producción, y se puede rehacer desde cero cuando
haga falta.

## Requisitos

- Node y las dependencias del repo (`npm ci`).
- Los binarios de Postgres 14 o superior (`initdb`, `pg_ctl`, `psql`). En Mac:
  `brew install postgresql@16`. Si no están en el `PATH`, `PG_BIN=/ruta/bin`.
- Para el recorrido automático, Playwright con Chromium (no es dependencia del
  repo): `npm i --no-save playwright && npx playwright install chromium`.

## Uso

```bash
npm run local:preparar    # crea .local/pg, migra y siembra (idempotente)
npm run local:dev         # http://localhost:3000 contra la base local
npm run local:recorrido   # en otra terminal: recorrido con capturas
npm run local:reiniciar   # borra la base y la rehace
npm run local:parar       # detiene el Postgres local
scripts/local/entorno.sh psql   # consola SQL de la base local
```

Para entrar, abre `/dev/sesion` y elige un usuario. `/login` y `/registro`
también llevan ahí en este modo.

| Usuario | Para qué |
|---|---|
| Ana · `ana@aqualicita.local` | Perfil de oferente completo: «Para ti», encaje, semáforo |
| Beto · `beto@aqualicita.local` | Cuenta sin perfil |

`preparar` borra lo que estos dos usuarios hicieron antes (guardados, recientes,
filtros, coincidencias), así que cada corrida del recorrido empieza igual.

## Qué hay en la base

- **Todas las migraciones de `drizzle/`**, las mismas que en producción, con
  `drizzle-kit migrate`. Si la rama trae una migración nueva, `preparar` la
  aplica en local; la Supabase viva no se toca.
- **La muestra de SECOP de `samples/`** (500 procesos, 500 contratos), con el
  mismo camino que la ingesta real: `raw_record` → transform → clasificador de
  tipo de obra. Quedan 173 procesos abiertos.
- **Fechas relativas a hoy** (`scripts/local/sembrar.ts`): la muestra es de junio
  de 2026, así que se reparten publicaciones en los últimos 45 días (unos 20
  «Nuevo»), recepciones entre hace 8 días y dentro de 31 (algunos vencidos) y
  adjudicaciones recientes. Cada proceso recibe el mismo desfase en cada corrida.

## Cómo funciona la sesión local

`src/lib/sesion-local/sesion-local.ts`. Solo se activa con `next dev` **y**
`AQ_SESION_LOCAL=1`, que `npm run local:dev` pone por ti. `NODE_ENV` lo fija
Next: es `production` en todo build, Vercel incluido, así que ahí la sesión
local no existe aunque alguien defina la variable. Con ella activa, la cookie
`aq_sesion_local` lleva el id de uno de los usuarios de prueba, y solo esos ids
cuentan. Se engancha en el middleware, en `getSessionUser`,
`getSessionDisplayUser`, `/login`, `/registro` y `/logout`; `/dev/sesion`
responde 404 fuera de este modo. Lo vigila
`src/__tests__/sesion-local/sesion-local.test.ts`.

Lo que no cubre: el correo (Resend) y el extractor de pliegos (Gemini) necesitan
sus claves en `.env.local`; sin ellas fallan como fallarían en producción sin
configurar. `.env.local` puede seguir apuntando a Supabase: `entorno.sh` define
`DATABASE_URL` antes, y Next no pisa una variable que ya existe.

## El recorrido

`scripts/local/recorrido.mjs` hace con Chromium lo que haría una persona y deja
una captura por paso en `.local/recorrido/`:

1. Sin sesión: la vitrina carga, no hay «Para ti» y «Guardar» pide entrar.
2. El buscador (uno solo desde el 2026-10-05): el modal del hero lleva a la
   vitrina con sus filtros, la búsqueda por número encuentra también cerrados y
   `/licitaciones/explorar` redirige traduciendo sus parámetros.
3. Ana: «Para ti» con tarjetas; guardar desde una tarjeta y desde el Radar;
   lo guardado aparece en `/mis-procesos`; «Avisarme» con tipo y departamento
   crea el filtro, y `/mis-filtros` conserva el tipo al pausar y reactivar.
4. Beto: sin perfil no hay «Para ti».
5. A 390 px, «Guardar» no se monta sobre la tarjeta.

Los pasos de «Para ti», «Avisarme» y el tipo de obra en `/mis-filtros` prueban
la fase 3 de la vitrina (#112): en una rama sin ella se omiten, avisándolo.
Termina con código 1 si algún paso falla. `AQ_URL` cambia el servidor;
`PLAYWRIGHT_CHROMIUM` usa un Chromium ya instalado.
