# Plan — Ficha Viva con ciclo de vida

Spec: `docs/superpowers/specs/2026-10-05-ficha-viva-ciclo-de-vida.md` (decisiones
cerradas y mediciones de la base viva del 2026-10-05).
Necesita aprobación (`docs/CONDUCTA.md` §4): cambia lo que muestran rutas
públicas y toca más de tres archivos de producción. **Aprobado por el usuario el
2026-10-05** («sí, aplícalo y escribe el plan»), con la consecuencia dicha: la
portada, la vitrina y el mapa pasan de 36.088 «abiertos» a los que tienen fecha
de recepción vigente (128 el día de la medición).

Sin migraciones en ningún PR: todo sale de columnas que ya existen en
`proceso`, `contrato` y `proveedor`.

## Orden

Tres PR, cada uno desplegable sin los siguientes. El PR 1 va primero porque es
la trampa que más usuarios ven (portada y vitrina) y es el más pequeño.

### PR 1 — «Abierto» honesto: recibe ofertas solo con recepción vigente

Regla (spec, M9): un proceso **recibe ofertas** si, además de lo que pedía
`condicionAbierto()` (apertura «Abierto» y estado «Publicado»/«Abierto»), tiene
`fecha_recepcion` **igual o posterior a hoy en Colombia**. La fecha es un día de
calendario y cierra al final de ese día (regla vigente de la ficha).

1. **`src/lib/secop/agregados.ts` — `condicionAbierto()`**: añadir
   `fecha_recepcion >= (now() at time zone 'America/Bogota')::date`. Es la
   definición única: la heredan sin tocarse el mapa y la imagen OG
   (`agregadosPortada`, `detallePorDepartamento`), las facetas, la vitrina
   (pestaña «abiertos»), `/licitaciones/entidades` (`compradores.ts`), los
   destacados del departamento (`resumen-departamento.ts`) y el hero
   (`muestra-portada.ts`). Reescribir su comentario con las cifras medidas.
2. **`src/lib/landing/proceso-portada.ts`** — su espejo de cliente (`abierto`)
   exige también la fecha vigente, con el mismo día en Colombia, para que la
   minificha no diga «abierto» de algo que el servidor ya no cuenta.
3. **`src/lib/secop/vitrina.ts` — `tramoDeRelevancia()`**: el tramo 2
   (recepción vencida) ya no puede darse dentro de los abiertos; se deja el
   `case` (no estorba) y se corrige el comentario.
4. **Pruebas**: los fixtures de las pruebas contra PGlite que dan un proceso por
   abierto sin `fecha_recepcion` reciben una fecha futura
   (`vitrina`, `muestra-portada`, `resumen-departamento`, `compradores`); se
   añade el caso nuevo en cada una de las dos fuentes (sin fecha → no cuenta;
   vencida → no cuenta) y un test puro del espejo de `proceso-portada.ts`.
5. **Fuera del PR 1, a propósito**: `db-search.ts` (`/api/secop`, buscador
   guiado y explorador avanzado) tiene su propia noción de abierto: unificarla
   es PENDIENTES §54 y no se mezcla aquí. La ficha individual sigue mostrando
   «Abierto a ofertas» desde `estado_apertura`: lo corrige el PR 2 con la etapa.
6. **Documentación**: `CLAUDE.md` (bloque del spec y la nota del hero, que hoy
   dice «sobre todos los abiertos») y `PENDIENTES.md`: el mapa puede quedar casi
   vacío y el hero necesita al menos cinco; si un día hay menos de cinco, la
   portada pinta los que haya (comportamiento actual de `muestraPortada`).

Verificación: `npm test`, `npm run lint`, `npx prettier --check`, `npm run build`
y, en el entorno local, que la portada y `/licitaciones` cargan y cuentan solo
procesos con recepción vigente.

### PR 2 — La etapa, en un solo sitio, y «Revisa antes de confiar»

1. **Módulo puro nuevo `src/lib/secop/etapa.ts`**: `etapaDeProceso(señales)` →
   una de `recibe_ofertas | en_evaluacion | adjudicado | contratado |
   en_ejecucion | plazo_cumplido | no_se_llevo_a_cabo | por_verificar`, con la
   regla de precedencia del spec ajustada por las mediciones: estado del
   contrato (Cancelado → no se llevó a cabo; sin firmar → no cuenta como
   contratado) y sus fechas > adjudicación > fecha de recepción vigente >
   estado del proceso. **La fase se ignora** (M2b). «Seleccionado» sin contrato
   → en evaluación. Devuelve además la línea explicativa y las contradicciones
   `C1`–`C7` con su evidencia (C1 con apertura nula incluida; C4 solo por encima
   de 10×). Pruebas puras por cada combinación, incluidos OPA-ST-07-2023 y
   `CO1.REQ.10637968`.
2. **`ProcesoFicha` (`ficha.ts`)** trae `fase` no (se ignora), sí `adjudicado`,
   `adjudicatario`, `fechaAdjudicacion`, `valorAdjudicacion` y la lista de
   contratos del proceso (firma, inicio, fin inicial/actual, valor inicial/actual,
   estado, tipo de documento del contratista). Una consulta más por ficha, por
   `proceso_id`; **contrato no tiene índice por `proceso_id`** (medido el
   2026-10-05): o se añade el índice con una migración aparte (decisión del
   usuario, la Supabase viva está al límite del plan) o la consulta va por
   `portafolio_id`/`secop_contrato_id` si el plan encuentra una vía indexada.
   Se resuelve antes de escribir código.
3. **La ficha** (`app/licitaciones/[slug]/page.tsx`, `CierreFicha`,
   `BloqueDecision`) pinta la etapa en vez de «Abierto/Cerrado a ofertas», y el
   bloque «Revisa antes de confiar» cuando hay contradicciones. «Quiero
   participar» solo invita a ofertar en `recibe_ofertas`. La referencia y el
   objeto se limpian de la fase pegada («(Presentación de oferta)»).
4. La tarjeta de la vitrina y la minificha usan la misma etapa para su pastilla.

### PR 3 — Ficha en ejecución (2026, sin personas naturales)

1. Para procesos publicados desde 2026-01-01 con contrato firmado y contratista
   que **no** es persona natural (`proveedor.tipo_documento` distinto de CC, CE,
   PASAPORTE, «PERMISO POR PROTECCIÓN TEMPORAL» y no nulo): «Quiero participar»
   pasa a **«Cómo se contrató»** (contratista, valor, inicio, fin previsto y
   actual, prórroga y adición como hechos, pagado «según el SECOP» si existe),
   con la línea «Según las fechas del contrato. El SECOP no publica el avance de
   la obra». La etapa final es **«Plazo cumplido»** siempre.
2. Personas naturales: la ficha no nombra al contratista ni amplía el contenido;
   la etapa sí se pinta.
3. **Filtro de etapa** en la vitrina (`filtros-vitrina.ts`), apagado por
   defecto; con él activo la página es `noindex`, como los demás filtros.
4. Varios contratos por proceso (879 procesos) se listan todos.

## Riesgos

- **Portada vacía o casi vacía.** 128 abiertos el día de la medición; si una
  ingesta falla, pueden ser menos de cinco. Se acepta (decisión del usuario):
  mostrar menos es mejor que mostrar oportunidades falsas.
- **El ISR congela «hoy».** La portada se regenera cada 6 h y la ficha cada 12 h:
  un proceso puede seguir contado unas horas después de vencer su recepción.
  Igual que hoy con la cuenta atrás; no se cambia la estrategia de render.
- **PR 2 depende de una consulta por `proceso_id`** sin índice (ver arriba).
