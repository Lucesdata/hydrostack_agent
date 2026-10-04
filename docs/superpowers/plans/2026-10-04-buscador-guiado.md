# Buscador guiado — Plan de implementación, primera entrega

> **Para quien ejecute:** usar `superpowers:executing-plans` y ejecutar una tarea
> por vez. No delegar en agentes sin autorización explícita del usuario.

**Estado (2026-10-04):** sección 1 terminada (tareas 1 y 2). Interfaz y cuentas
no iniciadas por instrucción del usuario. Evidencia en
`2026-10-04-buscador-guiado-seccion-1-traspaso.md`.

**Objetivo:** encontrar procesos por sistema y actividad o por número, desde
el hero, con resultados reales y criterios conservados en el explorador.

**Arquitectura:** extender el contrato público de búsqueda existente y sus
consultas sobre Postgres. Añadir un formulario al hero vigente y compartir
criterios con el explorador. Esta entrega no toca datos de cuentas ni esquema.

**Tecnologías:** Next.js 14.2.3, React 18, TypeScript, Drizzle y Postgres de
Supabase; Vitest y PGlite del proyecto. Sin dependencias nuevas.

**Especificación:** `docs/superpowers/specs/2026-10-04-buscador-guiado-design.md`.

## Restricciones globales

- El mapa y las tarjetas vigentes se conservan; el buscador va bajo la frase.
- Los tipos siguen siendo los cinco definidos en `TIPOS_PROYECTO`.
- Actividad es un filtro de texto, no una nueva clasificación persistida.
- Los resultados salen de datos ingeridos, nunca de SECOP en vivo.
- No cambiar paleta, cartografía, rutas de ficha ni ingesta.
- Formularios funcionales sin JavaScript; ninguna confirmación ni cifra ficticia.
- Sin cambios en cuentas, alertas o almacenamiento del navegador en esta entrega.

## Separación de entregas

La segunda entrega incorpora Guardados y Recientes con cuenta gratuita,
siguiendo la especificación. Requiere su propio plan de esquema, permisos y
consultas por usuario antes de implementarla. En la primera entrega hay solo
«Por tema» y «Por número»; no se muestra «Mis procesos» ni botones de Guardar
hasta que funcionen. Las tres entradas son el diseño final acordado.

## Reconocimiento verificado

`HeroTerritorial.jsx` ya no contiene el buscador antiguo. `SecopExplorer.tsx`
lee `q` de la URL solo al montar y busca objeto/entidad. `parse-query.ts`,
`SecopQuery`, la API y `db-search.ts` no admiten sistema, actividad ni número.
La tabla de procesos ya tiene identificador SECOP, referencia, descripción y
tipo de proyecto: no hace falta una migración para buscar.

`cached-db-search.ts` incluye la consulta completa en sus claves. El filtrado
de filas y el conteo comparten `prepare()` en `db-search.ts`. La API actual
cae a Socrata si Postgres falla: en búsqueda guiada esa caída se impedirá para
no entregar resultados que ignoren los filtros nuevos.

## Casos que guían la revisión

1. Una referencia con `%` o `_` busca caracteres literales; no amplía la consulta.
2. Una respuesta anterior llega después de una búsqueda nueva: no la sustituye.
3. Una referencia repetida en dos entidades presenta ambas; no elige una sola.
4. Una vuelta con Atrás restaura criterios, modo y página, también después de editar.
5. Falla Postgres: se muestra error, sin activar búsqueda en vivo ni inventar un vacío.

## Tarea 1 — Contrato y catálogo de búsqueda

**Archivos:** crear `src/lib/secop/busqueda-guiada.ts`; modificar
`src/lib/secop/types.ts`, `src/lib/secop/parse-query.ts`; probar en
`src/__tests__/secop/busqueda-guiada.test.ts` y
`src/__tests__/secop/route-parse.test.ts`.

**Contrato nuevo:** `SecopQuery` recibe `modo?: "tema" | "numero"`,
`sistema?: SistemaBusqueda`, `actividad?: ActividadBusqueda`, `numero?: string`.
El catálogo exporta sus opciones y `tiposDeSistema(sistema)`; los valores de
tipo se referencian desde el catálogo de clasificación actual.

```ts
type SistemaBusqueda = "potable" | "residual" | TipoProyecto;
type ActividadBusqueda = "obras" | "operacion" | "muestreo"
  | "consultoria" | "interventoria" | "suministros";
```

«Todos»/«Todas» equivalen a ausencia de parámetro. Potable agrupa acueducto y
PTAP; residual agrupa alcantarillado y PTAR. Las cuatro entradas específicas
filtran por su tipo persistido. No añadir `otros` a las opciones iniciales.

- [x] Escribir pruebas que fallen: sistema desconocido, actividad desconocida,
  tema+actividad combinados, número vacío y número de más de 120 caracteres.
- [x] Ejecutar `npx vitest run src/__tests__/secop/busqueda-guiada.test.ts src/__tests__/secop/route-parse.test.ts` y comprobar el fallo esperado.
- [x] Añadir el catálogo único y validación: valores desconocidos devuelven 400
  en consultas guiadas; número con `trim()`, máximo 120 caracteres; no mezclar
  número con filtros temáticos. No alterar el comportamiento de consultas viejas.
- [x] Revisar una muestra real de objetos y descripciones para estas raíces de
  actividad: obras (`construcci`, `rehabilit`, `mejoramiento`), operación
  (`operaci`, `mantenim`), muestreo (`muestreo`, `laboratorio`, `calidad del agua`),
  consultoría (`consultor`, `estudios`, `diseños`, `disenos`), interventoría
  (`interventor`), suministros (`suministr`, `adquisici`). Conservar ejemplos
  sanitizados y registrar aciertos y falsos positivos antes de fijar las reglas.
- [x] Probar variantes con tildes/mayúsculas y equivalencias finales mediante
  fixtures reales sanitizados; ejecutar pruebas y guardar el primer commit.

## Tarea 2 — Consultas temáticas y por número

**Archivos:** modificar `src/lib/secop/db-search.ts` y
`app/api/secop/route.ts`; pruebas en `src/__tests__/secop/busqueda-guiada.db.test.ts`,
`src/__tests__/api/secop-route.test.ts`; revisar sin refactorizar
`src/lib/secop/cached-db-search.ts`.

**Interfaces:** `searchProcesosDb(query)` y `countProcesosDb(query)` conservan
sus firmas; los parámetros nuevos se incorporan en `prepare()`. Se añade al
resultado opcional `coincidencia?: "exacta" | "parcial"` cuando modo=numero,
con la misma propiedad opcional en `SecopProceso`.

- [x] Crear fixtures PGlite con migraciones reales: PTAR consultoría,
  PTAR obra, PTAP consultoría, dos entidades con igual referencia y un proceso
  cerrado cuyo identificador no contiene palabras del sector.
- [x] Escribir pruebas y comprobar que fallan antes de extender la consulta.
- [x] En tema, combinar tipo persistido y actividad por objeto/descripción;
  `q` mantiene la búsqueda por objeto/entidad. El hero envía apertura=Abierto.
  Las búsquedas guiadas se apoyan en el universo ya ingerido y no excluyen
  adicionalmente procesos válidos mediante el antiguo filtro sectorial textual.
- [x] En número, buscar identificador y referencia, con igualdad sin distinguir
  mayúsculas primero y coincidencia parcial literal después. No filtrar por
  apertura ni por palabras sectoriales. Escapar los patrones:

  ```ts
  const literalLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
  ```

- [x] Ordenar exactas antes de parciales y usar identificador como desempate
  estable; respetar paginación y contar todo el mismo conjunto. Nunca convertir
  una referencia compartida en una selección automática.
- [x] Añadir a la API la salida 400 por criterios inválidos y 503 por fallo de
  base en modo guiado. Registrar el error en servidor sin publicar detalles
  internos. Mantener la compatibilidad del modo antiguo fuera de este alcance.
- [x] Probar que la API no llama a Socrata en modo guiado, ni ante resultados
  vacíos ni ante error, y que cada combinación tiene clave de caché distinta.
- [x] Ejecutar los tests anteriores y de búsqueda existentes; guardar commit.

## Tarea 3 — Resultados del explorador y alternativa sin JavaScript

**Archivos:** modificar `src/components/secop/SecopExplorer.tsx`,
`app/licitaciones/explorar/page.js`; crear
`src/components/secop/ResultadosBusquedaServidor.tsx` y probarlo en
`src/__tests__/secop/resultados-busqueda.test.tsx`.

**Interfaces:** el explorador recibe `consultaInicial?: SecopQuery` y
`resultadoInicial?: SecopResult<SecopProceso>`. El componente de servidor
recibe el resultado y la consulta para construir fichas y paginación.

- [x] Escribir pruebas con consulta inicial tema y número, y con proceso sin
  presupuesto; la URL de ficha se genera con `slugDeProceso` existente.
- [x] Leer y validar `searchParams` en la página. Las consultas guiadas tienen
  respuesta en servidor; no leer sesión ni mezclar datos personales. Documentar
  el cambio de render de esta ruta en el PR, manteniendo estática la portada.
- [x] Renderizar un formulario GET y resultados en la alternativa sin
  JavaScript, con enlaces paginados que preserven criterios. En caso de fallo,
  mostrar mensaje y enlace para reintentar; no dejar caer la página completa.
- [x] Inicializar el explorador con la consulta y resultado del servidor y
  extender sus filtros; la búsqueda por número no añade apertura=Abierto.
- [x] Sincronizar envíos y paginación con URL y `popstate`; Atrás restaura
  modo, criterios y página. AbortController y un identificador de solicitud
  impiden que respuestas viejas sustituyan resultados actuales.
- [x] Probar Atrás, recarga con filtros, número cerrado y respuesta fuera de
  orden; ejecutar pruebas y guardar commit.

## Tarea 4 — Buscador dentro del hero

**Archivos:** crear
`src/components/landing/hero-territorial/BuscadorGuiado.tsx` y
`buscador-guiado.module.css`; modificar `HeroTerritorial.jsx`; pruebas en
`src/__tests__/landing/buscador-guiado.test.tsx`.

**Interfaz:** `BuscadorGuiado()` sin prop de cuenta. Usa las opciones de
`busqueda-guiada.ts`, consulta `/api/secop` y genera enlaces al explorador.
No cambia procesos del mapa ni las minifichas existentes.

- [x] Escribir pruebas de envío explícito, cambio de entrada que conserva lo
  escrito y enlace «Ver todos los resultados» con criterios completos.
- [x] Añadir Por tema/Por número, etiquetas persistentes, dos desplegables,
  texto opcional y botón «Buscar procesos». Usar formulario GET hacia el
  explorador como comportamiento base; JavaScript añade vista previa.
- [x] La vista previa solicita cinco resultados. Cada fila presenta objeto,
  entidad, estado, presupuesto con `formatValorProceso`, coincidencia por
  número y enlace a ficha; no simular Guardar en esta entrega.
- [x] Distinguir carga, vacío y error; anunciar resultados sin mover el foco.
  Una respuesta de una entrada inactiva no debe aparecer en la activa.
- [x] Adaptar a móvil con campos apilados y ancho completo del botón; medir
  contraste real del tema oscuro y verificar teclado y lector de pantalla.
- [x] Ejecutar pruebas, verificar sin JavaScript y guardar commit.

## Tarea 5 — Validación y revisión de la primera entrega

**Archivos:** documentar alcance en `CLAUDE.md`, actualizar graphify; incluir
el catálogo de actividad verificado y la decisión de render en este plan.

- [ ] Verificar en navegador: PTAR+Consultoría, número exacto, referencia
  compartida, proceso cerrado, vacío, error, Atrás, sin JavaScript y móvil.
- [ ] Con preview detenido, ejecutar `npm test`, `npm run build`,
  `npm run lint` y Prettier sobre extensiones de código compatibles del repo.
  Revisar presupuesto de JavaScript y fuentes con la herramienta existente.
- [ ] Ejecutar `graphify update .`; documentar qué funciona y qué pertenece
  a la segunda entrega. Revisar diff completo sin refactors ajenos.
- [ ] Crear PR contra main con preview verificable y adjuntarlo a la tarea.
  Esperar los cinco checks exigidos por CONDUCTA; no fusionar ni desplegar
  esta nueva funcionalidad sin la autorización correspondiente.

## Segunda entrega — contrato que debe respetar su plan

Guardados será una relación por usuario y proceso, con unicidad e idempotencia.
Recientes tendrá última visita por usuario y proceso y conservará diez fichas.
Las tablas nacen con RLS, capacidades gratis en la política central, y cada
consulta usa el usuario de la sesión, nunca un id proporcionado por el cliente.
Las respuestas de cuenta son privadas y no se mezclan con cachés públicas.
Las visitas se registran al abrir la ficha en el cliente, no desde su página
estática ni por precarga. Cerrar sesión limpia la vista; borrar recientes no
borra guardados. El plan cubrirá intención pendiente al iniciar sesión,
aislamiento entre dos cuentas, concurrencia al guardar/quitar, procesos cerrados
o retirados y fallos de red. Este apartado fija el alcance, no autoriza una
migración ni sustituye el plan específico de esa entrega.
