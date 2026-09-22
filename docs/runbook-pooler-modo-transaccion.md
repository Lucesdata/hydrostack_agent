# Runbook: pasar el pooler a modo transacción

**Fecha:** 2026-09-22 · **Motivo:** el incidente de `PENDIENTES.md` §40 · **Estado: APLICADO el 2026-09-22**

> **Aplicado.** `DATABASE_URL` está en el puerto 6543 en Production y en Preview,
> `.env.local` también, y `DATABASE_URL_SESSION` (5432) quedó declarada para
> drizzle-kit. Se aprovechó para **rotar la contraseña de la base**, que se había
> expuesto en una conversación, así que la credencial antigua ya no sirve.
>
> Verificado después del redespliegue: las siete rutas comprobadas a 200 y, la
> prueba que importa, **24 peticiones simultáneas a rutas que consultan la base,
> 24 respuestas 200**. Antes, con quince bastaba para tumbarlo todo.
>
> El resto del documento se conserva como está: describe por qué se hizo y cómo
> deshacerlo.

Este cambio se aplica **en el panel de Vercel y en tu `.env.local`**, no en el
código. El repo solo aporta la salvaguarda para las migraciones y este
documento. Lo hace una persona, en dos minutos, y se revierte en otros dos.

---

## 1. Qué cambia

Una cosa: el **puerto** de `DATABASE_URL`.

| | Hoy | Después |
|---|---|---|
| Host | `aws-1-eu-west-1.pooler.supabase.com` | igual |
| **Puerto** | **5432** — modo sesión | **6543** — modo transacción |
| Usuario, contraseña, base | iguales | iguales |

No cambia la credencial. No cambia la base. Solo por qué puerta se entra.

## 2. Por qué

En **modo sesión**, cada cliente que se conecta reserva una conexión del pool
hasta que se desconecta. El pool tiene **15 plazas**. Una aplicación serverless
levanta instancias que se quedan calientes con su conexión agarrada, así que
basta muy poca concurrencia para agotarlo. Cuando se agota, la base deja de
responder **a todo el mundo** — incluida la máquina desde la que estás mirando:

```
(EMAXCONNSESSION) max clients reached in session mode
max clients are limited to pool_size: 15
```

Eso es lo que tumbó producción el 2026-09-22: 500 en `/licitaciones`, en las 43
rutas facetadas y en la ficha, mientras las páginas que no consultan la base
seguían sirviendo.

En **modo transacción**, la conexión se toma para la consulta y se devuelve al
terminar. Es el modo que Supabase documenta para serverless, y el que quita el
techo de 15.

## 3. Comprobado antes de proponerlo

Ejecutado contra la base viva el 2026-09-22, por el puerto 6543, con el mismo
driver que usa producción (`@neondatabase/serverless` sobre WebSocket):

| Prueba | Resultado |
|---|---|
| Conexión y `select 1` | OK, 464 ms |
| Consulta con parámetros | OK, 68.995 filas |
| La consulta real de la vitrina, con sus dos JOIN | OK, 9 fichas, 173 ms |
| La de adjudicados, con `make_interval` | OK, 191 adjudicados, 98 ms |
| Transacción explícita `BEGIN`/`COMMIT` | OK, 4.238 entidades |
| **25 conexiones simultáneas** | **25/25 OK** (en modo sesión el techo eran 15) |
| El módulo `procesosDeVitrina` completo | OK: 35.518 abiertos, 191 adjudicados, página 2 |

Y una revisión del código buscando lo único que el modo transacción no da,
estado de sesión: **no hay** `LISTEN`, `NOTIFY`, locks de aviso, `SET SESSION`
ni `.prepare()` en la aplicación, y **ninguna llamada a `db.transaction(`**.

## 4. Los pasos

### 4.1 Vercel

Para **Production** y para **Preview** — las dos, o los preview deployments
seguirán agotando el pool:

1. Panel de Vercel → proyecto `aqualicita` → Settings → Environment Variables.
2. Editar `DATABASE_URL`: cambiar `:5432` por `:6543`. Nada más de la cadena.
3. Guardar.
4. **Redesplegar**: las variables se leen al arrancar la función, así que el
   despliegue vivo sigue con la vieja hasta que se rehaga. Un redeploy desde el
   panel basta.

Con la CLI, si lo prefieres, es `vercel env rm DATABASE_URL production` seguido
de `vercel env add DATABASE_URL production`. Pega la cadena con el puerto ya
cambiado; **no la escribas en el chat ni en un commit**.

### 4.2 Tu `.env.local`

Mismo cambio de puerto, para que lo local se parezca a producción.

### 4.3 La salvaguarda de las migraciones

Este PR hace que `drizzle.config.ts` prefiera `DATABASE_URL_SESSION` cuando
existe. **Declárala en `.env.local`** con la cadena de siempre, la del puerto
5432:

```
DATABASE_URL=...:6543/postgres          # la aplicación, modo transacción
DATABASE_URL_SESSION=...:5432/postgres  # drizzle-kit, modo sesión
```

Es necesario porque el modo transacción no da estado de sesión y hay DDL que lo
exige: `CREATE INDEX CONCURRENTLY` no puede correr dentro de una transacción, y
los locks de aviso no sobreviven entre sentencias. Si no la declaras no se rompe
nada hoy — cae en `DATABASE_URL` como antes—, pero la primera migración que use
DDL concurrente fallará de una forma que cuesta entender.

No hace falta en Vercel: allí no se corren migraciones.

## 5. Verificar que quedó bien

Después del redespliegue:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://aqualicita.com/licitaciones
curl -s -o /dev/null -w "%{http_code}\n" https://aqualicita.com/licitaciones/tipo/ptar
```

Las dos a 200. Y la prueba que de verdad importa, que es la que antes no pasaba:
abrir varias pestañas a la vez sobre rutas que consultan la base y comprobar que
ninguna cae. Si vuelve a aparecer `EMAXCONNSESSION`, el cambio no llegó al
despliegue vivo: falta el redeploy.

## 6. Volver atrás

Devolver el puerto a `5432` en Vercel y redesplegar. La salvaguarda de
`drizzle.config.ts` es inofensiva con o sin el cambio, así que no hay que
revertir este PR.

## 7. Lo que esto desbloquea

La rama `vitrina/fichacard-y-listado` (PR #43, revertido el 2026-09-22) vuelve a
entrar tal cual: sus dos rutas dinámicas dejan de ser un problema en cuanto el
pooler no reserve una conexión por instancia. Sus 976 tests siguen en verde.

## 8. Lo que queda abierto

- `scripts/sql/validate-reconstruction.sql` usa `CREATE TEMP TABLE`. Es un script
  manual, no la aplicación, pero si se corre por el puerto de transacción la
  tabla temporal no sobrevive entre sentencias. Correrlo con
  `DATABASE_URL_SESSION`.
- El tamaño del pool en modo transacción también es configurable en Supabase. No
  se ha medido cuál es el techo real; lo que se midió es que 25 simultáneas
  pasan y 15 era el muro anterior.
