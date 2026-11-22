/* =====================================================================
   CLASSLAB – MODULO DI ADESIONE DELLE SCUOLE
   Le scelte dei laboratori arrivano da laboratori-dati.js.
   L'indirizzo di invio (Google Sheet) si imposta in config.js.
   ===================================================================== */
(function () {
  "use strict";
  var form = document.getElementById("modulo-adesione");
  if (!form) return;

  var C = window.CLASSLAB || {};
  var LABS = (window.CLASSLAB_LABORATORI || []).filter(function (l) { return l.visibile !== false; });
  var FISICA = window.CLASSLAB_PERCORSI_FISICA || [];
  var CLASSI = window.CLASSLAB_CLASSI || {};
  var CONSIGLIO = "Preferisco farmi consigliare dal team ClassLab";
  var MAX_CLASSI = 30;

  var contenitoreClassi = document.getElementById("elenco-classi");
  var btnAggiungi = document.getElementById("aggiungi-classe");
  var bloccoClassi = document.getElementById("passo-classi");
  var riepilogoErrori = document.getElementById("riepilogo-errori");
  var contatore = 0;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function ordine() { var r = form.querySelector('input[name="ordine"]:checked'); return r ? r.value : ""; }

  /* ---------- Cambio ordine di scuola ---------- */
  form.querySelectorAll('input[name="ordine"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var ci = contenitoreClassi.querySelectorAll(".classe");
      if (ci.length && classiCompilate()) {
        if (!confirm("Cambiando ordine di scuola le classi già inserite verranno cancellate. Continuare?")) {
          var prec = contenitoreClassi.dataset.ordine;
          form.querySelector('input[name="ordine"][value="' + prec + '"]').checked = true;
          return;
        }
      }
      contenitoreClassi.innerHTML = "";
      contenitoreClassi.dataset.ordine = r.value;
      bloccoClassi.hidden = false;
      aggiungiClasse();
      togliErrore(document.getElementById("campo-ordine"));
    });
  });
  function classiCompilate() {
    return Array.prototype.some.call(contenitoreClassi.querySelectorAll("select, input"), function (el) {
      return el.type === "checkbox" || el.type === "radio" ? el.checked && el.name.indexOf("percorso") !== 0 : el.value;
    });
  }

  /* ---------- Opzioni dei laboratori ---------- */
  function opzioniLab(gruppo) {
    return '<option value="">— Seleziona —</option>' + LABS.filter(function (l) {
      return (l.perChi || []).indexOf(gruppo) !== -1;
    }).map(function (l) { return '<option value="' + esc(l.titolo) + '">' + esc(l.titolo) + "</option>"; }).join("");
  }
  function opzioniFisica() {
    return '<option value="">— Seleziona il percorso —</option>' + FISICA.filter(function (p) { return p.visibile !== false; }).map(function (p) {
      var t = typeof p === "string" ? p : p.titolo;
      return '<option value="' + esc(t) + '">' + esc(t) + "</option>";
    }).join("");
  }

  /* ---------- Aggiunta / rimozione classi ---------- */
  function aggiungiClasse() {
    var ord = ordine();
    if (!ord) return;
    var n = contenitoreClassi.querySelectorAll(".classe").length;
    if (n >= MAX_CLASSI) { alert("Puoi inserire al massimo " + MAX_CLASSI + " classi per richiesta."); return; }
    contatore++;
    var id = "c" + contatore;
    var anni = CLASSI[ord] || [];
    var secondaria = ord === "Secondaria di primo grado";

    var div = document.createElement("div");
    div.className = "classe";
    div.dataset.id = id;
    div.innerHTML =
      '<div class="classe__testa"><div class="classe__titolo">🧪 <span class="classe__nome">Classe ' + (n + 1) + "</span></div>" +
      '<button type="button" class="classe__rimuovi" aria-label="Rimuovi questa classe">✕ Rimuovi</button></div>' +
      '<div class="riga-classe">' +
        '<div class="campo"><label for="' + id + '-anno">Classe <span class="obbl">*</span></label>' +
          '<select id="' + id + '-anno" data-campo="anno"><option value="">—</option>' +
          anni.map(function (a) { return '<option value="' + esc(a.valore) + '" data-gruppo="' + a.gruppo + '">' + esc(a.valore) + "</option>"; }).join("") +
          '</select><div class="msg-errore">Scegli la classe</div></div>' +
        '<div class="campo"><label for="' + id + '-sez">Sezione <span class="obbl">*</span></label>' +
          '<input type="text" id="' + id + '-sez" data-campo="sezione" maxlength="10" placeholder="Es. A" autocomplete="off" autocapitalize="characters">' +
          '<div class="msg-errore">Indica la sezione</div></div>' +
        '<div class="campo"><label for="' + id + '-alunni">N. alunni</label>' +
          '<input type="number" id="' + id + '-alunni" data-campo="alunni" min="1" max="40" inputmode="numeric" placeholder="Facoltativo"></div>' +
      "</div>" +
      (secondaria ?
        '<div class="campo" data-percorso><span class="etichetta-campo">Percorso <span class="obbl">*</span></span>' +
          '<div class="scelte scelte--piccole" role="radiogroup">' +
          '<label class="scelta"><input type="radio" name="percorso-' + id + '" value="Biologia"><span>🧬 Biologia</span></label>' +
          '<label class="scelta"><input type="radio" name="percorso-' + id + '" value="Fisica"><span>⚡ Fisica</span></label>' +
          '</div><div class="msg-errore">Scegli Biologia o Fisica</div></div>' : "") +
      '<div class="zona-labs" ' + (secondaria ? "hidden" : "") + "></div>";

    contenitoreClassi.appendChild(div);
    var selAnno = div.querySelector('[data-campo="anno"]');

    function disegnaLabs() {
      var zona = div.querySelector(".zona-labs");
      var opt = selAnno.options[selAnno.selectedIndex];
      var gruppo = opt && opt.dataset.gruppo;
      var perc = div.querySelector('input[name="percorso-' + id + '"]:checked');
      if (secondaria) {
        if (!perc) { zona.hidden = true; return; }
        zona.hidden = false;
        if (perc.value === "Fisica") {
          zona.innerHTML = '<div class="campo"><label for="' + id + '-fis">Percorso di fisica <span class="obbl">*</span></label>' +
            '<select id="' + id + '-fis" data-campo="lab1">' + opzioniFisica() + "</select>" +
            '<div class="msg-errore">Scegli un percorso oppure spunta la casella qui sotto</div></div>' + casellaConsiglio();
          collegaConsiglio(); return;
        }
        gruppo = "secondaria";
      }
      if (!gruppo) { zona.innerHTML = '<p class="aiuto" style="margin:0 0 6px">Scegli prima la classe per vedere i laboratori disponibili.</p>'; return; }
      var o = opzioniLab(gruppo);
      zona.innerHTML =
        '<p class="etichetta-campo" style="font-weight:700;font-size:.88rem;color:var(--inchiostro);margin:4px 0 8px">Laboratori preferiti <span style="font-weight:500;color:var(--grigio)">(in ordine di preferenza; ne svolgeremo 3)</span></p>' +
        '<div class="labs">' +
        [1, 2, 3].map(function (k) {
          return '<div class="campo"><label for="' + id + "-lab" + k + '">Scelta ' + k + (k === 1 ? ' <span class="obbl">*</span>' : "") + "</label>" +
            '<select id="' + id + "-lab" + k + '" data-campo="lab' + k + '">' + o + "</select>" +
            (k === 1 ? '<div class="msg-errore">Scegli almeno un laboratorio oppure spunta la casella qui sotto</div>' : "") + "</div>";
        }).join("") + "</div>" + casellaConsiglio();
      collegaConsiglio();
      var sel = zona.querySelectorAll(".labs select");
      sel.forEach(function (s) { s.addEventListener("change", function () { evitaDoppioni(sel); togliErrore(s.closest(".campo")); }); });
    }
    function casellaConsiglio() {
      return '<label class="check"><input type="checkbox" data-campo="consiglio"> <span>' + CONSIGLIO + "</span></label>";
    }
    function collegaConsiglio() {
      var cb = div.querySelector('[data-campo="consiglio"]');
      cb.addEventListener("change", function () {
        div.querySelectorAll('.zona-labs select').forEach(function (s) { s.disabled = cb.checked; if (cb.checked) s.value = ""; });
        div.querySelectorAll(".zona-labs .campo").forEach(togliErrore);
      });
    }

    selAnno.addEventListener("change", function () { if (!secondaria) disegnaLabs(); togliErrore(selAnno.closest(".campo")); });
    div.querySelectorAll('input[name="percorso-' + id + '"]').forEach(function (r) {
      r.addEventListener("change", function () { disegnaLabs(); togliErrore(div.querySelector("[data-percorso]")); });
    });
    div.querySelector('[data-campo="sezione"]').addEventListener("input", function (e) {
      e.target.value = e.target.value.toUpperCase(); togliErrore(e.target.closest(".campo"));
    });
    div.querySelector(".classe__rimuovi").addEventListener("click", function () {
      if (contenitoreClassi.querySelectorAll(".classe").length === 1) {
        alert("Serve almeno una classe. Puoi modificare quella esistente."); return;
      }
      div.remove(); rinumera();
    });
    if (!secondaria) disegnaLabs();
    rinumera();
    if (n > 0) selAnno.focus();
  }

  function evitaDoppioni(select) {
    var scelti = Array.prototype.map.call(select, function (s) { return s.value; });
    select.forEach(function (s, i) {
      Array.prototype.forEach.call(s.options, function (o) {
        o.disabled = !!o.value && scelti.indexOf(o.value) !== -1 && scelti[i] !== o.value;
      });
    });
  }
  function rinumera() {
    var tutte = contenitoreClassi.querySelectorAll(".classe");
    tutte.forEach(function (c, i) { c.querySelector(".classe__nome").textContent = "Classe " + (i + 1); });
    btnAggiungi.textContent = "+ Aggiungi un'altra classe (" + tutte.length + " inserit" + (tutte.length === 1 ? "a" : "e") + ")";
  }
  btnAggiungi.addEventListener("click", aggiungiClasse);

  /* ---------- Validazione ---------- */
  function errore(campo) { if (campo) campo.classList.add("errore"); }
  function togliErrore(campo) { if (campo) campo.classList.remove("errore"); }
  form.addEventListener("input", function (e) { var c = e.target.closest(".campo"); if (c && e.target.value) togliErrore(c); });
  form.addEventListener("change", function (e) { var c = e.target.closest(".campo"); if (c && (e.target.value || e.target.checked)) togliErrore(c); });

  function valida() {
    var primo = null, n = 0;
    function segna(campo, focus) { errore(campo); n++; if (!primo) primo = focus || campo; }

    ["referente", "email", "telefono", "comune", "scuola", "giornate"].forEach(function (nome) {
      var el = form.elements[nome];
      var ok = el.value.trim() !== "";
      if (ok && nome === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
      if (ok && nome === "telefono") ok = el.value.replace(/[^\d]/g, "").length >= 6;
      if (!ok) segna(el.closest(".campo"), el);
    });
    if (!ordine()) segna(document.getElementById("campo-ordine"), form.querySelector('input[name="ordine"]'));

    contenitoreClassi.querySelectorAll(".classe").forEach(function (c) {
      var anno = c.querySelector('[data-campo="anno"]');
      var sez = c.querySelector('[data-campo="sezione"]');
      if (!anno.value) segna(anno.closest(".campo"), anno);
      if (!sez.value.trim()) segna(sez.closest(".campo"), sez);
      var perc = c.querySelector("[data-percorso]");
      if (perc && !perc.querySelector("input:checked")) { segna(perc, perc.querySelector("input")); return; }
      var cb = c.querySelector('[data-campo="consiglio"]');
      var lab1 = c.querySelector('[data-campo="lab1"]');
      if (lab1 && !lab1.value && !(cb && cb.checked)) segna(lab1.closest(".campo"), lab1);
    });

    var priv = form.elements.privacy;
    if (!priv.checked) segna(priv.closest(".campo"), priv);

    if (n) {
      riepilogoErrori.style.display = "block";
      riepilogoErrori.textContent = n === 1 ? "Manca 1 informazione: controlla il campo evidenziato in rosso." : "Mancano " + n + " informazioni: controlla i campi evidenziati in rosso.";
      primo.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () { primo.focus({ preventScroll: true }); }, 350);
      return false;
    }
    riepilogoErrori.style.display = "none";
    return true;
  }

  /* ---------- Raccolta dati ---------- */
  function raccogli() {
    var d = {
      referente: form.elements.referente.value.trim(),
      email: form.elements.email.value.trim(),
      telefono: form.elements.telefono.value.trim(),
      comune: form.elements.comune.value.trim(),
      scuola: form.elements.scuola.value.trim(),
      ordine: ordine(),
      giornate: form.elements.giornate.value.trim(),
      note: form.elements.note.value.trim(),
      privacy: form.elements.privacy.checked ? "Acconsento" : "",
      sito_web: form.elements.sito_web.value, // anti-spam (deve restare vuoto)
      pagina: location.href,
      classi: []
    };
    contenitoreClassi.querySelectorAll(".classe").forEach(function (c) {
      function v(campo) { var el = c.querySelector('[data-campo="' + campo + '"]'); return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : ""; }
      var perc = c.querySelector('input[type="radio"]:checked');
      var consiglio = v("consiglio") === true;
      d.classi.push({
        classe: v("anno") + " " + v("sezione"),
        alunni: v("alunni"),
        percorso: d.ordine === "Primaria" ? "Biologia" : (perc ? perc.value : ""),
        lab1: consiglio ? "" : v("lab1"),
        lab2: consiglio ? "" : v("lab2"),
        lab3: consiglio ? "" : v("lab3"),
        consiglio: consiglio ? "Sì" : "No"
      });
    });
    return d;
  }

  function testoRiepilogo(d) {
    var r = [
      "Scuola: " + d.scuola + " (" + d.comune + ")",
      "Ordine: " + d.ordine,
      "Referente: " + d.referente + " – " + d.email + " – " + d.telefono,
      "",
      "Classi (" + d.classi.length + "):"
    ];
    d.classi.forEach(function (c) {
      var labs = c.consiglio === "Sì" ? "laboratori consigliati dal team ClassLab" : [c.lab1, c.lab2, c.lab3].filter(Boolean).join(" / ");
      r.push("• " + c.classe + (c.alunni ? " (" + c.alunni + " alunni)" : "") + " – " + c.percorso + ": " + labs);
    });
    r.push("", "Giornate disponibili: " + d.giornate);
    if (d.note) r.push("Note: " + d.note);
    return r.join("\n");
  }

  function mostraEsito(d, codice, viaEmail) {
    var box = document.getElementById("esito");
    form.hidden = true;
    box.hidden = false;
    box.innerHTML =
      '<div class="esito__icona" aria-hidden="true">✓</div>' +
      "<h2>" + (viaEmail ? "Quasi fatto!" : "Richiesta inviata con successo!") + "</h2>" +
      (viaEmail
        ? "<p>Per completare la richiesta <strong>invia l'email già compilata</strong> dal tuo programma di posta. Se non si è aperta, <a href=\"#\" data-riapri>riaprila da qui</a>, oppure copia il riepilogo qui sotto e scrivi a <strong>" + esc(C.email) + "</strong>.</p>"
        : "<p>Grazie da tutto il team ClassLab! Ti ricontatteremo presto all'indirizzo <strong>" + esc(d.email) + "</strong>." +
          (codice ? "<br>Codice della richiesta: <strong>" + esc(codice) + "</strong>" : "") + "</p>") +
      '<div class="riepilogo">' + esc(testoRiepilogo(d)) + "</div>" +
      '<p style="font-size:.9rem;color:var(--grigio)">Ricorda: l\'invio del modulo non costituisce una prenotazione.</p>' +
      '<a class="btn btn--contorno-blu" href="index.html">Torna alla home</a>';
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    var riapri = box.querySelector("[data-riapri]");
    if (riapri) riapri.addEventListener("click", function (e) {
      e.preventDefault(); window.ClassLabEmail(C.email, "Richiesta ClassLab – " + d.scuola, testoRiepilogo(d));
    });
  }

  function inviaViaEmail(d) {
    var oggetto = "Richiesta ClassLab – " + d.scuola;
    mostraEsito(d, "", true);
    if (window.ClassLabEmail) window.ClassLabEmail(C.email, oggetto, testoRiepilogo(d));
    else location.href = "mailto:" + C.email + "?subject=" + encodeURIComponent(oggetto) + "&body=" + encodeURIComponent(testoRiepilogo(d));
  }

  /* ---------- Invio ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!valida()) return;
    var d = raccogli();
    if (d.sito_web) { mostraEsito(d, "", false); return; } // probabile spam

    if (!C.moduloEndpoint) { inviaViaEmail(d); return; }

    var btn = form.querySelector(".invia");
    btn.disabled = true; btn.textContent = "Invio in corso…";

    var corpo = new URLSearchParams();
    corpo.append("payload", JSON.stringify(d));

    var finito = false;
    var timer = setTimeout(function () { if (!finito) fallito(); }, 25000);

    fetch(C.moduloEndpoint, { method: "POST", body: corpo })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        finito = true; clearTimeout(timer);
        var j = {}; try { j = JSON.parse(t); } catch (x) { /* risposta non JSON */ }
        if (j.ok === false) throw new Error(j.errore || "Errore");
        mostraEsito(d, j.codice || "", false);
      })
      .catch(function () { finito = true; clearTimeout(timer); fallito(); });

    function fallito() {
      btn.disabled = false; btn.textContent = "Invia la richiesta di adesione";
      if (confirm("Non siamo riusciti a inviare la richiesta (problema di connessione).\n\nVuoi inviarla via email? Si aprirà un messaggio già compilato.")) inviaViaEmail(d);
    }
  });
})();
