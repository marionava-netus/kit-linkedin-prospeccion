// scripts/li-save-json.cjs — Escritura ATÓMICA y segura de los JSON de estado de LinkedIn
// (conversaciones.json, seen-users.json, config.json). Nace del incidente 2026-07-16:
// un script abrió conversaciones.json en modo `w` (trunca), falló al serializar por un
// surrogate Unicode suelto (\ud835) y perdió 22 de 51 hilos.
//
// Garantías:
//   1. ATÓMICO: escribe a un temporal y hace rename. Si algo falla (serializar, disco,
//      proceso muerto a media), el archivo destino queda INTACTO — nunca se trunca.
//   2. SANEA surrogates Unicode sueltos (los que rompen json.dump de Python con
//      ensure_ascii): quedan como �. Los pares válidos (emoji) se conservan.
//   3. VALIDA que lo escrito vuelve a parsear ANTES de reemplazar el destino.
//
// Uso como módulo:  const { saveJsonAtomic } = require('./li-save-json.cjs'); saveJsonAtomic(ruta, obj)
// Uso como CLI:     node scripts/li-save-json.cjs <ruta>   (el objeto JSON llega por stdin)
//   → imprime "OK <ruta> (<n> bytes)" o "ERROR <mensaje>" y exit 1 sin tocar el destino.

const fs = require('fs');
const path = require('path');

// Reemplaza surrogates SUELTOS (high sin low que le siga, o low sin high antes) por �.
// Conserva los pares válidos (p.ej. emoji). Sin dependencias.
function sanitizeSurrogates(str) {
  return str.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])([\uDC00-\uDFFF])/g,
    (m, loneLow) => (loneLow ? m.replace(loneLow, '�') : '�')
  );
}

// Sanea los surrogates DURANTE la serialización (replacer). Así JSON.stringify maneja
// nativamente circular ("Converting circular structure...") y BigInt sin recursión propia
// que reviente el stack; nosotros solo limpiamos los valores string.
function saveJsonAtomic(destPath, obj, { indent = 1 } = {}) {
  const replacer = (k, v) => (typeof v === 'string' ? sanitizeSurrogates(v) : v);
  // Si serializar lanza (circular, BigInt, etc.), lanza AQUÍ — antes de tocar el destino.
  const text = JSON.stringify(obj, replacer, indent);
  if (typeof text !== 'string') throw new Error('JSON.stringify devolvió undefined (valor no serializable en la raíz)');
  // Validar que round-trips antes de reemplazar.
  JSON.parse(text);

  const dir = path.dirname(destPath);
  const tmp = path.join(dir, '.' + path.basename(destPath) + '.tmp-' + process.pid);
  fs.writeFileSync(tmp, text);
  try {
    fs.renameSync(tmp, destPath); // atómico en el mismo filesystem
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  }
  return Buffer.byteLength(text);
}

module.exports = { saveJsonAtomic, sanitizeSurrogates };

// --- CLI ---
if (require.main === module) {
  const dest = process.argv[2];
  if (!dest) { console.error('ERROR uso: node scripts/li-save-json.cjs <ruta>  (JSON por stdin)'); process.exit(1); }
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => (input += d));
  process.stdin.on('end', () => {
    try {
      const obj = JSON.parse(input);
      const n = saveJsonAtomic(dest, obj);
      console.log(`OK ${dest} (${n} bytes)`);
    } catch (e) {
      console.error('ERROR', e.message, '— destino NO modificado');
      process.exit(1);
    }
  });
}
