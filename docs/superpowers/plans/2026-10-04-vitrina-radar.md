# Vitrina «Radar» — plan por fases (2026-10-04)

Decisión del usuario del 2026-10-04: **opción A (Radar: lista y detalle, con
buscador y filtros fijos) más un estante «Para ti» de la opción C** cuando hay
sesión. El mapa (opción B) se queda en la portada. El documento completo, con
diagnóstico, maquetas y referentes, se publicó como página aparte para decidir.

## Diagnóstico (capturas de producción del 2026-10-04)

1. La tarjeta se contradecía: `CO1.REQ.11144872` decía ABIERTO encima de
   «Recepción cerrada el 03 oct 2026» (pastilla de `estado_actual`, línea de
   `fecha_recepcion`).
2. La primera pantalla no era de agua: GPS para una empresa de energía, tramos
   de espacio público de EPM (tipo `otros`), un objeto «2026000088». Orden solo
   por `fecha_publicacion`.
3. Las cinco compuertas absolutas salían con el mismo punto azul y
   «Habilitación SIN DATOS» en todas.
4. Sin buscador ni filtros en la vitrina; tres niveles de pestañas.

## Fase 0 — que la vitrina diga la verdad (hecha)

- `ficha-card.ts`: la etapa ABIERTO pasa a **CERRADO A OFERTAS** si la recepción
  ya venció (o, sin fecha, si `estado_apertura` es «Cerrado»). Misma regla que
  la línea del plazo. El «hoy» se cuenta en Colombia, no en UTC.
- `objetoLegible()`: quita los paréntesis de trámite, pasa las MAYÚSCULAS a
  minúscula de oración (respeta siglas y el municipio/departamento del proceso)
  y un objeto sin texto dice «Objeto sin descripción publicada». Solo en la
  tarjeta; el `title` lleva el original y la ficha conserva el texto oficial.
- `FichaCard` variante `vitrina`: sin semáforo. Presupuesto en grande, tipo de
  obra con su color de familia y su nombre, y ubicación.
- `vitrina.ts`: los abiertos se ordenan por `tramoDeRelevancia()` — 0 los cuatro
  tipos de agua que reciben ofertas, 1 `otros` o sin tipo, 2 recepción vencida —
  y después por fecha. Ordena, no filtra: el total no cambia.
- Rejilla con `minmax(0, 1fr)`: una entidad larga ensanchaba su columna.

## Fase 1 — tarjeta nueva y control

### 1a. Buscador en la vitrina y fusión de Explorar y Descubrir (hecha)

Decisión del usuario del 2026-10-04: fundirlas. Reconocimiento: «Explorar» ya
era una lista con panel de detalle (`SecopExplorer`) sobre `/api/secop`, con otra
definición de «abierto» (solo `estado_apertura` más un filtro de palabras clave)
y una lista fija de 11 departamentos; «Descubrir» eran tres colecciones (Abiertos,
Alto valor ≥ $500 M y «Listos para extraer», que mandaba a `/pliego`, ya
retirado) más un parser de palabras clave.

- Filtros en la query de `/licitaciones` (`src/lib/secop/filtros-vitrina.ts`):
  `q` (objeto, entidad o municipio), `tipo`, `departamento` (slug, como las
  facetas), `presupuesto` (pisos de 100, 500 y 1.000 millones) y `orden`
  (relevancia, recientes, presupuesto). Se aplican en el servidor sobre la
  misma consulta de la vitrina: `condicionAbierto()` y `tramoDeRelevancia()`.
- `FiltrosVitrina.tsx`: `<form method="get">` sin JavaScript, chips para quitar
  cada filtro y atajos (los cuatro tipos de agua y «Alto valor»).
- Sin filtros, la paginación sigue en el camino (rutas ISR); con filtros va en
  `?pagina=`. Una búsqueda filtrada lleva `noindex` y canónica a `/licitaciones`.
- `/licitaciones/explorar` y `/licitaciones/descubrir` redirigen con 308 (la
  query pasa, así que `?q=` sigue buscando). Salieron `SecopExplorer`,
  `ProcessList`, `ProcessDetail`, `RupWizard`, `discovery/*` y
  `src/lib/secop/discovery.ts`. El perfil RUP con experiencia se edita en
  `/perfil` (`PerfilForm`); los enlaces que mandaban a Explorar para eso ahora
  van ahí.

Lo que no se trajo, a propósito: el estado concreto y «incluir cerrados» (la
vitrina es de abiertos; los adjudicados tienen su pestaña), el valor mínimo
libre (sustituido por pisos), «Listos para extraer» (apuntaba a una ruta
retirada) y el panel de detalle con sondeo de documentos (vuelve en la fase 2).

### 1b. Tarjeta nueva (hecha, salvo Guardar)

- Dos columnas en grande: **Presupuesto** y **Cierre de ofertas** («En 5 días»,
  «Hoy», «Mañana»; ámbar a 3 días o menos). Sin fecha publicada, o ya cerrada, va
  pequeño y en gris: nunca se inventa urgencia. La línea del plazo solo queda
  para la adjudicación.
- «Nuevo» junto al id si se publicó hoy o ayer (día en Colombia).
- **Encaje con el perfil**: «Cumples 4 de 5 · revisa el resto», con cinco
  barras. Isla de cliente (`EncajeVitrina.tsx`): un proveedor pide de una vez el
  encaje de las tarjetas en pantalla a `POST /api/vitrina/encaje`
  (`src/lib/secop/encaje-vitrina.ts`), que lee los procesos por id desde la base
  y corre el mismo `buildVerdict` que la ficha, con los requisitos cacheados del
  pliego. Solo devuelve conteos y el agregado, nunca los `reason`. Sin perfil,
  encima de la rejilla se ofrece definirlo ahí mismo con `OferenteWizard`, sin
  cuenta.
- `searchProcesosDb` trae ahora `fecha_recepcion` (y acepta `ids`). Antes la
  compuerta de plazo del matching salía siempre sin datos; ahora un proceso con
  la recepción vencida falla el plazo también en `/mis-coincidencias` y en las
  alertas, como ya pasaba en la ficha.
- **Guardar** se mueve a la fase 3: necesita una tabla nueva (con
  `.enableRLS()` y migración), y eso pide plan propio según `docs/CONDUCTA.md`.

## Fase 2 — Radar

Lista densa con panel de detalle en escritorio; en móvil, dos pantallas.
Teclado ↑/↓ y Enter. El detalle reutiliza el semáforo con perfil y el
«siguiente paso» de `BloqueDecision`.

## Fase 3 — ganchos de vuelta

«Guardar como alerta» desde los filtros (`src/lib/alertas/`), guardar proceso
(tabla nueva con `.enableRLS()`: plan aparte por tocar el esquema) y estante
«Para ti» con `getMatchesForPerfil`, plegable y solo con sesión.
