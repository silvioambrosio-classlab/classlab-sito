// Server di prova locale: serve il sito statico e simula gli script Google (il VERO Codice.gs, Google finto).
const http = require('http'), fs = require('fs'), path = require('path'), { crea } = require('./gas-sim');
const RADICE = path.join(__dirname, '..', '..', '..'), PORTA = Number(process.env.PORTA || 8123);
let sim = crea();
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const jwt = (email, exp) => 'e30.' + Buffer.from(JSON.stringify({ email, hd: 'classlab.it', exp, given_name: email.split('.')[0], name: email })).toString('base64url') + '.firma';

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const json = (o, c = 200) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (url.pathname === '/_test/reset') { sim = crea(); return json({ ok: 1 }); }
  if (url.pathname === '/_test/stato') return json({ rassegne: sim.schede.Rassegne.righe, articoli: sim.schede.Articoli.righe, registro: sim.schede.Registro.righe, files: sim.stato.files.length });
  if (url.pathname === '/_test/token') { // JWT finto + registrato presso la verifica simulata
    const email = url.searchParams.get('email'), scad = Number(url.searchParams.get('exp') || Math.floor(Date.now() / 1000) + 3600);
    const t = jwt(email, scad); if (url.searchParams.get('registra') !== '0') sim.stato.tokens[t] = { aud: require('./gas-sim').CLIENT_ID, iss: 'https://accounts.google.com', email, email_verified: 'true', hd: 'classlab.it', exp: String(scad) };
    return json({ token: t });
  }
  if (url.pathname === '/rassegna-api') {
    if (req.method === 'GET') return json(sim.get(Object.fromEntries(url.searchParams)));
    let b = ''; req.on('data', d => b += d); req.on('end', () => json(sim.post(b))); return;
  }
  if (url.pathname === '/turni-api') { let b = ''; req.on('data', d => b += d); req.on('end', () => json({ ok: true, dati: { livello: 1, ruolo: 'Gestore' } })); return; }
  let p = decodeURIComponent(url.pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RADICE, p);
  if (!f.startsWith(RADICE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  let corpo = fs.readFileSync(f);
  if (p === '/assets/js/config.js') corpo = corpo.toString().replace('rassegnaEndpoint: ""', `rassegnaEndpoint: "http://localhost:${PORTA}/rassegna-api"`);
  if (p === '/turni/config.js') corpo = corpo.toString().replace(/API_URL: '[^']*'/, `API_URL: 'http://localhost:${PORTA}/turni-api'`);
  res.writeHead(200, { 'content-type': TIPI[path.extname(f)] || 'application/octet-stream' }); res.end(corpo);
}).listen(PORTA, () => console.log('pronto su ' + PORTA));
