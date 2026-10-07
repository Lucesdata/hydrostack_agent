# Hero con tres destacados y mapa por familia (2026-10-07)

Sustituye al hero con ficha central del 2026-10-06
(`2026-10-06-hero-ficha-central.md`), que mostraba 30 procesos al azar de cinco
en cinco.

## Problema

El hero dice «Explora el mapa» y el mapa no deja explorar nada: marca cinco
procesos sorteados al azar. El usuario no sabe por qué ve esos y no otros, y el
mapa no responde ninguna pregunta.

## Propuesta del usuario y decisiones (cerradas el 2026-10-07)

1. **De entrada**, el proceso más relevante de **agua potable**, el de **agua
   residual** y el de **redes**, cada uno con su ficha, uno a la vez.
2. **Si el usuario explora el mapa**, el número de procesos de cada familia por
   departamento: tres mapas, o tres colores del mismo mapa.
3. **Al pulsar el número de un departamento**, sus fichas de mayor a menor
   presupuesto.

Mejoras propuestas por Claude y aceptadas («ok go»):

- **D1. Familias.** Las de `tipo-color.ts` en todas partes: potable = acueducto
  + PTAP, residual = PTAR, redes = alcantarillado. Las redes de acueducto siguen
  en potable. Hoy la vitrina y el buscador guiado agrupan distinto (su
  `residual` incluye alcantarillado): se alinea en el PR 3.
- **D2. «Más relevante»** es una regla escrita en la ficha, no un juicio: el de
  **mayor presupuesto** entre los que reciben ofertas y les quedan **al menos 5
  días** (`DIAS_MINIMOS_DESTACADO`). Si ninguno de la familia tiene ese margen,
  el de mayor presupuesto igualmente, con «Cierra pronto». Sin presupuesto
  publicado (nulo o el 0 del SECOP) no compite. Si la familia no tiene ninguno,
  la pestaña lo dice; no se rellena con otro.
- **D3. Pestañas que mueven también el mapa.** Agua potable · Agua residual ·
  Redes. Elegir una cambia la ficha y (desde el PR 2) el color del mapa. Avanza
  sola cada **7 s** (eran 5 s para resaltar una etiqueta; ahora cambia la ficha
  entera), con las pausas de siempre: puntero o foco encima, «Pausar
  recorrido», pestaña oculta y reducir movimiento (WCAG 2.2.2).
- **D4. Qué cuenta el número del mapa.** Con recepción vigente solo hay ≈128
  procesos en toda la base (medido el 2026-10-05): repartidos en 3 familias y 33
  departamentos, el mapa quedaría casi todo en 0. El número cuenta los
  **publicados en 2026 en cualquier etapa** de esa familia, y al lado los que
  **reciben ofertas** («Antioquia: 42 en 2026 · 3 reciben ofertas»). La lista
  de la región separa las dos cosas con la etapa (`etapaDeProceso()`).
- **D5. Clic en una región: la lista en el mismo hero.** Un panel con las 3–5
  fichas de mayor presupuesto de ese departamento y esa familia, y «Ver las N →»
  a `/licitaciones?departamento=X&tipo=…&orden=valor` (ya existe).
- **D6. El número dentro del mapa**, rayado si es cero (ya existe el patrón). En
  móvil, debajo del mapa, la lista de departamentos por cifra, que se toca mejor
  que un polígono.

## Entregas

### PR 1 — Tres pestañas con su destacado (hecho, 2026-10-07)

- `destacadosPortada()` (`src/lib/secop/destacados-portada.ts`) sustituye a
  `muestraPortada()`: **una** consulta, `DISTINCT ON (familia)` ordenada por
  margen de 5 días, presupuesto y id (estable). Mismas condiciones de elegible
  que antes (`condicionAbierto()`, número y objeto publicados, id `CO1.<X>.<n>`,
  departamento anclable). La familia se calcula con los tipos de `COLOR_TIPO`;
  el `CASE` va con literales porque `DISTINCT ON` exige la misma expresión que
  el `ORDER BY` y los parámetros la numeran distinto.
- `src/lib/landing/destacados-portada.ts` (puro): familias, texto de la pestaña,
  la regla escrita (`criterioDe`), la fecha de cierre y `hrefDeFamilia`, que
  lleva a la vitrina con **exactamente** los tipos de la pestaña (potable →
  `tipo=potable`, residual → `tipo=ptar`, redes → `tipo=alcantarillado`; un
  test lo compara con `tiposDeSistema`).
- El hero: pestañas con el patrón ARIA (activación automática, ← → Inicio Fin),
  la regla sobre la ficha, «Ver más de X, de mayor a menor presupuesto →». Salen
  las flechas, los puntos, «n de N» y «Ver otros 5 procesos». El mapa marca los
  tres destacados con el mecanismo de siempre (anclaje + etiqueta flotante del
  activo); señalar un anclaje elige su pestaña.
- La ficha reserva el alto de la más alta (244 px): sin eso el hero, centrado,
  saltaba unos píxeles en cada paso del recorrido.
- Verificado en el entorno local (Chromium): 1440×900, 390 y 360 px sin scroll
  horizontal y las tres pestañas en una fila; el teclado mueve pestaña y foco.

### PR 2 — El mapa por familia (hecho, 2026-10-07, rama `claude/hero-mapa-familia`)

- `conteosPorFamilia()` (`src/lib/secop/conteos-familia.ts`): **una** consulta
  agrupada por departamento con `count(*) FILTER` por familia, publicados desde
  el 2026-01-01 (cualquier etapa) y, de ellos, los que reciben ofertas
  (`condicionAbierto()`). Solo departamentos que el mapa dibuja. Contra PGlite.
  Va en paralelo con `destacadosPortada()` y falla por separado: sin conteos el
  mapa sale como en el PR 1.
- Lo puro en `src/lib/landing/conteos-familia.ts`: escalones fijos por familia
  (0, 1–9, 10–49, 50–199, 200–499, 500+; más bajos que los del mapa de abiertos
  porque cuentan una sola familia), el texto «42 en 2026 · 3 reciben ofertas» y
  el orden de la lista.
- El mapa de selección, con `conteos`, lleva en cada departamento su escalón en
  las tres familias (`data-e-potable`…) y un grupo de cifras por familia bajo
  cada anclaje (sin ceros, `aria-hidden`). El hero pone `data-capa` en la raíz
  del mapa y el CSS hace el resto: cambiar de pestaña no toca ningún camino.
  Rampa de un solo tono **en el color de la familia** (`color-mix` de `--fam`
  sobre `--aq-base`, 28–92 %): el color sigue diciendo el tipo de obra y la
  intensidad, cuántos. «Ninguno» va rayado (patrón propio,
  `#clr-mapa-sin-sel`). Sin tinte de selección de los destacados: su anclaje
  sigue marcándolos.
- Bajo el mapa, la escala de la capa elegida («Procesos de agua potable
  publicados en 2026, por sede de la entidad») y «Ver por departamento (N)», un
  `<details>` con la lista de más a menos, que es la alternativa textual del
  mapa y la forma cómoda de leerlo en el celular. El mapa cede 50 px de alto
  para que todo quepa en el primer pantallazo (medido a 1440×900, 1280×800 y
  1920×1080); 390 px sin scroll horizontal.
- Aún sin clic en la región (PR 3): el número de «en 2026» no puede enlazar a
  la vitrina, que solo enseña abiertos, sin contradecirse.

### PR 3 — La región y la alineación de familias (hecho, 2026-10-07, rama `claude/hero-region`)

- **Pulsar un departamento** con procesos en la capa elegida (en el mapa o en
  «Ver por departamento») abre su panel en el sitio de la ficha destacada:
  «Antioquia · Agua potable», el mismo conteo del mapa, «Ver los 16 que reciben
  ofertas en Antioquia →» (solo si hay alguno: la vitrina enseña esos) y los 5
  de mayor presupuesto, cada uno con «Recibe ofertas hasta el…» o «No recibe
  ofertas»: un contrato en ejecución no se presenta como oportunidad. «← Volver
  al destacado» lo cierra y devuelve el foco a la pestaña.
- Cambiar de pestaña con una región abierta cambia la familia del panel. El
  recorrido se detiene mientras haya una región abierta. Al abrir, el foco va al
  título del panel (en el celular, así entra en vista). El departamento abierto
  se marca en el mapa (`is-region`).
- `regionFamilia()` (`src/lib/secop/region-familia.ts`): dos consultas en
  paralelo, el conteo con las condiciones de `conteosPorFamilia()` y los
  primeros 5 con ficha enlazable, sin presupuesto al final. Se pide al pulsar,
  por `GET /api/portada/region/[dpto]/[familia]` (400 si la región o la familia
  no valen, 503 sin caché si falla la base, `s-maxage` de 6 h). Es la única
  petición del hero y vive fuera del componente (`region.js`, con
  `AbortController` y una respuesta de otra región se descarta).
- Sin JavaScript, cada departamento de la lista es un enlace a la vitrina de esa
  región y familia.
- **Familias alineadas (D1):** los sistemas de la vitrina y del buscador guiado
  son ya las familias de `tipo-color.ts` (`SISTEMAS_AGRUPADOS` = potable,
  residual, redes, derivados de `COLOR_TIPO`). **`?tipo=residual` pasa a ser
  solo PTAR** (antes alcantarillado + PTAR) y `?tipo=redes` es alcantarillado.
  Las URL viejas siguen valiendo; devuelven menos resultados en residual. La
  categoría «Redes y alcantarillado» del buscador envía `redes`.
- Medido en Chromium: con el panel abierto, a 1440×900 la quinta fila queda
  14 px bajo el primer pantallazo y a 1280×800 unos 120 px; la cabecera, el
  enlace y las primeras filas se ven de entrada.

## Lo que no cambia

El contrato `ProcesoPortada`, la minificha, el buscador, los colores de familia,
la franja de la Ficha Viva (enlaza el primer destacado) y el ISR de 6 h.
