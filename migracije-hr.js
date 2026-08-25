const map = L.map('ricice-map').setView([43.51347, 17.11103], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  referrerPolicy: 'no-referrer'
}).addTo(map);

L.marker([43.51347, 17.11103])
  .addTo(map)
  .bindPopup('Ričice')
  .openPopup();

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
