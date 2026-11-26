/* TANDARA — izravne poveznice početnog stabla
   Jezik preuzima iz zajedničkog TandaraLanguage autoriteta.
   HTML lang ostaje siguran fallback za samostalni prikaz.
   Svaki okvir ima unaprijed određenu adresu za HR, EN i DE.
*/
(() => {
  "use strict";
  const tree = document.querySelector("[data-home-tree]");
  if (!tree || tree.dataset.homeTreeReady === "true") return;

  const pathFile = window.location.pathname.split("/").pop() || "index.html";
  const pathMatch = pathFile.match(/(?:^|[-_])(de|en|hr)(?=\.html$|$)/i);
  const languageCode = value => {
    const code = String(value || "").trim().toLowerCase().slice(0, 2);
    return ["hr", "en", "de"].includes(code) ? code : null;
  };
  const language =
    window.TandaraLanguage?.get() ||
    languageCode(pathMatch?.[1]) ||
    languageCode(document.documentElement.getAttribute("lang")) ||
    languageCode(document.body?.dataset.lang) ||
    "hr";
  const routes = [
    { key:"jurina", labels:{hr:"Jurina grana",en:"Jure's branch",de:"Jurinas Familienzweig"}, files:{hr:"jurinagrana.html",en:"jurinagrana-en.html",de:"jurinagrana-de.html"} },
    { key:"petrova", labels:{hr:"Petrova grana",en:"Petar's branch",de:"Peters Familienzweig"}, files:{hr:"petrovagrana.html",en:"petrovagrana-en.html",de:"petrovagrana-de.html"} },
    { key:"antina", labels:{hr:"Antina grana",en:"Ante's branch",de:"Antes Familienzweig"}, files:{hr:"antinagrana.html",en:"antinagrana-en.html",de:"antinagrana-de.html"} },
    { key:"matina", labels:{hr:"Matina grana",en:"Mate's branch",de:"Mates Familienzweig"}, files:{hr:"matinagrana.html",en:"matinagrana-en.html",de:"matinagrana-de.html"} },
    { key:"ivanov", labels:{hr:"Ivan Tandara",en:"Ivan Tandara",de:"Ivan Tandara"}, files:{hr:"box1.html",en:"box1-en.html",de:"box1-de.html"} },
    { key:"jurin", labels:{hr:"Jure Tandara",en:"Jure Tandara",de:"Jure Tandara"}, files:{hr:"box2a.html",en:"box2a-en.html",de:"box2a-de.html"} },
    { key:"petrov", labels:{hr:"Petar Tandara",en:"Petar Tandara",de:"Petar Tandara"}, files:{hr:"box2b.html",en:"box2b-en.html",de:"box2b-de.html"} },
    { key:"antin", labels:{hr:"Ante Tandara",en:"Ante Tandara",de:"Ante Tandara"}, files:{hr:"box2c.html",en:"box2c-en.html",de:"box2c-de.html"} },
    { key:"matin", labels:{hr:"Mate Tandara",en:"Mate Tandara",de:"Mate Tandara"}, files:{hr:"box2d.html",en:"box2d-en.html",de:"box2d-de.html"} },
    { key:"livanjske", labels:{hr:"Livanjske Tandare",en:"Livno Tandara branch",de:"Tandara aus Livno"}, files:{hr:"filipovagrana.html",en:"filipovagrana-en.html",de:"filipovagrana-de.html"} }
  ];

  const fragment = document.createDocumentFragment();
  for (const item of routes) {
    const link = document.createElement("a");
    link.className = "home-tree__hotspot home-tree__hotspot--" + item.key;
    link.dataset.hotspot = item.key;
    link.href = new URL(item.files[language], new URL(document.body.dataset.siteRoot || "./", document.baseURI)).href;
    link.lang = language;
    link.hreflang = language;
    link.setAttribute("aria-label", item.labels[language]);
    if (item.key === "livanjske") {
      link.textContent = item.labels[language].toUpperCase();
    } else {
      link.title = item.labels[language];
    }
    fragment.append(link);
  }
  tree.append(fragment);
  tree.dataset.homeTreeReady = "true";
  window.dispatchEvent(new CustomEvent("tandara:home-tree-ready"));
})();
