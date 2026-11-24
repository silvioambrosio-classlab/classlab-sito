/* Server di prova in locale: serve il sito e finge lo script Apps Script
   (usa lo stesso Code.gs con un finto foglio in memoria).
   Uso:  node docs/rassegna-stampa/server-prova.js   → http://localhost:8765
   Token finti (da mettere in sessionStorage "turniToken"): GET /token-prova?email=...&scaduto=1 */
const http = require('http'), fs = require('fs'), path = require('path');
const { nuovoMondo } = require('./test-locale.js');
const RADICE = path.join(__dirname, '..', '..'), PORTA = Number(process.env.PORTA || 8765);
const m = nuovoMondo();
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json', '.xml': 'text/xml', '.txt': 'text/plain' };
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const json = o => { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/api') {
    if (req.method === 'GET') return json(m.get(Object.fromEntries(u.searchParams)));
    let corpo = ''; req.on('data', d => corpo += d);
    return req.on('end', () => { try { const r = JSON.parse(corpo); json(m.post(r.token, r.fn, ...(r.args || []))); } catch (e) { json({ ok: false, errore: 'Richiesta non valida.' }); } });
  }
  if (u.pathname === '/token-prova') {
    const email = u.searchParams.get('email'), exp = m.futuro;
    const p = { email, hd: 'classlab.it', exp, given_name: email.split('.')[0] };
    const tok = 'h.' + b64(p) + '.firma';
    // scaduto=1: la pagina lo crede valido, ma il server lo considera scaduto
    m.token[tok] = { aud: m.CID, email, email_verified: 'true', hd: 'classlab.it', exp: u.searchParams.get('scaduto') ? 1000 : exp };
    return json({ token: tok });
  }
  if (u.pathname === '/news/config.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(`window.RASSEGNA_CONFIG = { API_URL: 'http://localhost:${PORTA}/api' };`); }
  let f = path.join(RADICE, decodeURIComponent(u.pathname));
  if (!f.startsWith(RADICE)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': TIPI[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORTA, () => console.log('Server di prova su http://localhost:' + PORTA));
