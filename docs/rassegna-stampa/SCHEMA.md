# Rassegna stampa: schema del foglio

Foglio Google: **"ClassLab – Rassegna stampa"** (progetto Apps Script collegato al foglio).

**Regole da ricordare**
- Non rinominare le schede `Rassegne`, `Articoli`, `Log`.
- Non inserire colonne in mezzo: eventuali colonne nuove vanno solo **in fondo**.
- Non modificare a mano `id`, `slug` e `stato`: usa l'editor.

## Scheda `Rassegne` (una riga per rassegna)

| Colonna | Contenuto |
|---|---|
| id | Identificativo interno (12 caratteri) |
| slug | Parte dell'indirizzo pubblico, es. `2026-11-23-ricerca-airc`. Non cambia dopo la creazione |
| titolo | Titolo (max 200 caratteri) |
| data | Data della rassegna, `AAAA-MM-GG` |
| introduzione | Testo introduttivo (max 5000 caratteri, paragrafi separati da riga vuota) |
| copertina_id | ID del file Drive della copertina (può essere vuoto) |
| copertina_url | Indirizzo dell'immagine usato dal sito |
| stato | `bozza` oppure `pubblicata` |
| creata_il, creata_da | Quando e da chi |
| modificata_il, modificata_da | Ultima modifica |
| pubblicata_il | Ultima pubblicazione |

## Scheda `Articoli` (una riga per articolo)

| Colonna | Contenuto |
|---|---|
| id | Identificativo interno |
| rassegna_id | `id` della rassegna a cui appartiene |
| ordine | Posizione nella rassegna (1, 2, 3…) |
| testata | Nome della testata (es. "Il Piccolo") |
| titolo | Titolo dell'articolo |
| data | Data dell'articolo, `AAAA-MM-GG` (facoltativa) |
| link | Indirizzo dell'articolo originale (`http://` o `https://`) |
| estratto | Brano o riassunto (facoltativo) |
| immagine_id, immagine_url | Immagine dell'articolo (facoltativa) |

## Scheda `Log` (solo registro, una riga per azione)

`quando`, `chi`, `azione` (creazione, modifica, pubblicazione, ritiro, eliminazione, immagine), `rassegna_id`.

## Cosa esce sul sito pubblico

Solo le righe con `stato = pubblicata`. Dal pubblico si leggono titolo, data, introduzione, copertina e, per ogni articolo, testata, titolo, data, link, estratto e immagine. **Non** escono mai email, date di creazione, `id` interni né le bozze.
