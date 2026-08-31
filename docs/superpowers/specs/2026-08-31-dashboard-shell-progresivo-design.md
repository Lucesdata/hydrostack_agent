# Dashboard — shell progresivo y pantalla de resumen

**Fecha:** 2026-08-31
**Estado:** diseño aprobado, pendiente de plan de implementación
**Relacionado:** `2026-08-31-modelo-de-acceso-servidor-design.md`, que especifica
la capa de servidor del modelo de acceso. Este spec absorbe la parte de UI que
aquel dejó explícitamente fuera.

---

## 1. Problema

El producto no se navega como un producto. El nav superior es de marketing
—Licitaciones, Pliegos, Nosotros, Soluciones— mientras que las superficies de
trabajo reales viven escondidas en el desplegable del avatar: Perfil, Mis
coincidencias y Cuenta (`Navbar.js:162`). `/diagnostico` no aparece en ninguna
de las dos.

Un usuario con cuenta no tiene ningún lugar que le diga en qué estado está.

## 2. Decisiones tomadas

Del brainstorm del 2026-08-31:

1. **Shell progresivo, mismas URLs.** `/licitaciones/explorar` sigue siendo esa
   URL. El layout lee la sesión y decide qué envoltorio pinta. Ninguna
   dirección cambia; lo ya indexado y los enlaces existentes siguen valiendo.
2. **Con pantalla de resumen**, no solo navegación.
3. **El resumen vive en `/`**, según la sesión: anónimo ve la landing, con
   cuenta ve el resumen.
4. **La sesión es el único criterio.** Sin excepciones por ruta.

### Por qué el criterio único

Una lista de "rutas que no llevan shell" es exactamente la clase de artefacto
que se separa de la realidad. Este repo ya tiene el caso: `PROTECTED_PREFIXES`
en `middleware.ts` derivó hasta que su propio docstring documentaba un gate
inexistente. El criterio de sesión no hay que recordarlo, y elimina los grupos
de rutas: ningún archivo se mueve.

## 3. Estructura

Una rama en `app/layout.js`. Eso es todo el cambio estructural.

```jsx
export default async function RootLayout({ children }) {
  const user = await getSessionDisplayUser();
  const hasNewMatches = user ? await hasCoincidenciasNoVistas(user.id) : false;

  return (
    <html lang="es" className={/* variables de fuentes, sin cambios */}>
      <body>
        {user ? (
          <DashboardShell user={user} hasNewMatches={hasNewMatches}>
            {children}
          </DashboardShell>
        ) : (
          <>
            <Navbar />
            <main style={{ position: "relative", zIndex: 1 }}>{children}</main>
          </>
        )}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

No hay grupos de rutas, no hay layouts anidados, no se mueve ningún archivo.

### Consecuencia: el menú del avatar queda inalcanzable

En la rama sin shell, `Navbar` recibe siempre `user = null`. Su bloque de
avatar con el desplegable (Perfil · Mis coincidencias · Cuenta) y el badge de
coincidencias pasan a ser código muerto: la barra lateral asume esa función.

**Se elimina en este mismo cambio**, no después. Dejar una rama inalcanzable
con apariencia de activa es precisamente cómo se produjo la contradicción del
docstring de `middleware.ts`; no se repite a propósito.

`Navbar` conserva lo que sí sirve para anónimos: los enlaces de sección y los
CTA de iniciar sesión y crear cuenta.

### Sin costo de renderizado

Toda página de la app ya se renderiza dinámicamente — verificado en la tabla
del `next build`, donde ninguna ruta de página aparece como `○ (Static)`. El
layout raíz lee cookies vía `getSessionDisplayUser()` y eso arrastra a dinámico
todo lo que cuelga de él. El shell progresivo no cambia nada de eso: la app ya
paga ese precio entero.

## 4. Barra lateral

Hay 13 destinos en el producto, pero la barra lateral solo lleva 7. La razón es
que **ya existe un segundo nivel de navegación**: `LicitacionesTabs.tsx` es una
tira de pestañas —Recientes · Explorar · Cómo participar · Descubrir · Analizar
pliego— montada dentro de las 5 páginas correspondientes. Está construida y
probada; la barra lateral se queda con el primer nivel y no la duplica.

| # | Entrada | Destino |
|---|---------|---------|
| 1 | Resumen | `/` |
| 2 | Licitaciones | `/licitaciones` — las pestañas manejan las 5 superficies |
| 3 | Mis coincidencias | `/mis-coincidencias`, con el badge que hoy vive en el avatar |
| 4 | Mi perfil | `/perfil` |
| 5 | Diagnóstico | `/diagnostico` |
| 6 | Asistentes | `/asistente/operacion` |
| 7 | Cuenta | `/cuenta` |

`/pliego` no lleva fila propia: ya es pestaña de Licitaciones, que es donde
tiene sentido — se analiza el pliego *de* un proceso.

`/nosotros` y `/soluciones` van al pie de la barra, discretas, fuera del bloque
principal.

### Lo que esto vuelve visible y no resuelve

Recientes, Explorar y Descubrir son tres puertas a la misma habitación, y en
una barra lateral con jerarquía se nota más que hoy. Consolidarlas es una
decisión de producto propia y queda fuera de este alcance. Se deja anotada
porque el dashboard la hace más evidente, no menos.

## 5. Pantalla de resumen

Cuatro paneles en `/`, ordenados por una regla: **primero lo que cambió desde
la última vez, después lo que te está frenando.**

1. **Coincidencias nuevas** — cuántos procesos aparecieron para tu perfil sin
   que los hayas visto. Enlaza a `/mis-coincidencias`.
2. **Tu diagnóstico** — nivel, escalón y primeros bloqueantes, de
   `getDiagnosticoVigente(usuarioId)`.
3. **Tu perfil** — qué le falta. La fuente es `getPerfilDb(usuarioId)`
   (`src/lib/oferente/perfil-store.ts`), la misma que usa `GET /api/perfil`,
   con `isPerfilCompleto` para el estado general. Para el hueco concreto más
   común, `SecopExplorer` ya calcula `faltaExperiencia` como
   `!perfil.experiencia?.length`; ese mismo criterio sirve aquí.
4. **Alertas** — activas o no, y a qué hora, de `getPreferencias(usuarioId)`.

### La única pieza de datos nueva

`hasCoincidenciasNoVistas` devuelve un booleano con `LIMIT 1`
(`record-coincidencias.ts:38`), y el panel 1 necesita el número. Hace falta
`contarCoincidenciasNoVistas(usuarioId): Promise<number>` — un `count(*)` sobre
el índice `coincidencia_usuario_no_vista_idx`, que ya existe justo para esa
forma de consulta.

Todo lo demás sale de funciones que ya están escritas.

## 6. El primer día

Un usuario recién registrado no tiene perfil, ni diagnóstico, ni coincidencias,
ni alertas. Los cuatro paneles saldrían vacíos: cuatro cajas grises como
primera impresión del producto, inmediatamente después de haberle pedido el
correo.

Por eso **el estado vacío no es un caso degradado, es la pantalla principal del
primer día**. En vez de cuatro paneles vacíos, una secuencia de tres pasos:

> **1.** Completa tu perfil → **2.** Responde el diagnóstico → **3.** Empieza a
> recibir coincidencias

Los paneles aparecen a medida que hay algo que mostrar. El paso 3 no es una
acción del usuario: es la consecuencia de los dos primeros, y enunciarlo así
hace explícito por qué valía la pena hacerlos.

### Enlace con el modelo de acceso

Quien llega al dashboard desde el muro del veredicto **ya trae perfil**: lo
construyó como anónimo en `localStorage` y la migración de
`SecopExplorer.tsx:128` lo sube a la cuenta al iniciar sesión. Ese usuario
entra con el paso 1 ya cumplido, y la secuencia debe reflejarlo en vez de
pedirle algo que ya hizo.

## 7. Datos y degradación

El resumen ejecuta 4 consultas, sobre las 2 que el layout ya hace en cada
request. Con la medición de arranque en frío de `/mis-coincidencias`, eso
importa.

- **En paralelo y tolerante a fallos.** Un solo `Promise.allSettled` en
  `src/lib/dashboard/resumen.ts`, no una cascada de `await`. `allSettled` y no
  `all` precisamente porque el fallo de una consulta no debe llevarse las otras
  tres: con `all`, una alerta que no carga borraría el panel de coincidencias.
- **Cada panel degrada por su cuenta.** Una consulta rechazada pinta el estado
  de error de *ese* panel; no produce un 500 de la página.

Es el patrón que el repo ya usa: `hasCoincidenciasNoVistas` se traga su propio
error para no tumbar el layout, y `POST /api/diagnostico` responde 503 con el
resultado ya calculado en vez de perderlo.

## 8. Pruebas

El repo no tiene pruebas de render: `vitest.config.ts` usa
`environment: "node"`, sin jsdom ni testing-library. Este spec **no introduce
esa infraestructura**. Las pruebas van donde el repo ya prueba —lógica pura y
acceso a datos— y la UI se verifica en navegador.

1. **`src/__tests__/dashboard/resumen.test.ts`** — el agregador:
   - las 4 consultas se lanzan en paralelo, no en cascada. Determinístico, sin
     depender de tiempos: cada consulta se sustituye por una promesa diferida
     que no resuelve sola, y se afirma que las 4 quedaron invocadas antes de
     resolver ninguna. Con una cascada de `await`, solo la primera lo estaría;
   - una consulta rechazada degrada solo su panel y las otras tres siguen
     trayendo datos;
   - con las cuatro vacías, el agregador reporta "primer día" y no cuatro
     paneles vacíos.

2. **`src/__tests__/matching/record-coincidencias.test.ts`** (existente, casos
   nuevos) — `contarCoincidenciasNoVistas`: cuenta solo las no vistas, cuenta
   solo las del usuario dado, y degrada a `0` si la base no responde, igual que
   su hermana booleana.

**Verificación en navegador**, que es donde vive el resto del riesgo: la rama
del layout en los dos estados (con sesión y sin), el badge en la barra lateral,
la secuencia del primer día con una cuenta nueva, y que `/nosotros` con sesión
efectivamente muestre el shell — que es la decisión del criterio único y el
punto más fácil de romper sin notarlo.

**Comandos:** `npm test`, `npx next lint`, `npx next build`.

## 9. Superficie de cambio

**Nuevos**

- `src/components/dashboard/DashboardShell.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/Resumen.tsx` y sus 4 paneles
- `src/components/dashboard/PrimerDia.tsx`
- `src/lib/dashboard/resumen.ts` — el agregador
- `src/__tests__/dashboard/resumen.test.ts`

**Modificados**

- `app/layout.js` — la rama del shell
- `app/page.js` — landing si es anónimo, resumen si hay cuenta
- `src/components/Navbar.js` — se elimina el bloque de avatar, ya inalcanzable
- `src/lib/matching/record-coincidencias.ts` — `contarCoincidenciasNoVistas`
- `src/__tests__/matching/record-coincidencias.test.ts` — casos nuevos
- `CLAUDE.md` — la estructura de navegación

**Sin tocar:** ninguna página de contenido. `LicitacionesTabs`, `SecopExplorer`,
`ProcessDetail`, `/diagnostico`, `/perfil`, `/cuenta` y `/mis-coincidencias`
quedan como están; solo cambia lo que las envuelve.

## 10. Fuera de alcance

- **Consolidar Recientes / Explorar / Descubrir** — §4.
- **El muro visual del veredicto** — vive en el spec del modelo de acceso como
  trabajo diferido, y aterriza sobre esta estructura una vez exista.
- **Abrir el wizard de perfil a anónimos** y la continuidad `?proceso=<id>` —
  igual, diferidos allí.

### Hallazgo colateral, ajeno a los dos specs

`export const revalidate = 300` en `app/licitaciones/page.js:11` no surte
efecto, y su comentario —"ISR: HTML pre-renderizado, revalidado cada 5 min.
Carga instantánea"— es falso desde que el layout raíz empezó a leer la sesión.
Verificado en la tabla del `next build`. No se arregla aquí; queda registrado.

## 11. Logística

Rama propia desde `main`. Depende del spec del modelo de acceso solo en la
dirección narrativa (§6 lo referencia); no comparte archivos con él salvo
`CLAUDE.md`, así que los dos pueden avanzar en paralelo.
