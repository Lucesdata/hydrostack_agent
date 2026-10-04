# Guardados y Recientes — traspaso

Sección implementada localmente, sin migraciones, dependencias nuevas ni despliegue. La implementación está en la rama `codex/buscador-guiado-diseno`; el backend quedó en `c1641d2` y la interfaz se conserva en los commits posteriores.

## Comportamiento

El buscador ofrece «Mis procesos». Resultados y ficha permiten guardar con cuenta gratuita; el visitante conserva la intención y la ruta de regreso al entrar o registrarse. Llegar a la confirmación no guarda: hace falta pulsar «Confirmar guardado». Un fallo conserva la intención y la búsqueda para reintentar.

Mis procesos separa los guardados explícitos (25 por página) de las diez últimas fichas visitadas. Las visitas se registran al montar una ficha visible, no por precarga. Borrar recientes requiere confirmación y conserva los guardados. Los cerrados siguen visibles; un retirado carece de enlace activo y se puede quitar. No se prometen correos ni seguimiento de cambios.

## Persistencia y acceso

Se reutiliza `senal_usuario`, con RLS y cascada existentes. Prefijos exclusivos `personal:guardado:v1:` y `personal:visita:v1:`; la cuota `uso:extractor_pliego` y otras señales no se modifican. Cualquier análisis futuro de intención debe excluir ambos prefijos personales.

Todas las operaciones privadas obtienen el usuario de la sesión verificada y filtran por `usuarioId`. Las mutaciones serializan operaciones de una misma cuenta bloqueando su fila en una transacción; guardar repetidamente no duplica ni altera su fecha. No hay caché persistente de datos personales en el navegador ni personalización dentro de la ficha estática.

Las respuestas privadas usan `private, no-store`. Las mutaciones de la API exigen Origin igual al origen de la petición. Decisión más estricta que aceptar también el origen canónico: una llamada entre dominio canónico y preview queda rechazada. Se conserva `usuarioId` del esquema existente, en vez de añadir `accountId`, por la prohibición de migraciones; el alcance es personal, sin propiedad de equipos.

Al volver o cambiar el foco se revalidan identidad y listas completas. Al salir o abandonar la página se oculta el contenedor personal y se cancelan respuestas anteriores. Una identidad distinta no puede mostrar el contenido inicial de la cuenta anterior.

## Verificación y revisión

Suite completa: 162 archivos y 1401 pruebas aprobadas. PGlite usa las migraciones ya existentes en un entorno local: dos usuarios, guardado repetido, separación de propietarios, trece visitas reducidas a diez, reordenación, borrado independiente, cerrados/retirados y cascada. Pruebas de API, acciones, retorno seguro, errores y cancelación de respuestas tardías completan la comprobación.

La revisión independiente encontró una actualización que conservaba filas iniciales y un retorno que perdía la intención al fallar. Ambos se corrigieron con pruebas que primero fallaron y después pasaron. El segundo hallazgo se consideró importante por impedir reintentar; no se difiere. No quedaron hallazgos menores nuevos pendientes de esta revisión.

Navegador local: resultado público de un proceso cerrado, acceso anónimo a Guardar y llegada al login con identificador y búsqueda preservados. No se creó una cuenta real ni se escribió información de prueba en Supabase. Los recorridos privados se verificaron con sesiones simuladas y pruebas locales; falta recorrer login real, dos cuentas y restauración de historial en un entorno de prueba. Tampoco se afirma haber probado un lector de pantalla real. Sin JavaScript funcionan enlaces y formularios de la página privada; no se garantiza limpieza de una imagen de caché del historial sin JavaScript.

Ejecutar para reproducir: `npm test`, `npm run build`, `npm run lint`, `npm run presupuesto`; Prettier sobre los archivos modificados compatibles, y `graphify update .`. El presupuesto exige JS ≤125 KiB gzip y fuentes ≤100 KiB. La construcción puede registrar indisponibilidad DNS de Supabase y usar los estados sin datos previstos; eso no valida datos vivos.

## Integración posterior

Cero cambios de esquema y en `drizzle/`. No aplicar migraciones. Antes de publicar, integrar mediante PR a main sin repetir el punto 1: PR106 ya se fusionó por squash. Esta sección se entrega localmente; publicar requiere continuar con la integración autorizada. Los dos menores anteriores del buscador de la sección 2 siguen fuera de este alcance.
