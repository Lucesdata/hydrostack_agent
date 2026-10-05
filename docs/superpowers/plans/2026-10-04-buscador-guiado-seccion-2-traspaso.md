# Buscador guiado — sección 2 completa localmente

Alcance autorizado con «ok sigue»: interfaz de las tareas 3 y 4. Guardados y
Recientes requieren su siguiente sección; este cierre no despliega.

## Resultado

El hero presenta Por tema/Por número. Sistema y actividad vienen del catálogo
canónico de la sección 1. El envío es explícito y devuelve cinco procesos
reales; cambiar de entrada conserva los borradores y cancela solicitudes. Los
resultados enlazan a la ficha y «Ver todos» conserva los criterios.

El explorador guiado recibe resultados desde el servidor, conserva filtros en
envíos/paginación/recarga y restaura modo y criterios con Atrás. Por número
incluye abiertos y cerrados y señala coincidencia exacta/parcial. Sin modo
permanece el explorador avanzado previo, sin modificar perfil ni coincidencias.

La ruta `/licitaciones/explorar` usa `force-dynamic` para leer `searchParams`.
Portada y facetas siguen estáticas. Formularios GET y enlaces paginados sirven
sin JavaScript; los radios nativos y CSS alternan ambos formularios. Ningún
dato de cuenta entra en la búsqueda pública ni se añadió persistencia local.

## Evidencia

- 156 archivos, 1377 pruebas correctas; compilación correcta.
- Lint correcto, con avisos anteriores; formato de los archivos cambiados correcto.
- Presupuesto de portada: 112,5 KiB de JavaScript frente a 125; fuentes 89,1 frente a 100.
- Ocho mediciones sobre los tokens reales del buscador oscuro: texto y botón AA,
  bordes de controles por encima de 3:1.
- Navegador local contra Supabase en modo de solo lectura: PTAR + Consultoría,
  476 resultados; vista previa de cinco y explorador con 25. Identificador
  CO1.REQ.5720221: un resultado exacto. Filtros conservados entre entradas,
  paginación, Atrás y regreso desde ficha comprobados.
- HTML sin scripts: alternar a número y enviar abrió el explorador con número
  correcto y resultado en servidor. Se usó copia temporal eliminada después.
- Móvil en un marco de 375 píxeles: ancho útil 369, documento 369 sin desborde;
  campos apilados, controles de 44 píxeles y botón de ancho completo.
- Carreras, cancelación, error de servicio y consulta inválida cubiertos por
  pruebas; aviso de validación comprobado en navegador sin resultados viejos
  ni enlace Reintentar. Graphify actualizado mediante AST.

## Revisión independiente

Un hallazgo importante corregido: Reintentar tras número inválido podía
ejecutar la consulta anterior. Los errores de validación ahora solo piden
corregir los campos; los de servicio permiten reintentar. Prueba RED→GREEN y
suite completa posterior. No hubo hallazgos críticos.

Dos detalles menores diferidos y comunicados al usuario: las filas muestran
referencia o identificador, no ambos simultáneamente; una página manual fuera
de rango muestra aviso vacío sin enlace para volver a la primera. La navegación
normal limita las páginas al total; los números y entidades siguen visibles.

Decisión de implementación: vista guiada independiente dentro del componente
existente para preservar los flujos del explorador avanzado. Si luego se exige
una sola interfaz, habrá que unificar controles; hoy evita modificar cuentas.

## Continuación

El trabajo está en `codex/buscador-guiado-diseno`, sin publicar. Conservar el
worktree gestionado y los commits de ambas secciones. Antes de preparar PR,
alinear la rama con main como explica el traspaso de sección 1: su antecesor
del punto 1 ya se fusionó por squash en PR106, no duplicar ese cambio.

Para Guardados/Recientes seguir el contrato de la segunda entrega del plan:
tablas con RLS, capacidades centralizadas, usuario derivado de sesión,
consultas aisladas por cuenta, respuestas privadas y registro de visita desde
cliente sin precarga. No se creó migración ni se simuló un botón Guardar.
