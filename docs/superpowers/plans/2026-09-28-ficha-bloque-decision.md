# Plan — Bloque de decisión en la ficha

Spec: `docs/superpowers/specs/2026-09-28-ficha-bloque-decision.md` (D1–D3
cerradas el 2026-09-28).
Necesita aprobación (`docs/CONDUCTA.md` §4): toca la compuerta de zona en
`verdict.ts`, el matching de /mis-coincidencias y más de tres archivos de
producción de la ficha.

## Reconocimiento: qué existe ya

| Pieza | Dónde | Qué hace hoy |
|---|---|---|
| Página de la ficha | `app/licitaciones/[slug]/page.tsx` | Nueve secciones en orden de fuente; ISR con `revalidate = 43200` (12 h). |
| Semáforo de la ficha | `src/components/secop/ficha/SemaforoConPerfil.tsx` | Isla de cliente: pinta la lectura absoluta del servidor y, si encuentra perfil (primero `/api/perfil`, luego `localStorage`), la sustituye por la relativa vía `POST /api/secop/verdict`. **Solo lo usa la ficha.** |
| Semáforo genérico | `src/components/secop/semaforo/Semaforo.tsx` | Lo usan también el explorador y `ProcessDetail`. **No se toca.** |
| Vistas de compuerta | `src/lib/secop/semaforo.ts` | `CLAVES_COMPUERTA`, `ETIQUETA_COMPUERTA`, `PALABRA_ESTADO`, `compuertasAbsolutas`, `compuertasDesdeVeredicto`. |
| Compuertas | `src/lib/secop/verdict.ts` | `ubicacionGate` da `FAIL` fuera de cobertura (línea ~420); `habilitacionGate` da `WARN` con «no declaraste este dato» cuando al perfil le falta un indicador. |
| Redacción | `src/lib/secop/verdict-publico.ts` | Sin cuenta oculta los `reason`, salvo `overall === "FAIL"` (en la compuerta en `FAIL`) y `UNKNOWN`. |
| Matching | `src/lib/matching/get-matches-for-perfil.ts`, `get-matches-for-perfil-minimo.ts` | Descartan `overall === "FAIL"` después de pedir 25 procesos. |
| Migración del perfil local a la cuenta | `SecopExplorer.tsx` (~líneas 116-140) | Al iniciar sesión, si la cuenta no tiene perfil y hay uno local, lo sube con `PUT /api/perfil`. **Solo pasa en el explorador.** |
| Pliego en la ficha | `PliegoFicha.tsx`, `pliego-ficha.ts`, `subirPliegoDesdeFichaAction` | Subida con sesión; revalida la ficha; cachea `requisitos_proceso`, que `/api/secop/verdict` ya lee para la habilitación. |
| Contraste | `src/__tests__/design/contraste.test.ts`, `contraste-oscuro.test.ts` | Leen tokens reales y fallan si baja el contraste. |

No se crea ningún archivo que duplique un rol de estos.

## Orden: tres PR

Cada PR se despliega solo y se puede revertir solo. El 1 va primero porque es
lógica de dominio con su propio riesgo (el matching) y conviene aislarlo del
cambio visual.

### PR 1 — Zona fuera de cobertura pasa a «revisar» (D2)

1. **`verdict.ts` · `ubicacionGate`**: la rama «fuera de cobertura» devuelve
   `WARN` con `reason` sobre la entidad:
   `la entidad está en ${lugar}, fuera de tu cobertura; el lugar de ejecución no está confirmado`.
   También la rama `PASS` pasa a hablar de la entidad
   (`la entidad está en tu cobertura (${lugar})`). `UNKNOWN` no cambia.
   Se exporta `fueraDeCobertura(g: GateResult): boolean` junto a la compuerta:
   hoy `WARN` en zona solo significa eso, y el helper evita que el matching
   dependa de esa coincidencia.
2. **Matching**: `getMatchesForPerfil` y `getMatchesForPerfilMinimo` filtran,
   además del `FAIL`, `fueraDeCobertura(gates.ubicacion)`. /mis-coincidencias
   queda con el mismo contenido que hoy (criterio 12 del spec). **Las alertas
   diarias también llaman a `getMatchesForPerfil`** (`src/lib/alertas/`), igual que la vista previa del perfil (`app/api/perfil/preview`): con el
   filtro en esa función, el correo tampoco cambia. Los tests de `alertas/`
   (`run-daily`, `enviar-ahora`) tienen que seguir en verde sin tocarlos.
3. **Tests**:
   - `verdict.test.ts`: el caso «Antioquia» pasa de `FAIL` a `WARN` y comprueba
     el texto de la entidad; caso nuevo: un perfil con todas las demás en `PASS` y
     la zona fuera da `overall === "WARN"`.
   - `match-minimo.test.ts` y un test nuevo de `get-matches-for-perfil*.ts`
     (hoy no tienen uno propio; `searchProcesosDb` simulado): un proceso fuera
     de cobertura **no** aparece, uno dentro sí. Es el test de regresión del
     criterio 12.
   - `verdict-publico.test.ts`: un veredicto cuya única compuerta no favorable
     es la zona en `WARN` **redacta** su `reason` sin cuenta (antes, al ser
     `FAIL`, se mostraba).
   - `semaforo.test.ts:119` usa `FAIL` con «fuera de tu cobertura» como fixture
     de la palabra «no cumple»: se cambia el texto del fixture, no el estado.
4. **Docs**: `CLAUDE.md` §4 (la frontera del veredicto) menciona el caso;
   `PENDIENTES.md` no cambia.

Riesgo: bajo. La compuerta es pura y está cubierta; el único consumidor que
filtra por `FAIL` es el matching, y queda fijado por test.

### PR 2 — El bloque de decisión

1. **Frase del veredicto, pura y con test** → `src/lib/secop/semaforo.ts`
   (ya es el módulo de presentación de compuertas; no hace falta otro):
   `fraseVeredicto(compuertas: CompuertaVista[], relativo: boolean): { titulo, bajada }`.
   Sale del conteo por estado y del nombre de la compuerta que falta. Sin perfil
   (`relativo === false`), la frase fija «Esto exige el proceso. Si te sirve,
   depende de tu empresa.». Criterio 4.
2. **Siguiente paso, puro y con test** → mismo módulo:
   `siguientePaso({ relativo, conCuenta, conPliego, compuertas }): { cta, ayuda, secundario, destino }`,
   con la tabla del §2e del spec. `destino` es una ruta o un ancla, nunca una
   acción. Criterio 10.
3. **«Falta un dato del perfil»**: hoy solo se sabe leyendo el texto de
   `reason`, que es frágil. `habilitacionGate` añade a su `GateResult` un campo
   opcional `faltanEnPerfil?: string[]` (las etiquetas de `INDICADOR_LABEL`
   que el perfil no declara). **`verdict-publico.ts` lo redacta junto al
   `reason`**: un proceso cuyo pliego subió otra cuenta tiene
   `requisitos_proceso` en caché, y un anónimo con perfil local vería el hueco
   de otro modo. Test en `verdict-publico.test.ts` con un centinela, como los
   que ya tiene.
4. **La isla**: `SemaforoConPerfil.tsx` se sustituye por
   `src/components/secop/ficha/BloqueDecision.tsx` (`"use client"`), que:
   - conserva la lógica y los comentarios de la isla actual (lectura absoluta
     del servidor como estado inicial, perfil remoto antes que local, veredicto
     por `POST /api/secop/verdict`, nada personal en el HTML);
   - sabe si hay cuenta (la respuesta de `/api/perfil` es 200 o 401);
   - recibe del servidor si hay pliego procesado, presupuesto, fechas y
     modalidad;
   - calcula «quedan N días» y la barra del plazo **en el cliente**, solo si
     existen `fechaPublicacion` y `fechaRecepcion` (criterio 7);
   - pinta: recorrido, veredicto, tres datos, canal, «Por qué, una por una»,
     «¿Primera vez?» y el siguiente paso.
   `SemaforoConPerfil.tsx` se borra (solo lo usaba la ficha).
5. **El canal**: `src/components/secop/ficha/CanalCompuertas.tsx`, de servidor
   (sin estado propio: recibe las `CompuertaVista`). SVG en línea, una compuerta
   por estado con la geometría de la maqueta; el agua se corta en la primera
   `FAIL`. Cada compuerta lleva su palabra de `PALABRA_ESTADO` en texto, y el SVG
   va con `aria-hidden`. Criterio 3.
6. **Migración del perfil local a la cuenta**: la de `SecopExplorer.tsx` sale a
   `src/lib/state/clientStore.ts` como `sincronizarPerfilConCuenta()` y la usan
   el explorador y `BloqueDecision`. Sin esto, D1 fallaría: quien define su
   perfil sin cuenta y se registra para subir el pliego volvería a la ficha sin
   perfil. Test del caso «cuenta sin perfil + perfil local ⇒ `PUT` una vez».
7. **«Define tu perfil»** enlaza al asistente de perfil que ya existe en el
   explorador, con vuelta a la ficha (`?volver=/licitaciones/…`). Si el
   explorador no admite el parámetro, se añade ahí; es la única línea que toca.
8. **`page.tsx`**: la cabecera (tres chips, número con copiar, «Abrir en SECOP
   II») y el bloque en lugar de «Cómo te queda a ti» + «Cifras». El botón de
   copiar es una isla mínima dentro de `BloqueDecision` o su propio componente
   de 15 líneas; no se añade dependencia.
9. **Estilos**: `src/components/secop/ficha/estilos.ts` (donde vive
   `ESTILOS_FICHA`). La banda usa `--accent-ocean`; los dos tonos claros sobre
   ella (`#C7E6F7`, `#7DD3FC`) se declaran como tokens nuevos en `globals.css`
   (`--on-ocean-muted`, `--on-ocean-accent`) para que los mida la prueba. En
   móvil (< 600 px): dos tarjetas y **barra de acción fija al pie** con
   `position: sticky`.
10. **Tests**:
    - `semaforo.test.ts`: `fraseVeredicto` y `siguientePaso` (una prueba por fila
      de la tabla del spec).
    - `BloqueDecision.test.tsx` (Testing Library, `fetch` simulado): sin perfil,
      con perfil local sin cuenta, con cuenta sin pliego, con pliego y dato
      faltante; y que sin JS el HTML inicial es la lectura absoluta.
    - `CanalCompuertas.test.tsx`: cada estado lleva su palabra; el agua se corta
      tras la primera `FAIL`.
    - `contraste.test.ts`: los dos tokens nuevos sobre `--accent-ocean` ≥ 4,5:1
      (hoy 7,25 y 5,67). Criterio 9.
    - `ficha.test.ts` o el test de la página: presupuesto 0 no sale como «$0».
11. **Docs**: `CLAUDE.md` (sección de la ficha) y la nota de este plan.

Riesgo: medio. Es la página más visitada por buscadores; se protege con el
criterio 5 (HTML sin JS completo y sin perfil) y con el build de producción.

### PR 3 — Debajo del bloque, en orden de decisión

1. `page.tsx`: orden Pliego → Competencia → Fechas → Detalle (plegado en
   `<details>`: UNSPSC, tipo de contrato, acceso a documentos) → Cierre.
2. Las tres casillas «está en el pliego» y las filas grises de «Análisis de
   oferta» se juntan en un aviso «Lo que desbloquea el pliego» dentro de
   `PliegoFicha.tsx` cuando no hay pliego. Con pliego, el presupuesto por
   capítulo se queda donde está.
3. Tests: `PliegoFicha.test.tsx` (el aviso sale sin pliego y no con pliego).

Riesgo: bajo. Solo reordena y agrupa.

## Validación de cada PR

Antes de pedir revisión, con la salida pegada en el PR (`CONDUCTA.md` §5):

```
npm test
npm run build      # con el preview PARADO
npm run lint
npx prettier --check "src/**/*" "app/**/*"
```

Y en el preview de Vercel: una ficha real sin sesión, con perfil local y con
cuenta, a 1280 y a 390 px (criterios 1 y 2). Cuando esté el PR 2, la prueba con
dos personas del criterio 13.

## Fuera de este plan

- Buscar por número de proceso o pegar el enlace del SECOP (spec aparte).
- Rango probable de la oferta ganadora y probabilidad de adjudicación.
- Revocar los GRANT de `anon`/`authenticated` (pendiente de seguridad aparte).
