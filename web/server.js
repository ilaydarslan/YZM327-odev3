#!/usr/bin/env node
// Editör için küçük yerel sunucu (dış bağımlılık yok). Tarayıcı ES modüllerini dosyadan (file://) yükleyemediği için
// repo klasörünü http üzerinden sunar. Yalnızca bu bilgisayardan erişilir (127.0.0.1).
//
//   npm run editor   → http://127.0.0.1:8080/web/

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jsonl': 'text/plain; charset=utf-8', '.fa': 'text/plain; charset=utf-8',
  '.fasta': 'text/plain; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.md': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/' || path === '/web') {
    res.writeHead(302, { Location: '/web/' }).end();
    return;
  }
  const file = normalize(join(ROOT, path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(normalize(ROOT)) || file.includes(`${sep}.git`)) {
    res.writeHead(403).end('Yasak');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Bulunamadı');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`İş akışı editörü: http://127.0.0.1:${PORT}/web/`);
});
