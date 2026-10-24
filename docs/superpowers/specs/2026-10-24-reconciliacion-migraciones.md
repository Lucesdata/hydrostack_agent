# Reconciliación de las migraciones `0025`

**Fecha:** 2026-10-24 · **Estado:** diagnóstico y plan. **No se renombró, regeneró ni aplicó
ninguna migración, y no se tocó ningún PR.** Verificado en solo lectura contra la base viva
(`hydrostacks`) y contra `origin/main` (`1f17f57`).

## Qué hay

Cuatro migraciones numeradas `0025`:

| Origen | Archivo | Qué hace | ¿En la base viva? |
|---|---|---|---|
| **main** (#136) | `0025_indices_proceso_id_ficha.sql` | Tres `CREATE INDEX IF NOT EXISTS` (`contrato_proceso_idx`, `proceso_geografia_tipo_idx`, `al_hist_proceso_idx`) | **Los índices existen; la migración no consta** en `drizzle.__drizzle_migrations` |
| #39 | `0025_trigger_borrado_auth_users.sql` | Función `SECURITY DEFINER` + trigger en `auth.users` que borra el espejo en `usuario` | **No**: ni la función `borrar_espejo_usuario` ni triggers de espejo |
| #97 | `0025_fine_emma_frost.sql` | `LOCK` + comprobación + `DROP TABLE lista_espera_mercado RESTRICT` | **No**: la tabla existe, con **0 filas** (la guarda de la migración pasaría) |
| #112 | `0025_tipos_proyecto_en_filtros.sql` | `ALTER TABLE al_filtros_usuario ADD COLUMN tipos_proyecto text[]` | **No**: la columna no existe (la tabla tiene 16 columnas) |

## Estado del registro de Drizzle

- `drizzle.__drizzle_migrations`: **25 filas**; la última es la `0024` (2026-09-15).
- `drizzle/meta/_journal.json` de main: **26 entradas**, con la `0025_indices` (`when`
  = 1791663572057).
- **Efecto práctico:** el migrador de Drizzle aplica las entradas del journal cuyo `when`
  es mayor que el de la última fila del registro. Un `db:migrate` hoy aplicaría
  `0025_indices` (inocua, es idempotente) y nada más. Los índices se crearon a mano antes,
  por eso la base funciona aunque el registro no lo sepa.
- **El conflicto no es de ejecución sino de repositorio:** cada PR trae su propio
  `0025_*.sql`, su `meta/0025_snapshot.json` y una entrada `idx: 25` en el journal. Dos de
  ellas no pueden convivir en el mismo árbol, y renombrar el SQL no arregla el snapshot
  ni el journal.

## Plan de reconciliación (propuesto, por orden de menor a mayor riesgo)

Cada paso es un PR propio, aprobado por el propietario antes de empezar
(`docs/CONDUCTA.md` §4: toca el esquema y la auth).

1. **Cerrar el registro de `0025_indices`.** No hay que volver a ejecutarla (los índices
   ya están): hay que insertar su fila en `drizzle.__drizzle_migrations` con el hash y el
   `created_at` que calcula Drizzle, o aplicarla una vez (es `IF NOT EXISTS`, no hace
   nada y deja la fila). Es la única operación sobre la base viva de todo el plan; se
   hace en una sesión con el propietario y se verifica leyendo el registro después.
2. **#112 (`tipos_proyecto`)** → regenerar como `0026` con `drizzle-kit generate` sobre
   el esquema de main: lo hace Drizzle porque es un cambio de esquema normal; así el
   snapshot y el journal quedan coherentes. Es la menos peligrosa (columna anulable, sin
   datos). Ojo: el PR también cambia la interfaz de alertas desde la vitrina, que hoy
   contradice «Alertas por correo — en validación» (PR A); esa parte debe revisarse
   aparte.
3. **#39 (trigger de borrado)** → regenerar con `drizzle-kit generate --custom` como
   `0027` (Drizzle no modela triggers: la migración es SQL a mano, sin diff de esquema).
   Condiciones: aplicarla como `postgres` (dueño de `usuario`, ignora RLS), probar en
   una rama de base con una cuenta de prueba, y decidir antes si el trigger sigue
   haciendo falta, porque `syncUsuario` ya limpia la fila huérfana cuando el correo se
   vuelve a registrar (`CLAUDE.md` §4). Si falla el `DELETE` del trigger, **falla también
   el borrado de la cuenta en Auth**: es el único riesgo operativo de las cuatro.
4. **#97 (`DROP TABLE lista_espera_mercado`)** → es destructiva. Hoy tiene 0 filas y su
   guarda lo comprueba, pero se decide aparte (`PENDIENTES.md` §49) y solo después de
   confirmar que ningún código la lee. Regenerarla como `0028` con `drizzle-kit generate`
   cuando se apruebe quitarla del esquema.

**Regla para no repetirlo:** un PR con migración no incluye `meta/*_snapshot.json` ni
entrada de journal escritos a mano; se regeneran al rebasar sobre `main`. Y el número de
una migración lo fija el orden de merge, no el orden en que se abrió el PR.

## Verificación que cerraría cada paso

| Paso | Evidencia |
|---|---|
| 1 | `select count(*) from drizzle.__drizzle_migrations` = 26 y `select tag…` incluye `0025_indices` |
| 2 | La columna `tipos_proyecto` existe en `al_filtros_usuario`; registro = 27 filas |
| 3 | Función y trigger presentes; borrar una cuenta de prueba en Auth elimina su fila en `usuario`; el borrado en Auth no falla |
| 4 | Ningún código referencia la tabla; la tabla ya no existe; registro coherente |

## Lo que no se hizo

No se aplicó nada, no se regeneró ningún snapshot, no se cerró ningún PR y no se escribió
en `drizzle.__drizzle_migrations`.
