# Uređivanje objave u skočnom prozoru

Objava se prikazuje na javnim stranicama Tandara. Postavke su u datoteci
`objava.json`, a slike objava spremi u mapu `objave/`.

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

1. Dodaj novu sliku pod novim nazivom u mapu `objave/` unutar repozitorija
   `Tandara-main`; novi naziv izbjegava prikazivanje stare, predmemorirane
   slike.
2. U `objava.json` promijeni `title`, `message` i `imageAlt` na hrvatskom
   i engleskom jeziku te postavi putanju slike u `image`.
3. Svakoj novoj objavi dodijeli novi jedinstveni `id`. Tako će se nova
   objava prikazati i posjetiteljima koji su zatvorili prethodnu.
4. Po želji postavi `link` i njegove natpise u `linkLabel`; ostavi ih prazne
   ako objava nema poveznicu.
5. Objavi izmjenu repozitorija `Tandara-main` na GitHubu. GitHub Pages zatim
   poslužuje novu postavku i sliku.

Posjetitelj zatvaranjem velikog gumba **×** skriva istu objavu do završetka
sesije te kartice preglednika. Nova objava s drugim `id` može se prikazati
već tijekom iste sesije. Ako kartica ostane otvorena preko vremena početka
ili kraja, raspored se osvježava pri sljedećem učitavanju stranice.

Kod prozora nalazi se u repozitoriju `tandara-common-main`. Prilikom prvog
postavljanja ove funkcije objavi izmjene zajedničkog repozitorija prije
izmjena repozitorija `Tandara-main`.
