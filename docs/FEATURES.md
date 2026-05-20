# ✨ HydroStack Features

**Complete feature list and specifications.**

---

## 🧮 Septic Tank Calculator

### Core Calculations

**Design Parameters:**
- Tank volume (m³) based on users and retention time
- Infiltration field area (m²) per percolation rate
- Hydraulic retention time (TRH) in hours
- Surface loading rate (m³/m²/day)
- Sludge accumulation (years until pump-out)
- Field dimensions (length × width)

**Input Parameters:**
- Number of users (1-500)
- Daily water consumption (L/person/day)
- Temperature (°C) — affects TRH
- Tank depth (m)
- Soil type & percolation rate (m/day)
- Field slope (%)
- Design norm/standard

**Output Data:**
- Calculated tank volume
- Field dimensions
- TRH and other design parameters
- Efficiency metrics
- Recommended pump-out intervals
- Compliance with standards

### Supported Standards

| Standard | Country/Region | Details |
|----------|---|---|
| **CTE DB-HS 5** | Spain 🇪🇸 | Código Técnico de Edificación |
| **EPA On-Site** | USA 🇺🇸 | EPA On-Site Wastewater Treatment |
| **RAS 2000** | Colombia 🇨🇴 | Reglamento Técnico del Sector |
| **AS/NZS 1547** | Australia/NZ 🇦🇺 | Design Standard |
| **EN 12566-1** | Europe 🇪🇺 | European Standard |
| **UK Regs** | United Kingdom 🇬🇧 | Building Regulations H |

Each standard has:
- Specific TRH requirements
- Field loading rates
- Tank design criteria
- Sludge accumulation rates
- Local considerations

### Features

✨ **Real-Time Calculations**
- Results update instantly as you change parameters
- Visual feedback on parameter changes
- No page reload required

✨ **Parameter Validation**
- Automatic range checking
- Clear error messages
- Helpful suggestions for invalid inputs

✨ **Preset Standards**
- One-click selection of design norm
- Auto-configured parameters per standard
- Normalized output formats

✨ **Professional Output**
- Formatted results with units
- Technical terminology correct per standard
- Export-ready calculations

✨ **Responsive Design**
- Works on desktop, tablet, mobile
- Optimized UI for small screens
- Touch-friendly inputs

---

## 🎨 3D Isometric Diagrams

### Overview

Professional technical drawings of complete wastewater systems, including:
- House with rooms, doors, windows
- Drainage pipes (orange)
- Septic tank (with internal zones)
- Infiltration field
- Vent pipes and cleanouts

### Rendering Modes

#### 1. SVG Vectorial (Default)
- **Speed:** <50ms (instant)
- **Format:** Scalable SVG
- **Export:** PNG (any resolution)
- **Perfect for:**
  - Technical documents
  - Printing
  - Quick previews
  - Professional reports

**Features:**
- Proportionally accurate
- Clean, engineering style
- Color-coded components
- Labeled dimensions
- Download as PNG

#### 2. Photorealistic (Optional)
- **Speed:** 30-60 seconds
- **Format:** High-resolution JPEG/PNG
- **Requirements:** Anthropic API key
- **Perfect for:**
  - Client presentations
  - Detailed analysis
  - Visual understanding
  - Marketing materials

**Features:**
- Detailed textures
- 3D perspective
- Realistic materials
- Professional render
- Ready for presentations

### Components Shown

| Component | Details |
|-----------|---------|
| **House** | Scale model with rooms, openings |
| **Inlet Pipes** | Orange color, from house |
| **Tank** | 3-zone visualization (scum/liquid/sludge) |
| **Outlet Pipes** | To infiltration field |
| **Field** | Infiltration trenches |
| **Vent** | Atmospheric relief pipe |
| **Dimensions** | Scale indicators |

### Data Panel

Shows all calculated values:
- Tank dimensions (L×W×H)
- Volume and TRH
- Field dimensions and area
- Loading rates
- Compliance status
- Design standard used

---

## 🤖 AI-Powered Agent

### Overview

Context-aware chat assistant that:
- Explains septic systems in simple language
- Detects your situation (new install, repair, maintenance)
- Gives country-specific guidance
- Answers technical questions
- Guides you to next steps

### Features

✨ **Scenario Auto-Detection**

Automatically identifies your situation:
- **New Installation** — Requires site study, design, permits
- **Active Failure** — Odors, backup, urgent repairs
- **Preventive Maintenance** — Inspection, routine maintenance
- **Abandoned House** — System restoration before occupancy

Detects keywords in your message and provides targeted guidance.

✨ **Country-Specific Guidance**

Automatically adapts to your location:
- **Spain** — CTE DB-HS 5, municipal permits, qualified technician
- **USA** — Site Evaluator, perc test, Department of Health
- **Colombia** — Engineer contact, municipal procedures
- **Australia/NZ** — Local health department, AS/NZS standards
- **UK** — Building Control approval

✨ **Context-Aware Explanations**

Detects expertise level and explains accordingly:
- **Technical users** — Uses terminology, references standards
- **Non-technical users** — Simple analogies, plain language
- **Professional users** — Detailed specifications, procedures

✨ **Bilingual Support**

- **Spanish & English** detection and response
- Automatic language switching mid-conversation
- No language mixing in single response
- Technical terms translated consistently

✨ **Profile Detection**

Automatically identifies you as:
- **Homeowner** — Looking for practical steps
- **Professional** — Engineer, inspector, designer
- **Contractor** — Installer, maintenance worker
- **Researcher** — Learning about systems

Customizes responses accordingly.

### Supported Interactions

| Type | Example |
|------|---------|
| **System Explanations** | "¿Cómo funciona un sistema séptico?" |
| **Problem Diagnosis** | "Mi casa huele a alcantarilla..." |
| **Next Steps** | "¿Qué hago si falla mi fosa?" |
| **Standards Questions** | "¿Qué normativa aplica?" |
| **Professional Referral** | "¿A quién contacto?" |
| **Technical Details** | "¿Qué es un campo de infiltración?" |

---

## 🌍 Multi-Language Support

### Supported Languages
- **Spanish (Español)** 🇪🇸
- **English** 🇬🇧

### Features

✨ **Automatic Detection**
- First message language determines session language
- Mid-session switching supported
- No manual language selection needed

✨ **Consistent Terminology**
- Technical terms translated accurately
- Standards names preserved (CTE DB-HS 5, etc.)
- Regional variations handled (España vs Latinoamérica)

✨ **Interface Translations**
- All UI elements translated
- Help text in user's language
- Error messages clear and helpful

---

## 📊 Data & Analytics

### Design Reports

**Automatic Report Generation:**
- All calculated parameters
- Design summary
- Compliance checklist
- Next steps guidance
- Export formats

### Export Options

- **PNG** — 3D diagram (SVG mode)
- **PDF** — Design report (planned)
- **JSON** — Raw calculation data
- **CSV** — Tabular results

---

## 🔧 Customization & Advanced Features

### Calculator Customization

**For Developers:**
- Custom formulas in `src/lib/calculations/`
- New design norms easy to add
- Parameter presets configurable
- UI styling fully customizable

### Agent Customization

**For Developers:**
- Behavior rules in `CLAUDE.md`
- Scenario detection logic modifiable
- Response templates customizable
- Country/region specific rules

### 3D Diagram Customization

**For Developers:**
- Colors fully customizable
- Scale adjustable
- Components toggleable
- Export resolution configurable

---

## 📈 Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| **Load page** | <1s | Optimized bundle |
| **Calculate** | <50ms | Client-side only |
| **SVG render** | <50ms | Instant |
| **PNG export** | 1-2s | Canvas conversion |
| **AI response** | 2-5s | Network dependent |
| **Image generation** | 30-60s | Claude API |

### Optimization

- No database queries
- All calculations client-side
- Lazy loading of components
- Optimized bundle size (~120 KB)
- Responsive images
- Cached results in session

---

## 🔒 Security & Privacy

### Data Handling

- **All calculations client-side** — No server processing
- **No data storage** — Results not saved (unless you download)
- **API keys secure** — Never logged or exposed
- **HTTPS only** — Encrypted transmission

### Privacy

- Calculations completely private
- No tracking or analytics by default
- No cookies (except session management)
- No external requests except Claude API (optional)

---

## 🌐 Browser & Device Support

### Supported Browsers

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Screen Sizes

- ✅ Desktop (1920×1080 and larger)
- ✅ Tablet (768×1024)
- ✅ Mobile (375×667)

### Performance Targets

- First contentful paint: <1s
- Interactive: <2s
- Responsive to input: <100ms

---

## 🎯 Use Cases

### Professional Designers
- Calculate system dimensions per standard
- Generate diagrams for client proposals
- Export design documentation
- Reference specific standards

### Homeowners
- Understand septic system basics
- Get guidance on problems
- Learn maintenance requirements
- Find professional help

### Engineers & Inspectors
- Verify calculations quickly
- Check code compliance
- Compare design approaches
- Document designs

### Contractors & Maintainers
- Quick size calculations
- Maintenance scheduling
- Problem diagnosis
- Client communication

---

## 📋 Calculation Methods

### Tank Sizing
Based on:
- Daily flow (users × dotation)
- Retention time (per standard)
- Sludge volume (annual accumulation)

### Field Sizing
Based on:
- Percolation rate (soil test)
- Loading rate (per standard)
- Overflow schedule
- Maintenance access

### TRH Calculation
- Formula: TRH = Tank Volume / Daily Flow
- Units: hours
- Standard minimums: 24-48 hours (varies by norm)

### Sludge Accumulation
- Annual accumulation rate: per standard
- Pump-out interval: typically 3-5 years
- Based on users and design standard

---

## 🔜 Planned Features

### v1.1
- [ ] PDF export
- [ ] Flow animation in diagrams
- [ ] Direct image API integration

### v2.0
- [ ] Imhoff tanks
- [ ] UASB reactors
- [ ] Constructed wetlands
- [ ] 3D model export (STL/OBJ)
- [ ] Cost analysis

---

## ⚠️ Limitations & Notes

### Current Scope
- **Designed for:** Small to medium septic systems (residential)
- **Not for:** Large treatment plants, industrial applications
- **Single tank:** Multiple tank systems need manual calculation

### Assumptions
- Conventional septic tank design
- Gravity-fed infiltration field
- Conventional design approach per standard

### Regional Adaptations
- Standards vary by region
- Always consult local authorities
- Professional design verification recommended for large/complex projects

---

## 📞 Support & Documentation

**For questions about features:**
1. Check [DIAGRAMS_3D.md](./DIAGRAMS_3D.md) for diagram help
2. Check [DEVELOPERS.md](./DEVELOPERS.md) for technical details
3. Check [normativa/](./normativa/) for standard-specific info

---

**Last Updated:** May 2026
