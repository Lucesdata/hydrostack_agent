# Spec del archivo de geometría — mapa departamental de la portada

**Estado: cerrado el 2026-09-22.** El archivo está en
`data/geo/departamentos.geo.json`, con su procedencia en `data/geo/README.md` y
su guardia en `src/__tests__/geo/departamentos.test.ts`. Era el punto E de
`AUDITORIA-SPECS-LANDING-MAPA.md` §9.2 y lo único que bloqueaba `app/page.js`
entero (`TRASPASO.md` §2 y §7, punto 6). Lo producido y lo que costó, en el §11.

Este documento no decide nada nuevo: **formula** lo que ya se decidió el
2026-09-15 y el 2026-09-21, con el detalle suficiente para que el archivo se
pueda producir, revisar y aceptar sin volver a preguntar. El §10 es el prompt
listo para pegar.

---

## 1. Qué se necesita, en una frase

Un archivo de límites **departamentales** de Colombia —33 geometrías— donde
cada una lleve el **código DIVIPOLA de dos dígitos como cadena de texto**, para
dibujar una coropleta en SVG **sin librería de mapas**.

No hace falta nada más: ni municipios, ni coordenadas de puntos, ni capitales.
La decisión de coropleta sin marcadores se tomó porque `geografia` no tiene
coordenadas y solo cubre 62 de los ~1.122 municipios; a nivel municipal, los
91 municipios con procesos abiertos no son un mapa, son un artefacto de dónde
está la sede de quien contrata.

---

## 2. Contrato del archivo

| Punto | Valor exigido |
|---|---|
| Formato | **GeoJSON `FeatureCollection`** o **TopoJSON cuantizado**. Los dos valen (ver §2.1) |
| Ruta en el repo | `data/geo/departamentos.geo.json` (o `.topo.json`) |
| CRS | **EPSG:4326 (WGS84), grados decimales, orden `[lon, lat]`** — sin proyectar |
| Geometrías | **33**, ni una más ni una menos. `Polygon` o `MultiPolygon` |
| Propiedad obligatoria | `properties.dpto` — **string** de 2 caracteres, con cero a la izquierda |
| Propiedad informativa | `properties.nombre` — nombre DANE, solo para depurar |
| Precisión | coordenadas redondeadas a **3 decimales** (~110 m) |
| Peso | **≤ 2.500 coordenadas en total** y **≤ 150 kB** el archivo crudo (ver §5) |
| Topología | sin huecos ni solapes entre departamentos vecinos |

### 2.1 GeoJSON o TopoJSON, y por qué da igual ahora

La decisión del 2026-09-15 decía "TopoJSON". Sigue siendo válida, pero conviene
saber que **el archivo nunca viaja al navegador**: el mapa se dibuja como SVG en
un componente de servidor, así que al cliente solo le llegan los `path`. El
ahorro de red de TopoJSON, que es su razón de ser, aquí no compra nada.

- **GeoJSON**: se importa y se usa. Cero código de decodificación.
- **TopoJSON**: hay que deshacer la cuantización antes de proyectar. Son ~40
  líneas propias; **no se añade `topojson-client`** — la portada está en 113 kB
  y la decisión G del 2026-09-21 es cero dependencias nuevas en su ruta crítica.

Quien produzca el archivo elige. Si sale de mapshaper, la topología se preserva
en los dos formatos, que es lo que importa de verdad.

### 2.2 El código va como texto — esto rompe el mapa si se ignora

`geografia.departamento_codigo` es `text` y vale `"05"`, `"08"`, `"11"`…
`procesosPorDepartamento()` devuelve esa cadena como `clave`, y es la **única**
llave del cruce.

Si el código viaja como `id` numérico de GeoJSON/TopoJSON, `"05"` se convierte
en `5` y `"08"` en `8`: **Antioquia y Atlántico —el primer y uno de los mayores
departamentos por procesos abiertos— quedan sin pintar**, en silencio, sin
error. Por eso el contrato pide `properties.dpto` como string y no `id`. Si el
archivo trae además un `id`, se ignora.

Fallback si el archivo solo trae nombres: se slugifican con `slugificar()` y se
cruzan por nombre. Funciona, pero es frágil ante tildes y "Bogotá D.C." — se
acepta solo como último recurso y se documenta en el PR.

---

## 3. Las 33 filas exactas

Salen de `data/dane/divipola.ts` (`DEPARTAMENTOS`), que es la semilla de
`geografia`. El **slug** es el destino del clic —decisión D del 2026-09-21: el
mapa navega a `/licitaciones/departamento/[slug]`— y lo calcula el código con
`slugificar()` sobre el nombre de la base, **no viene en el archivo**.

| `dpto` | Nombre DANE | Slug de destino |
|---|---|---|
| `05` | Antioquia | `antioquia` |
| `08` | Atlántico | `atlantico` |
| `11` | Bogotá D.C. | `bogota-d-c` |
| `13` | Bolívar | `bolivar` |
| `15` | Boyacá | `boyaca` |
| `17` | Caldas | `caldas` |
| `18` | Caquetá | `caqueta` |
| `19` | Cauca | `cauca` |
| `20` | Cesar | `cesar` |
| `23` | Córdoba | `cordoba` |
| `25` | Cundinamarca | `cundinamarca` |
| `27` | Chocó | `choco` |
| `41` | Huila | `huila` |
| `44` | La Guajira | `la-guajira` |
| `47` | Magdalena | `magdalena` |
| `50` | Meta | `meta` |
| `52` | Nariño | `narino` |
| `54` | Norte de Santander | `norte-de-santander` |
| `63` | Quindío | `quindio` |
| `66` | Risaralda | `risaralda` |
| `68` | Santander | `santander` |
| `70` | Sucre | `sucre` |
| `73` | Tolima | `tolima` |
| `76` | Valle del Cauca | `valle-del-cauca` |
| `81` | Arauca | `arauca` |
| `85` | Casanare | `casanare` |
| `86` | Putumayo | `putumayo` |
| `88` | Archipiélago de San Andrés… | `archipielago-de-san-andres-providencia-y-santa-catalina` |
| `91` | Amazonas | `amazonas` |
| `94` | Guainía | `guainia` |
| `95` | Guaviare | `guaviare` |
| `97` | Vaupés | `vaupes` |
| `99` | Vichada | `vichada` |

**Bogotá D.C. (`11`) es un departamento aquí**, no un municipio de
Cundinamarca: es el tercero por procesos abiertos (2.658) y tiene que ser
clicable por separado. Si el archivo lo trae como polígono dentro de
Cundinamarca, hay que separarlo.

**Los 33 van aunque tengan cero procesos.** El agregado devuelve solo los
departamentos con procesos abiertos; los que falten se pintan con el tono de
"sin procesos", no se omiten. Un mapa con agujeros se lee como un error de
carga.

---

## 4. Lo que el archivo NO debe traer

1. **Municipios.** Ni como capa aparte ni como geometría más fina.
2. **Los cayos lejanos del archipiélago** (Serranilla, Bajo Nuevo, Roncador,
   Quitasueño) **ni Malpelo**, que pertenece a Valle del Cauca. Están a cientos
   de kilómetros del continente y a más de 15° N: si alguien ajusta el `viewBox`
   al extremo de los datos —que es lo natural— el país queda en una esquina y
   más de la mitad del mapa es mar vacío. Se recortan en origen.
3. **Atributos del MGN** (`AREA`, `PERIMETRO`, `VERSION`, `SHAPE_LEN`…). Solo
   `dpto` y `nombre`.
4. **Geometrías de más de un nivel** mezcladas en el mismo archivo.

San Andrés (`88`) **sí** va: es un departamento con ruta propia. Cómo se pinta
—recuadro aparte, no a escala real a 400 km de la costa— es decisión del
renderizado, no del archivo.

---

## 5. Dónde se paga el peso de verdad

Esto es lo que conviene tener delante al elegir la tolerancia de simplificación.

La portada mide hoy **113 kB de JS** y **91 kB de HTML**, y el criterio de
aceptación del rediseño es no empeorarla. Como el SVG se dibuja en el servidor:

- **El archivo fuente no llega al navegador.** Sus 150 kB son coste de repo y
  de build, no de red.
- **Lo que sí viaja son los atributos `d` de 33 `path` dentro del HTML.** Ese es
  el presupuesto real.

Y se pagan **dos veces**: una en el HTML servido y otra en el payload RSC que
Next inyecta para hidratar (`self.__next_f`). Es el peaje del App Router, no
algo que introduzca el mapa: `/nosotros` y `/precios` también lo pagan.

Medido sobre el build de producción, con el mapa ya en el hero:

| Geometría | HTML de la portada (gzip) |
|---|---:|
| sin mapa (producción hoy) | 14,4 kB |
| 3.740 coordenadas | 50,2 kB — 3,5× |
| **1.973 coordenadas** | **35,1 kB** — 2,4× |

A 300 px de ancho las dos geometrías son indistinguibles, así que el detalle de
más se paga entero y no se ve. Sobre 91 kB de HTML es asumible; el doble no lo es.
De ahí el tope del §2. Un hero de ~520 px de ancho cubre los ~12,2° de longitud
del continente, o sea **1 px ≈ 2,6 km** (y ~3 km si manda el alto, que son 16,7°
de latitud): por debajo de ~1 km de detalle no se ve nada y solo pesa.

---

## 6. Cómo producirlo

**Fuente usada:** DANE — Marco Geoestadístico Nacional **2025**, nivel
Departamento, servido por el propio DANE como servicio ArcGIS:

```
portalgis.dane.gov.co/mparcgis/rest/services/MGN2025/Serv_CapasMGN_2025/FeatureServer/319
```

Devuelve GeoJSON directamente (`f=geojson`) con los atributos `DPTO_CCDGO`
—el código de dos dígitos, ya como texto— y `DPTO_CNMBRE`. **Ojo al nombre: es
`DPTO_CNMBRE`, no `DPTO_CNMBR`**, que es como aparece en la documentación de
versiones anteriores del MGN.

**Descartada: GADM.** Su licencia prohíbe el uso comercial, y esto es un
producto. Natural Earth (dominio público) sirve de emergencia, pero no trae
DIVIPOLA: habría que mapear los 33 códigos a mano, que es justo el trabajo
frágil que el §2.2 intenta evitar.

El comando exacto de descarga y de simplificación está en `data/geo/README.md`,
junto con las tres trampas que costaron un intento cada una:

1. **El WAF del DANE bloquea `where=1=1`.** Devuelve un "Web Page Blocked" en
   HTML que parece un fallo de red. `where=OBJECTID>0` pasa sin problema.
2. **`-filter-islands min-area=50km2` borra el departamento 88 entero.** San
   Andrés mide ~26 km² y Providencia ~17. El umbral correcto es **3 km²**: deja
   las dos islas y se lleva los cayos diminutos y las islas de río, que son las
   que engordan el archivo (Bolívar llega con 50 partes y Valle con 31).
3. **Simplificar preservando topología no es opcional.** mapshaper lo hace por
   defecto; se comprobó midiendo que el **66 % de los vértices del archivo final
   lo comparten dos departamentos**, o sea que las fronteras siguen encajando y
   no hay rendijas blancas entre vecinos.

## 7. Criterios de aceptación

Se escriben como test (`src/__tests__/geo/departamentos.test.ts`) y no como
lista de revisión a ojo — es el patrón del repo: la decisión la vigila una
prueba. El archivo se acepta cuando pasan las ocho:

1. El archivo parsea y tiene **exactamente 33** geometrías.
2. El conjunto de `properties.dpto` es **idéntico** al de `DEPARTAMENTOS` en
   `data/dane/divipola.ts` — ni sobra ni falta ninguno.
3. Todo `dpto` es `string`, longitud 2, y `"05"` y `"08"` conservan el cero.
4. Toda geometría es `Polygon` o `MultiPolygon` y tiene al menos un anillo con
   ≥ 4 posiciones.
5. Toda coordenada cae en `lon ∈ [-82, -66]`, `lat ∈ [-4.5, 13.6]`.
6. La suma de coordenadas de todos los anillos es **≤ 4.000**.
7. `11` (Bogotá D.C.) y `88` (San Andrés) existen como geometrías propias.
8. El archivo pesa ≤ 150 kB.

El test lee el archivo real; **no** toca la base. Cruzar contra
`procesosPorDepartamento()` en un test lo ataría a que Supabase responda en CI,
y el crosswalk DANE ya es la semilla de esa tabla.

---

## 8. Qué desbloquea

Con el archivo dentro, se puede construir en este orden:

1. `ColombiaChoropleth` — proyección propia (equirrectangular corregida por
   `cos(lat₀)`, ~15 líneas, 0 dependencias), `viewBox` a partir de un bbox
   **declarado** y no del extremo de los datos, escala de color sobre
   `--accent`, recuadro aparte para `88`.
2. El cruce con `procesosPorDepartamento()` por `dpto` → `clave`.
3. El clic → `/licitaciones/departamento/${slugificar(label)}` (decisión D).
4. El hero 5/12 mensaje + 7/12 mapa, la banda de métricas y la vitrina — o sea,
   `app/page.js` entero.

La leyenda **"Según ubicación de la entidad contratante"** no es una nota al
pie: es la definición de lo que se está viendo (§1.1 de la auditoría). Va
visible, no en un tooltip. Y los 5.678 procesos sin geografía resuelta (16,0 %)
se enuncian fuera del mapa como `unlocated`; no se reparten entre
departamentos.

---

## 9. Lo que este spec deja sin decidir

- **Cómo se pinta San Andrés**: recuadro con escala propia, o punto fuera de
  escala. Es decisión de renderizado y se toma con el mapa ya dibujado.
- **La escala de color**: cuántos escalones y si es por cuantiles o por rangos
  fijos. Antioquia tiene 5.155 abiertos y la cola larga baja de 100; una escala
  lineal deja 25 departamentos del mismo tono. Se decide midiendo, y el color
  que salga **se mide contra AA** con `src/__tests__/design/contraste.test.ts`
  antes de entrar.

---

## 10. Prompt listo para pegar

Para encargar el archivo a un tercero o a otra herramienta:

> Necesito un archivo **GeoJSON** (`FeatureCollection`) con los límites de los
> **33 departamentos de Colombia**, con estas condiciones exactas:
>
> 1. **CRS EPSG:4326** (WGS84), coordenadas en grados decimales, orden
>    `[lon, lat]`, **sin proyectar**.
> 2. Cada `Feature` con `properties.dpto` = **código DIVIPOLA de 2 dígitos como
>    cadena de texto**, conservando el cero a la izquierda (`"05"` Antioquia,
>    `"08"` Atlántico). El código NO debe ir como `id` numérico. Además
>    `properties.nombre` con el nombre DANE. Ningún otro atributo.
> 3. **Exactamente 33 geometrías**, incluidas **Bogotá D.C. (`11`) como
>    departamento propio**, separada de Cundinamarca, y **San Andrés (`88`)**.
> 4. **Sin municipios.** Solo nivel departamental.
> 5. **Recortar** los cayos lejanos del archipiélago (Serranilla, Bajo Nuevo,
>    Roncador, Quitasueño) y la isla de Malpelo: deforman el encuadre. San
>    Andrés y Providencia sí se conservan.
> 6. **Simplificado preservando la topología**, sin huecos ni solapes entre
>    departamentos vecinos y sin que desaparezca ningún departamento pequeño.
>    Objetivo: **máximo 4.000 coordenadas en total** y **máximo 150 kB**.
> 7. Coordenadas redondeadas a **3 decimales**.
> 8. Fuente preferida: **DANE — Marco Geoestadístico Nacional (MGN)**, capa
>    departamental. **No usar GADM** (licencia no comercial). Indicar fuente,
>    versión y fecha de descarga.
>
> Se usará para dibujar una coropleta en SVG renderizada en servidor, sin
> librería de mapas.

---

*Referencias: `TRASPASO.md` §2 (el bloqueo) y §6 (presupuesto de peso);
`AUDITORIA-SPECS-LANDING-MAPA.md` §1.1 (reparto real), §5 (lo que ya existe),
§9.1-D (el clic navega) y §9.2-E (este archivo);
`src/lib/secop/agregados.ts` (`procesosPorDepartamento`, `slugificar`);
`data/dane/divipola.ts` (los 33 códigos).*

---

## 11. Lo que se produjo — 2026-09-22

`data/geo/departamentos.geo.json`, generado desde el MGN 2025 del DANE. Cumple
el contrato del §2 y los ocho criterios del §7, que pasan como test.

| | Original del DANE | Publicado |
|---|---:|---:|
| Geometrías | 33 | **33** |
| Coordenadas | 1.079.402 | **1.973** (tope: 2.500) |
| Tamaño | 21,6 MB | **33 kB** (tope: 150 kB) |
| Partes (polígonos sueltos) | 118 | 55 |

**Los 33 códigos coinciden exactamente** con `DEPARTAMENTOS` de
`data/dane/divipola.ts` — la semilla de `geografia`—, así que el cruce por
`dpto` → `clave` de `procesosPorDepartamento()` no tiene huecos por ninguno de
los dos lados.

### Se miró, no solo se midió

Se dibujó el SVG con una proyección Mercator de doce líneas y se abrió la
imagen. Tres cosas que solo se ven mirando:

1. **El país se reconoce** a 420×520: la península de La Guajira, el trapecio
   amazónico y la costa pacífica siguen ahí después de tirar el 99,8 % de los
   vértices. No hay rendijas entre departamentos.
2. **La primera estimación de peso se quedó corta y hubo que rehacerla.** Contaba
   una sola copia de los caminos, y el App Router los manda dos veces. Con la
   medida real delante, la geometría bajó de 3.740 coordenadas a 1.973 — ver §5.
3. **El recuadro de San Andrés necesita su propia escala.** Con las dos islas
   dentro de una caja de 58×68 px salen dos puntos de un píxel: están a 90 km
   una de otra y el mar se come el recuadro. O se dibuja solo San Andrés, o el
   departamento 88 se representa con un marcador etiquetado. Queda como la
   decisión de renderizado del §9, ahora con la evidencia delante.

### Lo que el archivo NO resuelve

El mapa sigue sin existir: esto desbloquea el §8, no lo ejecuta. Y la decisión
de la escala de color sigue abierta —Antioquia tiene 5.155 abiertos y la cola
larga baja de 100—, con la regla de siempre: el color que salga **se mide contra
AA** antes de entrar.
