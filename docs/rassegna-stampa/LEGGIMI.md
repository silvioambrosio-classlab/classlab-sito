# Rassegna stampa: messa online dello script

Da fare **una volta sola**, dopo aver caricato il sito aggiornato.

1. Crea un foglio Google chiamato **"ClassLab – Rassegna stampa"** (nel Drive condiviso ClassLab).
2. Nel foglio: **Estensioni → Apps Script**. Cancella il contenuto di `Code.gs` e incolla il file `docs/rassegna-stampa/Code.gs` di questo repository.
3. Crea nel Drive condiviso una cartella **"Rassegna stampa – immagini"**. Condividila come "chiunque abbia il link può visualizzare" (altrimenti le immagini non si vedranno sul sito) e copia il suo ID (la parte finale dell'indirizzo della cartella).
4. In Apps Script: **Impostazioni progetto → Proprietà script → Aggiungi**: nome `CARTELLA_ID`, valore l'ID della cartella.
5. Scegli la funzione `setup` e premi **Esegui** (concedi i permessi). Crea le schede `Rassegne`, `Articoli`, `Log`.
6. **Distribuisci → Nuova distribuzione → App web**: esegui come **te stesso**, accesso **Chiunque**. Copia l'indirizzo che finisce con `/exec`.
7. Incolla l'indirizzo in `rassegna-stampa/config.js` (`API_URL`) e carica il file sul sito.

## Quando modifichi lo script

Crea una **nuova versione su entrambi i deployment** (quello del vecchio link e quello usato dal sito): **Distribuisci → Gestisci distribuzioni → matita → Versione: Nuova versione**. Se ne aggiorni uno solo, sito ed editor possono parlare con versioni diverse dello script.

## Chi può scrivere

Solo `silvio.ambrosio@classlab.it`, `giulio.prodan@classlab.it`, `info@classlab.it` (elenco `ORGANIZZATORI` in cima a `Code.gs`). Il controllo è nello script, non nelle pagine.
