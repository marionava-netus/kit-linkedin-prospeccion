// scripts/li-contactinfo.js — lee el overlay "Información de contacto" de uno o varios perfiles → email/tel/web/dirección.
// Robusto: navega al PERFIL primero (contexto SPA), luego al overlay, y espera el mailto/dialog (li-profile a veces
// no captura el overlay en el batch → este pase dedicado lo rescata). El orquestador reescribe URLS.
// Uso: npx playwright-cli -s=linkedin run-code --filename scripts/li-contactinfo.js > downloads/li-contact.json
// Devuelve: [{url, dialog, email, tel, tel_type, web, direccion, err}]
async (page) => {
  const URLS = ["https://www.linkedin.com/in/EJEMPLO/"]; // <-- reescribir con los perfiles base (sin /overlay/)
  const out = [];
  for (const base of URLS) {
    const clean = base.split('?')[0].replace(/\/overlay\/contact-info\/?$/, '').replace(/\/+$/, '') + '/';
    const r = { url: clean, dialog: false, email: '', tel: '', tel_type: '', web: '', direccion: '', err: '' };
    try {
      // 1) cargar el perfil (contexto SPA) — abrir el overlay directo a veces redirige si no hay contexto
      await page.goto(clean, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1800);
      if (/\/(checkpoint|uas|login)\b/.test(page.url())) { r.err = 'checkpoint/login'; out.push(r); break; }
      // 2) abrir el overlay HACIENDO CLIC en el link "Información de contacto" del perfil.
      //    OJO (confirmado 2026-07-08): navegar DIRECTO a /overlay/contact-info/ abre un modal VACÍO
      //    ("This is a modal window.") — el contenido solo se hidrata vía el SPA al clicar el link.
      await page.evaluate(() => { window.scrollTo(0, 0); });
      await page.waitForTimeout(600);
      const link = page.locator('a[href*="overlay/contact-info"], a:has-text("Información de contacto"), a:has-text("Contact info")').first();
      if (await link.count()) { await link.click().catch(() => {}); }
      else { await page.goto(clean + 'overlay/contact-info/', { waitUntil: 'domcontentloaded' }); }
      // 3) POLLING real: el email queda como <a href="mailto:…"> en el DOM tras abrir el overlay.
      //    OJO (confirmado 2026-07-08): NO acotar a [role=dialog]/.artdeco-modal → esos matchean los
      //    modales de video.js de sus posts ("This is a modal window."). Escanear a NIVEL DOCUMENTO.
      await page.waitForFunction(() => !!document.querySelector('a[href^="mailto:"]'), { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(700);
      const data = await page.evaluate(() => {
        const mail = [...document.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute('href').replace('mailto:', '').split('?')[0].trim()).filter(Boolean);
        const tels = [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href').replace('tel:', '').trim()).filter(Boolean);
        // web/dirección: links http externos dentro de la sección de contacto (no linkedin/licdn/video)
        const web = [...document.querySelectorAll('a[href^="http"]')].map(a => a.href.split('?')[0])
          .filter(h => !/linkedin\.com|licdn|lnkd\.in|\.mp4|blob:/i.test(h));
        const bodyTxt = (document.querySelector('main') || document.body).innerText || '';
        const telType = tels.length ? (/m[oó]vil|celular|mobile/i.test(bodyTxt) ? 'movil' : 'otro') : '';
        return { dialog: true, email: (mail[0] || ''), tel: (tels[0] || ''), tel_type: telType, web: (web[0] || '') };
      });
      Object.assign(r, data);
      await page.keyboard.press('Escape').catch(() => {});
    } catch (e) { r.err = String(e).slice(0, 140); }
    out.push(r);
    await page.waitForTimeout(1500);
  }
  return JSON.stringify(out);
}
