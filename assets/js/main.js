/* =====================================================================
   CLASSLAB – FUNZIONI COMUNI A TUTTE LE PAGINE
   Crea menu e piè di pagina (da config.js), schede dei laboratori
   e loghi dei partner. Non serve modificarlo per i contenuti.
   ===================================================================== */
(function () {
  "use strict";
  var C = window.CLASSLAB || {};
  var pagina = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (pagina === "") pagina = "index.html";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function attuale(link) { return link.toLowerCase() === pagina || (pagina === "index.html" && link === "./"); }

  /* ---------- HEADER ---------- */
  var header = document.getElementById("site-header");
  if (header) {
    var voci = (C.menu || []).map(function (v, i) {
      if (v.sottomenu) {
        var dentro = v.sottomenu.some(function (s) { return attuale(s.link); });
        return '<li class="nav__sotto">' +
          '<button class="nav__voce" type="button" aria-expanded="false" aria-controls="tendina-' + i + '"' + (dentro ? ' style="color:var(--blu)"' : "") + ">" + esc(v.testo) + "</button>" +
          '<ul class="nav__tendina" id="tendina-' + i + '">' +
          v.sottomenu.map(function (s) {
            return '<li><a href="' + esc(s.link) + '"' + (attuale(s.link) ? ' aria-current="page"' : "") + ">" + esc(s.testo) + "</a></li>";
          }).join("") + "</ul></li>";
      }
      return '<li><a href="' + esc(v.link) + '"' + (attuale(v.link) ? ' aria-current="page"' : "") + ">" + esc(v.testo) + "</a></li>";
    }).join("");

    header.outerHTML =
      '<a class="skip-link" href="#contenuto">Vai al contenuto</a>' +
      '<header class="header"><div class="contenitore header__barra">' +
      '<a class="logo" href="index.html" aria-label="ClassLab ODV – Home"><img src="assets/img/logo-classlab-300.png" alt="" width="300" height="326"><span>ClassLab ODV</span></a>' +
      '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="nav-principale" aria-label="Apri il menu">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path class="ic-apri" d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      '<nav class="nav" id="nav-principale" aria-label="Menu principale"><ul>' + voci +
      '<li class="nav__cta"><a href="partecipa.html#modulo">Porta ClassLab a scuola</a></li>' +
      "</ul></nav></div></header>";
  }

  /* ---------- FOOTER ---------- */
  var footer = document.getElementById("site-footer");
  if (footer) {
    var linkMenu = [];
    (C.menu || []).forEach(function (v) {
      if (v.sottomenu) v.sottomenu.forEach(function (s) { linkMenu.push(s); });
      else linkMenu.push(v);
    });
    var social = Object.keys(C.social || {}).filter(function (k) { return C.social[k]; }).map(function (k) {
      return '<li><a href="' + esc(C.social[k]) + '" target="_blank" rel="noopener">' + esc(k.charAt(0).toUpperCase() + k.slice(1)) + "</a></li>";
    }).join("");
    footer.outerHTML =
      '<footer class="footer"><div class="contenitore"><div class="footer__griglia">' +
      '<div><a class="footer__logo" href="index.html"><img src="assets/img/logo-classlab-300.png" alt="ClassLab" width="300" height="326"></a>' +
      "<p>Laboratori scientifici e peer education per le scuole del Friuli Venezia Giulia e non solo.</p>" +
      '<p>Scrivici: <a href="mailto:' + esc(C.email) + '">' + esc(C.email) + "</a></p></div>" +
      '<div><h4>Il sito</h4><ul>' + linkMenu.map(function (l) { return '<li><a href="' + esc(l.link) + '">' + esc(l.testo) + "</a></li>"; }).join("") + "</ul></div>" +
      '<div><h4>Partecipa</h4><ul><li><a href="partecipa.html#modulo">Iscrivi la tua scuola</a></li><li><a href="partecipa.html#divulgatori">Diventa divulgatore</a></li>' +
      '<li><a href="mailto:' + esc(C.email) + '">Contattaci</a></li>' + social + "</ul></div>" +
      "</div>" +
      '<div class="footer__fondo"><span>© ' + new Date().getFullYear() + " " + esc(C.nome) + " – Tutti i diritti riservati</span>" +
      "<span>Codice fiscale " + esc(C.codiceFiscale) + "</span><span>Codice RUNTS " + esc(C.codiceRUNTS) + "</span>" +
      "<span>Sede legale: " + esc(C.sedeLegale) + "</span></div></div></footer>";
  }

  /* ---------- Comportamento menu ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("nav-principale");
  if (toggle && nav) {
    var icona = toggle.querySelector("path");
    function chiudi() {
      nav.classList.remove("aperto"); document.body.classList.remove("menu-aperto");
      toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Apri il menu");
      icona.setAttribute("d", "M4 7h16M4 12h16M4 17h16");
    }
    toggle.addEventListener("click", function () {
      var aperto = nav.classList.toggle("aperto");
      document.body.classList.toggle("menu-aperto", aperto);
      toggle.setAttribute("aria-expanded", aperto ? "true" : "false");
      toggle.setAttribute("aria-label", aperto ? "Chiudi il menu" : "Apri il menu");
      icona.setAttribute("d", aperto ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { chiudi(); chiudiTendine(); } });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") chiudi(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 960) chiudi(); });
  }
  function chiudiTendine() {
    document.querySelectorAll(".nav__sotto.aperto").forEach(function (li) {
      li.classList.remove("aperto"); li.querySelector("button").setAttribute("aria-expanded", "false");
    });
  }
  document.querySelectorAll(".nav__sotto > button").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var li = b.parentNode, era = li.classList.contains("aperto");
      chiudiTendine();
      if (!era) { li.classList.add("aperto"); b.setAttribute("aria-expanded", "true"); }
    });
  });
  document.addEventListener("click", chiudiTendine);

  /* ---------- Email e dati da config ---------- */
  document.querySelectorAll("[data-email]").forEach(function (a) {
    a.href = "mailto:" + C.email + (a.dataset.email ? "?subject=" + encodeURIComponent(a.dataset.email) : "");
    if (!a.textContent.trim()) a.textContent = C.email;
  });
  document.querySelectorAll("[data-periodo]").forEach(function (el) { el.textContent = C.periodoAttivita; });

  /* ---------- Partner ---------- */
  function partner(lista) {
    return (lista || []).map(function (p) {
      return '<a class="partner__logo" href="' + esc(p.link) + '" target="_blank" rel="noopener" title="' + esc(p.nome) + '">' +
        '<img src="' + esc(p.logo) + '" alt="' + esc(p.nome) + '" loading="lazy"></a>';
    }).join("");
  }
  var f = document.getElementById("partner-finanziatori"); if (f) f.innerHTML = partner(C.finanziatori);
  var s = document.getElementById("partner-sostenitori"); if (s) s.innerHTML = partner(C.sostenitori);

  /* ---------- Catalogo laboratori ---------- */
  var griglia = document.getElementById("griglia-laboratori");
  if (griglia && window.CLASSLAB_LABORATORI) {
    griglia.innerHTML = window.CLASSLAB_LABORATORI.filter(function (l) { return l.visibile !== false; }).map(function (l) {
      return '<article class="lab-card appare">' +
        '<img src="' + esc(l.immagine) + '" alt="' + esc(l.titolo) + '" loading="lazy" width="800" height="500"' +
        (l.posizioneImmagine ? ' style="object-position:' + esc(l.posizioneImmagine) + '"' : "") + ">" +
        '<div class="lab-card__corpo"><h3>' + esc(l.titolo) + "</h3><p>" + esc(l.descrizione) + "</p>" +
        (l.consigliato ? '<span class="etichetta">' + esc(l.consigliato) + "</span>" : "") +
        "</div></article>";
    }).join("");
  }

  /* ---------- Comparsa morbida allo scorrimento ---------- */
  var el = document.querySelectorAll(".appare");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("visibile"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -40px 0px" });
    el.forEach(function (e) { io.observe(e); });
  } else { el.forEach(function (e) { e.classList.add("visibile"); }); }
})();
