# Receta — Sync del pipeline en NetUs Lead Machine

Cómo reflejar cada avance del nurture en **Lead Machine** (la plataforma CRM de NetUs): contacto + nota con el research + tags + **oportunidad que avanza de etapa** en el pipeline de nurture, y detección de "agendó cita". Todo por **API REST con tu PIT** — nunca por navegador.

> Si no usas Lead Machine, deja `crm.sync_activo:false` en `linkedin/config.json` y el estado local (`linkedin/conversaciones.json`) es la única fuente de verdad. Este archivo solo aplica con Lead Machine activo.

## Setup (una vez)

### 1. Crea el pipeline de nurture (en la UI — no se puede por API)
En Lead Machine → **Opportunities → Pipelines**, crea un pipeline (ej. **"LinkedIn Nurture"**) con estas **9 etapas** en orden:
1. Conectado
2. Conversación iniciada
3. Respondió
4. Interesad@
5. Invitado a cita
6. Agendó cita
7. Asistió a cita
8. Seguimiento
9. Cierre

**Diseño (alineado a CERCA):** el pipeline mide **nivel de conversación/interés**, no "qué mandamos". Clave: *responder ≠ interesado* — por eso son etapas separadas. El lead magnet = **tag** (`leadmagnet-enviado`), no etapa (es regalo condicional).

### 2. Genera tu PIT (Private Integration Token)
En tu subcuenta de Lead Machine → **Configuración → Integraciones Privadas (Private Integrations)** → crear integración con estos permisos (scopes):
- **Contactos** — lectura y escritura
- **Oportunidades** — lectura y escritura
- **Calendarios / Eventos** — lectura
- **Campos personalizados (Custom Fields)** — lectura

Copia el token (empieza con `pit-`) y tu **Location ID** (Configuración → Perfil de la empresa). Si no ves la opción de Integraciones Privadas, pídesela a tu proveedor de Lead Machine (NetUs).

### 3. Guarda las credenciales en `.env` (NUNCA en el config ni en git)
```bash
LEADMACHINE_PIT=pit-xxxxxxxx
LEADMACHINE_LOCATION_ID=xxxxxxxx
```

### 4. Descubre los IDs y llena `linkedin/config.json`
```bash
PIT=$(grep '^LEADMACHINE_PIT=' .env | cut -d= -f2)
LOC=$(grep '^LEADMACHINE_LOCATION_ID=' .env | cut -d= -f2)

# Pipelines y stage IDs (copia los IDs de tus 9 etapas al config.crm.stage_ids)
curl -s "https://services.leadconnectorhq.com/opportunities/pipelines?locationId=$LOC" \
  -H "Authorization: Bearer $PIT" -H "Version: 2021-07-28" | node -e "process.stdin.pipe(process.stdout)"

# (Opcional) Custom fields — para guardar la URL de LinkedIn en la ficha
curl -s "https://services.leadconnectorhq.com/locations/$LOC/customFields" \
  -H "Authorization: Bearer $PIT" -H "Version: 2021-07-28"
```
Recomendado: crea en la UI un custom field de contacto **"LinkedIn Profile URL"** (tipo texto) y pon su id en `config.crm.custom_field_linkedin_id` — así la URL vive en la ficha, no solo en la nota.

Al terminar: `crm.sync_activo:true`.

## Llamadas (referencia ejecutable)
Base: `https://services.leadconnectorhq.com` · Headers SIEMPRE: `Authorization: Bearer $PIT` · `Version: 2021-07-28` · `Content-Type: application/json`.

### Contacto — crear/upsert (paso 1 del sync)
- **Con email o phone** (dedupea solo): `POST /contacts/upsert`
  ```json
  { "locationId": "<LOC>", "firstName": "Juan", "lastName": "Pérez", "name": "Juan Pérez",
    "email": "juan@...", "phone": "+52...", "city": "…", "companyName": "…", "website": "…",
    "source": "LinkedIn Nurture", "tags": ["linkedin-nurture", "temp-frio"] }
  ```
  La respuesta trae `contact.id` y un booleano `new`. ⚠️ **`new:false` = lead PREEXISTENTE** → leer su ficha (`GET /contacts/{id}`) antes del siguiente escalón: puede traer historial, preferencias o **DND** (respetarlo). Ajustar el tono: ya conoce el negocio → reencuentro, no extraño.
- **Sin email ni phone** (el upsert los exige): `POST /contacts/` con el mismo payload (permite solo-nombre). Antes, best-effort anti-duplicado: `GET /contacts/?locationId=<LOC>&query=<nombre>` — si aparece, usar ese id.
- **Guardar `contact.id` en `hilo.crm.contact_id`** y NO volver a crear.
- **Custom field LinkedIn** (si está configurado): `PUT /contacts/{contactId}` con `{ "customFields": [{ "id": "<custom_field_linkedin_id>", "value": "<perfil_url>" }] }` (merge — no borra otros campos).

### Nota con el research (paso 2)
`POST /contacts/{contactId}/notes` → `{ "body": "LinkedIn: <perfil_url> — <headline> · ICP <perfil> · dolores: <…> · enviado: <texto del mensaje>" }`

### Tags (paso 3)
- Agregar: `POST /contacts/{contactId}/tags` → `{ "tags": ["linkedin-nurture", "temp-frio"] }`
- Quitar: `DELETE /contacts/{contactId}/tags` → `{ "tags": ["temp-frio"] }`
- Set: `linkedin-nurture` (base) · `temp-<frio|tibio|caliente>` · condicionales `leadmagnet-enviado` / `opt-out` / `agendo-cita`. ⚠️ **`temp-*` se CAMBIA, no se acumula:** al subir temperatura, primero DELETE el viejo, luego POST el nuevo.

### Oportunidad (paso 4) — la tarjeta que avanza de etapa
`POST /opportunities/upsert` (idempotente por pipeline+contacto):
```json
{ "pipelineId": "<config.crm.pipeline_id>", "locationId": "<LOC>", "contactId": "<id>",
  "pipelineStageId": "<stage del escalón>", "name": "LinkedIn — <nombre>",
  "status": "open", "source": "LinkedIn Nurture" }
```
- **Guardar el `id` en `hilo.crm.opportunity_id`.** En escalones siguientes, el mismo upsert **mueve** la etapa.
- ⚠️ **Al mover etapa, re-pasar TODOS los campos** (`pipelineStageId`, `name`, `status`, `source`): el upsert reescribe la oportunidad y lo que no mandes se puede vaciar.
- ⚠️ **`source` SIEMPRE y con el MISMO valor exacto** (`LinkedIn Nurture`, Title Case — en `config.crm.source`). Si se omite o varía la grafía, los filtros por origen del reporte se rompen.
- `status`: `open` normal · `won` al llegar a *Cierre* · `lost`/`abandoned` si ghost/opt-out.
- Buscar una oportunidad existente: `GET /opportunities/search?location_id=<LOC>&contact_id=<id>&pipeline_id=<pipeline>`.

### Mapeo escalón → etapa
| Evento del nurture | Etapa (stage_id de `config.crm.stage_ids`) |
|---|---|
| M1 / contacto creado | `conectado` |
| W o V1 enviado | `conversacion_iniciada` |
| V2 (lead magnet) | no mueve etapa; solo tag `leadmagnet-enviado` (si estaba en Conectado, subir a `conversacion_iniciada`) |
| Respondió con frase real | `respondio` |
| Abrió el tema / caliente | `interesado` |
| C enviado | `invitado_cita` |
| Reservó en el calendario | `agendo_cita` (+ tag `agendo-cita` + nota con fecha/hora) |
| Asistió / seguimiento / cierre | manuales (los mueve el humano que atiende la cita) |
| Ghost / opt-out | status `lost`/`abandoned` |

## Detección de "Agendó cita" (chequeo periódico — cero riesgo LinkedIn)
Lead Machine **NO mueve la tarjeta sola** cuando alguien agenda (solo manda confirmación/recordatorio). La mueve el sistema:
1. Por cada calendario de `config.crm.consultation_calendar_ids`:
   `GET /calendars/events?locationId=<LOC>&calendarId=<id>&startTime=<epoch_ms>&endTime=<epoch_ms>` (ventana ≈ últimos 30 días a +45 días para cubrir citas futuras).
2. Junta los `contactId` de los eventos y crúzalos con las oportunidades del pipeline (`GET /opportunities/search…`).
3. Si la oportunidad existe y su etapa es **anterior** a *Agendó cita* → upsert a `agendo_cita` + tag `agendo-cita` + nota con fecha/hora de la cita.
4. **Idempotente:** saltar si ya está en *Agendó cita* o más adelante. Actualizar el hilo (`etapa:"agendo_cita"`).

## Reglas operativas
- **El sync corre DESPUÉS de cada envío exitoso de Fase B** (y al detectar respuestas en Fase A — mover a `respondio`/`interesado` + cambiar tag `temp-*` es escritura CRM pura, sin riesgo LinkedIn).
- **Si la API no responde** durante una corrida: NO abortar el resto; guardar lo pendiente en `linkedin/crm-pendiente.json` (payloads listos para reintentarlos) y reportarlo.
- **Nunca** escribir en Lead Machine vía navegador; **nunca** imprimir el PIT en outputs ni commitearlo (vive solo en `.env`, gitignored).
- Guardar `hilo.crm.last_stage_synced = <escalón>` tras cada sync para no repetir trabajo.
