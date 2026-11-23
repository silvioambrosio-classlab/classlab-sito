/**
 * ClassLab - Ultime modifiche
 * Script Apps Script che dice all'app /ultime/ quali sono i file Drive e le mail più recenti.
 * Risponde solo ai gestori elencati qui sotto, che hanno fatto l'accesso Google con un account @classlab.it.
 *
 * Va creato e pubblicato dall'account @classlab.it che usate per Drive e Gmail
 * (vede le cartelle e le bozze di QUELL'account). Guida: GUIDA-ULTIME.md.
 */

var CLIENT_ID = '318339263635-lc75399bm8rarehjpcvt5q8cvoi2dcm9.apps.googleusercontent.com'; // lo stesso di turni/config.js
var DOMINIO = 'classlab.it';

// Chi può vedere i dati (email in minuscolo).
var GESTORI = ['silvio.ambrosio@classlab.it', 'giulio.prodan@classlab.it', 'info@classlab.it'];

// Cartelle Drive da controllare, sottocartelle comprese. Per aggiungerne una incolla l'ID che sta nell'indirizzo della cartella.
var CARTELLE = [
  { id: '1PlU9SU753qZs7WpU_YqbwblF3vd8h_jM', nome: 'Documenti team' },
  { id: '1AJu55XfO951pPLYnHZElZCgT2qgrxlQP', nome: 'Claude Accessibles' }
];
var PROFONDITA = 3;       // quante cartelle annidate scendere
var MAX_FILE = 400;       // tetto di sicurezza ai file letti per cartella
var QUANTI = 6;           // quante voci restituire per fonte

// Mail: bozze e mail inviate negli ultimi giorni dall'account che pubblica lo script.
var MAIL_BOZZE = true;
var MAIL_INVIATE = true;
var GIORNI_INVIATE = 14;

function doGet() {
  return risposta_({ ok: true, dati: 'ClassLab - Ultime modifiche: usa l\'app /ultime/.' });
}

function doPost(e) {
  try {
    var r = JSON.parse(e.postData.contents);
    var utente = verifica_(r.token);
    if (r.fn === 'ultime') return risposta_({ ok: true, dati: ultime_() });
    return risposta_({ ok: false, errore: 'Funzione sconosciuta.' });
  } catch (err) {
    return risposta_({ ok: false, errore: String(err.message || err), auth: !!err.auth });
  }
}

/* ---------- accesso ---------- */

function verifica_(token) {
  if (!token) throw errAuth_('Accedi per continuare.');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw errAuth_('Sessione scaduta: accedi di nuovo.');
  var p = JSON.parse(res.getContentText());
  if (p.aud !== CLIENT_ID || p.hd !== DOMINIO || String(p.email_verified) !== 'true') throw errAuth_('Account non autorizzato.');
  var mail = String(p.email || '').toLowerCase();
  if (GESTORI.indexOf(mail) < 0) throw errAuth_('Riservato ai gestori.');
  return mail;
}

function errAuth_(m) { var e = new Error(m); e.auth = true; return e; }

function risposta_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- dati ---------- */

function ultime_() {
  var cache = CacheService.getScriptCache(), k = 'ultime1', c = cache.get(k);
  if (c) return JSON.parse(c);
  var d = { drive: drive_(), mail: mail_() };
  try { cache.put(k, JSON.stringify(d), 45); } catch (e) {}
  return d;
}

function drive_() {
  var voci = [];
  CARTELLE.forEach(function (c) {
    try {
      var cart = DriveApp.getFolderById(c.id);
      voci.push(voceDrive_(cart, c.nome, true));
      scansiona_(cart, c.nome, 0, voci, { n: 0 });
    } catch (e) { /* cartella non accessibile: si salta */ }
  });
  voci.sort(function (a, b) { return b.t - a.t; });
  return voci.slice(0, QUANTI).map(function (v) { delete v.t; return v; });
}

function scansiona_(cartella, nomeBase, livello, voci, tetto) {
  var files = cartella.getFiles();
  while (files.hasNext() && tetto.n < MAX_FILE) { voci.push(voceDrive_(files.next(), nomeBase, false)); tetto.n++; }
  if (livello >= PROFONDITA) return;
  var sub = cartella.getFolders();
  while (sub.hasNext() && tetto.n < MAX_FILE) {
    var s = sub.next();
    voci.push(voceDrive_(s, nomeBase, true)); tetto.n++;
    scansiona_(s, nomeBase + ' / ' + s.getName(), livello + 1, voci, tetto);
  }
}

function voceDrive_(f, cartella, eCartella) {
  var d = f.getLastUpdated();
  return { nome: (eCartella ? 'Cartella: ' : '') + f.getName(), data: d.toISOString(), t: d.getTime(), url: f.getUrl(), cartella: cartella };
}

function mail_() {
  var voci = [];
  if (MAIL_BOZZE) {
    GmailApp.getDrafts().slice(0, 30).forEach(function (b) {
      var m = b.getMessage();
      voci.push({ tipo: 'bozza', oggetto: m.getSubject(), a: m.getTo(), data: m.getDate().toISOString(), t: m.getDate().getTime(), url: 'https://mail.google.com/mail/u/0/#drafts?compose=' + m.getId() });
    });
  }
  if (MAIL_INVIATE) {
    GmailApp.search('in:sent newer_than:' + GIORNI_INVIATE + 'd', 0, 15).forEach(function (th) {
      var ms = th.getMessages(), m = ms[ms.length - 1];
      voci.push({ tipo: 'inviata', oggetto: m.getSubject(), a: m.getTo(), data: m.getDate().toISOString(), t: m.getDate().getTime(), url: 'https://mail.google.com/mail/u/0/#sent/' + th.getId() });
    });
  }
  voci.sort(function (a, b) { return b.t - a.t; });
  return voci.slice(0, QUANTI).map(function (v) { delete v.t; return v; });
}
