/* =====================================================================
   CLASSLAB – CATALOGO DEI LABORATORI
   ---------------------------------------------------------------------
   Da questo elenco si generano AUTOMATICAMENTE:
   - le schede della pagina "I nostri laboratori"
   - le scelte del modulo di adesione (pagina "Partecipa")

   Per ogni laboratorio:
     titolo       → nome mostrato sul sito e salvato nel foglio Google
     descrizione  → testo breve della scheda
     immagine     → percorso di un file in assets/img/ OPPURE link a
                    un'immagine di Google Drive (condivisa "chiunque
                    abbia il link"): https://lh3.googleusercontent.com/d/ID_FILE=s800
     consigliato  → etichetta facoltativa ("" per nessuna)
     perChi       → a chi si può proporre nel modulo:
                    "primaria-4"  = classi quarte primaria
                    "primaria-5"  = classi quinte primaria
                    "secondaria"  = scuola secondaria di 1° grado (Biologia)
     visibile     → false per nasconderlo da sito e modulo senza cancellarlo
   ===================================================================== */

/* ---------------------------- BIOLOGIA ---------------------------- */
window.CLASSLAB_LABORATORI = [
  {
    titolo: "Estrazione del DNA vegetale",
    descrizione: "Estrai il DNA dalla polpa di banana: un filo invisibile che racchiude tutte le istruzioni della vita.",
    immagine: "https://lh3.googleusercontent.com/d/1zpwDt3qk4Mxi1NFjB5AwdPIuGA0lCiyE=s800",
    consigliato: "",
    perChi: ["primaria-4", "primaria-5", "secondaria"],
    visibile: true
  },
  {
    titolo: "Cellule vegetali al microscopio",
    descrizione: "Prepara vetrini di cipolla per osservare pareti cellulari e nuclei da un punto di vista inedito.",
    immagine: "https://lh3.googleusercontent.com/d/15eq5k2s-HTl4-nle_sf8jDSotD-9tT8z=s800",
    consigliato: "",
    perChi: ["primaria-4", "primaria-5", "secondaria"],
    visibile: true
  },
  {
    titolo: "Cellule umane al microscopio",
    descrizione: "Analizza le tue cellule della mucosa orale per scoprire le unità microscopiche che ci compongono.",
    immagine: "https://lh3.googleusercontent.com/d/12p6b4FNwcsVtov75_y3vcuFJzyK15AM4=s800",
    consigliato: "",
    perChi: ["primaria-4", "primaria-5", "secondaria"],
    visibile: true
  },
  {
    titolo: "Coltura di batteri ambientali",
    descrizione: "Gioca al detective e scopri i micro-mondi nascosti sulle superfici coltivando i batteri che le popolano.",
    immagine: "https://lh3.googleusercontent.com/d/1Crf3XHbmwBVCzHKhE9NMUvwkSo-E5XbO=s800",
    consigliato: "",
    perChi: ["primaria-4", "primaria-5", "secondaria"],
    visibile: true
  },
  {
    titolo: "Pigmenti e fotosintesi",
    descrizione: "Isola i colori nascosti delle foglie per svelare i segreti della fotosintesi e della vita vegetale.",
    immagine: "https://lh3.googleusercontent.com/d/1kEqY32aMQdmrJRM9_zgmYvld5_7WmfLf=s800",
    consigliato: "",
    perChi: ["primaria-4", "primaria-5", "secondaria"],
    visibile: true
  },
  {
    titolo: "Resistenza agli antibiotici",
    descrizione: "Osserva l'azione sui batteri e comprendi l'importanza di un uso consapevole dei farmaci.",
    immagine: "https://lh3.googleusercontent.com/d/1wo45iN9bENFGZse6v7_kNhjlDasVIIXe=s800",
    posizioneImmagine: "center 35%",
    consigliato: "Consigliato: scuole secondarie di 1° grado",
    perChi: ["primaria-5", "secondaria"],
    visibile: true
  },
  {
    titolo: "I processi digestivi",
    descrizione: "Simula la digestione e scopri come gli enzimi scompongono i cibi nel nostro organismo.",
    immagine: "https://lh3.googleusercontent.com/d/1oZk4TtaR3gSRJ1GJ1FKJZI3bgBOKVU_m=s800",
    consigliato: "",
    perChi: ["primaria-4", "primaria-5", "secondaria"],
    visibile: true
  },
  {
    titolo: "Il DNA al servizio della giustizia",
    descrizione: "Scopri le basi della profilazione del DNA e come questa influenza la giustizia, immergendoti nel mondo di CSI.",
    immagine: "https://lh3.googleusercontent.com/d/1_6hCMX6ajFCW7xB24isBbWCJXjw_4jun=s800",
    consigliato: "Consigliato: scuole secondarie di 1° grado",
    perChi: ["primaria-5", "secondaria"],
    visibile: true
  },
  {
    titolo: "Il canestro della prevenzione",
    descrizione: "Un percorso formativo sviluppato con AIRC per promuovere stili di vita sani e attivi tra i giovani.",
    immagine: "https://lh3.googleusercontent.com/d/1kUGO5cUmPZfW5ijMHd4MIZQok9WI8fgH=s800",
    consigliato: "In collaborazione con AIRC",
    perChi: ["primaria-4", "primaria-5", "secondaria"],
    visibile: true
  }
];

/* =====================================================================
   PERCORSI DI FISICA (solo scuola secondaria di 1° grado, uno per classe)
   Compaiono nella sezione "Fisica" della pagina dei laboratori e
   nel modulo. "immagine" è facoltativa: se vuota si usa un disegno.
   ===================================================================== */
window.CLASSLAB_PERCORSI_FISICA = [
  {
    titolo: "Onde e Luce",
    descrizione: "Scopri la natura della luce attraverso esperimenti di interferenza, colori iridescenti ed effetto fotoelettrico, esplorando il sorprendente comportamento della luce tra onde e particelle.",
    immagine: "",
    consigliato: "In collaborazione con ICTP FabLab",
    disegno: "onde",
    visibile: true
  },
  {
    titolo: "Elettromagnetismo",
    descrizione: "Costruisci una pila al limone, sperimenta il legame tra elettricità e magnetismo e rendi visibili le linee del campo magnetico, scoprendo i fenomeni alla base dell'elettromagnetismo.",
    immagine: "",
    consigliato: "In collaborazione con ICTP FabLab",
    disegno: "campo",
    visibile: true
  }
];

/* Classi proponibili per ciascun ordine di scuola */
window.CLASSLAB_CLASSI = {
  "Primaria": [
    { valore: "4ª", gruppo: "primaria-4" },
    { valore: "5ª", gruppo: "primaria-5" }
  ],
  "Secondaria di primo grado": [
    { valore: "1ª", gruppo: "secondaria" },
    { valore: "2ª", gruppo: "secondaria" },
    { valore: "3ª", gruppo: "secondaria" }
  ]
};
