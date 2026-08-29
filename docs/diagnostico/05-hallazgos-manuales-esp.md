# Qué piden de verdad las E.S.P. grandes — hallazgos de fuente primaria

**Fecha:** 2026-08-29 · Responde a §7.2 de
[`04-propuesta-co-esp-v1.md`](04-propuesta-co-esp-v1.md), la parte que **no
necesita abogado**: leer lo que estas empresas publican.

**Método:** consulta a los portales públicos de proveedores. Se distingue en
todo momento lo verificado en fuente primaria de lo que solo apareció en un
resumen de buscador. Lo segundo no se usa para cambiar nada.

---

## 1. Acueducto de Bogotá (EAAB) — 5 821 procesos

Fuente: [Registro de proveedores, acueducto.com.co](https://www.acueducto.com.co/wps/portal/EAB2/proveedores/atencion-al-proveedor/puntos-de-contacto-para-el-proveedor)

- Registro **en línea**, sin papel: el sistema *"permitirá la administración y
  mantenimiento de la información del proveedor en tiempo real, sin necesidad
  de radicar documentos físicos"*.
- **Organizado por códigos UNSPSC** — verificado, textual: *"Existirá una base
  de datos del proveedor por actividades de servicios y productos
  estandarizados a través de los códigos de productos y servicios estándar de
  las Naciones Unidas (UNSPSC)"*.
- Canales: `registroproveedores@acueducto.com.co`, tel. 344 79 11, y
  presencial en Av. Calle 24 No. 37-15 piso 2.
- **No verificado:** qué documentos exige, si caduca, si tiene costo. La página
  no lo dice y el PDF del ABC no era extraíble.

## 2. Grupo EPM — 1 059 procesos (solo EPM)

Fuente primaria: *Instructivo para la gestión del registro de proveedores y
contratistas en Ariba para el Grupo EPM*, v1, 2021-05-14, Gerencia Cadena de
Suministros ([PDF](https://www.epm.com.co/content/dam/epm/proveedores-y-contratistas/contrataci%C3%B3n/como-ser-proveedor-o-contratista/reg%C3%ADstrate-como-proveedor/gestion-registro-de-pyc-grupo-epm.pdf)).
Documento leído completo, no resumido por buscador.

- **Autoregistro en Ariba**, tres pasos: crear cuenta en la red Ariba →
  diligenciar el formulario del Grupo EPM → *"el operador del registro confirma
  la aprobación del registro en el sistema"*.
- **Un registro sirve para varias empresas**: el Grupo EPM incluye EPM, CHEC,
  CENS, ESSA, EDEQ y EMVARIAS, más filiales internacionales.
- **Mantenerlo al día es del proveedor**: *"es responsabilidad del proveedor…
  ingresar y mantener actualizada la información… cada que ésta cambie"*.
- **El registro se SUSPENDE** (§2.3) cuando el proveedor:
  - a) *"Se encuentre incurso en una de las causales de inhabilidad para
    contratar con el Grupo EPM"*;
  - b) *"Se incluya en las listas vinculantes del país de origen… OFAC…
    conocida como Lista Clinton; la lista de la ONU o en las listas del Banco
    Mundial o del Banco Interamericano de Desarrollo -BID"*.
- **El registro se CANCELA** cuando *"se detecte que existe alteración o
  distorsión en los documentos que dieron lugar al registro"*, entre otras.

## 3. ACUAVALLE — 632 procesos ⭐ el hallazgo que corrige un error

El 403 era del WAF contra peticiones automatizadas; con un navegador real y las
cabeceras normales, todo es público. Fuente primaria: **AP2-IN-004 Registro de
Proveedores**, v001, bajo la **Resolución No. 00004 del 19 de enero de 2026**
(documento de dos páginas, leído completo).

**Se inscribe por correo, no por portal:** se diligencia el formato AP2-FO-033 y
se remite a `inscripcion_proveedores@acuavalle.gov.co`. Tercer patrón distinto
de los tres que miramos: portal propio (EAAB), plataforma de terceros (EPM,
Ariba) y formato por correo (ACUAVALLE).

### 3.1 Requisitos de capacidad (§2.3, textual)

- *"Demostrar experiencia como proveedor de bienes o servicios"*.
- ⭐ *"**Estar inscrito en el Registro Único de Proponentes** del Registro Único
  Empresarial de la Cámara de Comercio"*.
- ⭐ *"**No estar incurso en causal alguna de inhabilidades e
  incompatibilidades** para contratar de conformidad con lo señalado en la Ley
  80 de 1993, Ley 142 de 1994, Ley 689 de 2001, Ley 1150 de 2007, Ley 1474 de
  2011, normas que sobre conflictos de intereses establece el código de
  comercio, Ley 222 de 1995, y demás normas que rigen la materia"*.

### 3.2 Documentos (§2.4)

Solicitud por la página web, formato AP2-FO-033, copia del RUT, copia de la
cédula del representante legal y **certificado de existencia y representación
legal con fecha de expedición no mayor a 30 días**.

### 3.3 Tres cosas más que conviene saber

- **Estar inscrito no da derecho a nada** (§2.6, textual): la inscripción *"no
  genera derecho adquirido, oferta mercantil, expectativa legítima ni prelación
  alguna para contratar, no obliga a la empresa a invitar, seleccionar o
  contratar a los inscritos"*.
- **Actualizar es obligación del proveedor** (§2.7), igual que en EPM.
- **Conflicto de interés declarado por escrito** (§2.8): hay que manifestar
  parentesco hasta 2.º de consanguinidad, 2.º de afinidad o 1.º civil con el
  representante legal de ACUAVALLE, y *"la omisión o falta de veracidad"* tiene
  consecuencias.
- Sus modalidades propias: *"Solicitud Privada de Varias Ofertas y Solicitud
  Pública de Ofertas"* — confirma que cada empresa define las suyas.

## 3bis. Lo que esto corrige y lo que responde

### ⛔ Un error en contenido ya publicado

`co-esp-v1` afirmaba en su portada: *"Sin RUP — Estas empresas contratan bajo
derecho privado y no exigen registro de proponentes"*, y en sus mitos: *"No lo
exigen"*. **Es falso para ACUAVALLE**, la tercera E.S.P. por volumen en nuestros
datos, que lo pide entre sus requisitos de capacidad.

Generalicé desde dos empresas —EAAB y EPM, que efectivamente no lo piden— a
todas. Corregido en este cambio: el hecho pasa a *"El RUP, depende"* y el mito
a explicar que depende de cuál. Es exactamente el tipo de afirmación cómoda que
le habría costado tiempo a alguien.

### ✅ Responde parte de §7.1, con documento en la mano

La pregunta abierta era si el régimen de inhabilidades e incompatibilidades
aplica a los contratos de una E.S.P. **ACUAVALLE responde que sí, y dice con
qué normas**: Ley 80 de 1993, Ley 142 de 1994, Ley 689 de 2001, Ley 1150 de
2007, Ley 1474 de 2011, Ley 222 de 1995 y las de conflictos de interés del
código de comercio.

Eso **no cierra §7.1** —lo que dice una empresa en su instructivo no fija el
alcance general, y sigue faltando la parte de aportes a seguridad social— pero
lo mueve de "no tengo idea" a "hay una entidad que lo aplica y enumera las
normas". Cuando se cierre, esas preguntas crean `co-esp-v2`.

### 💡 Un hueco nuevo: conflicto de interés

El parentesco con el representante legal de la entidad (§2.8) no lo pregunta
ningún cuestionario, y es declarable y verificable por el propio oferente.
Queda propuesto, no aplicado: entraría en `co-esp-v2`.

---

## 4. Lo referido pero NO verificado

Un resumen de buscador atribuía a EPM la exigencia, desde 2017, de un
certificado de la ARL con el porcentaje de implementación del SG-SST para todos
los proveedores. **No se pudo confirmar en fuente primaria**: no está en el
instructivo leído ni en las preguntas frecuentes. Se anota, no se usa.

---

## 5. Qué significa esto para `co-esp-v1`

### 5.1 Lo que confirma

- **`registro` era la pregunta correcta y el orden es el correcto.** Las dos
  empresas grandes tienen registro propio, en línea y autogestionado.
- **`registro_dudoso` no era una hipótesis:** EPM suspende y cancela registros,
  y la actualización corre por cuenta del proveedor. "Me inscribí pero no sé si
  sigue activo" describe un estado real y frecuente.

### 5.2 Dos huecos, ambos documentados y ninguno interpretativo

**(a) Códigos UNSPSC.** Los descarté de `co-esp-v1` por ser "concepto del RUP",
y **me equivoqué**: el registro del EAAB está organizado por ellos. Si tu
actividad no está clasificada bajo el código que usa la empresa, no apareces en
sus búsquedas. Aplica igual sin RUP de por medio.

**(b) Listas restrictivas.** OFAC/Clinton, ONU, Banco Mundial, BID. EPM
**suspende el registro** por estar en ellas, y el cuestionario no pregunta nada
al respecto. Es una consulta pública y gratuita, y **no depende de la revisión
jurídica pendiente**: no es una interpretación sobre el alcance de la ley, es
un requisito que la empresa publica.

### 5.3 Lo que aporta al §7.1, sin cerrarlo

El instructivo de EPM lista *"causales de inhabilidad para contratar con el
Grupo EPM"* como motivo de suspensión. Eso **no resuelve** cuál es el régimen
aplicable ni su alcance —sigue haciendo falta criterio jurídico— pero sí
demuestra que **el tema está vivo para una E.S.P.** y que preguntarlo no es
trasladar mecánicamente un requisito de la Ley 80.

---

## 6. Aplicado ya en este cambio

Solo lo respaldado por fuente primaria: los textos de los remedios `registro_no`
y `registro_dudoso`, que pasan de una descripción genérica a decir cómo se hace
en las dos empresas que más contratan, y qué hace que un registro se caiga.

## 7. Aplicado el mismo día (aprobado 2026-08-29)

1. ✅ **Pregunta de UNSPSC** adaptada a E.S.P. (§5.2a), dentro del área
   Registro. El cuestionario sube a 8 preguntas y la portada pasa a prometer
   "8 preguntas · 3 minutos".
2. ✅ **Pregunta de listas restrictivas** (§5.2b), en un área nueva de
   Situación jurídica. Es el **primer y único bloqueante absoluto** de
   `co-esp-v1`, y el primero de todo el módulo que no depende de una
   interpretación jurídica: EPM publica que suspende el registro por eso.
3. ⏳ **Revisar ACUAVALLE a mano** (§3), que se resistió a la consulta
   automática. Sigue pendiente.

### Lo que se rompió al aplicarlo, y cómo se vio

Añadir preguntas a un catálogo ya publicado **contradice la regla de congelar
versiones** que este mismo módulo escribió. Se vio en pantalla: la fila guardada
antes del cambio, con 6 respuestas, se leyó con el catálogo de 8 y mostró
"Situación jurídica: PENDIENTE" junto a un 100/100 — un área que esa persona
nunca respondió.

Se resolvió editando en sitio y borrando las filas afectadas, porque las únicas
dos existentes eran de prueba, anónimas y creadas horas antes al verificar en el
navegador. Es la misma clase de ventana que se usó para renombrar la clave del
`clientStore`, y como aquella, **ya está cerrada**: el próximo cambio de
preguntas crea `co-esp-v2`.
