# Kit de Prospección por LinkedIn

Sistema semi-automático para **activar tus conexiones de LinkedIn** y convertirlas en conversaciones reales → citas. Opera con [Claude Code](https://claude.com/claude-code) + Playwright: **investiga** cada perfil, **redacta** mensajes personalizados (sin vender — metodología CERCA), tú **apruebas**, y el sistema **envía** con ritmo humano y frenos anti-baneo.

> ⚠️ **Léelo antes de empezar:** la automatización de mensajes va contra los Términos de LinkedIn; el riesgo es de tu cuenta. Este kit lo mitiga (caps bajos, rampa, navegador visible, detección de fricción, kill-switch), pero el riesgo nunca es cero. Todo se envía solo con tu aprobación.

## Requisitos
- macOS con [Node.js](https://nodejs.org) (v20+) y Google Chrome.
- [Claude Code](https://claude.com/claude-code) instalado y con sesión iniciada.
- Tu cuenta de LinkedIn (idealmente con la interfaz en **español** — los selectores están confirmados en esa UI; en inglés hay que adaptar textos).

## Instalación (una vez)
```bash
cd kit-linkedin-prospeccion
npm install                      # instala la Playwright CLI local
git init                         # opcional pero recomendado (el .gitignore ya protege lo sensible)
```

1. **Llena tu contexto** (es lo que hace que los mensajes suenen a ti):
   - `context/mi-negocio.md` — quién eres, tu oferta, tu lead magnet, tu voz.
   - `references/cliente-ideal.md` — a quién SÍ y a quién NO escribirle.
2. **Crea tu config:**
   ```bash
   cp linkedin/config.example.json linkedin/config.json
   ```
   Llena los placeholders `<>` (links de agenda, ruta del PDF del lead magnet, fechas de la rampa).
3. **Pon tu lead magnet** (PDF) dentro del proyecto, ej. `assets/mi-guia.pdf`, y apunta la ruta en el config.
4. **Inicia sesión en LinkedIn** (una vez; la sesión queda guardada localmente):
   ```bash
   bash .claude/skills/playwright-web/scripts/login.sh "https://www.linkedin.com/login" linkedin
   ```

## Uso diario (dile a Claude Code)
| Frase | Qué pasa |
|---|---|
| **"revisa los siguientes 10 de LinkedIn"** | Cosecha 10 conexiones nuevas, investiga cada perfil, cura (ICP sí/no) y **redacta** los mensajes a `linkedin/pending/` |
| **"revisa las respuestas de LinkedIn"** | Detecta quién te respondió y **redacta** la siguiente respuesta |
| *(revisas `linkedin/pending/` y marcas ✅ ✏️ ❌)* | Tú decides qué sale |
| **"envía los mensajes de LinkedIn aprobados"** | Envía lo aprobado — navegador visible, ritmo humano, dentro del cap diario |
| **"detén LinkedIn"** | Freno de emergencia (kill-switch) |

## Cómo funciona la estrategia (resumen)
1. **W** — like + comentario genuino en su post reciente (solo si tiene post propio ≤10 días).
2. **V1** — DM de apertura 100% sobre el prospecto. Cero pitch.
3. Responde → conversas genuino (profundizar, no acelerar).
4. **V2** — le regalas tu lead magnet cuando la conversación se presta.
5. **C** — a los tibios/calientes los invitas a una cita con tu link de agenda.

Detalle completo: `.claude/skills/linkedin-nurture/SKILL.md` (estrategia) y `.claude/skills/playwright-web/references/receta-linkedin-nurture.md` (manual de operación).

## Seguridad anti-baneo (ya integrada)
- **Cap diario con rampa:** empieza en **5 DMs en frío/día** y sube gradualmente (8 → 10 → 12 techo) solo si no hay fricción.
- **Navegador visible (headed)** al enviar, delays humanos de 45-150s, tandas de máximo 3.
- **Detección de fricción:** ante captcha/checkpoint/banner de límite, el sistema aborta y se apaga solo.
- **Kill-switch y pausa suave** en `linkedin/config.json`.
- Si usas otra herramienta de LinkedIn (ej. para enviar solicitudes de conexión), que NO corra en el mismo horario.

## Estructura
```
├── CLAUDE.md                  ← instrucciones del asistente
├── context/mi-negocio.md      ← TU negocio, oferta y voz (llenar)
├── references/
│   ├── cliente-ideal.md       ← TU cliente ideal (llenar)
│   └── metodologia-cerca.md     ← el framework de mensajes
├── .claude/skills/
│   ├── linkedin-nurture/      ← la estrategia
│   └── playwright-web/        ← infra de navegador + manual de operación
├── scripts/li-*.js            ← scripts de LinkedIn (cosecha, research, DMs…)
├── linkedin/                  ← estado y config (NO se commitea, salvo el example)
└── .auth/                     ← tu sesión de navegador (NO se commitea)
```

## CRM: pipeline en NetUs Lead Machine (recomendado)
El kit sincroniza cada avance a un pipeline **"LinkedIn Nurture"** en **Lead Machine**: contacto + nota del research + tags de temperatura + **oportunidad que avanza de etapa** conforme avanza la conversación, y detección de "agendó cita" que mueve la tarjeta sola.

**Setup (una vez):** crea el pipeline de 9 etapas en Lead Machine, genera tu **PIT** (token de integración privada), guarda `LEADMACHINE_PIT` y `LEADMACHINE_LOCATION_ID` en `.env`, llena los IDs en `linkedin/config.json` y activa `crm.sync_activo`. Guía paso a paso con las llamadas exactas: `.claude/skills/linkedin-nurture/references/receta-crm-lead-machine.md`.

Sin Lead Machine, deja `crm.sync_activo:false` y el estado local (`linkedin/conversaciones.json`) es la fuente de verdad.

## Automatización con cron (avanzado, opcional)
Cuando lleves semanas operando sin fricción, puedes programar la Fase A (investigar + redactar, sin enviar) en automático: ver `scripts/linkedin-fase-a-cron.sh.example`.
