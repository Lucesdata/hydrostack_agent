# Modelo de acceso por niveles — capa de servidor

**Fecha:** 2026-08-31
**Estado:** diseño aprobado, pendiente de plan de implementación
**Alcance:** servidor. La UI del muro se especifica aparte, con el dashboard.

---

## 1. Problema

Hoy no existe modelo de acceso. La respuesta a "quién puede ver y hacer los
procesos de licitación" está repartida en tres lugares que ya se contradicen
entre sí:

1. `PROTECTED_PREFIXES` en `middleware.ts` — protección por prefijo de ruta.
2. ~20 llamadas sueltas a `getSessionUser()`, cada una decidiendo por su cuenta.
3. Gates dentro de componentes de UI.

La contradicción no es hipotética. El docstring de `middleware.ts` afirma que
la evaluación de elegibilidad "se protege en el componente que dispara el
flujo, ver ProcessDetail/OferenteWizard". Es falso: ni `ProcessDetail.tsx` ni
`OferenteWizard.tsx` consultan la sesión, y `POST /api/secop/verdict` calcula
el veredicto para cualquiera — solo usa la sesión para registrar una señal
(`route.ts:76`).

El gate real está en otro sitio: `onRequestPerfil` en `SecopExplorer.tsx:462`
redirige a `/login` en vez de abrir el wizard cuando no hay sesión. Sin perfil
no hay veredicto (`SecopExplorer.tsx:243`), así que en la práctica el anónimo
no llega al veredicto — pero por un camino que nadie documentó y que el
docstring del middleware describe mal.

## 2. Objetivo

Captura de leads: lo público existe para demostrar valor y pedir el correo en
el momento de mayor intención. Decisión tomada en el brainstorm del
2026-08-31.

De ahí sale la frontera elegida: el anónimo **ve el resultado** de la
evaluación de elegibilidad (el semáforo agregado y el estado de cada una de las
5 compuertas), y la **explicación** de ese resultado — el campo `reason` de
cada compuerta — pide cuenta.

Es un movimiento de apertura, no de cierre: hoy el anónimo no ve nada.

## 3. Modelo de niveles

Tres niveles ordinales: `anonimo` < `gratis` < `pro`.

Columna nueva `usuario.plan` en `src/lib/db/schema/cuentas.ts`:
`text`, `not null`, default `'gratis'`. Migración `drizzle/0017`.

`text` y no enum por la convención ya fijada en el repo
(`contrato_evento.tipo_evento`, `envio_log.tipo`): agregar un valor no debe
pedir migración. La tabla `usuario` ya nace con `.enableRLS()` — CLAUDE.md §4.

**El nivel `pro` queda declarado pero inerte.** No hay pasarela de pago ni
flujo de suscripción en este alcance; toda cuenta existente y nueva queda en
`'gratis'`. Activar la frontera de `pro` sobre `pliego_extraer` y `asistentes`
es un cambio posterior de una línea cada uno, y esas rutas ya exigen cuenta
hoy, así que no hay regresión de seguridad mientras tanto.

## 4. La política

Módulo nuevo: `src/lib/acceso/politica.ts`. Su corazón es una tabla
declarativa que responde de un vistazo a "quién puede qué":

```ts
export type Nivel = "anonimo" | "gratis" | "pro";

export type Capacidad =
  | "explorar"
  | "detalle_proceso"
  | "veredicto_resumen"
  | "veredicto_detalle"
  | "diagnostico"
  | "perfil_guardar"
  | "coincidencias"
  | "alertas"
  | "pliego_extraer"
  | "asistentes";

const NIVEL_MINIMO: Record<Capacidad, Nivel> = {
  explorar:          "anonimo",
  detalle_proceso:   "anonimo",
  veredicto_resumen: "anonimo",
  veredicto_detalle: "gratis",
  diagnostico:       "anonimo",
  perfil_guardar:    "gratis",
  coincidencias:     "gratis",
  alertas:           "gratis",
  pliego_extraer:    "pro",
  asistentes:        "pro",
};

export function nivelDe(user: SessionUser | null, plan?: string | null): Nivel;
export function puede(nivel: Nivel, capacidad: Capacidad): boolean;
```

`puede` es una comparación ordinal sobre el orden declarado, nada más.

### Por qué una tabla y no `if (user)` repartidos

Porque la contradicción de §1 es el resultado predecible de tener la decisión
en tres sitios. Con la tabla, la pregunta se responde leyendo una pantalla, y
una discrepancia entre lo documentado y lo real se vuelve visible.

### Límite técnico aceptado: el middleware no puede leer `plan`

`middleware.ts` corre en el runtime Edge y no puede consultar Postgres. Queda
haciendo solo lo que ya hace bien: distinguir anónimo de con-sesión por prefijo
de ruta, usando el `user` que ya obtiene de Supabase.

La frontera `gratis`/`pro` se aplica en route handlers y Server Components,
donde `db` sí está disponible.

Cuando llegue el cobro, la salida es escribir `plan` en el `app_metadata` de
Supabase para que viaje dentro del JWT y el middleware pueda leerlo sin tocar
la base. Queda anotado como camino; no se construye aquí.

## 5. Redacción del veredicto

### Tipos

En `src/lib/secop/verdict-publico.ts`, junto a `verdict.ts`. La política decide
*si* se redacta; el dominio sabe *cómo*. Así `politica.ts` no importa tipos de
SECOP y sigue siendo legible de un vistazo.

```ts
/**
 * La redacción es por compuerta, no por veredicto: las excepciones de más
 * abajo conservan su `reason`. Por eso cada compuerta declara si fue
 * redactada, y el consumidor discrimina sobre ese campo.
 */
export type GateResultPublico =
  | ({ redactado: false } & GateResult)
  | ({ redactado: true } & Omit<GateResult, "reason">);

export interface VerdictPublico extends Omit<Verdict, "gates"> {
  /** Pasó por la redacción; qué compuertas se redactaron lo dice cada una. */
  redactado: true;
  gates: Record<keyof Verdict["gates"], GateResultPublico>;
}

export type VerdictRespuesta =
  | ({ redactado: false } & Verdict)
  | VerdictPublico;

export function redactarVerdict(v: Verdict): VerdictPublico;
```

Unión discriminada y no `reason?: string`. Un campo opcional debilitaría el
tipo también para el caso completo, y nadie se enteraría de que hay un caso
redactado que manejar. Con la unión, el compilador señala cada punto de
consumo.

### Dos excepciones a la redacción

`redactarVerdict` no redacta uniformemente. Recibe el veredicto completo y
decide por compuerta:

1. **`overall === "FAIL"`** → los `reason` de las compuertas que fallaron se
   muestran sin cuenta. Ese usuario no puede participar en ese proceso;
   cobrarle un correo por una mala noticia que no puede accionar quema la
   confianza que el resto del diseño construye. Y no se pierde un lead: se
   pierde uno que no lo era para ese proceso.

2. **Compuertas `UNKNOWN`** → muestran su `reason`. En Nivel 0 la compuerta
   `habilitacion` es casi siempre `UNKNOWN` y su `reason` dice que requiere
   revisar el pliego. Redactar eso no oculta nada de valor y hace ver el muro
   más grande de lo que es.

La regla resultante se explica en una frase: **si no puedes participar, te
decimos por qué sin pedirte nada; si puedes, la explicación pide cuenta.**

### El route handler

`app/api/secop/verdict/route.ts` pasa de usar la sesión solo para
`recordUserSignal` a decidir con ella:

```ts
const nivel = nivelDe(user);
return NextResponse.json({
  verdict: puede(nivel, "veredicto_detalle")
    ? { redactado: false as const, ...verdict }
    : redactarVerdict(verdict),
});
```

**Sin query adicional.** `veredicto_detalle` exige `gratis`, no `pro`, así que
basta con saber si hay sesión — `plan` no se consulta en esta ruta. La columna
nueva queda inerte hasta que se active la frontera de `pro`.

### La redacción es del servidor, no del render

`redactarVerdict` construye un objeto nuevo. Ocultar los `reason` con CSS o con
un `if` en el cliente los dejaría visibles en la pestaña de red — un muro
falso.

`/api/secop/verdict` es POST, así que ninguna capa de CDN lo cachea y no hay
riesgo de servir una respuesta redactada a una cuenta con sesión ni al revés.
Si algún día se convierte en GET, este es el punto a revisar.

## 6. Qué sobrevive en la UI existente

La UI ya separa lo que se pinta con `status` de lo que se pinta con `reason`,
así que el teaser está construido:

- La barra de segmentos (`ProcessDetail.tsx:175`) usa solo `status` → intacta.
- `verdictScore` (`format.ts:78`) cuenta `PASS` sobre `status` → el marcador
  "3 de 5 compuertas" **sigue existiendo para el anónimo**. Eso es el teaser.
- Lo único que rompe es `ProcessDetail.tsx:184-207`, que lee `g.reason` sin
  condición y hace `g.reason.split(" · ")` para la compuerta de habilitación.

Ese "rompe" es el beneficio de la unión discriminada: el compilador señala la
línea exacta en vez de dejar pasar un `undefined` que se renderiza vacío en
producción.

**En este alcance, `ProcessDetail` recibe el manejo mínimo del caso
`redactado`**: donde iría el `reason`, el estado en palabra (*Cumple* / *No
cumple* / *Sin datos*). Sin copy pulido, sin CTA, sin diseño. El muro con su
llamado a la acción se diseña con el dashboard, que es donde va a vivir.

## 7. Estados degradados

- **Supabase caído:** `getSessionUser()` devuelve `null` por diseño, así que un
  usuario con cuenta vería la versión redactada. Cierra en la dirección segura,
  que es la correcta, y es coherente con el criterio que ya rige
  `get-session-user.ts` y `src/lib/supabase/middleware.ts`. Es peor
  experiencia, no mejor; se acepta conscientemente.
- **Base caída:** esta ruta no consulta la base para decidir el nivel, así que
  la redacción sigue funcionando aunque Postgres no responda.

## 8. Pruebas

Vitest, en `src/__tests__/<dominio>/` como el resto del repo. En orden TDD.

1. **`acceso/politica.test.ts`** — tabla de casos sobre `puede()` y
   `nivelDe()`: los tres niveles contra las diez capacidades, más
   `nivelDe(null)` → `anonimo` y `nivelDe(user, 'gratis')` → `gratis`. Es puro
   y es la única fuente de verdad del sistema; merece prueba directa.

2. **`secop/verdict-publico.test.ts`** — el que importa. La aserción no es
   `expect(g.reason).toBeUndefined()`, porque eso pasa aunque el `reason`
   sobreviva en otra parte del objeto. Es: construir un `Verdict` **sin
   ninguna excepción activa** — las 5 compuertas en `PASS`/`WARN`, ninguna
   `UNKNOWN`, `overall` distinto de `FAIL` — con `reason` centinela
   reconocible en cada una, y afirmar que
   `JSON.stringify(redactarVerdict(v))` **no contiene ninguno de los cinco**.
   El modo de fallo real es una fuga, no un campo mal nombrado.

   Y las dos excepciones, cada una con su caso propio — son lo contrario de
   una fuga, y una prueba que solo mire filtraciones las declararía errores:
   con `overall === "FAIL"` los `reason` de las compuertas que fallaron sí
   aparecen en la salida, y una compuerta `UNKNOWN` conserva el suyo. En ambos
   casos, la compuerta redactada vecina sigue sin el suyo.

3. **`api/verdict-redaccion.test.ts`** — el handler: sin sesión →
   `redactado: true`; con sesión → `redactado: false`; `overall === "FAIL"` sin
   sesión → los `reason` de las compuertas que fallaron sí viajan.

4. **`secop/format.test.ts`** (existente, se le agrega un caso) —
   `verdictScore` sobre un veredicto redactado da el mismo marcador que sobre
   el completo. Barata, y protege justo lo que hace funcionar el enfoque.

**Verificación:** `npm test` y `npx next lint`.

## 9. Superficie de cambio

**Nuevos**

- `src/lib/acceso/politica.ts`
- `src/lib/secop/verdict-publico.ts`
- `drizzle/0017_*.sql` (generada por `drizzle-kit`)
- `src/__tests__/acceso/politica.test.ts`
- `src/__tests__/secop/verdict-publico.test.ts`
- `src/__tests__/api/verdict-redaccion.test.ts`

**Modificados**

- `src/lib/db/schema/cuentas.ts` — columna `plan`
- `app/api/secop/verdict/route.ts` — redacción según política
- `src/components/secop/ProcessDetail.tsx` — manejo mínimo de `redactado`
- `src/__tests__/secop/format.test.ts` — caso nuevo
- `middleware.ts` — solo el docstring: hoy afirma un gate que no existe
- `CLAUDE.md` — el modelo de acceso

**Sin tocar:** `/api/perfil`, alertas, diagnóstico, matching, `SecopExplorer.tsx`.

## 10. Fuera de alcance

Todo esto pasa al spec del dashboard:

- **El muro visual**: copy del CTA, su ubicación (uno solo debajo de la lista,
  no un candado por fila), y el CTA al diagnóstico en el caso `FAIL`.
- **Abrir el wizard de perfil a anónimos** (`onRequestPerfil` en
  `SecopExplorer.tsx:462`).
- **Continuidad al registrarse**: poner el proceso en la URL
  (`?proceso=<id>`), sincronizar `selectedId` con ese parámetro, y corregir el
  `next` — hoy apunta a `/licitaciones`, que ni siquiera es la ruta donde se
  monta `SecopExplorer` (`/licitaciones/explorar`).
- **Activar la frontera de `pro`** sobre `pliego_extraer` y `asistentes`.

### Consecuencia que hay que decir en voz alta

Mientras el wizard de perfil siga cerrado para anónimos, **un anónimo no puede
llegar a un veredicto**, y por tanto esta capa casi no tiene efecto visible.
Es infraestructura que se activa con el spec del dashboard.

La excepción son los anónimos que ya tienen un perfil en `localStorage` de
antes: esos sí pasan de ver los `reason` completos a verlos redactados. Es un
caso real aunque poco frecuente.

### Pendiente que este diseño no resuelve

`senal_usuario.usuarioId` es `notNull` con FK a `usuario`, así que **no se
pueden registrar señales de anónimos** con la maquinaria existente. Se puede
medir la conversión después del registro, pero no cuántos vieron el muro y se
fueron — el denominador de la tasa de conversión. Medir eso pide algo que hoy
no existe y no se inventa aquí.

## 11. Logística

Rama propia desde `main`. El trabajo de `feat/historial-diagnosticos` ya se
integró (PR #22 y #23), así que `main` es una base limpia y no hay nada en
curso con lo que este cambio pueda entrelazarse.
