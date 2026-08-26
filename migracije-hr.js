const map = L.map('ricice-map').setView([43.51347, 17.11103], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  referrerPolicy: 'no-referrer'
}).addTo(map);

L.marker([43.51347, 17.11103])
  .addTo(map)
  .bindPopup('Ričice')
  .bindTooltip('Ričice', {
    permanent: true,
    direction: 'bottom',
    offset: [0, 10],
    opacity: 0.95,
    className: 'ricice-label-no-arrow'
  });

L.marker([43.543333, 17.125556])
  .addTo(map)
  .bindPopup('Tandare, Zavelim');

L.marker([43.8249858, 17.0076892])
  .addTo(map)
  .bindPopup('Livno');

// OpenStreetMap 2 — Tandare u Hrvatskoj prema tablici iz 2008.
const croatiaMap = L.map('tandara-croatia-map').setView([45.25, 16.65], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  referrerPolicy: 'no-referrer'
}).addTo(croatiaMap);

const croatiaMarkers = [
  L.marker([45.39806, 17.92583]).bindPopup('Bektež kod Kutjeva (2 obitelji, 3 člana)'),
  L.marker([45.89864, 16.84892]).bindPopup('Bjelovar (5 obitelji, 13 članova)'),
  L.marker([46.20694, 16.91694]).bindPopup('Drnje (1 obitelj, 2 člana)'),
  L.marker([45.80583, 16.24417]).bindPopup('Dugo Selo (1 obitelj, 2 člana)'),
  L.marker([45.30833, 18.41056]).bindPopup('Đakovo (7 obitelji, 22 članova)'),
  L.marker([44.13598, 15.63423]).bindPopup('Gornji Karin kod Obrovca (1 obitelj, 1 član)'),
  L.marker([43.44667, 17.21667]).bindPopup('Imotski (1 obitelj, 3 člana)'),
  L.marker([46.22306, 16.12028]).bindPopup('Ivanec (1 obitelj, 3 člana)'),
  L.marker([43.51420, 16.51470]).bindPopup('Kamen kod Splita (1 obitelj, 3 člana)'),
  L.marker([43.55357, 16.34831]).bindPopup('Kaštel Stari (2 obitelji, 5 članova)'),
  L.marker([45.91837, 16.78667]).bindPopup('Klokočevac (3 obitelji, 11 članova)'),
  L.marker([45.81484, 16.26053]).bindPopup('Kozinščak kod Dugog Sela (1 obitelj, 5 članova)'),
  L.marker([46.02194, 16.54250]).bindPopup('Križevci (1 obitelj, 4 člana)'),
  L.marker([45.42611, 17.88222]).bindPopup('Kutjevo (2 obitelji, 7 članova)'),
  L.marker([45.33250, 18.84111]).bindPopup('Nuštar (1 obitelj, 1 član)'),
  L.marker([43.48668, 16.55013]).bindPopup('Podstrana (3 obitelji, 11 članova)'),
  L.marker([45.93583, 16.78333]).bindPopup('Predavac (9 obitelji, 25 članova)'),
  L.marker([45.02083, 14.62889]).bindPopup('Punat (1 obitelj, 2 člana)'),
  L.marker([43.51347, 17.11103]).bindPopup('Ričice (8 obitelji, 35 članova)'),
  L.marker([45.32706, 14.44218]).bindPopup('Rijeka (1 obitelj, 1 član)'),
  L.marker([45.83111, 16.11639]).bindPopup('Sesvete (1 obitelj, 3 člana)'),
  L.marker([45.48722, 16.37611]).bindPopup('Sisak (2 obitelji, 5 članova)'),
  L.marker([45.70333, 17.70278]).bindPopup('Slatina (1 obitelj, 1 član)'),
  L.marker([45.16028, 18.01556]).bindPopup('Slavonski Brod (1 obitelj, 1 član)'),
  L.marker([43.50813, 16.44019]).bindPopup('Split (11 obitelji, 35 članova)'),
  L.marker([44.71998, 14.89672]).bindPopup('Stinica kod Senja (1 obitelj, 2 člana)'),
  L.marker([43.50250, 16.52222]).bindPopup('Stobreč (5 obitelji, 20 članova)'),
  L.marker([45.22592, 18.42881]).bindPopup('Strizivojna (2 obitelji, 5 članova)'),
  L.marker([45.28833, 18.80472]).bindPopup('Vinkovci (1 obitelj, 4 člana)'),
  L.marker([45.21024, 18.40528]).bindPopup('Vrpolje (1 obitelj, 4 člana)'),
  L.marker([45.35161, 19.00225]).bindPopup('Vukovar (2 obitelji, 5 članova)'),
  L.marker([45.81501, 15.98192]).bindPopup('Zagreb (24 obitelji, 73 članova)'),
];

const croatiaGroup = L.featureGroup(croatiaMarkers).addTo(croatiaMap);
croatiaMap.fitBounds(croatiaGroup.getBounds().pad(0.08));

// OpenStreetMap 3 — hrvatski rod Tandara izvan Hrvatske.
// Brojevi su radno stanje iz trenutno dostupnih rodoslovnih HTML podataka.
// Ako izvor ne dopušta pouzdano brojanje, popup to izričito navodi.
const worldMap = L.map('tandara-world-map').setView([45.0, 12.0], 3);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  referrerPolicy: 'no-referrer'
}).addTo(worldMap);

const worldMarkers = [
  // Bosna i Hercegovina
  L.marker([43.543333, 17.125556]).bindPopup(
    '<b>Tandare, Zavelim — BiH</b><br>2 evidentirane obiteljske jedinice; najmanje 5 izričito lociranih članova.'
  ),
  L.marker([43.4728, 17.3262]).bindPopup(
    '<b>Posušje — BiH</b><br>2 evidentirane obitelji + 1 zasebno locirani član; najmanje 3 izričito locirane osobe. Potpuni broj nije utvrđen.'
  ),
  L.marker([43.8563, 18.4131]).bindPopup(
    '<b>Sarajevo — BiH</b><br>2 evidentirane obiteljske jedinice; 6 imenovanih članova u dostupnim zapisima.'
  ),
  L.marker([43.8249858, 17.0076892]).bindPopup(
    '<b>Livno — BiH</b><br>U podacima je potvrđeno da potomci roda danas žive na području Livna; broj obitelji i članova nije utvrđen.'
  ),

  // Slovenija
  L.marker([46.3592, 15.1103]).bindPopup(
    '<b>Velenje — Slovenija</b><br>2 evidentirane obitelji; 8 imenovanih članova u dostupnim zapisima.'
  ),

  // Njemačka — točne lokacije
  L.marker([48.1351, 11.5820]).bindPopup(
    '<b>München — Njemačka</b><br>1 obitelj; 2 člana izričito locirana u Münchenu.'
  ),
  L.marker([52.5200, 13.4050]).bindPopup(
    '<b>Berlin — Njemačka</b><br>1 izričito locirani član roda.'
  ),
  L.marker([52.0302, 8.5325]).bindPopup(
    '<b>Bielefeld — Njemačka</b><br>2 evidentirane obitelji; 7 imenovanih članova u dostupnim zapisima.'
  ),

  // Njemačka — mjesto u državi nije navedeno
  L.marker([51.1657, 10.4515]).bindPopup(
    '<b>Njemačka — lokacija nije navedena</b><br>6 evidentiranih obitelji + 1 zasebno navedeni član; 25 imenovanih osoba. U tekstu se spominju i dodatne grane u Njemačkoj bez dovoljno podataka za pouzdano brojanje.'
  ),

  // Austrija
  L.marker([48.2082, 16.3738]).bindPopup(
    '<b>Beč — Austrija</b><br>1 evidentirana obitelj + 1 zasebno locirani član; ukupno 5 imenovanih osoba.'
  ),
  L.marker([47.5162, 14.5501]).bindPopup(
    '<b>Austrija — dodatna lokacija nije navedena</b><br>U rodoslovnom tekstu navedena je najmanje 1 dodatna grana u Austriji; broj članova nije utvrđen.'
  ),

  // Ostala Europa
  L.marker([46.8182, 8.2275]).bindPopup(
    '<b>Švicarska — lokacija nije navedena</b><br>1 evidentirana obitelj; 4 imenovana člana.'
  ),
  L.marker([51.9194, 19.1451]).bindPopup(
    '<b>Poljska — lokacija nije navedena</b><br>1 izričito navedeni član roda (Nikola Tandara).'
  ),
  L.marker([51.5074, -0.1278]).bindPopup(
    '<b>London — Ujedinjeno Kraljevstvo</b><br>1 evidentirana obitelj; 4 imenovana člana.'
  ),

  // Prekomorske države
  L.marker([56.1304, -106.3468]).bindPopup(
    '<b>Kanada — lokacija nije navedena</b><br>1 evidentirana obitelj; 4 imenovana člana.'
  ),
  L.marker([39.8283, -98.5795]).bindPopup(
    '<b>Sjedinjene Američke Države — lokacija nije navedena</b><br>1 evidentirana obitelj; 4 imenovana člana.'
  ),
  L.marker([-25.2744, 133.7751]).bindPopup(
    '<b>Australija — lokacija nije navedena</b><br>Australija je navedena kao odredište iseljavanja hrvatskog roda Tandara; broj obitelji i članova u dostupnim HTML podacima nije utvrđen.'
  )
];

const worldGroup = L.featureGroup(worldMarkers).addTo(worldMap);
worldMap.fitBounds(worldGroup.getBounds().pad(0.10));

