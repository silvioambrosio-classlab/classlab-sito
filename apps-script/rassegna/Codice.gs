/**
 * ClassLab – RASSEGNA STAMPA (Google Apps Script)
 * ---------------------------------------------------------------------
 * Script COLLEGATO al foglio Google "ClassLab – Rassegna stampa"
 * (dal foglio: Estensioni → Apps Script). Schema delle schede in SCHEMA.md.
 *
 * LETTURA PUBBLICA (GET, senza login): restituisce SOLO le rassegne con stato
 *   "pubblicata". Le bozze non escono mai da qui.
 * SCRITTURA E LETTURA RISERVATA (POST con token Google): verificata ogni volta
 *   sul server. Passa solo chi ha un account @classlab.it valido E la cui
 *   email è tra gli ORGANIZZATORI qui sotto.
 *
 * Dopo ogni modifica a questo codice: Distribuisci → Gestisci distribuzioni →
 * matita → Versione: "Nuova versione" (su OGNI distribuzione in uso).
 *
 * Prima configurazione (una volta sola):
 *   1. Compila CARTELLA_IMMAGINI_ID (cartella "Rassegna stampa" nel Drive ClassLab).
 *   2. Esegui la funzione preparaFoglio() e concedi i permessi.
 *   3. Distribuisci → Nuova distribuzione → App web
 *      (Esegui come: me · Chi ha accesso: Chiunque) e copia l'URL "/exec"
 *      in assets/js/config.js (rassegnaEndpoint).
 */

var CLIENT_ID = '318339263635-lc75399bm8rarehjpcvt5q8cvoi2dcm9.apps.googleusercontent.com';
var DOMINIO = 'classlab.it';
var ORGANIZZATORI = [
  'silvio.ambrosio@classlab.it',
  'giulio.prodan@classlab.it',
  'info@classlab.it'
];
var CARTELLA_IMMAGINI_ID = ''; // ID della cartella Drive "Rassegna stampa"

var SCHEDA_RASSEGNE = 'Rassegne';
var SCHEDA_ARTICOLI = 'Articoli';
var SCHEDA_REGISTRO = 'Registro';
// NON cambiare l'ordine e non inserire colonne in mezzo: nuove colonne solo in fondo.
var COL_RASSEGNE = ['id', 'slug', 'titolo', 'data', 'introduzione', 'copertina', 'stato', 'creata_il', 'modificata_il', 'modificata_da', 'pubblicata_il'];
var COL_ARTICOLI = ['rassegna_id', 'ordine', 'testata', 'titolo', 'data', 'link', 'estratto', 'immagine'];
var COL_REGISTRO = ['quando', 'email', 'azione', 'rassegna_id'];

var MAX = { titolo: 200, introduzione: 5000, testata: 100, estratto: 1000, link: 1000, articoli: 60, immagineByte: 4 * 1024 * 1024 };
var RE_IMMAGINE = /^https:\/\/drive\.google\.com\/thumbnail\?id=[\w-]+(&sz=w\d+)?$/;
var RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

/* ===================== PUNTI DI INGRESSO ===================== */

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.azione === 'elenco') return rispondi_({ ok: true, dati: elencoPubblico_() });
    if (p.azione === 'rassegna') return rispondi_({ ok: true, dati: rassegnaPubblica_(String(p.r || '')) });
    return rispondi_({ ok: false, errore: 'Richiesta non valida.' });
  } catch (err) {
    return rispondi_(erroreJson_(err));
  }
}

function doPost(e) {
  try {
    var req;
    try { req = JSON.parse(e.postData.contents); } catch (x) { throw errore_('Richiesta non valida.'); }
    var email = verificaToken_(req.token);                       // 1) chi sei (Google)
    if (ORGANIZZATORI.indexOf(email) < 0) {                      // 2) sei un organizzatore?
      throw errore_('Accesso riservato agli organizzatori.', { vietato: true });
    }
    var args = Array.isArray(req.args) ? req.args : [];
    var azioni = {
      chiSono: function () { return { email: email, organizzatore: true }; },
      elenco: function () { return elencoAdmin_(); },
      leggi: function (id) { return leggiRassegna_(String(id || '')); },
      salva: function (dati) { return salva_(dati, email); },
      stato: function (id, nuovo) { return cambiaStato_(String(id || ''), String(nuovo || ''), email); },
      elimina: function (id) { return elimina_(String(id || ''), email); },
      carica: function (nome, mime, base64) { return caricaImmagine_(nome, mime, base64, email); }
    };
    if (!Object.prototype.hasOwnProperty.call(azioni, req.fn)) throw errore_('Operazione non valida.');
    return rispondi_({ ok: true, dati: azioni[req.fn].apply(null, args) });
  } catch (err) {
    return rispondi_(erroreJson_(err));
  }
}

/* ===================== VERIFICA ACCESSO ===================== */

function verificaToken_(tok) {
  var NON_VALIDO = 'Accesso non valido o scaduto: accedi di nuovo.';
  if (!tok || typeof tok !== 'string' || tok.length > 4096) throw errore_(NON_VALIDO, { auth: true });
  var cache = CacheService.getScriptCache();
  var chiave = 'tok_' + hash_(tok);
  var salvato = cache.get(chiave);
  if (salvato) {
    try {
      var c = JSON.parse(salvato);
      if (c.exp * 1000 > Date.now() + 30000) return c.email;
    } catch (x) {}
  }
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(tok), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw errore_(NON_VALIDO, { auth: true });
  var t;
  try { t = JSON.parse(r.getContentText()); } catch (x) { throw errore_(NON_VALIDO, { auth: true }); }
  var email = String(t.email || '').toLowerCase();
  var ok = t.aud === CLIENT_ID &&
    (t.iss === 'accounts.google.com' || t.iss === 'https://accounts.google.com') &&
    Number(t.exp) * 1000 > Date.now() + 30000 &&
    String(t.email_verified) === 'true' &&
    t.hd === DOMINIO &&
    email.slice(-(DOMINIO.length + 1)) === '@' + DOMINIO;
  if (!ok) throw errore_(NON_VALIDO, { auth: true });
  var secondi = Math.min(300, Math.floor(Number(t.exp) - Date.now() / 1000) - 30);
  if (secondi > 0) cache.put(chiave, JSON.stringify({ email: email, exp: Number(t.exp) }), secondi);
  return email;
}

function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s).map(function (b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}

/* ===================== LETTURA PUBBLICA ===================== */

function elencoPubblico_() {
  return leggiRighe_(SCHEDA_RASSEGNE, COL_RASSEGNE)
    .filter(function (r) { return r.stato === 'pubblicata'; })
    .sort(function (a, b) { return a.data < b.data ? 1 : (a.data > b.data ? -1 : 0); })
    .map(function (r) { return { slug: r.slug, titolo: r.titolo, data: r.data, introduzione: r.introduzione, copertina: r.copertina }; });
}

function rassegnaPubblica_(slug) {
  var r = leggiRighe_(SCHEDA_RASSEGNE, COL_RASSEGNE).filter(function (x) { return x.slug === slug && x.stato === 'pubblicata'; })[0];
  if (!r) throw errore_('Rassegna non trovata.');
  return {
    slug: r.slug, titolo: r.titolo, data: r.data, introduzione: r.introduzione, copertina: r.copertina,
    articoli: articoliDi_(r.id).map(articoloPubblico_)
  };
}

function articoloPubblico_(a) {
  return { testata: a.testata, titolo: a.titolo, data: a.data, link: a.link, estratto: a.estratto, immagine: a.immagine };
}

/* ===================== LETTURA RISERVATA ===================== */

function elencoAdmin_() {
  var conteggio = {};
  leggiRighe_(SCHEDA_ARTICOLI, COL_ARTICOLI).forEach(function (a) { conteggio[a.rassegna_id] = (conteggio[a.rassegna_id] || 0) + 1; });
  return leggiRighe_(SCHEDA_RASSEGNE, COL_RASSEGNE)
    .sort(function (a, b) { return a.data < b.data ? 1 : (a.data > b.data ? -1 : 0); })
    .map(function (r) {
      return { id: r.id, slug: r.slug, titolo: r.titolo, data: r.data, stato: r.stato, copertina: r.copertina,
        modificata_il: r.modificata_il, modificata_da: r.modificata_da, pubblicata_il: r.pubblicata_il, articoli: conteggio[r.id] || 0 };
    });
}

function leggiRassegna_(id) {
  var r = trovaRassegna_(id);
  if (!r) throw errore_('Rassegna non trovata.');
  return completa_(r);
}

function completa_(r) {
  return {
    id: r.id, slug: r.slug, titolo: r.titolo, data: r.data, introduzione: r.introduzione, copertina: r.copertina,
    stato: r.stato, creata_il: r.creata_il, modificata_il: r.modificata_il, modificata_da: r.modificata_da, pubblicata_il: r.pubblicata_il,
    versione: r.modificata_il,
    articoli: articoliDi_(r.id).map(articoloPubblico_)
  };
}

/* ===================== SCRITTURA ===================== */

function salva_(dati, email) {
  return conBlocco_(function () {
    var d = pulisci_(dati);
    var f = foglio_(SCHEDA_RASSEGNE, COL_RASSEGNE);
    var esistente = d.id ? trovaRassegna_(d.id) : null;
    if (d.id && !esistente) throw errore_('Rassegna non trovata: forse è stata eliminata.');
    var adesso = ora_(esistente && esistente.modificata_il);
    var stato = 'bozza', id, slug, creata, pubblicata = '';
    if (esistente) {
      if (String(dati.versione || '') !== String(esistente.modificata_il)) {
        throw errore_('Questa rassegna è stata modificata da qualcun altro nel frattempo. Ricarica la pagina e riprova.', { conflitto: true });
      }
      id = esistente.id; slug = esistente.slug; creata = esistente.creata_il; stato = esistente.stato; pubblicata = esistente.pubblicata_il;
      if (stato === 'pubblicata') controllaPerPubblicare_(d); // già online: deve restare completa
    } else {
      id = Utilities.getUuid(); slug = slugUnico_(d.titolo, d.data); creata = adesso;
    }
    var riga = [id, slug, d.titolo, d.data, d.introduzione, d.copertina, stato, creata, adesso, email, pubblicata];
    if (esistente) f.getRange(esistente._riga, 1, 1, COL_RASSEGNE.length).setValues([riga.map(sicuro_)]);
    else f.appendRow(riga.map(sicuro_));
    sostituisciArticoli_(id, d.articoli);
    registra_(email, esistente ? 'modifica' : 'crea', id);
    return leggiRassegna_(id);
  });
}

function cambiaStato_(id, nuovo, email) {
  if (nuovo !== 'pubblicata' && nuovo !== 'bozza') throw errore_('Stato non valido.');
  return conBlocco_(function () {
    var r = trovaRassegna_(id);
    if (!r) throw errore_('Rassegna non trovata.');
    if (nuovo === 'pubblicata') {
      controllaPerPubblicare_({ titolo: r.titolo, data: r.data, introduzione: r.introduzione, articoli: articoliDi_(id) });
    }
    var adesso = ora_(r.modificata_il);
    var f = foglio_(SCHEDA_RASSEGNE, COL_RASSEGNE);
    f.getRange(r._riga, COL_RASSEGNE.indexOf('stato') + 1).setValue(nuovo);
    f.getRange(r._riga, COL_RASSEGNE.indexOf('modificata_il') + 1).setValue(adesso);
    f.getRange(r._riga, COL_RASSEGNE.indexOf('modificata_da') + 1).setValue(email);
    if (nuovo === 'pubblicata') f.getRange(r._riga, COL_RASSEGNE.indexOf('pubblicata_il') + 1).setValue(adesso);
    registra_(email, nuovo === 'pubblicata' ? 'pubblica' : 'toglie-pubblicazione', id);
    return leggiRassegna_(id);
  });
}

function elimina_(id, email) {
  return conBlocco_(function () {
    var r = trovaRassegna_(id);
    if (!r) throw errore_('Rassegna non trovata.');
    sostituisciArticoli_(id, []);
    foglio_(SCHEDA_RASSEGNE, COL_RASSEGNE).deleteRow(r._riga);
    registra_(email, 'elimina', id);
    return { eliminata: id };
  });
}

function caricaImmagine_(nome, mime, base64, email) {
  if (!/^image\/(jpeg|png|webp)$/.test(String(mime))) throw errore_('Formato non supportato: usa JPG, PNG o WebP.');
  if (!CARTELLA_IMMAGINI_ID) throw errore_('Cartella immagini non configurata nello script.');
  var byte = Utilities.base64Decode(String(base64 || ''));
  if (!byte.length || byte.length > MAX.immagineByte) throw errore_('Immagine troppo grande (massimo 4 MB).');
  var pulito = String(nome || 'immagine').replace(/[^\w.\-]+/g, '_').slice(0, 60);
  var cartella = DriveApp.getFolderById(CARTELLA_IMMAGINI_ID);
  var file = cartella.createFile(Utilities.newBlob(byte, mime, new Date().toISOString().slice(0, 10) + '-' + pulito));
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (x) {
    file.setTrashed(true);
    throw errore_('Il Drive non permette di rendere pubblica l\'immagine (condivisione esterna bloccata). Controlla le impostazioni della cartella.');
  }
  registra_(email, 'carica-immagine', file.getId());
  return { url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600' };
}

/* ===================== CONTROLLI SUI DATI ===================== */

function pulisci_(dati) {
  if (!dati || typeof dati !== 'object') throw errore_('Dati non validi.');
  var titolo = testo_(dati.titolo, MAX.titolo);
  if (!titolo) throw errore_('Scrivi il titolo della rassegna.');
  var data = String(dati.data || '').trim();
  if (data && !dataValida_(data)) throw errore_('Data della rassegna non valida.');
  var arts = Array.isArray(dati.articoli) ? dati.articoli : [];
  if (arts.length > MAX.articoli) throw errore_('Troppi articoli (massimo ' + MAX.articoli + ').');
  return {
    id: dati.id ? String(dati.id) : '',
    titolo: titolo,
    data: data,
    introduzione: testo_(dati.introduzione, MAX.introduzione, true),
    copertina: immagine_(dati.copertina),
    articoli: arts.map(function (a, i) {
      a = a || {};
      var link = String(a.link || '').trim();
      if (link && (!/^https?:\/\/[^\s]+$/i.test(link) || link.length > MAX.link)) throw errore_('Link non valido nell\'articolo ' + (i + 1) + ': deve iniziare con http:// o https://');
      var dt = String(a.data || '').trim();
      if (dt && !dataValida_(dt)) throw errore_('Data non valida nell\'articolo ' + (i + 1) + '.');
      return {
        testata: testo_(a.testata, MAX.testata), titolo: testo_(a.titolo, MAX.titolo), data: dt, link: link,
        estratto: testo_(a.estratto, MAX.estratto, true), immagine: immagine_(a.immagine)
      };
    })
  };
}

// Per pubblicare serve una rassegna completa; le bozze possono essere incomplete.
function controllaPerPubblicare_(d) {
  if (!d.data) throw errore_('Per pubblicare serve la data della rassegna.');
  if (!d.articoli || !d.articoli.length) throw errore_('Per pubblicare serve almeno un articolo.');
  d.articoli.forEach(function (a, i) {
    if (!a.testata || !a.titolo || !a.link || !a.data) {
      throw errore_('Articolo ' + (i + 1) + ': per pubblicare servono testata, titolo, data e link.');
    }
  });
}

function testo_(v, max, multiriga) {
  var s = String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  s = multiriga ? s.trim() : s.replace(/\s+/g, ' ').trim();
  if (s.length > max) throw errore_('Testo troppo lungo (massimo ' + max + ' caratteri).');
  return s;
}
function immagine_(v) {
  var s = String(v || '').trim();
  if (s && !RE_IMMAGINE.test(s)) throw errore_('Immagine non valida: caricala dall\'editor.');
  return s;
}
function dataValida_(s) {
  if (!RE_DATA.test(s)) return false;
  var d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
// Ora attuale (ISO). Se non è successiva a "dopo" la sposta di 1 ms: la versione cresce sempre.
function ora_(dopo) {
  var t = Date.now();
  var d = dopo ? new Date(dopo).getTime() : 0;
  if (!isNaN(d) && t <= d) t = d + 1;
  return new Date(t).toISOString();
}
function slugUnico_(titolo, data) {
  var base = String(titolo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');
  base = (base || 'rassegna') + (data ? '-' + data : '');
  var usati = {};
  leggiRighe_(SCHEDA_RASSEGNE, COL_RASSEGNE).forEach(function (r) { usati[r.slug] = true; });
  var s = base, n = 2;
  while (usati[s]) { s = base + '-' + n++; }
  return s;
}
// Testo che inizia con = + - @ verrebbe preso per una formula: lo si salva come testo.
function sicuro_(v) {
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}

/* ===================== FOGLIO ===================== */

function foglio_(nome, colonne) {
  var f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!f) throw errore_('Nel foglio manca la scheda "' + nome + '". Esegui preparaFoglio().');
  var testata = f.getRange(1, 1, 1, colonne.length).getValues()[0].map(String);
  if (testata.join('|') !== colonne.join('|')) {
    throw errore_('Le colonne della scheda "' + nome + '" sono state cambiate. Ripristina nome e ordine originali (vedi SCHEMA.md).');
  }
  return f;
}

function leggiRighe_(nome, colonne) {
  var f = foglio_(nome, colonne);
  var ultima = f.getLastRow();
  if (ultima < 2) return [];
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  return f.getRange(2, 1, ultima - 1, colonne.length).getValues().map(function (v, i) {
    var o = { _riga: i + 2 };
    colonne.forEach(function (c, k) {
      var x = v[k];
      if (x instanceof Date) x = (c === 'data') ? Utilities.formatDate(x, tz, 'yyyy-MM-dd') : x.toISOString();
      o[c] = (x == null) ? '' : String(x);
    });
    return o;
  }).filter(function (o) { return o[colonne[0]] !== ''; });
}

function trovaRassegna_(id) {
  if (!id) return null;
  return leggiRighe_(SCHEDA_RASSEGNE, COL_RASSEGNE).filter(function (r) { return r.id === id; })[0] || null;
}

function articoliDi_(id) {
  return leggiRighe_(SCHEDA_ARTICOLI, COL_ARTICOLI)
    .filter(function (a) { return a.rassegna_id === id; })
    .sort(function (a, b) { return Number(a.ordine) - Number(b.ordine); });
}

function sostituisciArticoli_(id, articoli) {
  var f = foglio_(SCHEDA_ARTICOLI, COL_ARTICOLI);
  var vecchie = leggiRighe_(SCHEDA_ARTICOLI, COL_ARTICOLI).filter(function (a) { return a.rassegna_id === id; });
  vecchie.sort(function (a, b) { return b._riga - a._riga; }).forEach(function (a) { f.deleteRow(a._riga); });
  articoli.forEach(function (a, i) {
    f.appendRow([id, i + 1, a.testata, a.titolo, a.data, a.link, a.estratto, a.immagine].map(sicuro_));
  });
}

function registra_(email, azione, id) {
  foglio_(SCHEDA_REGISTRO, COL_REGISTRO).appendRow([new Date().toISOString(), email, azione, id]);
}

function conBlocco_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* Da eseguire UNA volta dall'editor di Apps Script: crea le schede e le intestazioni. */
function preparaFoglio() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [[SCHEDA_RASSEGNE, COL_RASSEGNE], [SCHEDA_ARTICOLI, COL_ARTICOLI], [SCHEDA_REGISTRO, COL_REGISTRO]].forEach(function (s) {
    var f = ss.getSheetByName(s[0]) || ss.insertSheet(s[0]);
    f.getRange(1, 1, 1, s[1].length).setValues([s[1]]).setFontWeight('bold');
    f.getRange(1, 1, f.getMaxRows(), s[1].length).setNumberFormat('@'); // tutto testo: niente date o formule automatiche
    f.setFrozenRows(1);
  });
}

/* ===================== RISPOSTE ===================== */

function errore_(messaggio, extra) {
  var e = new Error(messaggio);
  e.noto = true;
  e.extra = extra || {};
  return e;
}
function erroreJson_(err) {
  if (err && err.noto) {
    var o = { ok: false, errore: err.message };
    Object.keys(err.extra).forEach(function (k) { o[k] = err.extra[k]; });
    return o;
  }
  try { console.error(err && err.stack || err); } catch (x) {}
  return { ok: false, errore: 'Errore del server: riprova tra poco.' };
}
function rispondi_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
