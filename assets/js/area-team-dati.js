/* =====================================================================
   CLASSLAB – STRUMENTI DELL'AREA TEAM
   ---------------------------------------------------------------------
   Ogni blocco { ... } è una scheda nella pagina "Area team".
   Per aggiungere uno strumento copia un blocco, incollalo sotto e cambia i testi.

   titolo       → nome della scheda
   descrizione  → una riga che spiega a cosa serve
   link         → indirizzo (lascia "" per mostrare la scheda come "In arrivo")
   icona        → calendario | checklist | documento | cartella | foglio | persone | link
   nuovaScheda  → true = si apre in una nuova scheda del browser
   livelli      → quali livelli vedono la scheda (il livello di ognuno si
                  imposta nella scheda "Ruoli" del foglio turni):
                  1 Gestori · 2 Responsabile · 3 Operatori · 4 Fruitori · 5 Sola visualizzazione
                  (chi ha un account @classlab.it ma non è nella scheda "Ruoli" è livello 5;
                  i livelli si cambiano dalla pagina /permessi/)
   solo         → (facoltativo) elenco di email che vedono la scheda,
                  es. ["silvio.ambrosio@classlab.it", "giulio.prodan@classlab.it"]
   ===================================================================== */

window.AREA_TEAM = [
  {
    titolo: "Gestionale turni",
    descrizione: "Date, scuole, classi e chi è di turno.",
    // gli studenti FSL (livello 5) lo vedono in sola visualizzazione
    descrizioni: { 5: "Date, scuole, classi e chi è di turno (sola visualizzazione)." },
    link: "/turni/",
    icona: "calendario",
    nuovaScheda: false,
    livelli: [1, 2, 3, 5]
  },
  {
    titolo: "Checklist materiali",
    descrizione: "Kit e materiali da preparare per ogni uscita, aggiornati dai turni.",
    link: "/materiali/",
    icona: "checklist",
    nuovaScheda: false,
    livelli: [1, 2]
  },
  {
    titolo: "Documenti e formazione",
    descrizione: "Vademecum di formazione, slide, materiale informativo e didattico da scaricare.",
    // Cartella Drive "ClassLab – Documenti team" (visibile solo agli account @classlab.it)
    link: "https://drive.google.com/drive/folders/1PlU9SU753qZs7WpU_YqbwblF3vd8h_jM",
    icona: "cartella",
    nuovaScheda: true,
    livelli: [1, 2, 3, 4, 5]
  },
  {
    titolo: "Permessi del team",
    descrizione: "Chi vede cosa: cambia il livello di accesso di ogni persona.",
    link: "/permessi/",
    icona: "persone",
    nuovaScheda: false,
    livelli: [1],
    // riservata agli organizzatori (il controllo vero lo fa lo script dei turni)
    solo: ["silvio.ambrosio@classlab.it", "giulio.prodan@classlab.it", "info@classlab.it"]
  },
  {
    titolo: "News",
    descrizione: "Crea, modifica e pubblica le news del sito (rassegna stampa).",
    link: "/news-editor/",
    icona: "documento",
    nuovaScheda: false,
    // nessun filtro per livello: decide solo l'elenco qui sotto
    // (il controllo vero lo fa lo script "ClassLab – Rassegna stampa")
    solo: ["silvio.ambrosio@classlab.it", "giulio.prodan@classlab.it", "info@classlab.it"]
  }
];
