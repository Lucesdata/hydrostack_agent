# Frescura de la Ficha Viva: decisión técnica y plan

**Fecha:** 2026-10-24 · **Rama:** `claude/consolidacion-lanzamiento-b` (PR B) ·
**Estado:** propuesta. Lo único implementado es la entrega inmediata (§2). La
invalidación selectiva (§5) **no** está implementada y necesita tu decisión (§7).

## 1. Qué determina realmente la antigüedad de una ficha

Un intervalo ISR no es un máximo garantizado. La edad de lo que ve un visitante es la
suma de cuatro capas, y la ficha solo controla una:

| Capa | Hoy | Quién la controla |
|---|---|---|
| Publicación en SECOP | Variable; la fuente reescribe campos sola | Fuera de nuestro control |
| Ingesta | Un `tick` diario, 11:00 UTC (`vercel.json`, Hobby: 2 crons, mínimo diario). Presupuesto compartido de 300 s con detección de eventos, filtros y sanciones; se corta en 120 páginas y continúa al día siguiente | Parcial |
| Transform | Reescribe `proceso` en cada corrida (`updated_at = now()`) | Nuestra |
| Caché ISR de la ficha | `revalidate = 259200` (72 h, #146, por las escrituras de ISR del plan gratuito). Es *stale-while-revalidate*: la primera visita tras vencer sirve lo viejo y regenera detrás; si la regeneración falla (timeout de base) se sigue sirviendo lo viejo | Nuestra |

Peor caso sin fallos: SECOP publica justo después de la ingesta (≈24 h hasta la
siguiente) + la página cacheada justo antes (hasta 72 h) + una visita extra de
regeneración: **del orden de 4 días**, no «72 h». Con fallos, más.

### Evidencia operativa (Vercel, `get_runtime_errors`, 7 días, consultada 2026-10-24)

No se pueden dar por resueltos ni la saturación ni la frescura:

- **Ficha, lectura del proceso:** 108 errores, 26 usuarios, `/licitaciones/[slug]`,
  entre 2026-10-09 y 2026-10-20; causa `EAUTHQUERY auth_query secret check timed out`
  (el pooler no completó la autenticación a tiempo).
- **Consultas con `statement timeout`** en rutas ISR y dinámicas: departamento (40),
  competidores de la ficha (38), conteos de la vitrina y facetas (≈20), portada
  (destacados y conteos del mapa), `/licitaciones/entidades`, `/comparar`, `/informe`.
- **Ingesta (`/api/cron/tick`):** la de procesos corrió `ok` cada día (verificado en
  `sync_log`); falló una sola corrida, la de **contratos** del 2026-10-20, por
  `statement timeout`, y se recuperó al día siguiente. El «Task timed out after 300
  seconds» del 21 fue de una etapa posterior del `tick`, aún sin diagnosticar. Detalle,
  medición y causa de los timeouts de lectura en
  `2026-10-24-diagnostico-ingesta-timeouts.md` (el predicado de «abierto» se evaluaba
  fila a fila: 8,4 s frente a 174 ms con la fecha calculada una vez).
- Un `Invariant: expected pageData to be a string` (2) en la ficha.

Ya existe `drizzle/0025_indices_proceso_id_ficha.sql` en main (#136); no se verificó
que esté aplicado en la base viva. Pendiente de medir antes de decidir nada de caché.

## 2. Entrega inmediata (implementada en este PR)

La ficha mostraba «Registro actualizado en AquaLicita» desde `proceso.updated_at`, que
se reescribe con `now()` en cada pasada del transform y no dice nada de SECOP. Ahora
muestra, por separado y con procedencia:

- **Última sincronización de AquaLicita:** fin de la última corrida `ok` de
  `secop_ii_procesos` en `sync_log`. Instante real, en hora de Colombia.
- **Última actualización publicada en SECOP:** `raw_record.source_updated_at` del
  registro actual del proceso (`proceso.raw_record_id_actual`), es decir
  `fecha_de_ultima_publicaci`. Socrata la entrega sin zona y la ingesta la guarda como
  UTC; se muestra **solo el día, en UTC**, sin convertir a Colombia.
- Cada una dice «no disponible» si falta (corrida sin `ok`, proceso sin registro crudo
  vinculado, columna nula) y una nota: los datos se leyeron al generar la página y
  puede haber cambios posteriores. **No se usa la hora de render.**

Código: `src/lib/secop/frescura.ts`, `FrescuraFicha.tsx`; pruebas puras y contra PGlite
(la última `ok` gana a fallidas y a otra fuente; sin registro crudo no se inventa).
Coste: dos consultas por regeneración de ficha (PK y un índice `(source,status)` de una
tabla pequeña). Reversión: revertir el commit; no hay migración.

Limitación honesta: como la ficha es ISR, «sincronización» es la de la última
regeneración de esa página, no la de ahora. La nota lo dice.

## 3. Alternativas

| | A. Mantener ISR y comunicar el límite | B. Invalidación selectiva tras ingesta | C. Separar lo sensible al tiempo de lo histórico |
|---|---|---|---|
| Idea | Sin cambios de caché; fechas con procedencia (§2) y nota de antigüedad | Tras una ingesta `ok`, `revalidatePath` solo de las fichas cuyos campos relevantes cambiaron, con tope por corrida | Ficha estática con lo histórico; estado, plazo y etapa en un fragmento dinámico o API de caché corta |
| Coste | Nulo | Código en el transform (detectar cambio) y en el `tick`; N llamadas a `revalidatePath` | Mayor: dividir el render de la ficha, nueva ruta/API |
| Carga de base | Sin cambio | Sin lecturas extra si el cambio se detecta en el `upsert` (`returning` con `IS DISTINCT FROM`); regenerar solo ocurre con visita | Más lecturas por visita en el camino caliente, justo donde hoy hay timeouts |
| Frescura | Hasta ≈4 días en el peor caso | De «próxima visita tras la ingesta» para lo que cambió; lo que no cambió sigue cacheado | La mejor para estado y plazo |
| Fallos | Sin riesgo nuevo | Si falla la invalidación se degrada a A. Riesgo: consumir el presupuesto de 300 s del `tick` | Un timeout de base rompe la parte viva de la ficha |
| Reversión | — | Interruptor por variable de entorno; sin él, comportamiento A | Alta: cambio estructural |
| Cuotas Hobby | Respeta #146 | **Por verificar**: si `revalidatePath` o la regeneración cuentan contra el límite de escrituras de ISR | Aumenta invocaciones y lecturas |

## 4. Recomendación

**A ahora (hecho) + B por etapas, condicionada a medir. C descartada por ahora.**
Razón: C aumenta la carga de lectura en el punto que hoy falla; B solo actúa sobre lo
que cambió y se apaga con un interruptor. **Primero hay que arreglar las consultas
lentas** (diagnóstico enlazado en §1): sin eso B no se puede evaluar.

Nunca se invalidan todas las fichas tras una ingesta.

## 5. Plan de B (no implementado)

1. **Medir** (solo lectura, con acceso a la base): fichas modificadas por corrida en 30
   días (comparando `proceso` entre corridas o con `al_proceso_evento`), la distribución
   por día, y cuántas de ellas se visitan. Verificar en la documentación/panel de Vercel
   si la invalidación a demanda cuenta contra las escrituras de ISR del plan Hobby.
2. **Detectar el cambio en el `upsert`** de `proceso` (`transform/writers.ts`):
   `estado_actual`, `estado_apertura`, `fecha_recepcion`, `valor_estimado`, `adjudicado`
   y `fecha_adjudicacion`; devolver solo los ids con diferencia. Sin migración.
3. **Invalidar** al final del `tick`, después de que la ingesta termine `ok`, con tope
   (p. ej. 200 por corrida, ordenadas por visitas recientes si existen) y un
   `try/catch` que registra y sigue. `slugDeProceso(objeto, id)` da la ruta. Interruptor
   `FICHA_REVALIDACION_SELECTIVA`; apagado = hoy.
4. **Medir de nuevo** una semana: frescura mostrada (§2), escrituras de ISR, duración del
   `tick`. Si el `tick` roza los 300 s, no se activa.
5. Pruebas: detección de cambio contra PGlite, tope y orden, fallo de `revalidatePath`
   no tumba la ingesta.

## 6. Qué queda fuera del PR B

- Arreglo de los timeouts de lectura: diagnosticado (calcular «hoy en Colombia» una vez
  por consulta) en `2026-10-24-diagnostico-ingesta-timeouts.md`; **no** es un cambio de
  caché y se propone como PR aparte.
- Aplicar o reconciliar migraciones (incluida `0025`).

## 7. Decisión que necesito del propietario

1. ¿Se aplica primero el arreglo de las consultas lentas antes de B? (recomendado)
2. ¿Tope diario aceptable de fichas invalidadas y se autoriza leer la base para el
   paso 1 del plan (solo lectura)?
3. ¿Se acepta subir el `revalidate` de la ficha de 72 h a otro valor, o se mantiene
   (recomendado mantener hasta medir)?

## 8. Criterios de aceptación de lo implementado

- La ficha muestra dos fechas con etiquetas distintas y ninguna es la hora de render.
- Sin dato, cada línea dice «no disponible».
- La fecha de SECOP no retrocede un día por zona horaria.
- No hay cambios de ingesta, caché ni esquema en este PR.
