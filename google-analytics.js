(function () {
  "use strict";
  var GA_ID = "G-S33NBEJQFD";

  // A diagram loaded inside an iframe belongs to the host page view.
  // If this HTML is opened directly, it is still tracked normally.
  if (window.self !== window.top) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
  document.head.appendChild(script);
})();
