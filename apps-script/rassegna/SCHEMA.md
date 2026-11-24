# Rassegna stampa: foglio e script

Foglio Google **"ClassLab – Rassegna stampa"**, con lo script `Codice.gs` collegato (Estensioni → Apps Script).

> **Non rinominare le schede e non inserire colonne in mezzo.** Se serve una colonna nuova, si aggiunge sempre in fondo
> (e va aggiunta anche nelle liste `COL_…` di `Codice.gs`). Se nome o ordine cambiano, lo script si ferma con un errore chiaro invece di scrivere nel posto sbagliato.
> Tutte le celle sono in formato "testo" (lo imposta `preparaFoglio()`).

## Scheda `Rassegne` (una riga per rassegna)

| Col. | Nome | Contenuto |
|---|---|---|
| A | `id` | codice interno (UUID), non cambia mai |
| B | `slug` | parte dell'indirizzo pubblico (`rassegna.html?r=…`), creato alla prima volta e poi fisso |
| C | `titolo` | titolo della rassegna |
| D | `data` | `AAAA-MM-GG` |
| E | `introduzione` | testo semplice; riga vuota = nuovo paragrafo |
| F | `copertina` | indirizzo dell'immagine nel Drive (vuoto se assente) |
| G | `stato` | `bozza` o `pubblicata` (solo `pubblicata` è letta dal sito pubblico) |
| H | `creata_il` | data e ora (ISO) |
| I | `modificata_il` | data e ora (ISO); serve anche a evitare sovrascritture |
| J | `modificata_da` | email di chi ha fatto l'ultima modifica |
| K | `pubblicata_il` | data e ora dell'ultima pubblicazione |

## Scheda `Articoli` (una riga per articolo)

| Col. | Nome | Contenuto |
|---|---|---|
| A | `rassegna_id` | `id` della rassegna a cui appartiene |
| B | `ordine` | 1, 2, 3… |
| C | `testata` | giornale o sito |
| D | `titolo` | titolo dell'articolo |
| E | `data` | `AAAA-MM-GG` |
| F | `link` | indirizzo dell'articolo originale (http/https) |
| G | `estratto` | breve estratto (facoltativo) |
| H | `immagine` | indirizzo dell'immagine nel Drive (facoltativo) |

## Scheda `Registro` (solo aggiunte)

| Col. | Nome | Contenuto |
|---|---|---|
| A | `quando` | data e ora (ISO) |
| B | `email` | chi |
| C | `azione` | `crea`, `modifica`, `pubblica`, `toglie-pubblicazione`, `elimina`, `carica-immagine` |
| D | `rassegna_id` | rassegna (o file per le immagini) |

## Primo avvio

1. Crea il foglio "ClassLab – Rassegna stampa" e, nel Drive condiviso ClassLab, la cartella **"Rassegna stampa"**.
2. Dal foglio: Estensioni → Apps Script. Incolla `Codice.gs`. In cima compila `CARTELLA_IMMAGINI_ID` (l'ID è la parte finale dell'indirizzo della cartella).
3. Esegui `preparaFoglio()` (crea le tre schede) e concedi i permessi richiesti (foglio, Drive, connessioni esterne).
4. Distribuisci → Nuova distribuzione → App web: **Esegui come: me · Chi ha accesso: Chiunque**. Copia l'URL che finisce con `/exec`.
5. Incollalo in `assets/js/config.js` (`rassegnaEndpoint`), senza sovrascrivere il resto del file.

## Quando si modifica `Codice.gs`

Distribuisci → Gestisci distribuzioni → matita → **Nuova versione**, su **ogni** distribuzione in uso (quella del vecchio link e quella usata dal sito). Salvare il codice da solo non aggiorna il sito.

## Test locali

`node apps-script/rassegna/test/rassegna.test.js` esegue il vero `Codice.gs` con un Google simulato (accesso valido, account non autorizzato, token scaduto o falso, bozze mai pubbliche, dati non validi, immagini).
