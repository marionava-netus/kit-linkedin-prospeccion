// scripts/li-readdm.js — Fase A (read-only): lee la bandeja de mensajes de LinkedIn para DETECTAR RESPUESTAS.
// Abre https://www.linkedin.com/messaging/ y devuelve las conversaciones visibles con nombre, snippet y no-leído.
// El orquestador cruza estos nombres contra los hilos con esperando_respuesta=true en conversaciones.json:
// si el último mensaje NO empieza con "Tú:"/"You:" (from_them=true) → el contacto respondió → avanza el escalón.
// Uso: npx playwright-cli -s=linkedin run-code --filename scripts/li-readdm.js > downloads/li-inbox.json
// Devuelve: [{nombre, snippet, unread, from_them}]
// ⚠️ Selectores heurísticos. Ajustar en el primer login headed si la bandeja sale vacía.
async (page) => {
  await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  if (/\/(checkpoint|uas|login)\b/.test(page.url())) return JSON.stringify({ err: 'checkpoint/login' });
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 1200); await page.waitForTimeout(600); }
  const data = await page.evaluate(() => {
    const res = [], seen = new Set();
    const cards = document.querySelectorAll('li.msg-conversation-listitem, li[class*="conversation"], a[href*="/messaging/thread/"]');
    for (const c of cards) {
      const box = c.closest('li') || c;
      const lines = (box.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);
      if (!lines.length) continue;
      // saltar etiquetas de presencia ("Estado: con conexión"), fechas y "Tú:/You:" al elegir el nombre
      const noise = l => /^(Estado:|Status:|En l[ií]nea|Activ[oa]|Active|Disponible|Ausente|Away|T[uú]:|You:)/i.test(l)
        || /^\d/.test(l) || /^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|lun|mié|jue|vie|s[áa]b|dom)\b/i.test(l);
      const nombre = lines.find(l => l.length >= 2 && l.length <= 60 && !noise(l)) || lines[0];
      if (!nombre || nombre.length > 60 || seen.has(nombre)) continue;
      seen.add(nombre);
      const snipLine = lines.find(l => /^(T[uú]:|You:)/i.test(l))
        || lines.filter(l => l !== nombre && l.length > 4 && !/^(Estado:|Status:)/i.test(l)).sort((a, b) => b.length - a.length)[0] || '';
      const from_them = !/^(T[uú]:|You:)/i.test(snipLine); // si NO empieza con "Tú:", el último mensaje es de ellos
      const unread = /unread/i.test(box.className || '') || box.querySelector('.notification-badge, [class*="unread"]') != null;
      res.push({ nombre: nombre.slice(0, 60), snippet: snipLine.slice(0, 120), unread, from_them });
      if (res.length >= 40) break;
    }
    return res;
  });
  return JSON.stringify(data);
}
