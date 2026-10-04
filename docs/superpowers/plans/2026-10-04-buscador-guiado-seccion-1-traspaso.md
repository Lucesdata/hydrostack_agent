# Buscador guiado — cierre y traspaso de sección 1

## Alcance ejecutado

Sección 1 autorizada el 2026-10-04: motor de búsqueda, validación y API.
Corresponde a las tareas 1 y 2 del plan `2026-10-04-buscador-guiado.md`.
La interfaz, Guardados y Recientes no forman parte de este cierre.

Rama: `codex/buscador-guiado-diseno`. Copia de trabajo:
`/Users/giovannyguevaraduque/.codex/worktrees/hero-contexto-tipo/hydrostack 2`.
La carpeta original del usuario conserva sus cambios previos.

## Cambios y contrato disponible

- `busqueda-guiada.ts`: catálogo de sistemas/actividades, agrupación de tipos,
  patrones de actividad y validación de entradas.
- `types.ts`: campos opcionales modo, sistema, actividad, numero; coincidencia
  exacta/parcial opcional en los procesos devueltos por búsqueda numérica.
- `parse-query.ts`: interpreta criterios y rechaza entradas guiadas inválidas.
- `db-search.ts`: predicados compartidos para resultados/conteos, búsqueda
  numérica literal y orden estable. Conserva consultas anteriores.
- `/api/secop`: admite el contrato nuevo. Devuelve 400 por criterios inválidos
  y 503 ante fallo de base en modo guiado, sin red alternativa ni detalles
  internos. Las consultas antiguas conservan la fuente alternativa existente.

Ejemplos de peticiones disponibles en la API local cuando se levante el proyecto:

```text
/api/secop?modo=tema&sistema=ptar&actividad=consultoria&apertura=Abierto&pageSize=5
/api/secop?modo=tema&sistema=potable&actividad=operacion&apertura=Abierto
/api/secop?modo=tema&actividad=muestreo&apertura=Abierto
/api/secop?modo=numero&numero=CO1.REQ.5720221
/api/secop?modo=numero&numero=OBR-SCC-081-2023
```

`potable` agrupa Acueducto y PTAP; `residual`, Alcantarillado y PTAR. Sin sistema
no se restringe el subsistema; sin actividad no se filtran menciones. Los valores
individuales y rótulos salen del catálogo de tipos existente.

En modo número solo se aplican identificación, exclusión de filas retiradas y
paginación: no se limita la apertura, departamento, estado o presupuesto.
Se normalizan espacios exteriores y se ignoran diferencias de mayúsculas.
La igualdad completa tiene prioridad sobre coincidencias parciales, con
identificador como desempate. Varias entidades con igual referencia permanecen
como resultados separados. `%`, `_` y barra inversa son caracteres literales.

Los criterios temáticos se combinan. La palabra libre conserva el alcance
existente: objeto y entidad. La actividad mira objeto y descripción, sin
distinguir mayúsculas o tildes. El servidor no agrega veredictos ni lee cuentas.

## Evidencia de verificación

Antes de implementar, las pruebas nuevas fallaron por criterios ignorados,
filtros ausentes y caída incorrecta a la fuente alternativa. Después:

- 68 pruebas focalizadas en los cuatro archivos de búsqueda/API y parser.
- Suite completa: 153 archivos, 1.357 pruebas correctas.
- `npm run build`: correcto; explorador sigue estático y portada sin cambios.
- `npm run lint`: sin errores, conserva avisos anteriores en componentes ajenos.
- Prettier: todas las extensiones de código de src/app correctas. Se usó la
  copia cacheada con `npx --offline`; las fuentes binarias no son entradas de formato.
- Presupuesto de portada: JS 106,4 KiB de 125; fuentes 89,1 KiB de 100.
- `graphify update .`: actualizado mediante AST, sin extracción semántica.

Las consultas y el conteo se probaron con PGlite y todas las migraciones reales,
con referencias duplicadas, procesos cerrados/retirados, valores nulos,
paginación, caracteres literales y separación de cachés por criterios.

También se probaron seis peticiones HTTP reales contra `next start` y Supabase
en solo lectura: identificador, referencia y tema respondieron 200; apertura
mal escrita y sistema inexistente respondieron 400; número inexistente devolvió
200 con cero resultados. PTAR + Consultoría devolvió 476 en 2,4 s en esa pasada;
la referencia devolvió el proceso de Chipatá como exacto en 0,6 s. El servidor
local se detuvo después de la comprobación.

La revisión independiente de sección 1 no encontró fallos críticos. Señaló
que el parser antiguo descartaba apertura/orden mal escritos antes de validar:
en modo guiado eso podía ampliar una búsqueda. Se reprodujo con cuatro pruebas
fallidas y se corrigió; la suite completa y compilación posteriores pasaron.
Las consultas antiguas conservan su normalización por compatibilidad.

## Verificación con datos reales y límites

Se leyó una muestra pública de 18 procesos (tres por cada actividad) en Supabase
con transacción de solo lectura. Ejemplos: CO1.REQ.11142911, muestreo en objeto;
CO1.REQ.11145242, mantenimiento/muestreo solo en descripción con título
«UNIVERSIDAD MARIANA»; CO1.REQ.11144554, interventoría que menciona construcción.
Dos fragmentos reales están reproducidos en fixtures con ids sintéticos.

El catálogo filtra **menciones de actividad**, no afirma que esa sea la
actividad contractual dominante. Un proceso puede aparecer en Obras e
Interventoría o en Operación y Muestreo. Los textos contradictorios de SECOP
no se corrigen ni se recategorizan en este trabajo. No se modificó el clasificador.

Lecturas reales sin caché desde esta conexión (no medición de producción):

| Consulta | Coincidencias | Tiempo de resultados + conteo |
|---|---:|---:|
| PTAR + Consultoría, abiertos | 476 | 6,2 s |
| Muestreo, abiertos | 4.068 | 12,1 s |
| Identificador CO1.REQ.5720221 | 1 exacta | 1,3 s |

Los conteos son observaciones del momento y no cifras fijas para la interfaz.
La segunda sección deberá mostrar carga y cancelación correctamente y medir
la experiencia desde el preview. Si necesita optimización adicional, se
planteará con evidencia y alcance explícito; no se añadió una migración de índices.

## Punto exacto para continuar

Leer spec, plan y este documento. Iniciar la tarea 3 (explorador con criterios
conservados y alternativa sin JavaScript), después la tarea 4 (formulario en
el hero) y la validación de interfaz. Usar las funciones y catálogos ya
existentes; no volver a implementar la API. El usuario pidió detenerse al
terminar esta sección: la sección 2 requiere su indicación de continuar.

La sección 1 se conserva en commits locales; no está desplegada. El PR debe
contener revisión y los cinco checks exigidos por CONDUCTA antes de integrar.
No fusionar main ni desplegar por interpretar este traspaso como autorización.

Commits de implementación:

- `c13f897`: validación y contrato de búsqueda guiada.
- `0362576`: consultas, API y pruebas de integración.
- `e9b5f4c`: corrección de apertura/orden inválidos, cubierta con regresiones.

Para preparar el PR, recordar que esta rama local conserva como antecedente
`856e9b5` (punto 1 del hero), ya desplegado mediante squash en PR #106. Alinear
la rama de entrega con main sin incluir de nuevo esa corrección ni modificar
los cambios locales del usuario. Esto no requiere volver a implementar el buscador.
