# 🌊 HydroStack — Inteligencia para contratación pública en agua y saneamiento

**Plataforma que cruza el perfil de un oferente con los procesos activos de SECOP II en agua y saneamiento — elegibilidad, pliegos y alertas en un solo lugar.**

**Live:** https://hydrostack.io
**Status:** ✅ En producción

---

## ✨ Qué hace

### 🔍 **Exploración de procesos SECOP**
- Procesos activos y contratos en agua y saneamiento, actualizados diariamente desde SECOP II (Socrata).
- Filtro por defecto al sector agua; búsqueda por entidad, departamento, estado, valor y fecha.

### 📄 **Extracción de pliegos**
- Extractor híbrido (reglas + fallback con Gemini) que decodifica requisitos legales y técnicos de un pliego en minutos.
- Contrato de salida validado por schema — no confía directamente en el JSON generado por el LLM.

### 👤 **Perfil de oferente y elegibilidad**
- Mini-wizard de perfil de oferente (RUP, capacidad financiera) sin necesidad de cuenta.
- Cruce contra los requisitos habilitantes de cada proceso.

### 🔔 **Alertas**
- Envío diario de coincidencias por correo (Resend), idempotente por diseño (`envio_log`).

---

## 🚀 Getting Started

### Requisitos
- Node.js 18+
- npm

### Instalación

```bash
git clone <repo-url>
cd hydrostack-2
npm install
cp .env.example .env.local
# completa DATABASE_URL, AUTH_SECRET, AUTH_RESEND_KEY, GEMINI_API_KEY (ver .env.example)
```

### Desarrollo

```bash
npm run dev
# → http://localhost:3000
```

### Build de producción

```bash
npm run build
npm run start
```

---

## 📁 Estructura del proyecto

```
├── CLAUDE.md                    # Reglas de comportamiento del agente
├── PENDIENTES.md                # Pendientes activos
├── AUDITORIA_ARQUITECTONICA_2026-08-08.md   # Estado arquitectónico vigente
│
├── docs/
│   ├── adr/                     # Decisiones arquitectónicas
│   ├── fase-0/, fase-1/, fase-a/ # Historial de diseño por fase
│   └── secop/                   # Casos de referencia (gate de calidad del extractor)
│
├── app/                          # Next.js App Router
│   ├── licitaciones/            # Exploración de procesos SECOP
│   ├── pliego/                  # Extractor de pliegos
│   ├── cuenta/                  # Cuenta de usuario (Auth.js)
│   ├── mis-coincidencias/       # Alertas / matching
│   └── api/
│       ├── secop/               # Procesos, contratos, veredicto de elegibilidad
│       ├── pliego/extract/      # Extracción de pliegos (Gemini)
│       ├── cron/                # Ingesta diaria + alertas (Vercel Cron)
│       ├── alertas/              # Preferencias, unsubscribe
│       ├── perfil/               # Perfil de oferente
│       └── auth/                # Auth.js
│
├── src/
│   ├── components/secop/        # SecopExplorer, OferenteWizard
│   ├── lib/
│   │   ├── ingest/, transform/  # Pipeline ELT (SECOP/Socrata → Postgres)
│   │   ├── classify/            # Clasificación sectorial
│   │   ├── pliego/              # Extractor híbrido + validación
│   │   ├── oferente/, matching/ # Perfil de oferente + elegibilidad
│   │   ├── alertas/, email/     # Envío diario de alertas
│   │   ├── auth/, db/           # Auth.js, Drizzle + schema
│   │   └── secop/               # Cliente de datos SECOP
│   └── __tests__/               # Tests (Vitest)
│
├── scripts/                     # Ingesta/transform/análisis de pliegos vía CLI
└── drizzle/                     # Migraciones
```

---

## 💻 Desarrollo

| Capa | Tecnología |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **UI** | React 18 |
| **Lenguaje** | TypeScript |
| **Base de datos** | Postgres (Neon) vía Drizzle ORM |
| **Auth** | Auth.js (NextAuth v5), magic link vía Resend |
| **LLM** | Gemini (extractor de pliegos) |
| **Testing** | Vitest |
| **Deployment** | Vercel |

### Tests

```bash
npm run test           # Correr todos los tests
npm run test:watch     # Modo watch
```

### Scripts de datos

```bash
npm run db:ingest              # Ingesta manual (SECOP/Socrata → raw_record)
npm run db:transform           # Transform (raw_record → entidades canónicas)
npm run db:seed-geografia      # Seed de catálogo de geografía
npm run analyze-pliego-hybrid  # Prueba el extractor híbrido contra un PDF local
```

---

## 🔒 Seguridad

- `/api/cron/*` exige `CRON_SECRET` como `Bearer` y falla cerrado (401) si la variable no está definida.
- No hay RLS en Postgres — la defensa multi-tenant depende del `WHERE usuarioId=...` de cada query de aplicación. Ver `AUDITORIA_ARQUITECTONICA_2026-08-08.md` hallazgo F.2 antes de tocar tablas de cuentas/oferente.

---

## 📚 Documentación

- **[CLAUDE.md](./CLAUDE.md)** — reglas de comportamiento del agente sobre este repo
- **[AUDITORIA_ARQUITECTONICA_2026-08-08.md](./AUDITORIA_ARQUITECTONICA_2026-08-08.md)** — mapa de arquitectura, hallazgos y roadmap técnico vigente
- **[docs/adr/](./docs/adr/)** — decisiones arquitectónicas
- **[PENDIENTES.md](./PENDIENTES.md)** — pendientes activos

---

## 📄 Licencia

Privado — todos los derechos reservados.
