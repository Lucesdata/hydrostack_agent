# AquaLicita Marketplace híbrido · SPEC de implementación

## 1. Alcance

Portada pública de descubrimiento de oportunidades hídricas en Colombia. El hero combina texto, búsqueda, familias, indicadores verificables y un mapa 3D integrado al mismo escenario. La navegación cotidiana mantiene la vitrina rápida y las URLs canónicas de Fichas Vivas. Montar el primer incremento en `/marketplace` como ruta de revisión con `noindex`. Esa ruta y los valores técnicos de esta especificación son decisiones propuestas para el traspaso. El boceto incluido fija la composición y la jerarquía visual.

**Recorrido principal.** Entrar, buscar por proceso, entidad o proyecto, elegir una familia o departamento, revisar resultados y abrir una Ficha Viva. Desde el detalle, volver a los mismos filtros y posición. La consulta oficial se abre desde su enlace SECOP II.

## 2. Composición y visual

- Cabecera compacta sobre azul marino, con marca AquaLicita del producto y entradas existentes que funcionen. Oportunidades, Mapa y Fichas Vivas deben tener destino real. Las entradas restantes del boceto se muestran si tienen ruta funcional.
- Desktop desde 1024 px. Contenedor de contenido de hasta 1440 px, margen interno de 40–64 px y composición aproximada 44/56. A la izquierda, titular «Oportunidades de infraestructura hídrica en Colombia», una frase breve, buscador, tres familias y métricas cuando haya cobertura. A la derecha, silueta oblicua de Colombia sobre el mismo fondo. La escena se mezcla hacia la sección siguiente. Permitir desbordamiento visual controlado dentro del hero y conservar una zona legible detrás del texto.
- El canvas tiene fondo transparente y pertenece a la capa del hero. La inspección visual debe ver un solo fondo continuo, con cero borde, cabecera de widget, sombra rectangular o panel envolvente alrededor del mapa. La superficie terrestre puede tener relieve visual moderado, límites finos y acento ámbar para selección. Reducir halos, saturación y arcos luminosos respecto a la intensidad del boceto.
- Base propuesta `#07121d`, superficie `#102030`, texto `#eef5fb`, secundario `#a7b9ca`, acento `#67c6ef`, selección territorial `#f0bb68`. Conservar la tipografía de AquaLicita. Título con `clamp(2rem, 4vw, 4rem)`, cuerpo ≥16 px, interlineado 1.45. Estados hover y foco perceptibles. El color de familia o selección acompaña una etiqueta.
- Bajo el hero, «Oportunidades destacadas» y «Ver todas las oportunidades». Hasta tres tarjetas visibles en desktop, dos en tablet y una en móvil. Imagen a la izquierda o arriba según espacio. Mostrar categoría editorial, objeto real, ubicación con su alcance, entidad, valor estimado, plazo y enlace «Ver Ficha Viva» según disponibilidad. Usar carrusel manual con scroll nativo y botones anterior/siguiente si hay desbordamiento. Con filtros activos, rotular «Resultados» y respetar orden y paginación de la vitrina.
- Entre 768 y 1023 px, apilar escena y contenido si el buscador o las métricas pierden espacio. Por debajo de 768 px, orden cabecera, búsqueda, familias, métricas disponibles, selector territorial/mapa 2D y resultados. A 320 px y con zoom 200 %, permitir reflujo vertical. Texto, controles y estados se renderizan como HTML.

## 3. Integración en el repositorio

| Punto | Módulo existente / destino |
| --- | --- |
| Vista de revisión | `app/marketplace/page.tsx` como Server Component, consulta por petición según el patrón de `app/licitaciones/page.js` |
| Búsqueda y filtros | `src/lib/secop/filtros-vitrina.ts`, `filtrosDesdeParams`, `queryDeFiltros` y `src/lib/secop/vitrina.ts`, `procesosDeVitrina` |
| Métricas / destacados | `src/lib/secop/agregados.ts`, `destacados-portada.ts`. Reutilizar sólo si el alcance coincide |
| Geometría y alternativa | `data/geo/departamentos.geo.json`, `data/geo/san-andres-providencia.geo.json`, `src/lib/mapa/modelo.ts`, `src/components/mapa/ColombiaChoropleth.tsx` |
| Ficha canónica | `app/licitaciones/[slug]/page.tsx`, `src/lib/secop/ficha.ts`, helpers actuales de slug y URL |
| Nuevos componentes | `src/components/marketplace/` para hero, selector, carrusel y escena cliente. Adaptador de datos y consultas bajo `src/lib/marketplace/` cuando haga falta |

Next.js App Router, React y TypeScript según el repositorio. Three.js directo en un componente cliente de carga diferida. En la copia inspeccionada Next 14.2.3 y React 18.3.1 están instalados. Resolver el parche de seguridad y la compatibilidad en la rama efectiva antes de aprobar producción. React Three Fiber es opcional y requiere una matriz de versiones compatible. CSS Modules y transiciones CSS cubren el movimiento de interfaz.

El servidor lee el estado de URL y el conjunto canónico. Entrega DTO serializables a los componentes cliente. La carga inicial incluye búsqueda, listado y alternativa territorial útil. La escena se añade tras hidratar mediante importación dinámica con SSR deshabilitado dentro de un componente cliente. Mantener la lectura de base, tokens, mapeos y consultas en módulos de servidor. Evitar una API pública adicional cuando la navegación del App Router cubra la operación.

## 4. Contrato de datos y fuente de verdad

La base normalizada AquaLicita y su ingesta de SECOP II son la vía de producción. La fuente verificable de procesos es el dataset `p6dx-8zbt`. El contrato se verificó contra metadatos y una respuesta real, que devolvió `urlproceso` como objeto en esa muestra. El adaptador usa el normalizador existente. La plataforma oficial conserva el detalle y los documentos oficiales. [Catálogo SECOP II](https://www.datos.gov.co/w/p6dx-8zbt) · [Metadatos del dataset](https://www.datos.gov.co/api/views/p6dx-8zbt.json)

| Campo en vista | Campo de origen / derivación |
| --- | --- |
| Identidad estable | `id_del_proceso`. Referencia visible `referencia_del_proceso`, puede repetirse entre entidades |
| Objeto y descripción | `nombre_del_procedimiento`, `descripci_n_del_procedimiento` como texto |
| Entidad | `entidad`, clave normalizada AquaLicita y conciliación por `codigo_entidad` o NIT según modelo vigente |
| Departamento y municipio | `departamento_entidad`, `ciudad_entidad` y crosswalk AquaLicita/DIVIPOLA. Rotular «Ubicación de la entidad» cuando ese sea el alcance |
| Estado, fase y apertura | `estado_del_procedimiento`, `fase`, `estado_de_apertura_del_proceso`, conservar semánticas separadas |
| Fechas | `fecha_de_publicacion_del`, `fecha_de_ultima_publicaci`, `fecha_de_recepcion_de`. Interpretar con normalizador y zona America/Bogota |
| Cuantía | `precio_base` como valor estimado, decimal en COP según mapeo vigente. `valor_total_adjudicacion` corresponde a adjudicación |
| Categoría editorial | Tipo de proyecto clasificado por AquaLicita. Reutilizar taxonomía y criterios vigentes. Sin tipo confirmado, usar superficie neutra |
| Enlaces | URL SECOP validada desde `urlproceso` y ficha canónica del repositorio |

Contrato conceptual de vista, adaptar nombres a tipos vigentes:

```ts
type ConsultaMarketplace =
  | { estado: 'disponible' | 'desactualizado'; consultadoEn: string; actualizadoEn: string | null;
      total: number; items: Oportunidad[]; porDepartamento: Region[]; metricas: Metricas | null }
  | { estado: 'no-disponible'; consultadoEn: string };
type Oportunidad = {
  id: string; referencia: string | null; objeto: string; entidad: string | null;
  departamentoCodigo: string | null; departamento: string | null; municipio: string | null;
  tipo: string | null; estado: string | null; precioBaseCop: string | null;
  fechaRecepcion: string | null; fichaHref: string; secopHref: string | null;
};
type Region = { codigo: string; nombre: string; total: number };
type Metricas = { abiertas: number; entidades: number | null;
  valorEstimadoCop: string | null; procesosConValor: number | null };
```

- La vitrina abierta reutiliza `condicionAbierto()`. En el commit inspeccionado exige apertura «Abierto», estado publicado/abierto y fecha de recepción vigente según día de Colombia. La búsqueda por número mantiene la excepción de la vitrina y puede encontrar cerrados, claramente rotulados. Si se dispone de instante oficial, mostrar hora de Colombia sin inferirla de un día sin hora.
- Contar procesos distintos por ID, entidades distintas por identidad canónica y sumar una vez por proceso los precios base válidos. Expresar cobertura al lado de una suma parcial. Mostrar el total de oportunidades de la consulta completa, nunca el tamaño de página. En la búsqueda por número conservar el alcance de abiertas para las métricas si se muestran, con etiqueta explícita, o retirarlas.
- Lista, suma y mapa comparten predicado y referencia temporal. Para que el usuario cambie de departamento, el mapa agrega la consulta con todos los filtros activos salvo el territorial. Los indicadores y el listado sí aplican departamento. Informar los registros sin ubicación cuando el total nacional difiera de la suma del mapa.
- Distinguir `0` confirmado, dato nulo y fuente no disponible. Campos ausentes usan «No informado» cuando aporten contexto. Una consulta fallida muestra acción «Reintentar». Si existe un snapshot validado, muestra su fecha real de actualización y «Datos de la última sincronización». Sin snapshot, omitir KPIs y marcadores y conservar la navegación.
- Ingesta incremental e idempotente por ID canónico mediante el job existente. Mantener solapamiento y cursor estable por actualización e ID cuando el adaptador los soporte. Publicar marca de frescura tras completar lote y conservar snapshot previo ante falla. Tratar 429, timeout y 5xx con backoff acotado en ingesta. El navegador consulta AquaLicita.
- Presupuestos en decimal hasta formatear. Usar locale `es-CO` y COP. Enlace externo por HTTPS y hosts oficiales permitidos por el validador del repositorio. Conservar origen y fecha de consulta. Excluir nombres/IDs de proveedores y documentos de la respuesta pública cuando la vista no los use.

## 5. Búsqueda, territorio y navegación

- Un formulario GET con etiqueta visible y envío por Enter. Reutilizar parámetros `q`, `numero`, `tipo`, `actividad`, `departamento`, `presupuesto`, `orden`, `etapa` y `pagina` según `filtrosDesdeParams`. Ofrecer campo explícito para número de proceso en filtros avanzados. Las familias invocan los valores ya admitidos por el catálogo. Verificar el mapeo de «Redes y alcantarillado» antes de introducir una agrupación que altere resultados.
- Usar la URL como estado confirmado. Cambiar filtro vuelve a página uno. Atrás, Adelante y recarga reconstruyen la misma vista. Eliminar filtro territorial conserva texto y familia. Validar longitud, enumeraciones, departamento y rango de página del lado servidor. Las consultas usan parámetros y la lógica de escape del repositorio.
- Seleccionar territorio desde mapa o control HTML produce la misma navegación. El resumen muestra departamento, cantidad verificable y acceso a resultados. Clic en marcador agregado selecciona región. Clic en tarjeta abre proceso. Hover puede mostrar nombre sin cambiar consulta. Selección persistente con rótulo, contraste y desplazamiento leve. Una navegación nueva prevalece sobre respuestas anteriores. Mientras carga, mantener contexto e indicar actualización con `aria-live="polite"`.
- Cero resultados es un estado válido con «Limpiar filtros» y salida a la vitrina. Territorio sin correspondencia queda «Sin ubicación disponible» y sigue apareciendo en la consulta nacional. Una región válida sin coincidencias conserva selección y muestra cero. Un slug territorial desconocido produce filtro inválido explícito con opción de retirarlo.

## 6. Mapa 3D integrado

1. Usar la colección MGN 2025 que ya existe. Validar 33 unidades de visualización, Bogotá D. C., insularidad y códigos como cadenas con cero inicial. Usar también la geometría específica de San Andrés, Providencia y Santa Catalina del repo donde corresponda. Citar «DANE — Marco Geoestadístico Nacional 2025». [Servicio DANE](https://portalgis.dane.gov.co/mparcgis/rest/services/MGN2025/Serv_CapasMGN_2025/FeatureServer/319)
2. Reusar proyección local de `src/lib/mapa/proyeccion.ts` o compartir una transformación documentada con 2D. Convertir [longitud, latitud] a coordenadas de escena con norte consistente, límites ajustados y origen centrado. Convertir Polygon y MultiPolygon a shapes, preservando anillos interiores, islas y winding. Extruir con base común. Mantener cada objeto vinculado a su DIVIPOLA. El brillo del límite y el material territorial son decorativos.
3. Cámara ortográfica inicial oblicua, aproximadamente 30–40° desde la vertical. Ajuste al contenedor tras resize, zoom limitado y botón «Restablecer vista». Renderizador con alfa y DPR hasta 1.5. Geometría/materiales estables por montaje. Raycast sólo contra objetos seleccionables y tras pulsación sin arrastre. Posiciones agregadas calculadas con ancla interior validada. Ningún punto representa una obra si sólo se conoce la ubicación de la entidad.
4. Una transición de selección de 180–260 ms y movimiento de cámara de hasta 350 ms, cancelables. Sin giro continuo. Renderizar bajo demanda al cambiar cámara, tamaño, datos o selección. Liberar controles, observadores, RAF, texturas, geometrías y renderer al desmontar. Gestionar pérdida de contexto y carga fallida con mapa 2D.
5. El relieve ilustrativo usa material procedural sobrio o textura genérica inventariada, sin interpretar la lámina como DEM. La iluminación será ambiental y direccional suave. Conservar lectura de límites y evitar una superficie brillante detrás del texto. No introducir teselas remotas, globo ni SDK geográfico cuando el mapa departamental local sea suficiente.
6. Con teclado, móvil, movimiento reducido y WebGL no disponible, ofrecer `ColombiaChoropleth` y selector HTML equivalente. Evitar captura del desplazamiento vertical en touch. Si el canvas está oculto a tecnologías de asistencia, los controles HTML ofrecen selección, limpieza y resultados equivalentes.

## 7. Fichas Vivas

La tarjeta enlaza con un `<Link>` real a `/licitaciones/[slug]` construido mediante los helpers actuales. La ruta canónica mantiene título, referencia, entidad, modalidad, estado, cronograma, valor, ubicación, fuente y enlace SECOP II. Reutilizar los módulos actuales de contratos, pliegos, historial y señales cuando haya datos y permiso. Las señales o análisis editoriales llevan su procedencia. Si falta historial, documento o fecha, aplicar el estado de disponibilidad existente. Evitar presentar recomendaciones o eventos como hechos oficiales. El regreso por historial restaura consulta y desplazamiento. Si se introduce vista previa en panel, conservar el enlace canónico, restaurar foco al cierre, permitir Escape y funcionar en acceso directo a la ficha.

## 8. Accesibilidad, rendimiento y operación

- WCAG 2.2 AA como criterio de aceptación. Contraste 4.5:1 texto normal, 3:1 texto grande y componentes relevantes. Navegación por teclado, foco visible, jerarquía semántica y anuncio de resultados. Los blancos táctiles del hero buscan 44 × 44 px. Botones del carrusel con nombres y estado. Sin autoplay. Fondos con alt vacío y fotos con leyenda visible «Imagen ilustrativa» en cada tarjeta que las use.
- Objetivos propuestos, medidos en previsualización con datos reales y tráfico frío. LCP ≤2.5 s, CLS ≤0.1 e INP ≤200 ms como objetivo de campo p75 tras despliegue. Lighthouse móvil como indicador de laboratorio, tres corridas con mediana, registrar dispositivo y red. Transferencia comprimida del mapa diferido ≤300 KiB de JS incremental y ≤100 KiB de geometría. Si se supera, medir la causa antes de añadir efectos. Imágenes del hero cargan una variante por viewport. Reservar tamaño y usar carga diferida en tarjetas fuera de vista.
- Registrar duración de consultas, error de fuente, frescura, registros sin geografía y fallos WebGL sin volcar tokens ni términos de búsqueda. Verificar que el build no requiera conectarse a la base para prerenderizar esta ruta. En fallo de 3D conservar HTML/2D. La ruta de revisión permite desactivar la exposición quitando el enlace de navegación o mediante el mecanismo de flags existente.

## 9. Secuencia de implementación

1. Auditar rama, reglas del repo, dependencias y consultas existentes. Copiar assets y verificar el manifiesto. Capturar baseline de vitrina, mapa y ficha.
2. Integrar la ruta de revisión y DTO con resultados reales, estados y pruebas de filtros, nulls, IDs repetidos, fecha Colombia y fuentes. Verificar paridad con vitrina para los mismos filtros.
3. Construir composición desktop/móvil y 2D sobre el mismo estado. Revisar boceto a 1440, 1024, 768, 390 y 320 px. Validar foco y contraste.
4. Añadir escena 3D diferida con pruebas de proyección, islas, selección y pérdida de contexto. Comparar visualmente con boceto y revisar el presupuesto de carga.
5. Enlazar fichas, comprobar regreso, ejecutar suite, build y evaluación manual. Entregar capturas, reporte de fuentes, auditoría de dependencias y resultado por criterio.

## 10. Criterios de aceptación

| ID | Comprobación | Evidencia |
| --- | --- | --- |
| A01 | Vista dark premium con la jerarquía aprobada. Mapa continuo con el hero y sin recuadro | Capturas 1440 y 390 px, inspección comparada |
| A02 | Dos registros de agua verificados por ID, referencia, enlace, cuantía y fecha contra SECOP II | Registro de QA fechado con fuente oficial |
| A03 | KPIs reproducibles sobre la consulta completa y sin duplicados. Cero, null y error se distinguen | Consulta de control y prueba de fallos |
| A04 | Buscar por texto, entidad y número. Filtros persistentes y paginación estable | Prueba de recarga y Atrás/Adelante |
| A05 | Valle del Cauca y otra región seleccionables en 3D y 2D. Mismas tarjetas y conteos para ambos caminos | Prueba de ida y vuelta, e islas visibles |
| A06 | Geometría por DIVIPOLA y atribución. Marcadores agregados e imágenes ilustrativas correctamente identificados | Inspección DOM y revisión de mapa |
| A07 | Ficha Viva canónica, enlace SECOP válido y regreso al estado previo | Prueba E2E con proceso real |
| A08 | Listado y selector operativos con WebGL desactivado, pérdida de contexto y movimiento reducido | Prueba de degradación en escritorio y móvil |
| A09 | Sin desbordamiento a 320 px y 200 % de zoom. Orden de foco, contraste y lector de pantalla | Revisión manual y auditoría accesible |
| A10 | Presupuestos medidos y canvas diferido sin bloquear búsqueda | Reporte de red y rendimiento |
| A11 | Licencias, lockfile, avisos y auditoría de dependencias revisados | Informe de revisión y registro de versiones |
| A12 | `npm test`, `npx tsc --noEmit` y `npm run build` ejecutados en la rama final | Salidas de CI y evidencia de previsualización |

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Core Web Vitals](https://web.dev/articles/vitals) · [Three.js WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer)
