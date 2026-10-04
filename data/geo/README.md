# Geometría del mapa departamental

`departamentos.geo.json` — los 33 departamentos de Colombia para la coropleta
de la portada. Contrato, presupuesto y criterios de aceptación en
[`docs/rediseno-2026-09/SPEC-GEOMETRIA-MAPA.md`](../../docs/rediseno-2026-09/SPEC-GEOMETRIA-MAPA.md);
lo vigila `src/__tests__/geo/departamentos.test.ts`.

## Procedencia

| | |
|---|---|
| Fuente | DANE — Marco Geoestadístico Nacional (MGN) 2025, nivel Departamento |
| Servicio | `portalgis.dane.gov.co/mparcgis/rest/services/MGN2025/Serv_CapasMGN_2025/FeatureServer/319` |
| Descargado | 2026-09-22 |
| Original | 33 polígonos, 1.079.402 coordenadas, 21,6 MB |
| Publicado aquí | 33 polígonos, **1.973 coordenadas, 33 kB** |

Dato abierto del DANE. Al pintarlo, la página atribuye: **DANE — Marco
Geoestadístico Nacional 2025**.

## Cómo se regenera

```bash
# 1 · descarga (OJO: `where=1=1` lo bloquea el WAF del DANE; usar OBJECTID>0)
curl -sS -G "https://portalgis.dane.gov.co/mparcgis/rest/services/MGN2025/Serv_CapasMGN_2025/FeatureServer/319/query" \
  --data-urlencode "where=OBJECTID>0" \
  --data-urlencode "outFields=DPTO_CCDGO,DPTO_CNMBRE" \
  --data-urlencode "returnGeometry=true" \
  --data-urlencode "outSR=4326" \
  --data-urlencode "geometryPrecision=5" \
  --data-urlencode "f=geojson" -o dpto_full.json

# 2 · simplificación con topología (mapshaper por npx, no es dependencia del repo)
npx -y mapshaper@0.6.102 dpto_full.json \
  -filter-islands min-area=3km2 \
  -rename-fields dpto=DPTO_CCDGO,nombre=DPTO_CNMBRE \
  -filter-fields dpto,nombre \
  -simplify 0.16% keep-shapes \
  -clean \
  -o precision=0.005 format=geojson departamentos.geo.json
```

Después se ordenan las features por `dpto` y se serializa compacto, para que un
cambio de versión del MGN produzca un diff legible.

## Por qué tan simplificado

Porque los caminos se pagan **dos veces**. El SVG se dibuja en servidor, así que
este archivo nunca viaja al navegador; lo que viaja son los `d` de 33 `path`
dentro del HTML — y Next los repite en el payload RSC que inyecta para hidratar
(`self.__next_f`). Es el peaje del App Router: `/nosotros` y `/precios` también
lo pagan.

Medido sobre el build de producción, con el mapa en el hero de la portada:

| Geometría | HTML de la portada (gzip) |
|---|---:|
| sin mapa (producción hoy) | 14,4 kB |
| 3.740 coordenadas | 50,2 kB — 3,5× |
| **1.973 coordenadas** | **35,1 kB** — 2,4× |

A 300 px de ancho, que es como se pinta en el hero, las dos geometrías son
**indistinguibles**. El detalle de más se paga entero y no se ve.

## Tres trampas, por si hay que repetirlo

1. **`min-area=3km2`, no 50.** San Andrés mide ~26 km² y Providencia ~17: un
   umbral de 50 km² **borra el departamento 88 entero**. A 3 km² sobreviven las
   dos islas y se van los cayos diminutos y las islas de río.
2. **El código es texto.** `DPTO_CCDGO` vale `"05"`, `"08"`. Si en algún paso se
   convierte a número, Antioquia y Atlántico dejan de cruzar con
   `geografia.departamento_codigo` y no se pintan, sin error.
3. **El WAF del DANE bloquea `where=1=1`** con un "Web Page Blocked" en HTML —
   parece un fallo de red y no lo es. `where=OBJECTID>0` pasa.

## Lo que este archivo no trae

Ni municipios, ni los cayos lejanos del archipiélago (Serranilla, Bajo Nuevo,
Roncador, Quitasueño), ni Malpelo: el MGN departamental ya no los incluye, así
que el encuadre sale limpio. Comprobado — bbox continental
`lon [-79,007, -66,854]`, `lat [-4,220, 12,440]`; con San Andrés, `lon` baja a
`-81,736` y `lat` sube a `13,378`.

## San Andrés y Providencia en detalle (`san-andres-providencia.geo.json`)

La simplificación de arriba deja San Andrés en 5 puntos y Providencia en una
línea sin área: a escala del país no se ven, pero en el recuadro de islas del
hero (2026-10-04) se veían como una astilla. Este archivo trae solo las dos
costas, con detalle, para ese recuadro.

| | |
|---|---|
| Fuente | geoBoundaries, COL ADM2 (CC BY 4.0), simplificado |
| Tomado de | `@john-guerra/geo-colombia@0.1.0` (MIT), `src/sanAndresProvidencia.json` |
| Contenido | San Andrés (DANE 88001, 74 puntos) y Providencia + Santa Catalina (88564, 60 + 18 puntos), lon/lat |
| Tamaño | 3,4 kB; no es dependencia del repo, solo este archivo |

CC BY 4.0 exige atribución: el hero la pinta bajo la leyenda del mapa.
