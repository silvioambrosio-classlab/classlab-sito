/* =====================================================================
   CLASSLAB – IMPOSTAZIONI DEL SITO
   ---------------------------------------------------------------------
   Questo è l'UNICO file da modificare per cambiare:
   - l'indirizzo che riceve le risposte del modulo (Google Sheet)
   - email, dati legali, menu, link ai partner
   Dopo ogni modifica: salva il file e ricarica il sito (vedi GUIDA).
   ===================================================================== */

window.CLASSLAB = {

  /* --- MODULO "Porta ClassLab nella tua scuola" --------------------
     Incolla qui l'URL "/exec" dell'App web di Google Apps Script
     (vedi GUIDA, passo 2). Finché è vuoto, il modulo prepara
     un'email precompilata da inviare a mano a info@classlab.it.      */
  moduloEndpoint: "https://script.google.com/macros/s/AKfycbwI0Rm-mk4guzrum9im0l33TbN-W6tUUrPbOKFvMiIb72H5QIUlNViLICZ2IqxTaypLEQ/exec",

  /* Periodo in cui si svolgono le attività (compare nel modulo) */
  periodoAttivita: "dal 12 dicembre al 15 marzo",

  /* --- CONTATTI E DATI LEGALI -------------------------------------- */
  email: "info@classlab.it",
  nome: "ClassLab ODV",
  codiceFiscale: "90179350328",
  codiceRUNTS: "181570",
  sedeLegale: "Strada di Guardiella 24, Trieste, Italia",

  /* Social (lascia "" per nasconderli) */
  social: {
    instagram: "",
    facebook: "",
    linkedin: ""
  },

  /* --- MENU (ordine e voci) ---------------------------------------- */
  menu: [
    { testo: "Home", link: "index.html" },
    { testo: "Partecipa", link: "partecipa.html" },
    { testo: "I nostri laboratori", link: "laboratori.html" },
    { testo: "Edizioni", sottomenu: [
      { testo: "Edizione 2025/26", link: "edizione-2025-26.html" },
      { testo: "Edizione 2024/25", link: "edizione-2024-25.html" },
      { testo: "Edizione 2023/24", link: "edizione-2023-24.html" },
      { testo: "Edizione 2022/23", link: "edizione-2022-23.html" }
    ]},
    { testo: "Chi siamo", link: "chi-siamo.html" }
  ],

  /* --- PARTNER (home page) ----------------------------------------- */
  finanziatori: [
    { nome: "Fondazione Pietro Pittini", logo: "assets/img/partner-fondazione-pittini.png", link: "https://fondazionepittini.it/" }
  ],
  sostenitori: [
    { nome: "SciFabLab – ICTP", logo: "assets/img/partner-scifablab-ictp.png", link: "http://scifablab.ictp.it/" },
    { nome: "Fondazione AIRC", logo: "assets/img/partner-airc.png", link: "https://www.airc.it/" },
    { nome: "Smart Micro Optics – DIPLE", logo: "assets/img/partner-diple.png", link: "https://smartmicrooptics.com/it/" },
    { nome: "Liceo Scientifico Galileo Galilei – Trieste", logo: "assets/img/partner-liceo-galilei.png", link: "https://www.galileitrieste.it/" }
  ]
};
