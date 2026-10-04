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

Cierre en días en grande, «Nuevo», encaje con el perfil («Cumples 4 de 5»),
Guardar. Buscador y filtros (tipo, departamento, presupuesto, cierre, modalidad)
con estado en la URL —la ruta ya es `force-dynamic`, leer la URL no cambia el
coste— y tres órdenes. Fundir «Explorar» y «Descubrir» queda **pendiente de
decisión del usuario**.

## Fase 2 — Radar

Lista densa con panel de detalle en escritorio; en móvil, dos pantallas.
Teclado ↑/↓ y Enter. El detalle reutiliza el semáforo con perfil y el
«siguiente paso» de `BloqueDecision`.

## Fase 3 — ganchos de vuelta

«Guardar como alerta» desde los filtros (`src/lib/alertas/`), guardar proceso
(tabla nueva con `.enableRLS()`: plan aparte por tocar el esquema) y estante
«Para ti» con `getMatchesForPerfil`, plegable y solo con sesión.
