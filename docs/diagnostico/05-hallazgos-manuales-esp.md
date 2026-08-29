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

## 3. ACUAVALLE — 632 procesos

Su sitio devolvió **403** a la consulta automatizada. Publica sus procesos por
la Ley 1712 de 2014, pero no se pudo verificar si tiene registro de proveedores
propio ni sus requisitos. **Queda pendiente**, y conviene mirarlo a mano.

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
