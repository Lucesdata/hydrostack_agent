# Hero territorial con cinco minifichas — reconocimiento y decisiones

**Fecha:** 2026-10-04 · **Origen:** SDD «Hero Territorial con cinco minifichas»
v1.0 del usuario, con un boceto aprobado (composición y estilo; sus procesos,
cifras, identificadores y geometría son ilustrativos y no se trasladaron).

## 1. Reconocimiento (antes de escribir código)

| Pregunta del SDD | Respuesta en el repositorio |
|---|---|
| Qué construía el hero | `HeroTerritorial.jsx` + `BuscadorFichas`, `ListaTerritorios`, `FichaDepartamento`, `ResumenDepartamento` (tarjeta única vía `/api/departamento/[dpto]/resumen`), `sincronia.js` (departamentos), mapa coroplético `ColombiaChoropleth` alimentado por `agregadosPortada()` en `app/page.js`. |
| Qué se reutiliza | `ColombiaChoropleth` (geometría, proyección, recuadro de San Andrés), `ANCLAS` de `rotulos.ts`, `condicionAbierto()`, `slugDeProceso`/`idDesdeSlug`, `montoConDato`, `COLOR_TIPO`/`FAMILIAS`, `frase`/`titulo`, `FichaViva`, el patrón «mapa de servidor + sincronía por delegación». |
| Qué se sustituye | Buscador, tarjeta única, lista de departamentos, opciones del mapa (colorear por monto/tipo), escala de conteos y enlaces a facetas **solo en este hero**. |
| Consulta de las cinco fichas | Nueva `muestraPortada()` (`src/lib/secop/muestra-portada.ts`): una sola consulta sobre `proceso` ⋈ `geografia` ⟕ `entidad`, sin endpoint nuevo. |
| Identidad del proceso | `proceso.secop_proceso_id` (`CO1.REQ.…`). Es la que resuelve la ficha (`/licitaciones/<slug>--<id>`). |
| Número de proceso | `proceso.referencia` (`referencia_del_proceso` del SECOP), el mismo que la ficha pinta como `fi-identificador`. Texto: se conserva tal cual. |
| Ubicación | `proceso.geografia_id` → `geografia`: departamento siempre; municipio solo si `municipio_nombre` no es nulo (las filas `XX000` son solo departamento). |
| Limitaciones de los datos | Es la **sede de la entidad contratante**, no el lugar de la obra. No hay coordenadas de municipio en la base. Hay procesos sin geografía resuelta y sin `referencia`. El 0 de `valor_estimado` es «sin dato». |

## 2. Decisiones

1. **Sorteo en el servidor, al regenerar la página.** `ORDER BY random() LIMIT 5`
   sobre todo el conjunto elegible (sin tope de candidatos), dentro del ISR de
   6 h de `/`. La selección viaja en el HTML: estable durante la visita, igual
   en servidor e hidratación, sin `Math.random()` en un render. Cambia al
   renovarse la caché, como permite el SDD (§5.3).
2. **Elegibles**: `condicionAbierto()` + `referencia` y objeto no vacíos + id con
   la forma que resuelve la ficha + departamento con anclaje en el mapa. El
   presupuesto no es requisito. Doble puerta: la consulta y el mapeador puro
   `procesoPortadaDesdeFila()`, que excluye y registra lo que se cuele.
3. **Un contrato** (`ProcesoPortada`) para el mapa y las tarjetas. El servidor
   dibuja el mapa con el mismo array que pasa al cliente: no pueden discrepar.
4. **Anclaje departamental.** Sin coordenadas de municipio, un punto en una
   ciudad mentiría (§7.5): el anclaje es el del departamento y la etiqueta del
   mapa dice el **departamento**; el municipio sale en la tarjeta. Ocho
   anclajes de `ANCLAS` caían fuera (Risaralda) o pegados al borde
   (Cundinamarca, a media unidad de Bogotá): el hero usa puntos interiores y un
   test lo exige para los 33.
5. **Coincidencias** (§7.7): un anclaje compartido con etiquetas separadas, en
   dos columnas laterales apiladas sin solaparse. Nadie se desplaza a un lugar
   falso. Un departamento con varias familias se tiñe neutro y su anclaje toma
   la familia del proceso activo.
6. **El fondo del mapa ya no navega.** Los departamentos dejan de ser enlaces
   en este hero (la «decisión D» sigue en otros mapas): la única señal que
   navega es la etiqueta de un proceso, y lleva a su ficha (§8). Además evita
   que el teclado cruce 33 enlaces antes de las tarjetas.
7. **Categorías** = familias de `tipo-color.ts`: Agua potable (acueducto, PTAP),
   Aguas residuales (PTAR), Redes y alcantarillado (alcantarillado). `otros` o
   sin clasificar → «Sin subsistema identificado», contorno punteado, nunca el
   gris lleno de redes. La leyenda la incluye solo si hay alguna así.
8. **Estados**: no hay «cargando» (la selección llega con el HTML). `null` =
   error de consulta («No pudimos cargar los procesos. Inténtalo de nuevo.»);
   `[]` = sin candidatos. En ambos el mapa sale base, sin señales. Sin botón de
   reintento: no hay endpoint que volver a pedir (PENDIENTES §53).
9. **Composición**: rejilla de cinco zonas — mensaje · mapa / título ·
   leyenda / tarjetas — con la leyenda en la franja del título como el boceto.
   El mapa toma `100vh − 455 px` (330–560 px) para que a 1440×900 y 1280×800 se
   vean las cinco tarjetas enteras. Bajo 1200 px, fila desplazable con ajuste;
   bajo 900 px, una columna; bajo 600 px, sin etiquetas en el mapa y una línea
   con el proceso activo (en táctil, la tarjeta a la vista).
10. **La franja de la ficha** enlaza el primer proceso del hero, fijo.

## 3. Verificación

- `npx vitest run`: 150 archivos, 1274 pruebas. Nuevas: contrato y formatos,
  colocación de etiquetas y anclajes interiores, mapa en modo selección,
  sincronía, hero, portada, contraste del tema oscuro y la consulta contra
  PGlite con las migraciones reales (elegibilidad, aleatoriedad, menos de cinco).
- `next lint`, `tsc --noEmit`, `next build`, Prettier y `npm run presupuesto`
  (105,6 kB gzip de JS de primera carga en `/`).
- Chromium a 1440×900, 1280×800, 1024×768, 768×1024, 390×844 y 360×800 con
  procesos ficticios (no hay base en el entorno): sin desbordamiento horizontal,
  sin errores de hidratación, resaltado recíproco con puntero, foco y
  desplazamiento táctil; escenarios de cinco en un departamento, dos, vacío,
  error, San Andrés y referencias/entidades largas.
