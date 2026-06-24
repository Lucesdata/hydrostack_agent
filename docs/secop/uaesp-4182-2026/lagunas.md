# Inconsistencias detectadas en el pliego

Estas son inconsistencias del **pliego mismo** (no de la extracción). Cada una está confirmada con páginas exactas. Material útil para entrenar/validar un futuro "validador de coherencia del pliego" — que es probablemente uno de los productos más vendibles que emergen de la sonda Fase 0.

## Inconsistencias confirmadas

### 1. Tres numeraciones distintas para los mismos ítems del presupuesto [ALTA]

El mismo conjunto de 8 PTAPs × 3 actividades aparece con tres códigos distintos en el mismo documento:

- Sección 1.2 "Alcance del objeto" (p.2–4): **1.1.70.x**
- Sección 1.3 "Valor estimado", tabla de techos (p.5–8): **1.1.72.x**
- Excel "FORMATO OFERTA ECONOMICA" que el proponente debe diligenciar: **1.1.73.x**

No hay adenda que aclare cuál numeración es la oficial para evaluación. La causal de rechazo #17 sanciona "modificar, alterar o incluir apartes, descripciones, cantidades o unidades de medida que impidan la evaluación del formato" — el proponente queda en zona de riesgo según qué entienda cada evaluador.

### 2. Sección 1.1 "Ubicación" omite Felidia [MEDIA]

- Sección 1.1 (p.1–2): lista 7 sitios sin "PTAP Felidia"
- Sección 1.2 "Alcance" (p.2–4): lista 8 sitios incluyendo Felidia
- Sección 1.3 "Valor estimado" (p.5–8): lista 8 sitios incluyendo Felidia
- Excel: 8 sitios incluyendo Felidia

El número oficial es 8. La sección 1.1 está incompleta.

### 3. Inconsistencia en puntaje de "Vinculación de personas con discapacidad" [MEDIA]

- Tabla resumen de criterios de calificación (p.59): asigna **2 puntos**
- Detalle de la sección 4.7 (p.69): "UN (1) punto adicional"
- Tabla interna de la sección 4.7 (p.70): "MAX PUNTAJE ASIGNADO: 1"
- Criterios de desempate (p.79) y reducciones (p.71): tratan el puntaje como 1

Suma con 2 puntos = 100. Suma con 1 punto = 99. La tabla de p.59 está mal; el resto del pliego es coherente en 1 punto.

### 4. Texto residual de plantilla de obra civil en pliego de consultoría [BAJA]

- p.57-58 (sección de equipo humano): "El proponente deberá expresar en letras y números el valor de la propuesta. El proponente debe considerar e incluir dentro de este monto **por metro cúbico** los costos del personal requerido, equipos, insumos, maquinaria, vallas..."
- Mismo párrafo: "dotación necesaria para el cumplimiento de las normas de seguridad industrial... Carné y dotación de **pantalón, camisa, casco y botas de seguridad**".

"Por metro cúbico" no aplica a un servicio de consultoría que entrega informes. Ropa de obra tampoco. Son frases que sobrevivieron de una plantilla de obra civil sin depurar.

## Sub-lagunas: archivos no analizados que el pliego refiere

### 5. Anexo 3 – Minuta del Contrato [ALTA]

Capítulo IX (p.89) dice: *"La minuta del contrato... está contemplada en el Anexo 3 – Minuta del Contrato. Dentro de estas condiciones se incluye la **forma de pago, anticipo y/o pago anticipado**, obligaciones y derechos generales del contratista, obligaciones de la entidad, garantías, multas, cláusula penal y otras condiciones..."*

Sin ese anexo no se conoce el esquema de desembolsos. Es información necesaria para que un proponente cotice flujo de caja correctamente.

### 6. Matriz de Riesgos [MEDIA]

Capítulo VI (p.82) la refiere como anexo separado, sin reproducirla en el pliego.

## Recomendación de uso

Cuando exista el "validador de coherencia del pliego", estas 6 inconsistencias son los casos de prueba:

| # | Tipo de detección | ¿El agente actual lo detectó en Fase 0? |
|---|---|---|
| 1 | Mismo ítem con códigos distintos en distintas secciones | Sí |
| 2 | Conteo de elementos discrepante entre secciones | Sí |
| 3 | Tabla resumen no cuadra con detalles + suma total | Sí |
| 4 | Frases de plantilla incoherentes con el objeto contractual | Sí |
| 5 | Anexo referido no incluido en el paquete | Sí |
| 6 | Misma situación que 5 | Sí |

El "muro informativo" detectado en el gate de Fase 0 (Prompt 0.3) no es del agente — es de la entidad redactora.
