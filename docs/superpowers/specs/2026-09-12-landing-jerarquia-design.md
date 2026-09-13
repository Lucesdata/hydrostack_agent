# SPEC — Rediseño de jerarquía de la landing (AquaLicita)

> Recibida del usuario el 2026-09-12. Se archiva literal; las dos decisiones
> que dejaba abiertas se cerraron antes de planificar y quedan anotadas al
> final, en «Decisiones cerradas».

## Contexto de código

- Repo Next.js 14 (App Router). La landing es `app/page.js` (client component) + los
  componentes de `src/components/landing/`.
- Tokens y clases utilitarias: `app/globals.css` (tema claro "clear", prefijo `clr-*`,
  más `.grid-cards`, `.section-pad`, `.tap-target`, `.center-md`).
- Las rutas y su nivel de acceso viven SOLO en `src/components/landing/seccionesHome.js`
  (`SECCIONES_HOME`, `ETIQUETA_POR_NIVEL`, `ruta(id)`). Dos tests las vigilan:
  `src/__tests__/**/enlaces.test.ts` (cada href existe como página) y
  `acceso.test.ts` (cada etiqueta coincide con `NIVEL_MINIMO` en `politica.ts`).
  **Nunca escribas un href ni una etiqueta de acceso a mano: pásalos por `ruta(id)`.**
- `MOTIVOS` en `S5Descartes.jsx` está comparado literal contra `EXPLICA` de
  `app/auditoria/explica.ts` por `explica.test.ts`. Si mueves esa lista, el test se
  mueve con ella o se borra junto con el export (ver T-04).
- Las cifras vienen de un único fetch a `/api/landing-stats` y del ticker
  `/api/procesos/recientes`. Degradan a `—` cuando fallan. **No hardcodees cifras.**

## Objetivo

La acción única de la landing es **explorar procesos** (`ruta("explorar")` →
`/licitaciones`). Hoy la página empuja el diagnóstico tres veces y deja explorar como
CTA secundario. Reordenar el scroll, unificar el CTA y explicar el modelo de acceso.

Público: contratistas pequeños que ya licitan, empresas de ingeniería medianas e
inversionistas/socios.

## Restricciones (no negociables)

1. `PlantaHero.jsx` y `ProcesosTicker.jsx` **no se tocan** salvo lo indicado en T-08.
2. No se introducen colores, fuentes ni radios nuevos: solo tokens de `globals.css`.
3. Sin librerías nuevas. Sin cambios de esquema de base de datos ni de API.
4. Ninguna cifra ni dato de proceso escrito a mano en el JSX.
5. `npm run test` y `npm run build` en verde al final de cada tarea.
6. Accesibilidad: objetivos táctiles ≥ 44px (`.tap-target`), contraste de texto ≥ 4.5:1,
   `prefers-reduced-motion` respetado como ya lo hace el código.

---

## T-01 — Un solo CTA en el hero

**Archivo:** `app/page.js` (bloque de CTAs del hero).

- El botón sólido (`.bp-cta.bp-cta-dark`) pasa a `ruta("explorar")` con la etiqueta
  `Explorar procesos →`.
- El botón en contorno desaparece como botón: se convierte en enlace de texto
  subrayado a `ruta("diagnostico")` con la etiqueta `o mira antes si estás listo · 3 min`.
  Mantiene `.tap-target` y su `hero-fade-up`.
- La línea auxiliar bajo el CTA deja de decir "sin cuenta · 3 minutos" (eso ahora lo
  dice el enlace del diagnóstico) y pasa a `sin cuenta · {procesosVigilados} procesos del
  sector`, leyendo el valor del estado `sector` ya existente (con `formatConteo`).
  Si es `null`, la línea se renderiza sin la cifra — no con `—` pegado a la palabra.

**Criterio de aceptación:** en el hero hay exactamente un elemento con fondo de acento y
apunta a `/licitaciones`.

## T-02 — Subir las rutas de intención

**Archivo:** `app/page.js`.

Mover el bloque `#asistentes-proyecto` (`INTENT_ROUTES`, "¿En qué momento estás?") para
que quede inmediatamente después del hero y antes de `<S3Motor />`. No cambia su markup.

Añadir a cada tarjeta, junto a la etiqueta de acceso que ya trae (`c.etiqueta`), un
tratamiento visual distinto según nivel: `sin cuenta` en acento (`--accent` sobre
`--accent-faint`), `cuenta gratuita` y `plan pro` en el badge gris actual. El nivel se
deriva de `c.etiqueta` comparándola con `ETIQUETA_POR_NIVEL`, no con strings sueltos.

## T-03 — `S2Diagnostico` se comprime y baja

**Archivos:** `app/page.js`, `src/components/landing/S2Diagnostico.jsx`.

- Se renderiza después de `<S4Competidores />`.
- Eyebrow: `Paso previo · opcional · ${RUTA.etiqueta}`.
- Párrafo introductorio a una sola frase: "Diez preguntas, sin cuenta y sin IA: reglas
  fijas, así que las mismas respuestas dan siempre el mismo veredicto."
- Las tres tarjetas de `DEVUELVE` se mantienen.

## T-04 — `S5Descartes` se absorbe en `S3Motor` como paso 04

**Archivos:** `src/components/landing/S3Motor.jsx`, `S5Descartes.jsx`, `app/page.js`,
`src/__tests__/landing/explica.test.ts`.

- Nuevo paso `04` en el array `PASOS` de `S3Motor`, con la misma estructura que los otros
  tres: título "Un filtro demasiado estrecho no da errores. Da silencio", cuerpo de dos
  frases (guardamos cada descarte con su motivo; si aparece algo que sí te interesaba, el
  filtro está mal), `...ruta("auditoria")` y cta `VER QUÉ SE DESCARTA`.
- `<S5Descartes />` sale de `app/page.js`. Decide una de las dos y déjalo explícito en el
  commit:
  a) borrar `S5Descartes.jsx` y su test `explica.test.ts` — entonces la lista `MOTIVOS`
     queda solo en `app/auditoria/explica.ts`, que es su dueño natural; o
  b) conservar el componente sin montarlo (no recomendado: código muerto).
  Si eliges (a), verifica antes que `explica.ts` sigue siendo la fuente única y que
  ningún otro import usa `MOTIVOS`.

## T-05 — Fuera la nota de deuda técnica del correo

**Archivos:** `src/components/landing/S3Motor.jsx`, `src/components/landing/S6Footer.jsx`,
`app/cuenta/*`.

- Borrar de `S3Motor` el párrafo final sobre el aviso por correo (y su comentario).
- Mover ese aviso a la página de preferencias de alerta (`app/cuenta`), junto al control
  que lo activa, con el mismo texto honesto.
- Quitar `alertas` de la columna "Tu cuenta" en `COLUMNAS` de `S6Footer.jsx` mientras el
  envío no esté configurado. Deja un comentario con la condición de vuelta
  (`AUTH_RESEND_KEY` en Vercel, ver PENDIENTES §0 y §21).

## T-06 — Bloque nuevo: "Qué te llevas sin pagar"

**Archivo nuevo:** `src/components/landing/S7Acceso.jsx`. Montado en `app/page.js` entre
`<S2Diagnostico />` y `<S5DarkClosing />`.

- Tres columnas (`.grid-cards`), una por nivel, **generadas recorriendo
  `SECCIONES_HOME` y agrupando por `etiqueta`** — no listas escritas a mano. El orden de
  los niveles sale de `ETIQUETA_POR_NIVEL` (anónimo → gratis → pro).
- Cada ítem necesita un nombre legible. Reutiliza el mapa `ETIQUETAS` que ya existe en
  `S6Footer.jsx`: extráelo a `seccionesHome.js` como `NOMBRE_POR_ID` y consúmelo desde
  los dos componentes (una sola fuente, sin duplicar strings).
- Las secciones sin nombre en ese mapa no se renderizan (no inventes etiquetas).
- La columna "sin cuenta" lleva borde de acento y las esquinas de plano (mismo recurso
  visual que `.bp-card`), y cierra con un enlace `[ EXPLORAR PROCESOS ]` a
  `ruta("explorar")`. Las otras dos, borde `--line`.
- Titular: "Todo lo que decide si te presentas se ve sin cuenta".

**Criterio de aceptación:** añadir una sección a `SECCIONES_HOME` con nombre en
`NOMBRE_POR_ID` la hace aparecer en la columna correcta sin tocar `S7Acceso.jsx`.

## T-07 — Cierre con el CTA principal y una salida a Nosotros

**Archivo:** `src/components/landing/S5DarkClosing.jsx`.

- El botón blanco pasa a `ruta("explorar")` con "Explorar procesos →".
- Junto a él, enlace secundario a `ruta("nosotros")` con el texto "Quién está detrás",
  en `--accent-river` sobre el fondo `#0A1F1C` y subrayado (es el único camino al equipo
  para quien llegó hasta abajo, y el navbar lo esconde en la hamburguesa en móvil).

## T-08 — Móvil

**Archivos:** `app/globals.css`, `src/components/landing/ProcesosTicker.jsx`, `app/page.js`,
`src/components/Navbar.js`.

1. **Ticker:** bajo `640px`, ocultar el rótulo `.ptr-cap` (queda el diamante de estado) y
   soltar el `max-width` de `.ptr-entidad` para que la entidad use el ancho disponible.
   Es la única prueba de vida del producto y hoy cabe un ítem y medio.
2. **Cifras del hero:** bajo `640px` mostrar solo dos de las cifras vivas
   (`nuevos7d`, `enJuegoTotalCop`) y la línea de credencial; las tres del sector pasan a
   la sección que las usa. Hazlo con una media query en la hoja, sin duplicar markup.
3. **CTA:** bajo `640px`, el botón del hero a ancho completo (`width:100%`, texto
   centrado); el enlace del diagnóstico debajo, centrado.
4. **Párrafos largos:** ningún párrafo de la portada pasa de ~45 palabras en móvil. El de
   `S5Descartes` ya queda resuelto por T-04; revisa el de `S4Competidores`.
5. **Navbar:** bajo `1024px`, dejar visible en la barra un enlace directo a
   `ruta("explorar")` además de la hamburguesa (el destino que la página persigue no
   puede estar solo dentro del menú).

## T-09 — Verificación

- `npm run test` y `npm run build` en verde.
- Repasar a 360px, 768px, 1024px, 1199px y 1440px. La banda 1024–1199px del navbar ya
  tiene reglas propias en `globals.css` y en `AUTH_CSS` (Navbar.js): no la rompas.
- Con `/api/landing-stats` caído (fuerza un 500 en local), la portada sigue teniendo
  sentido: `—` en las cifras y ninguna frase que quede falsa sin ellas.
- Con `prefers-reduced-motion: reduce`, ninguna animación de entrada deja contenido
  invisible.

---

## Fuera de alcance

- Rediseño visual: no se cambian paleta, tipografías ni la estética blueprint.
- `PlantaHero` y sus rutas generadas (`plantaPaths.js`).
- Copy nuevo más allá del H1, el CTA y los recortes indicados.
- Precios o contenido comercial del plan pro.

## Nota sobre el H1 (decisión pendiente de producto)

La recomendación es que el titular nombre la categoría, porque "Todo tu trabajo de agua,
en un solo lugar" sirve igual para un ERP. Propuesta implementada en el prototipo:

> Los procesos de **agua** del SECOP II, filtrados por tus reglas.

Mantiene el mask-reveal por línea y el subrayado trazado en "agua" (dos líneas, la
palabra clave en la primera). Si producto prefiere conservar el titular actual, T-01
sigue siendo válido por separado.

---

## Decisiones cerradas antes de planificar (2026-09-12)

1. **H1 (la «decisión pendiente de producto» de arriba):** se implementa la propuesta.
   El titular pasa a «Los procesos de **agua** del SECOP II, filtrados por tus reglas.»,
   en dos líneas con el mask-reveal intacto y `hero-draw` sobre «agua», que queda en la
   primera línea.

2. **T-04:** se elige la opción **(a)** — se borra `S5Descartes.jsx` y su test
   `explica.test.ts`. Verificado antes de planificar: los únicos consumidores de
   `MOTIVOS` (el export de S5Descartes) son el propio componente y ese test;
   `app/auditoria/explica.ts` queda como dueño único, consumido por
   `app/auditoria/page.tsx`. La `MOTIVOS` de `src/lib/al/matching/tipos.ts` es otra
   cosa (códigos de descarte, no redacción) y no se toca.

3. **T-06, hueco no previsto por la spec:** el mapa `ETIQUETAS` de `S6Footer.jsx` no
   tiene nombre para `pliego`, `asistente-ejecucion` ni `asistente-operacion`, que son
   las tres únicas secciones `plan pro`. Aplicada la regla «las secciones sin nombre no
   se renderizan» al pie de la letra, la tercera columna saldría vacía justo donde debe
   explicar qué cuesta dinero. Se resuelve **añadiendo a `NOMBRE_POR_ID` los nombres que
   ya usa la navegación** (`Navbar.js`): «Pliegos» (de `NAV_ITEMS`), «Asistente:
   ejecución» y «Asistente: operación» (de `ACCOUNT_ITEMS`). No son etiquetas
   inventadas: son los nombres oficiales de esas rutas en el producto.
