// Tab switching by showing/hiding pre-authored sections in the DOM
(function () {
  const content = document.getElementById('content');
  const tabs = Array.from(document.querySelectorAll('.sidebar .tab'));
  const panels = Array.from(document.querySelectorAll('.content .panel'));

  const validKeys = new Set(panels.map(p => p.dataset.key));

  function setActiveLink(key) {
    tabs.forEach(a => {
      const isActive = a.dataset.tab === key;
      if (isActive) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  function showPanel(key) {
    panels.forEach(p => {
      p.hidden = p.dataset.key !== key;
    });
    setActiveLink(key);
  }

  function getKeyFromHash() {
    const hash = (location.hash || '#home').slice(1);
    return validKeys.has(hash) ? hash : 'home';
  }

  // Initialize
  let current = getKeyFromHash();
  showPanel(current);

  // Click handlers (also keep hash in sync)
  tabs.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const key = a.dataset.tab;
      if (key && key !== current) {
        current = key;
        history.replaceState(null, '', `#${key}`);
        showPanel(key);
        content.focus({ preventScroll: true });
      }
    });
  });

  // Respond to manual hash changes (e.g., back/forward)
  window.addEventListener('hashchange', () => {
    const key = getKeyFromHash();
    if (key !== current) {
      current = key;
      showPanel(key);
    }
  });
})();
