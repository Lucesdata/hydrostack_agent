# Contrato del modelo 3D de la planta

La escena (recorrido del lote, resaltado, marcadores, giro del tromel) **no depende de cómo se ve el modelo**, solo de unos nombres de nodo. Si un `.glb` los cumple, sustituye a la planta simplificada sin tocar más código. Si no los cumple, la página usa la planta de respaldo y explica en consola qué falta.

Plantilla viva de este contrato: `assets/ejemplo-contrato.glb` (se regenera con `herramientas/exportar-contrato.html`). Ábrela en Blender o en cualquier visor glTF para ver los nombres.

## 1. Formato

- **glTF binario `.glb`**, una sola escena. Sin cámaras ni luces (la página pone las suyas).
- **Unidades: metros. Eje Y arriba.** Origen en el suelo, en el centro de la planta.
- **El eje del tromel va a lo largo de X.** La alimentación (tolva) queda a la izquierda (−X) y la plataforma a la derecha (+X); el espectador mira desde el cuadrante frontal derecho (+X, +Z). Un modelo de ~15–30 m en X encaja solo: el encuadre se calcula con su volumen.
- Materiales PBR estándar de glTF (metallic-roughness). Texturas ≤ 2048 px.
- **Sin compresión Draco ni KTX2** (Meshopt sí se admite y se recomienda).
- Peso orientativo: ≤ 150 000 triángulos (más de 300 000 genera un aviso; el móvil sufre).
- **Nombres sin puntos ni espacios** (three.js los sanea y dejarían de coincidir). Usar `_`.

## 2. Grupos resaltables (obligatorios)

Un nodo (grupo o malla) por equipo. **Todas** las mallas de ese equipo cuelgan de él. Al seleccionar un equipo o avanzar el recorrido, la página resalta ese nodo con un tinte verde.

| Nodo | Equipo |
|---|---|
| `grupo_tolva` | Tolva de alimentación (incluye su estructura de soporte si se quiere resaltar con ella) |
| `grupo_cinta` | Banda transportadora de alimentación |
| `grupo_tromel` | Tromel (criba rotatoria) |
| `grupo_cribado` | Salida de material cribado (canal, contenedor) |
| `grupo_plataforma` | Plataforma de operación |
| `grupo_rechazo` | Salida de rechazo (canal, bolsa) |

Lo que no pertenezca a ninguno (bastidor azul, zapatas, operarios, suelo) puede colgar de cualquier otro lugar: no se resalta.

## 3. Mecanismos (opcionales, recomendados)

| Nodo | Qué hace la página |
|---|---|
| `mec_tromel` | Nodo que **gira sobre su eje X local**. Su origen debe estar sobre el eje del tromel. Debe estar dentro de `grupo_tromel`. |
| `mec_banda` | **Malla** cuyo material tiene textura de color (`baseColorTexture`); la página desplaza su coordenada U. Las UV deben correr a lo largo de la banda y la textura ser repetible. Dentro de `grupo_cinta`. |

Si faltan, el equipo se muestra fijo y se avisa en consola.

## 4. Anclas del recorrido (obligatorias)

Son nodos vacíos (*Empty* en Blender, sin geometría). Solo importa su **posición mundial**. Definen por dónde viaja el material.

| Ancla | Dónde colocarla |
|---|---|
| `a_tolva_pila` | Centro de la superficie del material dentro de la tolva (algo por debajo del borde). El material se apila en un radio de 0,9 m: la tolva debe ser más ancha que eso en esa altura. |
| `a_tolva_salida` | Boca inferior de la tolva, por donde el material cae a la banda. |
| `a_banda_ini` | Sobre la superficie de la banda, donde el material cae y empieza a avanzar. |
| `a_banda_fin` | Sobre la superficie de la banda, en el extremo donde sale hacia el tromel. |
| `a_tromel_ini` | Sobre el suelo interior del tromel, cerca de la entrada. |
| `a_tromel_fin` | Sobre el suelo interior del tromel, cerca de la salida. A la misma altura que `a_tromel_ini`. El material rueda por la recta entre ambos (±0,45 m de ancho: el interior debe tener al menos 0,9 m de ancho útil). |
| `a_cribado_caida` | Debajo del tromel, por donde cae el material que pasa la malla (se usan su Y y su Z; la X depende de dónde se separe). |
| `a_cribado_canal` | Extremo final del canal de material cribado, antes del contenedor. |
| `a_cribado_pila` | Centro de la superficie dentro del contenedor de material cribado (se apila en 1,2 × 0,9 m). |
| `a_rechazo_boca` | Justo después del extremo de salida del tromel, donde cae el rechazo. |
| `a_rechazo_canal` | Extremo final del canal de rechazo, sobre la bolsa. |
| `a_rechazo_pila` | Centro de la superficie dentro de la bolsa (se apila en un radio de 0,55 m). |

## 5. Puntos de los marcadores (opcionales)

`p_tolva`, `p_cinta`, `p_tromel`, `p_cribado`, `p_plataforma`, `p_rechazo`: vacíos donde aparece el número de cada equipo. Si falta alguno, usa una posición por defecto pensada para la planta simplificada, que puede no coincidir con tu modelo.

## 6. Suelo

Una malla cuyo nombre empiece por `suelo` (p. ej. `suelo_losa`) recibe sombras pero **no cuenta** para el encuadre ni tapa los marcadores.

## 7. Qué no cambia

La separación sigue siendo una **visualización conceptual** de dos corrientes (tierra y metal recuperado) hasta que Biosfera confirme cómo separa la planta real. Un modelo más fiel no obliga a afirmar un mecanismo: las partículas solo siguen las anclas. Si se confirma un separador (p. ej. un imán), habrá que añadir su nodo y ancla; hoy no existe.

## 8. Cómo activar y validar un modelo

1. Copiar el archivo a `assets/` (p. ej. `assets/planta.glb`).
2. Probarlo sin tocar código: `index.html?modelo=assets/planta.glb&debug`. La consola muestra el informe (`origen`, errores, avisos, triángulos). Si cumple el contrato aparece `origen: "glb"`; si no, `origen: "procedural"` y el motivo.
3. Hacerlo definitivo: poner la ruta en `js/config.js` (`export const MODELO = "assets/planta.glb";`).
4. Revisar: el tromel gira, la banda avanza, el material entra por la tolva, se reparte en las dos salidas y los seis equipos se resaltan.

Errores que impiden usar el modelo (cae al respaldo): falta algún `grupo_*` o ancla `a_*`, no hay mallas, o su tamaño en X es absurdo (<3 m o >200 m: suele ser un problema de unidades). Todo lo demás son avisos.

## 9. Mapa de nodos (para modelos que ya existen con otros nombres)

Si un modelo no usa los nombres de este contrato y no conviene renombrarlo, se añade un archivo `*.mapa.json` que los traduce (se activa con `MAPA` en `js/config.js` o `?mapa=`). Ejemplo real: `assets/BIO_planta_v11.mapa.json`.

| Clave | Contenido |
|---|---|
| `grupos` | `{ "tolva": [selector, …], … }`: los nodos que se agrupan en cada `grupo_*`. Un selector es un nombre exacto, o `{ "re": "^Prefijo", "en": "NodoPadre", "nivel": 1 }` (expresión regular sobre nombres saneados; `en` limita a los descendientes de un nodo; `nivel: 1` solo mira hijos directos de la raíz). |
| `mecanismos` | `{ "tromel": "NombreDelNodoQueGira", "banda": "MallaConTextura" }` |
| `anclas` | `{ "tolva_pila": [x, y, z], … }`: las 12 anclas del §4, en metros y coordenadas mundo. Se admiten puntos intermedios opcionales `cribado_via1…` y `rechazo_via1…` para trayectos con curvas. |
| `puntos` | `{ "tromel": [x, y, z], … }`: posición de los marcadores (§5). |
| `parametros` | `{ "escala": 0.55 }`: tamaño del material y de sus saltos respecto a la planta de respaldo (1 = tromel de 1,5 m de radio). |
| `camara` | `{ "dir": [x, y, z] }`: dirección de la vista inicial (un modelo largo y estrecho gana con una vista más frontal). |
| `ocultar` | Selectores de nodos que no deben dibujarse. |
| `nota` | Texto que se añade al aviso bajo la escena (por ejemplo, módulos supuestos). |
| `fusionar` | `false` desactiva la fusión de mallas estáticas por material (por defecto activa: reduce las llamadas de dibujo). |

**Herramientas:** `herramientas/inspeccionar-modelo.html?modelo=../assets/x.glb` lista los nodos de primer nivel con su caja en metros, triángulos y animaciones.

**Peso:** conviene comprimir con meshopt (`npx @gltf-transform/cli dedup in.glb a.glb && … weld a.glb b.glb && … meshopt b.glb out.glb --level medium`). El modelo de la planta bajó de 11 MB a 1 MB sin cambiar su aspecto. El descodificador ya está incluido.

**Alojamientos que no sirven `.glb`:** una ruta `*.glb.js` carga un módulo con el binario en base64 (`export default "…"`).

## 10. Instrucciones breves para quien construye el modelo

> Exporta un `.glb` (metros, Y arriba, eje del tromel en X, tolva a la izquierda) con los nodos de `docs/CONTRATO-MODELO.md`: seis `grupo_*`, doce anclas `a_*` como *Empties*, `mec_tromel` (gira sobre X) y `mec_banda` (textura repetible). Sin Draco, sin luces ni cámaras, sin puntos ni espacios en los nombres. Compáralo con `assets/ejemplo-contrato.glb`.
