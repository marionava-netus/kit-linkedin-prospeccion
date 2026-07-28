// scripts/li-comment.js — Fase B (ENVÍA): escalón W = like + 1 comentario genuino en el post reciente del contacto.
// Like + comentario en un post de LinkedIn + checks de fricción/anti-baneo.
// El orquestador (Fase B) SOLO corre esto si config.kill_switch=false, tras aprobación del usuario, y REESCRIBE TASKS.
// Volumen BAJO (≤3 por invocación), headed, timeout ≥ 500000. Aborta ante cualquier señal de bloqueo.
// Uso: npx playwright-cli -s=linkedin run-code --filename scripts/li-comment.js > downloads/li-commented.json
// TASKS: [{post_url, text, nombre}]  →  Devuelve: [{post_url, liked, commented, aborted, err}]
// ⚠️ Selectores heurísticos (ES/EN). Verificar en el primer login headed.
async (page) => {
  page.on('dialog', d => d.accept().catch(() => {}))
  const TASKS = [{ "post_url": "https://www.linkedin.com/feed/update/EJEMPLO", "text": "Comentario de ejemplo", "nombre": "Ejemplo" }] // <-- Fase B reescribe
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a))
  const friction = async () => {
    if (/\/(checkpoint|uas|login)\b/.test(page.url())) return 'checkpoint/login'
    const bad = await page.evaluate(() => /has alcanzado el l[ií]mite|reached the.*limit|restricted|actividad inusual|unusual activity|verifica que eres|captcha/i.test(document.body.innerText || '')).catch(() => false)
    return bad ? 'banner-limite' : ''
  }
  const results = []
  for (const t of TASKS) {
    const r = { post_url: t.post_url, liked: false, commented: false, aborted: false, err: '' }
    try {
      await page.goto(t.post_url, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(rnd(2500, 4000))
      const f1 = await friction(); if (f1) { r.aborted = true; r.err = f1; results.push(r); break }
      // LIKE (confirmado 2026-07-06): NO existe botón "Me gusta" directo; el toggle de like es el botón cuyo
      // aria-label empieza con "Estado del botón de reacción: …" (ES). Click = aplica "Me gusta".
      // NO confundir con "Abrir el menú de reacciones" (menú de emojis). Fallback a texto Recomendar/Like (otras variantes).
      try {
        const like = page.locator('button[aria-label^="Estado del botón de reacción" i], button[aria-label*="reaction button state" i]')
          .or(page.getByRole('button', { name: /^(recomendar|me gusta|like)$/i })).first()
        if (await like.count()) {
          const lbl = (await like.getAttribute('aria-label').catch(() => '')) || ''
          // dar like SOLO si aún no hay reacción; si ya está ("...: recomendar") no re-clickear (togglearía y lo quitaría)
          if (/ninguna reacci[oó]n|no reaction/i.test(lbl) || lbl === '') { await like.click(); r.liked = true; await page.waitForTimeout(rnd(1200, 2500)) }
          else { r.liked = true } // ya estaba likeado
        }
      } catch (e) {}
      // COMENTAR: abrir caja → escribir con jitter → publicar.
      // Caja (confirmado 2026-07-06): contenteditable aria-label "Editor de texto para crear comentarios" (ya NO div.ql-editar).
      // A veces no aparece al primer click de "Comentar" (intermitente) → reintento con scroll + waitForSelector.
      const boxSel = '[contenteditable="true"][aria-label*="comentario" i], [contenteditable="true"][aria-placeholder*="comentario" i], [contenteditable="true"][aria-label*="comment" i], div.ql-editor[contenteditable="true"], [contenteditable="true"][role="textbox"]'
      let box = null
      for (let attempt = 0; attempt < 3 && !box; attempt++) {
        try {
          const cbtn = page.getByRole('button', { name: /^(comentar|comment)$/i }).first()
          if (await cbtn.count()) { await cbtn.click().catch(() => {}); await page.waitForTimeout(rnd(1500, 2500)) }
        } catch (e) {}
        await page.waitForSelector(boxSel, { timeout: 10000 }).catch(() => {})
        // puede haber varias cajas (algunas ocultas) → elegir la PRIMERA VISIBLE, no .last()
        const cands = page.locator(boxSel)
        const n = await cands.count()
        for (let i = 0; i < n; i++) { const c = cands.nth(i); if (await c.isVisible().catch(() => false)) { box = c; break } }
        if (!box) { await page.mouse.wheel(0, 700); await page.waitForTimeout(1300) }
      }
      if (!box) throw new Error('no-comment-box')
      await box.scrollIntoViewIfNeeded().catch(() => {})
      await box.click({ timeout: 12000 })
      await page.waitForTimeout(rnd(800, 1600))
      await page.keyboard.type(t.text, { delay: rnd(35, 90) })
      await page.waitForTimeout(rnd(1200, 2200))
      const post = page.getByRole('button', { name: /^(publicar|comentar|post|comment)$/i }).last()
      await post.click()
      await page.waitForTimeout(rnd(2800, 4200))
      r.commented = await page.evaluate((txt) => (document.body.innerText || '').includes(txt.slice(0, 30)), t.text).catch(() => false)
      const f2 = await friction(); if (f2) { r.aborted = true; r.err = f2; results.push(r); break }
    } catch (e) { r.err = String(e).slice(0, 140) }
    results.push(r)
    await page.waitForTimeout(rnd(45000, 120000)) // delay HUMANO entre contactos (anti-baneo)
  }
  return JSON.stringify(results)
}
