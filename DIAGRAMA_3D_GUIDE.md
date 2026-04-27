# Guía: Diagrama Isométrico 3D — HydroStack

## 📋 Descripción General

La pestaña **"Diagrama 3D"** del calculador de fosa séptica genera visualizaciones isométricas profesionales del sistema completo de tratamiento de aguas residuales. Incluye dos modos de operación:

1. **SVG Vectorial** — Renderizado instantáneo, descargable en alta resolución
2. **Fotorrealista** — Generación de imagen detallada mediante Claude API (opcional)

---

## 🎯 Cómo usar

### Paso 1: Configurar parámetros
1. En la barra lateral izquierda, completa los campos de entrada:
   - **Usuarios**: cantidad de habitantes
   - **Dotación**: consumo de agua por persona (L/hab·día)
   - **Temperatura**: para calcular TRH y otras variables
   - **Profundidad**: altura útil de la fosa
   - **Otras opciones**: normativa, tipo de uso, suelo

2. Completa los campos de proyecto (al final de la barra lateral):
   - **Nombre proyecto**: ej. "PTARD Vereda El Guamo"
   - **Ubicación**: municipio, departamento
   - **Elaboró**: nombre del diseñador

### Paso 2: Ejecutar cálculo
Haz clic en el botón **"▶ Calcular diseño"** en la parte inferior de la barra lateral.

### Paso 3: Ver Diagrama 3D
Una vez calculado, selecciona la pestaña **"Diagrama 3D"** en el panel principal.

---

## 🎨 Modo SVG Vectorial (por defecto)

### Características
- ✅ **Instantáneo**: se renderiza en tiempo real
- ✅ **Proporcional**: mantiene relaciones matemáticas exactas
- ✅ **Descargable**: exporta como PNG en alta resolución
- ✅ **Editable**: SVG puro, compatible con Inkscape, Illustrator

### Contenido visual

El diagrama isométrico muestra:

```
┌─────────────────────────────────────────┐
│  VISTA ISOMÉTRICA DE SISTEMA COMPLETO   │
├─────────────────────────────────────────┤
│                                         │
│  [VIVIENDA] ──────► TUBERÍAS PVC ──┐  │
│                                    │  │
│                              [FOSA SÉPTICA]
│                                    │  │
│              ┌─────────────────────┘  │
│              ↓                        │
│         [CAMPO DE INFILTRACIÓN]      │
│                                      │
│  PANEL DE DATOS:                     │
│  • Usuarios, volumen, caudal         │
│  • TRH, SRT, dimensiones             │
│  • Proyecto, sitio, diseñador        │
└─────────────────────────────────────────┘
```

### Elementos específicos

#### 🏠 Vivienda
- Estructura 3D: muros, techo, puerta, ventanas
- Colores realistas: terracotta, madera, vidrio
- Indicador: etiqueta "VIVIENDA"

#### 🔧 Tuberías
- Material: PVC naranja (Ø 4")
- Curva con pendiente desde vivienda a fosa
- Etiqueta: "TUBERÍA PVC Ø 4""

#### 🚰 Fosa Séptica
- Forma: prisma rectangular subterrado
- Dimensiones: L×W×depth (en metros)
- Zonas internas visibles:
  - **NATA** (amarilla): capa flotante de grasas (arriba)
  - **LÍQUIDO** (azul-verde): zona de decantación (medio)
  - **LODOS** (gris): acumulación de sólidos (abajo)
- Componentes:
  - Entrada (verde): "ENT"
  - Salida (naranja): "SAL"
  - Ventilación: pequeña caseta arriba

#### 🌾 Campo de Infiltración
- Área rectangular con zanjas paralelas
- Espaciamiento: 1m entre líneas
- Área = Qd/q_inf (metros cuadrados)
- Etiqueta: "CAMPO DE INFILTRACIÓN"

#### 📊 Panel de datos (derecha)
Tabla con:
```
PARÁMETROS TÉCNICOS
─────────────────────
Usuarios:          5
Vol. Fosa:         2.50 m³
Profundidad:       1.40 m
Largo × Ancho:     3.00 × 1.50 m
TRH:               1.5 días
SRT:               45 días
Caudal:            500 L/día
─────────────────────
Proyecto:          PTARD El Guamo
Sitio:             Vereda, Dpto
Diseño:            Ing. Nombre
─────────────────────
EN 12566-1 • RAS 2017
```

### Descargar PNG

Botón **"⬇️ Descargar PNG"** (arriba a la derecha del modo SVG):
1. Convierte SVG a canvas (navegador)
2. Exporta como PNG 960×720 px
3. Archivo: `{projectName}_isometrico.png`
4. Calidad: high-res, escalable

---

## 🖼️ Modo Fotorrealista (generación de imagen)

### Características
- 🎨 **Detallado**: renderizado 3D realista con texturas y sombras
- ⚡ **Bajo demanda**: genera solo cuando lo solicites
- 📸 **Profesional**: ideal para presentaciones, reportes
- 🔗 **Descargable**: botón directo de descarga

### Cómo generar

1. Haz clic en pestaña **"Diagrama 3D"**
2. Selecciona el botón **"🎨 Fotorrealista"** (amarilla, arriba)
3. Haz clic en **"🎨 Generar Imagen Fotorrealista"**
4. Espera a que se complete la generación (puede tardar 30–60 seg)
5. Descarga la imagen con **"⬇️ Descargar imagen"**

### Proceso técnico

```
Tu cálculo (r.Qd, r.Vtot, r.L, r.W, etc.)
            ↓
Prompt generator → "Crea una vista isométrica de..."
            ↓
Claude API → Descripción visual detallada
            ↓
[Integración futura: DALL-E / Midjourney]
            ↓
Imagen PNG descargable
```

Actualmente, el sistema genera una **descripción visual detallada** que puede pasarse a:
- **DALL-E 3** (OpenAI): integración vía API
- **Midjourney**: copia/pega el prompt en Discord
- **Stable Diffusion**: uso local o en Hugging Face

### Especificaciones de la imagen generada

- **Estilo**: CAD técnico profesional (engineering drawing)
- **Escala**: 1:50 (proporcional)
- **Perspectiva**: isométrica, vista desde arriba-izquierda
- **Resolución**: 1024×768 o superior (según generador)
- **Colores**: esquema HydroStack (cyan, verde, ámbar sobre fondo oscuro)
- **Anotaciones**: etiquetas técnicas, dimensiones, flujos
- **Materiales**: concreto, tierra, agua, PVC realistas

---

## 📐 Especificaciones técnicas

### Escala isométrica

```javascript
// Proyección 3D → 2D
px = (x - z) * cos(30°)  // ≈ 0.866 × (x - z)
py = y + (x + z) * sin(30°)  // = y + 0.5 × (x + z)
```

### Dimensiones SVG
- Ancho: 960 px
- Alto: 720 px
- Escala: 25 px/metro
- Ejemplo: tanque de 3m × 1.5m × 1.4m
  ```
  Ancho SVG: 1.5 m × 25 px/m = 37.5 px
  ```

### Paleta de colores
```
Cyan (accents):     #00F5FF
Verde (flujo):      #00FF88
Ámbar (nata):       #FFB020
Fondo oscuro:       #020C10
Fondo tarjetas:     #041820
Texto principal:    #E8F8FF
Texto secundario:   #4A7A8A
Bordes:             rgba(0,245,255,0.12)
```

### Tipografías
- **Orbitron**: títulos y métricas (sci-fi, monoespaciada)
- **IBM Plex Mono**: contenido técnico (monoespaciada)
- **Inter**: cuerpo general (sans-serif)

---

## 🔧 Configuración avanzada

### Variables de entrada (`r` del calculador)

```javascript
{
  // Flujo
  Qd: 0.5,              // Caudal diario (m³/día)
  Qs: 0.00579,          // Caudal de diseño (m³/s)
  
  // Volúmenes
  Vtot: 2.5,            // Total (m³)
  Vl: 1.5,              // Líquido (m³)
  Vs: 0.6,              // Lodos (m³)
  Vn: 0.4,              // Natas (m³)
  
  // Geometría
  L: 3.0,               // Largo (m)
  W: 1.5,               // Ancho (m)
  depth: 1.4,           // Profundidad (m)
  
  // Diseño
  chambers: 2,          // Número de cámaras
  trhDays: 1.5,         // Tiempo retención hidráulico (días)
  SRT: 45,              // Tiempo retención sólidos (días)
  
  // Usuario
  users: 5,             // Cantidad de habitantes
}
```

### Personalización de proyecto

Campos disponibles en la barra lateral:
```
[Nombre proyecto]  → Title block + download filename
[Ubicación]        → Panel de datos
[Elaboró]          → Panel de datos
```

---

## ✨ Ejemplos de uso

### Ejemplo 1: Vivienda unifamiliar (5 usuarios)

**Parámetros ingresados:**
```
Usuarios: 5
Dotación: 120 L/hab·día
Temperatura: 20°C
Normativa: RAS Colombia
```

**Resultado esperado:**
```
Qd = 0.50 m³/día
Vtot = 1.50 m³
L = 2.45 m, W = 1.22 m, depth = 1.2 m
TRH = 1.5 días
Cámaras: 1
```

**Diagrama mostrará:**
- Vivienda modesta, pequeña
- Fosa compacta, uniforme
- Campo infiltración pequeño (~7 m²)

---

### Ejemplo 2: Establecimiento educativo (30 estudiantes + 5 personal)

**Parámetros ingresados:**
```
Usuarios: 35
Dotación: 30 L/hab·día (educativo)
Temperatura: 15°C
Normativa: EN 12566-1
```

**Resultado esperado:**
```
Qd = 0.79 m³/día
Vtot = 4.30 m³
L = 3.85 m, W = 1.92 m, depth = 1.2 m
TRH = 2.0 días
Cámaras: 2 (separación visible)
```

**Diagrama mostrará:**
- Vivienda más grande (escuela)
- Fosa de 2 cámaras (separación interna)
- Campo infiltración mediano (~15 m²)

---

### Ejemplo 3: Comercio con restaurant (50 usuarios)

**Parámetros ingresados:**
```
Usuarios: 50
Dotación: 150 L/hab·día
Temperatura: 25°C
Normativa: España (NTE-ISD)
```

**Resultado esperado:**
```
Qd = 5.63 m³/día (mayor caudal)
Vtot = 5.63 m³
L = 4.23 m, W = 2.11 m, depth = 1.0 m
TRH = 1.0 día
Cámaras: 2
```

**Diagrama mostrará:**
- Edificio comercial (fachada)
- Fosa mayor, sombreado profundo
- Campo infiltración amplio (~30 m²)
- Densidad de zanjas aumentada

---

## 🐛 Solución de problemas

### El diagrama no aparece
→ Verifica que hayas hecho clic en **"▶ Calcular diseño"** primero

### La imagen se corta en pantalla
→ Scroll dentro del panel (el diagrama es responsivo)

### No puedo descargar PNG
→ Verifica permisos del navegador (download), reinicia sesión si es necesario

### Modo Fotorrealista lento
→ Normal: Claude API toma ~30–60 segundos. Espera a que aparezca "Generando..."

### Modo Fotorrealista error "ANTHROPIC_API_KEY not configured"
→ Asegúrate de que `.env.local` tenga: `ANTHROPIC_API_KEY=sk-...`

---

## 🚀 Integraciones futuras

Próximas funcionalidades planeadas:

- [ ] **PDF Export**: lámina + diagrama en un solo archivo
- [ ] **Animación de flujo**: visualizar movimiento del agua
- [ ] **Múltiples vistas**: elevación, cortes A-A, B-B
- [ ] **Editor de dimensiones**: modificar en tiempo real
- [ ] **DALL-E directo**: imagen fotorrealista nativa (sin copiar prompts)
- [ ] **Modelos 3D**: exportar a Sketchfab, STL para impresión 3D
- [ ] **Comparativa visual**: dos sistemas lado a lado
- [ ] **Otras tipologías**: Imhoff, UASB, filtro anaerobio, RBC

---

## 📚 Referencias normativas

**Normas aplicables según parámetros:**

| Norma | Referencia | Región |
|-------|-----------|--------|
| **RAS 2017** | Título J — Sistemas de tratamiento | 🇨🇴 Colombia |
| **NTE-ISD** | Código Técnico de Edificación | 🇪🇸 España |
| **EN 12566-1** | Biological treatment for biodegradable waste | 🇪🇺 Europa |
| **EPA Onsite** | Title 40 CFR Part 141 | 🇺🇸 EE.UU. |

**En el diagrama**, aparece el estándar aplicable en el panel de datos (ej. "EN 12566-1 • RAS 2017").

---

## 📞 Soporte técnico

### Preguntas frecuentes

**P: ¿Puedo editar el SVG generado?**
A: Sí. Descárgalo y abre en Inkscape/Illustrator para personalización.

**P: ¿La imagen fotorrealista es gratis?**
A: La descripción es gratis (usa API de HydroStack). La generación final (DALL-E/Midjourney) requiere créditos en esas plataformas.

**P: ¿Qué resolución tiene el PNG exportado?**
A: 960×720 px. Es suficiente para pantalla; para impresión, amplía con SVG.

**P: ¿Puedo usar los diagramas en reportes comerciales?**
A: Sí, son tuyos. Incluye referencia a HydroStack como cortesía.

---

## 📄 Licencia

© 2025 **HydroStack** — Herramienta de cálculo libre basada en normas internacionales.
Basado en: EN 12566-1, RAS 2017, NTE-ISD, EPA Onsite.

**Uso**: Educativo, profesional, comercial (con atribución).

---

## 🔗 Enlaces útiles

- [Calculador principal](/calculators/fosa-septica)
- [Lámina Técnica A3 (PDF)](/docs/lamina-tecnica-a3)
- [Norma EN 12566-1](https://www.en-standard.eu)
- [RAS 2017 Colombia](https://www.minsalud.gov.co)

---

**Última actualización**: abril 2025  
**Versión**: 1.0  
**Estado**: ✅ Producción
