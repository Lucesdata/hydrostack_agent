# Ejecución: ficha interactiva móvil

Alcance autorizado: llevar el boceto aprobado a producción, con acabado visual.
Reconocimiento: la rama local estaba atrasada; se creó
`codex/ficha-movil-interactiva` desde `origin/main` (2ec3ef9) conservando la rama
anterior. La base actual ya incluye PliegoFicha y RivalesFicha.

## Tres archivos de producción

1. `app/licitaciones/[slug]/page.tsx`: componer preguntas con contenido de
   servidor y fuentes. Reutilizar procesoPorSlug, pliegoDeProceso y
   competidoresComparables. Mantener `revalidate=43200` y parámetros estáticos
   vacíos. Conservar el día de las columnas DATE y serializar JSON-LD con el
   helper seguro existente.
2. `src/components/secop/ficha/ExploradorFicha.tsx`: nueva navegación local
   sobre contenido de servidor. Selección de sección en hash, Atrás/Adelante y
   apertura de Participar para `#pliego` y `#pliego=…`. Sin JS se leen todas.
3. `src/components/secop/ficha/estilos.ts`: pulir la composición sobre los
   tokens existentes, seis controles y una columna móvil. Sin nuevas fuentes.

## Verificación

- Base: 143 archivos, 1173 pruebas correctas antes del cambio.
- Regresión de la página: datos ausentes, sin JS, consultas existentes, origen
  geográfico, fechas DATE, pliego procesado, presupuesto y JSON-LD seguro.
- Prueba de accesibilidad existente: actualizar la ubicación del uso sr-only,
  ahora en el explorador de la ficha.
- Navegador: proceso real; 320, 390 y escritorio; todas las secciones; fuentes;
  navegación Atrás y regreso de subida; ausencia de desbordamiento.
- Suite completa, build con servidor parado, lint, formato y presupuesto.
- `graphify update .` tras los cambios.

## Publicación y recuperación

PR contra main, cinco checks verdes, comprobación del preview y merge conforme
a la autorización de publicación del usuario. Comprobar después una ficha real
en aqualicita.com. Si la ficha falla, el pliego queda inaccesible o la
navegación no responde, revertir el commit de este PR mediante otro PR; no hay
migraciones ni cambios de datos que deshacer.

## Límites conocidos

El mandato de formato con glob incluye 10 fuentes y licencias sin parser;
se conserva la configuración y se verifica también `prettier --check .`,
que es el comando de CI. Hay advertencias previas de lint ajenas a la ficha.

## Resultado de validación local (2026-09-30)

- `npm test`: 144 archivos, **1181 pruebas aprobadas**.
- `npm run build`: correcto; ficha estática, 99,7 kB de primera carga.
- `npm run lint`: sin errores; advertencias previas fuera de los archivos tocados.
- `prettier --check .`: correcto. El glob literal sigue incluyendo las 10
  fuentes/licencias sin parser descritas arriba.
- Presupuesto de portada: 109,0/125,0 kB JS y 89,1/100,0 kB de fuentes.
- Grafo actualizado sin API; `git diff --check` correcto.
- Navegador sobre el proceso CO1.REQ.11109351: secciones, fuentes, Atrás y
  regreso `#pliego=error:…` comprobados. Sin desbordamiento a 320/390 px;
  seis columnas a 1280 px. Al abrir Participar, el foco entra al panel y Tab
  alcanza «Define tu perfil y compara». No se subieron documentos de prueba.
- Revisión independiente aprobada después de recuperar el aviso de proceso
  cerrado y el foco al abrir Participar. El cierre tiene prueba de regresión.
