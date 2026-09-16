(() => {
  function cleanInternalHref(value) {
    try {
      const u = new URL(value, location.href);
      if (u.origin !== location.origin) return value;
      if (/\/index\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\/index\.html$/i, '/');
      else if (/\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\.html$/i, '');
      return u.pathname + u.search + u.hash;
    } catch (_) {
      return value;
    }
  }

  function normalizeLinks(root = document) {
    const nodes = root.matches?.('a[href]') ? [root] : [...(root.querySelectorAll?.('a[href]') || [])];
    nodes.forEach(a => {
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:)/i.test(raw)) return;
      try {
        const u = new URL(raw, location.href);
        if (u.origin === location.origin) {
          a.setAttribute('href', cleanInternalHref(raw));
        } else if (a.target === '_blank') {
          const rel = new Set((a.rel || '').split(/\s+/).filter(Boolean));
          rel.add('noopener');
          rel.add('noreferrer');
          a.rel = [...rel].join(' ');
        }
      } catch (_) { }
    });
  }

  function dedupeHead() {
    const keepFirst = selectors => {
      selectors.forEach(selector => {
        const items = [...document.head.querySelectorAll(selector)];
        items.slice(1).forEach(el => el.remove());
      });
    };
    keepFirst([
      'link[rel="canonical"]',
      'meta[name="robots"]',
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]',
      'meta[property="og:type"]',
      'meta[property="og:site_name"]',
      'meta[name="twitter:card"]'
    ]);
  }

  function removeUnavailableProgramCards() {
    const programs = window.SITE_CONFIG?.affiliatePrograms || {};
    document.querySelectorAll('[data-program-card]').forEach(card => {
      const key = card.dataset.programCard;
      const url = String(programs[key]?.url || '').trim();
      if (!url) card.remove();
    });
  }

  function dedupeDynamicSections() {
    const article = document.querySelector('.article-main');
    if (!article) return;

    if (article.querySelector('[data-clean-seo-links]')) {
      article.querySelectorAll('[data-seo-article-hierarchy],[data-seo-cluster-links],[data-core-links]').forEach(el => el.remove());
    }

    const offers = [...article.querySelectorAll('.offer-section')];
    if (offers.length > 1) {
      const preferred = offers.find(el => el.querySelector('[data-program-card], [data-offer-grid], .always-card')) || offers[0];
      offers.forEach(el => { if (el !== preferred) el.remove(); });
    }
  }

  function fixMobileMenu() {
    const btn = document.querySelector('.menu-btn');
    const nav = document.querySelector('.site-header nav, header nav');
    if (!btn || !nav) return;

    if (!nav.id) nav.id = 'site-navigation';
    btn.setAttribute('aria-controls', nav.id);
    btn.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');

    if (!btn.dataset.runtimeA11yBound) {
      btn.dataset.runtimeA11yBound = '';
      btn.addEventListener('click', () => {
        requestAnimationFrame(() => btn.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false'));
      });
    }

    if (!nav.dataset.runtimeCloseBound) {
      nav.dataset.runtimeCloseBound = '';
      nav.addEventListener('click', e => {
        if (!e.target.closest('a')) return;
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    }
  }

  function fixImages() {
    document.querySelectorAll('img').forEach(img => {
      if (!img.hasAttribute('alt')) img.alt = '';
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
      if (img.width === 1 && img.height === 1) {
        img.setAttribute('aria-hidden', 'true');
        img.setAttribute('tabindex', '-1');
      } else if (!img.closest('.home-hero,.hero,.page-hero') && !img.hasAttribute('loading')) {
        img.loading = 'lazy';
      }
    });
  }

  function fixEmptyOfferSections() {
    document.querySelectorAll('.offer-section').forEach(section => {
      const visibleCards = [...section.querySelectorAll('[data-program-card]')].filter(el => !el.hidden);
      const alwaysCard = section.querySelector('.always-card');
      const hasUsableContent = visibleCards.length > 0 || !!alwaysCard;
      if (!hasUsableContent && section.querySelector('[data-offer-grid],.offer-grid')) section.hidden = true;
    });
  }

  function run() {
    normalizeLinks(document);
    dedupeHead();
    removeUnavailableProgramCards();
    dedupeDynamicSections();
    fixMobileMenu();
    fixImages();
    fixEmptyOfferSections();
  }

  run();

  const observer = new MutationObserver(records => {
    let needsGlobalPass = false;
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      normalizeLinks(node);
      if (node.matches?.('img') || node.querySelector?.('img')) fixImages();
      if (node.matches?.('.offer-section,[data-program-card],[data-clean-seo-links],[data-seo-cluster-links],[data-core-links]') || node.querySelector?.('.offer-section,[data-program-card],[data-clean-seo-links],[data-seo-cluster-links],[data-core-links]')) needsGlobalPass = true;
    }));
    if (needsGlobalPass) {
      removeUnavailableProgramCards();
      dedupeDynamicSections();
      fixEmptyOfferSections();
    }
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
})();
