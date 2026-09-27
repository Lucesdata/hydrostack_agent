# Plan — Portada esencial (D)

Spec: `docs/superpowers/specs/2026-09-27-portada-esencial.md`.
Necesita aprobación (`docs/CONDUCTA.md` §4): toca más de tres archivos de
producción y retira dos rutas de API (`/api/procesos/recientes` y
`/api/landing-stats`).

## Orden

Tres PR, cada uno verificable por separado y desplegable sin los siguientes.
El PR 1 es el que más carga quita por archivo tocado (las 15 animaciones y el
ticker) y no cambia la disposición: si algo sale mal, se revierte solo.

### PR 1 — Fuera el ticker y el fondo animado; rampa y seleccionado

1. **`PortadaCliente.jsx`**: quitar `<ProcesosTicker />`,
   `BlueprintBackground` y `BLUEPRINT_CSS`. Queda el contenedor
   `.bp-page.tema-oscuro` con el hero y la Ficha Viva.
2. **`mapApiItem` sale de `ProcesosTicker.jsx`** a un módulo puro nuevo,
   `src/components/landing/proceso-resumen.js`: lo importa
   `ResumenDepartamento.jsx`. `BuscadorFichas.jsx` importa `frase` y `titulo`
   de `./texto` (ya viven ahí; el ticker solo los reexportaba).
3. **Borrar `ProcesosTicker.jsx`** y `ProcesosTicker.test.tsx`. Ese test
   prueba también `mapApiItem`, `frase` y `titulo`: sus casos pasan a
   `proceso-resumen.test.ts` y a un test de `texto.js`. Solo se borran los que
   renderizan el ticker.
4. **Borrar `app/api/procesos/recientes/route.ts`** y, en
   `src/lib/secop/recientes.ts`, `getProcesosRecientes` con sus dos fuentes.
   Se quedan `mapRowToResumen`, `ProcesoResumen` y `extractUrlProceso`: los usa
   `resumen-departamento.ts`. Ajustar `recientes.test.ts` a lo que queda.
   Antes de borrar la ruta, mirar en los logs de Vercel si alguien de fuera la
   llama; si hay tráfico, dejarla un ciclo más con una nota en `PENDIENTES.md`.
5. **`hero-territorial.module.css`**:
   - `.hero` sin los dos `radial-gradient` ni la rejilla de 40 px: fondo
     `var(--aq-bg)` plano.
   - `.clr-mapa__svg` sin `filter: drop-shadow(...)`.
   - Rampa: `--aq-e3: #3a9fe0`, `--aq-e4: #7cc4f0`, `--aq-e5: #c4e8fc`
     (e0–e2 igual). Vecinos medidos: 1,76 · 1,73 · 1,53 · 1,53 · 1,48.
   - Seleccionado: anillo de dos tonos como el de foco (trazo `--aq-bg` más
     halo claro), no trazo cian de 1,4.
   - Fuera la atenuación a 0,55 del resto del mapa al señalar.
6. **`app/opengraph-image.js`**: la misma `RAMPA` (lo exige
   `contraste-oscuro.test.ts`).
7. **`Navbar.js`**: ocultar «En línea» solo en `.clr-nav--oscuro`, la variante
   de la portada. El resto del sitio no cambia.
8. **Tests**: en `PortadaCliente.test.tsx`, los dos casos del fondo blueprint
   pasan a afirmar que no hay ticker, ni fondo animado, ni escucha de scroll.
   En `contraste-oscuro.test.ts` sale el bloque del ticker y se añade el
   contraste del anillo de seleccionado sobre `e0` y `e5`.
9. **Docs**: `CLAUDE.md` (sección «Landing»: «La portada solo lleva el
   ticker…», la cabecera y el ticker y la mención a `/api/landing-stats`) y
   este plan con las desviaciones.

Criterios del spec que cierra: 1, 9 y, en parte, 2.

**Desviaciones al implementarlo (2026-09-27).**
- **El anillo del seleccionado va en una capa aparte.** Con solo la clase
  `is-seleccionado`, los vecinos que se pintan después tapaban la mitad de su
  borde (medido en captura: Cundinamarca perdía el lado este). Ahora
  `ColombiaChoropleth` dibuja, con la prop `capaSeleccion`, un camino vacío
  encima de los 32 del continente (`.clr-mapa__marca`), y
  `useMarcasEnMapa` le copia el `d` del elegido (`contornoSeleccionado`, pura
  y probada). No se reordena el SVG: lo pinta React. San Andrés, en su
  recuadro, sigue con la clase.
- **Los logs de Vercel no se miraron**: no son accesibles desde el entorno
  donde se hizo el PR. La comprobación de tráfico a `/api/procesos/recientes`
  queda para antes del merge.
- **La regla `.bp-page a { text-decoration: none }` se queda**: vivía en el CSS
  del fondo pero afecta a todos los enlaces de la portada.
- **Medido tras el PR** (mismas fixtures que la línea de base): 0 animaciones
  en marcha; a 1440 × 900, 22 controles, 218 palabras y 33 cifras en el primer
  pliegue; `/` pasa de 16,7 kB (112 kB First Load) a 12,6 kB (108 kB).

### PR 2 — Dos zonas: mensaje y resultado · mapa

1. **`HeroTerritorial.jsx`**, rejilla nueva (`5fr 7fr` desde 900 px):
   - Izquierda: titular, una frase de lead, `BuscadorFichas`, el botón «Ver
     fichas de procesos» y el resultado del departamento.
   - Derecha: cabecera del mapa (título + «según ubicación de la entidad
     contratante» + `<details>` «Opciones del mapa» con dos `<select>`:
     métrica y tipo), el mapa, la leyenda y un `<details>` con la lista.
   - Fuera: eyebrow, botón de diagnóstico, línea `ctaMeta` con el punto vivo,
     enlace a precios, `TiposProyecto`, el enlace «Comparar…», el tooltip y
     los dos `sticky`.
   - Bajo 900 px: mensaje, mapa, resultado y lista plegada.
2. **`FichaDepartamento.jsx` → resultado**: nombre, «N procesos abiertos · X %
   del país», la marca de vista previa y el `aria-live` de hoy. Fuera los datos
   secundarios (`nuevos7d`, monto, entidades) y la nota de la sede, que pasa a
   la cabecera del mapa. Sin tarjeta blanca: texto sobre el fondo, separado por
   un filete.
3. **`ResumenDepartamento.jsx`**: solo los tres destacados, como filas (objeto
   en una línea, valor, entidad · municipio) y el enlace «Ver las N fichas de
   X». Fuera `Sparkline` y su tabla (**decisión pendiente 1**). La API
   `/api/departamento/[dpto]/resumen` no se toca en este PR: sigue devolviendo
   `semanas`. Anotar en `PENDIENTES.md` que esa consulta queda sin uso.
4. **`ListaTerritorios.jsx`** dentro del `<details>`: dos columnas, sin su
   buscador propio ni el desplazamiento sincronizado (con la lista plegada no
   hay nada que desplazar). Se conservan los botones con `aria-pressed` y
   `aria-controls`.
5. **`PortadaCliente.jsx`**: fuera el `fetch("/api/landing-stats")` y el estado
   `sector`; la cifra de «procesos del sector» ya no se pinta. **Borrar
   `app/api/landing-stats/route.ts`** (su único consumidor es este) y
   `getProcesosVigilados` de `src/lib/landing/cifras.ts` si queda sin uso.
   `src/lib/secop/landingStats.ts` **se queda**: `/mis-coincidencias` usa
   `getEnJuegoMes`. Misma comprobación de tráfico que en el PR 1.
6. **Mapa** (`ColombiaChoropleth.tsx`, `rotulos.ts`, `estilos.ts`):
   - `colocarRotulos(continente, max)` con `max` por parámetro; la portada pide
     5. `MAX_ROTULOS` sigue siendo el tope por defecto.
   - Rótulos sin `<rect>` ni guía salvo cuando la caja se desplaza. Texto con
     halo (`paint-order: stroke`). La colocación sigue usando el tamaño de caja
     para evitar solapes, así que el algoritmo y su test no cambian.
   - Tamaños para cumplir el criterio 6 (≥ 11 / 14 px a 1440).
   - La leyenda del servidor se queda como lista (lectores de pantalla); el
     CSS del hero la pinta como barra con los extremos visibles. La de monto
     (`.leyendaMonto`) va en el mismo sitio y con el mismo formato: se acaba el
     salto de ≈90 px.
7. **`sincronia.js`**: borrar `contenidoTooltip` y sus tres casos en
   `sincronia.test.ts`. `indicesDeModo`, `usePinturaEnMapa` y
   `useMarcasEnMapa` se quedan.
8. **Tests a reescribir**: `HeroTerritorial.test.tsx` (tipos nacionales,
   entidades, CTA de diagnóstico, «ver como lista»), `PortadaCliente.test.tsx`
   (tipos nacionales), `ResumenDepartamento.test.tsx` (la sparkline sale),
   `rotulos.test.ts` (`max` por parámetro), `ColombiaChoropleth.test.tsx` (sin
   `rect`) y en `contraste-oscuro.test.ts` el bloque «la tarjeta blanca de la
   ficha», que pasa a medir el resultado sobre `--aq-bg`.
9. **Docs**: `CLAUDE.md` (Hero Territorial V2, «Ficha del departamento y
   tooltip», «Destacados y tendencia», «Rediseño visual», «Buscador y métrica
   del mapa») y `PENDIENTES.md`.

Criterios del spec que cierra: 2 a 8.

### PR 3 — Ficha Viva condensada (no empieza sin la decisión 2)

1. **`FichaViva.jsx`**: titular, las cuatro preguntas (el estado «Depende del
   pliego» se conserva en la segunda) y un botón «Abrir fichas de procesos».
   Fuera `Esquema`, `Arbol`, la leyenda de color, «Seguir sus cambios» y el
   segundo botón.
2. **`ficha-viva.module.css`**: recortar lo que quede sin uso.
3. **Tests**: `FichaViva.test.tsx` pierde los casos del esquema, «Seguir sus
   cambios», la leyenda de color y el diagnóstico; conserva «las cuatro
   preguntas», «no promete alertas» y «va después del hero». En
   `contraste-oscuro.test.ts` sale el bloque del árbol.
4. Si el esquema y el árbol se mudan a otra página, es trabajo aparte con su
   propio spec.

## Riesgos

- **Rutas de API retiradas.** Sin consumidores en el repo, pero pueden tener
  tráfico de fuera (monitorización, enlaces guardados). Se miran los logs antes
  de borrar.
- **`overflow: clip` del `.hero`** estaba para que funcionara el `sticky`. Sin
  `sticky` puede volver a `hidden`, pero no hace falta cambiarlo.
- **Tests que vigilan colores escritos a mano** (`contraste-oscuro.test.ts`
  comprueba que los colores siguen en el archivo): cada color que se quite de
  un CSS hay que quitarlo también del test, o el test falla. Es lo que se busca.
- **Móvil**: el toque en el mapa navega a la faceta (decisión D), así que en
  móvil el resultado solo cambia desde la lista. Es igual que hoy.
- **SEO**: el ticker se pintaba en el cliente, así que no aportaba contenido
  indexable; quitarlo no cambia el HTML del servidor. El JSON-LD `Dataset` se
  queda.

## Verificación en cada PR

```
npm test
npm run build      # con el preview PARADO
npm run lint
npx prettier --check "src/**/*" "app/**/*"
```

Además, sobre el preview de Vercel: capturas a 1440, 1280 y 390, y la medición
de los criterios 1–7 del spec con Playwright (controles, palabras, cifras y
animaciones visibles; tamaño de la tierra del mapa y de los rótulos; posición
del mapa en móvil). Valores de partida medidos el 2026-09-27 sobre la rama
`ff48f6f`: 24 controles, 270 palabras, 34 cifras y 15 animaciones a 1440;
tierra 415 × 573 px; rótulos 8,4 / 11,6 px; mapa en móvil en y = 779.
Referencia medida en la maqueta D: 12 · 185 · 10 · 0; tierra 521 × 719 a 1440
y a 1280; rótulos 11,6 / 15,2 px; mapa en móvil en y = 499.
