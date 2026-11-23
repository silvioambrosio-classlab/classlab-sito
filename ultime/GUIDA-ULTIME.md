# App "Ultime modifiche" (solo gestori)

App del sito, installabile sul telefono come il gestionale turni. Mostra in un tocco l'ultima modifica a:

- **Sito**: l'ultima pubblicazione su GitHub, con il pulsante per aprire la pagina cambiata.
- **Cartelle Drive**: il file o la cartella toccata per ultima in "Documenti team" e "Claude Accessibles" (sottocartelle comprese).
- **Mail di prova**: l'ultima bozza o mail inviata dall'account che pubblica lo script.

In alto c'è un riquadro con la modifica più recente in assoluto, tra le tre fonti.

Si apre da `classlab.it/ultime/`. La vedono solo i gestori (livello 1 nella scheda "Ruoli"): il livello lo controlla il server dei turni, e lo script del passo 2 risponde solo agli indirizzi elencati in `GESTORI`.

## Passo 1: caricare i file sul sito

Su GitHub: **Add file → Upload files**, trascinando mantenendo le cartelle:

- la cartella `ultime/` (tutto tranne la sottocartella `apps-script/`, che non serve sul sito)
- `assets/js/area-team-dati.js` (aggiunge la scheda "Ultime modifiche" all'area team, visibile solo al livello 1)
- `area-team.html` (cambia solo il numero dopo `?v=`)
- `robots.txt`

Non sovrascrivere `config.js` o `turni/config.js` con copie vecchie. Dopo un minuto l'app è su `classlab.it/ultime/`: il sito è già visibile.

## Passo 2: collegare Drive e mail

1. Dall'account @classlab.it che usate per Drive e Gmail apri script.google.com → **Nuovo progetto**, chiamalo "ClassLab - Ultime modifiche".
2. Incolla il contenuto di `apps-script/Ultime.gs` al posto del codice di prova.
3. Controlla in alto le liste `GESTORI` e `CARTELLE` (aggiungi le cartelle da seguire: l'ID è la parte finale dell'indirizzo della cartella).
4. **Esegui** una volta la funzione `drive_` e accetta le autorizzazioni (Drive, Gmail, richieste esterne).
5. **Distribuisci → Nuova distribuzione → App web**: "Esegui come: me", "Chi ha accesso: Chiunque". Copia l'URL che finisce con `/exec`.
6. In `ultime/config.js` incolla l'URL in `API_URL` e ricarica il file su GitHub.

"Chiunque" riguarda solo il collegamento: lo script rifiuta chi non ha un account @classlab.it e chi non è in `GESTORI`.

## Installarla sul telefono

- **Android (Chrome)**: apri `classlab.it/ultime/`, tocca "Installa l'app sul telefono" (oppure menu ⋮ → Installa app).
- **iPhone (Safari)**: Condividi → Aggiungi a Home.

## Cose da sapere

- Le mail e i file che l'app vede sono quelli dell'account che pubblica lo script. Se le mail di prova sono create in un altro account, pubblica lo script da quello.
- Le bozze cancellate non compaiono: se togli una bozza, l'app mostra la precedente.
- L'elenco del sito legge l'archivio pubblico di GitHub, quindi funziona anche senza lo script.
