// Simulatore minimo di Google Apps Script: carica il VERO Codice.gs con fogli, Drive,
// cache e verifica del token finti (in memoria). Serve solo per i test locali.
const vm = require('vm'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const CLIENT_ID = '318339263635-lc75399bm8rarehjpcvt5q8cvoi2dcm9.apps.googleusercontent.com';

function crea(opzioni = {}) {
  const stato = { tokens: {}, fetchCount: 0, files: [], now: () => Date.now() };
  const schede = {};
  const ss = {
    getSheetByName: n => schede[n] || null,
    insertSheet: n => (schede[n] = nuovaScheda()),
    getSpreadsheetTimeZone: () => 'Europe/Rome'
  };
  function scrivi(v) { return (typeof v === 'string' && v.startsWith("'")) ? v.slice(1) : v; } // Sheets consuma l'apostrofo iniziale
  function nuovaScheda() {
    const righe = [];
    const s = {
      righe,
      getLastRow: () => righe.length,
      getMaxRows: () => 1000,
      setFrozenRows() {},
      appendRow(v) { righe.push(v.map(scrivi)); },
      deleteRow(n) { righe.splice(n - 1, 1); },
      getRange(r, c, nr = 1, nc = 1) {
        const rng = {
          getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (righe[r - 1 + i] || [])[c - 1 + j] ?? '')),
          setValues(vals) { vals.forEach((riga, i) => { righe[r - 1 + i] = righe[r - 1 + i] || []; riga.forEach((x, j) => { righe[r - 1 + i][c - 1 + j] = scrivi(x); }); }); return rng; },
          setValue(x) { righe[r - 1] = righe[r - 1] || []; righe[r - 1][c - 1] = scrivi(x); return rng; },
          setFontWeight: () => rng, setNumberFormat: () => rng
        };
        return rng;
      }
    };
    return s;
  }
  const cacheMem = {};
  const sandbox = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    CacheService: { getScriptCache: () => ({ get: k => cacheMem[k] || null, put: (k, v) => { cacheMem[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ testo: t, setMimeType() { return this; }, getContent() { return t; } }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(b => (b > 127 ? b - 256 : b)),
      base64Decode: s => Array.from(Buffer.from(s, 'base64')).map(b => (b > 127 ? b - 256 : b)),
      newBlob: (byte, mime, nome) => ({ byte, mime, nome }),
      formatDate: (d, tz, fmt) => d.toISOString().slice(0, 10)
    },
    UrlFetchApp: {
      fetch(url) {
        stato.fetchCount++;
        const tok = decodeURIComponent(url.split('id_token=')[1]);
        const r = stato.tokens[tok];
        if (!r) return { getResponseCode: () => 400, getContentText: () => '{"error":"invalid_token"}' };
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify(r) };
      }
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'link' }, Permission: { VIEW: 'view' },
      getFolderById: () => ({
        createFile(blob) {
          const f = { id: 'FILE' + (stato.files.length + 1), blob, trashed: false, sharing: null };
          f.getId = () => f.id; f.setTrashed = t => { f.trashed = t; };
          f.setSharing = (a, p) => { if (opzioni.condivisioneBloccata) throw new Error('blocked'); f.sharing = [a, p]; };
          stato.files.push(f); return f;
        }
      })
    }
  };
  vm.createContext(sandbox);
  let codice = fs.readFileSync(path.join(__dirname, '..', 'Codice.gs'), 'utf8').replace("var CARTELLA_IMMAGINI_ID = '';", "var CARTELLA_IMMAGINI_ID = 'CARTELLA_FINTA';");
  vm.runInContext(codice, sandbox);
  vm.runInContext('preparaFoglio()', sandbox);

  const api = {
    stato, schede, sandbox,
    get: parametri => JSON.parse(sandbox.doGet({ parameter: parametri }).getContent()),
    post: corpo => JSON.parse(sandbox.doPost({ postData: { contents: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) } }).getContent()),
    // token finto: tokeninfo risponde come Google (override per simulare account o scadenze)
    token(email, over = {}) {
      const t = 'tok-' + crypto.randomBytes(8).toString('hex');
      stato.tokens[t] = Object.assign({ aud: CLIENT_ID, iss: 'https://accounts.google.com', email, email_verified: 'true', hd: 'classlab.it', exp: String(Math.floor(Date.now() / 1000) + 3600) }, over);
      return t;
    },
    chiama: (tok, fn, ...args) => api.post({ token: tok, fn, args })
  };
  return api;
}
module.exports = { crea, CLIENT_ID };
