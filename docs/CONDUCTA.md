# Reglas de conducta del agente — fase de escalamiento

**Fecha:** 2026-09-20 · **Alcance:** trabajo nuevo, de aquí en adelante.

Este documento es **aditivo**. No reemplaza ni corrige a `CLAUDE.md`, que sigue
siendo la referencia de dominio, de seguridad y de decisiones ya medidas. No
declara deuda, no abre tareas de migración y no obliga a tocar nada que hoy
funcione.

Nace de un spec de "spec-driven development" propuesto el 2026-09-19. De aquel
borrador se conserva lo que cambia **cómo se trabaja**; se descartó lo que
obligaba a reescribir código en producción (capa de repositorios y DTOs,
prohibición retroactiva de `localStorage`, supresión del `overall` del
veredicto) y lo que describía un stack que no es el de este repo.

**Regla de precedencia:** ante una contradicción entre este documento y un hecho
verificado en el repositorio o en la base viva, **gana el repositorio**. Estos
documentos envejecen; el código no miente. Si aparece la contradicción, se
corrige aquí y se dice.

---

## 1. Antes de tocar: reconocer

Antes de escribir código, leer y **reportar qué existe ya** para esa
funcionalidad. Prohibido crear un archivo nuevo si ya hay uno que cumple ese rol.
Si no está claro dónde vive algo, preguntar; no adivinar.

Vale igual para los datos: una función nueva se alimenta de lo que ya hay
ingerido (`db-search.ts`, `agregados.ts`, las tablas `al_*`), nunca de SECOP en
vivo.

## 2. Alcance cerrado

Nada de trabajo no pedido: refactors de paso, renombrados, mejoras de estilo,
optimizaciones oportunistas, dependencias nuevas. Lo que merezca arreglarse se
anota en `PENDIENTES.md` con su porqué y se sigue con la tarea en curso.

Una dependencia nueva es una decisión del usuario, no del agente. El caso del
mapa lo ilustra: una librería cuesta 40–150 kB sobre una portada que hoy está en
113 kB de First Load JS, y el criterio de aceptación dice que el rendimiento
móvil no puede bajar (`docs/rediseno-2026-09/TRASPASO.md` §6 ter).

## 3. Una cosa a la vez

Si el mensaje pide tres cosas, se confirma el orden y se hace la primera.

## 4. Flujo de trabajo

```
spec   → QUÉ se construye y por qué, con criterios de aceptación. Sin tecnología.
plan   → CÓMO. Archivos afectados, decisiones técnicas, riesgos.
tareas → lista ordenada, cada una verificable por separado.
implementar → una tarea a la vez.
validar → contra los criterios de aceptación, no contra la impresión general.
```

**Dónde viven.** En los sitios que ya existen, no en la raíz del repo:

- Módulos del SDD → `docs/sdd/NN-modulo.md`. `docs/sdd/00-esqueleto.md` es la
  fuente única del esquema: si un módulo necesita una tabla, se añade allí
  primero.
- Trabajo suelto → `docs/superpowers/specs/` y `docs/superpowers/plans/`.
- Pendientes y hallazgos → `PENDIENTES.md`.

**Cuándo hace falta plan aprobado**, medido por riesgo y no por número de
archivos:

- toca el esquema o una migración,
- toca auth, RLS o cualquier consulta sobre datos de cuentas,
- toca la ingesta, el clasificador o el extractor,
- cambia una ruta pública o su estrategia de render,
- o son más de tres archivos de producción.

Un arreglo pequeño y verificable no necesita ceremonia.

**Vía rápida.** Un fallo en producción se arregla primero: corregir, añadir el
test de regresión y documentar después. Se deja constancia de que se usó esta
vía. El precedente es el layout con cookies que tumbó 43 rutas con 500 y se
arregló el mismo día.

## 5. Calidad

- Toda función nueva de dominio —cálculo, clasificación, matching, agregación—
  nace con su test. El repo tiene 110 archivos de prueba; el listón está puesto.
- Nada de `catch {}`. Los errores se registran y se propagan. Hoy hay cero en el
  repo y así se queda.
- Los cambios en ingesta o extracción se instrumentan por etapa.
- Antes de decir que algo funciona, se ejecuta y se pega la salida:

```
npm test
npm run build      # con el preview PARADO
npm run lint
npx prettier --check "src/**/*" "app/**/*"
```

## 6. Prohibiciones

- **No inventar campos ni cifras.** Si el pliego no lo declara, vale literalmente
  `NO_ENCONTRADO` (`src/lib/pliego/schema.ts`). Si la tabla está vacía, se dice
  que está vacía; `requisitos_proceso`, `pliego_proceso` y `documento` están a 0
  filas y eso condiciona qué se puede construir.
- **El `overall` del veredicto se agrega de las cinco compuertas, nunca se emite
  por su cuenta.** Existe y está en producción (`verdict.ts`), pero sale de
  `aggregateVerdict`; no hay un juicio global calculado aparte.
- **No cambiar `--bg` ni `--accent`.** La decisión se midió el 2026-09-15 y está
  razonada en `CLAUDE.md` §3. Cualquier color de estado nuevo se mide antes:
  `src/__tests__/design/contraste.test.ts`.
- **Toda tabla nueva nace con `.enableRLS()`** en el esquema Drizzle. Es la regla
  que impide repetir la exposición del 2026-08-26.
- **Estado nuevo de negocio va al backend**, no a `localStorage`. El perfil de
  oferente anónimo que hoy vive ahí **se queda como está** hasta que se decida su
  persistencia (TRASPASO §7, punto 7); esta regla no lo declara deuda ni obliga a
  migrarlo.
- No tocar `node_modules`, `.env`, migraciones ya aplicadas ni el historial de
  git.
- No añadir secciones de marketing a la portada.

## 7. Vocabulario

Los términos del código, sin sinónimos nuevos ni traducciones.

- **Proceso** — una licitación de SECOP II.
- **Ficha** — la vista de un proceso: `/licitaciones/[slug]`, con slug
  `texto-legible--CO1.REQ.N` (el doble guion es deliberado).
- **Pliego** — el documento de condiciones.
- **Compuertas** — las cinco del semáforo, con el nombre que llevan en
  `src/lib/secop/verdict.ts`: `sectorial`, `cuantia`, `plazo`, `ubicacion`,
  `habilitacion`. No "SECTOR" ni "ZONA".
- **Estados de compuerta** — `PASS`, `FAIL`, `UNKNOWN`, `NA`, y `DATO` en la
  lectura sin perfil (TRASPASO §4.10).
- **Nivel 0 / 1 / 2** — profundidad del análisis: qué dato hace falta para
  resolver la compuerta (`metadata` en Nivel 0, `document` en Nivel 2). **No es
  el plan del usuario.**
- **anonimo / gratis / pro** — niveles de acceso, en
  `src/lib/acceso/politica.ts`. Eje distinto del anterior. Toda capacidad nueva
  se declara ahí, no con un `if (user)` suelto.
- **Tipo de proyecto** — `acueducto | alcantarillado | ptap | ptar | otros`, y
  solo esos cinco, desde `TIPOS_PROYECTO`.
- **Oferente** — la empresa que se presenta. **Entidad** — quien convoca.
- **Subsanable** — requisito corregible tras presentar la oferta.

**Estructura de la portada** tal como la define el rediseño en curso: ticker,
hero con mapa, banda de métricas, "Navega por los datos", vitrina, más el nav y
el pie derivados de `seccionesHome.js`.

## 8. Comunicación

- Español.
- Lo que no se sabe, se dice. No se rellenan huecos con suposiciones plausibles.
- Al terminar: qué cambió, en qué archivos y qué queda por verificar.
- Sin resúmenes largos de trabajo obvio.
