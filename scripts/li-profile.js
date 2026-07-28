// scripts/li-profile.js — Fase A (read-only): investiga perfiles de LinkedIn para personalizar el mensaje.
// Para cada URL: extrae nombre/headline/role/company/city/about + email/teléfono/website (overlay "Información de
// contacto") + posts recientes. El orquestador (Fase A) REESCRIBE el array PROFILES antes de correr.
// Uso: npx playwright-cli -s=linkedin run-code --filename scripts/li-profile.js > downloads/li-research.json
// Devuelve: [{perfil_url, nombre, headline, role, company, city, about, email, phone, phone_type, website,
//             posts:[{url,tema,repost,age_days,fresh}], posts_disponibles, w_elegible, post_w}]
//   w_elegible/post_w: regla del usuario — W (like+comentario) SOLO si hay post propio (no repost) de ≤10 días; si no → V1.
// ⚠️ Selectores confirmados en el 1er login headed (2026-07-06): el nombre puede ir en h1 o h2 → se usa <title> +
//    líneas de <main> (orden fijo). Posts vía [data-urn*="activity"]/[role="article"] (las clases feed-shared-* ya no existen).
//    Contacto: overlay best-effort (muchos perfiles no comparten email/tel). La web se resume aparte con WebFetch.
async (page) => {
  const PROFILES = ["https://www.linkedin.com/in/EJEMPLO/"]; // <-- Fase A reescribe esta línea // <-- Fase A reescribe esta línea
  const out = [];
  for (const url of PROFILES) {
    const r = { perfil_url: url, nombre: '', headline: '', role: '', company: '', city: '', about: '', email: '', phone: '', phone_type: '', website: '', posts: [], posts_disponibles: false };
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      // señal de bloqueo/login → abortar limpio (no seguir raspando en una cuenta gateada)
      if (/\/(checkpoint|uas|login)\b/.test(page.url())) { r.err = 'checkpoint/login'; out.push(r); break; }
      // scroll suave para forzar el lazy-load de "Acerca de" / actividad, luego volver arriba
      for (let s = 0; s < 4; s++) { await page.mouse.wheel(0, 1400); await page.waitForTimeout(700); }
      // esperar a que "Acerca de" cargue (lazy y algo flaky); si el perfil no tiene about, expira rápido y sigue
      await page.waitForFunction(() => {
        const m = document.querySelector('main'); if (!m) return false;
        const ls = (m.innerText || '').split('\n').map(s => s.trim());
        const i = ls.findIndex(l => /^(Acerca de|About)$/i.test(l));
        return i >= 0 && ls[i + 1] && ls[i + 1].length > 40;
      }, { timeout: 3500 }).catch(() => {});
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      await page.waitForTimeout(600);
      const prof = await page.evaluate(() => {
        // LinkedIn ofusca clases y hace A/B (a veces el nombre va en h1, a veces en h2, sin .text-body-medium).
        // Estrategia robusta: el <title> es la fuente más estable del nombre, y el top-card en <main> tiene
        // orden fijo -> nombre / "· 1er" (grado) / headline / ciudad / (Información de contacto) empresa / … / "Acerca de" about.
        const mainEl = document.querySelector('main') || document.body;
        const lines = (mainEl.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);
        let nombre = (document.title || '').split('|')[0].trim();
        if (!nombre || nombre.length > 60) nombre = lines[0] || '';
        const di = lines.findIndex(l => /^·?\s*(1er|2do|3er|1st|2nd|3rd)\b/i.test(l) && l.length < 14);
        let headline = '', city = '', company_top = '';
        if (di >= 0) {
          headline = lines[di + 1] || '';
          for (let i = di + 2; i < Math.min(di + 5, lines.length); i++) {
            const s = lines[i];
            if (!s || s === '·') continue;
            if (s.length < 60 && /,|México|Mexico|España|Spain|Colombia|Argentina|Chile|Perú|Peru|USA|United|Estados|EE\.?UU/i.test(s)) city = s;
            break;
          }
        }
        const ci = lines.findIndex(l => /^(Información de contacto|Contact info)$/i.test(l));
        if (ci >= 0) company_top = (lines[ci + 1] || '').slice(0, 60);
        let about = '';
        for (let k = 0; k < lines.length - 1; k++) {  // el "Acerca de" real va seguido de texto largo; el del footer va seguido de "Accesibilidad" (corto)
          if (/^(Acerca de|About)$/i.test(lines[k]) && lines[k + 1] && lines[k + 1].length > 40) {
            about = lines[k + 1].replace(/[…\.]{1,3}\s*(más|more)$/i, '').trim().slice(0, 600); break;
          }
        }
        let website = '';
        for (const a of document.querySelectorAll('a[href^="http"]')) {
          const h = a.getAttribute('href') || '';
          if (!/linkedin\.com|licdn|lnkd\.in/i.test(h)) { website = h.split('?')[0]; break; }
        }
        return { nombre, headline: headline.slice(0, 160), city: city.slice(0, 60), about, website, company_top };
      });
      Object.assign(r, prof);
      r.role = r.headline.split(/[|·•]/)[0].trim();
      r.company = r.company_top || (r.headline.match(/(?:en|at|\|)\s+([A-ZÁÉÍÓÚ][\w&.\- ]{2,40})/) || [])[1]?.trim() || '';
      delete r.company_top;
      // Información de contacto (email / teléfono / web) — overlay best-effort. Prioriza email de dominio propio y
      // teléfono móvil (probable WhatsApp). Muchos perfiles no comparten nada: se deja vacío y se sigue.
      try {
        const cl = page.locator('a[href*="overlay/contact-info"]').first();
        if (await cl.count()) {
          await cl.click().catch(() => {});
          await page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(1600);
          const ci = await page.evaluate(() => {
            const d = document.querySelector('[role="dialog"]') || document;
            const txt = d.innerText || '';
            // email: mailto es lo más limpio; fallback a regex (los emails no dan falsos positivos)
            const email = ([...d.querySelectorAll('a[href^="mailto:"]')].map(a => a.href.replace('mailto:', '').trim())[0])
              || (txt.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || '';
            // teléfono: SOLO tel: o texto con separadores (+ / espacios / guiones) para no confundir el ID del slug (dígitos puros)
            let phone = ([...d.querySelectorAll('a[href^="tel:"]')].map(a => a.href.replace('tel:', '').trim())[0]) || '';
            if (!phone) { const m = txt.match(/(\+?\d[\d\s().-]{8,}\d)/); if (m && /[\s().+-]/.test(m[1])) phone = m[1].trim(); }
            const phone_type = phone && /m[oó]vil|celular|cell|mobile/i.test(txt) ? 'movil' : '';
            const web = [...d.querySelectorAll('a[href^="http"]')].map(a => a.href.split('?')[0]).find(h => !/linkedin\.com|licdn|lnkd\.in/i.test(h)) || '';
            return { email, phone, phone_type, web };
          });
          r.email = ci.email || ''; r.phone = ci.phone || ''; r.phone_type = ci.phone_type || '';
          if (!r.website && ci.web) r.website = ci.web;
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(700);
        }
      } catch (e) { r.contact_err = String(e).slice(0, 80); }
      // posts recientes (para el escalón W: like + comentario en algo real)
      try {
        await page.goto(url.replace(/\/$/, '') + '/recent-activity/all/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);
        for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 1500); await page.waitForTimeout(800); }
        r.posts = await page.evaluate(({ nombre, headline }) => {
          const L = s => (s.match(/[A-Za-zÁÉÍÓÚáéíóúñÑ]/g) || []).length;
          // limpia la cabecera del autor y el chrome de UI, dejando el cuerpo real del post
          const clean = (t) => (t || '').split('\n').map(s => s.trim()).filter(Boolean)
            .filter(l => l !== nombre && l !== headline
              && !/^N[úu]mero de publicaci|^Se han cargado|^[•·]\s|^[•·]$|^\d+\s*(a[ñn]os?|mes(es)?|sem(ana)?s?|d[ií]as?|h|horas?|min(uto)?s?)\b|^Editado|^Reproducir|^Cargado:|^Tiempo restante|^\d+:\d+$|^\d+x$|^Ver traducci|^See translation|^Seguir$|^Follow$|^hashtag$|^…\s*(más|more)$|seguidores$|followers$|ha compartido esto$|shared this$/i.test(l)
              // controles del reproductor de video (los posts-video volcaban su UI como "texto")
              && !/^(Velocidad de reproducci|Dejar de silenciar|Silenciar|Activar el sonido|Activar la pantalla|Pantalla completa|Pausar|Reanudar|Subt[ií]tulos|Configuraci[oó]n|Play|Pause|Mute|Unmute|Fullscreen|Settings|Captions|Playback speed)/i.test(l))
            .join(' ').replace(/\s+/g, ' ').trim();
          const res = [], seen = new Set();
          const nowMs = Date.now();
          for (const el of document.querySelectorAll('[data-urn*="activity"], [role="article"]')) {
            const urn = el.getAttribute('data-urn') || '';
            const repost = /ha compartido esto|shared this/i.test(el.innerText || '');
            const tx = clean(el.innerText);
            if (L(tx) < 40) continue;
            const idm = urn.match(/urn:li:activity:(\d+)/);
            const key = (idm || [, tx.slice(0, 40)])[1];
            if (seen.has(key)) continue; seen.add(key);
            const purl = idm ? ('https://www.linkedin.com/feed/update/urn:li:activity:' + idm[1] + '/') : '';
            // antigüedad exacta desde el timestamp embebido en el activity id (id >> 22 = ms epoch); locale-independiente
            let age_days = null;
            if (idm) { try { const t = Number(BigInt(idm[1]) >> 22n); if (t > 1262304000000) age_days = Math.round((nowMs - t) / 86400000); } catch (e) {} }
            res.push({ url: purl, tema: tx.slice(0, 220), repost, age_days, fresh: age_days !== null && age_days >= 0 && age_days <= 10 });
            if (res.length >= 5) break;
          }
          return res;
        }, { nombre: r.nombre, headline: r.headline });
      } catch (e) { r.posts_err = String(e).slice(0, 60); }
      r.posts_disponibles = r.posts.length > 0;
      // W-elegibilidad (regla del usuario): solo like+comentario si tiene post PROPIO (no repost) de ≤10 días.
      const wp = r.posts.find(p => !p.repost && p.fresh);
      r.w_elegible = !!wp;             // true → escalón W; false → sin post reciente → va a V1
      r.post_w = wp ? wp.url : '';     // post a comentar (propio y fresco)
    } catch (e) { r.err = String(e).slice(0, 120); }
    out.push(r);
    await page.waitForTimeout(1500);
  }
  return JSON.stringify(out);
}
