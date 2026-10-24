# Destino recomendado de los PR abiertos

**Fecha:** 2026-10-24 · Solo recomendaciones: no se cierra, fusiona ni rebasa nada.
Datos de `gh pr view` ese día contra `origin/main` (`1f17f57`).

| PR | Propósito vigente | Tamaño | Estado | Dependencia / riesgo | Recomendación |
|---|---|---|---|---|---|
| #39 | Trigger que borra el espejo `usuario` al borrar una cuenta en Auth | 9 arch., +4218 | Conflicto | Migración `0025_trigger_borrado_auth_users`; choca con `syncUsuario` (CLAUDE.md §4) | Decidir si el trigger sigue haciendo falta; si sí, rehacer sobre main con su migración reconciliada |
| #97 | Limpiar rutas retiradas y preparar retirada de `lista_espera_mercado` | 18 arch., +3946 | Borrador, conflicto | Migración `0025_fine_emma_frost`; no borrar la tabla sin revisar filas (PENDIENTES §49) | Extraer la parte documental; la migración, decisión aparte |
| #110 | Documentar la prueba pendiente de Guardados | 2 arch., +28 | Borrador, conflicto | Ninguna | Absorber en `2026-10-24-validacion-lanzamiento.md` y cerrar |
| #112 | Vitrina fase 3: guardar, tipo en filtros, alerta desde la vitrina, «Para ti» | 28 arch., +5105 | Borrador, conflicto | Migración `0025_tipos_proyecto_en_filtros`; la alerta contradice «en validación» | Reanudar solo tras reconciliar migraciones; sin CTA de alerta |
| #143 | Precios: cabecera de marca y tarjetas por nivel | 1 arch. | Mergeable | Ninguna técnica | Revisión visual y merge por el dueño |
| #144 | Registro: mapa territorial y fichas reales, oscuro | 11 arch., +1070 | Borrador, conflicto | Auth/registro; probar con cuenta real | Rebasar y probar los tres caminos de auth antes de decidir |
| #149 | Checklist de lanzamiento (2026-10-19) | 1 arch. | Mergeable | Solo documentación | Merge; el estado por punto está en `2026-10-24-validacion-lanzamiento.md` |
| #152 | Navbar fijo (`body min-height`) y pie con colores de portada | 4 arch. | Mergeable | Verificado sin datos vivos (el PR lo dice) | Mergear tal cual; **no duplicado en este PR**. Comprobar con datos vivos tras el merge |

## Migraciones `0025`

Hay cuatro con ese número: `0025_indices_proceso_id_ficha` (ya en main, #136) y las de
#39, #97 y #112, cada una con su `meta/0025_snapshot.json` y su entrada en
`_journal.json`. Renombrar el SQL no basta: hay que (1) confirmar en la base viva qué
migraciones constan aplicadas, (2) renumerar con `drizzle-kit` regenerando snapshot y
journal sobre el estado real, y (3) aplicar de una en una con su plan. Nada de esto se
hizo aquí.
