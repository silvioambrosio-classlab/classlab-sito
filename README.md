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

- Pagine pubbliche: `index`, `partecipa`, `laboratori`, `chi-siamo`, le quattro `edizione-…`, `404`.
- `assets/css/style.css`: grafica del sito. `assets/img/`: immagini e loghi (il logo ClassLab è in versione `.webp` leggera e `.png`).
- `assets/js/team-auth.js`: accesso con Google usato da tutte le pagine riservate.
- `area-team.html`: punto di ingresso dell'area riservata.
- `turni/`: gestionale turni. `materiali/`: checklist materiali. `permessi/`: gestione livelli di accesso.
- Le pagine riservate non vengono indicizzate dai motori di ricerca (`robots.txt`).

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

## Regole da ricordare

- Il file **"Turni ClassLab 26"** di Giulio è la fonte dei turni. L'altro file ("NON CANCELLARE - Turni Classlab 26 (Script)") contiene lo script e va tenuto.
- Non rinominare le schede "Richieste" e "Classi" del foglio iscrizioni e non inserire colonne in mezzo.
- Quando si modifica il codice di Apps Script serve una **nuova versione** su entrambi i deployment (quello del vecchio link e quello usato dal sito).
- Nei testi pubblici si usano "scuole" e "studenti".
