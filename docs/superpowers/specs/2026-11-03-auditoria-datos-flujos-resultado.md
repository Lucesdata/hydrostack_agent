# Auditoría de datos y flujos — 3 de noviembre de 2026

Rama: `fix/audit-data-flows-2026-11`. Base: `fa7a688` (`main`).
Petición: corregir el repositorio real y preparar PR; no fusionar ni desplegar a producción.

## Evidencia pública reproducida

- El [Radar institucional](https://aqualicita.com/licitaciones/entidades) muestra «GOBERNACION DE CALDAS · Antioquia». La [fuente oficial de la Gobernación](https://caldas.gov.co/130-informacion-general/3550-direccion-fisica) identifica NIT `890801052-1` y sede Manizales, Caldas.
- La [búsqueda REQ](https://aqualicita.com/licitaciones?numero=CO1.REQ.11285575) devuelve el proceso de Guayatá con ubicación no informada y cierre 6 de noviembre de 2026. La [búsqueda de su aviso NTC](https://aqualicita.com/licitaciones?numero=CO1.NTC.11139058) devuelve cero procesos, aunque la ficha publica ese enlace SECOP II.
- Consulta de solo lectura a [Socrata oficial, p6dx-8zbt](https://www.datos.gov.co/resource/p6dx-8zbt.json): para `id_del_proceso='CO1.REQ.11285575'`, `nit_entidad=891800896`, `departamento_entidad=No Definido`, `ciudad_entidad=No Definido`, `fecha_de_recepcion_de=2026-11-06T00:00:00.000`, `estado_del_procedimiento=Publicado`, `noticeUID=CO1.NTC.11139058`. Son metadatos de la fuente, no una comprobación del cronograma completo.
- La identidad y el departamento del Municipio de Guayatá se contrastaron en la [circular oficial BDME](https://fps.gov.co/assets/files/news/news_files/CIRCULAR%20BDME%20-%20MAYO%202025.pdf): NIT `891800896`, Municipio Guayatá, Boyacá. Se fija solo departamento, sin inventar coordenadas o dirección.
- `GET https://aqualicita.com/api/mis-procesos?ids=CO1.REQ.11285575` sin sesión devuelve HTTP 401. El navegador muestra «Guardar · entrar»; no se reprodujo un fallo general de guardados para visitantes anónimos.
- El expediente oficial de Guayatá conduce a reCAPTCHA. No se resolvió ni se sorteó: contenido, adendas y hora de cierre no se pudieron contrastar en SECOP II.

## Correcciones implementadas

1. `transform/writers.ts`: resolución de departamento independiente del alias municipal; municipio condicionado al departamento y alias cualificados desde `geografia`. Caldas departamento no se convierte en Caldas, Antioquia. Sedes contrastadas por NIT: Gobernación → Manizales; Municipio de Guayatá → Boyacá.
2. `mapCanonical.ts`, `orchestrator.ts`: la sede declarada (`departamento`/`ciudad`) se separa de `localizaci_n` contractual. El contrato conserva su propia geografía; no sobrescribe la entidad con su lugar de ejecución. Una sede ausente conserva la conocida, tanto entre escrituras como dentro del mismo lote.
3. `drizzle/0026_reparar_sedes_auditoria.sql`: reparación idempotente y limitada a esos dos NIT, incluyendo geografía de los procesos (que en la fuente de procesos representa sede de entidad). No altera localización contractual. No se aplicó a producción ni a una base conectada.
4. `secop/vitrina.ts`: búsqueda NTC mediante `noticeUID` de la URL oficial almacenada, además de identificador nativo/referencia. No transforma NTC a REQ por sufijo. Conserva cerrados, exactos primero y exclusión de eliminados.
5. `mis-procesos/validacion.ts`: acepta REQ y NTC en lectura por lotes, guardados, eliminación y visitas. Un NTC ya presente en `proceso` puede guardarse; si un NTC solo es un aviso, la búsqueda devuelve el REQ real y los botones usan ese ID. No se cambió autenticación ni se debilitaron políticas RLS.
6. `secop/url.ts` y consumidores: HTTPS y host exacto `community.secop.gov.co`, sin credenciales ni puertos alternativos. Se omiten dominios suplantados y enlaces ajenos en la ingesta, matching, recientes, ficha y adjudicaciones. La validación de origen no certifica que el expediente exista o sea accesible.
7. `transform/normalize.ts`, `secop/estados-abierto.ts`, `secop/etapa.ts`: rechaza fechas imposibles. Pruebas verifican vencimiento al cambiar el día en Colombia, cambio de cierre y estado en una segunda transformación, y prevalencia de cancelación. Se conserva la semántica DATE; no se inventan horas de cierre.

## Pruebas y revisión

- Regresiones nuevas: `transform/audit-geo.test.ts`, `secop/audit-links.test.ts`, `secop/audit-fechas.test.ts`, `secop/audit-flows.db.test.ts`; ampliación de la API de guardados.
- Pruebas SQL con PostgreSQL embebido PGlite y migraciones reales: búsqueda de NTC con sufijos REQ distintos; dos cuentas; guardar/quitar; rol sin bypass que no puede leer, insertar ni borrar guardados; transform completo; migración ejecutada dos veces; preservación de sede dentro de un lote.
- Se observaron fallos antes de corregir geografía, separación de sede, rechazo de NTC, búsqueda NTC, validación de enlaces, fechas imposibles y pérdida de sede durante deduplicación.
- Revisión independiente del diff: identificó la pérdida de sede durante deduplicación, reproducida y corregida; segunda revisión estática sin nuevos hallazgos concretos.
- Un error de tipos preexistente en `mis-procesos/estado-cliente.test.ts` (`Promise<unknown>`) se corrigió a `Promise<Response>` para permitir el control de tipos.

## Límites y puesta en servicio pendiente

- No hay credenciales de una cuenta de prueba ni de la base de producción. No se comprobó inicio de sesión real, refresco de cookies, configuración del rol de conexión ni guardados de una cuenta real. La evidencia de autenticación procede del contrato API y sus pruebas; RLS se ejecutó contra PGlite.
- No se afirma que el error histórico de guardados para cuentas REQ haya desaparecido: no se reprodujo en una cuenta real. No se añadieron políticas públicas para ocultarlo. Si continúa, comprobar sincronización de `usuario`, errores de conexión y rol de Drizzle con capacidad adecuada; nunca desactivar RLS.
- La cobertura DANE continúa siendo parcial. Otros NIT sin evidencia siguen sin resolver; no se deducen sedes a partir del objeto contractual.
- No se contrastaron todas las adendas ni todos los enlaces del catálogo. Para Guayatá, la fecha del dataset coincide con la ficha; SECOP II bloquea la revisión detallada con reCAPTCHA.
- Tras la revisión del PR, la migración 0026 debe aplicarse por el procedimiento de base de datos autorizado. Una simple ejecución del transform no repara todos los históricos: los payloads ya consumidos están vacíos. Después se deben invalidar las páginas almacenadas y verificar radar, ficha y búsquedas en un entorno autorizado.
- No se fusionó con `main`, no se ejecutaron migraciones remotas ni se desplegó a producción.

## Resultado de controles

- `npm test -- --maxWorkers=1`: **191 archivos, 1615 pruebas pasadas**, salida 0, 68,39 s.
- Regresiones y API dirigidas: **31 pruebas pasadas**, salida 0.
- `npx tsc --noEmit`: salida 0.
- `npm run lint`: salida 0; cinco avisos existentes en Navbar, DiagnosticoApp y PortadaCliente, fuera de los archivos corregidos.
- `npx prettier --check .`: salida 0. El comando literal de CONDUCTA con glob `src/**/* app/**/*` intenta interpretar fuentes WOFF y licencias TXT como código; se verificó con el comando de CI, que respeta los ignores.
- `git diff --check`: salida 0.
- `npm run build`: **no completado**, `ENOSPC: no space left on device` durante webpack. No se afirma compilación correcta; pendiente CI/entorno con espacio. Se eliminaron únicamente la caché de descargas creada por esta instalación y los archivos `.next` de este intento.
- Un primer intento completo de pruebas también se interrumpió por ENOSPC; otro intento con threads se detuvo para reducir consumo de recursos. La ejecución final anterior, con un solo proceso trabajador, sí terminó en verde.
- La CI remota y el preview no se consideran aprobados por estas pruebas locales; se revisarán en el PR.
