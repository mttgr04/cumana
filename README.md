# Cumana

Web app installabile (PWA) per consultare gli orari della Cumana EAV (Montesanto ⇄ Torregaveta): prossimo treno, ricerca diretta tra due stazioni, calcolo dell'orario di arrivo per una corsa specifica, e orario completo.

## Funzioni

- **Prossimo treno**: scegli direzione e stazione, vedi il prossimo passaggio in base all'ora corrente, con indicazione se la corsa è parziale (es. ferma a Bagnoli invece di proseguire fino a Torregaveta) o garantita in caso di sciopero. La scelta viene ricordata per la prossima apertura.
- **Cerca tratta**: scegli stazione di partenza e di arrivo, l'app determina da sola la direzione e mostra la prossima corsa utile con orario di arrivo e durata.
- **Calcola arrivo**: scegli una corsa specifica (direzione, stazione di partenza, orario) e vedi a che ora arriva a qualunque stazione successiva di quella corsa, con tutte le fermate intermedie.
- **Orario completo**: tutte le stazioni con l'elenco integrale degli orari, in un accordion consultabile facilmente da telefono (al posto della tabella PDF).

Installabile come app (PWA): funziona anche offline dopo la prima apertura, grazie a un service worker che mette in cache pagina e dati.

## Dati

Gli orari in `data/orario.json` sono stati estratti dal PDF ufficiale EAV in vigore dal 11 settembre 2026 (https://www.eavsrl.it), leggendo posizione e coordinate del testo nel PDF (non trascritti a mano) per garantire l'esatta corrispondenza tra ogni fermata e la corsa a cui appartiene, incluso il bollino "G" (garantito in caso di sciopero).

Ogni corsa (`trains`) è rappresentata come sequenza ordinata di fermate effettive (`stops`) più il flag `guaranteed`; `schedule` resta la vista aggregata per stazione usata dal tab "Prossimo treno" e "Orario completo".

È l'orario dei giorni feriali (lun-sab): non copre variazioni per festivi, scioperi (oltre alle corse indicate come garantite) o servizi sostitutivi.

## Uso

Apri `index.html` in un browser, oppure servilo con un server statico (es. `python3 -m http.server`) o pubblicato via GitHub Pages. Da telefono, apri la pagina e usa "Aggiungi a Home"/"Installa app" per un'icona che si comporta come un'app nativa.

## Aggiornare l'orario

Se EAV pubblica un nuovo orario, va rigenerato `data/orario.json` a partire dal nuovo PDF mantenendo la stessa struttura (`meta`, `directions.MT/TM.stationsOrder`, `.schedule`, `.trains[].stops/.guaranteed`). Lo script di estrazione basato su coordinate PDF (PyMuPDF) non è incluso nel repository ma la logica è: per ogni blocco orario, allineare ogni colonna (treno) alle fermate in cui compare un orario non vuoto, e marcare `guaranteed` in base alla riga "G" del PDF allineata per posizione x.
