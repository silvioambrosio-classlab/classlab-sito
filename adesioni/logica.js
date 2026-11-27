/* =====================================================================
   CLASSLAB · ADESIONI — logica (senza interfaccia)
   ---------------------------------------------------------------------
   1. interpreta()   testo "Giornate disponibili" → vincoli (giorni, fasce, date)
   2. controlla()    crosscheck di ogni richiesta → avvisi
   3. riassunto()    riassunto breve di ogni richiesta (max ~30 parole)
   4. pianifica()    dati gli intervalli di date, dispone le classi
   Funziona nel browser (window.Adesioni) e in Node (require) per i test.
   Nessuna scrittura sui fogli: tutto resta nella pagina /adesioni/.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Adesioni = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Impostazioni predefinite (modificabili dalla pagina)               */
  /* ------------------------------------------------------------------ */
  var GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven"]; // indice 0..4 = lunedì..venerdì
  var PARAMETRI = {
    fasce: [
      { inizio: 8 * 60, fine: 10 * 60 },
      { inizio: 10 * 60, fine: 12 * 60 },
      { inizio: 12 * 60, fine: 14 * 60 },
      { inizio: 14 * 60, fine: 16 * 60 }
    ],
    maxParallelo: 2,      // classi nella stessa fascia (tutte le scuole)
    maxClassiGiorno: 6,   // classi in un giorno (tutte le scuole)
    maxScuoleGiorno: 2,   // scuole diverse in un giorno
    kitUnico: true,       // un kit per esperimento: due classi in parallelo non condividono un laboratorio
    periodo: { dal: "", al: "" }, // periodo della campagna (per gli avvisi), es. 2026-12-12 / 2027-03-15
    chiusure: [],         // date in cui le scuole sono chiuse (oltre alle feste nazionali), "AAAA-MM-GG"
    tentativi: 300        // ricerche casuali del pianificatore (più = migliore, più lento)
  };
  var MATTINA_FINE = 12 * 60;   // "mattina": fasce che iniziano prima delle 12
  var POMERIGGIO_INIZIO = 12 * 60; // "pomeriggio": fasce che iniziano dalle 12 in poi
  var TOLLERANZA = 30;          // minuti: una fascia va bene se esce dalla finestra al massimo di 30'

  var MESI = { gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5, luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11 };
  var MESI_BREVI = { gen: 0, feb: 1, mar: 2, apr: 3, mag: 4, giu: 5, lug: 6, ago: 7, set: 8, ott: 9, nov: 10, dic: 11 };
  var NOMI_MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

  /* ------------------------------------------------------------------ */
  /* Date                                                                */
  /* ------------------------------------------------------------------ */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function daIso(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function giornoSett(s) { var g = daIso(s).getDay(); return g === 0 ? 6 : g - 1; } // 0 = lunedì
  function aggiungiGiorni(s, n) { var d = daIso(s); d.setDate(d.getDate() + n); return iso(d); }
  function dataBreve(s) { if (!s) return ""; var d = daIso(s); return GIORNI.concat(["Sab", "Dom"])[giornoSett(s)] + " " + d.getDate() + " " + NOMI_MESI[d.getMonth()]; }
  function oraTesto(m) { return Math.floor(m / 60) + (m % 60 ? ":" + pad(m % 60) : ""); }
  function fasciaTesto(f) { return oraTesto(f.inizio) + "–" + oraTesto(f.fine); }

  /** Anno scolastico di una data: agosto-dicembre → anno, gennaio-luglio → anno - 1. */
  function annoScolastico(d) { d = d || new Date(); return d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; }
  /** Data completa di giorno/mese dentro l'anno scolastico che inizia in "anno". */
  function dataAS(anno, mese, giorno) { return iso(new Date(mese >= 7 ? anno : anno + 1, mese, giorno)); }

  function pasqua(y) { // algoritmo di Gauss/Meeus
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mese = Math.floor((h + l - 7 * m + 114) / 31), giorno = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mese - 1, giorno);
  }
  /** Feste nazionali (scuole chiuse) di un anno solare. */
  function festivi(y) {
    var f = ["01-01", "01-06", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08", "12-25", "12-26"].map(function (x) { return y + "-" + x; });
    var p = pasqua(y); p.setDate(p.getDate() + 1); f.push(iso(p)); // lunedì dell'Angelo
    return f;
  }

  /* ------------------------------------------------------------------ */
  /* 1. Interpretazione delle disponibilità                             */
  /* ------------------------------------------------------------------ */
  // il testo arriva già senza accenti (normalizza): "lunedì" → "lunedi"
  var RE_GIORNO = /\b(lunedi|lun|martedi|mart|mercoledi|merc|mer|giovedi|giov|gio|venerdi|ven|sabato|sab)(?![a-z])\.?/g;
  function indiceGiorno(t) {
    t = t.toLowerCase();
    if (/^lun/.test(t)) return 0;
    if (/^mart/.test(t)) return 1;
    if (/^mer/.test(t)) return 2;
    if (/^gio/.test(t)) return 3;
    if (/^ven/.test(t)) return 4;
    return 5; // sabato: non usato
  }
  function normalizza(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // via gli accenti
      .replace(/[\u2018\u2019\u00b4`]/g, "'")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\s+/g, " ").trim();
  }
  function minuti(h, m) { h = +h; m = m ? +m : 0; if (h < 7 && h > 0) h += 12; return h * 60 + m; } // "2-4" del pomeriggio = 14-16

  /** Trova le finestre orarie in un pezzo di testo. Restituisce [[da, a], ...] in minuti. */
  function trovaOrari(t) {
    var out = [], m;
    // "dalle 9.30 alle 13.30", "8-10", "'8-10", "14'16", "13:50-15:50", "8 - 12", "ore 14-16"
    var re = /(?:dalle\s+(?:ore\s+)?)?'?(?<![\d\/])(\d{1,2})(?:[:.,](\d{2}))?\s*(?:-|'|alle(?:\s+ore)?|a)\s*'?(\d{1,2})(?:[:.,](\d{2}))?(?![\d\/])/g;
    while ((m = re.exec(t))) {
      var da = minuti(m[1], m[2]), a = minuti(m[3], m[4]);
      if (+m[1] > 20 || +m[3] > 20) continue;      // non sono ore (es. 10-21 gennaio)
      if (/^\s*(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)/.test(t.slice(re.lastIndex))) continue; // "10-21 gennaio" = date
      if (a <= da) continue;
      out.push([da, a]);
    }
    // "dopo le 11", "dalle 10" (senza fine)
    re = /\b(?:dopo le|dalle|a partire dalle)\s+(?:ore\s+)?(\d{1,2})(?:[:.](\d{2}))?(?![\d:.])(?!\s*(?:-|'|alle\b|a\s+\d))/g;
    while ((m = re.exec(t))) out.push([minuti(m[1], m[2]), 24 * 60]);
    // "entro le 12", "prima delle 12", "fino alle 12"
    re = /\b(?:entro le|prima delle|fino alle)\s+(?:ore\s+)?(\d{1,2})(?:[:.](\d{2}))?(?!\d)/g;
    while ((m = re.exec(t))) out.push([0, minuti(m[1], m[2])]);
    // "mattina"/"pomeriggio" contano solo se non ci sono orari precisi ("dopo le 11 di mattina" = dopo le 11)
    if (!out.length) {
      if (/\bmattin[ao]\b|\bmattinata\b/.test(t)) out.push([0, MATTINA_FINE + 120, "mattina"]);
      if (/\bpomeriggi[o]?\b/.test(t)) out.push([POMERIGGIO_INIZIO, 24 * 60, "pomeriggio"]);
    }
    return out;
  }

  /** Trova i giorni della settimana in un pezzo di testo, con intervalli ("lunedì-mercoledì", "da lunedì a giovedì"). */
  function trovaGiorni(t) {
    var trovati = [], m, re = new RegExp(RE_GIORNO.source, "g");
    while ((m = re.exec(t))) trovati.push({ g: indiceGiorno(m[1]), fine: re.lastIndex, inizio: m.index });
    var set = {};
    trovati.forEach(function (x, i) {
      set[x.g] = true;
      var succ = trovati[i + 1];
      if (succ) {
        var tra = t.slice(x.fine, succ.inizio);
        if (/^\s*(-|a|al)\s*$/.test(tra) || (/^\s*a\s*$/.test(tra) && /\bda\s*$/.test(t.slice(0, x.inizio)))) {
          for (var k = x.g; k <= succ.g; k++) set[k] = true;
        }
      }
    });
    return Object.keys(set).map(Number).filter(function (g) { return g < 5; });
  }

  /**
   * Interpreta il testo "Giornate disponibili".
   * Restituisce { griglia: [5][nFasce] boolean, dal, al, mesi: [..] | null, date: [..],
   *               certezza: "alta"|"media"|"bassa", letto: [frasi riconosciute], dubbi: [..] }
   * annoAS = anno di inizio dell'anno scolastico (es. 2026 per il 2026/27).
   */
  function interpreta(testo, annoAS, parametri) {
    var P = parametri || PARAMETRI;
    var nF = P.fasce.length;
    var t = normalizza(testo);
    var ris = { griglia: [], dal: "", al: "", mesi: null, mesiEsclusi: [], date: [], certezza: "alta", letto: [], dubbi: [] };
    var riconosciuto = false;

    // --- date e mesi --------------------------------------------------
    var m, re;
    var mesiRe = "(gennaio|febbraio|marzo|aprile|maggio|giugno|settembre|ottobre|novembre|dicembre)";
    var inizioMese = function (mm, quando) { // quando: "inizio" | "metà" | "fine" | giorno
      var g = quando === "metà" || quando === "meta" ? 15 : quando === "fine" ? 20 : 1;
      if (/^\d+$/.test(quando)) g = +quando;
      return dataAS(annoAS, MESI[mm], g);
    };
    var fineMese = function (mm, quando) {
      var y = MESI[mm] >= 7 ? annoAS : annoAS + 1;
      var ultimo = new Date(y, MESI[mm] + 1, 0).getDate();
      var g = quando === "inizio" ? 10 : quando === "metà" || quando === "meta" ? 15 : ultimo;
      if (/^\d+$/.test(quando)) g = +quando;
      return dataAS(annoAS, MESI[mm], g);
    };
    // "a partire da metà gennaio", "da inizio febbraio", "dopo il 15 gennaio", "dal 10 gennaio"
    re = new RegExp("\\b(?:a partire da(?:l|lla)?|da(?:l|lla)?|dopo(?: il| la)?)\\s+(?:(inizio|met[aà]|fine)\\s+(?:di\\s+)?|(\\d{1,2})\\s+)" + mesiRe, "g");
    while ((m = re.exec(t))) {
      var q = m[1] ? m[1].replace("à", "à") : m[2];
      var d = inizioMese(m[3], q === "metà" || q === "meta" ? "metà" : q);
      if (/^dopo/.test(m[0]) && m[2]) d = aggiungiGiorni(d, 1);
      if (!ris.dal || d > ris.dal) ris.dal = d;
      ris.letto.push("dal " + dataBreve(d)); riconosciuto = true;
    }
    // "entro fine febbraio", "fino a metà marzo", "fino al 20 febbraio", "prima di marzo"
    re = new RegExp("\\b(?:entro|fino a(?:l|lla)?|non oltre)\\s+(?:(inizio|met[aà]|fine)\\s+(?:di\\s+)?|(\\d{1,2})\\s+|il\\s+(\\d{1,2})\\s+)?" + mesiRe, "g");
    while ((m = re.exec(t))) {
      var q2 = m[1] || m[2] || m[3] || "fine";
      var d2 = fineMese(m[4], q2 === "metà" || q2 === "meta" ? "metà" : q2);
      if (!ris.al || d2 < ris.al) ris.al = d2;
      ris.letto.push("fino al " + dataBreve(d2)); riconosciuto = true;
    }
    re = new RegExp("\\bprima di\\s+" + mesiRe, "g");
    while ((m = re.exec(t))) {
      var d3 = aggiungiGiorni(dataAS(annoAS, MESI[m[1]], 1), -1);
      if (!ris.al || d3 < ris.al) ris.al = d3;
      ris.letto.push("fino al " + dataBreve(d3)); riconosciuto = true;
    }
    // "10-21 gennaio", "dal 10 al 21 gennaio"
    re = new RegExp("\\b(?:dal\\s+)?(\\d{1,2})\\s*(?:-|al)\\s*(\\d{1,2})\\s+" + mesiRe, "g");
    while ((m = re.exec(t))) {
      var a1 = dataAS(annoAS, MESI[m[3]], +m[1]), a2 = dataAS(annoAS, MESI[m[3]], +m[2]);
      if (!ris.dal || a1 > ris.dal) ris.dal = a1;
      if (!ris.al || a2 < ris.al) ris.al = a2;
      ris.letto.push("dal " + dataBreve(a1) + " al " + dataBreve(a2)); riconosciuto = true;
    }
    // mesi esclusi: "non a dicembre", "no dicembre", "tranne dicembre", "escluso dicembre"
    re = new RegExp("\\b(?:non (?:a|in|di|nel mese di)?|no|tranne|escluso|eccetto)\\s*" + mesiRe, "g");
    var esclusi = {};
    while ((m = re.exec(t))) { esclusi[MESI[m[1]]] = true; ris.letto.push("non a " + m[1]); riconosciuto = true; }
    ris.mesiEsclusi = Object.keys(esclusi).map(Number);
    // mesi indicati ("in febbraio/marzo", "gennaio o febbraio"): solo se non già letti come dal/al
    var tSenzaIntervalli = t.replace(new RegExp("\\b(?:a partire da(?:l|lla)?|da(?:l|lla)?|dopo(?: il| la)?|entro|fino a(?:l|lla)?|non oltre|prima di|non (?:a|in|di|nel mese di)?|no|tranne|escluso|eccetto)\\s+(?:(?:inizio|met[aà]|fine)\\s+(?:di\\s+)?|(?:il\\s+)?\\d{1,2}\\s+(?:al\\s+\\d{1,2}\\s+)?)?" + mesiRe, "g"), " ")
      .replace(new RegExp("\\b\\d{1,2}\\s*(?:-|al)\\s*\\d{1,2}\\s+" + mesiRe, "g"), " ");
    re = new RegExp(mesiRe, "g");
    var mesi = {};
    while ((m = re.exec(tSenzaIntervalli))) if (!esclusi[MESI[m[1]]]) mesi[MESI[m[1]]] = true;
    if (Object.keys(mesi).length) {
      ris.mesi = Object.keys(mesi).map(Number);
      ris.letto.push("mesi: " + ris.mesi.map(function (x) { return NOMI_MESI[x]; }).join(", ")); riconosciuto = true;
    }
    // date precise "21/12", "il 12/01/2027"
    re = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
    while ((m = re.exec(t))) {
      var gg = +m[1], mm = +m[2] - 1;
      if (mm < 0 || mm > 11 || gg < 1 || gg > 31) continue;
      ris.date.push(dataAS(annoAS, mm, gg));
    }
    if (ris.date.length) { ris.letto.push("date: " + ris.date.map(dataBreve).join(", ")); riconosciuto = true; }

    // --- giorni e orari, frase per frase --------------------------------
    // tolgo le date (non sono orari) prima di cercare gli orari
    var tOrari = t.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " ")
      .replace(new RegExp("\\b\\d{1,2}\\s*(?:-|al)\\s*\\d{1,2}\\s+" + mesiRe, "g"), " ")
      .replace(new RegExp("\\b\\d{1,2}\\s+" + mesiRe, "g"), " ");
    var frasi = tOrari.split(/[;\n]|,(?!\d)|\.\s|\(|\)|\bo(?:ppure)?\b(?=\s+(?:luned|marted|mercoled|gioved|venerd))|\be\b(?=\s+(?:luned|marted|mercoled|gioved|venerd))/);
    var tutti = [0, 1, 2, 3, 4];
    var regole = []; // { giorni: [...], finestre: [[da,a],...] }
    var ultimiGiorni = null, finestreGlobali = [], giorniGlobali = {};
    var esclusiGiorni = {};
    frasi.forEach(function (f) {
      f = f.trim(); if (!f) return;
      // giorni esclusi: "tranne il venerdì", "no lunedì", "non il mercoledì"
      var ex = /\b(?:tranne|escluso|eccetto|non(?: il| di)?|no)\s+(?:il\s+)?(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì])/g, mx;
      while ((mx = ex.exec(f))) { esclusiGiorni[indiceGiorno(mx[1])] = true; ris.letto.push("non di " + mx[1]); riconosciuto = true; }
      var fPulita = f.replace(ex, " ");
      var g = trovaGiorni(fPulita);
      var o = trovaOrari(fPulita);
      if (/\b(tutti i giorni|qualsiasi giorno|qualunque giorno|indifferente|sempre|ogni giorno|tutta la settimana|qualsiasi)\b/.test(fPulita)) { g = tutti.slice(); riconosciuto = true; ris.letto.push("tutti i giorni"); }
      if (g.length) { g.forEach(function (x) { giorniGlobali[x] = true; }); ultimiGiorni = g; riconosciuto = true; }
      if (o.length) riconosciuto = true;
      // gli orari valgono anche per i giorni appena prima rimasti senza orario:
      // "martedì e giovedì (8-12)", "lunedì o mercoledì dalle 14 alle 16"
      var riempi = function (fin) {
        for (var i = regole.length - 1; i >= 0 && regole[i].finestre === null; i--) regole[i].finestre = fin;
      };
      if (g.length && o.length) { riempi(o); regole.push({ giorni: g, finestre: o }); }
      else if (g.length) regole.push({ giorni: g, finestre: null });
      else if (o.length && regole.length) {
        if (regole[regole.length - 1].finestre === null) riempi(o);
        else regole[regole.length - 1].finestre = regole[regole.length - 1].finestre.concat(o); // "lunedì 10-12 (1B) e 12-14 (1C)"
      }
      else if (o.length) finestreGlobali = finestreGlobali.concat(o);
    });

    // costruzione della griglia giorni × fasce
    function fasciaOk(fa, finestre) {
      if (!finestre || !finestre.length) return true;
      return finestre.some(function (w) {
        if (w[2] === "mattina") return fa.inizio < MATTINA_FINE;
        if (w[2] === "pomeriggio") return fa.inizio >= POMERIGGIO_INIZIO;
        var fuori = Math.max(0, w[0] - fa.inizio) + Math.max(0, fa.fine - w[1]);
        return fuori <= TOLLERANZA;
      });
    }
    var griglia = [];
    for (var gi = 0; gi < 5; gi++) { griglia.push([]); for (var fi = 0; fi < nF; fi++) griglia[gi].push(false); }
    var conGiorni = regole.filter(function (r) { return r.giorni.length; });
    if (conGiorni.length) {
      conGiorni.forEach(function (r) {
        var fin = r.finestre || (finestreGlobali.length ? finestreGlobali : null);
        r.giorni.forEach(function (g) { P.fasce.forEach(function (fa, k) { if (fasciaOk(fa, fin)) griglia[g][k] = true; }); });
      });
    } else {
      // nessun giorno indicato: tutti i giorni, con gli eventuali orari
      tutti.forEach(function (g) { P.fasce.forEach(function (fa, k) { if (fasciaOk(fa, finestreGlobali)) griglia[g][k] = true; }); });
      if (!ris.date.length) ris.dubbi.push("Nessun giorno della settimana indicato: considerati tutti.");
    }
    Object.keys(esclusiGiorni).forEach(function (g) { if (griglia[g]) griglia[g] = griglia[g].map(function () { return false; }); });
    ris.griglia = griglia;

    // lettura di giorni/orari in chiaro
    var g2 = Object.keys(giorniGlobali).map(Number).sort();
    if (g2.length && g2.length < 5) ris.letto.push("giorni: " + g2.map(function (x) { return GIORNI[x]; }).join(", "));
    var ff = [];
    regole.forEach(function (r) { (r.finestre || []).forEach(function (w) { ff.push(w); }); });
    ff = ff.concat(finestreGlobali);
    if (ff.length) ris.letto.push("orari: " + ff.map(function (w) { return w[2] || (oraTesto(w[0]) + "–" + (w[1] >= 1440 ? "" : oraTesto(w[1]))); }).join(", "));

    // --- certezza ------------------------------------------------------
    var celle = 0; griglia.forEach(function (r) { r.forEach(function (x) { if (x) celle++; }); });
    if (!t) { ris.certezza = "bassa"; ris.dubbi.push("Campo vuoto."); }
    else if (!riconosciuto) { ris.certezza = "bassa"; ris.dubbi.push("Testo non interpretato: imposta i vincoli a mano."); }
    else if (celle === 0) { ris.certezza = "bassa"; ris.dubbi.push("Con questi vincoli non resta nessuna fascia libera."); }
    else {
      if (/\b(tranne|escluso|eccetto|solo|preferibilmente|possibilmente|meglio|se possibile|da concordare|da definire|da verificare|chiamare|sentire|contattare|telefonare|\?)\b|\?/.test(t)) {
        ris.certezza = "media"; ris.dubbi.push("Ci sono condizioni o preferenze: controlla l'interpretazione.");
      }
      if (/\b\d+\s*[ªa°]?\s*[a-z]\b.*\b(?:luned|marted|mercoled|gioved|venerd)|\(\s*\d[a-z]\s*\)/i.test(testo || "")) {
        ris.certezza = "media"; ris.dubbi.push("Orari diversi per classe: la griglia li unisce, controlla le singole classi.");
      }
      if (ris.date.length && !g2.length) { ris.certezza = "media"; ris.dubbi.push("Date precise indicate: il pianificatore userà solo quelle."); }
    }
    return ris;
  }

  /** Sintesi breve dei vincoli, es. "Mar, Gio mattina · dal 15 gen". */
  function sintesiVincoli(v, parametri) {
    if (!v) return "non indicate";
    var P = parametri || PARAMETRI, parti = [];
    var giorni = [], fasceTutte = {};
    v.griglia.forEach(function (r, g) { if (r.some(Boolean)) { giorni.push(g); r.forEach(function (x, k) { if (x) fasceTutte[k] = true; }); } });
    var stesseFasce = giorni.every(function (g) { return v.griglia[g].join() === v.griglia[giorni[0]].join(); });
    var nomeFasce = function (r) {
      var k = r.map(function (x, i) { return x ? i : -1; }).filter(function (i) { return i >= 0; });
      if (k.length === P.fasce.length) return "";
      var tutteMattina = k.every(function (i) { return P.fasce[i].inizio < MATTINA_FINE; }) && P.fasce.filter(function (f) { return f.inizio < MATTINA_FINE; }).length === k.length;
      var tuttePom = k.every(function (i) { return P.fasce[i].inizio >= POMERIGGIO_INIZIO; }) && P.fasce.filter(function (f) { return f.inizio >= POMERIGGIO_INIZIO; }).length === k.length;
      if (tutteMattina) return " mattina";
      if (tuttePom) return " pomeriggio";
      var tratti = []; // fasce consecutive unite: 8–12, 14–16
      k.forEach(function (i) {
        var u = tratti[tratti.length - 1];
        if (u && u.fine === P.fasce[i].inizio) u.fine = P.fasce[i].fine;
        else tratti.push({ inizio: P.fasce[i].inizio, fine: P.fasce[i].fine });
      });
      return " " + tratti.map(fasciaTesto).join(", ");
    };
    if (v.date && v.date.length) parti.push(v.date.map(dataBreve).join(", "));
    else if (!giorni.length) parti.push("nessuna fascia");
    else if (stesseFasce) parti.push((giorni.length === 5 ? "tutti i giorni" : giorni.map(function (g) { return GIORNI[g]; }).join(", ")) + nomeFasce(v.griglia[giorni[0]]));
    else parti.push(giorni.map(function (g) { return GIORNI[g] + nomeFasce(v.griglia[g]); }).join(", "));
    if (v.mesi && v.mesi.length) parti.push(v.mesi.map(function (x) { return NOMI_MESI[x]; }).join("/"));
    if (v.mesiEsclusi && v.mesiEsclusi.length) parti.push("no " + v.mesiEsclusi.map(function (x) { return NOMI_MESI[x]; }).join("/"));
    if (v.dal) parti.push("dal " + dataBreve(v.dal).replace(/^\w+ /, ""));
    if (v.al) parti.push("fino al " + dataBreve(v.al).replace(/^\w+ /, ""));
    return parti.join(" · ");
  }

  /** Il giorno "data" e la fascia "k" vanno bene per questi vincoli? */
  function compatibile(v, data, k) {
    var g = giornoSett(data);
    if (g > 4) return false;
    if (v.date && v.date.length) return v.date.indexOf(data) >= 0 && !!(v.griglia[g] && v.griglia[g][k]);
    if (!v.griglia[g] || !v.griglia[g][k]) return false;
    if (v.dal && data < v.dal) return false;
    if (v.al && data > v.al) return false;
    var mese = daIso(data).getMonth();
    if (v.mesi && v.mesi.length && v.mesi.indexOf(mese) < 0) return false;
    if (v.mesiEsclusi && v.mesiEsclusi.indexOf(mese) >= 0) return false;
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Catalogo laboratori (dal sito: laboratori-dati.js)                  */
  /* ------------------------------------------------------------------ */
  function catalogo(labs, fisica, classi) {
    return {
      labs: (labs || []).map(function (l) { return { titolo: l.titolo, perChi: l.perChi || [], visibile: l.visibile !== false }; }),
      fisica: (fisica || []).map(function (p) { return typeof p === "string" ? p : p.titolo; }),
      classi: classi || {}
    };
  }

  /* ------------------------------------------------------------------ */
  /* Preparazione dei dati letti dal foglio                              */
  /* ------------------------------------------------------------------ */
  function testo(v) { return v == null ? "" : String(v).replace(/^'/, "").trim(); }
  function chiaveScuola(s) {
    return normalizza(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(scuola|primaria|secondaria|di|primo|1°|grado|ic|i\.c\.|istituto|comprensivo|plesso|sc\.?|ss1g|s\.s\.|statale)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  /**
   * dati = { richieste: [{riga, codice, dataInvio, stato, scuola, comune, ordine, nClassi, totAlunni,
   *                       referente, email, telefono, giornate, note, riepilogo, privacy, noteInterne}],
   *          classi: [{riga, codice, scuola, comune, ordine, classe, alunni, percorso, lab1, lab2, lab3,
   *                    consiglio, stato, dataPrevista, divulgatori, note}] }
   * Collega le classi alle richieste e assegna a ogni classe una chiave stabile.
   */
  function prepara(dati) {
    var perCodice = {};
    var richieste = (dati.richieste || []).filter(function (r) { return testo(r.codice); }).map(function (r) {
      var x = {};
      Object.keys(r).forEach(function (k) { x[k] = typeof r[k] === "string" ? testo(r[k]) : r[k]; });
      x.classi = [];
      perCodice[x.codice] = x;
      return x;
    });
    var orfane = [];
    var visti = {};
    (dati.classi || []).forEach(function (c) {
      var x = {};
      Object.keys(c).forEach(function (k) { x[k] = typeof c[k] === "string" ? testo(c[k]) : c[k]; });
      var base = x.codice + "|" + x.classe + "|" + x.percorso;
      visti[base] = (visti[base] || 0) + 1;
      x.chiave = visti[base] > 1 ? base + "#" + visti[base] : base;
      x.labs = [x.lab1, x.lab2, x.lab3].filter(Boolean);
      var r = perCodice[x.codice];
      if (r) r.classi.push(x); else orfane.push(x);
    });
    return { richieste: richieste, orfane: orfane };
  }

  /** Anno scolastico di una richiesta (dalla data di invio). */
  function annoRichiesta(r) {
    var d = r.dataInvio ? new Date(r.dataInvio) : new Date();
    if (isNaN(d)) d = new Date();
    return annoScolastico(d);
  }

  /** Vincoli effettivi: quelli corretti a mano (stato salvato) oppure quelli interpretati dal testo. */
  function vincoli(r, stato, parametri) {
    var man = stato && stato.vincoli && stato.vincoli[r.codice];
    var auto = interpreta(r.giornate, annoRichiesta(r), parametri);
    if (man && man.griglia) {
      return { griglia: man.griglia, dal: man.dal || "", al: man.al || "", mesi: man.mesi || null, mesiEsclusi: man.mesiEsclusi || [],
        date: man.date || [], certezza: "manuale", letto: auto.letto, dubbi: [], manuale: true, nota: man.nota || "" };
    }
    return auto;
  }

  /* ------------------------------------------------------------------ */
  /* 2. Crosscheck                                                       */
  /* ------------------------------------------------------------------ */
  var DOMINI_PERSONALI = /@(gmail|googlemail|libero|hotmail|outlook|live|yahoo|icloud|me|alice|tin|tiscali|virgilio|fastwebnet|email|inwind|msn)\./i;
  var STATI_ESCLUSI_RICHIESTA = ["Non possibile"];
  var STATI_ESCLUSI_CLASSE = ["Annullata", "Svolta"];

  /**
   * Controlli su una richiesta. tutte = tutte le richieste (per i doppioni).
   * Restituisce [{ livello: "errore"|"avviso"|"info", testo, campo }]
   */
  function controlla(r, tutte, cat, stato, parametri) {
    var P = parametri || PARAMETRI;
    var out = [];
    function add(l, t, campo) { out.push({ livello: l, testo: t, campo: campo || "" }); }

    // contatti
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email || "")) add("errore", "Email non valida: " + (r.email || "vuota") + ".", "email");
    else if (DOMINI_PERSONALI.test(r.email)) add("avviso", "Email personale, non della scuola: " + r.email + ".", "email");
    var cifre = String(r.telefono || "").replace(/\D/g, "");
    if (cifre.length < 9 || cifre.length > 13) add("avviso", "Telefono sospetto: " + (r.telefono || "vuoto") + ".", "telefono");
    if (!/\s/.test(String(r.referente || "").trim())) add("info", "Referente senza cognome: " + (r.referente || "vuoto") + ".", "referente");
    if (r.privacy !== "Acconsento") add("errore", "Manca il consenso privacy.", "privacy");

    // coerenza Richieste ↔ Classi
    var cl = r.classi || [];
    if (!cl.length) add("errore", "Nessuna classe collegata nella scheda Classi.", "classi");
    if (r.nClassi !== "" && r.nClassi != null && +r.nClassi !== cl.length) add("avviso", "N. classi " + r.nClassi + " in Richieste, " + cl.length + " in Classi.", "classi");
    var somma = 0, conNumero = 0;
    cl.forEach(function (c) { var n = parseInt(c.alunni, 10); if (!isNaN(n)) { somma += n; conNumero++; } });
    if (r.totAlunni !== "" && r.totAlunni != null && +r.totAlunni !== somma) add("avviso", "Tot. studenti " + r.totAlunni + " in Richieste, somma classi " + somma + ".", "classi");
    if (cl.length && conNumero < cl.length) add("info", (cl.length - conNumero) + " classi senza numero di studenti.", "classi");

    // classi
    var gruppi = cat && cat.classi ? cat.classi[r.ordine] : null;
    var vistiClasse = {};
    cl.forEach(function (c) {
      var nome = c.classe || "?";
      var anno = (nome.match(/^(\d)/) || [])[1];
      if (!anno) add("avviso", "Classe \"" + nome + "\": formato non riconosciuto.", "classi");
      var gr = gruppi ? gruppi.filter(function (g) { return g.valore.charAt(0) === anno; })[0] : null;
      if (gruppi && anno && !gr) add("errore", "Classe " + nome + " non prevista per " + (r.ordine || "questo ordine") + ".", "classi");
      var n = parseInt(c.alunni, 10);
      if (!isNaN(n) && (n < 8 || n > 30)) add("avviso", "Classe " + nome + ": " + n + " studenti, numero insolito.", "classi");
      var k = nome + "|" + c.percorso;
      if (vistiClasse[k]) add("avviso", "Classe " + nome + " (" + c.percorso + ") ripetuta nella richiesta.", "classi");
      vistiClasse[k] = true;
      if (r.ordine === "Primaria" && c.percorso && c.percorso !== "Biologia") add("errore", "Classe " + nome + ": percorso " + c.percorso + " non previsto per la primaria.", "classi");
      if (c.consiglio !== "Sì" && cat) {
        if (c.percorso === "Fisica") {
          if (!c.lab1) add("avviso", "Classe " + nome + ": percorso di fisica non indicato.", "classi");
          else if (cat.fisica.indexOf(c.lab1) < 0) add("avviso", "Classe " + nome + ": \"" + c.lab1 + "\" non è nel catalogo di fisica.", "classi");
        } else {
          if (c.labs.length < 3) add("info", "Classe " + nome + ": " + c.labs.length + " laboratori scelti su 3.", "classi");
          var doppi = {};
          c.labs.forEach(function (l) {
            if (doppi[l]) add("avviso", "Classe " + nome + ": \"" + l + "\" scelto due volte.", "classi");
            doppi[l] = true;
            var item = cat.labs.filter(function (x) { return x.titolo === l; })[0];
            if (!item) add("avviso", "Classe " + nome + ": \"" + l + "\" non è nel catalogo.", "classi");
            else if (gr && item.perChi.indexOf(gr.gruppo) < 0) add("avviso", "Classe " + nome + ": \"" + l + "\" non è previsto per questa classe.", "classi");
            else if (!item.visibile) add("info", "Classe " + nome + ": \"" + l + "\" oggi è nascosto dal catalogo.", "classi");
          });
        }
      }
      if (c.dataPrevista) {
        var dp = c.dataPrevista;
        if (giornoSett(dp) > 4) add("avviso", "Classe " + nome + ": data prevista " + dataBreve(dp) + " nel fine settimana.", "classi");
        if (STATI_ESCLUSI_CLASSE.indexOf(c.stato) < 0 && c.stato !== "Data fissata") add("info", "Classe " + nome + ": ha una data prevista ma stato \"" + c.stato + "\".", "classi");
      } else if (c.stato === "Data fissata") add("avviso", "Classe " + nome + ": stato \"Data fissata\" ma senza data prevista.", "classi");
    });

    // disponibilità
    var v = vincoli(r, stato, P);
    if (v.certezza === "bassa") add("errore", "Disponibilità da verificare: " + (v.dubbi[0] || "non interpretata") + "", "giornate");
    else if (v.certezza === "media") add("avviso", "Disponibilità: " + v.dubbi.join(" "), "giornate");
    if (P.periodo && (P.periodo.dal || P.periodo.al)) {
      if (v.al && P.periodo.dal && v.al < P.periodo.dal) add("avviso", "Disponibile solo prima dell'inizio delle attività.", "giornate");
      if (v.dal && P.periodo.al && v.dal > P.periodo.al) add("avviso", "Disponibile solo dopo la fine delle attività.", "giornate");
    }
    if (/\b(luned|marted|mercoled|gioved|venerd|mattin|pomerigg|dalle|ore)\w*/i.test(r.note || "")) add("info", "Le note contengono orari o giorni: leggile insieme alle disponibilità.", "note");

    // doppioni con altre richieste
    var ks = chiaveScuola(r.scuola) + "|" + chiaveScuola(r.comune);
    (tutte || []).forEach(function (a) {
      if (a === r || a.codice === r.codice) return;
      if (STATI_ESCLUSI_RICHIESTA.indexOf(a.stato) >= 0) return;
      var stessaScuola = chiaveScuola(a.scuola) + "|" + chiaveScuola(a.comune) === ks && chiaveScuola(r.scuola);
      var stessaMail = String(a.email || "").toLowerCase() === String(r.email || "").toLowerCase() && r.email;
      if (!stessaScuola && !stessaMail) return;
      var comuni = (a.classi || []).filter(function (c) { return vistiClasse[c.classe + "|" + c.percorso]; }).map(function (c) { return c.classe; });
      if (stessaScuola && comuni.length) add("errore", "Possibile doppione di " + a.codice + ": stesse classi (" + comuni.join(", ") + ").", "doppioni");
      else add("info", "Stessa " + (stessaScuola ? "scuola" : "email") + " anche in " + a.codice + " (" + a.scuola + ").", "doppioni");
    });

    // tempi di risposta
    if (r.stato === "Nuova" && r.dataInvio) {
      var giorni = Math.floor((Date.now() - new Date(r.dataInvio).getTime()) / 86400000);
      if (giorni >= 7) add("avviso", "Richiesta \"Nuova\" da " + giorni + " giorni: nessun contatto registrato.", "stato");
    }
    var ordineLivello = { errore: 0, avviso: 1, info: 2 };
    return out.sort(function (a, b) { return ordineLivello[a.livello] - ordineLivello[b.livello]; });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Riassunto                                                        */
  /* ------------------------------------------------------------------ */
  function riassunto(r, avvisi, stato, parametri) {
    var cl = r.classi || [];
    var alunni = cl.reduce(function (s, c) { var n = parseInt(c.alunni, 10); return s + (isNaN(n) ? 0 : n); }, 0);
    var perc = {};
    cl.forEach(function (c) { perc[c.percorso || "?"] = (perc[c.percorso || "?"] || 0) + 1; });
    var anni = {};
    cl.forEach(function (c) { var a = (c.classe || "").match(/^\d/); if (a) anni[a[0] + "ª"] = (anni[a[0] + "ª"] || 0) + 1; });
    var ord = r.ordine === "Primaria" ? "primaria" : r.ordine ? "secondaria" : "";
    var v = vincoli(r, stato, parametri);
    var errori = (avvisi || []).filter(function (a) { return a.livello === "errore"; }).length;
    var warn = (avvisi || []).filter(function (a) { return a.livello === "avviso"; }).length;
    var s = cl.length + (cl.length === 1 ? " classe " : " classi ") + ord +
      " (" + Object.keys(anni).sort().map(function (k) { return anni[k] > 1 ? anni[k] + "×" + k : k; }).join(", ") + ")" +
      (alunni ? ", " + alunni + " studenti" : "") +
      (Object.keys(perc).length > 1 || perc.Fisica ? "; " + Object.keys(perc).map(function (p) { return p + " " + perc[p]; }).join(", ") : "") +
      ". Disponibilità: " + sintesiVincoli(v, parametri) + "." +
      (errori ? " " + errori + (errori === 1 ? " problema" : " problemi") + "." : warn ? " " + warn + (warn === 1 ? " avviso" : " avvisi") + "." : " Dati coerenti.");
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* 4. Pianificatore                                                    */
  /* ------------------------------------------------------------------ */
  /** Giorni di attività negli intervalli: lun-ven, senza feste e chiusure. */
  function giorniAttivita(intervalli, parametri) {
    var P = parametri || PARAMETRI;
    var chiusi = {};
    (P.chiusure || []).forEach(function (d) { chiusi[d] = true; });
    var out = {}, anni = {};
    (intervalli || []).forEach(function (iv) {
      if (!iv || !iv.dal || !iv.al || iv.al < iv.dal) return;
      for (var d = iv.dal; d <= iv.al; d = aggiungiGiorni(d, 1)) {
        anni[d.slice(0, 4)] = true;
        if (giornoSett(d) <= 4) out[d] = true;
      }
    });
    Object.keys(anni).forEach(function (y) { festivi(+y).forEach(function (d) { chiusi[d] = true; }); });
    return Object.keys(out).filter(function (d) { return !chiusi[d]; }).sort();
  }

  // generatore pseudo-casuale riproducibile (stessi dati → stessa proposta)
  function rng(seme) { var s = seme >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /** Laboratori che occupano un kit (per il controllo "un kit per esperimento"). */
  function kitDi(c) {
    if (c.consiglio === "Sì") return []; // li sceglie il team: nessun vincolo noto
    return c.percorso === "Fisica" ? (c.lab1 ? ["F:" + c.lab1] : []) : c.labs.slice(0, 3);
  }

  /**
   * opzioni = {
   *   intervalli: [{dal, al}, ...],           // periodi in cui pianificare (anche a spezzoni)
   *   richieste: [...] (da prepara()),         // tutte le richieste
   *   codici: [...] | null,                    // richieste da includere (null = tutte quelle pianificabili)
   *   stato: {...},                            // vincoli manuali e date già accettate (fissate)
   *   parametri: {...}
   * }
   * Restituisce { assegnazioni: [{chiave, codice, data, fascia}], nonAssegnate: [{chiave, codice, motivo}],
   *               giorni: [...], statistiche: {...} }
   */
  function pianifica(opzioni) {
    var P = Object.assign({}, PARAMETRI, opzioni.parametri || {});
    var nF = P.fasce.length;
    var stato = opzioni.stato || {};
    var fissate = stato.fissate || {};
    var giorni = giorniAttivita(opzioni.intervalli, P);
    var richieste = (opzioni.richieste || []).filter(function (r) {
      if (STATI_ESCLUSI_RICHIESTA.indexOf(r.stato) >= 0) return false;
      return !opzioni.codici || opzioni.codici.indexOf(r.codice) >= 0;
    });

    // occupazione già esistente: date accettate in precedenza + "Data prevista" del foglio
    var base = { slot: {}, giorno: {}, scuole: {}, kit: {} }; // slot[d|k] = n, giorno[d] = n, scuole[d] = {codice:1}, kit[d|k] = {lab:1}
    function occupa(occ, d, k, c, codice) {
      var s = d + "|" + k;
      occ.slot[s] = (occ.slot[s] || 0) + 1;
      occ.giorno[d] = (occ.giorno[d] || 0) + 1;
      (occ.scuole[d] = occ.scuole[d] || {})[codice] = 1;
      var kk = occ.kit[s] = occ.kit[s] || {};
      kitDi(c).forEach(function (l) { kk[l] = (kk[l] || 0) + 1; });
    }
    var tutteLeClassi = {};
    (opzioni.richieste || []).forEach(function (r) { r.classi.forEach(function (c) { tutteLeClassi[c.chiave] = { c: c, r: r }; }); });
    Object.keys(fissate).forEach(function (ch) {
      var f = fissate[ch], x = tutteLeClassi[ch];
      if (f && f.data && x) occupa(base, f.data, f.fascia, x.c, x.r.codice);
    });
    (opzioni.richieste || []).forEach(function (r) {
      r.classi.forEach(function (c) {
        if (c.dataPrevista && !fissate[c.chiave] && STATI_ESCLUSI_CLASSE.indexOf(c.stato) < 0) {
          base.giorno[c.dataPrevista] = (base.giorno[c.dataPrevista] || 0) + 1;
          (base.scuole[c.dataPrevista] = base.scuole[c.dataPrevista] || {})[r.codice] = 1;
        }
      });
    });

    // classi da pianificare e giorni/fasce possibili per ciascuna richiesta
    var lavori = [];
    var nonAssegnate = [];
    // doppioni: stessa scuola, stessa classe e percorso in una richiesta precedente → si tiene la prima
    var giaViste = {};
    (opzioni.richieste || []).slice().sort(function (a, b) { return String(a.dataInvio || "").localeCompare(String(b.dataInvio || "")); })
      .forEach(function (r) {
        if (STATI_ESCLUSI_RICHIESTA.indexOf(r.stato) >= 0) return;
        r.classi.forEach(function (c) {
          var k = chiaveScuola(r.scuola) + "|" + chiaveScuola(r.comune) + "|" + c.classe + "|" + c.percorso;
          if (!giaViste[k]) giaViste[k] = r.codice;
        });
      });
    richieste.forEach(function (r) {
      var v = vincoli(r, stato, P);
      var daFare = r.classi.filter(function (c) {
        return !fissate[c.chiave] && !c.dataPrevista && STATI_ESCLUSI_CLASSE.indexOf(c.stato) < 0;
      });
      daFare = daFare.filter(function (c) {
        var prima = giaViste[chiaveScuola(r.scuola) + "|" + chiaveScuola(r.comune) + "|" + c.classe + "|" + c.percorso];
        if (prima && prima !== r.codice) { nonAssegnate.push({ chiave: c.chiave, codice: r.codice, motivo: "Doppione della stessa classe in " + prima + ": esclusa." }); return false; }
        return true;
      });
      if (!daFare.length) return;
      if (v.certezza === "bassa") {
        daFare.forEach(function (c) { nonAssegnate.push({ chiave: c.chiave, codice: r.codice, motivo: "Disponibilità da verificare: correggila nella scheda della richiesta." }); });
        return;
      }
      var possibili = {}; var nPoss = 0;
      giorni.forEach(function (d) {
        var ks = [];
        for (var k = 0; k < nF; k++) if (compatibile(v, d, k)) ks.push(k);
        if (ks.length) { possibili[d] = ks; nPoss += ks.length; }
      });
      if (!nPoss) {
        daFare.forEach(function (c) { nonAssegnate.push({ chiave: c.chiave, codice: r.codice, motivo: "Nessun giorno compatibile con le disponibilità negli intervalli scelti." }); });
        return;
      }
      lavori.push({ r: r, classi: daFare, possibili: possibili, nPoss: nPoss, giorni: Object.keys(possibili).sort() });
    });

    function clona(o) { return { slot: Object.assign({}, o.slot), giorno: Object.assign({}, o.giorno),
      scuole: Object.keys(o.scuole).reduce(function (a, d) { a[d] = Object.assign({}, o.scuole[d]); return a; }, {}),
      kit: Object.keys(o.kit).reduce(function (a, s) { a[s] = Object.assign({}, o.kit[s]); return a; }, {}) }; }

    function puoMettere(occ, d, k, c, codice) {
      var s = d + "|" + k;
      if ((occ.slot[s] || 0) >= P.maxParallelo) return false;
      if ((occ.giorno[d] || 0) >= P.maxClassiGiorno) return false;
      var sc = occ.scuole[d] || {};
      if (!sc[codice] && Object.keys(sc).length >= P.maxScuoleGiorno) return false;
      if (P.kitUnico) {
        var kk = occ.kit[s] || {};
        if (kitDi(c).some(function (l) { return kk[l]; })) return false;
      }
      return true;
    }

    /** Prova a mettere le classi rimaste di un lavoro nel giorno d: prima una per fascia, poi in parallelo. */
    function provaGiorno(occ, lav, d, rimaste) {
      var ks = lav.possibili[d];
      var tmp = clona(occ), messe = [];
      var restano = rimaste.slice();
      for (var giro = 0; giro < P.maxParallelo && restano.length; giro++) {
        ks.forEach(function (k) {
          if (!restano.length) return;
          var s = d + "|" + k;
          if ((tmp.slot[s] || 0) > giro) return; // in questo giro, al massimo una nuova classe per fascia
          for (var i = 0; i < restano.length; i++) {
            if (puoMettere(tmp, d, k, restano[i], lav.r.codice)) {
              occupa(tmp, d, k, restano[i], lav.r.codice);
              messe.push({ c: restano[i], k: k });
              restano.splice(i, 1);
              break;
            }
          }
        });
      }
      return { messe: messe, occ: tmp, restano: restano };
    }

    function soluzione(rand, rumore) {
      var occ = clona(base);
      var ass = [], non = [];
      var ordine = lavori.slice().sort(function (a, b) {
        // prima le richieste più vincolate (meno fasce possibili per classe), poi le più vecchie
        var va = a.nPoss / a.classi.length, vb = b.nPoss / b.classi.length;
        if (rumore) { va *= 0.7 + rand() * 0.6; vb *= 0.7 + rand() * 0.6; }
        if (va !== vb) return va - vb;
        return String(a.r.dataInvio || "").localeCompare(String(b.r.dataInvio || ""));
      });
      var visite = 0;
      ordine.forEach(function (lav) {
        var rimaste = lav.classi.slice();
        var giorniUsati = [];
        while (rimaste.length) {
          var migliore = null;
          lav.giorni.forEach(function (d) {
            if (giorniUsati.indexOf(d) >= 0) return;
            var p = provaGiorno(occ, lav, d, rimaste);
            if (!p.messe.length) return;
            // punteggio: più classi nello stesso giorno, giorni meno carichi, un po' di caso
            var carico = occ.giorno[d] || 0;
            var vicino = giorniUsati.some(function (u) { return Math.abs(daIso(u) - daIso(d)) <= 7 * 86400000; }) ? 3 : 0;
            // la scuola ha già un'uscita quel giorno (data nel foglio o accettata prima): meglio accodarsi
            var giaLi = (base.scuole[d] || {})[lav.r.codice] ? 60 : 0;
            var punti = p.messe.length * 100 - carico * 4 + vicino + giaLi + (rumore ? rand() * 8 : 0) - lav.giorni.indexOf(d) * 0.01;
            if (!migliore || punti > migliore.punti) migliore = { punti: punti, d: d, p: p };
          });
          if (!migliore) break;
          occ = migliore.p.occ;
          giorniUsati.push(migliore.d);
          visite++;
          migliore.p.messe.forEach(function (m) { ass.push({ chiave: m.c.chiave, codice: lav.r.codice, data: migliore.d, fascia: m.k }); });
          rimaste = migliore.p.restano;
        }
        rimaste.forEach(function (c) { non.push({ chiave: c.chiave, codice: lav.r.codice, motivo: "Giorni compatibili già pieni (capacità, scuole al giorno o kit)." }); });
      });
      // punteggio: classi piazzate, poche visite per scuola, carico equilibrato
      var carichi = {}; ass.forEach(function (a) { carichi[a.data] = (carichi[a.data] || 0) + 1; });
      var vals = Object.keys(carichi).map(function (d) { return carichi[d]; });
      var media = vals.reduce(function (s, x) { return s + x; }, 0) / (vals.length || 1);
      var varianza = vals.reduce(function (s, x) { return s + (x - media) * (x - media); }, 0) / (vals.length || 1);
      return { ass: ass, non: non, punteggio: ass.length * 1000 - visite * 20 - varianza * 3, visite: visite };
    }

    var rand = rng(opzioni.seme || 20261127);
    var migliore = soluzione(rand, false);
    var n = Math.max(0, P.tentativi | 0);
    for (var i = 0; i < n; i++) {
      var s = soluzione(rand, true);
      if (s.punteggio > migliore.punteggio) migliore = s;
    }

    var usati = {}; migliore.ass.forEach(function (a) { usati[a.data] = true; });
    var daPianificare = lavori.reduce(function (s, l) { return s + l.classi.length; }, 0) + nonAssegnate.length;
    migliore.ass.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : a.fascia - b.fascia || a.codice.localeCompare(b.codice); });
    return {
      assegnazioni: migliore.ass,
      nonAssegnate: nonAssegnate.concat(migliore.non),
      giorni: giorni,
      statistiche: {
        classi: daPianificare, assegnate: migliore.ass.length, visite: migliore.visite,
        giorniUsati: Object.keys(usati).length, giorniDisponibili: giorni.length, scuole: lavori.length
      },
      parametri: P
    };
  }

  /** Controlla un'assegnazione modificata a mano: restituisce i problemi (lista di stringhe). */
  function verificaAssegnazione(a, assegnazioni, richieste, stato, parametri) {
    var P = Object.assign({}, PARAMETRI, parametri || {});
    var r = richieste.filter(function (x) { return x.codice === a.codice; })[0];
    if (!r) return ["Richiesta non trovata."];
    var c = r.classi.filter(function (x) { return x.chiave === a.chiave; })[0];
    var out = [];
    if (giornoSett(a.data) > 4) out.push("Giorno nel fine settimana.");
    var v = vincoli(r, stato, P);
    if (!compatibile(v, a.data, a.fascia)) out.push("Fuori dalle disponibilità della scuola.");
    var chiusi = festivi(+a.data.slice(0, 4)).concat(P.chiusure || []);
    if (chiusi.indexOf(a.data) >= 0) out.push("Giorno festivo o di chiusura.");
    var stessaFascia = assegnazioni.filter(function (x) { return x !== a && x.data === a.data && x.fascia === a.fascia; });
    if (stessaFascia.length + 1 > P.maxParallelo) out.push("Più di " + P.maxParallelo + " classi nella stessa fascia.");
    var stessoGiorno = assegnazioni.filter(function (x) { return x !== a && x.data === a.data; });
    if (stessoGiorno.length + 1 > P.maxClassiGiorno) out.push("Più di " + P.maxClassiGiorno + " classi nel giorno.");
    var scuole = {}; stessoGiorno.forEach(function (x) { scuole[x.codice] = 1; }); scuole[a.codice] = 1;
    if (Object.keys(scuole).length > P.maxScuoleGiorno) out.push("Più di " + P.maxScuoleGiorno + " scuole nel giorno.");
    if (P.kitUnico && c) {
      var mieKit = kitDi(c);
      stessaFascia.forEach(function (x) {
        var rx = richieste.filter(function (y) { return y.codice === x.codice; })[0];
        var cx = rx && rx.classi.filter(function (y) { return y.chiave === x.chiave; })[0];
        if (!cx) return;
        var comuni = kitDi(cx).filter(function (l) { return mieKit.indexOf(l) >= 0; });
        if (comuni.length) out.push("Stesso kit in parallelo con " + cx.classe + ": " + comuni.join(", ").replace(/F:/g, "") + ".");
      });
    }
    return out;
  }

  return {
    GIORNI: GIORNI, PARAMETRI: PARAMETRI, NOMI_MESI: NOMI_MESI,
    interpreta: interpreta, sintesiVincoli: sintesiVincoli, compatibile: compatibile, vincoli: vincoli,
    catalogo: catalogo, prepara: prepara, controlla: controlla, riassunto: riassunto,
    pianifica: pianifica, verificaAssegnazione: verificaAssegnazione, giorniAttivita: giorniAttivita,
    festivi: festivi, annoScolastico: annoScolastico, annoRichiesta: annoRichiesta,
    iso: iso, daIso: daIso, dataBreve: dataBreve, giornoSett: giornoSett, aggiungiGiorni: aggiungiGiorni,
    fasciaTesto: fasciaTesto, oraTesto: oraTesto, chiaveScuola: chiaveScuola, kitDi: kitDi,
    STATI_ESCLUSI_RICHIESTA: STATI_ESCLUSI_RICHIESTA, STATI_ESCLUSI_CLASSE: STATI_ESCLUSI_CLASSE
  };
});
