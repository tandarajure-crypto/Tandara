/* PETAR-MASTER header toggle and fullscreen-label layer. UI only; genealogy data/engine are untouched. */
(() => {
  'use strict';
  const header = document.getElementById('diagramHeader');
  const button = document.getElementById('headerCollapse');
  const fullBtn = document.getElementById('fullscreenDiagram');
  const fullLabel = fullBtn ? fullBtn.querySelector('span') : null;

  const setFullState = (isFull) => {
    if (!fullBtn) return;
    const enterLabel = fullBtn.dataset.enterLabel || 'Full screen';
    const exitLabel = fullBtn.dataset.exitLabel || 'Back';
    const enterSymbol = fullBtn.dataset.enterSymbol || '⛶';
    const exitSymbol = fullBtn.dataset.exitSymbol || '↩';
    const label = isFull ? exitLabel : enterLabel;
    const symbol = isFull ? exitSymbol : enterSymbol;

    fullBtn.setAttribute('aria-label', label);
    fullBtn.title = label;
    if (fullLabel) fullLabel.textContent = label;

    // Keep exactly one text symbol before the label span.
    let node = fullBtn.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) {
      node = document.createTextNode('');
      fullBtn.insertBefore(node, fullBtn.firstChild);
    }
    node.textContent = symbol + ' ';
  };

  if (header && button) {
    const symbol = button.querySelector('[data-collapse-symbol]');
    const visibleLabel = button.querySelector('[data-collapse-label]');
    const updateHeader = (collapsed) => {
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      const label = collapsed ? button.dataset.showLabel : button.dataset.hideLabel;
      if (label) {
        button.setAttribute('aria-label', label);
        button.title = label;
      }
      if (symbol) symbol.textContent = collapsed ? '▼' : '▲';
      // Show explanatory text only while the top controls are hidden.
      if (visibleLabel) visibleLabel.textContent = collapsed ? (button.dataset.showLabel || '') : '';
    };

    updateHeader(false);
    button.addEventListener('click', () => {
      const collapsed = header.classList.toggle('header-collapsed');
      updateHeader(collapsed);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      }));
    });
  }

  // Immediate visual feedback on click. fullscreenchange below then synchronizes
  // the label with the browser's actual fullscreen state (also handles Esc).
  if (fullBtn) {
    fullBtn.addEventListener('click', () => {
      setFullState(!document.fullscreenElement);
      window.setTimeout(() => setFullState(!!document.fullscreenElement), 900);
    }, true);
  }

  setFullState(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', () => {
    setFullState(!!document.fullscreenElement);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    }));
  });
  document.addEventListener('fullscreenerror', () => setFullState(!!document.fullscreenElement));
})();
