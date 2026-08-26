(() => {
  'use strict';
  const form = document.querySelector('.archive-contact-form');
  if (!form) return;
  const lang = (document.documentElement.lang || 'hr').toLowerCase();
  const isEnglish = lang.startsWith('en');
  const status = document.getElementById('form-success');
  const submitButton = form.querySelector('button[type="submit"]');
  const honey = form.querySelector('input[name="_honey"]');
  const messageField = form.querySelector('textarea[name="Poruka"], textarea[name="Message"]');
  const loadedAt = Date.now();
  const minFillTimeMs = 5000;
  const cooldownMs = 60000;
  const storageKey = 'tandara-contact-last-submit-v1';

  function showMessage(hr, en) {
    if (!status) return;
    status.textContent = isEnglish ? en : hr;
    status.setAttribute('role', 'alert');
    status.scrollIntoView({ block: 'nearest' });
  }
  function getLastSubmit() {
    try {
      const value = Number(localStorage.getItem(storageKey));
      return Number.isFinite(value) ? value : 0;
    } catch (_) { return 0; }
  }
  function setLastSubmit(value) {
    try { localStorage.setItem(storageKey, String(value)); } catch (_) {}
  }

  form.addEventListener('submit', (event) => {
    if (event.defaultPrevented) return;
    if (honey && honey.value.trim()) { event.preventDefault(); return; }

    const now = Date.now();
    if (now - loadedAt < minFillTimeMs) {
      event.preventDefault();
      showMessage(
        'Obrazac je poslan prebrzo. Pričekajte nekoliko sekundi i pokušajte ponovno.',
        'The form was submitted too quickly. Please wait a few seconds and try again.'
      );
      return;
    }

    const lastSubmit = getLastSubmit();
    const remaining = cooldownMs - (now - lastSubmit);
    if (lastSubmit && remaining > 0) {
      event.preventDefault();
      const seconds = Math.ceil(remaining / 1000);
      showMessage(
        `Radi zaštite od neželjenih poruka pričekajte još ${seconds} sekundi prije ponovnog slanja.`,
        `To protect against message flooding, please wait another ${seconds} seconds before sending again.`
      );
      return;
    }

    if (messageField) {
      const urls = (messageField.value.match(/https?:\/\//gi) || []).length;
      if (urls > 6) {
        event.preventDefault();
        showMessage(
          'Poruka sadrži neuobičajeno velik broj poveznica. Smanjite broj poveznica i pokušajte ponovno.',
          'The message contains an unusually large number of links. Reduce the number of links and try again.'
        );
        return;
      }
    }

    setLastSubmit(now);
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-disabled', 'true');
      submitButton.textContent = isEnglish ? 'Sending…' : 'Šaljem…';
    }
  });
})();
