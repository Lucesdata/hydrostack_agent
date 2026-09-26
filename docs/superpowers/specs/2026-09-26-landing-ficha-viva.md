# Landing — la Ficha Viva como centro (2026-09-26)

## Qué y por qué

La Ficha Viva es el centro del producto: cada proceso de SECOP II tiene una
ficha que lo interpreta y ayuda a un ingeniero con poco tiempo a decidir desde
el móvil. La portada y el mapa existen para **llegar a una ficha**. Hasta hoy
la portada no decía qué es una ficha, y el ticker "SECOP · en vivo" mandaba
cada proceso a la lista genérica, no a su ficha.

Esta entrega hace que la portada **exprese gráficamente** lo que un recorrido
real (la prueba de Codex) debe encontrar, sin prometer nada que no exista.

## Criterios de aceptación (lo que la prueba debe poder comprobar)

1. Desde la portada se llega a una ficha en **dos clics** como máximo: mapa o
   lista → faceta del departamento → ficha; o ticker → ficha directamente.
2. El ticker se llama **"Fichas recientes"** y cada elemento abre
   `/licitaciones/[slug]` cuando la fila sale de la base. Si sale del SECOP en
   vivo (fallback) va a `/licitaciones`, porque esa ficha podría no existir.
3. La sección **"La Ficha Viva"**, justo después del hero, muestra:
   - las cuatro preguntas: ¿Puedo participar?, ¿Qué me falta?, ¿Dónde consta?,
     ¿Qué hago ahora?, cada una con su **estado real** (Disponible / Depende
     del pliego / En construcción);
   - un **esquema** de ficha rotulado como ilustrativo, sin nombres ni cifras;
   - el **árbol de decisiones** (recibe ofertas → requisitos y datos → cumple /
     subsanable / no), con la salida «todavía no puedo determinarlo»;
   - la leyenda de color por tipo y los CTA a fichas y al diagnóstico.
4. **Color = tipo de obra**, siempre con su nombre: azul agua potable
   (acueducto, PTAP), marrón aguas residuales (PTAR), gris redes y
   alcantarillado, contorno punteado para `otros`. Aparece igual en el hero,
   el ticker, la sección y el chip de tipo de la ficha. El estado va aparte.
5. La navegación dice **"Fichas de procesos"** (decisión C del 2026-09-21); la
   ruta `/licitaciones` no cambia.
6. **Nada se promete de más**: "Seguir sus cambios" figura como *En
   construcción*, y no se ofrecen alertas por correo como paso siguiente porque
   hoy no se entregan (PENDIENTES §0 y §21).

## Lo que existe, lo que no

| Capacidad | Estado | Dónde |
|---|---|---|
| Semáforo de 5 compuertas, sin cuenta | Existe | ficha §2, `SemaforoConPerfil` |
| Requisitos del pliego | Existe el extractor; falta que cada pliego se procese | ficha §4 lo declara |
| Fuente de cada dato / expediente | Existe (separa SECOP y pliego, enlaza expediente) | ficha §3, §6, §9 |
| Siguiente paso | Existe: expediente y perfil/diagnóstico | ficha §9, `/diagnostico` |
| Cambios del proceso (adendas, estados) | **No existe** en la ficha | `contrato_evento` sin usar aquí |
| Alertas por correo | Código hecho, **no entrega en prod** | PENDIENTES §0, §44 |

## Archivos

- `src/lib/classify/tipo-color.ts` — color por tipo (presentación), medido en
  `src/__tests__/design/tipo-color.test.ts` (3:1, WCAG 1.4.11).
- `src/components/landing/ficha-viva/` — la sección.
- `src/components/landing/ProcesosTicker.jsx`, `src/lib/secop/recientes.ts` —
  ticker de fichas con tipo y enlace.
- `src/components/landing/hero-territorial/HeroTerritorial.jsx` — CTA y tipos
  con color.
- `app/licitaciones/[slug]/page.tsx`, `src/components/secop/ficha/estilos.ts` —
  chip de tipo con color y migas "Fichas de procesos".
- `src/components/landing/seccionesHome.js` — nombre del destino.
