/* =====================================================================
   CLASSLAB · RASSEGNA STAMPA — funzioni condivise
   ---------------------------------------------------------------------
   Usato da: rassegna-stampa/ (archivio), rassegna.html (singola rassegna)
   e dall'anteprima dell'editor (rassegna-stampa-editor/).
   Legge i dati dallo script Apps Script (solo rassegne "pubblicate").
   Tutto il testo che arriva dal foglio viene "escapato": nessun HTML
   scritto dagli organizzatori viene mai eseguito.
   ===================================================================== */
window.Rassegna = (function () {
  "use strict";
  var BASE = "/rassegna-stampa/";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Solo link http/https
  function urlSicuro(u) { return /^https?:\/\/[^\s"'<>]+$/i.test(String(u || "")) ? String(u) : ""; }
  // Immagini: solo quelle servite da Google Drive
  function immagineSicura(u) { return /^https:\/\/(drive\.google\.com|lh3\.googleusercontent\.com)\//i.test(String(u || "")) ? String(u) : ""; }

  function data(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return "";
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d) ? "" : d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  }
  function paragrafi(t) {
    return String(t || "").split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean)
      .map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("");
  }
  function breve(t, max) {
    var s = String(t || "").replace(/\s+/g, " ").trim();
    if (s.length <= max) return s;
    return s.slice(0, max).replace(/\s+\S*$/, "") + "…";
  }

  function indirizzo() { return (window.RASSEGNA_CONFIG || {}).API_URL || ""; }
  function leggi(params) {
    var api = indirizzo();
    if (!api) return Promise.reject(Object.assign(new Error("non configurato"), { nonConfigurato: true }));
    var qs = Object.keys(params).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
    return fetch(api + "?" + qs).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.errore || "Errore");
      return j.dati;
    });
  }

  function linkRassegna(slug) { return BASE + "rassegna.html?r=" + encodeURIComponent(slug); }

  /* Scheda dell'archivio */
  function scheda(r, anteprima) {
    var img = immagineSicura(r.copertina_url);
    var visual = img
      ? '<img class="rs-card__img" src="' + esc(img) + '" alt="" loading="lazy" width="800" height="450">'
      : '<div class="rs-card__img rs-card__img--vuota" aria-hidden="true">CLASSLAB</div>';
    var corpo = visual + '<div class="rs-card__corpo">' +
      '<span class="rs-data">' + esc(data(r.data)) + "</span>" +
      "<h2>" + esc(r.titolo) + "</h2>" +
      (r.introduzione ? "<p>" + esc(breve(r.introduzione, 220)) + "</p>" : "") +
      '<span class="rs-card__vai">Leggi la rassegna →</span></div>';
    return anteprima
      ? '<div class="rs-card">' + corpo + "</div>"
      : '<a class="rs-card" href="' + esc(linkRassegna(r.slug)) + '">' + corpo + "</a>";
  }

  /* Contenuto di una rassegna (titolo, copertina, testo, articoli) */
  function contenuto(r) {
    var img = immagineSicura(r.copertina_url);
    var arts = (r.articoli || []).map(function (a) {
      var ai = immagineSicura(a.immagine_url), link = urlSicuro(a.link);
      var fonte = [a.testata, data(a.data)].filter(Boolean).map(esc).join(" · ");
      return '<article class="rs-art">' +
        (ai ? '<img class="rs-art__img" src="' + esc(ai) + '" alt="" loading="lazy">' : "") +
        (fonte ? '<div class="rs-art__fonte">' + fonte + "</div>" : "") +
        "<h3>" + esc(a.titolo) + "</h3>" +
        (a.estratto ? paragrafi(a.estratto) : "") +
        (link ? '<a class="rs-art__link" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Leggi l’articolo originale ↗</a>' : "") +
        "</article>";
    }).join("");
    return '<span class="badge">Rassegna stampa</span>' +
      "<h1>" + esc(r.titolo) + "</h1>" +
      '<div class="rs-data">' + esc(data(r.data)) + "</div>" +
      (img ? '<img class="rs-copertina" src="' + esc(img) + '" alt="" width="1200" height="675">' : "") +
      (r.introduzione ? '<div class="rs-testo">' + paragrafi(r.introduzione) + "</div>" : "") +
      (arts ? "<h2>Gli articoli</h2>" + arts : "");
  }

  return { esc: esc, urlSicuro: urlSicuro, immagineSicura: immagineSicura, data: data, paragrafi: paragrafi, breve: breve,
           leggi: leggi, scheda: scheda, contenuto: contenuto, linkRassegna: linkRassegna };
})();
