# Sito ClassLab ODV

Sito statico di **classlab.it** (HTML, CSS e JavaScript, senza programmi da installare).
Si aggiorna caricando i file in questo repository: GitHub Pages pubblica da solo in circa un minuto.

## Dove vive tutto

| Cosa | Dove |
|---|---|
| Sito pubblico | GitHub Pages, ramo `main`, cartella principale |
| Indirizzo | www.classlab.it (file `CNAME`) |
| DNS | Aruba. `www` punta a GitHub. Non toccare i record della posta |
| Posta @classlab.it | Google Workspace. Non toccare i record MX |
| Iscrizioni delle scuole | Foglio Google, tramite uno script Apps Script (schede "Richieste" e "Classi") |
| Gestionale turni, checklist materiali, permessi | Pagine riservate, con script Apps Script e fogli Google |
| News | Foglio "ClassLab – Rassegna stampa" con il suo script Apps Script; immagini nella cartella "Rassegna stampa – immagini" del Drive condiviso |

## Cosa modificare per cambiare i contenuti

Si cambiano solo questi file, senza toccare le pagine HTML.

- `assets/js/config.js`: indirizzo del modulo di iscrizione, email, dati legali, periodo delle attività, menu.
- `assets/js/partner-dati.js`: sponsor e collaboratori (con i loro loghi in `assets/img/`).
- `assets/js/laboratori-dati.js`: laboratori di biologia e percorsi di fisica. Alimenta anche il modulo di iscrizione.
- `assets/js/area-team-dati.js`: schede dell'area team e livello di accesso richiesto per ciascuna.

L'email per le richieste (`email` in `config.js`) si cambia in un solo punto: i pulsanti "Scrivici" la leggono da lì.
Fanno eccezione le email personali dei volontari nella pagina Chi siamo, che sono scritte nella pagina stessa.

## Come aggiornare il sito

1. Su GitHub apri il repository e scegli **Add file → Upload files**.
2. Trascina i file modificati, mantenendo le cartelle.
3. **Non sovrascrivere `config.js`** (né `turni/config.js`) con una copia vecchia: contengono gli indirizzi dei collegamenti.
4. Premi **Commit changes** e attendi circa un minuto.

Dopo aver modificato un file JavaScript o CSS, cambia il numero dopo `?v=` nelle pagine che lo usano (per esempio `main.js?v=c0d4b727`), altrimenti i browser possono mostrare la versione vecchia.

## Struttura

- Pagine pubbliche: `index`, `partecipa`, `laboratori`, `chi-siamo`, le quattro `edizione-…`, `news/`, `404`.
- `assets/css/style.css`: grafica del sito. `assets/img/`: immagini e loghi (il logo ClassLab è in versione `.webp` leggera e `.png`).
- `assets/js/team-auth.js`: accesso con Google usato da tutte le pagine riservate.
- `area-team.html`: punto di ingresso dell'area riservata.
- `turni/`: gestionale turni. `materiali/`: checklist materiali. `permessi/`: gestione livelli di accesso.
- `news/`: archivio pubblico delle News e pagina della singola news. `news-editor/`: editor riservato.
- `docs/rassegna-stampa/`: script Apps Script della rassegna, schema del foglio e prove in locale.
- Le pagine riservate (compreso l'editor delle News) non vengono indicizzate dai motori di ricerca (`robots.txt`). Le News pubbliche sì.

## Area team e livelli di accesso

L'accesso è con Google ed è limitato agli account **@classlab.it**. I controlli veri sono sul server (Apps Script), non solo nelle pagine.

| Livello | Chi | Cosa può fare |
|---|---|---|
| 1 | Gestori | Tutto, compresa la gestione delle giornate e dei permessi |
| 2 | Responsabile | Segna e toglie i turni, usa la checklist |
| 3 | Operatori | Segna e toglie i turni |
| 4 | Fruitori | Solo i documenti |
| 5 | Sola visualizzazione | Predefinito per chi ha un account @classlab.it ma non è nella scheda "Ruoli" |

I livelli si cambiano dalla pagina `/permessi/`, visibile solo a Silvio, Giulio e info@classlab.it.

## News

Sul sito la sezione si chiama **News** (prima "Rassegna stampa"). Dietro le quinte foglio, script, schede e cartella `docs/rassegna-stampa/` mantengono il vecchio nome: non rinominarli.

Una sezione pubblica (**/news/**, nel menu e nel piè di pagina) mostra tutte le news pubblicate, dalla più recente.
Ogni news ha titolo, data, introduzione, copertina e uno o più articoli con testata, titolo, data, link all'originale, estratto e immagine.
La pagina di una news ha un indirizzo del tipo `/news/notizia.html?r=2026-11-20-titolo`.

Le news si scrivono dall'editor **/news-editor/** (scheda "News" in area team), senza toccare il codice:
nuova news, salva bozza, anteprima, pubblica, togli dalla pubblicazione, elimina (con conferma). Funziona anche da telefono.
Le immagini vengono ridotte nella pagina e caricate su Drive dallo script.

- **Chi può usarlo:** solo Silvio, Giulio e info@classlab.it. La scheda compare solo a loro e il controllo vero è nello script (elenco `ORGANIZZATORI` in `docs/rassegna-stampa/Code.gs`): un altro account @classlab.it viene rifiutato anche conoscendo l'indirizzo.
- **Cosa vede il pubblico:** solo le rassegne in stato "pubblicata". Le bozze non escono mai dallo script.
- **Aggiornamento:** pubblicando dall'editor il sito si aggiorna da solo (entro un minuto), senza commit.
- **Messa online e modifiche allo script:** vedi `docs/rassegna-stampa/LEGGIMI.md`. Lo schema del foglio è in `docs/rassegna-stampa/SCHEMA.md`.
- **Indirizzo dello script:** `news/config.js` (`API_URL`). Finché è vuoto la pagina pubblica mostra "presto disponibile".
- **Prove in locale:** `node docs/rassegna-stampa/test-locale.js` (script, con dati finti); `node docs/rassegna-stampa/server-prova.js` e poi `python3 docs/rassegna-stampa/prova-browser.py` (pagine ed editor nel browser).

## Regole da ricordare

- Il file **"Turni ClassLab 26"** di Giulio è la fonte dei turni. L'altro file ("NON CANCELLARE - Turni Classlab 26 (Script)") contiene lo script e va tenuto.
- Non rinominare le schede "Richieste" e "Classi" del foglio iscrizioni e non inserire colonne in mezzo.
- Lo stesso vale per le schede "Rassegne", "Articoli" e "Log" del foglio della rassegna stampa: colonne nuove solo in fondo.
- Quando si modifica il codice di Apps Script serve una **nuova versione** su entrambi i deployment (quello del vecchio link e quello usato dal sito).
- Nei testi pubblici si usano "scuole" e "studenti".
