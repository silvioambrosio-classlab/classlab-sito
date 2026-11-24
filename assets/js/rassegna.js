/* =====================================================================
   CLASSLAB – RASSEGNA STAMPA: CODICE CONDIVISO
   ---------------------------------------------------------------------
   Usato da: rassegna-stampa.html (archivio), rassegna.html (singola
   rassegna) e dall'anteprima dell'editor in /rassegna-editor/.
   Non contiene dati: i dati arrivano dallo script Apps Script
   (indirizzo "rassegnaEndpoint" in config.js).
   Tutto il testo viene "ripulito" (escape): nelle rassegne non si può
   inserire HTML.
   ===================================================================== */
(function () {
  "use strict";

  var MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Solo indirizzi http/https per i link agli articoli */
  function urlLink(u) {
    u = String(u || "").trim();
    return /^https?:\/\/[^\s]+$/i.test(u) ? u : "";
  }
  /* Solo immagini caricate nel Drive di ClassLab */
  function urlImmagine(u) {
    u = String(u || "").trim();
    return /^https:\/\/(drive\.google\.com\/thumbnail\?id=[\w-]+|lh3\.googleusercontent\.com\/d\/[\w-]+)/.test(u) ? u : "";
  }

  /* "2026-11-24" → "24 novembre 2026" */
  function dataLunga(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
    if (!m) return "";
    return Number(m[3]) + " " + MESI[Number(m[2]) - 1] + " " + m[1];
  }

  /* Testo semplice → paragrafi (riga vuota = nuovo paragrafo) */
  function paragrafi(t) {
    return String(t || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) {
      return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function riassunto(t, max) {
    var s = String(t || "").replace(/\s+/g, " ").trim();
    return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : s;
  }

  function perData(a, b) {
    return String(b.data || "").localeCompare(String(a.data || ""));
  }

  /* Scheda dell'archivio */
  function scheda(r) {
    var img = urlImmagine(r.copertina);
    var href = "rassegna.html?r=" + encodeURIComponent(r.slug);
    return '<article class="rs-card">' +
      '<a class="rs-card__link" href="' + esc(href) + '">' +
      (img ? '<img class="rs-card__img" src="' + esc(img) + '" alt="" loading="lazy" width="800" height="450">'
           : '<div class="rs-card__img rs-card__img--vuoto" aria-hidden="true"></div>') +
      '<div class="rs-card__corpo">' +
      '<span class="rs-data">' + esc(dataLunga(r.data)) + "</span>" +
      "<h2>" + esc(r.titolo) + "</h2>" +
      (r.introduzione ? "<p>" + esc(riassunto(r.introduzione, 180)) + "</p>" : "") +
      '<span class="rs-vai">Leggi la rassegna →</span>' +
      "</div></a></article>";
  }

  function articolo(a) {
    var img = urlImmagine(a.immagine), link = urlLink(a.link);
    var testo = '<div class="rs-art__testo">' +
      '<p class="rs-art__meta"><strong>' + esc(a.testata) + "</strong>" + (a.data ? " · " + esc(dataLunga(a.data)) : "") + "</p>" +
      "<h3>" + (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + esc(a.titolo) + "</a>" : esc(a.titolo)) + "</h3>" +
      (a.estratto ? "<p>" + esc(a.estratto) + "</p>" : "") +
      (link ? '<a class="rs-vai" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Leggi l\'articolo originale ↗</a>' : "") +
      "</div>";
    return '<article class="rs-art">' +
      (img ? '<img class="rs-art__img" src="' + esc(img) + '" alt="" loading="lazy">' : "") + testo + "</article>";
  }

  /* Contenuto della singola rassegna (testata + testo + articoli) */
  function pagina(r) {
    var cover = urlImmagine(r.copertina);
    var arts = (r.articoli || []).map(articolo).join("");
    return '<section class="testata testata--pattern"><div class="contenitore">' +
      '<span class="badge">Rassegna stampa · ' + esc(dataLunga(r.data)) + "</span>" +
      "<h1>" + esc(r.titolo) + "</h1></div></section>" +
      '<section class="sezione"><div class="contenitore"><div class="rs-pagina">' +
      (cover ? '<figure class="rs-cover"><img src="' + esc(cover) + '" alt="' + esc(r.titolo) + '"></figure>' : "") +
      (r.introduzione ? '<div class="rs-intro">' + paragrafi(r.introduzione) + "</div>" : "") +
      (arts ? '<h2 class="rs-sezione">Gli articoli</h2><div class="rs-articoli">' + arts + "</div>" : "") +
      '<p class="rs-torna"><a href="rassegna-stampa.html">← Tutte le rassegne</a></p>' +
      "</div></div></section>";
  }

  /* Chiamata pubblica (senza login): solo rassegne pubblicate */
  function leggi(params) {
    var C = window.CLASSLAB || {};
    if (!C.rassegnaEndpoint) return Promise.reject(new Error("non-configurato"));
    var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
    return fetch(C.rassegnaEndpoint + (C.rassegnaEndpoint.indexOf("?") < 0 ? "?" : "&") + q)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) throw new Error(j.errore || "Errore");
        return j.dati;
      });
  }

  window.Rassegna = {
    esc: esc, urlLink: urlLink, urlImmagine: urlImmagine, dataLunga: dataLunga, paragrafi: paragrafi,
    riassunto: riassunto, perData: perData, scheda: scheda, articolo: articolo, pagina: pagina, leggi: leggi
  };
})();
