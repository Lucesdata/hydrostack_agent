# Veredicto del Gate de Fase 0 — Prompt 0.3

**Fecha**: 2026-06-12
**Proceso evaluado**: UAESP Cali 4182.010.32.1.305-2026 — Estudios de mitigación PTAPs rurales
**Veredicto**: **SALE LIMPIO** con un caveat de generalización.

---

## 1. Qué se probó

La sonda de Fase 0 consiste en tres prompts encadenados sobre un proceso real de SECOP II:

| Prompt | Pregunta de fondo | Resultado |
|---|---|---|
| 0.1 | ¿Podemos descubrir procesos relevantes desde el dataset Socrata sin scrapear SECOP II? | Sí — `p6dx-8zbt` filtrado por departamento + fase + objeto entrega candidatos accionables. |
| 0.2 | ¿Podemos extraer la estructura del presupuesto (techos por ítem, formato exigido, reglas de evaluación) de un pliego real? | Sí — 100% de páginas leídas, 8 PTAPs × 3 actividades extraídas, todas las reglas de rechazo identificadas, 6 inconsistencias del pliego detectadas. |
| 0.3 | ¿Hay algún muro informativo que impida construir el producto? | No por parte del agente. Sí hay muros — son de la entidad redactora (anexos no publicados, numeración inconsistente) y son **detectables y reportables**, lo que es vendible. |

## 2. Por qué "sale limpio"

- **Cobertura completa**: las 90 páginas del pliego se leyeron. La extracción no quedó dependiendo de muestreo.
- **Estructura recuperada sin pérdidas**: presupuesto, formato Excel exigido, reglas de rechazo, requisitos habilitantes, criterios de calificación, garantías, acuerdos comerciales — todo extraído y conciliado contra el Excel.
- **Lagunas identificadas con severidad y página**: ver `lagunas.md`. El agente no las "tapó"; las dejó visibles como hallazgos.
- **Inconsistencias del pliego detectadas**: 4 internas + 2 archivos externos referidos pero no publicados. El validador de coherencia del pliego es uno de los productos vendibles que emergen de esta sonda.
- **No hubo alucinación numérica**: los $412.698.192 cuadran contra la suma de los 8 techos × 3 actividades, y contra el VALOR TOTAL (R55) del Excel.

## 3. Caveat — generalización a obra civil

Este pliego es **consultoría de diseño** (concurso de méritos). Características que lo hacen "fácil":

- El formato económico es una tabla plana sin APU.
- Unidades GLB en todos los ítems (no hay metros cúbicos, ni rendimientos).
- El precio NO pondera. El proponente no necesita optimizar el VR. UNIT — solo no superar el techo.
- 24 ítems totales (8 × 3).

Un pliego de **obra civil** (p. ej. ACUAVALLE 069-26 — realce de bocatoma) probablemente exige:

- Matriz APU completa: mano de obra, equipo, materiales, transporte, factor multiplicador, IVA por componente.
- Cientos a miles de ítems con cantidades reales (m³, m², kg, ml).
- AIU (Administración, Imprevistos, Utilidad) configurable.
- Precio SÍ pondera, por lo cual la inteligencia de mercado vale más.

La sonda no confirma que el agente extrae limpio una matriz APU de obra. Esa es la pregunta de **Fase 1**. Probable que requiera prompt especializado por tipo de unidad y validador cruzado contra el AIU.

## 4. Decisiones que el gate destraba

- ✅ **Continuar a Fase 1** sin reescribir el extractor — la arquitectura base sirve.
- ✅ **Documentar el caso como fixture** (este directorio) para reproducibilidad y prueba de regresión.
- ✅ **Mantener el dataset Socrata `p6dx-8zbt`** como fuente primaria de descubrimiento.
- ⏭️ **Siguiente sonda**: correr el mismo flujo sobre ACUAVALLE 069-26 o equivalente de obra civil. Si extrae APU bien, Fase 1 arranca con confianza alta. Si no, hay trabajo de prompt-engineering específico antes de Fase 1.
- 💡 **Sub-producto vendible identificado**: "Validador de coherencia del pliego" — detecta automáticamente inconsistencias internas (numeración, conteo, sumas de criterios) y referencias a anexos faltantes. Caso de uso: las propias entidades públicas para QA de sus pliegos antes de publicar. Fixture de prueba ya disponible en `lagunas.md`.

## 5. Riesgos abiertos

| Riesgo | Mitigación |
|---|---|
| Pliegos escaneados (no nativos PDF) — OCR ruidoso | Probar en Fase 1 con un pliego escaneado real; medir error de extracción. |
| Anexos en formatos heterogéneos (Excel con macros, AutoCAD, ZIPs anidados) | Ver primero la distribución real de formatos en una muestra de 50 procesos. |
| El campo `fase` de Socrata se actualiza con retraso | Cruzar con `estado_de_apertura_del_proceso` + año de publicación. Eventualmente, scraper de respaldo para confirmar estado. |
| Anexos solo cargables vía SPA autenticado | Aceptar que la descarga es manual del usuario (vía SECOP II logueado) hasta que se justifique un scraper headless. |

## 6. Sello del gate

Fase 0 cerrada. Pasa a Fase 1 con la condición de re-correr esta sonda sobre un pliego de obra civil antes de iterar el prompt base.
