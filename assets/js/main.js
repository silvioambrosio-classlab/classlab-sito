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
  // Le pagine nella cartella news/ evidenziano la voce di menu "News"
  if (/^\/news\//i.test(location.pathname)) pagina = "news/";

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
      '<a class="skip-link" href="' + esc(location.pathname) + '#contenuto">Vai al contenuto</a>' +
      '<header class="header"><div class="contenitore header__barra">' +
      '<a class="logo" href="index.html" aria-label="ClassLab ODV – Home"><img src="assets/img/logo-classlab-150.webp" alt="" width="150" height="163"><span>ClassLab ODV</span></a>' +
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
      '<div><a class="footer__logo" href="index.html"><img src="assets/img/logo-classlab-150.webp" alt="ClassLab" width="150" height="163"></a>' +
      "<p>Laboratori scientifici e peer education per le scuole del Friuli Venezia Giulia e non solo.</p>" +
      '<p>Scrivici: <a href="mailto:' + esc(C.email) + '">' + esc(C.email) + "</a>" +
      (C.pec ? '<br>PEC: <a href="mailto:' + esc(C.pec) + '">' + esc(C.pec) + "</a>" : "") + "</p></div>" +
      '<div><h4>Il sito</h4><ul>' + linkMenu.map(function (l) { return '<li><a href="' + esc(l.link) + '">' + esc(l.testo) + "</a></li>"; }).join("") + "</ul></div>" +
      '<div><h4>Partecipa</h4><ul><li><a href="partecipa.html#modulo">Iscrivi la tua scuola</a></li><li><a href="partecipa.html#divulgatori">Diventa divulgatore</a></li>' +
      '<li><a href="mailto:' + esc(C.email) + '">Contattaci</a></li>' + social + "</ul></div>" +
      "</div>" +
      '<div class="footer__fondo"><div class="footer__riga"><span>© ' + new Date().getFullYear() + " " + esc(C.nome) + " – Tutti i diritti riservati</span>" +
      '<a class="footer__team" href="area-team.html" rel="nofollow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Area team</a></div>' +
      '<div class="footer__riga footer__legale"><span>Codice fiscale ' + esc(C.codiceFiscale) + "</span><span>Codice RUNTS " + esc(C.codiceRUNTS) + "</span>" +
      (C.pec ? "<span>PEC " + esc(C.pec) + "</span>" : "") +
      "<span>Sede legale: " + esc(C.sedeLegale) + "</span></div>" +
      "</div></div></footer>";
  }

  /* ---------- Comportamento menu ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("nav-principale");
  if (toggle && nav) {
    var icona = toggle.querySelector("path");
    function chiudi() {
      nav.classList.remove("aperto"); document.body.classList.remove("menu-aperto"); document.documentElement.classList.remove("blocca-scroll");
      toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Apri il menu");
      icona.setAttribute("d", "M4 7h16M4 12h16M4 17h16");
    }
    toggle.addEventListener("click", function () {
      var aperto = nav.classList.toggle("aperto");
      document.body.classList.toggle("menu-aperto", aperto);
      document.documentElement.classList.toggle("blocca-scroll", aperto);
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

  /* ---------- Link email ----------
     Un clic su un indirizzo apre SUBITO la scrittura della mail
     nel programma di posta del dispositivo.
     Solo se dopo un attimo non si è aperto nulla (succede sui computer
     senza programma di posta impostato) compare in basso un piccolo
     aiuto discreto con Gmail, Outlook e "Copia indirizzo".            */
  function apriEmail(indirizzo, oggetto, testo) {
    var q = function (k, v) { return v ? "&" + k + "=" + encodeURIComponent(v) : ""; };
    var par = [];
    if (oggetto) par.push("subject=" + encodeURIComponent(oggetto));
    if (testo) par.push("body=" + encodeURIComponent(testo));
    var mailto = "mailto:" + indirizzo + (par.length ? "?" + par.join("&") : "");

    var aperto = false;
    function segna() { aperto = true; }
    window.addEventListener("blur", segna);
    document.addEventListener("visibilitychange", segna);
    location.href = mailto;
    setTimeout(function () {
      window.removeEventListener("blur", segna);
      document.removeEventListener("visibilitychange", segna);
      if (!aperto && document.hasFocus()) mostraAiuto();
    }, 1600);

    function mostraAiuto() {
      var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(indirizzo) + q("su", oggetto) + q("body", testo);
      var outlook = "https://outlook.office.com/mail/deeplink/compose?to=" + encodeURIComponent(indirizzo) + q("subject", oggetto) + q("body", testo);
      var vecchio = document.querySelector(".email-aiuto"); if (vecchio) vecchio.remove();
      var box = document.createElement("div");
      box.className = "email-aiuto"; box.setAttribute("role", "status");
      box.innerHTML = '<span class="email-aiuto__testo">Non si è aperta la posta? Scrivi a <strong>' + esc(indirizzo) + "</strong> con</span>" +
        '<a href="' + esc(gmail) + '" target="_blank" rel="noopener">Gmail</a>' +
        '<a href="' + esc(outlook) + '" target="_blank" rel="noopener">Outlook</a>' +
        '<button type="button" data-copia>Copia</button>' +
        '<button type="button" class="email-aiuto__chiudi" aria-label="Chiudi">✕</button>';
      document.body.appendChild(box);
      requestAnimationFrame(function () { box.classList.add("visibile"); });
      var timer = setTimeout(chiudi, 12000);
      function chiudi() { clearTimeout(timer); box.classList.remove("visibile"); setTimeout(function () { box.remove(); }, 300); }
      box.querySelector(".email-aiuto__chiudi").addEventListener("click", chiudi);
      box.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setTimeout(chiudi, 200); }); });
      box.querySelector("[data-copia]").addEventListener("click", function () {
        var btn = this, t = testo ? indirizzo + "\n\n" + testo : indirizzo;
        function ok() { btn.textContent = "Copiato ✓"; clearTimeout(timer); timer = setTimeout(chiudi, 3000); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { prompt("Copia l'indirizzo:", indirizzo); });
        else prompt("Copia l'indirizzo:", indirizzo);
      });
    }
  }
  window.ClassLabEmail = apriEmail;

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="mailto:"]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    var url = a.getAttribute("href").slice(7);
    var parti = url.split("?");
    var par = {};
    (parti[1] || "").split("&").forEach(function (kv) {
      var i = kv.indexOf("="); if (i > 0) par[kv.slice(0, i).toLowerCase()] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " "));
    });
    apriEmail(decodeURIComponent(parti[0]), par.subject || "", par.body || "");
  });

  /* ---------- Partner ---------- */
  var freccia = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var fp = document.getElementById("partner-principale");
  if (fp) fp.innerHTML = (C.finanziatori || []).map(function (p) {
    return '<article class="partner-top appare">' +
      '<a class="partner-top__logo" href="' + esc(p.link) + '" target="_blank" rel="noopener"><img src="' + esc(p.logo) + '" alt="' + esc(p.nome) + '" loading="lazy"></a>' +
      '<div class="partner-top__testo">' +
      "<h3>" + esc(p.nome) + "</h3><p>" + esc(p.descrizione || "") + "</p>" +
      '<a class="partner-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">Scopri la fondazione ' + freccia + "</a></div></article>";
  }).join("");
  var fs = document.getElementById("partner-sostenitori");
  if (fs) fs.innerHTML = (C.sostenitori || []).map(function (p) {
    return '<a class="partner-card appare" href="' + esc(p.link) + '" target="_blank" rel="noopener">' +
      '<div class="partner-card__logo"><img src="' + esc(p.logo) + '" alt="' + esc(p.nome) + '" loading="lazy"></div>' +
      "<h3>" + esc(p.nome) + "</h3><p>" + esc(p.descrizione || "") + "</p>" +
      '<span class="partner-link">Visita il sito ' + freccia + "</span></a>";
  }).join("");

  /* Fascia loghi sopra il piè di pagina (tutte le pagine tranne la home) */
  var footerEl = document.querySelector(".footer");
  if (footerEl && !fs && !document.body.hasAttribute("data-senza-partner")) {
    var tutti = (C.finanziatori || []).concat(C.sostenitori || []);
    var banda = document.createElement("section");
    banda.className = "banda-partner";
    banda.setAttribute("aria-label", "Partner di ClassLab");
    banda.innerHTML = '<div class="contenitore"><p class="banda-partner__titolo">ClassLab è possibile grazie a</p><div class="banda-partner__loghi">' +
      tutti.map(function (p, i) {
        return '<a href="' + esc(p.link) + '" target="_blank" rel="noopener" title="' + esc(p.nome) + '"' + (i < (C.finanziatori || []).length ? ' class="principale"' : "") + '><img src="' + esc(p.logo) + '" alt="' + esc(p.nome) + '" loading="lazy"></a>';
      }).join("") + "</div></div>";
    footerEl.parentNode.insertBefore(banda, footerEl);
    /* Bilancia loghi verticali e molto larghi perché "pesino" uguale */
    banda.querySelectorAll("img").forEach(function (img) {
      function misura() {
        var r = img.naturalWidth / img.naturalHeight;
        if (r && r < 1.2) img.classList.add("verticale");
        else if (r > 3.2 && !img.parentNode.classList.contains("principale")) img.classList.add("largo");
      }
      if (img.complete) misura(); else img.addEventListener("load", misura);
    });
  }

  /* ---------- Catalogo laboratori ---------- */
  function cardLab(l, disegno) {
    var visual = l.immagine
      ? '<img src="' + esc(l.immagine) + '" alt="' + esc(l.titolo) + '" loading="lazy" width="800" height="500"' +
        (l.posizioneImmagine ? ' style="object-position:' + esc(l.posizioneImmagine) + '"' : "") + ">"
      : '<div class="lab-card__disegno lab-card__disegno--' + esc(l.disegno || "onde") + '" aria-hidden="true">' + (DISEGNI[l.disegno] || DISEGNI.onde) + "</div>";
    return '<article class="lab-card appare">' + visual +
      '<div class="lab-card__corpo"><h3>' + esc(l.titolo) + "</h3><p>" + esc(l.descrizione) + "</p>" +
      (l.consigliato ? '<span class="etichetta">' + esc(l.consigliato) + "</span>" : "") +
      "</div></article>";
  }
  var DISEGNI = {
    onde: '<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke-width="3" stroke-linecap="round">' +
      [0, 1, 2, 3, 4, 5].map(function (i) {
        var c = ["#ff6b6b", "#f9a03f", "#f7d046", "#5dd39e", "#4dabf7", "#9775fa"][i], y = 60 + i * 16, d = "M-20 " + y;
        for (var x = -20; x <= 420; x += 40) d += " q 20 " + (i % 2 ? -26 : 26) + " 40 0";
        return '<path d="' + d + '" stroke="' + c + '" opacity=".9"/>';
      }).join("") + '</g><circle cx="330" cy="46" r="18" fill="#fff6c9" opacity=".9"/></svg>',
    campo: '<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#cfe8fb" stroke-width="2.2" opacity=".85">' +
      [26, 46, 66, 86].map(function (r) {
        return '<path d="M150 100 C 150 ' + (100 - r * 1.6) + ', 250 ' + (100 - r * 1.6) + ', 250 100"/><path d="M150 100 C 150 ' + (100 + r * 1.6) + ', 250 ' + (100 + r * 1.6) + ', 250 100"/>';
      }).join("") + '</g><rect x="120" y="86" width="80" height="28" rx="6" fill="#ff6b6b"/><rect x="200" y="86" width="80" height="28" rx="6" fill="#4dabf7"/>' +
      '<text x="160" y="106" font-family="Montserrat,sans-serif" font-weight="800" font-size="18" fill="#fff" text-anchor="middle">N</text>' +
      '<text x="240" y="106" font-family="Montserrat,sans-serif" font-weight="800" font-size="18" fill="#fff" text-anchor="middle">S</text></svg>'
  };
  var griglia = document.getElementById("griglia-laboratori");
  if (griglia && window.CLASSLAB_LABORATORI) {
    griglia.innerHTML = window.CLASSLAB_LABORATORI.filter(function (l) { return l.visibile !== false; }).map(function (l) { return cardLab(l); }).join("");
  }
  var grigliaF = document.getElementById("griglia-fisica");
  if (grigliaF && window.CLASSLAB_PERCORSI_FISICA) {
    grigliaF.innerHTML = window.CLASSLAB_PERCORSI_FISICA.filter(function (l) { return typeof l === "object" && l.visibile !== false; }).map(function (l) { return cardLab(l); }).join("");
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
