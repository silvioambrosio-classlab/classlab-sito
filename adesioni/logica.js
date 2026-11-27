/* =====================================================================
   CLASSLAB · ADESIONI — logica (senza interfaccia)
   ---------------------------------------------------------------------
   1. interpreta()   testo "Giornate disponibili" → vincoli per giorno
                     (giorni possibili, orari indicati, quanti turni da 2 ore)
   2. controlla()    crosscheck di ogni richiesta → avvisi
   3. riassunto()    riassunto breve di ogni richiesta (max ~30 parole)
   4. pianifica()    dati i periodi, sceglie i giorni e, per ogni scuola,
                     quali classi vanno IN LINEA (turni uno dopo l'altro)
                     e quali IN PARALLELO (stesso turno).
   Niente fasce orarie fisse: ogni classe dura 2 ore; gli orari veri
   della scuola si aggiungeranno più avanti da altri dati.
   Funziona nel browser (window.Adesioni) e in Node (require) per i test.
   Nessuna scrittura sui fogli.
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
  var DURATA = 120;          // minuti per classe (fissa: 2 ore)
  // Regole fisse del calcolo (scelte di Silvio, 27/11/2026), in quest'ordine:
  //  1. meno giornate possibili nella stessa scuola;
  //  2. meno operatori possibili;
  //  3. al massimo 3 interventi (classi) per operatore al giorno;
  //  4. orari e giorni indicati dalle scuole; un kit per esperimento.
  var MAX_INTERVENTI = 3;
  var PARAMETRI = {
    turniGiorno: 3,          // turni da 2 ore in una giornata, se la scuola non indica orari (8–14)
    kitUnico: true,          // un kit per esperimento: nello stesso turno nessun laboratorio ripetuto
    periodo: { dal: "", al: "" }, // periodo della campagna (solo per gli avvisi)
    chiusure: [],            // date di chiusura delle scuole (oltre alle feste nazionali), "AAAA-MM-GG"
    tentativi: 300           // ricerche casuali del pianificatore (più = migliore, più lento)
  };
  // Giornata scolastica "tipo", usata solo per contare i turni quando il testo dice
  // "mattina", "pomeriggio", "dopo le 11"… (gli orari precisi arriveranno da altri dati)
  var GIORNATA = { inizio: 8 * 60, fine: 16 * 60 };
  var MATTINA = [8 * 60, 13 * 60];
  var POMERIGGIO = [14 * 60, 16 * 60];
  var TOLLERANZA = 30; // minuti: 13:50–15:50 conta come un turno da 2 ore

  var MESI = { gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5, luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11 };
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
  function turnoTesto(k) { return (k + 1) + "° turno"; }

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
  /* Orari → turni                                                       */
  /* ------------------------------------------------------------------ */
  /** Unisce finestre sovrapposte o attaccate: [[8,10],[10,12]] → [[8,12]]. */
  function unisci(fin) {
    var s = (fin || []).map(function (w) { return [w[0], w[1]]; }).sort(function (a, b) { return a[0] - b[0]; }), out = [];
    s.forEach(function (w) { var u = out[out.length - 1]; if (u && w[0] <= u[1]) u[1] = Math.max(u[1], w[1]); else out.push(w); });
    return out;
  }
  /** Quanti turni da 2 ore entrano nelle finestre (dentro la giornata scolastica tipo). */
  function turniDa(fin) {
    return unisci(fin).reduce(function (s, w) {
      var da = Math.max(w[0], GIORNATA.inizio), a = Math.min(w[1], w[1] >= 24 * 60 ? GIORNATA.fine : w[1]);
      return s + Math.max(0, Math.floor((a - da + TOLLERANZA) / DURATA));
    }, 0);
  }
  /** "8–12, 14–16", "dalle 11". */
  function orariTesto(fin) {
    return unisci(fin).map(function (w) {
      if (w[1] >= 24 * 60) return "dalle " + oraTesto(w[0]);
      if (w[0] <= 0) return "entro le " + oraTesto(w[1]);
      return oraTesto(w[0]) + "–" + oraTesto(w[1]);
    }).join(", ");
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
      if (/\bmattin[ao]\b|\bmattinata\b/.test(t)) out.push(MATTINA.slice());
      if (/\bpomeriggi[o]?\b/.test(t)) out.push(POMERIGGIO.slice());
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

  /** Giorno vuoto: non disponibile. */
  function giornoVuoto() { return { on: false, finestre: null, turni: null }; }

  /**
   * Interpreta il testo "Giornate disponibili".
   * Restituisce { giorni: [5 × {on, finestre: [[da,a]] | null, turni: n | null}], dal, al, mesi, mesiEsclusi, date,
   *               certezza: "alta"|"media"|"bassa", letto: [...], dubbi: [...] }
   *   finestre null = orari non indicati; turni = turni da 2 ore che entrano negli orari (null = non indicati)
   * annoAS = anno di inizio dell'anno scolastico (es. 2026 per il 2026/27).
   */
  function interpreta(testo, annoAS) {
    var t = normalizza(testo);
    var ris = { giorni: [], dal: "", al: "", mesi: null, mesiEsclusi: [], date: [], certezza: "alta", letto: [], dubbi: [] };
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
      var q = m[1] || m[2];
      var d = inizioMese(m[3], q === "metà" || q === "meta" ? "metà" : q);
      if (/^dopo/.test(m[0]) && m[2]) d = aggiungiGiorni(d, 1);
      if (!ris.dal || d > ris.dal) ris.dal = d;
      ris.letto.push("dal " + dataBreve(d)); riconosciuto = true;
    }
    // "entro fine febbraio", "fino a metà marzo", "fino al 20 febbraio"
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
    // mesi indicati ("in febbraio/marzo"): solo se non già letti come dal/al
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
    var tOrari = t.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " ")
      .replace(new RegExp("\\b\\d{1,2}\\s*(?:-|al)\\s*\\d{1,2}\\s+" + mesiRe, "g"), " ")
      .replace(new RegExp("\\b\\d{1,2}\\s+" + mesiRe, "g"), " ");
    var frasi = tOrari.split(/[;\n]|,(?!\d)|\.\s|\(|\)|\bo(?:ppure)?\b(?=\s+(?:luned|marted|mercoled|gioved|venerd))|\be\b(?=\s+(?:luned|marted|mercoled|gioved|venerd))/);
    var tutti = [0, 1, 2, 3, 4];
    var regole = []; // { giorni: [...], finestre: [[da,a],...] | null }
    var finestreGlobali = [], giorniGlobali = {};
    var esclusiGiorni = {};
    frasi.forEach(function (f) {
      f = f.trim(); if (!f) return;
      // giorni esclusi: "tranne il venerdì", "no lunedì", "non il mercoledì"
      var ex = /\b(?:tranne|escluso|eccetto|non(?: il| di)?|no)\s+(?:il\s+)?(lunedi|martedi|mercoledi|giovedi|venerdi)/g, mx;
      while ((mx = ex.exec(f))) { esclusiGiorni[indiceGiorno(mx[1])] = true; ris.letto.push("non di " + mx[1]); riconosciuto = true; }
      var fPulita = f.replace(ex, " ");
      var g = trovaGiorni(fPulita);
      var o = trovaOrari(fPulita);
      if (/\b(tutti i giorni|qualsiasi giorno|qualunque giorno|indifferente|sempre|ogni giorno|tutta la settimana|qualsiasi)\b/.test(fPulita)) { g = tutti.slice(); riconosciuto = true; ris.letto.push("tutti i giorni"); }
      if (g.length) { g.forEach(function (x) { giorniGlobali[x] = true; }); riconosciuto = true; }
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

    // --- giorni: disponibile? con quali orari? quanti turni? -------------
    var giorni = tutti.map(giornoVuoto);
    var aggiungi = function (g, fin) {
      var x = giorni[g];
      if (x.on && x.finestre === null) return;            // già "tutto il giorno"
      x.on = true;
      x.finestre = fin ? unisci((x.finestre || []).concat(fin)) : null;
    };
    var conGiorni = regole.filter(function (r) { return r.giorni.length; });
    if (conGiorni.length) {
      conGiorni.forEach(function (r) {
        var fin = r.finestre || (finestreGlobali.length ? finestreGlobali : null);
        r.giorni.forEach(function (g) { aggiungi(g, fin); });
      });
    } else {
      tutti.forEach(function (g) { aggiungi(g, finestreGlobali.length ? finestreGlobali : null); });
      if (!ris.date.length) ris.dubbi.push("Nessun giorno della settimana indicato: considerati tutti.");
    }
    Object.keys(esclusiGiorni).forEach(function (g) { if (giorni[g]) giorni[g] = giornoVuoto(); });
    giorni.forEach(function (x) {
      x.turni = x.on && x.finestre ? turniDa(x.finestre) : null;
      if (x.on && x.turni === 0) { x.on = false; ris.dubbi.push("Orari troppo brevi per una classe (2 ore)."); }
    });
    ris.giorni = giorni;

    var g2 = Object.keys(giorniGlobali).map(Number).sort();
    if (g2.length && g2.length < 5) ris.letto.push("giorni: " + g2.map(function (x) { return GIORNI[x]; }).join(", "));
    var ff = [];
    regole.forEach(function (r) { (r.finestre || []).forEach(function (w) { ff.push(w); }); });
    ff = ff.concat(finestreGlobali);
    if (ff.length) ris.letto.push("orari: " + orariTesto(ff));

    // --- certezza ------------------------------------------------------
    var attivi = giorni.filter(function (x) { return x.on; }).length;
    if (!t) { ris.certezza = "bassa"; ris.dubbi.push("Campo vuoto."); }
    else if (!riconosciuto) { ris.certezza = "bassa"; ris.dubbi.push("Testo non interpretato: imposta i vincoli a mano."); }
    else if (attivi === 0) { ris.certezza = "bassa"; ris.dubbi.push("Con questi vincoli non resta nessun giorno libero."); }
    else {
      if (/\b(tranne|escluso|eccetto|solo|preferibilmente|possibilmente|meglio|se possibile|da concordare|da definire|da verificare|chiamare|sentire|contattare|telefonare)\b|\?/.test(t)) {
        ris.certezza = "media"; ris.dubbi.push("Ci sono condizioni o preferenze: controlla l'interpretazione.");
      }
      if (/\b\d+\s*[ªa°]?\s*[a-z]\b.*\b(?:luned|marted|mercoled|gioved|venerd)|\(\s*\d[a-z]\s*\)/i.test(testo || "")) {
        ris.certezza = "media"; ris.dubbi.push("Orari diversi per classe: controlla le singole classi.");
      }
      if (ris.date.length && !g2.length) { ris.certezza = "media"; ris.dubbi.push("Date precise indicate: il pianificatore userà solo quelle."); }
    }
    return ris;
  }

  /** Turni in linea possibili quel giorno per quella scuola. */
  function turniMax(v, data, parametri) {
    var P = parametri || PARAMETRI;
    var x = v.giorni[giornoSett(data)];
    return x && x.turni ? x.turni : P.turniGiorno;
  }

  /** Sintesi breve dei vincoli, es. "Mar, Gio 8–13 · dal 15 gen". */
  function sintesiVincoli(v) {
    if (!v || !v.giorni) return "non indicate";
    var parti = [];
    var gruppi = []; // giorni consecutivi nell'elenco con gli stessi orari
    v.giorni.forEach(function (x, g) {
      if (!x.on) return;
      var o = x.finestre ? orariTesto(x.finestre) : "";
      var u = gruppi[gruppi.length - 1];
      if (u && u.o === o) u.g.push(g); else gruppi.push({ o: o, g: [g] });
    });
    if (v.date && v.date.length) parti.push(v.date.map(dataBreve).join(", "));
    else if (!gruppi.length) parti.push("nessun giorno");
    else if (gruppi.length === 1 && gruppi[0].g.length === 5) parti.push("tutti i giorni" + (gruppi[0].o ? " " + gruppi[0].o : ""));
    else parti.push(gruppi.map(function (x) { return x.g.map(function (g) { return GIORNI[g]; }).join(", ") + (x.o ? " " + x.o : ""); }).join("; "));
    if (v.mesi && v.mesi.length) parti.push(v.mesi.map(function (x) { return NOMI_MESI[x]; }).join("/"));
    if (v.mesiEsclusi && v.mesiEsclusi.length) parti.push("no " + v.mesiEsclusi.map(function (x) { return NOMI_MESI[x]; }).join("/"));
    if (v.dal) parti.push("dal " + dataBreve(v.dal).replace(/^\w+ /, ""));
    if (v.al) parti.push("fino al " + dataBreve(v.al).replace(/^\w+ /, ""));
    return parti.join(" · ");
  }

  /** Il giorno "data" va bene per questi vincoli? */
  function compatibile(v, data) {
    var g = giornoSett(data);
    if (g > 4) return false;
    if (!v.giorni[g] || !v.giorni[g].on) return false;
    if (v.date && v.date.length) return v.date.indexOf(data) >= 0;
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
    return normalizza(s)
      .replace(/\b(scuola|primaria|secondaria|di|primo|1°|grado|ic|i\.c\.|istituto|comprensivo|plesso|sc\.?|ss1g|s\.s\.|statale)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  /** Collega le classi alle richieste e assegna a ogni classe una chiave stabile. */
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
      if (!x.codice) return;
      var base = x.codice + "|" + x.classe + "|" + x.percorso;
      visti[base] = (visti[base] || 0) + 1;
      x.chiave = visti[base] > 1 ? base + "#" + visti[base] : base;
      x.labs = [x.lab1, x.lab2, x.lab3].filter(Boolean);
      var r = perCodice[x.codice];
      if (r) r.classi.push(x); else orfane.push(x);
    });
    return { richieste: richieste, orfane: orfane };
  }

  /**
   * Anno scolastico a cui si riferiscono le richieste: le adesioni raccolte dal modulo
   * servono a preparare l'anno 2027/28 (scelta di Silvio, 27/11/2026). Da cambiare qui
   * (e in ANNO_INIZIO_PROSSIMO dello script turni) per gli anni successivi.
   */
  var ANNO_INIZIO = 2027;
  function annoRichiesta() { return ANNO_INIZIO; }

  /** Vincoli corretti a mano validi? (formato a giorni, 5 voci) */
  function manualeValido(man) {
    return !!(man && Array.isArray(man.giorni) && man.giorni.length === 5);
  }

  /** Vincoli effettivi: quelli corretti a mano (stato salvato) oppure quelli interpretati dal testo. */
  function vincoli(r, stato) {
    var man = stato && stato.vincoli && stato.vincoli[r.codice];
    var auto = interpreta(r.giornate, annoRichiesta(r));
    if (manualeValido(man)) {
      return { giorni: man.giorni, dal: man.dal || "", al: man.al || "", mesi: man.mesi || null, mesiEsclusi: man.mesiEsclusi || [],
        date: man.date || [], certezza: "manuale", letto: auto.letto, dubbi: [], manuale: true };
    }
    return auto;
  }

  /* ------------------------------------------------------------------ */
  /* 2. Crosscheck                                                       */
  /* ------------------------------------------------------------------ */
  var DOMINI_PERSONALI = /@(gmail|googlemail|libero|hotmail|outlook|live|yahoo|icloud|me|alice|tin|tiscali|virgilio|fastwebnet|email|inwind|msn)\./i;
  var STATI_ESCLUSI_RICHIESTA = ["Non possibile"];
  var STATI_ESCLUSI_CLASSE = ["Annullata", "Svolta"];

  /** Controlli su una richiesta → [{ livello: "errore"|"avviso"|"info", testo, campo }] */
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
    var v = vincoli(r, stato);
    if (v.certezza === "bassa") add("errore", "Disponibilità da verificare: " + (v.dubbi[0] || "non interpretata"), "giornate");
    else if (v.certezza === "media") add("avviso", "Disponibilità: " + v.dubbi.join(" "), "giornate");
    if (P.periodo && (P.periodo.dal || P.periodo.al)) {
      if (v.al && P.periodo.dal && v.al < P.periodo.dal) add("avviso", "Disponibile solo prima dell'inizio delle attività.", "giornate");
      if (v.dal && P.periodo.al && v.dal > P.periodo.al) add("avviso", "Disponibile solo dopo la fine delle attività.", "giornate");
    }
    // persone necessarie per fare tutto in una giornata (coppie, al massimo 3 interventi a testa)
    var maxTurni = Math.max.apply(null, v.giorni.map(function (x) { return x.on ? (x.turni || P.turniGiorno) : 0; }).concat(0));
    if (maxTurni && cl.length > 1) {
      var coppie = Math.ceil(cl.length / maxTurni);
      var pers = Math.max(2 * coppie, Math.ceil(2 * cl.length / MAX_INTERVENTI));
      add("info", "Per fare le " + cl.length + " classi in una giornata servono almeno " + pers + " persone (" + coppie + (coppie === 1 ? " coppia" : " coppie") + " alla volta).", "giornate");
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
  function riassunto(r, avvisi, stato) {
    var cl = r.classi || [];
    var alunni = cl.reduce(function (s, c) { var n = parseInt(c.alunni, 10); return s + (isNaN(n) ? 0 : n); }, 0);
    var perc = {};
    cl.forEach(function (c) { perc[c.percorso || "?"] = (perc[c.percorso || "?"] || 0) + 1; });
    var anni = {};
    cl.forEach(function (c) { var a = (c.classe || "").match(/^\d/); if (a) anni[a[0] + "ª"] = (anni[a[0] + "ª"] || 0) + 1; });
    var ord = r.ordine === "Primaria" ? "primaria" : r.ordine ? "secondaria" : "";
    var v = vincoli(r, stato);
    var errori = (avvisi || []).filter(function (a) { return a.livello === "errore"; }).length;
    var warn = (avvisi || []).filter(function (a) { return a.livello === "avviso"; }).length;
    return cl.length + (cl.length === 1 ? " classe " : " classi ") + ord +
      " (" + Object.keys(anni).sort().map(function (k) { return anni[k] > 1 ? anni[k] + "×" + k : k; }).join(", ") + ")" +
      (alunni ? ", " + alunni + " studenti" : "") +
      (Object.keys(perc).length > 1 || perc.Fisica ? "; " + Object.keys(perc).map(function (p) { return p + " " + perc[p]; }).join(", ") : "") +
      ". Disponibilità: " + sintesiVincoli(v) + "." +
      (errori ? " " + errori + (errori === 1 ? " problema" : " problemi") + "." : warn ? " " + warn + (warn === 1 ? " avviso" : " avvisi") + "." : " Dati coerenti.");
  }

  /* ------------------------------------------------------------------ */
  /* 4. Pianificatore                                                    */
  /* ------------------------------------------------------------------ */
  /** Giorni di attività nei periodi: lun-ven, senza feste e chiusure. */
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
    if (!c || c.consiglio === "Sì") return []; // li sceglie il team: nessun vincolo noto
    if (c.percorso === "Fisica") return c.lab1 ? ["F:" + c.lab1] : [];
    return c.labs.slice(0, 3).filter(function (l, i, a) { return a.indexOf(l) === i; }); // un laboratorio scelto due volte = un kit
  }

  /**
   * Persone necessarie per una scuola in un giorno. Ogni classe è seguita da una coppia (unità operativa);
   * ogni persona fa al massimo 3 interventi al giorno, e le persone si possono dare il cambio:
   *   persone = max(2 × classi nel turno più pieno, 2 × classi / 3 arrotondato in su).
   * Es. 7 classi, 2 alla volta in 4 turni → max(4, 5) = 5 persone, 4 al lavoro e 1 che dà il cambio.
   * ass = assegnazioni di quella scuola in quel giorno ({turno}).
   */
  function persone(ass) {
    if (!ass.length) return 0;
    var per = {};
    ass.forEach(function (a) { per[a.turno] = (per[a.turno] || 0) + 1; });
    var picco = Math.max.apply(null, Object.keys(per).map(function (k) { return per[k]; }));
    return Math.max(2 * picco, Math.ceil(2 * ass.length / MAX_INTERVENTI));
  }
  /** Coppie al lavoro nello stesso momento (turno più pieno). */
  function coppieInsieme(ass) {
    var per = {};
    ass.forEach(function (a) { per[a.turno] = (per[a.turno] || 0) + 1; });
    return Math.max.apply(null, Object.keys(per).map(function (k) { return per[k]; }).concat(0));
  }

  /** "in linea" (un turno dopo l'altro), "in parallelo" (stesso turno) o "misto". */
  function modalita(ass) {
    var per = {};
    ass.forEach(function (a) { per[a.turno] = (per[a.turno] || 0) + 1; });
    var n = Object.keys(per).map(function (k) { return per[k]; });
    if (!n.length) return "";
    if (n.every(function (x) { return x === 1; })) return n.length === 1 ? "una classe" : "in linea";
    if (n.length === 1) return "in parallelo";
    return "misto";
  }

  /**
   * opzioni = { intervalli, richieste (da prepara), codici | null, stato, parametri, seme }
   * Restituisce { assegnazioni: [{chiave, codice, data, turno}], nonAssegnate: [{chiave, codice, motivo}],
   *               giorni, statistiche, parametri }
   * turno = 0, 1, 2…: turni da 2 ore uno dopo l'altro nella giornata di quella scuola;
   * più classi con lo stesso turno = in parallelo.
   */
  function pianifica(opzioni) {
    var P = Object.assign({}, PARAMETRI, opzioni.parametri || {});
    var stato = opzioni.stato || {};
    var fissate = stato.fissate || {};
    // calcolo precedente (per spostare il meno possibile): {chiave: {data, turno}}
    var prima = {};
    (opzioni.precedente || []).forEach(function (a) { prima[a.chiave] = a; });
    var giorni = giorniAttivita(opzioni.intervalli, P);
    var tutte = opzioni.richieste || [];
    var richieste = tutte.filter(function (r) {
      if (STATI_ESCLUSI_RICHIESTA.indexOf(r.stato) >= 0) return false;
      return !opzioni.codici || opzioni.codici.indexOf(r.codice) >= 0;
    });

    // occupazione esistente: date accettate prima (con turno) + "Data prevista" del foglio (senza turno)
    // occ.giorno[d] = classi; occ.scuole[d][codice] = [n classi per turno];
    // occ.kit[d][turno] = {laboratorio: n}: il turno k di scuole diverse cade più o meno alla stessa ora
    // (le scuole iniziano tutte la mattina), quindi un kit non si usa due volte nello stesso turno.
    var base = { giorno: {}, scuole: {}, kit: {} };
    function turniScuola(occ, d, codice) {
      var sc = occ.scuole[d] = occ.scuole[d] || {};
      return sc[codice] = sc[codice] || [];
    }
    function kitTurno(occ, d, k) {
      var g = occ.kit[d] = occ.kit[d] || {};
      return g[k] = g[k] || {};
    }
    function occupa(occ, d, codice, turno, c) {
      occ.giorno[d] = (occ.giorno[d] || 0) + 1;
      var t = turniScuola(occ, d, codice);
      while (t.length <= turno) t.push(0);
      t[turno]++;
      var kk = kitTurno(occ, d, turno);
      kitDi(c).forEach(function (l) { kk[l] = (kk[l] || 0) + 1; });
    }
    var indice = {};
    tutte.forEach(function (r) { r.classi.forEach(function (c) { indice[c.chiave] = { c: c, r: r }; }); });
    Object.keys(fissate).forEach(function (ch) {
      var f = fissate[ch], x = indice[ch];
      if (f && f.data && x) occupa(base, f.data, x.r.codice, f.turno || 0, x.c);
    });
    tutte.forEach(function (r) {
      r.classi.forEach(function (c) {
        if (c.dataPrevista && !fissate[c.chiave] && STATI_ESCLUSI_CLASSE.indexOf(c.stato) < 0) {
          var t = turniScuola(base, c.dataPrevista, r.codice);
          occupa(base, c.dataPrevista, r.codice, t.length, c); // orario ignoto: occupa il turno dopo
        }
      });
    });

    // classi da pianificare e giorni possibili per ciascuna richiesta
    var lavori = [], nonAssegnate = [];
    var giaViste = {}; // doppioni: stessa scuola, classe e percorso in una richiesta precedente → si tiene la prima
    tutte.slice().sort(function (a, b) { return String(a.dataInvio || "").localeCompare(String(b.dataInvio || "")); })
      .forEach(function (r) {
        if (STATI_ESCLUSI_RICHIESTA.indexOf(r.stato) >= 0) return;
        r.classi.forEach(function (c) {
          var k = chiaveScuola(r.scuola) + "|" + chiaveScuola(r.comune) + "|" + c.classe + "|" + c.percorso;
          if (!giaViste[k]) giaViste[k] = r.codice;
        });
      });
    richieste.forEach(function (r) {
      var v = vincoli(r, stato);
      var escluse = stato.escluse || {}; // classi tolte a mano dal foglio turni: non si ripianificano
      var daFare = r.classi.filter(function (c) {
        if (escluse[c.chiave]) { nonAssegnate.push({ chiave: c.chiave, codice: r.codice, motivo: "Tolta a mano dal foglio turni: sbloccala per ripianificarla." }); return false; }
        return !fissate[c.chiave] && !c.dataPrevista && STATI_ESCLUSI_CLASSE.indexOf(c.stato) < 0;
      }).filter(function (c) {
        var prima = giaViste[chiaveScuola(r.scuola) + "|" + chiaveScuola(r.comune) + "|" + c.classe + "|" + c.percorso];
        if (prima && prima !== r.codice) { nonAssegnate.push({ chiave: c.chiave, codice: r.codice, motivo: "Doppione della stessa classe in " + prima + ": esclusa." }); return false; }
        return true;
      });
      if (!daFare.length) return;
      if (v.certezza === "bassa") {
        daFare.forEach(function (c) { nonAssegnate.push({ chiave: c.chiave, codice: r.codice, motivo: "Disponibilità da verificare: correggila nella scheda della richiesta." }); });
        return;
      }
      var possibili = giorni.filter(function (d) { return compatibile(v, d); });
      if (!possibili.length) {
        daFare.forEach(function (c) { nonAssegnate.push({ chiave: c.chiave, codice: r.codice, motivo: "Nessun giorno compatibile con le disponibilità nei periodi scelti." }); });
        return;
      }
      var capienza = possibili.reduce(function (s, d) { return s + turniMax(v, d, P); }, 0);
      lavori.push({ r: r, v: v, classi: daFare, giorni: possibili, capienza: capienza });
    });

    function clona(o) {
      var c2 = function (obj, f) { return Object.keys(obj).reduce(function (a, k) { a[k] = f(obj[k]); return a; }, {}); };
      return { giorno: Object.assign({}, o.giorno),
        scuole: c2(o.scuole, function (sc) { return c2(sc, function (t) { return t.slice(); }); }),
        kit: c2(o.kit, function (g) { return c2(g, function (k) { return Object.assign({}, k); }); }) };
    }
    function kitLibero(occ, d, k, c) {
      if (!P.kitUnico) return true;
      var kk = (occ.kit[d] || {})[k] || {};
      return !kitDi(c).some(function (l) { return kk[l]; });
    }

    /**
     * Mette le classi rimaste di una scuola nel giorno d con il MINIMO di persone:
     * T = turni da 2 ore possibili quel giorno; "op" = coppie al lavoro nello stesso turno.
     * Si parte dal minimo (classi / T) e si sale solo se serve; prima in linea, poi in parallelo.
     * Le persone si contano con persone(): coppie × 2, con il limite di 3 interventi a testa.
     * Le classi che non entrano (kit) restano per un'altra giornata.
     */
    function provaGiorno(occ, lav, d, rimaste) {
      var T = turniMax(lav.v, d, P);
      var gia = (occ.scuole[d] || {})[lav.r.codice] || [];
      var giaN = gia.reduce(function (s, x) { return s + x; }, 0);
      var totale = giaN + rimaste.length;
      var minimo = Math.max(1, Math.ceil(totale / T), Math.max.apply(null, gia.concat(0)));
      var meglio = null;
      for (var op = minimo; op <= Math.max(minimo, totale); op++) {
        var tmp = clona(occ), messe = [], restano = rimaste.slice();
        var turni = turniScuola(tmp, d, lav.r.codice);
        while (turni.length < T) turni.push(0);
        var capienza = op * T - giaN;
        // giro per giro: prima una classe per turno (in linea), poi una seconda (in parallelo), ecc.
        for (var giro = 0; giro < op && restano.length && capienza > 0; giro++) {
          for (var k = 0; k < T && restano.length && capienza > 0; k++) {
            if (turni[k] > giro) continue;
            for (var i = 0; i < restano.length; i++) {
              if (kitLibero(tmp, d, k, restano[i])) {
                occupa(tmp, d, lav.r.codice, k, restano[i]);
                messe.push({ c: restano[i], k: k });
                restano.splice(i, 1);
                capienza--;
                break;
              }
            }
          }
        }
        if (!meglio || messe.length > meglio.messe.length) meglio = { messe: messe, occ: tmp, restano: restano, op: op };
        if (!restano.length) break;          // tutte dentro: questo è il minimo di operatori
      }
      if (meglio) {
        var tutteQui = meglio.messe.map(function (m) { return { turno: m.k }; });
        gia.forEach(function (n, k) { for (var j = 0; j < n; j++) tutteQui.push({ turno: k }); });
        meglio.operatori = persone(tutteQui);
      }
      return meglio || { messe: [] };
    }

    function soluzione(rand, rumore) {
      var occ = clona(base);
      var ass = [], non = [], visite = 0, operatoriTot = 0;
      var ordine = lavori.slice().sort(function (a, b) {
        // prima le scuole più vincolate (meno turni possibili per classe), poi le più vecchie
        var va = a.capienza / a.classi.length, vb = b.capienza / b.classi.length;
        if (rumore) { va *= 0.7 + rand() * 0.6; vb *= 0.7 + rand() * 0.6; }
        if (va !== vb) return va - vb;
        return String(a.r.dataInvio || "").localeCompare(String(b.r.dataInvio || ""));
      });
      ordine.forEach(function (lav) {
        var rimaste = lav.classi.slice(), usati = [];
        while (rimaste.length) {
          var migliore = null;
          lav.giorni.forEach(function (d) {
            if (usati.indexOf(d) >= 0) return;
            var p = provaGiorno(occ, lav, d, rimaste);
            if (!p.messe.length) return;
            // 1° più classi nella stessa giornata (= meno giornate), 2° meno operatori, poi piccole preferenze
            // la scuola ha già un'uscita quel giorno (data nel foglio o accettata prima): non è una giornata in più
            var nuova = !(base.scuole[d] || {})[lav.r.codice];
            var vicino = usati.some(function (u) { return Math.abs(daIso(u) - daIso(d)) <= 7 * 86400000; }) ? 2 : 0;
            var carico = occ.giorno[d] || 0;
            // stabilità (ultima priorità): a parità del resto, le classi restano dove erano nel calcolo precedente
            var stabili = p.messe.filter(function (m) { return prima[m.c.chiave] && prima[m.c.chiave].data === d; }).length;
            var punti = p.messe.length * 1000 - (nuova ? 500 : 0) - p.operatori * 50 + stabili * 20 + vicino - carico + (rumore ? rand() * 6 : 0) - lav.giorni.indexOf(d) * 0.01;
            if (!migliore || punti > migliore.punti) migliore = { punti: punti, d: d, p: p, nuova: nuova };
          });
          if (!migliore) break;
          occ = migliore.p.occ;
          usati.push(migliore.d);
          if (migliore.nuova) visite++;
          operatoriTot += migliore.p.operatori;
          migliore.p.messe.forEach(function (m) { ass.push({ chiave: m.c.chiave, codice: lav.r.codice, data: migliore.d, turno: m.k }); });
          rimaste = migliore.p.restano;
        }
        rimaste.forEach(function (c) { non.push({ chiave: c.chiave, codice: lav.r.codice, motivo: "Nessun giorno compatibile con posto libero (kit già usati negli stessi turni)." }); });
      });
      // ordine delle priorità: classi sistemate, poi meno giornate, poi meno persone, poi meno spostamenti
      var spostate = ass.filter(function (a) { var x = prima[a.chiave]; return x && (x.data !== a.data || x.turno !== a.turno); }).length;
      return { ass: ass, non: non, visite: visite, operatori: operatoriTot, spostate: spostate,
        punteggio: ass.length * 1e6 - visite * 1e3 - operatoriTot - spostate * 0.1 };
    }

    var rand = rng(opzioni.seme || 20261127);
    var migliore = soluzione(rand, false);
    for (var i = 0, n = Math.max(0, P.tentativi | 0); i < n; i++) {
      var s = soluzione(rand, true);
      if (s.punteggio > migliore.punteggio) migliore = s;
    }

    var usati = {}; migliore.ass.forEach(function (a) { usati[a.data] = true; });
    var daPianificare = lavori.reduce(function (s, l) { return s + l.classi.length; }, 0) + nonAssegnate.length;
    migliore.ass.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : a.codice.localeCompare(b.codice) || a.turno - b.turno; });
    return {
      assegnazioni: migliore.ass,
      nonAssegnate: nonAssegnate.concat(migliore.non),
      giorni: giorni,
      statistiche: {
        classi: daPianificare, assegnate: migliore.ass.length, visite: migliore.visite, operatori: migliore.operatori,
        giorniUsati: Object.keys(usati).length, giorniDisponibili: giorni.length, scuole: lavori.length
      },
      parametri: P
    };
  }

  /**
   * Controlla un'assegnazione modificata a mano. tutte = tutte le assegnazioni del giorno
   * (proposta + date già accettate). Restituisce i problemi (lista di stringhe).
   */
  function verificaAssegnazione(a, tutte, richieste, stato, parametri) {
    var P = Object.assign({}, PARAMETRI, parametri || {});
    var r = richieste.filter(function (x) { return x.codice === a.codice; })[0];
    if (!r) return ["Richiesta non trovata."];
    var c = r.classi.filter(function (x) { return x.chiave === a.chiave; })[0];
    var trova = function (x) {
      var rx = richieste.filter(function (y) { return y.codice === x.codice; })[0];
      return rx && rx.classi.filter(function (y) { return y.chiave === x.chiave; })[0];
    };
    var out = [];
    if (giornoSett(a.data) > 4) out.push("Giorno nel fine settimana.");
    var v = vincoli(r, stato);
    if (!compatibile(v, a.data)) out.push("Fuori dalle disponibilità della scuola.");
    var T = turniMax(v, a.data, P);
    if (a.turno >= T) out.push("La scuola indica orari per " + T + (T === 1 ? " turno" : " turni") + " da 2 ore: questo è il " + (a.turno + 1) + "°.");
    if (festivi(+a.data.slice(0, 4)).concat(P.chiusure || []).indexOf(a.data) >= 0) out.push("Giorno festivo o di chiusura.");
    var stessoGiorno = tutte.filter(function (x) { return x !== a && x.data === a.data && x.chiave !== a.chiave; });
    // kit: nello stesso turno, in qualsiasi scuola, ogni laboratorio una volta sola
    var stessoTurno = stessoGiorno.filter(function (x) { return x.turno === a.turno; });
    if (P.kitUnico && c) {
      var miei = kitDi(c);
      stessoTurno.forEach(function (x) {
        var cx = trova(x); if (!cx) return;
        var comuni = kitDi(cx).filter(function (l) { return miei.indexOf(l) >= 0; });
        var dove = x.codice === a.codice ? cx.classe : cx.classe + " di un'altra scuola";
        if (comuni.length) out.push("Stesso kit nello stesso turno di " + dove + ": " + comuni.join(", ").replace(/F:/g, "") + ".");
      });
    }
    return out;
  }

  return {
    GIORNI: GIORNI, DURATA: DURATA, MAX_INTERVENTI: MAX_INTERVENTI, PARAMETRI: PARAMETRI, NOMI_MESI: NOMI_MESI,
    persone: persone, coppieInsieme: coppieInsieme,
    interpreta: interpreta, sintesiVincoli: sintesiVincoli, compatibile: compatibile, turniMax: turniMax,
    vincoli: vincoli, manualeValido: manualeValido, turniDa: turniDa, orariTesto: orariTesto,
    catalogo: catalogo, prepara: prepara, controlla: controlla, riassunto: riassunto,
    pianifica: pianifica, verificaAssegnazione: verificaAssegnazione, modalita: modalita, giorniAttivita: giorniAttivita,
    festivi: festivi, annoScolastico: annoScolastico, annoRichiesta: annoRichiesta, ANNO_INIZIO: ANNO_INIZIO,
    iso: iso, daIso: daIso, dataBreve: dataBreve, giornoSett: giornoSett, aggiungiGiorni: aggiungiGiorni,
    oraTesto: oraTesto, turnoTesto: turnoTesto, chiaveScuola: chiaveScuola, kitDi: kitDi,
    STATI_ESCLUSI_RICHIESTA: STATI_ESCLUSI_RICHIESTA, STATI_ESCLUSI_CLASSE: STATI_ESCLUSI_CLASSE
  };
});
