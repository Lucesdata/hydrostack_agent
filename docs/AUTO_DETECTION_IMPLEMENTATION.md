# Auto-Detección de Sub-escenarios — Guía Técnica

## Resumen

El agente Hydrostack ahora **detecta automáticamente** el sub-escenario del propietario analizando palabras clave en el primer mensaje del usuario. Esto evita preguntas innecesarias y permite orientación directa y específica.

---

## Arquitectura

### 1. Detector (`subscenario-detector.ts`)

**Ubicación**: `src/lib/agent/subscenario-detector.ts`

**Función Principal**:
```typescript
detectSubscenario(userMessage: string): DetectionResult
```

**Retorna**:
```typescript
{
  subscenario: "installation" | "active_failure" | "preventive" | "abandoned" | null,
  confidence: number,  // 0-100
  detectedKeywords: string[]  // top 3 keywords
}
```

**Algoritmo**:
1. Normaliza el mensaje a minúsculas
2. Busca palabras clave por word boundary (`\b...\b`) para cada sub-escenario
3. Cuenta coincidencias totales por sub-escenario
4. Calcula confianza: `(total_keywords / palabras_mensaje) * 100`
5. Aplica boost de 30% para `active_failure` (urgencia)
6. Valida ganador: `topCount > secondCount * 1.5 || confidence > 60`

**Palabras Clave**:

| Sub-escenario | Español | English |
|---|---|---|
| **installation** | construir, obra nueva, terreno, proyecto, desde cero, planificar | build, new construction, new property, design, plan, permit, virgin land |
| **active_failure** | olor, hedor, apesta, agua, charco, retorno, rebosa, urgente, ahora, inmediato | smell, stink, odor, water, pooling, backup, overflow, urgent, now, emergency |
| **preventive** | revisión, inspección, mantenimiento, chequeo, cada cuánto, funciona bien | inspection, review, maintenance, check, how often, works fine |
| **abandoned** | abandonada, vacía, desocupada, nadie vive, años, quiero habitarla, reabrir | abandoned, empty, vacant, unused, years, want to use, reopen |

### 2. Inyección en Route (`route.ts`)

**Ubicación**: `app/api/chat/route.ts`

**Flujo**:
```
POST /api/chat
  ↓
Leer último mensaje del usuario
  ↓
Si userProfile === "owner" AND !formState.subscenario:
  ├─ Llamar detectSubscenario()
  ├─ Si confidence > 50%:
  │   └─ Inyectar como contexto en contextMessages
  └─ Actualizar formState.subscenario
  ↓
Construir system prompt + contextos
  ↓
Enviar a Groq llama-3.3-70b
```

**Inyección de Contexto**:
```typescript
contextMessages.push({
  role: "user",
  content: `[DETECTED HOMEOWNER SITUATION]
Subscenario: ${subscenario.toUpperCase()}
[descripción específica]
Use this context to tailor your guidance...`
});
```

### 3. Comportamiento del Agente

Cuando se inyecta un sub-escenario:
- ✅ **No pregunta** "¿Cuál es tu situación?"
- ✅ **Procede directo** a orientación específica
- ✅ **Adapta el tono** (urgencia para active_failure, prevención para preventive)
- ✅ **Guarda el estado** en formState para la próxima interacción

---

## Ejemplos de Uso

### Caso 1: Instalación Nueva
```
Usuario: "Estoy construyendo una casa nueva en un terreno virgen y necesito saber qué sistema instalar"

Detección:
  ✓ subscenario: "installation"
  ✓ confidence: 92%
  ✓ keywords: ["construyendo", "casa nueva", "terreno"]

Agente:
  (Sin preguntar) "Entiendo que estás planificando una instalación nueva. 
  El primer paso es hacer un estudio de suelo para determinar si 
  el terreno es apto para infiltración..."
```

### Caso 2: Falla Activa (Urgencia)
```
Usuario: "¡Tengo un olor horrible en el patio! Agua subiéndose. ¡Urgente!"

Detección:
  ✓ subscenario: "active_failure"
  ✓ confidence: 98% (boost aplicado)
  ✓ keywords: ["olor", "agua", "urgente"]

Agente:
  (Sin preguntar) "Esto es un problema crítico. El sistema está fallando.
  Necesitas acción INMEDIATA:
  1. Reduce consumo de agua (evita duchas, lava ropa después)
  2. Llamar a un profesional AHORA..."
```

### Caso 3: Prevención
```
Usuario: "Mi sistema funciona bien pero hace 10 años que no lo reviso. ¿Cada cuánto debo vaciarlo?"

Detección:
  ✓ subscenario: "preventive"
  ✓ confidence: 85%
  ✓ keywords: ["funciona bien", "10 años", "cada cuánto"]

Agente:
  (Sin preguntar) "Es bueno que busques mantenerlo. A los 10 años,
  conviene hacer una inspección. Típicamente, el vaciado depende de:
  - Tamaño del tanque
  - Cantidad de personas
  - Tipo de sólidos..."
```

### Caso 4: Casa Abandonada
```
Usuario: "Hereda una propiedad que estuvo cerrada 8 años. ¿Cómo está el sistema?"

Detección:
  ✓ subscenario: "abandoned"
  ✓ confidence: 88%
  ✓ keywords: ["cerrada 8 años", "hereda", "propiedad"]

Agente:
  (Sin preguntar) "Un inmueble cerrado 8 años requiere evaluación cuidadosa.
  La preocupación principal es la infiltración comprometida y bacterias.
  Pasos:
  1. Inspección visual de la superficie (charcos, olores)
  2. Prueba percolation de emergencia
  3. Si no es viable: tratamientos alternativos (reactor..."
```

---

## Umbrales y Ajustes

| Parámetro | Valor | Razón |
|---|---|---|
| Confianza mínima | 50% | Evita falsos positivos en mensajes ambiguos |
| Boost active_failure | 1.3x | Urgencia crítica, mejor errar positivo |
| Palabras clave máximo | 3 | Mostrar prueba de detección |
| Máximo validez | 100% | Cap para normalización |
| Validación ganador | `topCount > secondCount * 1.5` | Diferenciación clara |

**Si deseas ajustar**, edita `src/lib/agent/subscenario-detector.ts`:
```typescript
// Línea ~105: boost para active_failure
if (topScenario === "active_failure") {
  confidence = Math.min(100, confidence * 1.3); // ← cambiar 1.3
}

// Línea ~112: umbral de validación
const isWinner = topCount > secondCount * 1.5 || confidence > 60;
// ↑ cambiar 60 a otro valor
```

---

## Testing Manual

Casos de prueba recomendados:

### ✅ Debería detectar
```
1. "Construir casa nueva" → installation
2. "¡Apesta! Urgente!" → active_failure
3. "Revisión cada cuánto" → preventive
4. "Abandonada 7 años" → abandoned
```

### ❌ NO debería detectar (mensaje ambiguo)
```
1. "Hola, soy ingeniero" → null
2. "Tell me about septic systems" → null
3. "¿Qué es un sistema séptico?" → null
```

## Integración con Persistencia (Próximo)

Cuando se implemente persistencia de fase (Tarea 2 - Fase 1):
- Guardar `subscenario` detectado en `localStorage.hydrostack_ownerstate`
- En sesiones futuras, **no re-detectar** si ya existe
- Mostrar: "Veo que la última vez detecté que estabas en [subscenario]. ¿Sigue siendo así?"

---

## Debugging

**Console logs**:
```javascript
// En route.ts, si necesitas ver la detección:
console.log(`[Subscenario Detection] ${detection.subscenario} (${detection.confidence}%) — keywords: ${detection.detectedKeywords.join(", ")}`);
```

**Qué revisar si no funciona**:
1. ¿El perfil es "owner"? → Otros perfiles saltean detección
2. ¿El formState.subscenario ya existe? → Se salta si ya hay uno
3. ¿Confianza < 50%? → Umbral es 50%
4. ¿Palabras clave en el diccionario? → Agregar a `SUBSCENARIO_KEYWORDS`

---

## Próximas Mejoras

- [ ] Persistencia de fase entre sesiones (T2)
- [ ] Integración con catálogo de profesionales (T3)
- [ ] Ajuste dinámico de umbrales por idioma
- [ ] Machine learning para mejorar precisión (v2)

