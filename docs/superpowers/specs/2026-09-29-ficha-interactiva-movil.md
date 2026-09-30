# Ficha comprensible e interactiva

El usuario aprobó en esta conversación un boceto navegable con seis preguntas
y su versión móvil, y pidió pulir el diseño y publicarlo el 2026-09-29.

## Resultado esperado

Empresas, funcionarios y ciudadanía entienden lo esencial de un proceso y
eligen qué profundizar. La ficha deja de exigir la lectura de una página larga.
Seis controles: Resumen, ¿Para qué?, Dinero, Plazos, Responsables y Metas.
Una sección visible por vez; las fuentes se despliegan dentro de cada sección.
«Quiero participar» conserva el semáforo, los pliegos y los competidores.

## Criterios de aceptación

- Funciona entre 320 px y escritorio; controles táctiles de al menos 44 px.
- El objeto largo se puede leer completo sin dominar la primera pantalla móvil.
- Presupuesto, fechas y entidad proceden de datos reales del proceso. Cada
  sección explica su fuente y permite ir al expediente cuando existe URL.
- Nunca confundir ubicación de la entidad con ejecución, presupuesto con pagos,
  estado de contratación con avance, ni requisitos con resultados alcanzados.
- Necesidad, financiación y metas no disponibles se muestran por verificar.
- Se conservan cronograma, capítulos y requisitos de los pliegos procesados,
  subida/reemplazo, aviso de resultado y detalle de competidores.
- Los botones funcionan con teclado, anuncian selección y admiten Atrás.
- Un enlace al resultado de subida abre la sección del pliego.
- Todo el contenido sigue disponible sin JavaScript e indexable.
- No cambia la ruta, la caché pública, la base, auth, las políticas ni las
  reglas de elegibilidad. No se añaden dependencias.

## Alcance real

La presentación usa los campos ya ingeridos y las consultas de la ficha actual.
La obtención de necesidad, objetivos y financiación desde estudios previos
requiere otro trabajo; no forma parte de este despliegue visual.

El PR #95 abierto desarrolla un bloque de decisión para empresas. Este cambio
no lo incorpora ni modifica su lógica: su integración posterior debe conservar
los seis accesos públicos y alojar el bloque en «Quiero participar».
