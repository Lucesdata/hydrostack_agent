# CI-03 — Plan de datos de Commercial & Supply Intelligence

Fecha: 2026-11-09 · Estado: **propuesto para revisión arquitectónica; nada aplicado**.
Definición de tablas: `docs/sdd/00-esqueleto.md` §4.9 (fuente única, CONDUCTA §4).
Contexto: `…/specs/2026-11-09-commercial-intelligence-{auditoria,prd,datos}.md`,
`…-ci-02-spike-resultados.md`.

## 1. Alcance de este PR

Solo documentación: añade §4.9 al SDD y este plan. **No** crea archivos de
esquema, migraciones ni código. El paso a código (CI-04) exige aprobación
expresa del usuario y el cierre de las precondiciones de §6.

## 2. Cambios respecto al borrador de `…-datos.md` §2

| Borrador | Definitivo (SDD §4.9) | Motivo |
|---|---|---|
| `tec_nodo`, `tec_sinonimo`, `tec_nodo_tipo` | **Sin tablas**; taxonomía en código versionado | Mismo patrón que `TIPOS_PROYECTO`/`tipo_proyecto`; nada une taxonomía en SQL; evita sincronizar BD y código. Reabrir si personas no técnicas deben editarla |
| `empresa_comercial` | `ci_empresa` | Prefijo visible (convención `al_`) |
| `empresa_rol`, `empresa_capacidad`, `empresa_cobertura` | `ci_empresa_rol`, `ci_empresa_capacidad`, `ci_empresa_cobertura` | Ídem; `nodo_codigo` + `taxonomia_version` en vez de FK |
| `evidencia` polimórfica (`entidad_tipo/entidad_id`) | `ci_evidencia` + tabla puente `ci_necesidad_evidencia` | El polimorfismo no tenía integridad referencial |
| `necesidad_suministro` | `ci_necesidad` con CHECK que prohíbe cantidades/especificaciones/fecha en `inferida` | Hace cumplir «no inventar cantidades» en la base |
| `necesidad_estado_hist` | `ci_necesidad_estado_hist` + trigger `ci_necesidad_estado_guard` | Hace cumplir «la IA no confirma» en la base, no solo en el servicio |
| `coincidencia_comercial` | `ci_coincidencia` (necesidad **o** proceso) | Cubre producto A (proceso) y B (necesidad) sin tabla extra |
| `seguimiento_comercial` | `ci_seguimiento` solo `contrato/necesidad/contratista` | Los procesos ya se guardan por `/mis-procesos`; no duplicar |
| `consentimiento_comercial` | `ci_consentimiento` append-only | Prueba de consentimiento (Ley 1581); el marketing actual usa `senal_usuario` sin migración, pero las alertas comerciales necesitan evidencia auditable |
| `contrato_cambio` | `ci_contrato_estado` (línea base) + `ci_contrato_cambio` | Sin línea base no hay contra qué diffear (como `al_proceso_estado`) |
| `auditoria_accion` | `ci_auditoria` | Prefijo |
| `representacion_proveedor` | igual, **sin prefijo**, compartida | D10 |
| `consorcio_integrante` | `ci_consorcio_integrante`, **condicional** | D3 sin fuente verificada |

**Decisión nueva a confirmar (D16):** taxonomía en código, no en tablas. Es una
simplificación mía dentro de la arquitectura aprobada; si prefieres tablas, el
plan solo añade tres tablas en la migración B.

## 3. Migraciones propuestas (números provisionales)

Drizzle asigna el número real al generar. Cada una es independiente, **solo
`CREATE`** (cero `ALTER` sobre tablas existentes) y con `.enableRLS()`.

| Mig. | Contenido | Depende de | Riesgo |
|---|---|---|---|
| A | `ci_empresa`, `ci_empresa_rol`, `ci_empresa_capacidad`, `ci_empresa_cobertura`, `ci_consentimiento`, `ci_seguimiento`, `ci_auditoria` | D1 (hecho), D13 | Bajo: tablas vacías sin lectores |
| C | `ci_contrato_estado`, `ci_contrato_cambio` | — | Bajo; carga inicial de ~40.000 filas en un job aparte, por lotes |
| B | `ci_evidencia`, `ci_necesidad`, `ci_necesidad_evidencia`, `ci_necesidad_estado_hist` (+ trigger), `ci_coincidencia` | A, D (por la FK de `representacion_id`) | Medio: triggers a mano (Drizzle no los modela) |
| D | `representacion_proveedor` (+ trigger `representacion_solo_nit`) | **Acuerdo con TI (D10)** | Medio: tabla compartida |
| E | `ci_consorcio_integrante` | D3 con fuente verificada | Condicional |

Orden de aplicación real: A → C → D → B → (E). B va después de D porque
`ci_necesidad_estado_hist.representacion_id` referencia a `representacion_proveedor`.

## 4. Invariantes que impone la base (no solo el servicio)

| Invariante | Mecanismo | Prueba obligatoria (PGlite, migraciones reales) |
|---|---|---|
| Nada de cantidades/especificaciones/fecha en una necesidad `inferida` | CHECK en `ci_necesidad` | INSERT con `cantidad` y estado `inferida` falla |
| Solo un representante verificado confirma o abre | CHECK en `ci_necesidad_estado_hist` + trigger de guarda | Cambiar `estado` a `confirmada` sin fila válida falla; con `actor_tipo='sistema'` falla |
| Una inferencia nunca es «verificada» | CHECK en `ci_evidencia` | INSERT `inferencia` + `verificada=true` falla |
| Una cuenta = una empresa | UNIQUE `(usuario_id)` | segundo INSERT falla |
| Un representante verificado por contratista | UNIQUE parcial | segunda `verificada` falla; tras `revocada`, otra sí entra |
| Solo NIT | Trigger `representacion_solo_nit` | solicitud sobre `proveedor` CC falla |
| Historial y auditoría inmutables | Trigger que rechaza `UPDATE`/`DELETE` | UPDATE en `ci_necesidad_estado_hist` falla |
| Toda tabla nueva con RLS | `.enableRLS()` + consulta de §10.3 | Test que enumera tablas sin RLS = 0 |
| El perfil no guarda precios | `especificaciones` sin esquema de precio; revisión en CI-05 | Test del validador de perfil rechaza claves de precio |

## 5. Volumen, cuota e impacto (estimaciones, no mediciones)

- Hoy: base **337,6 MB**, 31 tablas en `public`, **0 sin RLS** (medido 2026-11-09). Mayores: `raw_record` 104 MB, `proceso` 95,5 MB, `contrato` 49,5 MB, `al_proceso_evento` 26,5 MB.
- Estimación de lo nuevo, con índices: `ci_contrato_estado` ≈ 40.000 filas (≈ 5–8 MB); `ci_necesidad`/`ci_evidencia`/puente, del orden de 10⁴ filas (< 10 MB); el resto, despreciable. **Total estimado < 25 MB.** Es una estimación de orden de magnitud: se mide tras CI-07/CI-09.
- **No verificado:** el plan de Supabase vigente (el SDD §0 habla de Free 500 MB y Pro 8 GB). Es la precondición D11.
- Runtime existente: **sin impacto** (cero `ALTER`, ninguna ruta lee las tablas nuevas el día de la migración).

## 6. Precondiciones antes de CI-04 (todas pendientes)

1. **Aprobación explícita del usuario** para pasar a código (esta es solo documentación).
2. **D10 acordado con Talent Intelligence**: ver §7. Mientras no lo esté, migración D y B no se generan; A y C pueden ir antes.
3. **D11:** confirmar plan y cuota de Supabase.
4. ~~**Estado de migraciones**~~ **(verificado 2026-11-09, ver CI-04)**: el repo tiene 27 (`0000`–`0026`) y `drizzle.__drizzle_migrations` tiene 25 filas; los índices de `0025` sí existen en la base. Verificar que `0026_reparar_sedes_auditoria` esté aplicada y explicar la diferencia de conteo **antes** de generar una migración nueva (misma lección del SDD §10.1: no generar sobre un desfase).
5. **D13** (idioma) decidido, porque define los textos de `ci_consentimiento` (`version_texto`).
6. Revisión legal de D6/D7 **antes de monetizar**, no antes de migrar.
7. Pruebas de los invariantes de §4 escritas **antes** de la migración (rojas), por CONDUCTA §5.

## 7. Coordinación con Talent Intelligence (D10) — checklist

El PR #170 propone `staff_requirement` y `staff_evidence` y su propio mecanismo de
representación (TAL-05). Para no duplicar:

- [ ] Acordar que `representacion_proveedor` (§4.9) es **la única** tabla de representación; TI la consume y no crea otra.
- [ ] Acordar quién escribe la migración D (propuesta: el primero en llegar; el otro rebasa). Ambos PR deben referenciarla igual.
- [ ] Acordar el tipo TS común `EvidenceRef` (datos §8) y que las tablas de evidencia son **por dominio** (`ci_evidencia` vs `staff_evidence`) hasta revisión conjunta.
- [ ] Confirmar que no hay FK entre `ci_necesidad` y `staff_requirement`.
- [ ] Acordar el contrato de secciones de la Ficha (`FichaSectionProvider`).
- [ ] Confirmar que TI no depende de `ci_*`, ni CI de `staff_*`.

Este plan **no** comenta ni modifica el PR #170: el acuerdo lo cierra quien lleva
ese trabajo con el usuario.

## 8. Reversión

Todas las migraciones solo crean tablas nuevas sin dependientes existentes.
Reversión = `DROP TABLE` en orden inverso (E, B, D, C, A), más `DROP FUNCTION`
de los triggers. Si la verificación de RLS de §10.3 devuelve alguna fila, se
revierte la migración (regla vigente del SDD). Las filas de `ci_*` son derivadas
o de cuenta; no hay datos de SECOP que perder.

## 9. Tareas siguientes (cuando se apruebe CI-04)

1. Escribir los tests rojos de §4 sobre PGlite.
2. `src/lib/db/schema/comercial.ts` + `index.ts`.
3. `npm run db:generate` → revisar el SQL; añadir a mano triggers y CHECK que Drizzle no genere.
4. Probar en `npm run local:preparar`; **no** aplicar a la base viva sin autorización.
5. Verificar RLS (consulta §10.3) y actualizar §10.2 del SDD con el estado real.

## 10. Avance CI-04 (2026-11-09) — migraciones A y C

- **Generadas, no aplicadas a la base viva:** `drizzle/0027_ci_a_perfil_empresa.sql` (7 tablas + función y dos triggers de solo anexado escritos a mano) y `drizzle/0028_ci_c_cambios_contrato.sql` (2 tablas). Solo `CREATE`; cero `ALTER` sobre tablas existentes. `drizzle-kit check` sin objeciones.
- **Pruebas rojas primero y luego verdes:** `src/__tests__/db/comercial-a-c.db.test.ts`, 16 pruebas sobre PGlite con las migraciones reales: UNIQUE de empresa por cuenta, CHECK de país/estados/rol/DIVIPOLA/tipo de seguimiento/campo de cambio, solo-anexado de `ci_consentimiento` y `ci_auditoria`, cascada al suprimir la cuenta y RLS en todas las tablas. Suite completo en verde (194 archivos, 1.666 pruebas).
- **Precondición 4 resuelta:** en la base viva los índices de `0025` existen y los efectos de `0026` (`geografia` 17001 y 15000, entidad de Manizales con `geografia_id=17001`) están presentes. La tabla `drizzle.__drizzle_migrations` tiene 25 filas con ids 1–25 frente a 27 archivos; la diferencia de conteo **sigue sin explicarse** (no es evidencia de que falten migraciones, pero hay que entenderla antes de aplicar `0027`).
- **Decisión de diseño al implementar:** los triggers de solo anexado permiten el `DELETE` en cascada (`pg_trigger_depth() > 1`) para no impedir la supresión de la cuenta (derecho de supresión de datos). Un `DELETE`/`UPDATE` directo se rechaza.
- **Pendiente para aplicar `0027`/`0028` a la base viva (requiere autorización expresa):** explicar el conteo de migraciones, D11 (plan y cuota), verificación de RLS (§10.3 del SDD) tras aplicar, y plan de carga inicial de `ci_contrato_estado` (~40.000 filas, por lotes y con vigilancia de tamaño como `backfill-tipo-proyecto.ts`). No se aplicó nada.
- **No incluido, a propósito:** B (evidencia/necesidades/coincidencia), D (`representacion_proveedor`, D10) y E (consorcios, D3).

## 11. Avance CI-05 (2026-11-09) — perfil de empresa

Sin pantalla (la interfaz entra tras los prototipos de CI-06) y sin tocar la base viva.
- **Capacidad `empresa_perfil`** en `src/lib/acceso/politica.ts`, nivel `gratis` (una cuenta = una empresa); el test de política la clasifica.
- **`src/lib/empresa/validar.ts` (puro):** solo lee campos conocidos; país ISO alfa-2; roles del brief; nodos validados contra la taxonomía; DIVIPOLA de 2 o 5 dígitos; **rechaza claves de precio** (precio, price, tarifa, cotización, costo, descuento, usd/eur/cop…) a cualquier profundidad; límites de tamaño; `completitud()` (qué le falta al perfil para servir al matching).
- **`src/lib/empresa/servicio.ts`:** única puerta de `ci_empresa*`. `usuarioId` solo de la sesión (no existe función que reciba un `empresaId` externo); guardado transaccional y serializado por cuenta (advisory lock); **el cliente no fija estados** (todo nace `declarado`; `documentado`/`verificado` solo sobreviven si el dato no cambia); cambiar la identidad de una empresa `verificada` la devuelve a `en_revision`; una `rechazada`/`revocada` no se rehabilita editando; cada guardado deja una fila de auditoría con conteos, nunca el contenido.
- **`src/lib/empresa/actions.ts`:** `guardarEmpresaAction` y `leerMiEmpresaAction` (sesión → `puede()` → servicio). Los errores de base se propagan, no se tragan (CONDUCTA §5).
- **Pruebas (nuevas: 32):** validador puro (13), servicio sobre PGlite con las migraciones reales (14: aislamiento entre cuentas, ids ajenos ignorados, estados, identidad, auditoría, rollback por entrada inválida, concurrencia), acciones con sesión simulada (5).
- **No incluido, a propósito:** limitación de tasa contra spam, subida de documentos que eleve un dato a `documentado`, flujo de verificación (quién pasa una empresa a `verificada`) y cualquier ruta o pantalla. Quedan para CI-06/CI-08.
- **Nota técnica:** el repo compila con `strict: false`; las uniones de resultado llevan `errores?: undefined`/`valor?: undefined` en ambos casos para que `tsc` acepte la lectura tras comprobar `ok`.
