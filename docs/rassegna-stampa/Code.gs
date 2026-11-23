/* =====================================================================
   CLASSLAB · RASSEGNA STAMPA — script Apps Script
   ---------------------------------------------------------------------
   Va incollato in un progetto Apps Script COLLEGATO al foglio Google
   "ClassLab – Rassegna stampa" (Estensioni → Apps Script).
   Istruzioni complete: docs/rassegna-stampa/LEGGIMI.md

   Due ingressi:
   - doGet  (PUBBLICO, senza login): restituisce SOLO le rassegne in stato
     "pubblicata", senza email né dati interni. Le bozze non escono mai da qui.
   - doPost (RISERVATO): ogni chiamata porta il token Google; lo script lo
     verifica (firma, scadenza, dominio, client) e controlla che l'email sia
     tra gli organizzatori. Senza questo controllo nessuna scrittura è possibile,
     anche conoscendo l'indirizzo dello script.

   Non rinominare le schede e non inserire colonne in mezzo: eventuali colonne
   nuove vanno aggiunte solo in fondo.
   ===================================================================== */

var ORGANIZZATORI = ['silvio.ambrosio@classlab.it', 'giulio.prodan@classlab.it', 'info@classlab.it'];
var DOMINIO = 'classlab.it';
// Stesso ID client di turni/config.js
var CLIENT_ID = '318339263635-lc75399bm8rarehjpcvt5q8cvoi2dcm9.apps.googleusercontent.com';

var SCHEDE = {
  Rassegne: ['id', 'slug', 'titolo', 'data', 'introduzione', 'copertina_id', 'copertina_url', 'stato',
             'creata_il', 'creata_da', 'modificata_il', 'modificata_da', 'pubblicata_il'],
  Articoli: ['id', 'rassegna_id', 'ordine', 'testata', 'titolo', 'data', 'link', 'estratto', 'immagine_id', 'immagine_url'],
  Log: ['quando', 'chi', 'azione', 'rassegna_id']
};
var COLONNE_TESTO = ['id', 'slug', 'data', 'creata_il', 'modificata_il', 'pubblicata_il', 'quando', 'rassegna_id', 'ordine'];
var STATI = ['bozza', 'pubblicata'];
var MAX_ARTICOLI = 40;
var MAX_IMMAGINE_BYTE = 5 * 1024 * 1024;
var MIME_IMMAGINI = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/* ---------- ingressi ---------- */

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.fn === 'pubbliche') return rispondi_({ ok: true, dati: pubbliche_() });
    if (p.fn === 'pubblica') {
      var r = pubblica_(String(p.slug || ''));
      return rispondi_(r ? { ok: true, dati: r } : { ok: false, errore: 'Rassegna non trovata.' });
    }
    return rispondi_({ ok: false, errore: 'Richiesta non valida.' });
  } catch (err) {
    return rispondi_({ ok: false, errore: 'Errore del server.' });
  }
}

var AZIONI = {
  chiSono: function (utente) { return { email: utente, organizzatore: true }; },
  elenco: elenco_,
  leggi: leggi_,
  salva: salva_,
  impostaStato: impostaStato_,
  elimina: elimina_,
  caricaImmagine: caricaImmagine_
};

function doPost(e) {
  var richiesta;
  try { richiesta = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return rispondi_({ ok: false, errore: 'Richiesta non valida.' }); }

  var utente = verificaToken_(richiesta.token);
  if (!utente.ok) return rispondi_({ ok: false, auth: true, errore: utente.errore });
  // Account @classlab.it ma non organizzatore: rifiutato dal server, non dalla pagina
  if (ORGANIZZATORI.indexOf(utente.email) < 0) {
    return rispondi_({ ok: false, errore: 'Pagina riservata agli organizzatori.' });
  }
  if (!AZIONI.hasOwnProperty(richiesta.fn)) return rispondi_({ ok: false, errore: 'Funzione non valida.' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var args = Array.isArray(richiesta.args) ? richiesta.args : [];
    var dati = AZIONI[richiesta.fn].apply(null, [utente.email].concat(args));
    return rispondi_({ ok: true, dati: dati });
  } catch (err) {
    return rispondi_({ ok: false, errore: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function rispondi_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- verifica del token Google ---------- */

function verificaToken_(token) {
  var scaduta = { ok: false, errore: 'Sessione scaduta: accedi di nuovo.' };
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) return scaduta;
  try {
    var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return scaduta;
    var t = JSON.parse(r.getContentText());
    var email = String(t.email || '').toLowerCase();
    if (t.aud !== CLIENT_ID) return scaduta;
    if (!t.exp || Number(t.exp) * 1000 <= Date.now()) return scaduta;
    if (String(t.email_verified) !== 'true' || t.hd !== DOMINIO) return scaduta;
    if (!email || email.split('@')[1] !== DOMINIO) return scaduta;
    return { ok: true, email: email };
  } catch (err) {
    return scaduta;
  }
}

/* ---------- lettura pubblica (solo "pubblicata") ---------- */

function pubbliche_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('pub_lista');
  if (hit) return JSON.parse(hit);
  var articoli = tabella_('Articoli');
  var lista = tabella_('Rassegne').filter(function (r) { return r.stato === 'pubblicata'; })
    .sort(function (a, b) { return (b.data + b.pubblicata_il).localeCompare(a.data + a.pubblicata_il); })
    .map(function (r) {
      var n = articoli.filter(function (a) { return a.rassegna_id === r.id; }).length;
      return { slug: r.slug, titolo: r.titolo, data: r.data, introduzione: r.introduzione, copertina_url: r.copertina_url, n_articoli: n };
    });
  cache.put('pub_lista', JSON.stringify(lista), 60);
  return lista;
}

function pubblica_(slug) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  var cache = CacheService.getScriptCache();
  var hit = cache.get('pub_' + slug);
  if (hit) return JSON.parse(hit);
  var r = tabella_('Rassegne').filter(function (x) { return x.slug === slug && x.stato === 'pubblicata'; })[0];
  if (!r) return null;
  var out = {
    slug: r.slug, titolo: r.titolo, data: r.data, introduzione: r.introduzione, copertina_url: r.copertina_url,
    articoli: articoliDi_(r.id).map(function (a) {
      return { testata: a.testata, titolo: a.titolo, data: a.data, link: a.link, estratto: a.estratto, immagine_url: a.immagine_url };
    })
  };
  cache.put('pub_' + slug, JSON.stringify(out), 60);
  return out;
}

/* ---------- funzioni riservate agli organizzatori ---------- */

function elenco_() {
  var articoli = tabella_('Articoli');
  return tabella_('Rassegne').map(function (r) {
    r.n_articoli = articoli.filter(function (a) { return a.rassegna_id === r.id; }).length;
    return r;
  }).sort(function (a, b) { return (b.data + b.creata_il).localeCompare(a.data + a.creata_il); });
}

function leggi_(utente, id) {
  var r = trova_(id);
  if (!r) throw new Error('Rassegna non trovata.');
  r.articoli = articoliDi_(id);
  return r;
}

function salva_(utente, dati) {
  dati = dati || {};
  var titolo = testo_(dati.titolo, 200), data = testo_(dati.data, 10);
  if (!titolo) throw new Error('Il titolo è obbligatorio.');
  if (!dataValida_(data)) throw new Error('La data non è valida.');
  var articoliIn = Array.isArray(dati.articoli) ? dati.articoli : [];
  if (articoliIn.length > MAX_ARTICOLI) throw new Error('Troppi articoli (massimo ' + MAX_ARTICOLI + ').');

  var articoli = articoliIn.map(function (a, i) {
    a = a || {};
    var link = testo_(a.link, 2000);
    if (!/^https?:\/\/[^\s]+$/i.test(link)) throw new Error('Articolo ' + (i + 1) + ': il link deve iniziare con http:// o https://');
    var adata = testo_(a.data, 10);
    if (adata && !dataValida_(adata)) throw new Error('Articolo ' + (i + 1) + ': data non valida.');
    var titoloArt = testo_(a.titolo, 300);
    if (!titoloArt) throw new Error('Articolo ' + (i + 1) + ': manca il titolo.');
    var img = idImmagine_(a.immagine_id);
    return { testata: testo_(a.testata, 120), titolo: titoloArt, data: adata, link: link, estratto: testo_(a.estratto, 2000), immagine_id: img, immagine_url: urlImmagine_(img) };
  });
  var cop = idImmagine_(dati.copertina_id);
  var ora = adesso_();

  var esistente = dati.id ? trova_(String(dati.id)) : null;
  if (dati.id && !esistente) throw new Error('Rassegna non trovata.');
  var r;
  if (esistente) {
    r = esistente;
    r.titolo = titolo; r.data = data; r.introduzione = testo_(dati.introduzione, 5000);
    r.copertina_id = cop; r.copertina_url = urlImmagine_(cop);
    r.modificata_il = ora; r.modificata_da = utente;
    aggiornaRiga_('Rassegne', r.id, r);
  } else {
    var id = nuovoId_();
    r = { id: id, slug: slugUnico_(titolo, data), titolo: titolo, data: data, introduzione: testo_(dati.introduzione, 5000),
          copertina_id: cop, copertina_url: urlImmagine_(cop), stato: 'bozza',
          creata_il: ora, creata_da: utente, modificata_il: ora, modificata_da: utente, pubblicata_il: '' };
    aggiungiRiga_('Rassegne', r);
  }
  eliminaRighe_('Articoli', 'rassegna_id', r.id);
  articoli.forEach(function (a, i) {
    a.id = nuovoId_(); a.rassegna_id = r.id; a.ordine = String(i + 1);
    aggiungiRiga_('Articoli', a);
  });
  log_(utente, esistente ? 'modifica' : 'creazione', r.id);
  svuotaCache_(r.slug);
  return leggi_(utente, r.id);
}

function impostaStato_(utente, id, stato) {
  if (STATI.indexOf(stato) < 0) throw new Error('Stato non valido.');
  var r = trova_(String(id));
  if (!r) throw new Error('Rassegna non trovata.');
  if (stato === 'pubblicata') {
    if (!r.titolo || !dataValida_(r.data)) throw new Error('Per pubblicare servono titolo e data.');
    if (!articoliDi_(r.id).length) throw new Error('Per pubblicare serve almeno un articolo.');
    r.pubblicata_il = adesso_();
  }
  r.stato = stato; r.modificata_il = adesso_(); r.modificata_da = utente;
  aggiornaRiga_('Rassegne', r.id, r);
  log_(utente, stato === 'pubblicata' ? 'pubblicazione' : 'ritiro', r.id);
  svuotaCache_(r.slug);
  return leggi_(utente, r.id);
}

function elimina_(utente, id) {
  var r = trova_(String(id));
  if (!r) throw new Error('Rassegna non trovata.');
  var file = [r.copertina_id].concat(articoliDi_(r.id).map(function (a) { return a.immagine_id; }));
  eliminaRighe_('Articoli', 'rassegna_id', r.id);
  eliminaRighe_('Rassegne', 'id', r.id);
  file.forEach(function (f) {
    if (!f) return;
    try { DriveApp.getFileById(f).setTrashed(true); } catch (err) { /* già rimosso o non accessibile */ }
  });
  log_(utente, 'eliminazione', r.id);
  svuotaCache_(r.slug);
  return { eliminata: r.id };
}

function caricaImmagine_(utente, nome, mime, base64) {
  if (!MIME_IMMAGINI.hasOwnProperty(mime)) throw new Error('Formato non ammesso: usa JPG, PNG o WebP.');
  var cartella = PropertiesService.getScriptProperties().getProperty('CARTELLA_ID');
  if (!cartella) throw new Error('Manca la proprietà CARTELLA_ID dello script (vedi LEGGIMI).');
  var byte = Utilities.base64Decode(String(base64 || ''));
  if (!byte.length || byte.length > MAX_IMMAGINE_BYTE) throw new Error('Immagine vuota o troppo grande (massimo 5 MB).');
  var base = String(nome || 'immagine').replace(/\.[^.]*$/, '').replace(/[^\w-]+/g, '-').slice(0, 60) || 'immagine';
  var file = DriveApp.getFolderById(cartella).createFile(Utilities.newBlob(byte, mime, base + '-' + nuovoId_() + '.' + MIME_IMMAGINI[mime]));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { /* ereditata dalla cartella */ }
  log_(utente, 'immagine', file.getId());
  return { id: file.getId(), url: urlImmagine_(file.getId()) };
}

/* ---------- utilità ---------- */

function foglio_(nome) {
  var f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!f) throw new Error('Manca la scheda "' + nome + '": esegui setup().');
  return f;
}

function tabella_(nome) {
  var valori = foglio_(nome).getDataRange().getValues();
  var intest = valori[0].map(String);
  return valori.slice(1).filter(function (riga) { return riga.join('') !== ''; }).map(function (riga) {
    var o = {};
    intest.forEach(function (h, i) { o[h] = cella_(riga[i]); });
    return o;
  });
}

function cella_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Europe/Rome', 'yyyy-MM-dd');
  return v == null ? '' : String(v);
}

function trova_(id) {
  return tabella_('Rassegne').filter(function (r) { return r.id === id; })[0] || null;
}

function articoliDi_(rid) {
  return tabella_('Articoli').filter(function (a) { return a.rassegna_id === rid; })
    .sort(function (a, b) { return Number(a.ordine) - Number(b.ordine); });
}

function rigaDa_(nome, oggetto) {
  var intest = foglio_(nome).getRange(1, 1, 1, foglio_(nome).getLastColumn()).getValues()[0];
  return intest.map(function (h) { return oggetto[h] == null ? '' : String(oggetto[h]); });
}
function aggiungiRiga_(nome, oggetto) { foglio_(nome).appendRow(rigaDa_(nome, oggetto)); }

function aggiornaRiga_(nome, id, oggetto) {
  var f = foglio_(nome), valori = f.getDataRange().getValues();
  for (var i = 1; i < valori.length; i++) {
    if (cella_(valori[i][0]) === id) { var riga = rigaDa_(nome, oggetto); f.getRange(i + 1, 1, 1, riga.length).setValues([riga]); return; }
  }
  throw new Error('Riga non trovata.');
}

function eliminaRighe_(nome, colonna, valore) {
  var f = foglio_(nome), valori = f.getDataRange().getValues();
  var c = valori[0].map(String).indexOf(colonna);
  for (var i = valori.length - 1; i >= 1; i--) {
    if (cella_(valori[i][c]) === valore) f.deleteRow(i + 1);
  }
}

function log_(chi, azione, rid) { foglio_('Log').appendRow([adesso_(), chi, azione, rid]); }
function adesso_() { return new Date().toISOString(); }
function nuovoId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function testo_(v, max) { return String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, max); }
function dataValida_(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  var x = new Date(d + 'T00:00:00Z');
  return !isNaN(x) && x.toISOString().slice(0, 10) === d;
}
function idImmagine_(v) {
  v = String(v == null ? '' : v).trim();
  if (v && !/^[\w-]{10,100}$/.test(v)) throw new Error('Identificativo immagine non valido.');
  return v;
}
function urlImmagine_(id) { return id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600' : ''; }

function slugUnico_(titolo, data) {
  var base = titolo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  base = (data + (base ? '-' + base : '')).slice(0, 100);
  var usati = tabella_('Rassegne').map(function (r) { return r.slug; }), slug = base, n = 2;
  while (usati.indexOf(slug) >= 0) slug = base + '-' + (n++);
  return slug;
}

function svuotaCache_(slug) {
  var c = CacheService.getScriptCache();
  c.remove('pub_lista');
  if (slug) c.remove('pub_' + slug);
}

/* ---------- da eseguire una sola volta a mano ---------- */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEDE).forEach(function (nome) {
    var f = ss.getSheetByName(nome) || ss.insertSheet(nome);
    var cols = SCHEDE[nome];
    if (f.getLastRow() === 0) f.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    f.setFrozenRows(1);
    cols.forEach(function (c, i) { if (COLONNE_TESTO.indexOf(c) >= 0) f.getRange(2, i + 1, f.getMaxRows() - 1, 1).setNumberFormat('@'); });
  });
  var cartella = PropertiesService.getScriptProperties().getProperty('CARTELLA_ID');
  Logger.log(cartella ? 'Cartella immagini impostata: ' + cartella : 'ATTENZIONE: aggiungi la proprietà CARTELLA_ID (ID della cartella Drive per le immagini).');
}
