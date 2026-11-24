// Test locali dello script (Codice.gs reale, Google simulato). Esegui: node rassegna.test.js
const assert = require('assert'), { crea } = require('./gas-sim');
let n = 0;
const prova = (nome, fn) => { try { fn(); n++; console.log('  ok  ', nome); } catch (e) { console.log('  FAIL', nome, '\n      ', e.message); process.exitCode = 1; } };

const SILVIO = 'silvio.ambrosio@classlab.it', GIULIO = 'giulio.prodan@classlab.it', INFO = 'info@classlab.it', ALTRO = 'marco.rossi@classlab.it';
const img = id => 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600';
const art = (o = {}) => Object.assign({ testata: 'Il Piccolo', titolo: 'Studenti in laboratorio', data: '2026-11-20', link: 'https://example.org/a', estratto: 'Estratto', immagine: '' }, o);
const bozza = (o = {}) => Object.assign({ titolo: 'Rassegna di novembre', data: '2026-11-24', introduzione: 'Prima riga\n\nSeconda riga', copertina: '', articoli: [art()] }, o);

console.log('Lettura pubblica');
prova('archivio vuoto senza login', () => { const g = crea(); const r = g.get({ azione: 'elenco' }); assert.deepStrictEqual(r, { ok: true, dati: [] }); });
prova('azioni riservate non esistono in GET', () => {
  const g = crea(); const t = g.token(SILVIO);
  for (const a of ['leggi', 'salva', 'chiSono', 'elimina', 'stato', 'elencoAdmin']) assert.strictEqual(g.get({ azione: a, id: 'x', token: t }).ok, false);
});

console.log('Organizzatori (accesso valido)');
for (const mail of [SILVIO, GIULIO, INFO]) prova('accesso valido: ' + mail, () => {
  const g = crea(); const r = g.chiama(g.token(mail), 'chiSono'); assert.strictEqual(r.ok, true); assert.strictEqual(r.dati.email, mail);
});
prova('crea bozza, la bozza NON è visibile al pubblico', () => {
  const g = crea(); const t = g.token(SILVIO);
  const r = g.chiama(t, 'salva', bozza()); assert.ok(r.ok, r.errore); assert.strictEqual(r.dati.stato, 'bozza');
  assert.match(r.dati.slug, /^rassegna-di-novembre-2026-11-24$/);
  assert.deepStrictEqual(g.get({ azione: 'elenco' }).dati, []);
  const s = g.get({ azione: 'rassegna', r: r.dati.slug }); assert.strictEqual(s.ok, false); assert.strictEqual(s.dati, undefined);
  const perId = g.get({ azione: 'rassegna', r: r.dati.id }); assert.strictEqual(perId.ok, false);
  assert.strictEqual(g.chiama(t, 'elenco').dati.length, 1);
});
prova('pubblica: visibile, senza email né id interni', () => {
  const g = crea(); const t = g.token(SILVIO);
  const b = g.chiama(t, 'salva', bozza({ copertina: img('ABC') })).dati;
  const p = g.chiama(t, 'stato', b.id, 'pubblicata'); assert.ok(p.ok, p.errore); assert.strictEqual(p.dati.stato, 'pubblicata');
  const el = g.get({ azione: 'elenco' }); assert.strictEqual(el.dati.length, 1);
  const s = g.get({ azione: 'rassegna', r: b.slug }); assert.ok(s.ok); assert.strictEqual(s.dati.articoli.length, 1);
  const testo = JSON.stringify([el, s]); assert.ok(!testo.includes('@classlab.it')); assert.ok(!testo.includes(b.id));
  assert.ok(!('stato' in s.dati) && !('modificata_da' in s.dati));
});
prova('togli dalla pubblicazione: torna invisibile', () => {
  const g = crea(); const t = g.token(GIULIO);
  const b = g.chiama(t, 'salva', bozza()).dati; g.chiama(t, 'stato', b.id, 'pubblicata');
  assert.strictEqual(g.get({ azione: 'elenco' }).dati.length, 1);
  assert.strictEqual(g.chiama(t, 'stato', b.id, 'bozza').dati.stato, 'bozza');
  assert.strictEqual(g.get({ azione: 'elenco' }).dati.length, 0);
  assert.strictEqual(g.get({ azione: 'rassegna', r: b.slug }).ok, false);
});
prova('modificare una pubblicata la lascia pubblicata; modificare la rende incompleta è rifiutato', () => {
  const g = crea(); const t = g.token(SILVIO);
  const b = g.chiama(t, 'salva', bozza()).dati; const p = g.chiama(t, 'stato', b.id, 'pubblicata').dati;
  const ok = g.chiama(t, 'salva', Object.assign({}, p, { titolo: 'Nuovo titolo' })); assert.ok(ok.ok); assert.strictEqual(ok.dati.stato, 'pubblicata'); assert.strictEqual(ok.dati.slug, b.slug);
  const male = g.chiama(t, 'salva', Object.assign({}, ok.dati, { articoli: [] })); assert.strictEqual(male.ok, false);
});
prova('pubblicare una rassegna incompleta è rifiutato; la bozza incompleta si salva', () => {
  const g = crea(); const t = g.token(SILVIO);
  const b = g.chiama(t, 'salva', { titolo: 'Solo titolo' }); assert.ok(b.ok);
  const p = g.chiama(t, 'stato', b.dati.id, 'pubblicata'); assert.strictEqual(p.ok, false);
  assert.strictEqual(g.get({ azione: 'elenco' }).dati.length, 0);
});
prova('elimina rassegna e articoli; registro tiene traccia', () => {
  const g = crea(); const t = g.token(SILVIO);
  const b = g.chiama(t, 'salva', bozza({ articoli: [art(), art({ titolo: 'B' })] })).dati;
  assert.strictEqual(g.schede.Articoli.righe.length, 3);
  assert.ok(g.chiama(t, 'elimina', b.id).ok);
  assert.strictEqual(g.schede.Rassegne.righe.length, 1); assert.strictEqual(g.schede.Articoli.righe.length, 1);
  assert.deepStrictEqual(g.schede.Registro.righe.slice(1).map(r => r[2]), ['crea', 'elimina']);
  assert.strictEqual(g.chiama(t, 'leggi', b.id).ok, false);
});
prova('due rassegne con lo stesso titolo hanno slug diversi', () => {
  const g = crea(); const t = g.token(SILVIO);
  const a = g.chiama(t, 'salva', bozza()).dati, b = g.chiama(t, 'salva', bozza()).dati; assert.notStrictEqual(a.slug, b.slug);
});
prova('articoli: ordine mantenuto', () => {
  const g = crea(); const t = g.token(SILVIO);
  const b = g.chiama(t, 'salva', bozza({ articoli: [art({ titolo: 'Uno' }), art({ titolo: 'Due' }), art({ titolo: 'Tre' })] })).dati;
  assert.deepStrictEqual(b.articoli.map(a => a.titolo), ['Uno', 'Due', 'Tre']);
});
prova('modifica contemporanea: la seconda viene bloccata', () => {
  const g = crea(); const t = g.token(SILVIO);
  const v1 = g.chiama(t, 'salva', bozza()).dati;
  const a = g.chiama(t, 'salva', Object.assign({}, v1, { titolo: 'A' })); assert.ok(a.ok);
  const b = g.chiama(t, 'salva', Object.assign({}, v1, { titolo: 'B' })); assert.strictEqual(b.ok, false); assert.strictEqual(b.conflitto, true);
});

console.log('Account NON autorizzato (@classlab.it ma non organizzatore)');
prova('non può leggere né scrivere nulla', () => {
  const g = crea(); const org = g.token(SILVIO); const b = g.chiama(org, 'salva', bozza()).dati;
  const t = g.token(ALTRO); const prima = JSON.stringify(g.schede);
  for (const [fn, ...args] of [['chiSono'], ['elenco'], ['leggi', b.id], ['salva', bozza({ titolo: 'Intruso' })], ['salva', Object.assign({}, b, { titolo: 'Hack' })], ['stato', b.id, 'pubblicata'], ['elimina', b.id], ['carica', 'a.jpg', 'image/jpeg', 'AAAA']]) {
    const r = g.chiama(t, fn, ...args); assert.strictEqual(r.ok, false, fn); assert.strictEqual(r.vietato, true, fn); assert.ok(!r.dati, fn);
  }
  assert.strictEqual(JSON.stringify(g.schede), prima); assert.strictEqual(g.stato.files.length, 0);
});
prova('email simile a un organizzatore non passa', () => {
  const g = crea();
  for (const m of ['silvio.ambrosio@classlab.it.evil.com', 'Silvio.Ambrosio2@classlab.it', 'info@classlab.org']) {
    const r = g.chiama(g.token(m), 'chiSono'); assert.strictEqual(r.ok, false, m);
  }
});

console.log('Token non valido / scaduto');
prova('token scaduto', () => { const g = crea(); const r = g.chiama(g.token(SILVIO, { exp: String(Math.floor(Date.now() / 1000) - 10) }), 'elenco'); assert.strictEqual(r.ok, false); assert.strictEqual(r.auth, true); });
prova('token che scade tra pochi secondi', () => { const g = crea(); const r = g.chiama(g.token(SILVIO, { exp: String(Math.floor(Date.now() / 1000) + 5) }), 'elenco'); assert.strictEqual(r.auth, true); });
prova('token respinto da Google (falso/manomesso)', () => { const g = crea(); const r = g.chiama('token-inventato', 'elenco'); assert.strictEqual(r.ok, false); assert.strictEqual(r.auth, true); });
prova('token di un altro client (aud diverso)', () => { const g = crea(); assert.strictEqual(g.chiama(g.token(SILVIO, { aud: 'altro.apps.googleusercontent.com' }), 'elenco').auth, true); });
prova('account Gmail con email da organizzatore ma senza dominio', () => { const g = crea(); assert.strictEqual(g.chiama(g.token(INFO, { hd: undefined }), 'elenco').auth, true); assert.strictEqual(g.chiama(g.token(INFO, { hd: 'gmail.com' }), 'elenco').auth, true); });
prova('email non verificata', () => { const g = crea(); assert.strictEqual(g.chiama(g.token(SILVIO, { email_verified: 'false' }), 'elenco').auth, true); });
prova('emittente sbagliato', () => { const g = crea(); assert.strictEqual(g.chiama(g.token(SILVIO, { iss: 'https://evil.example' }), 'elenco').auth, true); });
prova('senza token / token non testo / corpo non valido', () => {
  const g = crea();
  assert.strictEqual(g.post({ fn: 'elenco', args: [] }).auth, true); assert.strictEqual(g.post({ token: 123, fn: 'elenco' }).auth, true);
  assert.strictEqual(g.post('non json').ok, false); assert.strictEqual(g.post({ token: g.token(SILVIO), fn: 'constructor' }).ok, false);
});
prova('token valido messo in cache, ma una scadenza vicina lo scarta', () => {
  const g = crea(); const t = g.token(SILVIO); g.chiama(t, 'elenco'); g.chiama(t, 'elenco'); assert.strictEqual(g.stato.fetchCount, 1);
});

console.log('Controlli sui dati');
prova('link non http(s) e immagini esterne rifiutati', () => {
  const g = crea(); const t = g.token(SILVIO);
  assert.strictEqual(g.chiama(t, 'salva', bozza({ articoli: [art({ link: 'javascript:alert(1)' })] })).ok, false);
  assert.strictEqual(g.chiama(t, 'salva', bozza({ articoli: [art({ immagine: 'https://evil.example/x.png' })] })).ok, false);
  assert.strictEqual(g.chiama(t, 'salva', bozza({ copertina: 'javascript:1' })).ok, false);
  assert.strictEqual(g.chiama(t, 'salva', bozza({ data: '2026-02-31' })).ok, false);
  assert.strictEqual(g.chiama(t, 'salva', bozza({ titolo: '   ' })).ok, false);
});
prova('testo che sembra una formula viene salvato come testo', () => {
  const g = crea(); const t = g.token(SILVIO);
  const b = g.chiama(t, 'salva', bozza({ titolo: '=IMPORTXML("http://x")' })).dati; assert.strictEqual(b.titolo, '=IMPORTXML("http://x")');
  assert.ok(g.schede.Rassegne.righe[1][2].startsWith('='));
});
prova('colonne cambiate nel foglio: errore chiaro, nessuna scrittura', () => {
  const g = crea(); const t = g.token(SILVIO); g.schede.Rassegne.righe[0].splice(2, 0, 'colonna_inserita');
  const r = g.chiama(t, 'salva', bozza()); assert.strictEqual(r.ok, false); assert.match(r.errore, /colonne/i); assert.strictEqual(g.schede.Rassegne.righe.length, 1);
  assert.strictEqual(g.get({ azione: 'elenco' }).ok, false);
});
prova('scheda rinominata: errore chiaro', () => { const g = crea(); delete g.schede.Rassegne; assert.match(g.get({ azione: 'elenco' }).errore, /manca la scheda/i); });

console.log('Immagini');
prova('carica immagine valida: condivisa e URL del Drive', () => {
  const g = crea(); const r = g.chiama(g.token(SILVIO), 'carica', 'foto copertina.jpg', 'image/jpeg', Buffer.from('xyz').toString('base64'));
  assert.ok(r.ok, r.errore); assert.match(r.dati.url, /^https:\/\/drive\.google\.com\/thumbnail\?id=FILE1&sz=w1600$/); assert.deepStrictEqual(g.stato.files[0].sharing, ['link', 'view']);
});
prova('formato errato o troppo grande rifiutati', () => {
  const g = crea(); const t = g.token(SILVIO);
  assert.strictEqual(g.chiama(t, 'carica', 'a.exe', 'application/x-msdownload', 'AAAA').ok, false);
  assert.strictEqual(g.chiama(t, 'carica', 'a.svg', 'image/svg+xml', 'AAAA').ok, false);
  assert.strictEqual(g.chiama(t, 'carica', 'a.jpg', 'image/jpeg', Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64')).ok, false);
  assert.strictEqual(g.stato.files.length, 0);
});
prova('condivisione esterna bloccata: errore chiaro e file cestinato', () => {
  const g = crea({ condivisioneBloccata: true }); const r = g.chiama(g.token(SILVIO), 'carica', 'a.png', 'image/png', 'AAAA');
  assert.strictEqual(r.ok, false); assert.match(r.errore, /pubblica/i); assert.strictEqual(g.stato.files[0].trashed, true);
});

console.log('\n' + n + ' prove superate' + (process.exitCode ? ' — CI SONO ERRORI' : ''));
