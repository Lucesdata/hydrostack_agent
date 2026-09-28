# Spec — Portada esencial (D)

**Fecha:** 2026-09-27 · **Plan:** `docs/superpowers/plans/2026-09-27-portada-esencial.md`

## Por qué

Hay quejas de usuarios: la portada «está muy cargada». Se midió y es cierto.
En el primer pliegue a 1440 × 900 hay 24 controles, 270 palabras, 34 cifras y
15 animaciones en marcha: el ticker, el fondo blueprint (rejilla, línea de
nivel, tres ondas y regla de profundidad) y el punto «en vivo». La portada
responde a la vez dónde hay procesos, cuánto dinero hay, de qué tipo, quién
contrata, cómo evoluciona, qué se publicó hoy y qué es una ficha.

La revisión visual del 2026-09-27 comparó cuatro direcciones con maquetas
navegables (artifact «Tres direcciones para la portada de AquaLicita», privado
del propietario). La elegida es **D · Esencial**: el primer pliegue responde una
sola pregunta, **dónde hay procesos abiertos y cómo llegar a sus fichas**.

## Qué se construye

1. **Sin ticker.** Decisión del usuario, 2026-09-27. A las fichas se llega por
   el buscador, el mapa y los procesos destacados del departamento.
2. **Sin fondo animado ni resplandor.** Fondo plano azul noche; el mapa sin
   `drop-shadow` ni degradados radiales detrás.
3. **Dos zonas en vez de tres.** A la izquierda: titular, una frase, el
   buscador de fichas, un botón y, debajo, el **resultado** del departamento
   elegido. A la derecha: el mapa.
4. **El resultado del departamento**: nombre, procesos abiertos, % del país,
   sus tres procesos abiertos de mayor presupuesto y un enlace «Ver las N fichas
   de X». Nada más.
5. **Controles del mapa plegados** en «Opciones del mapa»: colorear por
   procesos o monto, y filtrar por tipo. Misma función que hoy.
6. **La lista de los 33 departamentos plegada** en «Ver los 33 departamentos
   como lista». Sigue siendo la alternativa en texto del mapa.
7. **Cinco rótulos sin caja** (nombre y cifra con halo), no diez en cajas.
8. **Sin tooltip**: la vista previa al pasar el puntero la hace el resultado.
9. **Leyenda como una barra de escalones** bajo el mapa, en el mismo sitio en
   los dos modos. «Según ubicación de la entidad contratante» pasa a la cabecera
   del mapa.
10. **Rampa del mapa sin turquesa ni menta**: `--aq-e3..e5` pasan a
    `#3a9fe0`, `#7cc4f0` y `#c4e8fc`. `e0..e2` no cambian.
11. **Seleccionado visible** en cualquier escalón: anillo de dos tonos, como el
    foco. El trazo blanco solo sobre `#c4e8fc` daría 1,29:1.
12. **Ficha Viva condensada**: titular, las cuatro preguntas en una fila y un
    botón. Depende de la decisión pendiente 2 de abajo.

## Qué sale de la portada y dónde sigue

| Sale | Dónde sigue |
|---|---|
| Ticker de fichas recientes | — (decisión del usuario) |
| Botón «Diagnóstico sin cuenta» del hero | Pie y cierre de cada ficha |
| «Qué es gratis y qué pide cuenta» y la línea «N procesos del sector» | Pie: «Precios y acceso» |
| Monto en juego y entidades del departamento | `/licitaciones/comparar` |
| Reparto por tipo del departamento | `/licitaciones/tipo/[slug]` y el filtro del mapa |
| «Comparar con otros departamentos» | Pie: «Comparar departamentos» |
| Publicados en 7 días | `/licitaciones/comparar` (fila «Abiertos publicados en los últimos 7 días») |
| Serie semanal de publicados | **Ninguna otra página**: sale por decisión del usuario (2026-09-28) |
| Esquema, árbol, leyenda y «Seguir sus cambios» de la Ficha Viva | `/licitaciones/como-participar#como-razona` (decisión 2) |

## Qué no cambia

Fuentes de datos, rutas de páginas, el clic del mapa hacia la faceta (decisión
D), la sincronía mapa ↔ resultado, los escalones fijos (`escala.ts`), el rayado
de «sin procesos», la nota de la sede, el tema oscuro de la portada
(`.tema-oscuro`), `--bg` y `--accent` de `globals.css`, el color por tipo y sus
reglas.

## Criterios de aceptación

Medidos en Chromium sobre el preview, sin contar los 33 enlaces del mapa.
«Controles» son enlaces, botones, campos, selectores y desplegables visibles en
la ventana; «cifras», grupos de dígitos en texto visible.

1. En `/` no hay ticker ni fondo animado: `document.getAnimations()` en marcha
   = 0 tras la carga.
2. Primer pliegue a 1440 × 900: ≤ 12 controles, ≤ 200 palabras, ≤ 12 cifras.
3. Primer pliegue a 390 × 844: ≤ 6 controles.
4. A 1280 × 800, el nombre y la cifra del departamento elegido se ven sin
   desplazar la página.
5. La tierra del mapa mide ≥ 500 px de ancho a 1440 y a 1280 (hoy 415 y 522).
6. Nombre de rótulo ≥ 11 px y cifra ≥ 14 px en pantalla a 1440 (hoy 8,4 y 11,6).
7. En móvil el mapa empieza antes de y = 600 (hoy 779).
8. Siguen funcionando: el buscador de fichas, colorear por monto, filtrar por
   tipo, el clic a la faceta, la vista previa al señalar, la lista de 33 con
   teclado y el `aria-live` del resultado.
9. `contraste-oscuro.test.ts` pasa con la rampa nueva (vecinos ≥ 1,4:1) y la
   imagen para compartir usa la misma rampa.
10. `npm test`, `npm run build`, `npm run lint` y prettier en verde.

## Decisiones del usuario

1. ~~Publicados en 7 días y la serie semanal.~~ **Decidido el 2026-09-28:
   salen los dos.** Los 7 días siguen en `/licitaciones/comparar`; la serie
   semanal no queda en ninguna página.
2. ~~La Ficha Viva condensada.~~ **Decidido el 2026-09-28:** el esquema, el
   árbol, el aviso de «Seguir sus cambios» y la leyenda de color se mudan a
   `/licitaciones/como-participar`, en una sección con ancla `#como-razona`
   que la portada enlaza.
