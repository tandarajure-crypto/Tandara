(function () {
  "use strict";
  var GA_ID = "G-S33NBEJQFD";

  function startTracking() {
    document.querySelectorAll("img[data-flag-counter-src]").forEach(function (image) {
      image.loading = "eager";
      image.src = image.getAttribute("data-flag-counter-src");
      image.removeAttribute("data-flag-counter-src");
    });

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(script);
  }

  function scheduleTracking() {
    if ("requestAnimationFrame" in window) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(startTracking);
      });
    } else {
      window.setTimeout(startTracking, 0);
    }
  }

  if (document.readyState === "complete") {
    scheduleTracking();
  } else {
    window.addEventListener("load", scheduleTracking, { once: true });
  }
})();
