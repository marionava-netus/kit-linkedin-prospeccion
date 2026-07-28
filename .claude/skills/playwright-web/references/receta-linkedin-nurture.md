# Receta — Nurturing de LinkedIn (investigar → conversar → lead magnet → cita)

Activar las **conexiones de LinkedIn** del usuario (su ICP está definido en `context/mi-negocio.md` + `references/cliente-ideal.md`) que ya conectaron pero quedaron frías. El sistema **investiga** cada contacto, **conversa** genuino, les **regala el lead magnet** y, a los tibios/calientes, los **invita a agendar una cita**.

> Estado y config: carpeta **`linkedin/`** (gitignored) — `config.json`, `seen-users.json`, `conversaciones.json`, `pending/`, `posted/`.

## Regla de oro (por qué así)
LinkedIn banea automatización agresiva por sí solo. La seguridad viene de: **(1)** cap por rampa (solo V1 en frío), **(2)** headed, **(3)** calentar (like/comentario) antes del DM, **(4)** ritmo humano + variación, **(5)** detección de fricción → aborta + kill-switch. El valor real es la **investigación + personalización** (imposible a mano a volumen).

## Modo de operación: APROBACIÓN (default del kit)
- **Fase A — Investigar + redactar**: detecta respuestas → cosecha nuevos → investiga → cura → redacta el siguiente escalón a `pending/`. **No envía.**
- **Fase B — Enviar**: solo con el trigger *"envía los mensajes de LinkedIn aprobados"*, y solo lo marcado ✅ por el usuario. Tras enviar: verifica, avanza estado, (opcional) sync CRM, archiva en `posted/`.
- Con semanas de operación sin fricción, el usuario puede decidir soltar autonomía por escalón (primero V1/W, después respuestas, al final V2/C). Documentarlo explícitamente en el SKILL.md cuando ocurra.

## Triggers
- **Fase A:** *"revisa los siguientes N de LinkedIn"* (ej. "revisa los siguientes 10 de LinkedIn") · *"revisa las respuestas de LinkedIn"*.
- **Fase B:** *"envía los mensajes de LinkedIn aprobados"* — la ÚNICA frase que envía, y solo tras aprobar.
- **Kill:** *"detén LinkedIn"* → pone `config.json → kill_switch:true` (Fase B se niega a enviar).

## Sesión / login (una vez)
LinkedIn requiere login. Login asistido **headed**, queda en un perfil persistente **aislado**:
```bash
bash .claude/skills/playwright-web/scripts/login.sh "https://www.linkedin.com/login" linkedin
# El usuario inicia sesión a mano; se persiste en .auth/pw-linkedin
```
Tareas posteriores reusan el perfil:
```bash
npx playwright-cli -s=linkedin open "https://www.linkedin.com/mynetwork/invite-connect/connections/" --persistent --profile=.auth/pw-linkedin
```
> ⚠️ **CRÍTICO:** incluir **SIEMPRE** `--persistent --profile=.auth/pw-linkedin` en CADA `open`. Si se omite → navegador headless in-memory SIN sesión → falso "logout". Verifica con `npx playwright-cli -s=linkedin list` que `user-data-dir` apunte al perfil.
> - Sesión expira / a veces pide checkpoint (código por email/SMS) → re-login asistido headed.
> - **Headed SIEMPRE en Fase B** (el usuario vigila; menos detectable). Fase A headed también en semana 1.

## La escalera de conversación
| Etapa | Acción | Canal | Avanza cuando |
|---|---|---|---|
| **M1** | mensaje de "gusto conectar" (manual o con tu herramienta de conexión) | — | estado inicial |
| **W** | Like + 1 comentario genuino en su post reciente | Feed | publicado; **sin post propio de ≤10 días → salta a V1** |
| **V1** | DM de apertura anclado en algo real (post/ciudad/empresa/dolor del ICP), **cero pitch** | DM | responde → sube temperatura |
| **V2** | Regala el lead magnet "sin compromiso" | DM | reacciona/responde |
| **C** | Invita a la cita (link de `config.agenda`) — **SOLO tibio/caliente** | DM | agenda / declina / ghost |
| **X** | Cerrado (agendó) o `seguimiento_pausado` (ignoró C, no insistir) | — | terminal |

- **1 escalón por contacto por día, máximo.** Nunca dos acciones al mismo contacto el mismo día.
- **Temperatura:** `frío` = sin respuesta o solo emoji/"gracias" → sigue en pista de regalo, **NUNCA llega a C**. `tibio` = respondió con frase real / encaja el perfil de ticket alto del ICP. `caliente` = expresó un dolor o preguntó qué hace el usuario. **C se desbloquea solo con tibio/caliente.**
- **Variación obligatoria:** nunca dos V1 idénticos; cada mensaje ancla en un dato investigado. Mensajes calcados = spam detectable.

### Tono y estilo (la voz del usuario)
- **Tuteo ("tú")** por default — cercano, colega, práctico (ajustable en `config.tone`). Excepción: perfil claramente formal/senior → override puntual.
- Dominio real del sector del prospecto (su jerga, sus dolores). Honesto, sin prometer de más. El lead magnet es **regalo**, no gancho; la cita solo cuando ya hay conversación real.
- **MUY breve: 2 frases máximo por mensaje** (regla aprendida en operación real — los mensajes largos se sienten a plantilla). Estructura mínima: saludo + 1 observación anclada en un dato real + 1 pregunta abierta. Se lee en 5 segundos. Empático, humano, específico al contacto.
- **Seguir el framework RECON** (`references/recon-framework.md`): nunca vender en el mensaje, el objetivo es la SIGUIENTE conversación. Al responder tras su reply → profundizar sin acelerar (observación profesional + curiosidad + pregunta abierta sobre ellos). Lead magnet/cita solo cuando el prospecto abre el tema.

### Ejemplos de drafts (ajustar SIEMPRE al research real y al ICP del usuario)
- **W (comentario en su post):** *"Buenísimo el cierre de mes con tu equipo, Juan 👏 Se nota cuando un equipo jala parejo. Felicidades."*
- **V1 (apertura, cero pitch — 100% sobre ELLOS):** *"Hola Juan, un gusto haber conectado. Vi que traes [algo real de su perfil/post/empresa] — me late. ¿Qué tal va el año para ti?"*
  > ⚠️ El V1 es **puro sobre el prospecto** para ABRIR conversación: saludo + observación genuina de su perfil/post/empresa + pregunta abierta sobre ellos. **NO** mencionar lo que hace el usuario ni nada que suene a venta ("llevo años ayudando a…") — eso desvía el foco y arranca vendiendo. Lo que hace el usuario se revela mucho después, cuando ya hay conversación.
- **V2 (lead magnet, sin compromiso) — se ADJUNTA el PDF directo en el DM (no link):** *"Oye Juan, sin ningún compromiso — te dejo aquí una guía cortita que hicimos sobre [tema del lead magnet] 📘. Ojalá te sirva."* + PDF adjunto.
  > **El lead magnet es un REGALO CONDICIONAL, no un escalón obligatorio.** Se ofrece cuando "se presta" en la conversación. **Si el prospecto ya está caliente y conviene ir directo a agendar → salta V2 y redacta C.** No fuerces el regalo por cumplir el paso.
  > **Ruta local del PDF:** en `config.ebook_pdf`; el envío la pasa como `attach` a `li-senddm.js`.
  > **Mecánica del adjunto (`li-senddm.js`, campo `attach`):** tras teclear el texto, hace `setInputFiles(<ruta_pdf>)` en el `input[type=file]` del msg-form, espera el preview y recién ahí envía. **Seguridad: si el adjunto NO carga, NO envía el mensaje** (para no mandar "te dejo la guía" sin guía). Confirmar el selector del input en el 1er envío V2 headed (LinkedIn ofusca clases). Fallback por link en `config.ebook_url_fallback`.
  > ⚠️ **AUDIO nunca adjunto:** LinkedIn rechaza mp3 como adjunto de DM ("Error al cargar el archivo"). Si algún día se comparte audio, va por **link** dentro del texto.
- **C (solo tibio/caliente):** *"Me da gusto que te resonó, Juan. Justo eso que mencionas [dolor real que dijo] es de lo que ayudo a resolver. Si quieres armamos una sesión corta, sin costo, y te muestro cómo se vería en tu caso. Aquí agarras el horario que te acomode: {agenda}"*

**Elegir el link de agenda (`config.agenda`):**
- **Tipo de link por TEMPERATURA (RECON):** `cita_directa` si **caliente** (abrió el tema con fuerza, pidió hablar) → va directo al calendario; `contexto` (landing/página con video) si **tibio** y aún necesita entender la oferta.
- No hardcodear links: siempre desde `config.agenda`.

## Anti-baneo (CRÍTICO — cuenta principal del usuario)
- **Cap diario — CUENTA SOLO V1 EN FRÍO.** En `config.json → limits`. El orquestador cuenta lo enviado hoy y **para** al llegar al cap.
  - **Qué cuenta:** el primer DM no solicitado (V1). **NO cuentan** las *respuestas* a quien nos escribió (riesgo ~cero — es lo que hace cualquier humano) ni los **W** (like+comentario, cap aparte en `limits.warm_per_day`).
  - **Rampa** (`limits.rampa`, escalones por fecha): **empezar en 5/día** una cuenta nueva en esto; subir a 8 → 10 → 12 (techo) solo tras varios días sin fricción en cada escalón.
  - ⚠️ **Retroceso obligatorio:** ante CUALQUIER fricción (`aborted:true`, checkpoint, captcha, banner) → `kill_switch:true` + avisar al usuario + **bajar al escalón anterior y quedarse 3 días** antes de reintentar subir.
  - 🔎 **Honestidad:** el techo de 12 es **prudencia, no dato** — LinkedIn no publica umbrales. Por eso sube de a poco y con retroceso.
  - ⚠️ **Al contar lo enviado hoy:** los `ts` del historial son **UTC** y el día operativo es el huso del usuario (`config.timezone`) → convertir antes de contar, o los envíos de la tarde se cuentan al día siguiente. Y **excluir las entradas `FaseA`** del historial: son investigación/borradores, **no envíos**.
- **Ritmo humano:** los scripts de envío meten delays aleatorios entre contactos (45-150 s) y tecleo con jitter por-tecla. **Reparte el día** en 2-3 mini-sesiones (tandas ≤ 3), no ráfagas.
- **Calentar antes del DM:** W (like+comentario) precede a V1. View + like + comentario antes del primer DM = parece humano que notó a alguien, no bot.
- **Kill-switch:** `config.json → kill_switch:true` → Fase B se niega a enviar. Antes de generar/correr cualquier script de envío, el orquestador **lee `kill_switch`**; si es true, no envía. Es manual de encender **y de apagar** → resérvalo para fricción/emergencia.
- **Pausa suave** (`config.json → pausa_envios_hasta:"YYYY-MM-DD"`): mientras la fecha de hoy sea menor a ese valor, **no se envía nada** (ni V1, ni W, ni respuestas), pero **sí** se investiga, cura, redacta y sincroniza. **Se levanta sola** al llegar la fecha. Es la respuesta correcta a *"hoy no"*; usar el kill-switch para eso deja el sistema apagado en silencio.
- **Otras herramientas de LinkedIn en paralelo** (ej. una herramienta de solicitudes de conexión): correr Playwright en **ventana horaria NO solapada** (LinkedIn no debe ver dos motores a la vez). Playwright NUNCA manda solicitudes de conexión ni el M1; solo W-comentarios y DMs a **ya-conectados**.
- **Detección temprana de soft-block:** `li-comment.js` y `li-senddm.js` chequean fricción antes/después de cada acción (redirect a `/checkpoint/`·`/login`, banners "has alcanzado el límite / restricted / actividad inusual / captcha", botón/caja faltante). Si dispara → **abortan la tanda**, y el orquestador pone `kill_switch:true` + avisa al usuario.

## Fase A — Investigar + redactar (paso a paso)
1. **Cargar** `linkedin/config.json` (limits, `agenda`, `ebook_pdf`, `crm`, `last_fase_a`, `kill_switch`) y `linkedin/seen-users.json`.
2. **Detectar respuestas** (para avanzar hilos abiertos): leer la bandeja y cruzar con los hilos `esperando_respuesta=true`:
   ```bash
   npx playwright-cli -s=linkedin run-code --filename scripts/li-readdm.js > downloads/li-inbox.json
   ```
   Si un contacto tiene `from_them=true` (su último mensaje no empieza con "Tú:") → `esperando_respuesta=false`, subir `temperatura` según el texto, encolar el siguiente escalón.
3. **Cosechar** las conexiones más nuevas (abrir `connections_url`, orden por defecto = recientes) y dedupe:
   ```bash
   npx playwright-cli -s=linkedin run-code --filename scripts/li-connections.js > downloads/li-conexiones.json
   ```
   Filtrar los que ya están en `seen-users.json` (por slug `/in/<slug>`). Tomar los N más nuevos no-vistos.
4. **Investigar** cada nuevo (reescribir el array `PROFILES` en `scripts/li-profile.js` con las URLs, luego correr):
   ```bash
   npx playwright-cli -s=linkedin run-code --filename scripts/li-profile.js > downloads/li-research.json
   ```
   - Si trae `website`, resumirla con **WebFetch** (herramienta, no navegador → cero riesgo de cuenta) → `website_summary`.
   - Mapear `perfil_icp` a los perfiles de `references/cliente-ideal.md` e inferir `dolores_probables`. Si el headline/empresa NO encaja el ICP → `perfil_icp:"no-icp"`: **saltar** (no redactar, no cuenta al cap) y registrar en `seen-users.json` con `first_action:"no-icp"` para no re-elegir.
   - **Email/tel:** para CADA candidato ICP correr también `li-contactinfo.js` y **poblar `research.email`** — clave para el CRM. Prioridad email: dominio propio de la empresa > cualquiera disponible. Teléfono: preferir móvil. Muchos perfiles no comparten → dejar vacío.
5. **Redactar** el `next_draft` del escalón que toca (W o V1 para nuevos; el siguiente para los que respondieron), afinado a research + ICP + temperatura. Variación obligatoria.
   - **Elegir W vs V1:** el escalón W (like+comentario) SOLO si el contacto tiene un **post PROPIO (no repost) de ≤10 días** — `li-profile` lo resuelve en `r.w_elegible` (bool) y `r.post_w` (url del post a comentar). La antigüedad sale exacta del timestamp embebido en el activity id (`id >> 22` = ms epoch), no del texto "hace 1 año". **Si `w_elegible=false` → escalón V1 directo.** Comentar un post viejo se ve raro (rebuscado).
6. **Guardar** en `linkedin/pending/<YYYYMMDD-HHMM>.md` (formato abajo) y actualizar/crear el hilo en `conversaciones.json`.
7. **Avisar al usuario** (en el chat): resumen de lo redactado + recordar el trigger de Fase B.
8. Actualizar `runtime.last_fase_a`. **No enviar.**

### Formato de `pending/<fecha>.md`
```markdown
# LinkedIn nurture — pendientes — <fecha/hora>
Marca cada uno: ✅ aprobar · ✏️ editar · ❌ saltar

## 1. <Nombre> — <perfil_url>  [escalón W|V1|V2|C] · temp:<frío/tibio/caliente>  ✅
ICP: <perfil o no-icp> · <ciudad> · <empresa>
Research: <headline; post reciente; web resumida; dolor probable>
Borrador: "<texto del mensaje>"

## 2. ...
```

## Fase B — Enviar (solo lo aprobado)
1. El usuario revisa/edita `pending/` (✅/✏️/❌).
2. **Antes de nada: leer `config.kill_switch`.** Si true → NO enviar, avisar. Revisar `pausa_envios_hasta`. Contar los **V1 en frío** ya enviados hoy (día local; excluir respuestas, W y entradas `FaseA`) vs. `limits.v1_frio_per_day`; si se alcanzó, parar. Las respuestas a quien nos escribió **no consumen cap**.
3. Por contacto aprobado (saltar ❌), **1 escalón**, en tandas ≤ 3, **headed**, con `timeout` ≥ 500000:
   - **W** → reescribir `TASKS` en `scripts/li-comment.js` (`[{post_url, text, nombre}]`) y correr. **Antes de comentar, ABRIR el post y leerlo:** si el borrador no corresponde al post real (pasa con posts de video/gráfico), reescribir el comentario en el momento.
   - **V1/V2/C** → reescribir `TASKS` en `scripts/li-senddm.js` (`[{perfil_url, text, stage, nombre, attach?}]`) y correr.
   - Si un resultado trae `aborted:true` → poner `kill_switch:true`, avisar al usuario, **detener**.
   - **Restaurar el placeholder** de `TASKS`/`PROFILES` al terminar.
4. Por cada envío exitoso: append a `historial[]`, `etapa`=escalón enviado, `next_stage`=siguiente, limpiar `next_draft`, `esperando_respuesta:true` (DMs); agregar a `seen-users.json` en el primer outbound; **sync CRM** si está activo (abajo).
5. Mover `pending/*.md` a `linkedin/posted/*.md`.

> ⚠️ **El texto del DM va en UN SOLO PÁRRAFO, sin `\n` (confirmado en operación).** `li-senddm.js` teclea el texto con `page.keyboard.type()`, y en el compose de LinkedIn **Enter envía el mensaje**: un salto de línea partiría el DM y mandaría la primera mitad sola, irreversible. Al reescribir `TASKS`, afirmar `assert '\n' not in MSG`. Si el mensaje necesita aire, usar " — " o punto y seguido, nunca un salto.

> ⚠️ **Exit 137 / timeout en el envío (confirmado en operación): NUNCA reintentar a ciegas.** Con 3 DMs, `li-senddm.js` puede exceder el timeout de 600s del Bash (delays 60-150s/DM + navegación) y morir con exit 137 **después de haber enviado todo** (el kill cae en el delay final). Ante cualquier muerte del proceso: **verificar la bandeja ANTES de reintentar** — abrir `/messaging/` y revisar los hilos de arriba: snippet "Tú: <inicio del texto>" = ese DM SÍ salió. Reenviar solo los que falten. Presupuesto: ~3-4 min por DM; con 3 por tanda ya se roza el límite.

> 🔎 **La verdad del envío está en el hilo vivo**, no en el checkbox de `posted/` ni en la etapa del CRM. Si una corrida muere sin guardar estado: cruzar log + `TASKS` + hilos de `/messaging/` antes de contar el cap del día.

## Sync a NetUs Lead Machine (si `config.crm.sync_activo`)
El CRM del kit es **Lead Machine**, vía API REST con el PIT — llamadas exactas (endpoints, payloads, curl) en `.claude/skills/linkedin-nurture/references/receta-crm-lead-machine.md`. **Nunca escribir en el CRM vía navegador** — solo API. Diseño recomendado del pipeline (alineado a RECON — mide **nivel de conversación**, no "qué mandamos"):

Etapas: *Conectado* → *Conversación iniciada* → *Respondió* → *Interesad@* → *Invitado a cita* → *Agendó cita* → *Asistió* → *Seguimiento* → *Cierre*. Clave: **responder ≠ interesado** (etapas separadas); el lead magnet = **tag** `leadmagnet-enviado`, no etapa.

Mapeo escalón → etapa: M1→*Conectado* · W/V1→*Conversación iniciada* · V2→sigue + tag · respuesta real→*Respondió* · abrió el tema→*Interesad@* · C→*Invitado a cita* · agendó→*Agendó cita* · ghost/opt-out→status *lost/abandoned*.

**Por cada contacto con envío exitoso (en orden):**
1. **Contacto** — SOLO si `hilo.crm.contact_id` está vacío (primera vez). Antes, best-effort anti-duplicado: buscar por nombre. El upsert (`POST /contacts/upsert`) exige email O phone; si no hay → crear (`POST /contacts/`, permite solo-nombre). Guardar el `id` devuelto en `hilo.crm.contact_id`. Si está configurado, poblar el custom field de la URL de LinkedIn.
   - ⚠️ Si el upsert indica que el contacto **ya existía** → es un lead PREEXISTENTE: **leer su ficha antes del siguiente escalón** (puede traer historial, preferencias o DND). Ajustar el tono: ya conoce al usuario → reencuentro, no extraño.
   - Crear una **nota** con la URL de LinkedIn + headline + research + el texto enviado.
2. **Tags:** `linkedin-nurture` (base) · `temp-<frio|tibio|caliente>` · condicionales `leadmagnet-enviado` / `opt-out` / `agendo-cita`. **`temp-*` se CAMBIA, no se acumula:** al subir temperatura, remover el `temp-*` anterior y agregar el nuevo.
3. **Oportunidad** (idempotente por pipeline+contacto): upsert con `pipelineStageId` del escalón + `source` **consistente** (ej. `LinkedIn Nurture`, Title Case, siempre el mismo valor — si se omite o varía, los filtros por origen se rompen). Guardar `opportunity_id` en el hilo. Al mover etapa, re-pasar todos los campos que el upsert reescribe.
4. Guardar `hilo.crm.last_stage_synced = <escalón>`.

**Detección de "Agendó cita":** si el CRM tiene calendarios, un chequeo periódico (solo-CRM, cero riesgo LinkedIn) lee las reservas, cruza `contactId` con el pipeline y mueve la tarjeta a *Agendó cita* + tag. Idempotente: saltar si ya está en esa etapa o más adelante.

**Si el CRM no responde** durante una corrida: NO abortar el resto; guardar lo pendiente de sincronizar en `linkedin/crm-pendiente.json` y reportarlo para hacerlo después.

## Estado (`linkedin/conversaciones.json`)
Cada hilo: `slug` (/in/…), `perfil_url`, `nombre`, `research{headline, role, company, city, about_snippet, email, phone, phone_type, website, website_summary, posts[], perfil_icp, dolores_probables, posts_disponibles}`, `temperatura`, `etapa`, `next_stage`, `next_draft`, `estado` (activa/seguimiento_pausado/cerrada), `esperando_respuesta`, `historial[]`, `crm{contact_id, opportunity_id, last_stage_synced}`.

> ⚠️ **ESCRITURA SEGURA — obligatoria (lección real: una escritura directa truncó el archivo y perdió 22 de 51 hilos).** Para escribir `conversaciones.json`, `seen-users.json` o `config.json`, usar **SIEMPRE** el helper atómico:
> ```js
> const { saveJsonAtomic } = require('./scripts/li-save-json.cjs')
> saveJsonAtomic('linkedin/conversaciones.json', obj)   // desde node en la raíz del repo
> ```
> o por CLI: `node scripts/li-save-json.cjs linkedin/conversaciones.json` (objeto por stdin).
> **NUNCA** `fs.writeFileSync` directo, `open(w)`, ni `json.dump` sobre el archivo destino. El helper (1) escribe a temporal + `rename` → si algo falla el archivo destino queda INTACTO; (2) sanea surrogates Unicode sueltos que revientan la serialización; (3) valida que el JSON round-trips antes de reemplazar.

## Selectores y mecánica (CONFIRMADOS en operación real — UI en español)
LinkedIn ofusca clases y hace A/B → preferir **rol/texto/aria-label** y heurística de líneas de `<main>`, no CSS frágil. Re-descubrir con snapshot headed cuando algo salga vacío. Si la cuenta usa la UI en inglés, adaptar los textos de los selectores (`Tú:`→`You:`, `recomendar`→`like`, etc.).
- **Conexiones:** `a[href*="/in/"]` → slug `/in/<slug>/` (clave de dedupe). ✅ funciona.
- **Perfil (¡OJO variante!):** el nombre puede ir en `h1` **o `h2`**, y a veces **no existe** `.text-body-medium`. Solución confirmada: nombre desde `document.title` (`"<Nombre> | LinkedIn"`); el resto parseando **líneas de `<main>`** en orden fijo → nombre / `· 1er` (grado) / **headline** / **ciudad** / (`Información de contacto`) **empresa** / … / `Acerca de` → **about**. El "Acerca de" del **footer** va seguido de "Accesibilidad" (corto) → filtrarlo exigiendo que la línea siguiente sea larga (>40). El about es **lazy** y flaky → `waitForFunction` esperando que cargue (timeout corto; si el perfil no tiene about, expira y sigue).
- **Contacto (email/tel/web) — usar `scripts/li-contactinfo.js`:** el email SÍ suele estar. **Método confiable (confirmado):**
  1. `page.goto(perfil)` (contexto SPA) → esperar → clic en `a[href*="overlay/contact-info"]` (o `goto` al overlay como fallback).
  2. **Extraer a NIVEL DOCUMENTO:** `document.querySelectorAll('a[href^="mailto:"]')[0]` para el email, `a[href^="tel:"]` para el tel. **NO acotar a `[role="dialog"]`/`.artdeco-modal`** → esos selectores matchean los **modales de video.js** de sus posts y devuelven vacío (bug real que dejó emails fuera del CRM).
  3. `waitForFunction(() => document.querySelector('a[href^="mailto:"]'))` (12s) porque el mailto hidrata lazy tras abrir el overlay. Navegar DIRECTO a `/overlay/contact-info/` sin cargar antes el perfil abre un **modal vacío**.
  - Web/"Dirección": links `a[href^="http"]` externos (filtrar linkedin/licdn/lnkd/.mp4). `phone_type:'movil'` si el body dice Móvil/Celular. Cerrar con `Escape`.
- **Posts (recent-activity):** las clases `feed-shared-update-v2` **YA NO existen** → usar `[data-urn*="activity"]` / `[role="article"]`. El `data-urn` (`urn:li:activity:<id>`) da el **post_url** (`/feed/update/urn:li:activity:<id>/`). Requiere **scroll** (lazy). Limpiar cabecera del autor y **controles del reproductor de video** ("Velocidad de reproducción", "Pausar"…) que los posts-video vuelcan como texto; si tras limpiar quedan <40 letras → descartar (→ ese contacto salta a V1). Marcar `repost` (`ha compartido esto`).
- **Like (post):** ✅ **PROBADO EN VIVO.** ⚠️ NO existe botón "Me gusta" directo. El toggle es el botón `aria-label` que empieza con **"Estado del botón de reacción: …"** (`ninguna reacción` = sin like; `recomendar` = ya likeado). Click = aplica Me gusta. NO confundir con "Abrir el menú de reacciones". Selector: `button[aria-label^="Estado del botón de reacción" i]` + fallback texto `recomendar|me gusta|like`. **GUARD anti-unlike:** solo clickear si el aria-label dice "ninguna reacción" (o vacío); si ya está likeado, no re-clickear (togglearía y lo quita) — clave si se re-corre por un fallo del comentario.
- **Comentar:** ✅ **PROBADO EN VIVO.** botón `comentar|comment` → click → caja **`[contenteditable="true"]` aria-label "Editor de texto para crear comentarios"** (⚠️ **YA NO es `div.ql-editor`**) → `keyboard.type` → botón `publicar|comentar|post|comment`. ⚠️ **La caja es intermitente** (~40% falla al 1er intento): hay VARIAS cajas contenteditable (algunas ocultas) → **NO usar `.last()`** → recorrer y elegir la **primera VISIBLE** (`isVisible()`); y envolver en **reintento** (hasta 3: re-click "Comentar" + scroll + `waitForSelector`). Con esto pasó de 3/5 a 5/5.
- **DM:** ✅ **PROBADO EN VIVO.** ⚠️ El botón "Enviar mensaje" del top-card es un **`<a href="/messaging/compose/?...">`** (NO `<button>`; `getByRole('button')` da 0) **y hacerle `.click()` NO abre la burbuja de forma fiable**. **Solución confirmada:** extraer el `href` del ancla (`main a` cuyo texto empiece con "enviar mensaje" y el href incluya `/messaging/`) y **`page.goto('https://www.linkedin.com'+href)`** directo a la página de compose → ahí la caja **`div.msg-form__contenteditable`** (role=textbox, aria "Escribe un mensaje…") sí carga → `waitForSelector` → click → type → botón **`enviar|send`** (`.last()`) → verificar que la URL saltó a `/messaging/thread/…` y el texto está en el hilo. **Nota:** si un flujo abre compose y luego navega sin `page.on('dialog', d=>d.accept())`, salta un `beforeunload` que deja la CLI en "modal state" → `kill-all` + reopen (login persiste).
- **Bandeja:** `https://www.linkedin.com/messaging/` → `li.msg-conversation-listitem` / `a[href*="/messaging/thread/"]`. Al elegir el nombre, **saltar** etiquetas de presencia ("Estado: con conexión"), fechas y "Tú:/You:" (si no, el nombre sale como "Estado: …"). "Tú:"/"You:" al inicio del snippet ⇒ último mensaje es nuestro (`from_them=false`).

## Seguridad y límites
- **Modo aprobación:** nada sale sin OK del usuario. Ante la duda → preguntar, no adivinar. Kill-switch disponible y obligatorio ante fricción.
- **ToS de LinkedIn (honesto):** mensajería/scraping automatizado viola el acuerdo de usuario; el riesgo es de la cuenta del usuario. Por eso todo va conservador, headed y aprobado. El usuario debe saberlo antes de operar.
- **Privacidad:** datos de contacto solo en `linkedin/` (gitignored). Nunca commitear `.auth/` ni el estado. Guardar lo mínimo para personalizar. **Opt-out** ("no me interesa") → `estado:"cerrada"`, sin más contacto (y DND en el CRM si aplica).
