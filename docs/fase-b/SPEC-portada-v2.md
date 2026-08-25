# Especificación de la portada v2 — Fase B

Fecha: 2026-08-24
Depende de: [`PLAN-textos-portada.md`](./PLAN-textos-portada.md) ·
[`PLAN-recorrido-oferente.md`](./PLAN-recorrido-oferente.md)
Referencia visual: capturas de `tendios.com/register-free` del 2026-08-24.

Esto es un plan de **maquetación**. El plan hermano de textos manda sobre
las palabras; este manda sobre dónde van y cómo se ven. Cuando choquen,
gana el de textos.

---

## 0. El encargo, en una frase

Rehacer la portada con el esqueleto de la landing de Tendios —seis bloques,
en su orden— **conservando la paleta, el logo y la planta isométrica de
HydroStack**, y sustituyendo cada captura de producto suya por lo que
HydroStack tiene de propio.

Dictado por el usuario, textual: *"quiero que nuestra landing se vea así,
pero en vez del video deja la planta de tratamiento que tenemos"* y
*"conserva los colores"*.

---

## 1. El principio: se copia el esqueleto, no la piel

De Tendios se toman tres cosas: **el orden de los bloques**, **la anatomía
interna de cada bloque** y **el ritmo** (una idea por pantalla, cada bloque
empieza con un eyebrow y termina en una acción).

No se toma nada más. Ni el azul marino, ni el dorado, ni la tipografía
geométrica, ni el tono ("gana más", "solo las que puedes ganar").

---

## 2. Encuadre del producto

**HydroStack es una plataforma de tratamiento de aguas. Las licitaciones de
agua y saneamiento básico son una de sus funciones, no el producto entero.**

Esto lo dictó el usuario y cambia dos cosas respecto a lo que hay escrito
hoy en el repositorio:

1. El titular de la primera pantalla no puede reducirse a licitaciones.
2. La sección 3 es el sitio donde se muestra la amplitud: la licitación como
   una función entre varias, todas desde el mismo lugar.

Ya está respaldado por el producto: `INTENT_ROUTES` en `app/page.js` tiene
cinco rutas (`/licitaciones`, `/pliego`, `/soluciones`,
`/asistente/ejecucion`, `/asistente/operacion`) y solo una es licitar.

> ⚠️ **Choca con `CLAUDE.md`**, que declara HydroStack "plataforma de
> inteligencia para contratación pública" y "único producto activo". Antes
> de publicar esta portada hay que actualizar esa sección de `CLAUDE.md`, o
> la documentación y el sitio dirán cosas distintas.

---

## 3. Sistema visual

### 3.1 Color — se conserva íntegro

| Uso | Token / valor |
|---|---|
| Fondo de página | `--bg` `#FAFAF7` |
| Acento | `--accent` `#0369A1` |
| Texto principal | `#0A1F1C` |
| Texto secundario | `#525B5A` |
| Texto terciario / etiquetas | `#6B746F` |
| Bordes | `#DADAD2` |
| Fondo oscuro (banda de cierre) | `#0A1F1C` |
| Realce sobre oscuro | `#7DD3FC` |
| Verde de estado | `#16A34A` |

Ninguno es nuevo: los dos últimos ya viven en la tarjeta oscura de
`PILLARS`.

**Traducción de cada color de Tendios:**

| Tendios | HydroStack |
|---|---|
| Píldora azul claro | Píldora `#0369A1` sobre `rgba(3,105,161,.08)` |
| Titular tricolor (marino + azul + dorado) | **Un solo acento**: `#0A1F1C` con las palabras clave en `#0369A1`. No se inventa un segundo color para imitar el dorado. |
| Botón primario azul rey | Relleno `#0369A1` |
| Botón secundario borde azul | Borde `#0369A1`, fondo transparente |
| Chips azul pálido | `#0369A1` sobre `rgba(3,105,161,.08)` |
| Banda de cierre marino + dorado | `#0A1F1C` + `#7DD3FC` |

### 3.2 Forma — la decisión que falta tomar

Tendios es **redondo y blando**: tarjetas de radio ~16px, botones de ~12px,
sombras difusas, tipografía geométrica.

La portada de HydroStack hoy es **recta y técnica**: radio 0, marcas de
esquina en L, etiquetas en monoespaciada, `[ corchetes ]`, `Fig. 02 —`,
líneas de plano que se trazan al entrar. Es un lenguaje de plano de
ingeniería, y es coherente con lo que vende.

Copiar la maquetación de Tendios no obliga a copiar su forma. Ver la
decisión **D1** en §7 — es la más importante de todas y hay que resolverla
antes de escribir una línea de código.

Este documento asume, mientras no se decida otra cosa, la **opción
híbrida**: se adopta la maquetación de Tendios y se conserva el lenguaje de
plano (esquinas rectas, monoespaciada en eyebrows y cifras, marcas de
esquina en las tarjetas).

### 3.3 Tipografía — sin cambios

Titulares en `--font-ibm-plex-sans-condensed`, cuerpo en `--font-inter`,
etiquetas y cifras en `--font-jetbrains-mono`.

---

## 4. Anatomía, bloque por bloque

Seis bloques en este orden.

### S1 · Hero

**Dos columnas.** Izquierda, apilado:

1. **Píldora** de categoría: punto de acento + texto en mayúsculas
   espaciadas, monoespaciada, `#0369A1`.
2. **Titular** grande, 2-3 líneas, con las palabras clave en `#0369A1`.
   Conservar la animación de revelado por línea (`.hero-mask`) que ya existe.
3. **Subtítulo**, `#525B5A`, 2-3 líneas, ancho máximo ~520px.
4. **Dos botones** en fila: primario relleno con flecha + secundario con
   borde. Hoy solo hay uno — el segundo es nuevo.
5. **Dos micro-pruebas** con check en una línea, tamaño pequeño, `#6B746F`.
6. **Franja de cuatro cifras** al pie del bloque, divisores verticales
   `#DADAD2` entre columnas. Número grande en `#0369A1`, etiqueta debajo en
   `#6B746F`.

**Derecha: `PlantaHero`.** La planta de tratamiento isométrica con su
telemetría, sus puentes barredores girando y su nivel de agua — tal como
está hoy, sin tocar. Aquí es donde Tendios pone el mockup del producto.

Esa es la diferencia que más se nota entre las dos portadas y es
deliberada: ellos enseñan una interfaz, nosotros enseñamos una planta.

> **Propuesta de textos** (versión A del plan de textos — promete solo lo
> construido). Sujeta a revisión del usuario:
>
> - Píldora: `AGUA Y SANEAMIENTO · COLOMBIA`
> - Titular: **Todo tu trabajo de agua, en un solo lugar.** *(con "agua" en acento)*
> - Subtítulo: "Desde una duda de norma hasta un pliego de cien páginas.
>   Incluye los procesos de agua y saneamiento del SECOP II, con las
>   compuertas de elegibilidad revisadas una por una."
> - Botón 1: `Prueba un proceso →` · Botón 2: `Ver cómo funciona`
> - Checks: `Sin cuenta` · `Resultado en 2 minutos`

### S2 · "Por qué HydroStack"

**Cabecera centrada**, tres piezas: eyebrow en mayúsculas y acento → titular
grande a dos líneas, centrado, construido como oposición → subtítulo gris
centrado, ancho máximo ~640px.

**Rejilla 2×2 de tarjetas.** Cada tarjeta, en orden:

- **Icono** blanco sobre cuadrado de acento.
- **Título** en negrita, en la misma línea que el icono.
- **Párrafo** de 2-3 líneas, `#525B5A`.
- **Chip** al pie: `#0369A1` sobre `rgba(3,105,161,.08)`. Es el único sitio
  de la sección donde se nombra la funcionalidad.

**Ritmo de las cuatro tarjetas.** Las de Tendios atacan un dolor distinto
cada una y en este orden: tiempo perdido → llegar tarde → leer de más →
competir a ciegas. Ese orden se conserva; los dolores se cambian por los
nuestros, que ya están escritos en `PROBLEM_SOLUTION`.

> **Propuesta de tarjetas** (sujeta a revisión):
>
> | # | Título | Chip |
> |---|---|---|
> | 1 | Sabes si calificas antes de escribir | `Pre-evaluación RUP` |
> | 2 | El pliego, como lista de requisitos | `Extracción de pliegos` |
> | 3 | Una respuesta con la norma citada | `RAS · Res. 0330 · CRA` |
> | 4 | No es un buscador genérico: es agua | `Clasificación sectorial` |
>
> La 4 es la que responde a Tendios sin nombrarlo.

### S3 · "Todo en un solo lugar"

Dos piezas.

**S3.a — Franja de fuentes.** Una línea de ancho completo sobre fondo
blanco, con bordes finos arriba y abajo: etiqueta gris a la izquierda y
nombres en texto plano, espaciados, en gris medio. **Sin logos** — Tendios
tampoco los usa.

Tendios lista herramientas de oficina (HubSpot, Salesforce, SAP). Para
HydroStack pesan más las fuentes y la norma. Ver decisión **D2**.

**S3.b — Bloque a dos columnas.** Izquierda: eyebrow → titular grande a dos
líneas, alineado a la izquierda → subtítulo gris → **tres viñetas** con
casilla-check rellena de acento, cada una con **frase-guía en negrita + dos
puntos** y el resto en gris → **un solo botón** relleno con flecha.

Derecha: captura del producto, flotando, con sombra suave y recortada por el
borde del contenedor. Ver decisión **D3**.

Es la sección donde se demuestra el encuadre del §2: lista de capacidades,
no de dolores — eso ya lo hizo S2.

> **Propuesta de viñetas** (sujeta a revisión):
>
> - **Procesos de agua y saneamiento:** los del SECOP II que son de tu
>   sector, clasificados, no todo el SECOP.
> - **Pliegos descifrados:** requisitos legales, técnicos y financieros
>   extraídos como lista que puedes marcar.
> - **Dudas de norma con cita:** RAS, Resolución 0330, CRA y SUI, con la
>   fuente al lado de cada respuesta.

### S4 · Banda de invitación

Fondo un punto más frío que el resto de la página, para que se despegue.
Todo centrado, sin imagen: **titular en pregunta a dos líneas** → **una
línea de subtítulo** en tres frases cortas separadas por punto → **un botón**
relleno con flecha.

### S5 · Banda oscura de cierre

Ancho completo, fondo `#0A1F1C` con un degradado radial suave que aclara el
centro. Todo centrado:

1. **Logo** en blanco.
2. **Titular a dos tiempos** en una línea: primera mitad en blanco, segunda
   en `#7DD3FC`. Es el mismo recurso del titular del hero, cerrando el
   círculo.
3. **Subtítulo** en `rgba(255,255,255,.6)`, una línea.
4. **Botón invertido**: fondo blanco, texto `#0369A1`, con flecha.
5. **Tres micro-pruebas con check** en fila. En el hero eran dos; aquí se
   añade una tercera.

### S6 · Pie

Fondo marino un punto más oscuro que S5, separado por un borde tenue: logo a
la izquierda, enlaces legales a la derecha, copyright debajo en gris apagado.

**Se conserva del pie actual** el punto verde con `Datos SECOP II ·
actualización diaria`. Es prueba de vida y Tendios no la tiene.

---

## 5. Cifras y datos

La regla 5 del plan de textos prohíbe las cifras de volumen: *contra los dos
millones de Tendios se pierde sin pelear*. La franja del hero se resuelve
sin romperla, porque **dos de las cuatro cifras ya existen y son vivas**.

`src/components/landing/LandingCards.jsx` consume `/api/landing-stats`, que
devuelve procesos nuevos de los últimos 7 días, pesos en juego este mes y
procesos abiertos del sector.

| Columna | Cifra | Origen |
|---|---|---|
| 1 | Procesos nuevos · últimos 7 días | `/api/landing-stats` — vivo |
| 2 | $ en juego · este mes | `/api/landing-stats` — vivo |
| 3 | 11 años de ejercicio en agua y saneamiento | real, `/nosotros` |
| 4 | Actualización diaria de datos SECOP II | real, pie actual |

Ninguna dice cuántos procesos hay en total. Dicen cuántos te sirven esta
semana, que es exactamente lo que pedía la regla 5.

**Si se quiere una cuarta columna distinta y hay que inventar**, los
provisionales acordados son `32` departamentos cubiertos y `6` compuertas
verificadas por proceso. Marcar en el código como `TODO: cifra real`.

### Material real disponible, para no inventar

- **11 años** en agua y saneamiento, licencia profesional vigente.
- **Planes directores de alcantarillado en Cali** — 3 corregimientos,
  modelado hidráulico y gemelo digital.
- **Datos SECOP II**, actualización diaria.
- **RAS-2000 / Resolución 0330** como marco.
- Las cinco rutas de `INTENT_ROUTES` y los tres pares dolor/respuesta de
  `PROBLEM_SOLUTION`: materia prima ya escrita para S2 y S3.
- Una sexta ruta marcada "Próximamente" (vendo o fabrico soluciones) con
  lista de espera funcionando.

---

## 6. Mapa de archivos

| Archivo | Qué le pasa |
|---|---|
| `app/page.js` | Reescritura de la maquetación. Es un solo archivo de 1.065 líneas con el CSS incrustado en `BLUEPRINT_CSS`. |
| `src/components/landing/PlantaHero.jsx` | **No se toca.** Se recoloca dentro del hero. |
| `src/components/landing/LandingCards.jsx` | Se le extraen las cifras vivas para la franja del hero. Decidir si el componente sobrevive como sección propia. |
| `src/components/landing/ProcesosTicker.jsx` | Revisar si sigue teniendo sitio en la maquetación nueva. |
| `app/globals.css` | Posibles tokens nuevos de radio y sombra, solo si gana la opción blanda en D1. |
| `CLAUDE.md` | Actualizar el encuadre del producto (§2). |

**Recomendación de orden:** partir `app/page.js` en un componente por
sección antes de reescribir. Con seis bloques nuevos, mil líneas en un
archivo se vuelven inmanejables.

---

## 7. Decisiones abiertas

**D1 · Forma: ¿recta o redonda?** ¿Se adopta también el aspecto blando de
Tendios (esquinas redondeadas, sombras difusas) o se conserva el lenguaje de
plano de ingeniería (radio 0, marcas de esquina, monoespaciada, corchetes)?
Es la decisión de la que cuelgan todas las demás. *Este documento asume la
opción híbrida: maquetación de Tendios, forma de plano.*

**D2 · Qué va en la franja de fuentes (S3.a).** Dos listas posibles:
fuentes de datos (`SECOP II · Socrata · RUP · SUI · Cámara de Comercio`) o
marco normativo (`RAS · Res. 0330 · CRA · SUI · ANLA`).

**D3 · Qué captura va a la derecha en S3.b.** Candidatas: el semáforo de
compuertas de elegibilidad, o el extractor de pliegos con su checklist de
requisitos.

**D4 · Qué pasa con las secciones actuales que la maquetación nueva no
prevé.** `INTENT_ROUTES` (las cinco rutas), `PROBLEM_SOLUTION`, `PILLARS`,
`ProcesosTicker`. Se pueden fundir en S2 y S3, dejar debajo, o eliminar.

**D5 · Los textos definitivos.** Todo lo que aparece en §4 entre bloques de
cita es propuesta, no dictado. Cada frase debe pasar por las cinco reglas
del plan de textos y por la pregunta de qué versión (A/B/C) está publicada.

---

## 8. Lo que hay que resolver antes de publicar

1. **`CLAUDE.md` contradice el encuadre** del §2. Uno de los dos cede.
2. **La versión de textos.** El plan de textos ata el copy a los pasos del
   plan de fase B: la versión A se publica al cerrar el paso 05. Si esta
   portada sale antes, sale prometiendo cosas que el producto no sostiene —
   que es exactamente el error que ese plan vino a corregir.
3. **Regla 4:** ninguna frase puede dar un veredicto único. El "solo de las
   que puede ganar" de Tendios no se copia. HydroStack dice qué compuerta
   pasa y por qué.
