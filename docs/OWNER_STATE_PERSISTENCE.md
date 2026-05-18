# Owner State Persistence — Guía Técnica

## Resumen

El agente ahora **persiste el estado del propietario entre sesiones**. Cuando vuelve, ve un resumen de lo que estaba haciendo y el agente continúa desde donde se quedó.

---

## Arquitectura

### 1. OwnerState Interface

**Ubicación**: `src/lib/agent/filter.ts`

```typescript
export interface OwnerState {
  phase: "initial" | "explanation" | "orientation" | "detail" | null
  subscenario: "installation" | "active_failure" | "preventive" | "abandoned" | null
  explanationOffered: boolean
  country: "colombia" | "spain" | "usa" | "other" | null
  occupants: number | null
  systemAge: number | null  // years
  lastUpdated: string  // ISO8601 timestamp
}
```

**Qué significa cada campo**:
- **phase**: Donde está el propietario en el flujo (diagnóstico → explicación → orientación → detalles)
- **subscenario**: Su situación específica (instalación, falla, prevención, abandonada)
- **explanationOffered**: Si ya le explicamos cómo funcionan los sistemas
- **country**: Ubicación del propietario (para adaptar normas y profesionales)
- **occupants**: Número de habitantes (para cálculos)
- **systemAge**: Años desde última revisión
- **lastUpdated**: Timestamp del último cambio

### 2. Helpers (`lib/owner-state.js`)

Funciones de conveniencia:

```javascript
// Obtener estado actual del localStorage
getOwnerState() → OwnerState | null

// Guardar estado en localStorage
saveOwnerState(state) → void

// Obtener estado vacío
getEmptyOwnerState() → OwnerState

// Actualizar basado en respuesta del agente
updateOwnerStateFromResponse(currentState, agentContent) → OwnerState
```

### 3. Flujo en el Cliente (HydroAgent.jsx)

```
1. Montar componente
   ↓
2. Cargar ownerstate de localStorage
   ↓
3. Si existe ownerstate + userProfile === "owner":
   ├─ Mostrar PhaseResume con:
   │  ├─ "Welcome back"
   │  ├─ Subscenario anterior
   │  ├─ País/ubicación
   │  └─ Botones: "Continue" o "Start fresh"
   │
4. Si user selecciona "Continue":
   ├─ Ocultar PhaseResume
   └─ Mostrar EmptyState normal
   
5. Usuario escribe mensaje
   ↓
6. Enviar a /api/chat CON ownerstate
   ↓
7. Recibir respuesta del agente
   ↓
8. Analizar respuesta para detectar cambios de fase/país/etc
   ↓
9. Actualizar ownerstate localmente
   ↓
10. Guardar en localStorage
```

### 4. Flujo en el Servidor (route.ts)

```
1. POST /api/chat recibe:
   ├─ messages (historial de chat)
   ├─ formState (datos de cálculo)
   ├─ userProfile (owner/professional/etc)
   └─ ownerState (estado anterior)

2. Si ownerState.subscenario existe:
   ├─ Inyectar contexto: "I see you were working on [subscenario]"
   └─ Agente continúa desde ese punto
   
3. Si detecta nuevo subscenario:
   ├─ Inyectar: "[DETECTED HOMEOWNER SITUATION]"
   └─ Actualizar FormState con detección
   
4. Enviar respuesta del agente (streaming)
```

### 5. PhaseResume Component

**Ubicación**: `components/HydroAgent/HydroAgent.jsx` (líneas ~385-430)

Muestra cuando hay ownerstate previo:

```
┌─────────────────────────────────────────┐
│  ● continuing session                   │
│                                         │
│  Welcome back                           │
│                                         │
│  I see you were working on              │
│  [preventive maintenance]               │
│  Location: Colombia                     │
│                                         │
│  [Continue ✓]  [Start fresh]           │
└─────────────────────────────────────────┘
```

**Props**:
- `ownerState`: Objeto con estado anterior
- `onContinue()`: Callback para cerrar resumen
- `onReset()`: Callback para borrar ownerstate

---

## Detección Automática de Cambios de Fase

**Función**: `updateOwnerStateFromResponse()` en `lib/owner-state.js`

Analiza la respuesta del agente para detectar:

### Cambios de fase (Phase Transitions)

| Indicador en respuesta | Nueva fase | Ejemplo |
|---|---|---|
| "cómo funcionan", "how to", "explanation" | explanation | "Déjame explicarte cómo funciona un sistema séptico..." |
| "próximos pasos", "next steps", "orientación" | orientation | "Aquí están los pasos concretos: 1. Hacer inspección..." |
| "detalles", "deep dive", "específico" | detail | "Profundicemos en los detalles técnicos de..." |

### Detección de país

Detecta menciones de: Colombia, España, USA, etc.
Actualiza `ownerState.country`

### Detección de ocupantes

Busca patrones como: "4 personas", "6 inhabitants", etc.
Actualiza `ownerState.occupants`

---

## Flujo de Ejemplo: Sesión Multiturno

### Sesión 1: Propietario Nuevo

```
Usuario: "Hola, tengo olor en el patio y agua subiendo"
  ↓
Detector: active_failure (98% confidence)
Inyectado: [DETECTED HOMEOWNER SITUATION] active_failure
  ↓
Agente: "Esto es urgente. Necesitas acción inmediata..."
  ↓
OwnerState actualizado:
  - phase: "initial" → "orientation" (porque agente da pasos)
  - subscenario: "active_failure"
  - country: null (aún no menciona ubicación)
```

**localStorage.hydrostack_ownerstate**:
```json
{
  "phase": "orientation",
  "subscenario": "active_failure",
  "explanationOffered": false,
  "country": null,
  "occupants": null,
  "systemAge": null,
  "lastUpdated": "2026-05-18T12:34:56.789Z"
}
```

### Sesión 2: Usuario Vuelve

```
Usuario cierra y vuelve al chat (24 horas después)
  ↓
HydroAgent carga localStorage.hydrostack_ownerstate
  ↓
PhaseResume se muestra:
  ┌─────────────────────────┐
  │ Welcome back            │
  │ I see you were working  │
  │ on active_failure       │
  │ [Continue ✓] [Reset]   │
  └─────────────────────────┘
  ↓
Usuario: [Continue ✓]
  ↓
Envía primer mensaje nuevo + ownerstate anterior a /api/chat
  ↓
route.ts inyecta: "[PREVIOUS SESSION CONTEXT] agente estaba en active_failure"
  ↓
Agente: "Veo que aún tienes el problema de olor y agua. ¿Ha empeorado?"
  ↓
(Continúa como si no se hubiera interrumpido)
```

---

## Storage Keys en localStorage

```
hydrostack_profile        → "owner" | "professional" | "contractor" | "exploring"
hydrostack_ownerstate     → JSON del OwnerState (solo si profile === "owner")
hydrostack_formstate      → JSON del FormState (cálculos anteriores)
```

**Límite de storage**: ~5-10MB en navegadores modernos
**Tamaño típico ownerstate**: ~300 bytes
**Tamaño típico formstate**: ~400 bytes

---

## Limpieza y Reset

### User-initiated reset
Botón "Start fresh" en PhaseResume:
```javascript
localStorage.removeItem("hydrostack_ownerstate");
setOwnerState(null);
```

### Programmatic reset
```javascript
import { getOwnerState, saveOwnerState } from "@/lib/owner-state";

// Borrar
localStorage.removeItem("hydrostack_ownerstate");

// O resetear a vacío
const empty = {
  phase: null,
  subscenario: null,
  explanationOffered: false,
  country: null,
  occupants: null,
  systemAge: null,
  lastUpdated: new Date().toISOString(),
};
saveOwnerState(empty);
```

### Expiración automática (Opcional)
Podría implementarse checkeando `lastUpdated`:
```javascript
const AGE_HOURS = 7 * 24; // 1 semana
const lastUpdated = new Date(ownerState.lastUpdated);
const ageHours = (Date.now() - lastUpdated) / (1000 * 60 * 60);

if (ageHours > AGE_HOURS) {
  // Auto-borrar estado viejo
  localStorage.removeItem("hydrostack_ownerstate");
}
```

---

## Testing

### Manual: Simular sesiones múltiples

1. **Sesión 1**: Abrir chat, seleccionar perfil "owner"
   ```
   Mensaje: "Tengo olor en el jardín, es urgente"
   ✓ Detector identifica: active_failure
   ✓ localStorage.hydrostack_ownerstate se guarda
   ```

2. **Sesión 2**: Cerrar navegador completamente, reabrirlo
   ```
   Abrir chat de nuevo
   ✓ PhaseResume aparece con "I see you were working on active_failure"
   ✓ Botones: Continue / Start fresh
   ✓ Click Continue → EmptyState aparece
   ```

3. **Sesión 2 (continuación)**:
   ```
   Escribir nuevo mensaje
   ✓ ownerstate anterior se envía a /api/chat
   ✓ Agente continúa desde contexto anterior
   ✓ Localización y otros campos se actualizan
   ```

### DevTools: Inspeccionar localStorage
```javascript
// En consola del navegador
JSON.parse(localStorage.getItem("hydrostack_ownerstate"))

// Ver todo
console.table([
  JSON.parse(localStorage.getItem("hydrostack_profile")),
  JSON.parse(localStorage.getItem("hydrostack_ownerstate")),
  JSON.parse(localStorage.getItem("hydrostack_formstate")),
])
```

---

## Próximas Mejoras

- [ ] Persistencia en base de datos (para logins)
- [ ] Sincronización multi-dispositivo (iCloud/Google)
- [ ] Export del historial completo como PDF
- [ ] Analytics: "User came back after X days"
- [ ] Expiración automática después de 30 días sin actividad

---

## Troubleshooting

| Problema | Causa | Solución |
|---|---|---|
| PhaseResume no aparece | ownerstate no se guardó | Check localStorage en DevTools |
| Estado no se actualiza | updateOwnerStateFromResponse falla | Agregar logging: console.log(updated) |
| localStorage lleno | Otros sitios usan mucho storage | Limpiar datos de otros sitios |
| Datos "stale" después de cambios | Expiración no implementada | Agregar chequeo de lastUpdated |

