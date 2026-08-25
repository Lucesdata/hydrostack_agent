# Plan — Completar el recorrido del oferente (Fase B)

Fecha: 2026-08-24
Mapa visual: https://claude.ai/code/artifact/b29230b1-97eb-47e9-a146-75a431837210

Este plan dice **qué** construir y **en qué orden**. No baja a archivos ni a
campos: eso se especifica paso a paso, justo antes de construir cada uno.

Punto de partida: el recorrido del oferente tiene siete etapas. Las etapas
01, 02 y 03 (encontrar procesos, saber si califico, descifrar el pliego)
están instrumentadas. Las etapas 00, 04, 05 y 06 no. Este plan cierra 00 y
05, prepara 06, y deja 04 para el final por las razones del §2.

---

## 1. La regla que gobierna el plan

Referencia analizada: **Tendios** (plataforma española de licitación
pública con IA, generalista: +2M licitaciones, +50 portales, España y
Europa) y **Licitabot** (misma categoría, centrada en generar la oferta).

### El filtro

Ante cualquier pantalla de Tendios que dé ganas de copiar, la pregunta es:

> **¿Esto funciona con cuarenta procesos al mes, o necesita cuarenta mil?**

Si necesita cuarenta mil, no es para nosotros por muy bien resuelto que
esté. Tendios está diseñado para reducir abundancia. HydroStack vive en la
escasez: un sector, un país, una fuente. La escasez no pide herramientas de
criba — pide que le digas al usuario *estos son los ocho que te sirven, y
por qué cada uno*.

### Lo que copiamos literalmente

1. La mecánica del alta: tres pasos → pantalla «hemos configurado lo
   siguiente para ti» → aterrizar en resultados propios.
2. La pregunta de experiencia en tres niveles, en vez de pedir
   credenciales: *quiero empezar a licitar* / *ya he presentado alguna* /
   *tengo amplia experiencia*.
3. La partición de la navegación en dos mitades: **Descubrir** y
   **Gestionar**.
4. El principio de que el usuario nunca ve una pantalla vacía.

### Lo que NO copiamos

- El pipeline de seis estados de CRM comercial. El nuestro es más corto y
  lleva `Subsanando`, que el régimen español no tiene.
- Organizaciones, Contactos, Directorios. Es maquinaria para equipos
  comerciales con volumen que nuestro usuario no tiene.
- Las facetas y colecciones de un buscador de masa.
- La promesa de volumen en la portada («encuentra y gana más»).
- Un agente de chat generalista. Los dos asistentes con contexto acotado
  que ya existen son mejores para este caso.

### Lo que no se toca porque ya es la ventaja

- El **semáforo de cuatro compuertas con razón auditable**
  (`src/lib/secop/verdict.ts`), incluida la decisión de que `HABILITACIÓN`
  devuelva `UNKNOWN` honesto. Tendios promete «solo las que puedes ganar»:
  un veredicto único. Copiar esa promesa sería tirar la mejor decisión de
  diseño del producto.
- El **extractor híbrido con contrato validado por schema** y marca de
  origen por campo (`src/lib/pliego/`).

---

## 2. Los cuatro movimientos

### Movimiento 1 — El alta que configura
**Cierra:** etapa 00 (¿puedo ofertar?) y ordena la escalera de identidad.

Tres preguntas que terminan entregando cosas hechas: quién eres (NIT,
autocompletado contra los contratos ya ingestados), cuánto has licitado
(tres niveles), dónde y en qué (sector y zona — el perfil mínimo que ya
existe, movido delante del login).

**Entra:** el flujo de alta, el autocompletado por NIT, la creación
automática de la alerta y las coincidencias al terminar.
**No entra:** rediseñar la portada, tocar el buscador, pedir datos de RUP.

### Movimiento 2 — La oportunidad como entidad
**Cierra:** etapa 05 (seguir el proceso). **Conecta:** 02 con 06.

Una sola entidad nueva —guardar un proceso, con estado— le da memoria al
producto, conecta el pliego extraído con el proceso que lo originó, y le da
al asistente de ejecución el punto de partida que hoy no tiene.

Estados: `En revisión → Voy a presentar → Presentada → Subsanando →
Adjudicada / No adjudicada`.

**Entra:** guardar, estados, persistencia de la extracción, avisos de
cronograma sobre lo guardado.
**No entra:** valor del pipeline, ratio de victorias, dashboards. No hay
volumen que medir todavía.

### Movimiento 3 — El taller de la oferta
**Cierra:** etapa 04, el hueco principal.

Los requisitos extraídos se convierten en checklist con estado por
documento; el presupuesto se arma contra las cantidades extraídas con el
validador aritmético que ya existe en `validate.ts`. Aquí es donde el nivel
de pago deja de ser una promesa.

**Entra:** checklist de habilitantes, presupuesto validado.
**No entra:** generación automática de memoria técnica (es lo que hace
Licitabot y exige confiar a ciegas — no encaja con la línea de honestidad
del extractor).

### Movimiento 4 — Partir la casa en dos
**Cierra:** las decisiones D1 (¿un producto o tres?) y D3 (tres buscadores
para una intención).

Navegación en dos mitades. Las tres rutas de búsqueda colapsan en una.
`/soluciones` y `/asistente/operacion` salen de la espina del oferente.

### El orden y por qué

El orden **no** es 1 → 2 → 3 → 4. Es **1 → 2 → 4 → 3**.

- **1 va primero** porque todo lo demás necesita un perfil que valga algo.
- **2 va segundo** porque es la pieza vertebral: sin un objeto donde colgar
  el trabajo, cada etapa seguirá siendo una isla.
- **4 va tercero, no último**, porque es barato y porque solo tiene sentido
  cuando ya existen dos mitades que separar. Además, para entonces ya se
  sabrá cuál de los tres buscadores usa la gente, y colapsar deja de ser
  una apuesta.
- **3 va al final** aunque cierra el hueco más grande. Es la pieza que más
  tiempo seguido exige y la que más se beneficia de saber qué hace la gente
  con un proceso guardado.

> **La tensión honesta de este orden:** el movimiento 3 es donde está el
> dinero, y dejarlo al final significa que puede no llegar nunca. Si en
> algún momento aparece un usuario real dispuesto a pagar por armar su
> oferta, ese usuario tiene prioridad sobre este orden. El plan se salta.

---

## 3. El orden de trabajo

Doce pasos. Cada uno se cierra en una sesión corta y ninguno deja el
repositorio a medias si pasan días entre sesión y sesión.

| # | Paso | Terminado cuando |
|---|------|------------------|
| 1 | **Sacar la guía del principiante de donde está.** `/licitaciones/como-participar` deja de ser la cuarta pestaña y pasa a ser una puerta propia. Cambio de navegación, cero lógica. | Un visitante que nunca ha licitado la encuentra sin entrar en «Licitaciones». |
| 2 | **Preguntar la experiencia.** Campo de tres niveles en el perfil. Todavía no cambia nada más: solo se empieza a recoger el dato. | El dato se guarda y se puede leer. |
| 3 | **El perfil antes del login.** Sector y zona se eligen sin cuenta; al registrarse, la cuenta hereda lo elegido. | Alguien sin cuenta ve una muestra de sus coincidencias, y al registrarse no se le vuelve a preguntar. |
| 4 | **El NIT que ya sabe.** Autocompletado contra la tabla `contrato`: si ese NIT ya firmó, se precargan sector, cuantía típica y zona. | Con un NIT real, los campos llegan rellenados y el usuario solo confirma. |
| 5 | **La pantalla que entrega.** Al terminar el alta se crea la alerta, se calculan las coincidencias y se aterriza en `/mis-coincidencias` ya poblada. | Nadie ve una pantalla vacía después de registrarse. → **Movimiento 1 cerrado.** |
| 6 | **Guardar un proceso.** Botón «seguir este proceso» y su tabla. Sin estados todavía. | El usuario vuelve al día siguiente y encuentra lo que marcó. |
| 7 | **No perder el pliego.** La extracción se persiste y queda colgada del proceso guardado (hoy se pierde al recargar). | Recargar no borra el trabajo. |
| 8 | **Los estados.** Los seis estados, y los procesos agrupados por estado. | El usuario mueve un proceso de estado y lo ve reflejado. |
| 9 | **El calendario avisa.** Cierre y adendas de los procesos seguidos generan aviso, reutilizando la infraestructura de alertas que ya existe. | Un cambio en un proceso seguido llega por correo. → **Movimiento 2 cerrado.** |
| 10 | **Partir el menú.** Descubrir / Mis procesos. `/soluciones` y `/asistente/operacion` salen de la espina. | La navegación refleja las dos mitades. |
| 11 | **Un solo buscador.** Colapsar las tres rutas en una con densidad progresiva. | Existe una sola ruta de búsqueda. → **Movimiento 4 cerrado.** |
| 12 | **El taller de la oferta.** Movimiento 3, sin detallar todavía. | — |

El paso 12 se especifica cuando se llegue: lo aprendido en los pasos 6–9 va
a cambiar su forma, y escribirlo hoy sería adivinar.

---

## 4. Un bloqueo real antes del paso 2

`PENDIENTES.md` §11 deja abierta la regla **«no perfilar usuarios»** sin
alcance definido: no está decidido si aplica a la infraestructura de
cuentas y alertas (perfil de oferente, correo, hora de envío, con opt-in y
unsubscribe) o solo al tracking encubierto de visitantes anónimos.

Los pasos 2, 3 y 4 añaden datos al perfil. **Esa decisión hay que tomarla
antes**, y es una decisión de una frase que solo puede tomar el owner.

---

## 5. Lo que NO se hace en esta fase

- Nada de CRM comercial: organizaciones, contactos, directorios.
- Nada de dashboards con ratio de victorias hasta que haya volumen que
  medir.
- No se abren otros sectores. El alcance sigue siendo agua y saneamiento;
  «cualquier empresa o persona» se refiere al tamaño y la experiencia del
  oferente, no al sector.
- No se toca el semáforo ni el extractor.
- No se rediseña la portada hasta el paso 10.

---

## 6. Cómo se sabe si funcionó

Señales observables, no métricas de vanidad:

- **Después del paso 5:** de los que se registran, ¿cuántos vuelven al día
  siguiente?
- **Después del paso 6:** ¿cuántos procesos guarda una persona en su
  primera semana? Si es cero, el problema no es el seguimiento — es que la
  etapa 02 no está convenciendo a nadie.
- **Después del paso 8:** ¿alguien llega al estado `Presentada`? Ese es el
  primer momento en que el producto sirvió de verdad.
- **Antes del paso 11:** cuántos procesos de agua y saneamiento abre SECOP
  al mes. Ese número —el que ya calcula `getEnJuegoMes()`— decide si un
  buscador con filtros tiene sentido o si el producto entero debería ser
  una lista corta y bien explicada.
