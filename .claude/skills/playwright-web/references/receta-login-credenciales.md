# Receta — Login con credenciales del `.env`

Iniciar sesión en un portal **headed (visible)** usando credenciales guardadas en `.env`, **sin exponer la contraseña** en ningún output, dejando la sesión persistida para reusarla.

## Reglas de seguridad
- **Nunca imprimas la contraseña.** Usa `--raw` en los `fill` (omite el bloque "Ran Playwright code" que llevaría el valor) y pásala como variable de shell `"$VAR"` (así el comando muestra la variable, no el valor).
- Descubre los nombres de las claves sin volcar valores: `grep -iE '^[^=]*sitio[^=]*=' .env | sed -E 's/=.*/=<oculto>/'`.
- El correo/usuario sí aparece en el snapshot (campo de texto) — es aceptable; la contraseña va en campo `type=password` (enmascarado).

## Pasos (un patrón reusable)
1. **Abrir headed + perfil persistente** (la URL no es secreta):
   ```bash
   npx playwright-cli -s=web open "<URL>" --headed --persistent --profile=.auth/pw-profile
   ```
   *Tip de compatibilidad:* si el portal se rompe con el Chromium alpha de la CLI (ej. error de `pattern`/regex, o render raro), reabre con Chrome estable: añade `--browser=chrome`.
2. **Snapshot** y localizar los refs de correo, contraseña y botón:
   ```bash
   npx playwright-cli -s=web snapshot > /tmp/snap.txt 2>&1
   grep -iE 'correo|contrase|iniciar sesión|textbox|button' /tmp/snap.txt
   ```
3. **Llenar credenciales (en UN solo comando, sin fugas):**
   ```bash
   set +x
   U=$(grep -E '^SITIO_USER=' .env | cut -d= -f2-)
   P=$(grep -E '^SITIO_PASSWORD=' .env | cut -d= -f2-)
   npx playwright-cli -s=web --raw fill <ref-correo> "$U" >/dev/null 2>&1
   npx playwright-cli -s=web --raw fill <ref-pass>  "$P" >/dev/null 2>&1
   ```
   (El botón "Iniciar sesión" suele estar `[disabled]` hasta que ambos campos están llenos.)
4. **Enviar y ESPERAR la navegación:** clic en el botón y **verifica el estado EN VIVO** (no desde un snapshot previo — la navegación tarda):
   ```bash
   npx playwright-cli -s=web click <ref-boton>
   sleep 4
   npx playwright-cli -s=web --raw eval "({url: location.href})"
   ```
5. **Geolocalización (solo si el sitio la necesita):** denegar por defecto; concederla solo cuando el sitio la requiera para mostrar datos. Al concederla hay que hacer **DOS cosas juntas** (permiso **y** coordenada — sin coordenada no hay GPS real y la página puede quedar en blanco):
   ```bash
   npx playwright-cli -s=web run-code "async page => { const c = page.context(); await c.grantPermissions(['geolocation'], { origin: '<https://el-sitio>' }); await c.setGeolocation({ latitude: 19.4326, longitude: -99.1332 }); }"
   npx playwright-cli -s=web reload
   ```
   ⚠️ El permiso puede quedar en el perfil persistente, pero **`setGeolocation` es un override de runtime que NO persiste** → volver a fijar la coordenada en cada apertura.
6. **Persistir la sesión:** queda en el perfil; además respalda el storage state:
   ```bash
   npx playwright-cli -s=web state-save .auth/<portal>.json
   ```

## Lecciones aprendidas (en operación real)
- **Verifica el estado en vivo tras el submit**, no un snapshot anterior — es fácil concluir erróneamente "no entró" leyendo un snapshot viejo cuando sí entró.
- El **Chromium alpha** de la CLI puede marcar errores de `pattern`/regex y CORS/500 **cosméticos** que NO impiden el login. Si estorban, usa `--browser=chrome`.
- Muchos portales **no** tienen reto de reCAPTCHA aunque muestren el badge; intenta el login directo antes de asumir bloqueo.
- Mantén el navegador **headed** para observar y resolver cualquier captcha/2FA real si apareciera (human-in-the-loop).
