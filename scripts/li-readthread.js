// scripts/li-readthread.js — Fase A (SOLO LECTURA): abre un hilo de mensajería por NOMBRE y extrae los últimos mensajes.
// Para leer la respuesta completa de un contacto y decidir el siguiente escalón. NO envía nada.
// Uso: npx playwright-cli -s=linkedin run-code --filename scripts/li-readthread.js > downloads/li-thread.json
// NAME: substring del nombre a abrir. Devuelve: {nombre, thread_url, mensajes:[{de, texto}]}
async (page) => {
  const NAME = ""
  const out = { nombre: NAME, thread_url: '', mensajes: [], vistos: [], err: '' }
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  try {
    await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4500)
    // iterar sobre los items de la lista de conversaciones (incluyen nombre + snippet)
    const items = page.locator('li.msg-conversation-listitem, .msg-conversations-container__convo-item')
    let n = await items.count()
    if (!n) { const alt = page.locator('a[href*="/messaging/thread/"]'); n = await alt.count() }
    const list = (await items.count()) ? items : page.locator('a[href*="/messaging/thread/"]')
    let clicked = false
    for (let i = 0; i < (await list.count()); i++) {
      const el = list.nth(i)
      const txt = (await el.innerText().catch(() => '')) || ''
      out.vistos.push(txt.split('\n')[0].slice(0, 40))
      if (norm(txt).includes(norm(NAME))) {
        const link = el.locator('a[href*="/messaging/thread/"]').first()
        if (await link.count()) { out.thread_url = await link.getAttribute('href').catch(() => ''); await link.click() }
        else { await el.click() }
        clicked = true; break
      }
    }
    if (!clicked) { out.err = 'conversacion-no-encontrada'; return JSON.stringify(out) }
    await page.waitForTimeout(3500)
    // extraer los bloques de mensajes: sender + cuerpo(s)
    out.mensajes = await page.evaluate(() => {
      const res = []
      const groups = document.querySelectorAll('.msg-s-message-group, .msg-s-event-listitem')
      let lastSender = ''
      groups.forEach(g => {
        const nameEl = g.querySelector('.msg-s-message-group__name')
        if (nameEl && nameEl.innerText.trim()) lastSender = nameEl.innerText.trim()
        const bodies = g.querySelectorAll('.msg-s-event-listitem__body')
        bodies.forEach(b => {
          const t = (b.innerText || '').trim()
          if (t) res.push({ de: lastSender, texto: t })
        })
      })
      return res.slice(-12)
    })
  } catch (e) { out.err = String(e).slice(0, 160) }
  return JSON.stringify(out)
}
