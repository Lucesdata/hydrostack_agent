# Hydro_Agent — Paso 1: Implementación del primer Tool (`calculate_septic_tank`)

## Qué hace este paso

Implementa end-to-end el primer **tool** del agente IA de HydroStack:

1. **Función pura** de cálculo de fosa séptica (`lib/calculations/septicTank.ts`)
2. **Definición del tool** en formato Anthropic SDK (`lib/agent/tools/calculateSepticTank.ts`)
3. **Endpoint POST** (`/api/agent`) que implementa el **bucle de tool use** con llamadas reales
4. **Tests unitarios** que verifican la lógica
5. **Escalabilidad**: estructura lista para agregar 4-5 tools más sin refactoring

**Resultado**: El agente puede ahora procesar textos en lenguaje natural como *"Necesito dimensionar la fosa de una casa rural de 4 dormitorios"* y devolver cálculos reales basados en CTE DB-HS 5.

---

## Archivos creados/modificados

```
lib/
├── calculations/
│   └── septicTank.ts (NEW)                 # Función pura, sin React
├── agent/
│   └── tools/
│       ├── calculateSepticTank.ts (NEW)   # Tool definition + executor
│       └── index.ts (NEW)                  # Registry escalable
app/api/
└── agent/
    └── route.ts (NEW)                      # POST handler con loop
__tests__/
└── calculations/
    └── septicTank.test.ts (NEW)            # 7 test cases
docs/
└── agent/
    └── STEP-1-tool-use.md (NEW)            # Este archivo
```

### Cambios en env

Necesitas:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Cómo probarlo

### 1. Instala vitest (si no está instalado)

```bash
npm install -D vitest
```

### 2. Ejecuta los tests

```bash
npm test __tests__/calculations/septicTank.test.ts
```

Esperado: **7 passing**.

### 3. Arranca el servidor

```bash
npm run dev
```

### 4. Prueba el curl de aceptación

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Necesito dimensionar la fosa séptica de una casa rural de 4 dormitorios en el Pirineo. ¿Cuál sería el volumen?"
  }' | jq .
```

**Respuesta esperada:**

```json
{
  "reply": "Para una casa de 4 dormitorios (aproximadamente 6 habitantes equivalentes según CTE DB-HS 5), la fosa séptica debería tener un volumen útil de aproximadamente 2.400 litros, asumiendo una dotación de 200 L/hab·día y un tiempo de retención de 2 días. Esto significa dimensiones aproximadas de 3,1 m de largo × 1,55 m de ancho × 1,2 m de profundidad útil...",
  "toolCalls": [
    {
      "name": "calculate_septic_tank",
      "input": {
        "habitantes_equivalentes": 6,
        "tipo_uso": "vivienda_unifamiliar",
        "dotacion_litros_hab_dia": 200,
        "tiempo_retencion_dias": 2,
        "numero_compartimentos": 2
      },
      "output": {
        "volumen_util_litros": 2400,
        "volumen_total_litros": 2600,
        "dimensiones": {
          "largo_m": 3.10,
          "ancho_m": 1.55,
          "alto_util_m": 1.2,
          "alto_total_m": 1.5
        },
        "num_compartimentos": 2,
        "tiempo_retencion_dias": 2,
        "caudal_diario_litros": 1200,
        "caudal_segundos": 0.014,
        "validacion_cte": {
          "ok": true,
          "avisos": [],
          "cumple_minimo_he": true,
          "cumple_retencion": true,
          "cumple_profundidad": true
        }
      }
    }
  ]
}
```

---

## Cómo funciona

### Flujo de datos

```
Usuario (lenguaje natural)
    ↓
/api/agent POST
    ↓
Anthropic SDK (claude-opus-4-7)
    ↓
[Tool use detected]
    ↓
executeTool("calculate_septic_tank", { ... })
    ↓
lib/agent/tools/index.ts → executeCalculateSepticTank()
    ↓
lib/calculations/septicTank.ts → calculateSepticTank()
    ↓
[Resultado JSON]
    ↓
Modelo reinterpreta resultado + genera respuesta en lenguaje natural
    ↓
/api/agent respuesta: { reply, toolCalls }
```

### Bucle de tool use (en `app/api/agent/route.ts`)

```typescript
while (response.stop_reason === "tool_use") {
  1. Detecta tool_use blocks en response
  2. Ejecuta cada uno vía executeTool()
  3. Añade resultados al historial de mensajes
  4. Re-llama al modelo
}
// Cuando stop_reason === "end_turn" → devuelve respuesta final
```

---

## Validación CTE DB-HS 5

La función `calculateSepticTank()` aplica automáticamente:

| Parámetro | Mínimo | Recomendado | Aplicación |
|-----------|--------|-------------|-----------|
| Vivienda unifamiliar (h-e) | 5 | — | Se normaliza a 5 si input < 5 |
| Dotación (L/hab·día) | — | 200 | Default España |
| Tiempo retención (días) | 1 | 2 | Se usa 2 por defecto; mín. 1 |
| Profundidad útil (m) | 1.0 | 1.2 | Se normaliza a 1.0 si < 1.0 |
| Ancho mínimo (m) | 0.75 | — | Verifica al final; aviso si incumple |
| Largo mínimo (m) | 1.5 | — | Verifica al final; aviso si incumple |

---

## Escalabilidad a Paso 2

Para agregar más tools en el próximo paso:

1. **Nuevo archivo**: `lib/agent/tools/calculateDrainageField.ts`
   - Define: `calculateDrainageFieldTool` (schema) + `executeCalculateDrainageField()`

2. **Actualizar**: `lib/agent/tools/index.ts`
   - Import el nuevo tool
   - Añadirlo al array `tools`
   - Añadir entrada a `toolExecutors`

3. **Sin cambios necesarios** en `app/api/agent/route.ts` (bucle genérico)

---

## Pasos siguientes (Roadmap)

| Paso | Entregable | Descripción |
|------|-----------|-------------|
| 1 | `calculate_septic_tank` ✓ | Este paso |
| 2 | `calculate_drainage_field` | Cálculo de campo de drenaje |
| 2b | `validate_against_cte` | Verificación exhaustiva contra normativa |
| 3 | Integración UI | Conectar resultados al SepticTankCalculator.jsx |
| 4 | RAG | Buscar normativa en documentos CTE DB-HS 5 |
| 5 | Streaming | Respuestas en tiempo real |
| 6 | Langfuse | Observabilidad y métricas |

---

## Notas técnicas

- **No usamos Vercel AI SDK aún**: `@anthropic-ai/sdk` directo es suficiente.
- **Sin streaming**: respuesta síncrona JSON.
- **Validación manual**: sin zod, validation logic en `executeCalculateSepticTank()`.
- **Modelo**: Claude Opus 4.7 (mejor razonamiento técnico).
- **Max tokens**: 2048 por llamada (ajustable).
- **Max iteraciones tool use**: 10 (previene loops infinitos).

---

## Troubleshooting

### Error: `ANTHROPIC_API_KEY not configured`

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

### Tests fallan con "vitest not found"

```bash
npm install -D vitest
npm test
```

### Respuesta vacía del agente

- Verifica que el modelo reciba el mensaje del usuario.
- Revisa console.error() en el servidor.
- Asegúrate que `tools` está siendo pasado a `client.messages.create()`.

### El tool se ejecuta pero devuelve error

Verifica entrada del usuario:
- `habitantes_equivalentes` debe ser número > 0
- `tipo_uso` debe ser uno de los enums válidos
- `dotacion_litros_hab_dia`, etc., deben estar en rangos correctos

Los rangos se validan en `executeCalculateSepticTank()`.

---

## Referencias

- **CTE DB-HS 5**: [Código Técnico de la Edificación](https://www.codigotecnico.org/)
- **RD 1620/2007**: Real Decreto sobre tratamientos de aguas residuales en aglomeraciones
- **Anthropic SDK**: [Documentación](https://github.com/anthropics/anthropic-sdk-python)
- **Tool use**: https://docs.anthropic.com/en/docs/build-a-system-with-claude/tool-use
