# Uređivanje objave u skočnom prozoru

Objava se prikazuje na javnim stranicama Tandara. Postavke su u datoteci
`objava.json`, a stalna slika objave nalazi se u datoteci `objave/popup.png`.

## Uključivanje i raspored

- `enabled: true` uključuje objavu; `enabled: false` je isključuje.
- `startsAt` određuje početak prikazivanja, a `endsAt` kraj. Vrijeme kraja
  nije uključeno u razdoblje prikazivanja.
- Za objavu bez vremenskog ograničenja upiši `null` u oba polja. Trenutni
  primjer ostaje uključen dok ga ne isključiš ili mu ne postaviš datum kraja.
- Datume zapiši u ISO obliku s vremenskom zonom, na primjer
  `2026-12-24T00:00:00+01:00`. Prikaz se određuje prema satu uređaja
  posjetitelja.

## Promjena slike i teksta

1. Zamijeni sliku `objave/popup.png` novom slikom, ali zadrži točno isti naziv
   i putanju. Nemoj stvarati novu slikovnu datoteku za svaku objavu.
2. U `objava.json` zadrži `"image": "objave/popup.png"`. Promijeni `title`,
   `message` i `imageAlt` na hrvatskom i engleskom jeziku te po potrebi datume.
3. Svakoj novoj objavi dodijeli novi jedinstveni `id`. Zajednički JavaScript
   koristi taj ID kao oznaku verzije slike, pa preglednik učita zamijenjenu
   sliku i nova objava se pokaže i posjetiteljima koji su zatvorili prethodnu.
4. Po želji postavi `link` i njegove natpise u `linkLabel`; ostavi ih prazne
   ako objava nema poveznicu.
5. Prenesi zamijenjenu sliku i spremljeni `objava.json` u korijen GitHub
   repozitorija `Tandara` na grani koju objavljuje GitHub Pages.

Posjetitelj zatvaranjem velikog gumba **×** skriva istu objavu do završetka
sesije te kartice preglednika. Nova objava s drugim `id` može se prikazati
već tijekom iste sesije. Ako kartica ostane otvorena preko vremena početka
ili kraja, raspored se osvježava pri sljedećem učitavanju stranice.

Zajednički kod prozora nalazi se u repozitoriju `tandara-common`. Za redovne
objave mijenjaš samo sliku `objave/popup.png` i datoteku `objava.json` u
repozitoriju `Tandara`. JavaScript mijenjaš samo ako mijenjaš ponašanje ili
izgled prozora.
