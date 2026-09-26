# Ficha Viva — prueba de visitante y correcciones

Fecha: 2026-09-26. Estado: spec de trabajo basado en una prueba pública, sin cuenta.
Complementa `2026-09-26-landing-ficha-viva.md`; el objeto de esta entrega es la ficha de **un proceso**, no la ficha territorial del hero.

## Objetivo

Un ingeniero con poco tiempo abre una ficha en móvil y obtiene una respuesta verificable a cinco preguntas: qué se contrata, si sigue recibiendo ofertas, qué se sabe de su posible participación, qué le falta por comprobar y cuál es el siguiente paso. Nunca se infiere aptitud personal a partir de metadatos generales.

## Prueba observada

Recorrido público: `/` → `/licitaciones` → `/licitaciones/contrato-de-obra-publica-para-la-optimizacion-del-sistema--CO1.REQ.11070241` → `/diagnostico`. La ficha de Piendamó muestra objeto, entidad, valor, fecha de recepción y enlace al expediente original. Explica que no hay requisitos extraídos ni documentos replicados. El diagnóstico inicia sin cuenta, pero empieza por datos generales de la empresa y no queda enlazado a ese proceso. No se aportó un perfil ficticio ni se emitió un juicio de elegibilidad.

| Prioridad | Hallazgo reproducible | Efecto en el usuario | Acción |
| --- | --- | --- | --- |
| P0 | En ficha y vitrina la compuerta Zona dice «Se ejecuta en…». La auditoría de datos confirma que la fuente solo publica la ubicación de la entidad contratante. | Puede tomar una decisión territorial con una premisa falsa. | Corregir la explicación de la compuerta; conservar la localización, indicando su base y que la ejecución no está confirmada. |
| P1 | `/licitaciones` incluye objetos claramente ajenos al agua, como traducción de un curso clínico (`CO1.REQ.11095366`) y traducción para el Banco de la República (`CO1.REQ.11094589`). | Reduce la confianza y consume tiempo de exploración. | Auditar inclusión sectorial y métricas antes de cambiar ingesta o clasificador. Requiere plan por afectar la clasificación. |
| P1 | La ficha probada no dispone de pliego procesado; habilitación queda sin datos. | No es posible afirmar «puedes» o «no puedes» para ese proceso. | Mostrar qué evidencia falta y dirigir al expediente y al diagnóstico sin presentar este último como verificación del pliego. |
| P1 | La ficha no presenta historial de adendas/cambios ni acción de seguimiento entregable. | No funciona aún como agente que acompaña el proceso. | Diseñar eventos con fuente, fecha, antes/después e impacto; activar seguimiento solo tras validar entrega y consentimiento. |
| P2 | La primera página de la vitrina prioriza procesos recientes de diversos objetos, incluso estados y títulos poco informativos. | Encontrar una obra pertinente requiere explorar mucho. | Evaluar facetas y orden para obras pertinentes, sin alterar la paginación existente hasta medir. |

Los colores por tipo ya están implementados en portada y chip de ficha: azul potable, marrón residual, gris redes; `otros` punteado. La prueba de este documento observó la etiqueta textual «Acueducto · Agua potable»; no se midió contraste visual de cada variante en navegador. El spec existente y los tests de diseño cubren la regla de color.

## Árbol de decisiones del usuario

| Nodo | Dato y fuente | Salida verificable | Si falta evidencia | Siguiente acción visible |
| --- | --- | --- | --- | --- |
| Encontrar | Proceso ingerido y clasificación | Objeto, tipo, entidad, URL de ficha | Tipo `otros` o pertinencia dudosa | Abrir ficha o refinar exploración |
| ¿Recibe ofertas? | `estado_apertura`; fecha solo si publicada | Abierto/cerrado y fecha disponible | No inventar cuenta atrás | Ir al expediente o ver alternativas |
| ¿Qué se exige? | Pliego procesado y metadatos SECOP II, separados | Lista con cita y fuente | «No se puede determinar; falta pliego procesado» | Abrir expediente y revisar pliego |
| ¿Cómo me queda a mí? | Requisitos y perfil del oferente | Compuertas con razón y evidencia | Mantener UNKNOWN; nunca PASS por silencio | Completar datos necesarios o diagnóstico general |
| ¿Puedo corregir lo que falta? | Regla del pliego y momento del proceso | Subsanable/no subsanable solo si está documentado | «Pendiente de verificar» | Preparar documento, consultar expediente o descartar |
| ¿Qué cambió? | Eventos versionados del proceso | Fecha, campo, antes/después, fuente | «Sin historial verificado» | Consultar expediente; seguir cuando esté disponible |

Salidas finales: **avanzar con requisitos comprobados**, **resolver faltante concreto**, **no cumple requisito documentado**, **información insuficiente**, **proceso cerrado**. Cada salida debe mostrar una razón, un enlace a su fuente y una acción; ninguna equivale a autorización para presentar una oferta.

## Primera corrección implementable

En `compuertasAbsolutas()` cambiar la explicación de Zona por «Entidad contratante ubicada en {lugar}. Lugar de ejecución no confirmado.» El valor corto territorial permanece y no se toca la compuerta relativa ni el modelo de datos. Criterio: para municipio y departamento conocidos, el test debe comprobar el texto completo y no debe aparecer «Se ejecuta en».

## Segunda corrección de presentación

La ficha debe aplicar la misma distinción territorial al título resumido para buscadores y al chip de ubicación; los datos estructurados no deben declarar `areaServed` a partir de la sede de la entidad. Si no hay pliego procesado, el siguiente paso principal abre el expediente original, sin afirmar que el pliego está disponible. El diagnóstico público se ofrece como orientación general y se indica expresamente que no verifica los requisitos de este proceso. El acceso `UNKNOWN` a documentos se presenta como «no verificado».

Criterios: la ficha no atribuye a la obra la ubicación de la entidad; el enlace principal conduce al expediente cuando existe; sin URL, no aparece un enlace ficticio; ningún texto sugiere que el diagnóstico general determine la aptitud individual.

## Fases siguientes

1. Auditoría de pertinencia sectorial con ejemplos verdaderos y falsos. Antes de tocar clasificador/ingesta, medir volumen, cobertura y regresiones.
2. Contrato de evidencia de requisitos: pliego fuente, cita verificable, fecha de extracción y estado UNKNOWN explícito.
3. Vista móvil de siguiente paso por cada salida del árbol, conservando rutas públicas y diagnóstico sin cuenta.
4. Historial verificable de cambios y seguimiento optativo, tras confirmar fuente de eventos y funcionamiento del canal.

## Criterios de aceptación generales

- Desde portada o vitrina se abre una ficha real sin cuenta.
- La ficha nunca presenta sede de la entidad como lugar de ejecución confirmado.
- Ningún «puedes/no puedes» individual aparece sin requisitos y perfil suficientes.
- Todo dato ausente se nombra y lleva a un siguiente paso posible.
- Cambios y alertas se presentan como disponibles solo cuando funcionen de punta a punta.
- El recorrido móvil conserva etiquetas textuales de tipo, estado y resultado además del color.

## Límites de esta prueba

Se observaron páginas y controles públicos en un navegador de 1363 × 936 px; el flujo móvil aún requiere prueba a ancho móvil. No se completó un diagnóstico con datos inventados, no se creó cuenta y no se verificó el envío de alertas ni la descarga del pliego original. Los tiempos de carga no se midieron con instrumentación; no se establecen umbrales numéricos a partir de esta sesión.
