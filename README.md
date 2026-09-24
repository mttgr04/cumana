# Prossima Cumana

Piccola web app statica per sapere a che ora passa il prossimo treno della Cumana (EAV), scegliendo stazione e direzione.

## Dati

Gli orari in `data/orario.json` sono stati estratti dal PDF ufficiale EAV in vigore dal 11 settembre 2026:
https://www.eavsrl.it (orario Cumana Montesanto - Torregaveta).

Si tratta dell'orario dei giorni feriali (lun-sab): non copre variazioni per festivi, scioperi o servizi sostitutivi.

## Uso

Apri `index.html` in un browser (o servilo con un server statico qualsiasi, es. `python3 -m http.server`).

Seleziona direzione e stazione: l'app mostra il prossimo passaggio da quella stazione in base all'ora corrente del dispositivo, e i passaggi successivi in "Prossimi passaggi".

## Aggiornare l'orario

Se EAV pubblica un nuovo orario, basta rigenerare `data/orario.json` con i nuovi orari per stazione e direzione, mantenendo la stessa struttura (mappa stazione -> lista orari "HH:MM" ordinati).
