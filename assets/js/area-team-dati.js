/* =====================================================================
   CLASSLAB – STRUMENTI DELL'AREA TEAM
   ---------------------------------------------------------------------
   Ogni blocco { ... } è una scheda nella pagina "Area team".
   Per aggiungere uno strumento copia un blocco, incollalo sotto e cambia i testi.

   titolo       → nome della scheda
   descrizione  → una riga che spiega a cosa serve
   link         → indirizzo (lascia "" per mostrare la scheda come "In arrivo")
   icona        → calendario | checklist | documento | cartella | foglio | link
   nuovaScheda  → true = si apre in una nuova scheda del browser
   solo         → (facoltativo) elenco di email che vedono la scheda,
                  es. ["silvio.ambrosio@classlab.it", "giulio.prodan@classlab.it"]
   ===================================================================== */

window.AREA_TEAM = [
  {
    titolo: "Gestionale turni",
    descrizione: "Date, scuole, classi e chi è di turno.",
    link: "/turni/",
    icona: "calendario",
    nuovaScheda: false
  },
  {
    titolo: "Checklist materiali",
    descrizione: "Kit e materiali da preparare per ogni uscita, aggiornati dai turni.",
    link: "/materiali/",
    icona: "checklist",
    nuovaScheda: false
  }
];
