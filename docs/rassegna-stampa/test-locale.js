/* Prova in locale di Code.gs con un finto Apps Script e dati inventati.
   Uso:  node docs/rassegna-stampa/test-locale.js
   Non usa Google: il login vero e Drive/Sheets reali si possono provare solo online. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');

function nuovoMondo() {
  const fogli = {};
  const mkFoglio = nome => {
    const righe = [];
    return {
      righe,
      getDataRange: () => ({ getValues: () => righe.map(r => r.slice()) }),
      getLastColumn: () => (righe[0] || []).length,
      getLastRow: () => righe.length,
      getMaxRows: () => 1000,
      setFrozenRows() {},
      getRange: (r, c, nr, nc) => ({
        getValues: () => [righe[r - 1].slice(c - 1, c - 1 + nc)],
        setValues: v => { righe[r - 1] = v[0].slice(); return { setFontWeight() {} }; },
        setNumberFormat() {}
      }),
      appendRow: r => righe.push(r.slice()),
      deleteRow: n => righe.splice(n - 1, 1)
    };
  };
  const token = {}; // token finti -> risposta di tokeninfo
  const cacheMem = {};
  const sandbox = {
    console, Date, JSON, Array, Object, String, Number, isNaN, encodeURIComponent,
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ t, setMimeType() { return this; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => cacheMem[k] || null, put: (k, v) => { cacheMem[k] = v; }, remove: k => { delete cacheMem[k]; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'cartellaFinta' }) },
    Logger: { log() {} },
    Utilities: {
      getUuid: () => require('crypto').randomUUID(),
      formatDate: d => d.toISOString().slice(0, 10),
      base64Decode: b => Array.from(Buffer.from(b, 'base64')),
      newBlob: (b, m, n) => ({ b, m, n })
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 1 }, Permission: { VIEW: 1 },
      getFolderById: () => ({ createFile: blob => ({ getId: () => 'FILE' + blob.n.replace(/\W/g, '').padEnd(12, 'x'), setSharing() {} }) }),
      getFileById: () => ({ setTrashed() {} })
    },
    UrlFetchApp: {
      fetch: url => {
        const t = decodeURIComponent(url.split('id_token=')[1]);
        const r = token[t];
        return { getResponseCode: () => (r ? 200 : 400), getContentText: () => JSON.stringify(r || {}) };
      }
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: n => fogli[n] || null,
        insertSheet: n => (fogli[n] = mkFoglio(n))
      })
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(__dirname + '/Code.gs', 'utf8'), sandbox);
  vm.runInContext('setup()', sandbox);
  const get = fn => JSON.parse(vm.runInContext('doGet', sandbox)({ parameter: fn }).t);
  const post = (tok, fn, ...args) => JSON.parse(vm.runInContext('doPost', sandbox)({ postData: { contents: JSON.stringify({ token: tok, fn, args }) } }).t);
  const CID = vm.runInContext('CLIENT_ID', sandbox);
  const futuro = Math.floor(Date.now() / 1000) + 3000;
  token['T_SILVIO.x.y'] = { aud: CID, email: 'silvio.ambrosio@classlab.it', email_verified: 'true', hd: 'classlab.it', exp: futuro };
  token['T_INFO.x.y'] = { aud: CID, email: 'info@classlab.it', email_verified: 'true', hd: 'classlab.it', exp: futuro };
  token['T_ALTRO.x.y'] = { aud: CID, email: 'mario.rossi@classlab.it', email_verified: 'true', hd: 'classlab.it', exp: futuro };
  token['T_SCADUTO.x.y'] = { aud: CID, email: 'silvio.ambrosio@classlab.it', email_verified: 'true', hd: 'classlab.it', exp: 1000 };
  token['T_ESTERNO.x.y'] = { aud: CID, email: 'silvio.ambrosio@gmail.com', email_verified: 'true', exp: futuro };
  token['T_ALTROCLIENT.x.y'] = { aud: 'altro-client', email: 'silvio.ambrosio@classlab.it', email_verified: 'true', hd: 'classlab.it', exp: futuro };
  return { get, post, fogli };
}

let ok = 0;
function prova(nome, f) { try { f(); ok++; console.log('  ok  ' + nome); } catch (e) { console.log('FAIL  ' + nome + '\n      ' + e.message); process.exitCode = 1; } }

const m = nuovoMondo();
const S = 'T_SILVIO.x.y';
const bozza = { titolo: 'Ricerca & scuole', data: '2026-11-20', introduzione: 'Prima riga\n\nSeconda <b>riga</b>', copertina_id: '',
  articoli: [{ testata: 'Il Piccolo', titolo: 'Studenti in classe', data: '2026-11-18', link: 'https://example.org/a', estratto: 'Un estratto', immagine_id: '' }] };

prova('organizzatore valido crea una bozza', () => {
  const r = m.post(S, 'salva', bozza);
  assert(r.ok, r.errore); assert.strictEqual(r.dati.stato, 'bozza'); assert(/^2026-11-20-ricerca-scuole/.test(r.dati.slug));
  global.id1 = r.dati.id; global.slug1 = r.dati.slug;
});
prova('la bozza NON è visibile al pubblico (elenco e singola)', () => {
  assert.deepStrictEqual(m.get({ fn: 'pubbliche' }).dati, []);
  assert.strictEqual(m.get({ fn: 'pubblica', slug: global.slug1 }).ok, false);
});
prova('dal pubblico non si può chiamare nulla di riservato', () => {
  for (const fn of ['elenco', 'salva', 'leggi', 'elimina']) assert.strictEqual(m.get({ fn }).ok, false);
});
prova('non si pubblica senza articoli', () => {
  const r = m.post(S, 'salva', Object.assign({}, bozza, { articoli: [] }));
  const v = m.post(S, 'impostaStato', r.dati.id, 'pubblicata');
  assert.strictEqual(v.ok, false); m.post(S, 'elimina', r.dati.id);
});
prova('pubblicazione: ora è visibile, senza email né dati interni', () => {
  const r = m.post(S, 'impostaStato', global.id1, 'pubblicata'); assert(r.ok, r.errore);
  const l = m.get({ fn: 'pubbliche' }).dati; assert.strictEqual(l.length, 1);
  const d = m.get({ fn: 'pubblica', slug: global.slug1 }).dati;
  assert.strictEqual(d.articoli.length, 1);
  const testo = JSON.stringify([l, d]);
  assert(!/classlab\.it|creata_da|modificata|"id"|rassegna_id/.test(testo), 'dati interni esposti: ' + testo);
});
prova('togliere dalla pubblicazione la nasconde di nuovo (anche dalla cache)', () => {
  m.post(S, 'impostaStato', global.id1, 'bozza');
  assert.deepStrictEqual(m.get({ fn: 'pubbliche' }).dati, []);
  assert.strictEqual(m.get({ fn: 'pubblica', slug: global.slug1 }).ok, false);
});
prova('account @classlab.it NON organizzatore: rifiutato dal server su ogni funzione', () => {
  for (const [fn, ...a] of [['elenco'], ['leggi', global.id1], ['salva', bozza], ['impostaStato', global.id1, 'pubblicata'], ['elimina', global.id1], ['caricaImmagine', 'a.png', 'image/png', 'AAAA']]) {
    const r = m.post('T_ALTRO.x.y', fn, ...a);
    assert.strictEqual(r.ok, false, fn); assert(/riservata/i.test(r.errore), fn);
  }
  assert.strictEqual(m.fogli.Rassegne.righe.length, 2, 'il foglio è stato toccato'); // intestazione + 1 rassegna
});
prova('token scaduto, assente, malformato, di altro dominio o altro client: rifiutati con auth', () => {
  for (const t of ['T_SCADUTO.x.y', 'T_ESTERNO.x.y', 'T_ALTROCLIENT.x.y', 'T_SCONOSCIUTO.x.y', 'senzapunti', '', null, 42]) {
    const r = m.post(t, 'elenco'); assert.strictEqual(r.ok, false, String(t)); assert.strictEqual(r.auth, true, String(t));
  }
});
prova('info@ può scrivere; funzione inesistente rifiutata', () => {
  assert(m.post('T_INFO.x.y', 'elenco').ok);
  assert.strictEqual(m.post(S, 'constructor').ok, false);
  assert.strictEqual(m.post(S, '__proto__').ok, false);
});
prova('validazioni: link non http, data falsa, titolo vuoto', () => {
  const art = Object.assign({}, bozza.articoli[0]);
  assert.strictEqual(m.post(S, 'salva', Object.assign({}, bozza, { articoli: [Object.assign({}, art, { link: 'javascript:alert(1)' })] })).ok, false);
  assert.strictEqual(m.post(S, 'salva', Object.assign({}, bozza, { data: '2026-02-31' })).ok, false);
  assert.strictEqual(m.post(S, 'salva', Object.assign({}, bozza, { titolo: '  ' })).ok, false);
});
prova('modifica mantiene lo stesso indirizzo e sostituisce gli articoli', () => {
  const r = m.post(S, 'salva', Object.assign({}, bozza, { id: global.id1, titolo: 'Titolo cambiato', articoli: bozza.articoli.concat([{ titolo: 'Secondo', link: 'https://example.org/b' }]) }));
  assert(r.ok, r.errore); assert.strictEqual(r.dati.slug, global.slug1); assert.strictEqual(r.dati.articoli.length, 2);
  assert.strictEqual(m.fogli.Articoli.righe.length, 3);
});
prova('immagine: formato non ammesso e caricamento valido', () => {
  assert.strictEqual(m.post(S, 'caricaImmagine', 'x.exe', 'application/x-msdownload', 'AAAA').ok, false);
  const r = m.post(S, 'caricaImmagine', 'foto.png', 'image/png', Buffer.from('png finto').toString('base64'));
  assert(r.ok, r.errore); assert(/^https:\/\/drive\.google\.com\/thumbnail\?id=/.test(r.dati.url));
});
prova('eliminazione cancella rassegna e articoli', () => {
  assert(m.post(S, 'elimina', global.id1).ok);
  assert.strictEqual(m.fogli.Rassegne.righe.length, 1); assert.strictEqual(m.fogli.Articoli.righe.length, 1);
});
prova('il registro (Log) annota chi ha fatto cosa', () => {
  const az = m.fogli.Log.righe.slice(1).map(r => r[2]);
  assert(['creazione', 'pubblicazione', 'ritiro', 'modifica', 'eliminazione'].every(a => az.includes(a)), az.join());
});
console.log(`\n${ok} prove superate` + (process.exitCode ? ', ALCUNE FALLITE' : ''));
