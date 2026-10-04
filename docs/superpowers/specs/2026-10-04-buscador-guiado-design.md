# AquaLicita — Buscador guiado

Fecha: 2026-10-04. Estado: alternativa visual 1 y recomendación de guardado
con cuenta gratuita aceptadas por el usuario. Diseño cerrado para planificación;
el plan de ejecución se revisa antes de implementar.

## Objetivo

Encontrar un proceso sin tener que imaginar una palabra clave: elegir un
sistema y, si interesa, una actividad; también localizar un proceso conocido
por su número y regresar a sus fichas. El buscador se incorpora bajo la frase
del hero vigente, que ya no contiene el buscador antiguo. Conserva el mapa,
las tarjetas y los enlaces a las fichas existentes.

## Diseño elegido

Tres entradas: «Por tema», «Por número» y «Mis procesos». Se muestra un solo
formulario a la vez. «Por tema» es la entrada inicial. No se añaden secciones
de marketing a la portada ni se cambia la paleta.

### Por tema

Dos listas desplegables con etiquetas visibles:

- Sistema: Todos, Agua potable, Aguas residuales, Acueducto,
  Alcantarillado, PTAP y PTAR.
- Actividad: Todas, Obras, Operación y mantenimiento, Muestreo y laboratorio,
  Consultoría, Interventoría y Suministros.

«Todos» y «Todas» son los valores iniciales. Cada lista permite una selección;
los dos filtros se combinan. Un texto adicional es opcional, con etiqueta
«Palabra o entidad» y ejemplo «bombeo, laboratorio…». El botón dice «Buscar
procesos». Cambiar una lista no ejecuta la búsqueda automáticamente.

Las familias Agua potable y Aguas residuales son accesos de búsqueda; no
crean nuevos tipos de proyecto. Las actividades también son criterios de
búsqueda, no tipos de proyecto. Sus equivalencias se comprobarán con procesos
reales antes de incorporarlas. La clasificación actual conserva sus cinco
valores y su fuente única.

La búsqueda temática muestra procesos abiertos inicialmente. Presenta hasta
cinco resultados con objeto, entidad, estado, presupuesto cuando exista y
enlace a la ficha. «Ver todos los resultados» conserva los criterios en el
explorador. Las cifras siempre proceden de los resultados reales.

### Por número

Campo «Número del proceso», con ejemplos de referencia de la entidad y de
identificador SECOP II. Busca ambos campos y permite procesos abiertos y
cerrados. Primero presenta coincidencias exactas; las parciales se identifican
como tales. Si varias entidades comparten referencia, se muestran separadas
con su entidad e identificador. Ninguna coincidencia ambigua abre una ficha
automáticamente.

Sin coincidencias: «No encontramos ese proceso en AquaLicita. Comprueba el
número o prueba con una palabra del objeto». No se afirma que el proceso no
exista en SECOP.

### Mis procesos

Guardado explícito con cuenta gratuita y recientes separados. «Guardar» está
presente en los resultados y en la ficha; tras confirmación muestra «Guardado».
Se puede quitar de la lista. Si el visitante no tiene cuenta, se le ofrece
iniciar sesión o crearla y conservar la intención de guardar; solo se guarda
tras autenticar a la persona y confirmar la acción pendiente.

Guardados pertenece a la cuenta y se conserva entre visitas y dispositivos.
Un proceso cerrado sigue visible con su estado actualizado. Abrir una ficha
no equivale a guardarla. Guardar no suscribe a correos ni al seguimiento de
cambios. Un proceso que deja de estar disponible se señala y se puede quitar.

Recientes muestra las últimas diez fichas distintas abiertas por la cuenta,
ordenadas por la última visita. Una visita repetida actualiza el orden sin
duplicar la ficha. Tiene «Borrar recientes»; borrar recientes no borra
Guardados. La visita se registra al abrir efectivamente la ficha con la sesión
vigente, nunca por precarga de enlaces. El visitante sin cuenta puede buscar y
abrir fichas; para conservarlas entre visitas se le ofrece la cuenta gratuita.

Al cerrar sesión desaparecen de la interfaz los datos personales; no se
conservan copias persistentes en el navegador. Otra cuenta no puede leer ni
modificar las listas de la anterior. El fallo al registrar una visita no
impide leer la ficha; un fallo al guardar no muestra una confirmación falsa.

## Estados y uso móvil

Carga, resultados, ausencia de resultados y error tienen mensajes diferentes.
Un error conserva los criterios y ofrece reintentar. Los filtros no se ignoran
silenciosamente si una fuente no está disponible. Al cambiar de entrada se
conserva lo escrito durante la interacción.

En móvil los campos se apilan; el botón ocupa el ancho disponible. Las listas
y entradas funcionan con teclado y tienen etiquetas persistentes. Los
resultados no desplazan el foco inesperadamente. El formulario de búsqueda
tiene una alternativa funcional sin JavaScript.

## Criterios de aceptación de la búsqueda

1. Elegir PTAR y Consultoría combina ambos criterios; elegir Todos elimina
   únicamente el filtro de sistema.
2. Una búsqueda temática entrega los mismos criterios al explorador y a sus
   resultados; la navegación permite recuperar la selección.
3. Un identificador SECOP y una referencia de entidad pueden localizar una
   ficha; también cuando el proceso está cerrado.
4. Una referencia compartida presenta todas sus coincidencias con la entidad.
5. No hay resultados ni conteos inventados; sin presupuesto no se muestra $0.
6. Sin resultados y error de servicio son estados distinguibles.
7. El buscador funciona en móvil sin desbordamiento horizontal y con teclado.
8. Se preservan mapa, rutas de ficha, clasificación y la corrección del contexto
   del tipo desplegada en el punto 1.

## Secuencia de entrega propuesta

Primero, búsqueda guiada y búsqueda por número. Después, conservación de
procesos con cuenta gratuita y recientes separados. Cada entrega se revisa y valida
antes de continuar con la siguiente. No se modifica todavía el producto.
