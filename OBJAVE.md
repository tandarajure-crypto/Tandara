# Skočna objava za obitelji Tandara

Postavke su u `objava.json`. Hrvatska stranica bira `image.hr`, a engleska
`image.en`. Slike su u `tandara-common/slike/common-foto/`:

- `roda.hr.jpg` za hrvatski.
- `roda.en.jpg` za engleski.

`imageOnly: true` prikazuje cijeli plakat bez dodatnog naslova i okvira.
Nacrtani križić u gornjem desnom kutu ima stvarni gumb za zatvaranje.
Klik ili Escape zatvaraju prozor i omogućuju rad sa stranicom.
Zatvaranje se pamti za `id` tijekom sesije iste kartice, na oba jezika.
Za novu objavu promijeni `id`; on također osvježava predmemoriju slike.

`enabled: false` isključuje prikaz pri sljedećem učitavanju. `startsAt: null`
i `endsAt: null` znače prikaz odmah, bez krajnjeg roka. Za rok koristi ISO datum
s vremenskom zonom, npr. `2026-12-27T00:00:00+01:00`. Kraj nije uključen:
navedeni primjer uključuje cijeli 26. prosinca. Otvoren popup zatvara se
na isteku, bez osvježavanja stranice (u uspavanoj kartici pri povratku).
Budući početak primjenjuje se pri sljedećem učitavanju stranice.

Za uobičajenu objavu sa zasebnim naslovom i tekstom postavi `imageOnly: false`,
upiši `title` i `message` na oba jezika. `image` može i dalje biti jedna putanja,
npr. `../tandara-common/slike/common-foto/roda.hr.jpg`, ili objekt s putanjama `hr` i `en`.
Isti `objava.json` i iste putanje koriste javna (Tandara) i privatna (PRIVAT) stranica.
Prvo objavi zajednički kod u tandara-common, zatim konfiguraciju u Tandara.
