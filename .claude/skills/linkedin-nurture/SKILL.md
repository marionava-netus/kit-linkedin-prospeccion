---
name: linkedin-nurture
description: Sistema de prospección/nurturing de LinkedIn — activa tus conexiones con Playwright + el framework RECON. investiga perfiles, conversa sin vender, regala un lead magnet, invita a una cita y (opcional) sincroniza a tu CRM. Úsala SIEMPRE que el usuario diga "revisa los siguientes N de LinkedIn", "revisa las respuestas de LinkedIn", "envía los mensajes de LinkedIn aprobados", "detén LinkedIn", o cuando se hable de la estrategia/prospección/nurture de LinkedIn.
---

# Nurturing de LinkedIn

Sistema semi-automático (Playwright CLI) para **activar las conexiones de LinkedIn** del usuario y convertirlas en conversaciones reales → citas. Contacto por contacto: **investiga** perfil + posts + web → **conversa** genuino (framework RECON) → **regala el lead magnet** → a los tibios/calientes los **invita a una cita** → (opcional) sincroniza a tu CRM.

> **Detalle ejecutable completo (selectores, procedimientos paso a paso):** `.claude/skills/playwright-web/references/receta-linkedin-nurture.md`. Este SKILL.md es el mapa; la receta es el manual de operación. Léela al retomar. Infra Playwright: skill `playwright-web`.
> **Quién es el prospecto ideal y con qué voz se escribe:** `context/mi-negocio.md` + `references/cliente-ideal.md`. **Llénalos antes de operar** — sin ICP definido no se puede curar ni personalizar.

## ⚠️ Seguridad primero (leer SIEMPRE)
Es la **cuenta principal de LinkedIn del usuario**. LinkedIn banea automatización agresiva por sí solo. Reglas no negociables:

- **MODO APROBACIÓN (default de este kit):** el sistema investiga, cura y **redacta** — pero **NO envía nada sin el OK del usuario**. Los borradores quedan en `linkedin/pending/` y se envían solo con el trigger *"envía los mensajes de LinkedIn aprobados"*. Con semanas de operación sin fricción, el usuario puede ir soltando autonomía por escalón (primero V1/W, después respuestas, al final V2/C) — pero eso lo decide él, explícitamente, y se anota en este archivo.
- **El valor real es la investigación + personalización** (imposible a mano a volumen); enviar es la parte que se cuida.
- **Kill-switch:** `linkedin/config.json → kill_switch:true` corta todo envío. "detén LinkedIn" lo activa. Es **manual de encender y de apagar** — para emergencias/fricción.
- **Pausa suave:** `config.json → pausa_envios_hasta:"YYYY-MM-DD"` → no se envía nada mientras hoy sea menor a esa fecha; sí se investiga/cura/redacta. **Se levanta sola** al llegar la fecha. Úsala para *"hoy no"* / *"todo para mañana"* — no quemes el kill-switch para eso.
- **Si hay CRM, cero navegador para escribirle** — usa su API/MCP. El navegador es solo para LinkedIn.
- **Nunca commitear** `linkedin/` ni `.auth/` (gitignored). Datos de contacto = datos personales: guarda lo mínimo.

## Triggers (frases que disparan la skill)
| Frase | Qué hace | ¿Envía? |
|---|---|---|
| **"revisa los siguientes N de LinkedIn"** | Cosecha N conexiones nuevas → investiga → cura → **redacta** W/V1 a `pending/` | ❌ redacta |
| **"revisa las respuestas de LinkedIn"** | Detecta quién respondió → sube temperatura → **redacta** la respuesta a `pending/` | ❌ redacta |
| **"envía los mensajes de LinkedIn aprobados"** | Envía lo aprobado (✅) de `pending/`, headed, con delays | ✅ |
| **"detén LinkedIn"** | `kill_switch:true` | — |

También aplica cuando se hable de la **estrategia/prospección/nurture de LinkedIn** aunque no se use la frase exacta.

## Modelo de 2 fases
- **Fase A — Investigar + redactar:** detecta respuestas → cosecha nuevos → investiga (perfil + posts + web + email/tel del overlay) → cura (ICP sí/no) → redacta el siguiente escalón a `linkedin/pending/<fecha>.md`.
- **Fase B — Enviar** (solo tras aprobación): por contacto, **1 escalón**, headed, con delays y checks de fricción → verifica → avanza estado → (opcional) sync CRM → archiva `pending`→`posted/`.

## La escalera de conversación
| Etapa | Acción | Avanza cuando |
|---|---|---|
| **M1** | mensaje de "gusto conectar" (manual o con tu herramienta de conexión) | estado inicial |
| **W** | Like + 1 comentario en su post reciente | **solo si tiene post propio ≤10 días**; si no → V1 |
| **V1** | DM de apertura RECON, **cero pitch**, 100% sobre ellos | responde → sube temperatura |
| **V2** | Regala el lead magnet (PDF **adjunto** en el DM) — **regalo condicional** | reacciona / responde |
| **C** | Invita a una cita (link de agenda) — **SOLO tibio/caliente** | agenda / declina / ghost |
| **X** | Cerrado (agendó) o `seguimiento_pausado` | terminal |

- **1 escalón por contacto por día máximo.** Variación obligatoria (nunca dos V1 idénticos).
- **Temperatura:** `frío` = sin respuesta / solo "gracias" (nunca llega a C) · `tibio` = respondió con frase real · `caliente` = expresó un dolor o preguntó qué haces. **C se desbloquea solo con tibio/caliente.**
- **El lead magnet (V2) es regalo condicional, no escalón obligatorio:** si ya está caliente y conviene, saltar a C. Si solo se presta la conversación, regalar el PDF.

## Framework RECON (clave del tono) — ver `references/recon-framework.md`
- **Nunca vender en el mensaje. El objetivo es la SIGUIENTE conversación.**
- **Mensajes MUY breves (2 frases máx):** saludo + observación anclada en un dato real + pregunta abierta. Se lee en 5 segundos.
- **V1 = 100% sobre el prospecto:** nunca mencionar lo que hace el usuario/su empresa ni sonar a venta. Eso se revela mucho después, cuando ya hay conversación real.
- Tuteo por default (ajustar en `config.tone`). Dominio real del sector del prospecto. Honesto, sin prometer de más.
- Al responder tras su reply: profundizar sin acelerar (observación profesional + curiosidad + pregunta sobre ellos). Lead magnet/cita solo cuando el prospecto abre el tema.

## Criterios de curación (adaptar al ICP en `references/cliente-ideal.md`)
- **Aliado ≠ cliente:** un colega, proveedor o competidor del gremio puede ser buen aliado, pero NO entra al nurture de venta → descartar con nota del porqué.
- **No-ICP claro** (otro sector, empleado junior, en búsqueda de empleo) → saltar + registrar en `seen-users.json` con `first_action:"no-icp"`.
- **Deriva geográfica:** si el ICP tiene geografía objetivo, no dejes que perfiles fuera de ella se coman el turno de los prospectos objetivo; reporta la tendencia si ves varios.
- **Descartar bien vale más que mandar más.** Registra SIEMPRE el porqué del descarte.

## Anti-baneo (crítico)
- **Cap diario: cuenta SOLO V1 en frío.** Las **respuestas** a quien nos escribió no consumen cap (riesgo ~cero); los **W** tienen su cap aparte (`limits.warm_per_day`). Rampa en `config.limits.rampa`: **empezar en 5/día** y subir de a poco (5→8→10→12 techo) solo tras días sin fricción. El techo de 12 es prudencia, no dato — LinkedIn no publica umbrales. **Ante cualquier fricción → kill_switch + bajar un escalón y esperar 3 días.**
- **Al contar lo de hoy:** los `ts` del historial van en UTC pero el día operativo es el huso del usuario (`config.timezone`) → convertir; y **excluir entradas `FaseA`** (son borradores, no envíos).
- **Tandas ≤3, delays humanos** (45-150s entre DMs) + tecleo con jitter. Repartir en 2-3 mini-sesiones, no ráfagas. (Por timeout, dividir envíos grandes en tandas ≤3.)
- **Calentar antes del DM:** W (like+comentario) precede a V1 cuando aplica.
- **Headed SIEMPRE al enviar** (el usuario puede vigilar; menos detectable).
- **Detección de fricción:** los scripts de envío chequean checkpoint/captcha/banner de límite → **abortan** + activan kill_switch + avisan. Ante `aborted:true` → detener todo.
- **Si usas otra herramienta de automatización de LinkedIn en paralelo** (conexiones masivas, etc.): corre este sistema en ventana horaria NO solapada — LinkedIn no debe ver dos motores actuando a la vez. Este sistema NUNCA manda solicitudes de conexión; solo trabaja con **ya-conectados**.

## Sync a CRM (OPCIONAL — `config.crm.sync_activo`)
Si el usuario tiene CRM (GoHighLevel u otro), cada envío/respuesta se refleja: contacto + nota con el research + tags (`linkedin-nurture`, `temp-<frío/tibio/caliente>`) + oportunidad en un pipeline de nurture cuyas etapas midan **nivel de conversación** (Conectado → Conversación iniciada → Respondió → Interesad@ → Invitado a cita → Agendó → Cierre). Detalles y procedimiento en la receta. Claves de diseño:
- *Responder ≠ interesado* → etapas separadas.
- El lead magnet = **tag**, no etapa (es regalo condicional).
- `temp-*` se CAMBIA (remove el viejo), no se acumula.
- Sin CRM → `sync_activo:false` y el estado local (`linkedin/conversaciones.json`) es la única fuente.

## Archivos y estado
- **Estado (gitignored) `linkedin/`:** `config.json` (copiar de `config.example.json`; limits, kill_switch, lead magnet, agenda, crm, runtime), `seen-users.json` (dedupe por vanity slug `/in/<slug>`), `conversaciones.json` (la escalera, con `research` por hilo), `pending/`, `posted/`.
- **Scripts `scripts/li-*.js`:** `li-connections` (cosecha), `li-profile` (investiga), `li-contactinfo` (email/tel del overlay), `li-readdm` (detecta respuestas), `li-readthread` (lee un hilo), `li-comment` (W), `li-senddm` (V1/V2/C, con adjunto y detección de fricción). Fase B reescribe `TASKS`/`PROFILES` antes de correr y **restaura el placeholder** al terminar.
- **Escritura segura de estado:** para escribir cualquier JSON de `linkedin/` usar SIEMPRE `scripts/li-save-json.cjs` (`saveJsonAtomic` — temporal + rename). NUNCA `fs.writeFileSync` directo: un fallo a media escritura trunca el archivo y pierde el historial.
- **Sesión Playwright:** `-s=linkedin ... --persistent --profile=.auth/pw-linkedin --browser=chrome`. Verificar con `list` que `user-data-dir` sea `.auth/pw-linkedin` (no `<in-memory>`).
