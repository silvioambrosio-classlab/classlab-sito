/* =====================================================================
   CLASSLAB · ADESIONI — dati DI PROVA (scuole e persone inventate)
   Usati da /adesioni/?demo e dai test. Stessa forma dei dati del foglio
   "Richieste Scuole" (schede Richieste e Classi).
   ===================================================================== */
(function (root) {
  var B = "Estrazione del DNA vegetale", C = "Cellule vegetali al microscopio", U = "Cellule umane al microscopio",
    T = "Coltura di batteri ambientali", G = "Pigmenti e fotosintesi", A = "Resistenza agli antibiotici",
    D = "I processi digestivi", J = "Il DNA al servizio della giustizia", K = "Il canestro della prevenzione";
  var r = [], c = [];
  function req(n, invio, stato, scuola, comune, ordine, ref, email, tel, giornate, note, classi, extra) {
    var codice = "CL-2026-" + ("000" + n).slice(-4), tot = 0;
    classi.forEach(function (x) {
      var al = x[1] === "" ? "" : x[1]; if (al !== "") tot += al;
      c.push({ riga: c.length + 2, codice: codice, scuola: scuola, comune: comune, ordine: ordine, classe: x[0], alunni: al,
        percorso: x[2], lab1: x[3] || "", lab2: x[4] || "", lab3: x[5] || "", consiglio: x[6] ? "Sì" : "No",
        stato: x[7] || "Da pianificare", dataPrevista: x[8] || "", divulgatori: "", note: "" });
    });
    r.push(Object.assign({ riga: r.length + 2, codice: codice, dataInvio: invio, stato: stato, scuola: scuola, comune: comune, ordine: ordine,
      nClassi: classi.length, totAlunni: tot || "", referente: ref, email: email, telefono: tel, giornate: giornate, note: note,
      riepilogo: "", privacy: "Acconsento", noteInterne: "" }, extra || {}));
  }
  req(1, "2026-10-02T09:12:00", "In contatto", "Scuola Primaria Girasole", "Trieste", "Primaria", "Laura Bianchi", "laura.bianchi@icgirasole.edu.it", "040 1234567",
    "martedì e giovedì mattina, a partire da metà gennaio", "",
    [["4ª A", 22, "Biologia", B, C, T], ["4ª B", 21, "Biologia", C, G, D], ["5ª A", 24, "Biologia", U, A, K]]);
  req(2, "2026-10-05T18:40:00", "Nuova", "Secondaria Mare Blu", "Muggia", "Secondaria di primo grado", "Marco Verdi", "marco.verdi@gmail.com", "333 1234567",
    "lunedì 10-12 (1B) e 12-14 (1C), mercoledì 8-10", "Aula al secondo piano senza ascensore",
    [["1ª B", 25, "Biologia", G, U, T], ["1ª C", 23, "Biologia", G, U, ""], ["2ª A", 26, "Biologia", A, D, K], ["3ª A", 24, "Fisica", "Onde e Luce"]]);
  req(3, "2026-10-09T11:00:00", "Confermata", "Primaria Le Querce", "Gorizia", "Primaria", "Anna Neri", "anna.neri@icquerce.edu.it", "0481 123456",
    "Venerdì 8-12 o 14-16, non a dicembre", "",
    [["5ª A", 19, "Biologia", J, A, B], ["5ª B", 20, "Biologia", J, A, B], ["5ª C", "", "Biologia", "", "", "", true]]);
  req(4, "2026-10-15T16:20:00", "Nuova", "Secondaria Galilei Est", "Pordenone", "Secondaria di primo grado", "Paolo Rossi", "paolo.rossi@icgalileiest.edu.it", "0434 98765",
    "da concordare", "",
    [["2ª C", 27, "Biologia", D, A, T], ["3ª C", 25, "Fisica", "Elettromagnetismo"]]);
  req(5, "2026-10-20T08:05:00", "Calendarizzata", "Primaria Arcobaleno", "Padova", "Primaria", "Giulia Gialli", "giulia.gialli@icarcobaleno.edu.it", "049 7654321",
    "lunedì o mercoledì dalle 14 alle 16", "",
    [["4ª A", 18, "Biologia", B, C, G, false, "Data fissata", "2026-12-14"], ["4ª B", 18, "Biologia", B, C, G]]);
  req(6, "2026-10-22T13:30:00", "Nuova", "Secondaria Mare Blu", "Muggia", "Secondaria di primo grado", "Marco Verdi", "marco.verdi@gmail.com", "333 1234567",
    "lunedì 10-12", "Reinviato perché non avevamo ricevuto conferma",
    [["1ª B", 25, "Biologia", G, U, T]]);
  req(7, "2026-10-28T10:10:00", "In contatto", "Primaria San Marco", "Trieste", "Primaria", "Elisa", "elisa.sm@icsanmarco.edu.it", "12345",
    "Mercoledì e giovedì", "",
    [["3ª A", 20, "Biologia", B, C, T], ["5ª A", 35, "Biologia", A, A, K]], { nClassi: 3 });
  req(8, "2026-11-03T09:45:00", "Nuova", "Secondaria Carso", "Trieste", "Secondaria di primo grado", "Franco Blu", "franco.blu@iccarso.edu.it", "040 555666",
    "tutti i giorni tranne il venerdì, dopo le 10", "",
    [["1ª A", 22, "Biologia", B, C, U], ["1ª B", 21, "Biologia", B, C, U], ["2ª A", 23, "Biologia", D, A, T], ["2ª B", 24, "Biologia", D, A, T],
     ["3ª A", 22, "Biologia", J, A, K], ["3ª B", 21, "Fisica", "Onde e Luce"]]);
  req(9, "2026-11-10T19:00:00", "Nuova", "Primaria Collina", "Padova", "Primaria", "Rita Viola", "rita.viola@iccollina.edu.it", "049 111222",
    "10-21 gennaio, mattina", "",
    [["4ª A", 20, "Biologia", G, B, C], ["4ª B", 21, "Biologia", G, B, C]], { privacy: "" });
  req(10, "2026-11-12T07:55:00", "Nuova", "Secondaria Isonzo", "Gorizia", "Secondaria di primo grado", "Sara Grigi", "sara.grigi@icisonzo.edu.it", "+39 0481 22233",
    "da lunedì a giovedì entro fine febbraio, mattina", "",
    [["2ª A", 24, "Biologia", A, D, U], ["2ª B", 25, "Biologia", A, D, U], ["3ª A", 23, "Fisica", "Elettromagnetismo"], ["3ª B", 22, "Fisica", "Onde e Luce"]]);
  root.ADESIONI_DEMO = { richieste: r, classi: c, aggiornato: new Date().toISOString(), demo: true };
})(typeof self !== "undefined" ? self : this);
