// Tab switching by showing/hiding pre-authored sections in the DOM
(function () {
  const content = document.getElementById('content');
  const tabs = Array.from(document.querySelectorAll('.tab'));
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
    // Toggle homepage theme based on active key
    document.body.classList.toggle('home-theme', key === 'home');
    // Mark when photography is active for layout tweaks
    document.body.classList.toggle('photography-mode', key === 'photography');

    // Update document title based on active section
    document.title = (key === 'home') ? 'Lushfoil Photography Sim' : 'Matt Newell';

    // When viewing Matt Newell panel, randomize bin link positions
    if (key === 'matt-newell') {
      randomizeBinLinks();
    }
    // When viewing Photography, build the grid if needed
    if (key === 'photography') {
      buildPhotoGrid();
    }
  }

  function resetScrollTop() {
    const el = document.scrollingElement || document.documentElement || document.body;
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      el.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }

  function getKeyFromHash() {
    const hash = (location.hash || '#home').slice(1);
    return validKeys.has(hash) ? hash : 'home';
  }

  // Initialize
  const hadHash = !!location.hash;
  let current = getKeyFromHash();
  showPanel(current);
  // If no hash on first load, do not highlight any tab
  if (!hadHash) {
    tabs.forEach(a => a.removeAttribute('aria-current'));
  }

  // Randomize overlay links on the bin image, keeping them near center
  function randomizeBinLinks() {
    const container = document.querySelector('.bin-collage');
    if (!container) return;
    const links = Array.from(container.querySelectorAll('.bin-link'));
    if (!links.length) return;
    // Place each link within ~40%..60% of width/height (near center)
    links.forEach(a => {
      const leftPct = 30 + Math.random() * 40;
      const topPct = 20 + Math.random() * 60;
      const rot = Math.floor(-90 + Math.random() * 170); // any rotation
      a.style.left = leftPct + '%';
      a.style.top = topPct + '%';
      a.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
    });
  }

  // Keep positions reasonable on resize when Matt Newell is active
  window.addEventListener('resize', () => {
    if (current === 'matt-newell') {
      randomizeBinLinks();
    }
  });

  // Click handlers (also keep hash in sync)
  tabs.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const key = a.dataset.tab;
      if (!key) return;
      if (key !== current) {
        current = key;
        history.replaceState(null, '', `#${key}`);
        showPanel(key);
      }
      // Always reset page scroll to top on tab click
      resetScrollTop();
      content.focus({ preventScroll: true });
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

// Photography grid population (3 columns, center offset)
(() => {
  const PHOTO_DIR = 'photography/';
  // Hardcoded list of files in the photography folder
  const PHOTO_FILES = [
    //'photography-h1.jpg','photography-h2.jpg','photography-h3.jpg',
    'photography1.jpg','photography2.jpg','photography3.jpg','photography5.jpg','photography6.jpg','photography7.jpg','photography8.jpg','photography9.jpg','photography10.jpg','photography12.jpg','photography13.jpg','photography15.jpg','photography16.jpg','photography17.jpg','photography18.jpg','photography19.jpg','photography20.jpg','photography21.jpg','photography23.jpg','photography24.jpg','photography25.jpg','photography26.jpg','photography27.jpg','photography28.jpg','photography29.jpg','photography4.jpg','photography30.jpg','photography31.jpg','photography32.jpg','photography33.jpg','photography34.jpg','photography35.jpg','photography36.jpg','photography37.jpg','photography38.jpg','photography39.jpg','photography40.jpg','photography41.jpg'
  ];

  let gridBuilt = false;

  function makeImg(src) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = PHOTO_DIR + src;
    img.alt = '';
    img.className = 'photo-item';
    img.dataset.photo = src; // keep original filename for lookups
    return img;
  }

  function preloadDimensions(files) {
    return Promise.all(files.map(src => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ src, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ src, w: 0, h: 0 });
      img.src = PHOTO_DIR + src;
    })));
  }

  function isVertical23(w, h) {
    if (!w || !h) return false;
    if (h <= w) return false; // ensure vertical
    const ratio = w / h; // expect ~ 2/3
    const target = 2 / 3;
    const epsilon = 0.01;
    return Math.abs(ratio - target) < epsilon;
  }

  function ensureColumns(container, count) {
    if (container.children.length >= count) return Array.from(container.children);
    const cols = [];
    for (let i = 0; i < count; i++) {
      const col = document.createElement('div');
      col.className = 'photo-col';
      container.appendChild(col);
      cols.push(col);
    }
    return cols;
  }

  function computeAndApplyOffset(gridEl) {
    // Offset equals half the width of one vertical photo (displayed)
    const verticalImg = gridEl.querySelector('.photo-col img.photo-item');
    let px = 0;
    if (verticalImg) {
      px = Math.round(verticalImg.getBoundingClientRect().width / 2);
    } else {
      const firstCol = gridEl.querySelector('.photo-col');
      if (firstCol) px = Math.round(firstCol.getBoundingClientRect().width / 2);
    }
    if (px > 0) gridEl.style.setProperty('--photo-offset', px + 'px');
  }

  function isWidescreen() {
    return window.matchMedia('(min-aspect-ratio: 3/4)').matches;
  }

  function applyScaleForAspect(gridEl, sizeMap) {
    const imgs = Array.from(gridEl.querySelectorAll('img.photo-item'));
    if (isWidescreen()) {
      imgs.forEach(img => {
        const key = img.dataset.photo;
        const entry = sizeMap && sizeMap.get(key);
        const w = entry && entry.w ? entry.w : img.naturalWidth;
        if (w) img.style.width = Math.round(w / 2) + 'px';
      });
    } else {
      // Vertical mode: let CSS control width
      imgs.forEach(img => { img.style.width = ''; });
    }
  }

  window.buildPhotoGrid = function buildPhotoGrid() {
    if (gridBuilt) return;
    const grid = document.getElementById('photoGrid');
    if (!grid) return;

    // Load sizes to classify by aspect ratio and orientation
    preloadDimensions(PHOTO_FILES.slice()).then(items => {
      const sizeMap = new Map(items.map(it => [it.src, { w: it.w, h: it.h }]));
      const vertical = [];
      const others = [];
      items.forEach(({ src, w, h }) => {
        if (isVertical23(w, h)) vertical.push(src); else others.push(src);
      });

      const ordered = vertical.concat(others);

      // Create image elements once so we can reflow without recreating
      const imgEls = ordered.map(makeImg);

      let lastColCount = -1;
      function render(colCount) {
        // Clear and recreate the requested number of columns
        grid.innerHTML = '';
        const cols = ensureColumns(grid, colCount);
        // Distribute images evenly across columns
        imgEls.forEach((img, idx) => {
          cols[idx % colCount].appendChild(img);
        });
      }

      // Set half-size scaling in widescreen and exact offset, keep them updated on resize
      const updateLayout = () => {
        const colCount = isWidescreen() ? 3 : 2;
        if (colCount !== lastColCount) {
          render(colCount);
          lastColCount = colCount;
        }
        applyScaleForAspect(grid, sizeMap);
        computeAndApplyOffset(grid);
      };
      requestAnimationFrame(updateLayout);
      window.addEventListener('resize', updateLayout);

      gridBuilt = true;
    });
  }
})();

// High Contrast Mode toggle
(() => {
  const TOGGLE_ID = 'hc-toggle';
  const STORAGE_KEY = 'highContrastEnabled';
  const el = document.getElementById(TOGGLE_ID);
  if (!el) return;

  function setEnabled(enabled) {
    document.body.classList.toggle('high-contrast', !!enabled);
    el.textContent = `(high contrast // ${enabled ? 'on' : 'off'})`;
    el.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }

  // Initialize from storage (default off)
  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = saved === '1';
  setEnabled(initial);

  el.addEventListener('click', (e) => {
    e.preventDefault();
    const enabled = !document.body.classList.contains('high-contrast');
    setEnabled(enabled);
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch (_) {}
  });
})();
