# Consolidación para lanzamiento: promesas, recorridos y frescura

**Fecha:** 2026-10-24 · **Rama:** `claude/consolidacion-lanzamiento-a` · **Estado:** vigente
(PR A en curso; PR B y PR C, pendientes). No implica despliegue.

Punto de partida: informe del 2026-10-23 más un reconocimiento propio sobre
`origin/main` (`1f17f57`, #151). Las observaciones del informe se contrastaron con
el estado actual; no se asumió que los PR o los bloqueos siguieran igual.

## 1. Tres recorridos, tres significados

| Recorrido | Ruta | Qué responde | Qué NO responde |
|---|---|---|---|
| **Diagnóstico** | `/diagnostico` (anónimo) | Preparación general de la empresa: nivel, escalón de contratación, plan de acción. 10 preguntas, sin IA, sin cuenta | Si puedes participar en un proceso concreto. No recoge ni contrasta pliego, RUP, experiencia contractual ni capacidad financiera |
| **Coincidencias / perfil** | `/mis-coincidencias`, `/perfil` (cuenta gratuita) | Qué procesos del sector encajan con el perfil que declaras y cuáles compuertas del semáforo se pueden resolver | Un «cumple/no cumple» definitivo: es preliminar y no sustituye al pliego vigente |
| **Ficha pública** | `/licitaciones/[slug]` | Qué se contrata, estado y etapa, presupuesto, plazos, requisitos públicos, cambios detectados, documentos y fuentes, y qué falta comprobar | Evaluación personalizada ni formularios financieros |

Regla: el diagnóstico general nunca se presenta como aprobación para una licitación
concreta. Sin evidencia pertinente se muestra «sin datos» y qué comprobar.

## 2. Hallazgos (verificados 2026-10-24)

| # | Hallazgo | Evidencia actual | Prio. | Acción | PR |
|---|---|---|---|---|---|
| H1 | La sección de portada promete elegibilidad concreta y enlaza el diagnóstico | `TuPerfil.jsx`: eyebrow «Verifica tu elegibilidad», «Compruébalo antes de leer el pliego», «cruza cada proceso con tu experiencia, capacidad y zona… sabrás qué cumples» | P0 | Reescribir con el texto del §2.1 del encargo | A |
| H2 | La tarjeta «Semáforo con tu perfil» lleva a `/diagnostico` | `TuPerfil.jsx` (`href="/diagnostico"`); el cruce real es `/mis-coincidencias`, que al anónimo le muestra un teaser con login | P0 | Enlazar a `/mis-coincidencias`, decir que pide cuenta y perfil | A |
| H3 | «Alertas diarias» como beneficio, pero la entrega no está demostrada | `alertas/route.ts`: con `ALERT_EMAILS_ENABLED !== "true"` responde `200 {disabled:true}`; `vercel.json` ya programa el cron (12:00). `/cuenta` ya dice que se activará al configurar el envío | P0 | Tarjeta «Alertas por correo — en validación», sin llamada a activar | A |
| H4 | Promesas de adendas | `BuscadorGuiado.tsx`: «Con adendas, cronogramas y estados». `ComoRazonaFicha.jsx`: «Seguir sus cambios — adendas…» (esta ya está rotulada «En construcción») | P0 | «Cambios detectados en SECOP» donde solo hay detección; «adenda» solo para documento/evento oficial | A |
| H5 | CLAUDE.md dice ISR de la ficha de 12 h; el código dice 72 h | `app/licitaciones/[slug]/page.tsx:43`: `revalidate = 259200`. La portada: `21600` | P1 | Corregir CLAUDE.md (PR A); decisión de frescura en PR B | A/B |
| H6 | La ficha muestra «Registro actualizado en AquaLicita» desde `proceso.updated_at`, sin fecha de SECOP ni de última sincronización | `page.tsx` (`fi-ayuda`), `ficha.ts` (`actualizado`) | P1 | Verificar qué significa `updated_at` y qué fecha de la fuente se ingiere. No es cambio de PR A | B |
| H7 | El cron de alertas responde 200 sin enviar | ver H3 | P1 | Documentar en runbook que 200 ≠ entrega; evidencia que cerraría la prueba | A |
| H8 | Documentos con estado ambiguo | `PENDIENTES.md`, spec de consultas lentas, specs sustituidas | P1 | Marcar «Histórica / sustituida por …», índice de specs vigentes | A |
| H9 | PR antiguos con conflictos | #39, #97, #110, #112, #144 `CONFLICTING`; #143, #149, #152 `MERGEABLE` | P2 | Tabla de destino recomendado (sin cerrar ni fusionar nada) | A |
| H10 | Datos que el transform descarta; migraciones `0025` en conflicto | spec `2026-10-06-ficha-viva-datos-nuevos.md`, PR #112 | P2 | Matriz de datos y reconciliación con el journal | C |

## 3. Árbol de navegación

```
Explorar procesos (/licitaciones)
  → Entender una ficha pública y consultar sus fuentes
  → Elegir siguiente acción
      · Evaluar preparación general → /diagnostico
      · Comparar un proceso con tu perfil → /mis-coincidencias (cuenta + perfil)
      · Preparar documentación → requisitos y pliego en la ficha (§4 de la ficha)
      · Guardar → /mis-procesos (cuenta gratuita)
      · Recibir avisos → solo cuando el servicio esté validado
```

| Rama | Dato requerido | Fuente | Salida verificable | Incertidumbre | Siguiente acción visible |
|---|---|---|---|---|---|
| Diagnóstico | 10 respuestas del usuario | Cuestionario `co-apsb-v1` | Nivel, escalón y plan de acción | Autodeclarado; no valida documentos | «Comparar procesos con tu perfil» |
| Coincidencias | Perfil de oferente + datos del proceso | Perfil declarado, base ingerida de SECOP | Compuertas con `PASS/FAIL/UNKNOWN` | Pliego vigente, adendas y lugar de ejecución no verificados; `UNKNOWN` = «sin datos» | Abrir la ficha y revisar el pliego en SECOP |
| Ficha pública | Proceso ingerido | SECOP II vía ingesta | Etapa, presupuesto, plazos, cambios detectados | Edad del dato (ISR + ingesta + fuente); campos ausentes | Fuentes y qué comprobar |
| Preparar documentación | Pliego subido | Extractor (reglas + Gemini) | Requisitos, presupuesto, cronograma, causales con origen | Citas del modelo sin verificación literal (PR C) | Comprobar versión vigente |
| Guardar | Cuenta gratuita | `senal_usuario` | Lista en `/mis-procesos` | — | «Guardar no activa alertas» |
| Avisos | Alertas validadas | Resend + cron | **No operativo hasta cerrar la validación** | Entrega no demostrada | «En validación» |

## 4. Criterios de aceptación (PR A)

1. El CTA y el destino de cada tarjeta de la sección coinciden con lo que prometen.
2. Ningún texto de la portada ni del diagnóstico afirma que el cuestionario verifique
   elegibilidad para un proceso, ni menciona pliego, RUP, experiencia o capacidad
   financiera como evidencia que recoge.
3. La tarjeta del semáforo enlaza a `/mis-coincidencias` y dice que requiere cuenta y
   perfil; el ejemplo sigue rotulado «Ejemplo ilustrativo» y sin cifras.
4. No hay promesa de entrega diaria de correo ni de vigilancia de adendas; las
   alertas figuran «en validación».
5. «Adenda» solo aparece como recomendación de comprobar el expediente o referida a
   documentos oficiales; la detección se llama «cambios detectados en SECOP».
6. `ALERT_EMAILS_ENABLED` no se toca; no se envía correo.
7. Docs: CLAUDE.md corregido (ISR 72 h), índice de specs vigentes, specs sustituidas
   marcadas, tabla de PR y checklist de lanzamiento con estado por punto.
8. Pruebas del cambio, lint, tipos y build ejecutados; lo no ejecutable, listado
   como pendiente.

## 5. Fuera de este PR

- **PR B** (frescura y operación): fechas con procedencia, decisión A/B/C de
  invalidación selectiva, consumo de Vercel y timeouts.
- **PR C** (datos): matriz de campos, M11/M12 con acceso de lectura autorizado,
  clasificación sectorial, verificación literal de citas, reconciliación de `0025`.
- Sin merge, sin despliegue, sin cierre de PR, sin migraciones.
