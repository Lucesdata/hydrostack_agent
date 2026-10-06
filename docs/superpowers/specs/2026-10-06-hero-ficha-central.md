# Hero territorial con ficha central — spec de cambios

**Fecha:** 2026-10-06 · **Sustituye a:** `2026-10-04-hero-cinco-minifichas.md` (solo la composición y la fila de cinco tarjetas; el contrato de datos y la consulta no cambian).
**Prototipo de referencia:** `Hero AquaLicita v2 ficha central.dc.html` (procesos ficticios; las cifras y los textos son ilustrativos).
**Destino sugerido en el repo:** `docs/superpowers/specs/2026-10-06-hero-ficha-central.md`.

## 0. Qué no cambia

- `muestraPortada()`, `ProcesoPortada`, `gruposDe()` (grupos de 5, hasta 30), el ISR de 6 h y la elegibilidad.
- Los colores del tema oscuro (`--aq-*`) y los de familia (`tipo-color.ts`, `oscuro`).
- `BuscadorGuiado` (activador + modal), su CSS y sus formularios GET.
- Los estados `procesos === null` (error) y `[]` (vacío), con los mismos textos.
- «Ver otros 5 procesos», «Pausar/Reanudar recorrido», «Ver todas las fichas →», el aviso `sr-only` y el recorrido de 5 s con `prefers-reduced-motion`.
- El anclaje departamental (`anclaDe`, `ANCLAS_INTERIORES`) y el tinte de los departamentos por familia (incluido «mixta»).

## 1. Composición

Pasa de «mensaje · mapa / tarjetas a todo el ancho» a **dos columnas**:

| Columna | Contenido, de arriba abajo |
|---|---|
| Izquierda (≈44 %) | `h1`, `.lead`, `BuscadorGuiado`, **la ficha única**, la fila de navegación (← · puntos · «n de 5» · →), `.procesosPie` |
| Derecha (≈56 %) | el mapa, sin columnas de etiquetas, y la leyenda debajo |

- `.grid`: `grid-template-columns: minmax(0, 44fr) minmax(0, 56fr)`; `grid-template-areas: "copy mapa"`; `.procesos` se mueve **dentro** de `.copy`, después de `<BuscadorGuiado />` (deja de ser un área propia). `align-items: center`; `column-gap: clamp(24px, 3vw, 48px)`.
- `.copy`: `display: flex; flex-direction: column; align-items: flex-start`. `.procesos` dentro: `align-self: stretch; margin-top: 28px`.
- `.hero`: `min-height: 100vh; display: flex; flex-direction: column; justify-content: center`. `.contenedor` lleva `width: 100%`. El hero se centra en la pantalla y el espacio que sobra se reparte arriba y abajo, nunca solo al final.
- Tipografía algo menor para que todo quepa en la columna:
  - `.copy h1`: `font: 700 clamp(2rem, 1.6rem + 1.6vw, 3.2rem)/1.07`
  - `.lead`: `margin-top: 14px; font-size: clamp(16px, 0.8rem + 0.4vw, 20px)`

## 2. Ficha única (sustituye a la fila de cinco)

- `Minifichas` renderiza **solo el proceso activo** del grupo visible: `<ul aria-label="Proceso para explorar">` con una sola `Minificha`. Se mantiene la estructura de la opción B: cabecera, pastillas, panel, pie y un único enlace «Ver ficha →» estirado con `::after`.
- **Siempre hay un proceso activo**: `activo ?? lista[0].id`. Al cambiar de grupo o pausar, vuelve al primero (no a `null`).
- Al soltar el puntero o perder el foco, **no** se desactiva (antes `onActivar(null)`): la ficha nunca queda vacía.
- La tarjeta siempre lleva el aspecto activo (`[data-activo]`): borde `color-mix(var(--fam) 75%, #fff)` y fondo `--aq-card-activa`.
- `.aqMiniObjeto`: `font: 650 17px/1.3`, `text-wrap: pretty`; se mantiene el recorte a 2 líneas.
- Ancho: el de la columna izquierda (sin `max-width` propio).
- Se elimina `useActivarAlDesplazar` (ya no hay fila desplazable) y las reglas `.aqMinifichas` de rejilla y desplazamiento en ≤1199 px.

### Navegación de la ficha (nueva)

Debajo de la ficha, `display: flex; align-items: center; gap: 12px; margin-top: 12px`:

1. Botón **←** (`aria-label="Proceso anterior"`): 36×36, circular, `border: 1px solid rgba(140,190,225,.28)`, fondo `--aq-card`; al pasar el puntero, `border-color: --aq-cyan` y fondo `--aq-card-activa`.
2. **Puntos**, uno por proceso del grupo, cada uno un botón (`aria-label="Ver proceso n"`): 7×7 px, `border-radius: 999px`, `rgba(159,180,198,.4)`. El activo mide 22×7 y es `--aq-cyan`, con transición de `width` y `background-color` (.2 s).
3. Texto **«n de N»**: 12 px / 500, `--aq-muted`, `tabular-nums`.
4. Botón **→** (`aria-label="Proceso siguiente"`), igual que ←.

← y → son circulares (vuelven al principio o al final). El recorrido de 5 s avanza la misma posición y se pausa al interactuar con la ficha o el mapa (`pausaAlInteractuar`, sin cambios).

**Pendiente de accesibilidad:** valorar `aria-live="polite"` en la ficha **solo** con navegación manual (no durante el recorrido), igual que el aviso de «Ver otros».

## 3. Mapa

### 3.1 Sin columnas de etiquetas

- `MapaSeleccion`: el `viewBox` pasa de `-150 0 720 520` (`MARGEN_ETIQUETAS = 150`) a **`-8 0 436 520`**. El país ocupa todo el panel.
- Se eliminan las guías (`.clr-mapa__guia`) y las columnas oeste/este. `colocarEtiquetas` y `X_COLUMNA` dejan de usarse en este hero; no se borran si otros mapas los importan.
- `preserveAspectRatio="xMidYMid meet"`.
- Alto del SVG: `height: clamp(440px, calc(100vh - 110px), 860px); width: 100%`. Sustituye a `max-height: clamp(360px, calc(100vh - 400px), 620px)`.

### 3.2 Una sola etiqueta: la del proceso activo

- Se dibuja **solo** la etiqueta del proceso activo, junto a su anclaje:
  - Caja de 108×40, `rx` 6.
  - `x0 = ax > 300 ? ax − 14 − 108 : ax + 14`, es decir, a la izquierda del punto en el oriente del país y a la derecha en el resto.
  - `y0 = clamp(ay − 20, 4, 476)`.
- Contenido:
  - Punto de familia: `r` 3.8, centrado en (x0+9, y0+13). La familia `otros` usa contorno punteado, como hasta ahora.
  - Departamento: 11.5 px / 500, `#c3d3e0`, en (x0+18, y0+16).
  - Valor corto: 13 px / 700, `#fff`, en (x0+18, y0+33).
  - Estilo activo actual: fondo `--aq-card-activa`, trazo `#fff` 1.8.
- Nombres abreviados **solo en la etiqueta**: «Valle del Cauca» → «Valle», «Norte de Santander» → «N. Santander». Mejor en un `departamentoMapa()` junto a `departamentoCorto()`. La ficha conserva el nombre completo.
- La etiqueta sigue siendo un enlace a la ficha del proceso, con el mismo `aria-label` que «Ver ficha» de la tarjeta.
- Hay **cinco enlaces** en el DOM y solo es visible el del proceso activo. Los demás llevan `display: none` (no reciben foco), igual que los grupos ocultos (`.clr-mapa__grupo.is-oculto`). Así no hay que re-renderizar el SVG de servidor: el cliente conmuta una clase.

### 3.3 Anclajes como control

- Los anclajes de los demás procesos del grupo siguen visibles (`r` 4.4) y atenuados a .45. El activo: `r` 5.6, trazo `#fff` 2, relleno de su familia (como `data-activa`).
- Cada anclaje tiene un área de impacto transparente de `r` 12. Al **señalarlo** se activa el primer proceso de ese departamento (`data-procesos`, primer id). `procesoDesdeObjetivo` en `sincronia.js` debe reconocer `[data-ancla]` además de `.clr-mapa__etq`.
- Los anclajes no reciben foco por teclado: por teclado se navega con ←/→ y los puntos, y su contenido está en la ficha.

### 3.4 Leyenda

Sin cambios: debajo del mapa, alineada a la derecha, con «Sin subsistema identificado» solo si el grupo visible tiene alguno.

## 4. Adaptación

- **≥900 px:** las dos columnas descritas arriba.
- **<900 px:** una columna, en este orden: copy (título, lead, buscador, ficha, navegación, pie) y después el mapa. Hay que comprobar que con `height: clamp(…100vh…)` el mapa no deja huecos verticales en tableta. Si los deja, usar `height: auto` en este tramo.
- **<600 px:** la etiqueta flotante puede tapar departamentos vecinos. Se puede conservar (es una sola) o volver a ocultarla y mostrar la línea `.previa` (`departamento · valor · categoría`). **Decisión pendiente del usuario**; por defecto, conservar `.previa` y ocultar la etiqueta, como hoy.
- Se elimina el trato de San Andrés en la columna oeste (`ladoDe` con `"88"`): la etiqueta flotante cae a la derecha del recuadro de las islas.

## 5. Pruebas a actualizar

- **Hero:** se renderiza una sola `Minificha`. ←/→ y los puntos cambian el proceso, con vuelta circular. El activo nunca es `null` con una lista no vacía. «Ver otros» vuelve al primero del grupo nuevo.
- **Mapa en modo selección:** `viewBox` nuevo, sin `.clr-mapa__guia`, una sola etiqueta visible y las demás con `display: none`.
- **Sincronía:** señalar un anclaje activa su proceso, y señalar o enfocar la ficha marca su etiqueta y su anclaje.
- **Contraste oscuro:** ningún color nuevo (los puntos inactivos son decorativos, pero sus botones necesitan foco visible: `outline: 2px solid var(--aq-cyan)`).
- **Chromium** a 1440×900, 1280×800, 1920×1080, 1024×768, 768×1024 y 390×844: sin desbordamiento horizontal, hero centrado sin hueco inferior, etiqueta dentro del lienzo en los 33 departamentos (incluidos La Guajira, Amazonas y San Andrés).
- `npm run presupuesto`: debería bajar algo, porque se va el `IntersectionObserver` de la fila.

## 6. Archivos afectados

- `src/components/landing/hero-territorial/HeroTerritorial.jsx`: composición, activo por defecto, navegación.
- `src/components/landing/hero-territorial/Minifichas.jsx`: una ficha; se quitan `useActivarAlDesplazar` y `onActivar(null)` al salir.
- `src/components/landing/hero-territorial/hero-territorial.module.css`: rejilla, centrado vertical, alto del mapa, etiqueta flotante, navegación, adaptación.
- `src/components/landing/hero-territorial/sincronia.js`: anclaje como objetivo y conmutación de la etiqueta visible.
- `src/components/mapa/ColombiaChoropleth.tsx` (`MapaSeleccion`, `SenalesGrupo`): `viewBox`, etiqueta flotante, sin guías, área de impacto en los anclajes.
- `src/lib/mapa/etiquetas-procesos.ts`: nueva `colocarEtiquetaFlotante(ax, ay)`, pura y con test.
- `src/lib/landing/proceso-portada.ts`: `departamentoMapa()` con las abreviaturas.
- `CLAUDE.md`: entrada «Hero con ficha central (2026-10-06)» que sustituye a «cinco minifichas».

## 7. Cómo quedó (2026-10-06, implementación)

- **Decisiones pendientes, tomadas por defecto:** bajo 600 px la etiqueta
  flotante se oculta y se ve la línea `.previa` (§4, lo que el spec proponía por
  defecto). La navegación manual (←, →, puntos) **sí** se anuncia con el aviso
  `role="status"` que ya usaba «Ver otros» («Proceso n de N: objeto.»); el
  recorrido no se anuncia (§2, pendiente de accesibilidad).
- **Alto del hero y del mapa, corregido contra la barra.** Con `min-height:
  100vh` y `calc(100vh - 110px)` tal cual, a 1440×900 el hero empezaba 72 px más
  abajo (la barra oscura mide `--nav-h` + 16 px) y el sur del mapa salía de la
  pantalla. Se mide desde debajo de la barra: `--aq-pantalla: calc(100vh -
  var(--nav-h) - 16px)`, el hero tiene ese mínimo y el SVG
  `clamp(440px, calc(var(--aq-pantalla) - 110px), 860px)`. Medido en Chromium:
  a 1440×900, 1280×800, 1920×1080 y 1024×768 el hero acaba justo en el borde
  inferior, centrado, sin desbordamiento horizontal.
- **Activo derivado, no sincronizado.** El hero guarda la elección y deriva el
  activo (`elección` si está en el grupo visible; si no, el primero). Así «Ver
  otros» y «Pausar» vuelven al primero sin efectos y la ficha nunca queda vacía.
- **El recorrido sigue desde el proceso a la vista** (`useRecorrido` recibe el
  activo): tras avanzar con →, el siguiente paso automático es el de después.
- **Anclajes:** una zona transparente de `r` 12 (`.clr-mapa__ancla-zona`, con
  `data-ancla` y `data-primero`) debajo de cada anclaje; el anclaje visible no
  recibe el puntero. El SVG de servidor marca `is-activo` en la primera etiqueta
  de cada grupo, para que sin JavaScript se vea una.
- `colocarEtiquetas`, `X_COLUMNA` y `MARGEN_ETIQUETAS` siguen en
  `etiquetas-procesos.ts` con sus pruebas; el hero ya no los usa.
- `npm run presupuesto`: 109,5 kB de JS de primera carga (límite 125 kB).
