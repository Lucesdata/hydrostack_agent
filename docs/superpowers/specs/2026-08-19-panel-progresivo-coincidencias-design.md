# Panel de coincidencias progresivo en /perfil

**Fecha**: 2026-08-19
**Estado**: Diseño validado, pendiente de plan de implementación.

## Contexto

Probando el matching de oportunidades con un perfil real (RUT de INGENIEROS Y
ARQUITECTOS CONSTRUCTORES INARCONST SAS, sector obra civil/ingeniería,
cobertura Valle del Cauca + Atlántico) confirmamos que el motor de veredicto
(`matchProcesos` → `buildVerdict`) funciona correctamente end-to-end contra
datos reales ingeridos. La observación del usuario tras esa prueba: los
resultados deberían verse reflejados en el sitio mientras se llena el
perfil, en un espacio que "crece" a medida que el perfil avanza, en vez de
solo aparecer después en `/mis-coincidencias`.

Se decidió que este panel vive en `/perfil` (`PerfilForm.tsx`), el único de
los tres puntos de entrada de perfil que ya es client-side con estado en
React — `SectorZonaSetup` (setup rápido de `/mis-coincidencias`) es hoy un
`<form action>` de servidor con recarga completa, y convertirlo queda fuera
de este alcance.

**Gap descubierto durante el diseño**: `PerfilForm.tsx` nunca expone un
input para `cuantiaObjetivo` (rango de valor de contrato) — queda fijo en
`{minCop: 0, maxCop: 0}` (línea 24 de `defaultPerfil()`). Como
`cuantiaGate` compara el valor del proceso contra ese rango, con `{0,0}`
casi cualquier proceso real cae en `FAIL`, y `getMatchesForPerfil` descarta
todo lo que sea `FAIL`. Sin resolver esto, el panel se quedaría en 0 para
siempre aunque sector y cobertura estén perfectos. Se decidió sumar este
campo al alcance de este proyecto — no tiene sentido construir el panel
sin él.

## Decisiones

1. **Alcance**: solo `/perfil` (`PerfilForm.tsx`). `SectorZonaSetup` y
   `/mis-coincidencias` no cambian.
2. **Trigger**: automático con debounce (~600ms tras el último cambio), sin
   botón explícito — es lo que da la sensación de "crece a medida que
   avanzas" que pidió el usuario.
3. **Contenido mientras el perfil está incompleto**: conteo + hasta 3
   ejemplos (nombre/entidad/valor), sin el semáforo completo de compuertas
   — ese detalle se ve en `/mis-coincidencias`, que sigue siendo la fuente
   de verdad para el veredicto completo por proceso.
4. **Se agrega `cuantiaObjetivo` al formulario** de `/perfil` como parte de
   este trabajo (sección nueva "¿Qué rango de contrato buscas?").
5. **El link "Ver todas en Mis coincidencias" del panel queda deshabilitado**
   (con tooltip "Guarda tu perfil para verlas aquí") hasta que haya al
   menos un guardado exitoso en la sesión — el panel refleja el borrador en
   pantalla, pero `/mis-coincidencias` lee el perfil ya persistido en BD;
   sin este gate, el link llevaría a datos desalineados con lo que el
   usuario acaba de ver.

## Arquitectura

```
PerfilForm (estado `perfil` ya existente)
  │
  ├─ input nuevo: cuantiaObjetivo (minCop/maxCop)
  │
  └─ <PerfilResultadosPanel perfil={perfil} guardadoOk={...} />
        │  debounce 600ms + AbortController
        ▼
     POST /api/perfil/preview  (nuevo, sin persistencia)
        │
        ▼
     getMatchesForPerfil(perfil)   ← función existente, sin cambios
        │
        ▼
     { count, ejemplos }
```

El motor de matching (`match.ts`, `get-matches-for-perfil.ts`,
`verdict.ts`) no cambia. El único código nuevo es el endpoint de preview
(que solo lee), el componente del panel, y la sección de cuantía en el
formulario.

## Componentes

### `app/api/perfil/preview/route.ts` (nuevo)
`POST`, `runtime = "nodejs"`, mismo patrón de auth que
`app/api/perfil/route.ts`: `getSessionUser()`, 401 si no hay sesión. Valida
el body con la misma forma que ya valida el `PUT` existente (`isValidPerfil`).
No escribe en `oferente_perfil` — arma el `OferenteProfile` recibido y llama
`getMatchesForPerfil(perfil)`, luego responde:

```ts
{ count: number; ejemplos: { nombre: string; entidad: string; valor: number | null }[] }
```

`count = matches.length` (acotado a 25, mismo límite que ya tiene
`getMatchesForPerfil` hoy — no es una limitación nueva de este trabajo).
`ejemplos = matches.slice(0, 3)` (ya vienen ordenados PASS→WARN→UNKNOWN por
`getMatchesForPerfil`) proyectados a `nombre`/`entidad`/`valor`, donde
`valor = proceso.precioBase ?? proceso.valorAdjudicacion` — el mismo
fallback que ya usa `cuantiaGate` en `verdict.ts`, para no inventar una
segunda regla de "cuál es el valor del proceso".

### `src/components/perfil/PerfilResultadosPanel.tsx` (nuevo)
Client component. Recibe `perfil: OferenteProfile` por props (mismo estado
que ya vive en `PerfilForm`, sin duplicarlo).

- Al montar: dispara la primera consulta de inmediato (sin esperar el
  debounce) — si `perfilInicial` ya tenía datos guardados, el panel no debe
  arrancar en blanco.
- En cada cambio de `perfil`: reinicia un timer de 600ms; solo dispara
  fetch tras una pausa real de edición.
- Cada fetch usa `AbortController`; al lanzar uno nuevo se aborta el
  anterior si seguía en vuelo. Además, cada fetch lleva un id incremental
  (`useRef` contador) — si una respuesta llega y ya no es la más reciente,
  se descarta (defensa extra sobre el abort, que no es instantáneo en todos
  los navegadores).
- Estados: `idle` → `loading` (skeleton discreto) → `ready` (conteo + hasta
  3 tarjetas) → `error` (mensaje inline, no bloquea el formulario).
- El link "Ver todas en Mis coincidencias" está deshabilitado hasta que
  `PerfilForm` reporte al menos un guardado exitoso en la sesión (prop
  `guardadoOk`, derivado del `status === "saved"` que `guardar()` ya
  produce hoy).

### Cambios en `src/components/perfil/PerfilForm.tsx`
- Nueva sección "¿Qué rango de contrato buscas?" con inputs `minCop` /
  `maxCop` (COP), en el mismo estilo que el resto del formulario.
- Layout: dos columnas en desktop (formulario a la izquierda, panel sticky
  a la derecha); en mobile el panel pasa a vivir arriba del formulario como
  barra resumen colapsable.
- Pasa `perfil` y `status === "saved"` (o equivalente) a
  `PerfilResultadosPanel`.

## Manejo de errores

- **Aborts intencionales** (nuestro propio debounce cancelando la petición
  anterior): detectados por `err.name === "AbortError"`, se ignoran en
  silencio — no son errores, es el mecanismo funcionando.
- **Fallas reales** (red, 500/503, JSON inválido): el panel pasa a estado
  `error` con mensaje discreto ("No pudimos calcular coincidencias ahora
  mismo"). Nunca bloquea el formulario — el usuario sigue editando y puede
  guardar igual.
- **401 en medio de la edición** (sesión expirada): mismo tratamiento que
  un error genérico en el panel — no redirige ni interrumpe.
- **503 del servidor**: el endpoint envuelve `getMatchesForPerfil` en
  try/catch y responde 503 simple si la base no responde. A diferencia del
  `PUT /api/perfil` existente, no necesita el patrón "concierge"
  (reenviar por correo) — no hay una escritura que rescatar, es solo una
  consulta.
- El guardado real (`guardar()`, botón "Guardar", su propio manejo de
  `DB_UNAVAILABLE`/concierge) no se toca.

## Testing

El repo no tiene ninguna prueba de componente React (`.test.tsx`,
testing-library) — solo se testean rutas API y lógica pura con vitest. Se
sigue esa convención:

- `app/api/perfil/preview/route.ts`: test siguiendo el mismo patrón que
  `src/__tests__/api/perfil-route.test.ts` — 401 sin sesión, 400 con body
  inválido, 200 con `{count, ejemplos}` mockeando `getMatchesForPerfil`, 503
  si `getMatchesForPerfil` lanza.
- `match.ts` / `getMatchesForPerfil`: sin cambios, ya cubiertos por
  `match.test.ts` existente.
- `PerfilResultadosPanel` (debounce/abort/estados de UI): sin test
  automatizado, consistente con que el repo no testea componentes.
  Verificación manual en navegador durante la implementación: tipear rápido
  no debe disparar múltiples requests simultáneas, el conteo debe
  actualizarse tras la pausa, y el estado de error debe aparecer si se
  corta la conexión a la base.

## Fuera de alcance (explícito)

- `SectorZonaSetup` / setup rápido de `/mis-coincidencias` — sigue siendo
  un form de servidor con recarga completa, sin panel en vivo.
- Cualquier cambio al motor de matching (`match.ts`, `verdict.ts`,
  `get-matches-for-perfil.ts`) — se reusa tal cual.
- Semáforo completo de compuertas (PASS/WARN/FAIL/UNKNOWN por proceso) en
  el panel — eso sigue viviendo solo en `/mis-coincidencias`.
- Aumentar el límite de 25 procesos por consulta en `getMatchesForPerfil` —
  limitación preexistente, no se toca en este trabajo.
