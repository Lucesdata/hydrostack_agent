# La ficha que decide: bloque de decisión arriba del todo

**Fecha:** 2026-09-28 · **Estado:** spec, pendiente de aprobar (y después, plan).
**Maqueta:** escritorio y móvil, con los tres estados conmutables, en el lienzo
«Bloque de decisión — ficha» (artefacto privado del usuario; datos de ejemplo,
no un proceso real).

## Por qué

Quien llega a AquaLicita casi siempre tiene ya cuenta en el SECOP II y se ha
ahogado en su lista de miles de procesos. No le falta información: le falta
**decidir rápido** si un proceso es para su empresa y qué hacer después.

La ficha (`/licitaciones/[slug]`) ya tiene los datos correctos, pero los ordena
por su **fuente** y no por la **decisión**: cabecera, «Cómo te queda a ti»,
cifras, pliego, cronograma, documentos, competencia, análisis de oferta,
cierre. Varias de esas secciones dicen sobre todo lo que falta (tres casillas
«está en el pliego», «no verificado», tres barras grises). Es honesto y se
conserva, pero así colocado un visitante nuevo lee «esto está medio vacío».

La promesa de la ficha, en una frase: **en dos minutos sabes si este proceso es
para ti y qué haces después.** El bloque de decisión es esa promesa hecha
pantalla, arriba del todo.

## A quién sirve

- **Experto** (licita con frecuencia): quiere densidad y velocidad — el número
  del proceso a un clic, el expediente del SECOP II a un clic, el veredicto sin
  rodeos y el detalle de cada compuerta a la vista.
- **Novato** (primeras licitaciones): necesita que le digan qué significa cada
  cosa y cuál es el siguiente paso, sin que eso estorbe al experto.

Una sola ficha para los dos, no dos modos: la explicación va **plegada** donde
hace falta («¿Primera vez? Cómo leer las compuertas», «¿Qué significa?» junto a
la modalidad). El experto no la abre; el novato la encuentra en su sitio.

## Qué se construye

### 1. Cabecera más corta y más útil al experto

- Entidad contratante, con su departamento rotulado **como sede de la entidad**,
  no como lugar de la obra (regla de la prueba de visitante del 2026-09-26).
- Objeto del proceso como título.
- Solo tres chips: tipo de obra (con su color de familia de `tipo-color.ts` y
  su nombre escrito), estado y modalidad. UNSPSC, tipo de contrato y número
  bajan al detalle plegado.
- A la derecha: el número del proceso con **botón de copiar** y **«Abrir en
  SECOP II»** siempre visible. El usuario vive en el SECOP; la ficha es su
  compañera, no su reemplazo.

### 2. Bloque de decisión

Una sola pieza, en este orden:

**a) Recorrido en tres pasos:** Tu perfil → El pliego → Ofertar en SECOP II, con
el paso actual marcado. Dice en qué punto está el usuario y que el pliego es lo
siguiente que desbloquea valor.

**b) Veredicto en una frase** bajo la pregunta «¿Es para ti?», más una bajada
de una o dos líneas. La frase **se deriva de las cinco compuertas** (conteo por
estado y cuál falta); no es un juicio aparte (`CONDUCTA.md` §6: el `overall` se
agrega, nunca se emite por su cuenta).

**c) Tres datos de decisión:**
- **¿Cuánto?** Presupuesto oficial. Sin presupuesto publicado, lo que ya pinta
  `formatValorProceso`: el 0 del SECOP nunca sale como «$0».
- **¿Hasta cuándo?** Fecha de recepción de ofertas y «quedan N días», con una
  barra del tiempo transcurrido entre publicación y cierre. Solo cuando existen
  las dos fechas; si no, el texto que ya usa la ficha («El SECOP no publica la
  fecha de cierre en este dataset»), sin barra y sin inventar plazo.
- **¿Cómo se contrata?** Modalidad, con «¿Qué significa?» plegado.

**d) Las cinco compuertas, dibujadas como compuertas de un canal.** Sector,
Cuantía, Plazo, Zona, Habilitación (`CLAVES_COMPUERTA`, mismo orden, mismos
rótulos de `ETIQUETA_COMPUERTA`). Cada una es una compuerta entre dos postes
sobre una lámina de agua:

| Estado | Forma de la compuerta | Palabra | Color |
|---|---|---|---|
| Cumple | arriba: el agua pasa | cumple | `--success` |
| Revisar | a media altura | revisar | `--warning` |
| No cumple | abajo: corta el agua | no cumple | `--danger` |
| Sin dato | contorno punteado | sin dato | tinta secundaria |
| Lectura del proceso (sin perfil) | contorno neutro, sin agua | dato | tinta |

El agua corre de izquierda a derecha y **se detiene en la primera compuerta que
no cumple**; detrás de una «sin dato» corre más tenue. El estado lo dicen a la
vez **la forma, la palabra y el color**: el color nunca va solo (regla 4 del
rediseño; verde y ámbar difieren un 4 % en luminancia). Es la metáfora que el
producto ya usa —las llama compuertas— hecha visible.

Debajo, **«Por qué, una por una»**: la explicación de cada compuerta. Abierto en
escritorio; plegado en móvil.

**e) Tu siguiente paso:** un único botón principal que depende del estado, una
línea de ayuda y un enlace secundario.

| Estado | Botón principal | Ayuda | Secundario |
|---|---|---|---|
| Sin perfil | Define tu perfil (ver decisión D1) | Especialidad, capacidad de contratación y departamentos donde trabajas. | Prefiero verlo en SECOP II |
| Perfil, sin pliego | **Sube el pliego** | Es el PDF que ya descargaste del SECOP II. Lo leemos y comparamos sus requisitos con tu perfil. Hasta 5 pliegos cada 24 horas. | Abrir el expediente |
| Pliego leído, falta un dato del perfil | Completa ese dato (p. ej. índice de endeudamiento) | Con ese dato la compuerta se resuelve sola. | Ver los requisitos del pliego |
| Pliego leído, todo resuelto | Preparar la oferta en SECOP II | La oferta se presenta en SECOP II. | Ver los requisitos del pliego |
| Alguna compuerta no cumple | Ver por qué (ancla a la compuerta) | — | Explorar procesos parecidos |

El pliego es lo que se vende: convierte datos abiertos en requisitos concretos,
y el usuario del SECOP **ya tiene ese PDF**.

### 3. Debajo del bloque, en orden de decisión

1. Qué te exige el pliego
2. Quién suele competir aquí
3. Fechas (cronograma)
4. Detalle del proceso — **plegado**: UNSPSC, tipo de contrato, acceso a
   documentos
5. Cierre (el de hoy, `CierreFicha`)

«Cifras» desaparece como sección: presupuesto y fechas suben al bloque, y las
tres casillas «está en el pliego» más las filas grises de «Análisis de oferta»
se juntan en **un solo aviso** dentro de «Qué te exige el pliego»: *lo que
desbloquea el pliego*. Se sigue diciendo que falta; se presenta como algo que el
usuario puede conseguir. Sigue sin haber cifras falsas ni barras que imiten
datos.

### 4. Móvil (390 px)

- El bloque se parte en dos tarjetas: la banda del veredicto (recorrido como
  tres barras + «Paso N de 3», veredicto, datos en dos columnas) y el canal de
  compuertas (las cinco en una fila; «Habili·tación» parte con guion suave).
- «Por qué, una por una» y «¿Primera vez?» plegados, con zonas táctiles ≥ 44 px.
- Las secciones siguientes, como lista de enlaces.
- **Barra de acción fija al pie** con el botón principal y un icono al SECOP II:
  el siguiente paso queda en la zona del pulgar mientras se lee.

## Qué se conserva (no negociable)

- La ficha sigue **estática** (ISR). El servidor pinta la lectura **absoluta**
  —lo que el proceso exige— y la isla de cliente (`SemaforoConPerfil`) la
  sustituye por la relativa si encuentra perfil. El bloque entero hereda ese
  reparto: nada personal en el HTML cacheado.
- **La redacción de `verdict-publico.ts` manda.** Sin cuenta, el semáforo
  muestra estados pero no el `reason` (salvo `overall === "FAIL"` y las
  `UNKNOWN`). «Por qué, una por una» respeta eso: donde la razón esté redactada,
  pide cuenta en vez de mostrarla.
- Zona = **sede de la entidad**. Toda explicación dice «la entidad está en…» y
  «lugar de ejecución no confirmado».
- Color = tipo de obra en el chip; los colores de estado son `--success`,
  `--warning`, `--danger` y **se miden** (`contraste.test.ts`), también sobre la
  banda oscura (ver criterio 9).
- No se prometen alertas ni seguimiento de cambios.

## Decisiones abiertas (del usuario)

- **D1 — Botón principal sin perfil.** El perfil puede vivir en `localStorage`
  sin cuenta (`CONDUCTA.md` §6), pero guardarlo en la cuenta exige nivel
  `gratis` (`perfil_guardar`), y sin cuenta las razones se redactan y el pliego
  no se puede subir. Opciones: (a) «Define tu perfil» sin cuenta, y la cuenta se
  pide al subir el pliego; (b) «Crea tu cuenta gratis y define tu perfil» de
  entrada. La maqueta muestra (b). Recomendación: **(a)**, porque enseña el
  valor antes de pedir el registro.
- **D2 — Zona en «no cumple».** Hoy `ubicacionGate` da `FAIL` («el proceso está
  en X, fuera de tu cobertura») cuando la **entidad** está fuera de la cobertura
  del perfil, aunque la fuente no publica dónde se ejecuta la obra. Con el canal,
  ese `FAIL` corta el agua y se ve como un «no» rotundo. ¿Se queda así, o la zona
  fuera de cobertura baja a «revisar»? Tocar la compuerta cambia `verdict.ts` y
  sus tests, así que es una decisión aparte de este spec; aquí solo se pide que
  su texto hable de la entidad y no del proceso.
- **D3 — Banda oscura.** La banda del veredicto usa `--accent-ocean`
  (`#0C4A6E`), que enlaza con la portada oscura. Alternativa: banda clara con
  borde. Se decide al ver la maqueta en el navegador real.

## Criterios de aceptación

1. En escritorio (1280 px), el veredicto, los tres datos, las cinco compuertas y
   el botón principal caben **sin hacer scroll** bajo la cabecera.
2. En móvil (390 px), el botón principal está **siempre visible** (barra fija) y
   el veredicto aparece en la primera pantalla.
3. Cada compuerta dice su estado con **forma, palabra y color**; quitando el
   color, los cinco estados se siguen distinguiendo.
4. La frase del veredicto sale del conteo de las cinco compuertas; con los
   mismos estados, la misma frase. Hay test de esa derivación.
5. El HTML servido (sin JS) contiene la lectura absoluta completa y es cierto
   para cualquier visitante; no contiene nada de un perfil.
6. Sin cuenta, ningún `reason` redactado aparece en el HTML ni en la respuesta
   de red.
7. «Quedan N días» se calcula en el cliente (la página revalida cada 12 h) y no
   aparece si falta alguna de las dos fechas.
8. Presupuesto 0 o nulo nunca se pinta como «$0».
9. Todo texto nuevo pasa AA: los colores de la banda oscura (`#C7E6F7` y
   `#7DD3FC` sobre `#0C4A6E`) —hoy 7,25:1 y 5,67:1, medidos a mano— entran en una prueba de contraste como la de
   `contraste-oscuro.test.ts`.
10. El botón principal cambia con el estado según la tabla del §2e y nunca
    promete algo que no existe.
11. Zonas táctiles ≥ 44 px en móvil; todo control es un `<button>`, `<a>` o
    `<details>` real.
12. Prueba con dos personas (un experto y un novato), misma tarea: *«decide si te
    presentas a este proceso»*. Se mide el tiempo hasta decidir y se anota qué
    buscaron y no encontraron. Precedente: la prueba de visitante del
    2026-09-26.

## Fuera de alcance

- Cambiar la lógica de cualquier compuerta (ver D2).
- Calcular el rango probable de la oferta ganadora o la probabilidad de
  adjudicación: siguen sin existir y siguen sin fingirse.
- Buscar por número de proceso o pegar un enlace del SECOP para llegar a la
  ficha. Es la siguiente idea de captación, con su propio spec.
- Cambios en la portada o en la sección Ficha Viva.
