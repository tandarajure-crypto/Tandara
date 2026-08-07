(function () {
  if (window.top === window.self) {
    document.documentElement.classList.add('same-origin-frame');
    return;
  }
  try {
    if (window.top.location.origin === window.location.origin) {
      document.documentElement.classList.add('same-origin-frame');
    }
  } catch (_error) {
    /* Cross-origin frame: document intentionally remains hidden. */
  }
}());
