// scripts/li-senddm.js — Fase B (ENVÍA): escalones V1/V2/C = DM al contacto. EL SCRIPT MÁS DELICADO.
// Mecánica de envío de DM en el overlay de mensajería de LinkedIn + checks de fricción/anti-baneo.
// El orquestador SOLO corre esto si config.kill_switch=false, tras aprobación del usuario, y REESCRIBE TASKS.
// Volumen BAJO (≤3 por invocación), headed, timeout ≥ 500000. Aborta ante CUALQUIER señal de bloqueo.
// Uso: npx playwright-cli -s=linkedin run-code --filename scripts/li-senddm.js > downloads/li-dm.json
// TASKS: [{perfil_url, text, stage, nombre, attach?}]  →  Devuelve: [{perfil_url, stage, sent, attached, aborted, err}]
//   attach = ruta ABSOLUTA a un PDF (ej. ebook del V2). Se adjunta en el DM antes de enviar. Si el adjunto FALLA,
//   NO se envía el mensaje (para no mandar "te dejo el ebook" sin el ebook). Solo V2 lo usa; V1/C van sin attach.
// ⚠️ Selectores heurísticos (ES/EN). Verificar en el primer login headed. NUNCA correr con kill_switch=true.
async (page) => {
  page.on('dialog', d => d.accept().catch(() => {}))
  const TASKS = [{ "perfil_url": "https://www.linkedin.com/in/EJEMPLO/", "text": "Hola EJEMPLO, un gusto haber conectado. <observación anclada en un dato real de su perfil>; ¿pregunta abierta sobre él/ella?", "stage": "V1", "nombre": "Ejemplo" }]; // <-- Fase B reescribe esta línea: [{perfil_url, text, stage, nombre, attach?}]
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a))
  const friction = async () => {
    if (/\/(checkpoint|uas|login)\b/.test(page.url())) return 'checkpoint/login'
    const bad = await page.evaluate(() => /has alcanzado el l[ií]mite|reached the.*limit|restricted|actividad inusual|unusual activity|verifica que eres|captcha|no puedes enviar|can.t send/i.test(document.body.innerText || '')).catch(() => false)
    return bad ? 'banner-limite' : ''
  }
  const results = []
  for (const t of TASKS) {
    const r = { perfil_url: t.perfil_url, stage: t.stage, sent: false, attached: false, aborted: false, err: '' }
    try {
      await page.goto(t.perfil_url, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(rnd(2800, 4500))
      const f1 = await friction(); if (f1) { r.aborted = true; r.err = f1; results.push(r); break }
      // abrir la página de compose de mensaje.
      // OJO (confirmado 2026-07-06): el botón "Enviar mensaje" del top-card es un <a href="/messaging/compose/?...">,
      // y hacerle .click() NO abre la burbuja de forma fiable (queda en el perfil, sin caja). Solución: extraer el href
      // y NAVEGAR directo a /messaging/compose/ — ahí la caja `div.msg-form__contenteditable` (aria "Escribe un mensaje…") sí carga.
      const href = await page.evaluate(() => {
        const a = [...document.querySelectorAll('main a')].find(x =>
          /^enviar mensaje/i.test((x.getAttribute('aria-label') || x.innerText || '').trim()) && (x.getAttribute('href') || '').includes('/messaging/'))
        return a ? a.getAttribute('href') : ''
      })
      if (!href) { r.err = 'no-message-button'; results.push(r); continue }
      await page.goto('https://www.linkedin.com' + href, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(rnd(3200, 4800))
      const f1b = await friction(); if (f1b) { r.aborted = true; r.err = f1b; results.push(r); break }
      // caja de compose. Selector confirmado + fallbacks por aria/role.
      const boxSel = 'div.msg-form__contenteditable[contenteditable="true"], [contenteditable="true"][aria-label*="mensaje" i], [contenteditable="true"][aria-placeholder*="mensaje" i], [contenteditable="true"][aria-label*="message" i], [contenteditable="true"][role="textbox"]'
      await page.waitForSelector(boxSel, { timeout: 15000 }).catch(() => {})
      const box = page.locator(boxSel).last()
      if (!(await box.count())) { r.err = 'no-compose-box'; results.push(r); continue }
      await box.scrollIntoViewIfNeeded().catch(() => {})
      await box.click({ timeout: 12000 })
      await page.waitForTimeout(rnd(900, 1800))
      await page.keyboard.type(t.text, { delay: rnd(35, 95) })
      await page.waitForTimeout(rnd(1400, 2600))
      // Adjuntar PDF (V2 = ebook regalo). Regla de seguridad: si el adjunto NO carga, NO enviar el mensaje.
      // ⚠️ Selector del input a CONFIRMAR en el 1er envío V2 headed (LinkedIn ofusca clases).
      if (t.attach) {
        const base = t.attach.split('/').pop()
        // el input de archivo suele estar oculto en el DOM del msg-form; setInputFiles funciona sin click.
        let fi = page.locator('.msg-form input[type="file"], form[class*="msg-form"] input[type="file"]')
        if (!(await fi.count())) {
          // si no está, intentar revelarlo con el botón de adjuntar
          const clip = page.locator('button[aria-label*="Adjuntar" i], button[aria-label*="archivo" i], button[aria-label*="attach" i], button[aria-label*="file" i]').first()
          if (await clip.count()) { await clip.click().catch(() => {}); await page.waitForTimeout(1200) }
          fi = page.locator('input[type="file"]')
        }
        if (!(await fi.count())) { r.err = 'no-file-input'; results.push(r); continue }
        await fi.first().setInputFiles(t.attach).catch((e) => { r.err = 'setfiles:' + String(e).slice(0, 60) })
        if (r.err) { results.push(r); continue }
        // esperar el preview del adjunto (chip con el nombre / .pdf / nodo de attachment)
        await page.waitForFunction((name) => {
          const bt = document.body.innerText || ''
          return bt.includes(name) || /\.pdf/i.test(bt) || !!document.querySelector('[class*="attachment" i]')
        }, base, { timeout: 25000 }).catch(() => {})
        await page.waitForTimeout(rnd(1800, 3200))
        const okAttach = await page.evaluate((name) => {
          const bt = document.body.innerText || ''
          return bt.includes(name) || /\.pdf/i.test(bt) || !!document.querySelector('[class*="attachment" i]')
        }, base).catch(() => false)
        if (!okAttach) { r.err = 'attach-failed'; results.push(r); continue } // NO enviar sin el ebook
        r.attached = true
      }
      const send = page.getByRole('button', { name: /^(enviar|send)$/i }).last()
      await send.click()
      await page.waitForTimeout(rnd(2500, 4000))
      r.sent = await page.evaluate((txt) => (document.body.innerText || '').includes(txt.slice(0, 30)), t.text).catch(() => false)
      const f2 = await friction(); if (f2) { r.aborted = true; r.err = f2; results.push(r); break }
    } catch (e) { r.err = String(e).slice(0, 140) }
    results.push(r)
    await page.waitForTimeout(rnd(60000, 150000)) // delay HUMANO entre DMs (anti-baneo)
  }
  return JSON.stringify(results)
}
