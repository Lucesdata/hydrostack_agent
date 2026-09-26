# Brief: el mapa departamental y el hero de la portada

**Fecha:** 2026-09-22 · **Para:** la sesión que retome el rediseño de la portada

Este documento existe para que alguien que llega sin contexto pueda hacer el
trabajo sin volver a medir lo ya medido ni rediscutir lo ya decidido. Léelo
entero antes de tocar nada.

---

## 1. Qué hay que construir

El **hero de la portada con un mapa coroplético de Colombia**, y después montar
en la portada la vitrina de fichas que ya existe. Es lo único que queda del
rediseño de septiembre.

Hoy la portada tiene el hero con la columna de texto a 645 px y **la mitad
derecha vacía**: ese hueco es el del mapa. La ilustración de la planta que lo
ocupaba se retiró el 2026-09-21 y vive ahora solo en `/nosotros`.

## 2. Lo único que bloquea: el archivo de geometría

**No hay geometría en el repositorio.** `data/dane/divipola.ts` es un crosswalk
de nombres y códigos, sin polígonos, y `public/` solo tiene un PNG. Hasta que
llegue el archivo, el hero no se puede construir — y montar un hero provisional
significa diseñarlo dos veces.

**Contrato que espera el código:**

- TopoJSON o GeoJSON de las **33 unidades**: 32 departamentos más Bogotá D.C.,
  que va independiente de Cundinamarca y nunca fusionada ni como punto.
- Cada geometría lleva el **código DIVIPOLA de dos dígitos** como propiedad. Es
  la llave que une con `geografia.departamento_codigo`, que es lo que devuelve
  `procesosPorDepartamento()`. Si el archivo solo trae nombres, hay que
  slugificarlos y cruzarlos con `slugificar()` — funciona, pero es más frágil.
- Fuente oficial, preferentemente **DANE · MGN**. La fuente, la fecha y la
  licencia se documentan.
- El archivo fuente se guarda **fuera de `public/`** (p. ej.
  `data/cartografia/colombia-departamentos.topojson`), porque no se sirve al
  navegador.

## 3. Datos ya medidos — no los vuelvas a medir

Todo esto está verificado contra la base viva el 2026-09-21 y el 2026-09-22.

| Dato | Valor |
|---|---:|
| Procesos abiertos | 35.518 |
| Con geografía resuelta | 29.840 (84,0 %) |
| Sin ubicación (`unlocated`) | 5.678 |
| Departamentos en `geografia` | 33, con Bogotá `11` y San Andrés `88` |
| Municipios distintos entre los abiertos localizados | **91**, de ~1.122 |

Reparto de cabeza: Antioquia 5.155 · Cundinamarca 3.357 · Bogotá D.C. 2.658 ·
Valle del Cauca 2.346 · Caldas 1.747 · Santander 1.709.

La comprobación de coherencia cuadra exacta: **29.840 + 5.678 = 35.518**.
Conviértela en test, no en revisión visual.

**La base territorial es la ubicación de la ENTIDAD, no la de ejecución.**
Verificado sobre las 59 columnas del dataset de origen (`p6dx-8zbt`): solo trae
`departamento_entidad`, `ciudad_entidad`, `ciudad_de_la_unidad_de`,
`departamento_proveedor` y `ciudad_proveedor`. No existe la ubicación de
ejecución, así que `locationBasis` es `'entidad'` siempre y **la leyenda tiene
que decirlo** — no como nota al pie, sino porque define lo que se está viendo:
dónde tiene su sede quien contrata, no dónde se hará la obra.

Con 91 municipios de ~1.122, **el mapa se queda a nivel de departamento**. A
nivel municipal no sería un mapa, sería un artefacto de la sede.

## 4. Lo que ya existe y hay que componer, no reescribir

| Pieza | Dónde |
|---|---|
| Agregado por departamento, una sola consulta | `procesosPorDepartamento()` en `src/lib/secop/agregados.ts` |
| Definición única de "abierto" | `condicionAbierto()`, mismo archivo. **Impórtala** |
| Nombre → código DIVIPOLA | `geografia` + `geografia_alias` + `slugificar()` |
| Rutas facetadas por departamento | `/licitaciones/departamento/[slug]`, ya indexadas y paginadas |
| La vitrina y la tarjeta | `src/components/secop/vitrina/`, `src/components/secop/ficha-card/` |
| Semáforo | `src/lib/secop/semaforo.ts` + `src/components/secop/semaforo/` |

**No hace falta crear una tabla territorial de 33 entradas**: ya existe en
`geografia`. Lo que falta es exponerla.

## 5. Decisiones cerradas — no las rediscutas

Las once del 2026-09-21 están en `docs/rediseno-2026-09/AUDITORIA-SPECS-LANDING-MAPA.md`
§9, con el porqué de cada una. Las que más te afectan:

- **El clic en el mapa NO filtra la portada: navega** a
  `/licitaciones/departamento/[slug]`, que ya existe, está prerrenderizada e
  indexada. Sigue siendo un clic hasta la lista y dos hasta la ficha.
- **Ninguna ruta pública lee `searchParams`.** Vuelve la ruta dinámica y cada
  visita pasa a ser una invocación facturable.
- **Cero dependencias cartográficas nuevas en producción.** Nada de D3, Leaflet,
  Mapbox, ArcGIS ni `topojson-client`. El SVG se dibuja desde los paths
  precalculados en build. Una librería de mapas cuesta 40–150 kB sobre una
  portada que está en **113 kB de First Load JS**, y el criterio de aceptación
  dice que el rendimiento móvil no baja.
- **Los paths se generan en build**, se versionan, y el archivo generado no pasa
  de **150 kB** sin comprimir. La simplificación se hace una vez, fuera del
  proyecto, y se documenta el comando exacto.
- **No se tocan los tokens de color.** `--bg #FAFAF7`, `--accent #0369A1`, y los
  colores de estado en el escalón -700. `src/__tests__/design/contraste.test.ts`
  lee los tokens reales y falla si el contraste baja. Cualquier color nuevo se
  mide antes: el 2026-09-22 dos pastillas nuevas se colaron a 4,27:1 y hubo que
  bajarlas al tinte del 7 %.

## 6. Trampas que ya mordieron

- **El build no puede leer `DATABASE_URL`**: está marcada como secreta en Vercel
  y las variables sensibles solo llegan al runtime. Cualquier ruta **sin
  segmento dinámico** que consulte la base **falla en el build** con
  `TypeError: Invalid URL`. Por eso `/licitaciones` y `/licitaciones/adjudicados`
  son `force-dynamic`, y por eso las rutas dinámicas llevan
  `generateStaticParams` devolviendo `[]`. Si montas la vitrina en la portada,
  `app/page.js` hereda ese problema: piénsalo antes, no después.
- **El pooler está en modo transacción** desde el 2026-09-22 (`PENDIENTES.md`
  §40). Antes estaba en modo sesión con 15 plazas y una ruta dinámica bastó para
  tumbar producción entera. Ya no, pero una ruta dinámica sigue costando una
  invocación por visita.
- **Nunca `npm run build` con el servidor de desarrollo levantado**: la build
  pisa `.next` y la página sale en negro con "Cannot find module
  ./vendor-chunks". Parar el preview, `rm -rf .next`, y entonces construir.
- **Las capturas del navegador salen negras si el panel está oculto.** Verifica
  por DOM (`read_page`, `javascript_tool`) cuando pase.
- **La verificación local corre contra otro driver que producción**:
  `.env.local` tiene `DB_DRIVER=node` y producción usa el driver serverless de
  Neon (`PENDIENTES.md` §41). Ninguna prueba local ejerce el camino real.
- **El build depende de que Google Fonts responda** (`PENDIENTES.md` §42). Si
  `lint` cae con un error de `next/font`, relanzar el job resuelve; no es tu
  cambio.
- **Todo entra por Pull Request, también la documentación.** `main` despliega a
  producción con cada push. La regla está en `docs/CONDUCTA.md`.

## 7. Orden sugerido

1. El archivo de geometría, con su fuente y licencia documentadas en
   `docs/cartografia.md`.
2. Script de conversión TopoJSON → paths SVG, sin dependencias, que corre una
   vez y cuyo resultado se versiona.
3. Validar: 33 unidades, códigos únicos, Bogotá y San Andrés presentes, ≤150 kB.
4. Adaptador de datos sobre `procesosPorDepartamento()`, devolviendo las 33
   unidades con `0` donde no hay procesos, más `unlocated`.
5. `ColombiaChoropleth`: coropleta por cuantiles con el 0 diferenciado, leyenda
   con los límites reales y la base territorial, hover, foco y selección por
   teclado. El componente emite un código DIVIPOLA y nada más.
6. El hero: 5/12 de mensaje y 7/12 de mapa, con la columna de texto conservando
   su medida actual.
7. Montar la vitrina como sección de la portada y retirar las secciones viejas
   de `app/page.js`.

## 8. Qué leer, en este orden

1. `CLAUDE.md` — dominio, seguridad y decisiones de diseño medidas.
2. `docs/CONDUCTA.md` — cómo se trabaja en este repo.
3. `docs/rediseno-2026-09/TRASPASO.md` — estado del rediseño, decisiones que no
   hay que deshacer, trampas del entorno, coste del ISR y línea base de peso.
4. `docs/rediseno-2026-09/AUDITORIA-SPECS-LANDING-MAPA.md` — las once decisiones
   con su porqué medido.
5. `PENDIENTES.md` §40, §41 y §42.
