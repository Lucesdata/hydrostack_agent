# La ficha como centro: absorber las páginas sueltas

**Fecha:** 2026-09-27 · **Estado:** spec, pendiente de aprobar el plan
(`docs/superpowers/plans/2026-09-27-ficha-como-centro.md`).

## Por qué

La portada ya es solo mapa + Ficha Viva (2026-09-26). Pero el producto sigue
teniendo siete páginas que responden preguntas por su cuenta, fuera de la ficha:
`/pliego`, `/competidores` (+ `/competidores/[key]`), `/auditoria`,
`/reportes/[slug]`, `/asistente/*`, `/soluciones` y `/nosotros`. Quien llega a
una ficha tiene que salir de ella para saber qué exige el pliego o contra quién
compite, y la ficha, a cambio, le dice "todavía no hay requisitos extraídos"
aunque el extractor exista.

La ficha es la unidad del producto. Lo que un oferente necesita para decidir si
se presenta a **este** proceso vive en **esta** ficha, recortado a lo que este
proceso necesita, no como una página genérica aparte.

## Decisiones tomadas (usuario, 2026-09-27)

1. **Se borran las siete páginas.** `/reportes/[slug]` es el destino de los
   enlaces del correo de alertas, pero el correo no se entrega en producción
   (PENDIENTES §0), así que no rompe nada vivo.
2. **El competidor entra como desplegable en la ficha**, recortado al proceso.
   Desaparece el perfil suelto `/competidores/[key]`.
3. **Los asistentes conversacionales se borran del todo.** Son para después de
   adjudicar, no para decidir si ofertar.

## Qué concepto va a qué sección de la ficha

| Página que se va | Concepto | Dónde vive en la ficha |
|---|---|---|
| `/pliego` | Extraer requisitos, presupuesto y causales de un pliego | §4 «Qué exige el pliego»: muestra lo extraído para este proceso (`pliego_proceso`) y, si no hay, ofrece subirlo ahí mismo. |
| `/competidores`, `/competidores/[key]` | Quién compite, cuánto gana, a qué precio, sanciones | §7 «Quién suele competir aquí»: cada rival se despliega con su historial **en procesos comparables**, su tasa de acierto, su relación adjudicado/estimado y sus sanciones. |
| `/auditoria` | «Qué me estoy perdiendo» por filtros demasiado estrechos | Se va sin sustituto en esta etapa. Su equivalente en la ficha («tu filtro X descartó este proceso por Y») exige consultar `al_descartes` por proceso; queda como candidato, no como compromiso. |
| `/reportes/[slug]` | Reporte congelado de un correo | Se va. El correo, cuando se entregue, enlaza a fichas. |
| `/asistente/*` | Chat de ejecución y operación de obra | Se va. |
| `/soluciones`, `/nosotros` | Marketing | Se van. |

## Criterios de aceptación

1. Ninguna de las siete rutas responde con página propia. Cada una redirige
   con un 308 (permanente) a su sitio más cercano: `/pliego` y `/soluciones` → `/licitaciones`;
   `/competidores` y `/competidores/[key]` → `/licitaciones/entidades`;
   `/auditoria` → `/mis-filtros`; `/asistente/*`, `/reportes/*` y `/nosotros`
   → `/`. Un enlace viejo nunca da 404.
2. No queda ningún enlace interno, ninguna entrada en `SECCIONES_HOME`, en el
   sitemap, en `robots.ts` ni en `PROTECTED_PREFIXES` a esas rutas.
   `enlaces.test.ts` y `acceso.test.ts` siguen en verde.
3. El código que solo servía a esas páginas desaparece con ellas: el grafo de
   imports no deja archivos huérfanos (mismo criterio que la limpieza del
   2026-09-27). Las tablas se quedan: soltarlas es un `DROP` sobre la base viva
   y se decide aparte.
4. **§4 de la ficha**: si `pliego_proceso` tiene fila para el proceso, se ven
   los requisitos habilitantes, el presupuesto y las causales de rechazo
   extraídos, cada uno con su origen (reglas o modelo) y sin inventar: lo que el
   pliego no declara sale como `NO_ENCONTRADO`. Si no hay fila, quien tenga el
   nivel de `pliego_extraer` puede subir el PDF desde la ficha; el resto ve qué
   haría falta para tenerlo.
5. **§7 de la ficha**: cada rival de la tabla es un `<details>` (funciona sin
   JS) que al abrirse muestra su historial **en procesos comparables** (mismo
   tipo y departamento), no su perfil global. La agrupación pasa de
   `proveedor_nombre` a `proveedor_key`, que es la llave real del competidor.
6. El rendimiento de la ficha no baja: el desplegable no añade consultas por
   rival al render inicial.
7. Nada de esto cambia la portada.

## Fuera de alcance

- Soltar tablas (`conversacion`, `mensaje`, `documento`, `al_reportes`,
  `lista_espera_mercado`).
- Rehacer `/mis-coincidencias`, `/mis-filtros` y `/perfil` alrededor de la ficha.
- El aviso de descartes dentro de la ficha (ver tabla).
