# Plan — hero «Explora el mapa. Entiende cada proceso.»

**Fecha:** 2026-10-02 · **Spec:** [`specs/2026-10-02-hero-mapa-ficha.md`](../specs/2026-10-02-hero-mapa-ficha.md)
· **Referencia:** [`referencia-aprobada.png`](../specs/2026-10-02-hero-mapa-ficha/referencia-aprobada.png)
· **Estado:** propuesto, **pendiente de aprobación** (`docs/CONDUCTA.md` §4: más de
tres archivos de producción). No se ha tocado código de producto.

## 1. Revalidación sobre la base real

El spec se escribió sobre `1d39870` (`codex/ficha-movil-interactiva`). La base de
implementación es `main` en `c533b45`, que ya incluye el hero v2 (#98), la ficha
interactiva móvil (#99) y el bloque de decisión (#95). Revisado leyendo el código
(`graphify` y `node_modules` no están instalados en este contenedor; se instalarán
con `npm ci` al implementar, sin dependencias nuevas).

**Coincide con el spec:**

- Hashes de la ficha: `ExploradorFicha.tsx` mapea `#ficha-{id}` y `#pliego`/`#pliego=…`
  → «participar»; `app/licitaciones/[slug]/page.tsx` define las secciones `resumen`,
  `dinero`, `plazos` y `participar`. Los cuatro destinos de §8 existen.
- API de resumen: `N_DESTACADOS = 3`, orden `valor_estimado DESC NULLS LAST,
  fecha_publicacion DESC`, cabeceras `s-maxage=21600, swr=3600` / 503 `no-store`.
- `useResumenDepartamento` agrupa error HTTP, red y payload inválido como `empty`
  (hallazgo 3); `mapApiItem` cae a `/licitaciones` y al nombre de la entidad
  (hallazgo 4).
- La rejilla del hero es `minmax(300px, 380px) minmax(0, 1fr)` y el hero tiene
  `overflow: clip` (riesgo para el panel del buscador, §11).
- `.tema-claro` existe en `globals.css`.

**Divergencias que piden una decisión antes de implementar** (el spec gana sobre
el código según su §1, pero estas revierten decisiones recientes registradas en
`CLAUDE.md`, así que las confirmo en vez de asumirlas):

| # | Hoy en `main` | Lo que pide el spec | Propuesta |
|---|---|---|---|
| A | **Vista país** al cargar: sin departamento ni destacados (hero v2, 2026-09-28). | §7.1: elegir de entrada el primer departamento con `n > 0`. | Seguir el spec: la imagen muestra un departamento y una tarjeta, y sin eso el primer pantallazo no tiene ficha que abrir. Se retira «← Colombia» (no hay vista país que recuperar); la lista sigue permitiendo cambiar. |
| B | Cada destacado lleva el **semáforo absoluto** sin Habilitación (2026-09-29) y el gancho «Crea tu perfil para saber si cumples». | §4/§6: la tarjeta lleva chip, objeto, línea «Objeto · Presupuesto · Plazos · Requisitos» y «Ver ficha». Nada más. | Seguir el spec y **retirar el semáforo y el gancho del hero**. La referencia no los tiene y el spec prohíbe añadir datos a la tarjeta. El semáforo sigue en la ficha (bloque de decisión). `ESTILOS_SEMAFORO` y los colores del semáforo en `hero-territorial.module.css` salen con él; sus medidas en `contraste-oscuro.test.ts` se retiran o se reapuntan. |
| C | El titular dice «Descubre en qué procesos de agua puedes participar.» y el botón principal es «Ver las N fichas de X». | H1 y CTA de §6. | Seguir el spec. «Ver las N fichas» pasa a enlace secundario «Ver todos los procesos de {dpto} →» (sin el conteo como protagonista). |
| D | El spec pide retirar un «botón lleno bajo el buscador». | — | En `main` ya no existe (salió con el hero v2). Nada que hacer; lo anoto para que no se busque. |

Si alguna de A–C se responde distinto, cambia el alcance de las tareas T2–T4 y
este plan se revisa antes de seguir.

## 2. Decisiones técnicas

1. **Un solo dueño del estado del destacado: `PortadaCliente`.** Tiene hoy el
   hero y la Ficha Viva como hermanos. El estado `{clave elegida}` y el resultado
   de `useResumenDepartamento(clave)` suben ahí y bajan por props a los dos
   (§9: «no dos componentes que consulten el mismo resumen»). Sin contexto ni
   librería: dos props.
2. **Estado asíncrono con identidad** (`ResumenDepartamento.jsx`):
   `{ clave, status: "loading" | "live" | "empty" | "error", destacado }`.
   - 200 con `destacados: []` → `empty`; 200 con shape inválido, HTTP ≠ 2xx o red
     → `error` (no se cachea). Solo `live`/`empty` entran en la caché en memoria.
   - La respuesta se descarta si su clave ya no es la pedida (`vivo` + comparación
     de clave), y el hook devuelve `loading` para cualquier clave distinta de la
     del resultado: A tardía nunca pinta sobre B (I05).
   - `reintentar()` vuelve a pedir la misma clave; un ref de «en vuelo» impide
     dos peticiones simultáneas (I06).
3. **Destacado validado aparte de `mapApiItem`**: una función pura nueva
   `destacadoDeApi(item)` en `proceso-resumen.js` que devuelve `null` si `id` no
   es válido o `ficha` no casa con `^/licitaciones/[a-z0-9-]+$` terminando en el
   id (sin esquema, sin `//`, sin rutas de cuenta). No usa los fallbacks de
   `mapApiItem` (objeto → «Proceso sin objeto publicado», nunca la entidad).
   `mapApiItem` no se toca: lo usan otros consumidores y sus pruebas.
   Primer elemento inválido → estado «destacado no disponible» (fila de §9), sin
   probar el segundo (el spec manda «solo el primero»).
4. **Enlaces de proceso derivados de una sola fuente**:
   `enlacesDeFicha(href)` → `{ ficha, resumen, dinero, plazos, pliego }`. El CTA y
   los cuatro accesos salen del mismo objeto (I04). Sin destacado `live`, la
   franja recibe `null` y pinta texto sin `href`.
5. **Vista previa separada del territorio confirmado** (§7.3): el título del
   resultado usa solo `seleccionado`; el puntero/foco escribe en una línea
   reservada del panel del mapa («{Nombre}: {N} procesos abiertos» / ayuda
   neutral), sin `aria-live`. Sale el `data-atenuado`.
6. **Mapa intacto**: `sincronia.js`, `useMarcasEnMapa`, `usePinturaEnMapa`,
   opciones, leyenda de monto y lista no cambian de lógica. El clic del mapa sigue
   navegando a la faceta (decisión D). La ayuda de §7.1 junto a la lista y la de
   §10 con tipo activo son texto nuevo.
7. **Buscador**: solo copy (placeholder y `aria-label` de §6) y CSS. Se revisa el
   `overflow: clip` de `.hero` para que el panel de resultados no se recorte:
   se traslada el recorte al contenedor del mapa si hace falta.
8. **Franja inferior** (`FichaViva.jsx`): se reescribe con el titular H2, el panel
   `.tema-claro`, chip «QUÉ ENCONTRARÁS», cuatro columnas con iconos SVG en línea
   (`aria-hidden`), estado «Los accesos se habilitan…» y la línea auxiliar con
   «Cómo razona la ficha». `ComoRazonaFicha.jsx` y sus estilos compartidos no
   cambian; los estilos viejos de la portada que solo usaba la sección retirada
   se borran.
9. **Sin JS**: `<noscript>` en el resultado con el texto de §12; la franja sin
   JS sale en su estado sin enlaces (el SSR ya es `loading`).

## 3. Archivos

| Archivo | Cambio |
|---|---|
| `src/components/landing/PortadaCliente.jsx` | Dueño de `clave` + resumen; pasa props a hero y franja. |
| `src/components/landing/hero-territorial/HeroTerritorial.jsx` | Nueva composición, copy, selección inicial, vista previa en el panel del mapa, enlace secundario, ayudas. |
| `src/components/landing/hero-territorial/ResumenDepartamento.jsx` | Hook con identidad/error/reintento; `TarjetaProceso` en lugar de la lista de dos con semáforo. |
| `src/components/landing/hero-territorial/FichaDepartamento.jsx` | Encabezado H2 del departamento confirmado; sin conteo ni %. Se conservan sus helpers exportados si otros los usan. |
| `src/components/landing/hero-territorial/BuscadorFichas.jsx` | Placeholder y `aria-label`. |
| `src/components/landing/hero-territorial/hero-territorial.module.css` | Rejilla ~1:1, escalas de §5, tarjeta, CTA rectangular, responsive de §5.3, retirada de estilos del semáforo y de la lista de destacados. |
| `src/components/landing/ficha-viva/FichaViva.jsx` | Franja nueva de §8. |
| `src/components/landing/ficha-viva/ficha-viva.module.css` | Estilos de la franja; sin tocar los de `ComoRazonaFicha`. |
| `src/components/landing/proceso-resumen.js` | `destacadoDeApi()` y `enlacesDeFicha()` (puras). |
| Pruebas `src/__tests__/landing/*` y `src/__tests__/design/contraste-oscuro.test.ts` (+ `tema-oscuro.test.ts` si aplica) | Ver T6. |
| `CLAUDE.md`, `PENDIENTES.md` | Solo al final, con lo implementado (§14 del spec). |

**No se tocan:** `app/page.js`, `app/api/**`, `src/lib/secop/**`, `sincronia.js`,
`ListaTerritorios.jsx` (salvo que la ayuda de §7.1 tenga que ir dentro),
`ExploradorFicha.tsx`, `ComoRazonaFicha.jsx`, esquema, auth, dependencias.

## 4. Tareas

Cada una se valida por separado antes de la siguiente.

| T | Tarea | Criterios | Validación |
|---|---|---|---|
| T1 | `destacadoDeApi` y `enlacesDeFicha` puros + pruebas (ruta externa, `javascript:`, `//`, ruta de cuenta, id que no casa, objeto ausente). | D01, D02, I04 | `vitest` de `proceso-resumen.test.ts`. |
| T2 | Hook con estados `loading/live/empty/error`, identidad por clave, caché solo de éxitos, reintento sin duplicados. Subir el estado a `PortadaCliente`. | D03, I01, I05, I06, P02 | Pruebas del hook con `fetch` simulado y respuestas fuera de orden (si el entorno de pruebas no ejecuta efectos, se prueban las funciones puras de transición y la carrera se verifica en navegador, §16). |
| T3 | Hero: composición, copy, selección inicial (A), tarjeta única sin semáforo (B), enlace secundario (C), vista previa en el panel del mapa, ayudas de lista y tipo, `<noscript>`, estados de §9. | V01–V03, D01, D04, I02, I03, I07, A04 | Render estático de estados en `HeroTerritorial.test.tsx`/`ResumenDepartamento.test.tsx`. |
| T4 | CSS del hero (§5.1, §5.3), panel del buscador sin recorte, retirada de estilos muertos. | V01, V03–V05, B01, A01 | Capturas a 1440/1280/1024/768/390/320; búsqueda con cinco resultados. |
| T5 | Franja inferior y su CSS en `.tema-claro`, con estados sin enlace. | V02, I04, A01, A02 | `FichaViva.test.tsx`; captura. |
| T6 | Pruebas: adaptar las cuatro de landing; contraste de los colores nuevos (oscuro: tarjeta, chip, placeholder, notas; claro: panel, chip, enlaces); retirar medidas del semáforo del hero. Mantener `BuscadorFichas`, `sincronia`, `ComoRazonaFicha`, Dataset y PGlite. | A02, R01 | `npm test`. |
| T7 | Verificación de cierre: comandos de §16, navegador (§16 pasos 1–8, con Chromium preinstalado y la API simulada para lento/fallo/vacío/carrera), sin JS, consola y red. | Todos; P01, P03 | `npm test`, `build`, `lint`, `prettier --check`, `presupuesto`, `graphify update .` si está disponible. |
| T8 | `CLAUDE.md` (decisiones sustituidas de §14 y A–C) y `PENDIENTES.md` si algo queda abierto. Commit, push a la rama y PR. | R02 | Diff revisado. |

## 5. Riesgos

- **Datos en local.** Sin `DATABASE_URL` en el contenedor el mapa sale sin datos;
  la comparación visual con datos reales se hará con fixtures de prueba claramente
  separados de producción, o en el preview de Vercel del PR. Se dirá cuál se usó.
- **Primer pantallazo.** Con la escala de la imagen (H1 52–60 px, mapa 400–510 px)
  1366×768 no cabe entero; el spec lo acepta (§5.3) y deroga la exigencia del
  2026-09-29. Se reporta la altura medida.
- **Presupuesto de JS.** Quitar el semáforo del hero debería bajar el JS inicial;
  se medirá antes/después, sin subir límites.
- **`overflow: clip`.** Lo puso un PR anterior para que el mapa ensanchado no
  desbordase; moverlo puede reabrir ese desborde a 320 px. Se comprueba en T4.
- **Pruebas de render estático** no ejercitan efectos: no se afirmará que cubren
  la carrera A→B; esa evidencia será de navegador.
