// scripts/li-connections.js — Fase A (read-only): cosecha conexiones de LinkedIn (más recientes primero).
// Requisito: la página YA debe estar en https://www.linkedin.com/mynetwork/invite-connect/connections/
// (orden por defecto = "Añadidos recientemente" / "Recently added"), abierta con
// --persistent --profile=.auth/pw-linkedin. Verifica sesión con `list` (user-data-dir != <in-memory>).
// Uso: npx playwright-cli -s=linkedin run-code --filename scripts/li-connections.js > downloads/li-conexiones.json
// Devuelve: [{nombre, slug, perfil_url, headline, connected_caption}] (más recientes primero).
//
// ⚠️ FIX 2026-07-11 (virtualización): la lista NO scrollea con window/body — vive dentro de un
// contenedor con overflow:scroll (un <main> ofuscado). Hay que (1) scrollear ESE contenedor y
// (2) CAPTURAR de forma INCREMENTAL en cada paso, porque LinkedIn recicla las tarjetas del DOM
// (solo ~10-20 presentes a la vez). Scrollear window una sola vez y extraer al final = solo top-10.
// Comprobado headed: así captura ~800 de 1353. Si en headless no scrollea, correr headed.
async (page) => {
  await page.waitForTimeout(2000);
  const data = await page.evaluate(async () => {
    // 1) localizar el contenedor scrollable real (overflow scroll/auto con contenido de sobra)
    const scroller = [...document.querySelectorAll('main,div,section')].find(e => {
      const s = getComputedStyle(e);
      return (s.overflowY === 'scroll' || s.overflowY === 'auto') && e.scrollHeight > e.clientHeight + 100;
    }) || document.scrollingElement || document.body;

    const acc = new Map();
    const grab = () => {
      for (const a of document.querySelectorAll('a[href*="/in/"]')) {
        const m = (a.getAttribute('href') || '').match(/\/in\/[^/?#]+/);
        if (!m) continue;
        const slug = m[0] + '/';                 // /in/<slug>/  (clave de dedupe)
        if (acc.has(slug)) continue;
        let box = a;
        for (let i = 0; i < 5 && box; i++) { box = box.parentElement; if (box && (box.innerText || '').trim().length > 25) break; }
        if (!box) continue;
        const lines = (box.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);
        let nombre = (a.textContent || '').trim().split('\n')[0].trim() || lines[0] || '';
        nombre = nombre.replace(/^View\s+/i, '').replace(/\s*·\s*1(st|er|ro)?\b.*/i, '').replace(/\s*·.*/, '').trim();
        if (!nombre || nombre.length < 2 || nombre.length > 60 || /^https?:/i.test(nombre)) continue;
        const headline = lines.find(l => l !== nombre
          && !/^(Conect|Connect|Mensaje|Message|Ver|View)/i.test(l)
          && !/\b20\d\d\b/.test(l)) || '';
        const connected_caption = lines.find(l =>
          /(Conect|Connect).*(20\d\d|ago|hace|mes|día|dia|semana|week|day|month)/i.test(l)) || '';
        acc.set(slug, {
          nombre: nombre.slice(0, 60),
          slug,
          perfil_url: 'https://www.linkedin.com' + slug,
          headline: headline.slice(0, 120),
          connected_caption: connected_caption.slice(0, 60)
        });
      }
    };

    // 2) scroll incremental del contenedor + captura en cada paso (para la lista virtualizada)
    grab();
    let lastH = 0, stall = 0;
    const MAX_STEPS = 40;   // ~cientos de tarjetas; el orquestador toma los N no-vistos que necesite
    for (let i = 0; i < MAX_STEPS; i++) {
      scroller.scrollTop = scroller.scrollHeight;
      await new Promise(r => setTimeout(r, 500));
      grab();
      if (scroller.scrollHeight === lastH) { stall++; if (stall >= 5) break; }
      else { stall = 0; lastH = scroller.scrollHeight; }
    }
    return [...acc.values()];
  });
  // Sin LIMIT duro: devolvemos todo lo capturado (solo nombres/slugs = barato y read-only).
  // El orquestador (Fase A) deduplica vs seen-users y toma la tanda que corresponda (anti-baneo).
  return JSON.stringify(data, null, 0);
}
