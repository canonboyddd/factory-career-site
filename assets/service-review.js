(() => {
  const article = document.querySelector('[data-review-program]');
  if (!article) return;
  const key = article.dataset.reviewProgram;
  const cfg = window.SITE_CONFIG || {};
  const program = cfg.affiliatePrograms?.[key] || {};
  const url = String(program.url || '').trim();
  if (!url) return;

  document.querySelectorAll('[data-review-affiliate]').forEach(link => {
    link.href = url;
    link.target = '_blank';
    link.rel = 'sponsored nofollow noopener';
    link.referrerPolicy = program.referrerPolicy || 'no-referrer-when-downgrade';
    if (!link.dataset.reviewBound) {
      link.dataset.reviewBound = '1';
      link.addEventListener('click', () => {
        const placement = link.dataset.placement || 'service_review';
        window.trackSiteEvent?.('affiliate_click', { program:key, page:location.pathname, placement });
        window.trackSiteEvent?.('service_review_cta_click', { program:key, page:location.pathname, placement });
      });
    }
  });

  document.querySelectorAll('[data-review-internal]').forEach(link => {
    if (link.dataset.reviewInternalBound) return;
    link.dataset.reviewInternalBound = '1';
    link.addEventListener('click', () => window.trackSiteEvent?.('service_review_internal_click', {
      program:key,
      page:location.pathname,
      to_url:link.getAttribute('href') || ''
    }));
  });

  const pixel = String(program.impressionPixel || '').trim();
  if (pixel && !document.querySelector('[data-review-impression]')) {
    const img = document.createElement('img');
    img.src = pixel;
    img.width = 1;
    img.height = 1;
    img.alt = '';
    img.decoding = 'async';
    img.referrerPolicy = program.referrerPolicy || 'no-referrer-when-downgrade';
    img.dataset.reviewImpression = '1';
    img.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;';
    document.body.appendChild(img);
  }
})();
