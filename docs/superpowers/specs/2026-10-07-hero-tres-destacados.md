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

### PR 2 — El mapa por familia (pendiente)

- `conteosPorFamilia()`: una consulta con `count(*) FILTER` por familia y
  departamento, publicados desde 2026 y, aparte, los que reciben ofertas (D4).
  Contra PGlite.
- El mapa del servidor lleva los tres juegos de escalones en atributos
  (`data-n-potable`…); el cliente cambia la clase de escalón según la pestaña,
  como hacía `usePinturaEnMapa`. Sin color en línea; rampa de un solo tono por
  familia, medida en `contraste-oscuro.test.ts`.
- El número de cada departamento en el SVG (D6) y la lista por cifra en móvil.
- El anclaje del destacado se conserva encima de la coropleta.

### PR 3 — La región y la alineación de familias (pendiente)

- Clic en un departamento: panel en el hero con las 3–5 de mayor presupuesto
  de esa familia (consulta pequeña por departamento, cacheada como
  `/api/departamento/[dpto]/resumen`) y «Ver las N →» (D5). Sin JavaScript, el
  departamento es un enlace a esa misma búsqueda de la vitrina.
- `tipo=redes` en la vitrina y `residual` = solo PTAR en vitrina y buscador
  guiado (D1). Cambia lo que devuelve `?tipo=residual`: hay que decirlo en el
  PR; no hace falta redirigir, la URL sigue valiendo.

## Lo que no cambia

El contrato `ProcesoPortada`, la minificha, el buscador, los colores de familia,
la franja de la Ficha Viva (enlaza el primer destacado) y el ISR de 6 h.
