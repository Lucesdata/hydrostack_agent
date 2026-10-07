# Spec de producto y diseño: nueva ficha de proceso AquaLicita

**Versión:** 1.0 · 6 de octubre de 2026  
**Destino:** reemplazo del modelo de ficha de proceso de aqualicita.com.  
**Referencia visual:** `aqualicita-san-miguel.html`, entregado junto a este documento.  
**Nombre de producto:** Ficha de proceso. Puede emplearse «Ficha operativa viva» como descripción; nunca «dossier» en la interfaz.

## 1. Decisión de producto

Reemplazar la ficha actual por una página que permita comprender la contratación, ubicarla en el tiempo, consultar sus condiciones y acceder a sus documentos sin alternar entre preguntas que ocultan el resto del contenido.

La nueva ficha será la vista principal de los procesos existentes, en sus URLs actuales. «Ficha completa» y «Lectura rápida» serán dos niveles de lectura del mismo proceso, con las mismas fuentes y estado. No serán páginas independientes ni modelos de datos duplicados.

La ficha debe responder, en este orden:

1. ¿Qué se contrata y quién lo contrata?
2. ¿En qué momento está el proceso y cuánto tiempo queda para el próximo hito?
3. ¿Qué cambió y qué conviene revisar ahora?
4. ¿Qué tipos de requisitos mínimos se necesitan para participar?
5. ¿Cuáles son los detalles, documentos y fuentes oficiales?

El HTML representa el diseño aceptado al terminar esta conversación. Sus datos de San Miguel, fechas, cifras, identificadores y documentos son ficticios: no se migran a los procesos reales.

## 2. Estado observado y límites de esta entrega

Se revisó la portada y una ficha pública de Barichara: [ficha actual observada](https://aqualicita.com/licitaciones/optimizacion-y-reposicion-de-la-red-de-acueducto-de--CO1.REQ.11132816).

En esa ficha se observaron: encabezado con entidad y estado, lectura por preguntas (Resumen, ¿Para qué?, Dinero, Plazos, Responsables y Metas), guardar/Mis procesos, vista «Quiero participar», compuertas asociadas al perfil, sección de pliego con carga y procesamiento de documentos, competidores similares, explicaciones y acceso al expediente SECOP II. La portada enlaza directamente a fragmentos de la ficha.

Esta observación no constituye una auditoría de todas las modalidades, estados ni permisos del sitio. No se ha inspeccionado el repositorio, su arquitectura ni las tablas de datos. Los nombres de componentes y campos de este spec son un contrato lógico propuesto, no afirmaciones sobre el código existente. Antes de implementar, inventariar los campos y servicios reales y mapearlos a este contrato.

El prototipo se verificó en estructura, enlaces y sintaxis de sus interacciones. La revisión visual automatizada del archivo local estuvo bloqueada por la política del navegador. La implementación deberá completar las pruebas visuales y funcionales descritas aquí.

## 3. Alcance del reemplazo

### Incluido

- Nueva composición visual, responsive y con identidad AquaLicita.
- Hero con identidad del proceso y guía temporal interactiva.
- KPIs, objeto, situación, cambios, requisitos mínimos y bloques de detalle.
- Lectura rápida, ficha completa, navegación por secciones y desplegables.
- Documentos buscables, impresión, copiar código y guardar ficha.
- Integración de fuentes, fechas, documentos y estado reales.
- Conservación de análisis de pliegos y funciones existentes de cuenta.
- Compatibilidad con rutas y enlaces históricos.

### Fuera de esta versión

- Rehacer portada, búsqueda, mapa, cuentas, alertas o sistemas de ingesta.
- Introducir recomendaciones de elegibilidad personalizadas en la ficha pública.
- Declarar que una empresa «cumple», «no cumple», «puede participar» o está habilitada.
- Generar requisitos, proponentes, cronogramas o novedades para rellenar datos ausentes.
- Ofertar dentro de AquaLicita: la presentación continúa en la plataforma oficial.

## 4. Arquitectura de información

Orden obligatorio de arriba abajo:

| Bloque | Contenido y función | Presentación inicial |
|---|---|---|
| Navegación del sitio | Marca, acceso a fichas y cuenta, retorno al listado | Reutiliza el shell del sitio |
| Hero | Título, entidad, ubicación, código, imagen editorial y guía temporal | Visible |
| KPIs | Presupuesto oficial, cierre, duración y modalidad | Visible |
| Controles | Ficha completa / Lectura rápida, guardar, imprimir | Visible |
| Accesos rápidos | Próximo hito, requisitos mínimos, presupuesto, documentos | Visible |
| Objeto y alcance | Qué se contrata, alcance y componentes cuando se conocen | Visible |
| Situación del proceso | Etapa, explicación y próximo hito; cronología ampliada | Visible |
| Cambios recientes | Novedades verificadas ordenadas por fecha | Visible |
| ¿Qué debo tener para poder participar? | Guía general y condiciones del proceso con fuentes | Visible |
| Información general | Entidad, referencia, modalidad, contrato, ejecución y financiación | Desplegado |
| Información técnica | Capacidades, cantidades, entregables, equipo y condiciones técnicas | Contraído |
| Presupuesto | Total y desglose disponible | Desplegado |
| Cronograma | Hitos, fecha, situación y cambios de fecha | Contraído |
| Proponentes | Ofertas y participantes oficiales cuando estén disponibles | Contraído |
| Documentos | Inventario, búsqueda y acceso a archivos | Desplegado |
| Detalles SECOP | IDs, enlace oficial, fechas de fuente y trazabilidad | Contraído |

En escritorio hay índice lateral fijo durante el desplazamiento. En móvil el contenido ocupa una columna y se mantienen accesos rápidos horizontales. El orden de lectura y del DOM será el mismo.

## 5. Hero e identidad del proceso

### Columna principal

- Categoría y descripción breve «Ficha de proceso».
- Un único H1 con título legible. Se permite un título editorial resumido si se conserva el objeto oficial completo en su sección y se identifica claramente como resumen.
- Nombre de entidad y ubicación. Distinguir «ubicación de la entidad» de «lugar de ejecución»; no inferir el segundo del primero.
- Referencia de la entidad y código de la fuente, con etiqueta cuando existan varios identificadores.
- Botón «Copiar código», con confirmación y alternativa de selección manual.
- Acceso «Ver situación del proceso».

El título debe crecer con el contenido. No limitarlo mediante altura fija, recorte o puntos suspensivos. Evitar mayúsculas sostenidas para títulos largos. Nunca modificar identificadores ni nombres oficiales al normalizar la presentación.

### Imagen

Preservar la atmósfera visual del prototipo: infraestructura o territorio bajo una capa azul noche que permita leer el texto. La imagen es secundaria frente a las fechas y al estado.

En producción usar una biblioteca limitada de imágenes optimizadas y con derechos de uso, elegidas por categoría. Una imagen genérica se etiqueta «Imagen ilustrativa»; una generada, «Visualización generada». No presentarla como fotografía de la obra o del municipio. Solo mostrar fotografía específica si su origen y relación con el proceso están verificados.

No generar imágenes nuevas en cada visita. Servir AVIF/WebP con dimensiones y variantes responsive; objetivo de hasta 250 KB para el recurso inicial, sin base64 en el HTML de producción. Mantener la imagen base del prototipo como recurso de referencia, no como requisito de una obra real. Si falla la carga, conservar fondo azul noche y legibilidad. La ampliación abre un diálogo con imagen, etiqueta de origen y botón Cerrar.

## 6. Guía temporal: dónde estoy, cuánto queda, qué hacer

La tarjeta del hero es el componente principal de orientación, no un esquema de la planta.

### Composición

1. Estado oficial con texto y marcador visual.
2. Etapa actual y mensaje orientativo.
3. Línea de etapas: completadas, actual y futuras.
4. Explicación de la etapa seleccionada.
5. Tiempo hasta el siguiente hito relevante, con fecha y zona horaria.
6. Siguiente paso y acceso al contenido correspondiente.
7. Última actualización de la fuente.

Etapas lógicas posibles: publicación, observaciones, ajustes/adendas, cierre de ofertas, evaluación, adjudicación y, cuando existan datos, contratación/ejecución. Adaptar la secuencia a la modalidad y a los eventos disponibles; no obligar a todos los procesos a recorrer las cinco etapas del ejemplo.

En el hero mostrar hasta cinco etapas, priorizando la actual y las vecinas; el cronograma contiene la secuencia completa. Señalar cuando existen hitos adicionales. La etapa actual depende de eventos oficiales y de sus fechas, no del porcentaje de tiempo transcurrido. Una adenda es un evento: no es una etapa universal que se pueda marcar sin evidencia.

### Interacción

Pulsar una etapa muestra fecha, descripción y fuente disponible. Cambia la selección explorada, pero no el estado real ni el marcador «Estás aquí». Cada etapa funciona con teclado. Selección explorada y etapa actual tienen tratamientos visuales distintos.

### Contador y fechas

- Usar el reloj actual; nunca la fecha congelada de la demostración.
- Recibir fechas completas con zona horaria, almacenar instantes sin ambigüedad y mostrarlos en `America/Bogota` con la etiqueta «Hora de Colombia».
- Calcular diferencia absoluta y mostrar días, horas y minutos enteros restantes. Actualizar al menos cada minuto y al volver a la pestaña.
- Actualizar el destino al recibir una adenda válida. Mostrar «Fecha ajustada»; mostrar «+3 días» únicamente si se conocen ambas fechas y la diferencia.
- Si solo existe una fecha sin hora confirmada: mostrar «Cierra el 15 de octubre · hora no confirmada». No inventar 23:59 ni un contador en horas/minutos.
- Si no hay fecha confiable: «Fecha del próximo hito no disponible», con acceso a SECOP.
- Si el plazo expira: no mostrar números negativos ni afirmar adjudicación. Mostrar «Plazo de ofertas finalizado» y la última situación disponible.
- Si el estado actualizado confirma evaluación/adjudicación, orientar hacia su siguiente hito conocido. Cancelado, suspendido o desierto: mensaje de estado y contador oculto. Para suspensión conservar el plazo anterior como histórico, no como límite activo.
- Si el estado dice abierto pero el plazo pasó, comunicar «La fecha de cierre registrada ya pasó; estado pendiente de actualización». No ocultar la discrepancia.
- La barra temporal representa solo el intervalo entre apertura y cierre conocidos, limitada a 0–100 %. No equivale a porcentaje de avance contractual. Si faltan extremos, no mostrarla.

### Orientación por estado

| Estado/etapa | Mensaje orientativo | Acción |
|---|---|---|
| Observaciones abiertas | Revisa el pliego y el plazo para observaciones | Consultar pliego y cronograma |
| Ofertas abiertas, con adenda | Revisa los ajustes antes de preparar la oferta | Abrir adenda y presupuesto |
| Ofertas abiertas, sin adenda | Revisa las condiciones y prepara los soportes | Ver requisitos y documentos |
| Ofertas cerradas | El plazo de presentación terminó | Consultar acta y evaluación |
| Evaluación | Revisa el informe y el plazo de observaciones | Abrir informe / cronograma |
| Adjudicado | Consulta el resultado de adjudicación | Abrir acto de adjudicación |
| Suspendido/cancelado/desierto | Explicación del estado conocido | Consultar acto oficial |
| Sin información suficiente | Consulta la situación en la fuente oficial | Abrir SECOP |

Esta orientación es general. Nunca afirma que un visitante está habilitado ni que ha cumplido un paso.

## 7. Contenido y reglas de confianza

Cada dato específico debe permitir identificar su fuente y fecha de actualización. Diferenciar visualmente: dato publicado, extracción de documento, resumen editorial y guía general. Los resúmenes no sustituyen el documento fuente.

### KPIs

Presupuesto en COP con formato colombiano y total exacto accesible; en compacto puede expresarse en millones. Cierre con hora confirmada, duración con unidad y modalidad. Un valor ausente muestra «No disponible», nunca cero. Conservar el orden y el espacio del KPI para evitar saltos.

### Objeto y técnica

Presentar el objeto oficial completo o con expansión «Leer completo» si resulta extenso. Alcance, cantidades, capacidades y explorador de componentes solo cuando tengan soporte. La exploración por Captación/PTAP/Tanque/Redes se adapta al proceso: no aparece en consultorías o suministros sin esos componentes. Si no existen detalles, el objeto sigue disponible y el explorador se omite.

### Cambios recientes

Mostrar los tres más recientes y «Ver todos» si hay más. Cada evento lleva fecha, tipo, resumen, fuente y, cuando exista, valor anterior/nuevo. Deduplicar por evento/documento/versionado. Actualizar la ficha o reingerir una fuente no constituye una novedad contractual. No contar observaciones si no se conoce su número. «Sin cambios registrados» distingue falta de historial de confirmación de ausencia de cambios.

### Requisitos mínimos: público y general

Título: **¿Qué debo tener para poder participar?**

Seis categorías educativas: capacidad jurídica; registro y experiencia; capacidad financiera; capacidad organizacional; capacidad de ejecución para obra cuando aplique; presentación de la oferta y sus soportes.

Para cada categoría: explicar qué se revisa, soportes habituales y, si se ha extraído y verificado, condición concreta del proceso con referencia al documento y página/apartado. La guía general debe estar siempre diferenciada de lo exigido por esta contratación. «No disponible» no significa «No exigido».

No usar rangos ficticios como experiencia en tres contratos o indicadores de liquidez para procesos reales. RUP y capacidad residual se muestran según modalidad y aplicabilidad, nunca como exigencia universal. Diferenciar condiciones de oferta y condiciones previas a ejecución. No utilizar casillas que concluyan habilitación ni pedir el perfil de empresa para acceder a esta sección.

Incluir el aviso breve: «Los requisitos concretos los define el pliego y sus adendas». Referencia educativa: [Manual de requisitos habilitantes de Colombia Compra Eficiente](https://www.colombiacompra.gov.co/archivos/manual/manual-para-determinar-y-verificar-los-requisitos-habilitantes-en-los-procesos-de-contratacion).

### Presupuesto

Total oficial independiente del desglose. Tabla y barra por componentes solo con valores conocidos y comparables. No estimar AIU, impuestos, capítulos ni participaciones. Si el desglose no concilia, mostrar diferencia y fuente; no forzar 100 %. Etiquetar desglose parcial y retirar barra proporcional al total si induce a interpretar que está completo.

### Proponentes

Antes de cierre: «Recepción de ofertas en curso; participantes oficiales no disponibles». Después del cierre, si aún no hay datos: «Información de proponentes pendiente». Mostrar cero ofertas solo con confirmación oficial. No convertir interesados u observantes en proponentes.

Conservar «Quién suele competir en procesos similares» como subsección separada y claramente etiquetada en este bloque. Los competidores históricos no son participantes de esta contratación.

### Documentos y análisis de pliego

Listado por nombre, tipo, fecha, versión y tamaño cuando se conozcan. Búsqueda local por nombre/tipo/fecha sin distinguir mayúsculas ni acentos. Mostrar resultados visibles y ausencia de coincidencias. Para listas de más de 20, paginar; buscar sobre el inventario completo disponible, no solo sobre la página visible.

Cada documento tiene un acceso real. No conservar los botones de referencia ficticia del HTML. Si el archivo no está disponible, indicar su estado y ofrecer expediente SECOP si existe.

Conservar el flujo actual para aportar y procesar el pliego dentro de Documentos, conectado a sus servicios y permisos existentes. Estados: no procesado, archivo seleccionado, validando, procesando, disponible y error con recuperación. Reutilizar tipos, cuotas y límites configurados; no fijar las cuotas observadas como nuevos requisitos del producto. Abrir la sección y mantener seguimiento si el usuario inicia procesamiento. Los resultados alimentan técnica, requisitos, presupuesto y cronograma con su trazabilidad. Mantener los resultados previos si un nuevo procesamiento falla; identificar versiones.

## 8. Interacciones y estados

| Control | Comportamiento | Estados y recuperación |
|---|---|---|
| Ficha completa / Lectura rápida | Completa es el modo inicial. Rápida conserva hero, KPIs, objeto, situación, cambios y resumen de requisitos | Anclas a detalle cambian a completa y abren destino. Sin navegación a otra página |
| Índice lateral | Desplaza a sección y la abre cuando corresponde; destaca sección visible | En móvil, accesos horizontales; no contenido esencial exclusivo del índice |
| Desplegables | Apertura independiente; «Desplegar todo / Contraer todo» | El estado del botón refleja si todos están abiertos; sincronizar al abrir manualmente |
| Guardar ficha | Usar el guardado asociado a cuenta existente | Invitado: ingreso/registro con retorno a la ficha. Autenticado: guardando, guardado, quitar y error. No mostrar éxito sin confirmación del servicio |
| Copiar código | Copiar el identificador etiquetado | Confirmación breve; error con selección manual |
| Imagen ampliada | Diálogo con contexto de la imagen | Cerrar, Escape, foco retenido y restaurado al disparador |
| Buscar documento | Filtrado inmediato, accesible | Vacío, resultados, ninguna coincidencia; botón para limpiar |
| Imprimir / PDF | Impresión del navegador de la ficha completa, con detalles abiertos | Incluir fuente, fecha de impresión y actualización; restaurar modo y desplegables tras cerrar impresión |
| Volver arriba | Regresa al título | Respetar reducción de movimiento; no tapar contenido ni foco |
| Abrir SECOP | Enlace oficial del proceso | Mostrar solo enlace real; indicar salida a fuente externa |

Conservar el glosario y explicaciones contextuales del sitio. Integrarlos cerca del dato o en ayuda desplegable, sin obligar a interrumpir la lectura principal.

## 9. Diseño y responsive

Usar la identidad del hero de [AquaLicita](https://aqualicita.com/) y el HTML como referencia visual. Consolidar el CSS del prototipo en componentes/tokens del sitio; no copiar la sucesión de overrides como arquitectura final.

| Token lógico | Valor de referencia | Uso |
|---|---|---|
| `color.page` | `#081521` | Fondo |
| `color.surface` | `#101f2f` | Bloques |
| `color.border` | `#263b50` | Separadores |
| `color.text` | `#f1f5fa` | Texto principal |
| `color.muted` | `#a7b7c9` | Texto secundario legible |
| `color.accent` | `#79c8ed` | Actual, enlaces y foco |
| `color.notice` | `#e8c48b` | Cambios y avisos |
| `radius.card` | 13 px | Secciones |
| `radius.hero` | 22 px | Hero |
| `radius.guide` | 20 px | Guía temporal |
| `space.unit` | 4 px | Escala: 8, 12, 16, 20, 24, 32, 40 |
| `layout.max` | 1280 px | Contenedor |
| `layout.sidebar` | 250 px | Índice escritorio |

Tipografía: reutilizar la sans serif del sitio; fallback Avenir Next, Avenir, Segoe UI, sans-serif. H1 32–48 px, peso 750, interlineado 1,12; H2 23–28 px; cuerpo 14–16 px; etiquetas 11–12 px. En el panel final del HTML hay etiquetas de 7–9 px: elevarlas a mínimo 11 px en producción, permitiendo mayor altura o una cronología vertical para conservar legibilidad. Contador 48–55 px con números tabulares; en pantallas estrechas reducir sin recortar.

| Ancho | Comportamiento |
|---|---|
| ≥1100 px | Hero de dos columnas, proporción aproximada 1,55:1. Contenido e índice 250 px, separación 28 px |
| 961–1099 px | Hero de dos columnas, panel mínimo 330 px; conservar índice si cabe sin estrechar las tablas |
| 701–960 px | Contenido de una columna; sin índice lateral; hero puede mantener dos columnas si el título/panel son legibles, en caso contrario apilar |
| ≤700 px | Hero apilado; controles en filas; guía debajo del título; márgenes laterales 18–20 px |
| ≤600 px | KPIs 2×2, requisitos y datos en una columna; tablas con desplazamiento interno |

Sin altura fija del hero. Solo la imagen se recorta con `object-fit: cover`. Pantallas de 320 px y zoom al 200 % no tendrán desplazamiento horizontal de la página. La cronología puede pasar a vertical si cinco etapas no caben con etiquetas legibles. Objetivos táctiles de al menos 44×44 px; separadores, tooltip o color no sustituyen texto.

Hover/foco con borde/acento y fondo sutil; transición 150–200 ms. Sin pulsos permanentes del contador ni animaciones que compitan con la lectura. Respetar `prefers-reduced-motion`. Verificar contraste AA en texto y controles, especialmente etiquetas pequeñas y texto sobre fotografía.

## 10. Contrato lógico de datos

Mapear los servicios existentes a una vista única de ficha. Mantener IDs internos y públicos por separado.

| Grupo | Campos mínimos | Ausencia / regla |
|---|---|---|
| Identidad | ID interno, código de registro, noticeUID si existe, referencia de entidad, URL canónica, URL SECOP, título, objeto, categoría, modalidad | No derivar noticeUID cambiando REQ por NTC |
| Entidad y lugar | Nombre, ubicación de entidad, lugar de ejecución con certeza/fuente | Separar ubicaciones |
| Estado | Estado original, normalizado, etapa verificada, fecha/fuente del estado | `unknown` permitido; no normalizar todos a abierto |
| Fechas | Publicación, apertura, cierre, zona, precisión de cada fecha, hitos | Precisión: fecha / fecha y hora; mantener histórico |
| Economía | Presupuesto total, moneda, componentes y unidad/base | null distinto de cero |
| Técnica | Componentes, cantidades, unidades, entregables y soportes | No inferir del título cantidades ni capacidades |
| Requisitos | Categoría, condición, aplicabilidad, momento de acreditación, fuente/apartado | Guía general separada de requisito extraído |
| Cambios | ID, tipo, instante, resumen, antes/después, referencia fuente | Evento real, deduplicado |
| Documentos | ID, nombre, MIME/extensión, fecha, versión, tamaño, URL y disponibilidad | Metadatos opcionales, estado explícito |
| Ofertas | Estado de disponibilidad, oferentes publicados, fuente y fecha | Cero solo verificado; históricos aparte |
| Pliego | Estado del procesamiento, versión, resultados, errores y permisos | Mantener servicio existente |
| Trazabilidad | Fuente de cada campo, consulta, extracción, actualización, advertencias | Visible al usuario en detalle |

Fechas ISO 8601 con offset cuando representan instantes. Cálculos monetarios con decimal/unidad menor, no redondeo de presentación. Campos desconocidos nulos, no textos ficticios en la fuente. Si falta historial, habilitar «Cambios recientes» con estado vacío hasta que exista seguimiento verificable.

El refresco usa el mecanismo de ingesta del sitio. Mostrar la actualización real; no prometer sincronización en tiempo real si los datos se actualizan por lotes. Si el sistema detecta error de actualización, conservar datos previos con aviso y su fecha, y ofrecer la fuente oficial.

## 11. Migración y compatibilidad

1. Inventariar campos, estados, permisos, enlaces y funciones del modelo actual en el repositorio.
2. Construir el adaptador de datos y los componentes nuevos sin alterar la ingesta para decorar la interfaz.
3. Migrar fuentes, glosario, guardado, pliego y competidores al lugar definido; retirar del recorrido público el selector por preguntas y las compuertas personalizadas.
4. No eliminar los servicios de perfil si otras partes del sitio los usan. Cualquier recomendación personalizada fuera de esta ficha conserva sus permisos y no se incorpora automáticamente a la guía general.
5. Activar el nuevo render en las rutas actuales de procesos. Si existe un flag de despliegue, usarlo solo durante transición; no presentar dos modelos de ficha al usuario como opción permanente.
6. Conservar URLs canónicas, metadatos y enlaces desde portada, listado, alertas y Mis procesos.
7. Retirar el render antiguo al cerrar la migración; conservar una vía de rollback técnica sin duplicar páginas indexables.

### Anclas históricas

La portada actual contiene enlaces a `#ficha-resumen`, `#ficha-dinero`, `#ficha-plazos` y `#pliego`; se observó `#ficha-participar` en la ficha. Inventariar las restantes antes de implementar.

| Fragmento anterior | Destino nuevo |
|---|---|
| `#contenido` | Inicio del contenido principal |
| `#ficha-resumen` | KPIs / objeto |
| `#ficha-dinero` | Presupuesto, abierto |
| `#ficha-plazos` | Cronograma, abierto |
| `#ficha-participar` | Requisitos mínimos |
| `#pliego` | Documentos y análisis de pliego, abierto |

Resolver anclas al cargar y al cambiar el fragmento, incluyendo acceso directo en lectura rápida. Actualizar enlaces internos y mantener aliases de los antiguos. No enviar todos los fragmentos al inicio de página. Preservar el código de proceso utilizado por el guardado aunque el expediente SECOP use otro identificador.

## 12. Accesibilidad, carga y rendimiento

- Un H1; jerarquía semántica de encabezados, regiones y landmarks; enlace para saltar al contenido.
- `aria-current="step"` para etapa actual y `aria-pressed` para la seleccionada; selección no altera realidad del proceso.
- Contador con descripción legible; no anunciar cada minuto al lector de pantalla. Anunciar cambio de estado relevante, no el tick.
- Etiqueta visible para búsqueda, botones con nombres, foco visible y orden lógico.
- Desplegables operables con teclado; contenido accesible sin JavaScript. Anclas y SECOP permanecen funcionales si falla la hidratación.
- Diálogos con foco inicial, cierre por Escape, retención y restauración del foco.
- Indicador de lectura decorativo y oculto a tecnologías de asistencia.
- Carga: skeletons sin cifras simuladas; no mostrar abierto antes de conocer el estado. Error parcial no bloquea secciones disponibles.
- Texto e información esenciales renderizados en HTML para navegación e indexación. Reutilizar el stack actual.
- Imagen con dimensiones reservadas, carga prioritaria solo del hero y variantes responsive. Evitar desplazar el contador cuando termina de cargar.
- Objetivos de producción: LCP ≤2,5 s, INP ≤200 ms y CLS ≤0,1, evaluados con datos de campo cuando haya volumen suficiente. Complementar antes de publicar con mediciones móviles de laboratorio; no confundirlas con evidencia de campo.

## 13. Criterios de aceptación

El reemplazo está listo cuando se verifica lo siguiente:

- [ ] Las rutas actuales muestran la nueva ficha, con terminología «ficha» en todos los controles y metadatos.
- [ ] El hero identifica proceso, entidad, fuente, estado y actualización sin datos de San Miguel en fichas reales.
- [ ] El panel explica etapa actual, siguiente hito y acción general; la selección de otra etapa no altera el estado.
- [ ] El contador usa hora actual y Colombia, se actualiza y maneja cierre, suspensión, cancelación, hora desconocida y datos contradictorios.
- [ ] Hero, cronología, KPI y cronograma comparten fechas y estado; una adenda actualiza los cuatro sin divergencias.
- [ ] La guía de participación es pública, por tipos de requisitos; no evalúa perfiles ni inventa umbrales.
- [ ] Se mantienen fuentes y se distinguen resúmenes, extracción y guía educativa.
- [ ] No hay cifras, ofertas, eventos, desglose o documentos ficticios para suplir datos ausentes.
- [ ] Guardar utiliza la cuenta y la persistencia actuales; ingreso devuelve al proceso y no se pierde la intención.
- [ ] El flujo de análisis de pliego conserva permisos, límites y resultados; error permite recuperación.
- [ ] Búsqueda de documentos, lectura rápida/completa, anclas, desplegables, copia, imagen ampliada e impresión funcionan.
- [ ] Anclas históricas llegan al bloque correcto abierto. Portada, alertas y Mis procesos no pierden destinos.
- [ ] Vista móvil, teclado, zoom y lectores de pantalla conservan toda la información.
- [ ] No se introduce desplazamiento horizontal global, recorte de títulos ni etiquetas ilegibles.
- [ ] El sitio conserva sus metadatos, URL canónica y enlace oficial correcto; no se confunden IDs REQ/NTC.

### Casos mínimos de prueba

| Caso | Resultado esperado |
|---|---|
| Abierto con cierre exacto y adenda | Contador correcto, nueva fecha y ajuste documentado |
| Solo fecha de cierre, sin hora | Fecha visible, sin cuenta regresiva horaria |
| Vencimiento durante sesión | Contador termina sin negativos; no inventa siguiente estado |
| Suspendido/cancelado/desierto | Mensaje propio, sin CTA de presentar oferta activa |
| Sin cronograma o sin presupuesto | Ficha legible, desconocidos explícitos |
| Pliego pendiente, procesado y error | Servicios y versiones conservados, recuperación disponible |
| Consultoría/suministro | Sin capacidades, equipo o componentes de planta inventados |
| Proponentes no publicados / cero confirmado | Estados distintos |
| Título extenso, 100 documentos, importes grandes | Sin recortes, búsqueda integral y paginación |
| Usuario invitado/autenticado, fallo al guardar | Retorno correcto y éxito solo confirmado |
| Entrada por fragmento antiguo | Destino abierto y visible |
| Impresión desde lectura rápida | Contenido completo, fuentes y fechas; restauración posterior |
| 320, 390, 768, 1024 y 1440 px; zoom 200 % | Reflow correcto, sin pérdida de información |

## 14. Secuencia de implementación y verificación

**Paso 1 — Inventario y mapeo.** Registrar correspondencia campo/fuente/componente, IDs y permisos. Señalar explícitamente qué datos faltan: el diseño debe funcionar con esos vacíos.

**Paso 2 — Presentación base.** Implementar tokens, hero, panel temporal, KPIs, columnas y secciones. Usar fixtures de prueba separados de producción. Comparar visualmente con el HTML, incorporando las mejoras de legibilidad definidas en este spec.

**Paso 3 — Datos y comportamiento.** Conectar cronograma, requisitos, documentos, historial, pliego y guardado. Probar las reglas temporales con reloj controlado y varios estados, sin esperar al paso del tiempo real.

**Paso 4 — Compatibilidad.** Resolver anclas, metadatos y enlaces; probar flujos desde portada, listado, cuenta y SECOP. Confirmar que el perfil no condiciona la guía general.

**Paso 5 — Validación y sustitución.** Ejecutar criterios de aceptación y revisar fichas representativas con datos reales. Publicar mediante el flujo habitual del sitio, observar errores y completar la retirada del render anterior.

Esta entrega define producto y diseño; no ha modificado ni publicado aqualicita.com. La implementación concreta se realiza en el repositorio del sitio y debe seguir su arquitectura y proceso de despliegue.
