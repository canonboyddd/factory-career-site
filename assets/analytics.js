(() => {
  if (window.__factoryAnalyticsLoaded) return;
  window.__factoryAnalyticsLoaded = true;

  const cfg = window.SITE_CONFIG?.analytics || {};
  const path = location.pathname;
  const browserKey = 'fc_browser_id';
  const sessionKey = 'fc_session_id';
  const ownerExcludedKey = 'fc_owner_excluded';

  function randomId(prefix) {
    const id = crypto.randomUUID ? crypto.randomUUID() :
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    return prefix + id;
  }
  function storedId(storage, key, prefix) {
    let id = storage.getItem(key);
    if (!id) {
      id = randomId(prefix);
      storage.setItem(key, id);
    }
    return id;
  }
  const browserId = storedId(localStorage, browserKey, 'b-');
  const sessionId = storedId(sessionStorage, sessionKey, 's-');
  const deviceType = innerWidth <= 767 ? 'mobile' : innerWidth <= 1100 ? 'tablet' : 'desktop';
  const pageName = path.split('/').filter(Boolean).pop() || 'home';
  const pageType = path === '/' ? 'home'
    : path.startsWith('/articles/') ? 'article'
    : path.startsWith('/tools/') ? 'tool'
    : path === '/diagnosis' ? 'diagnosis'
    : /guide$/.test(pageName) ? 'hub'
    : ['privacy','disclaimer','editorial-policy','sources','about','site-map'].includes(pageName) ? 'policy'
    : 'page';

  const safeReferrer = (() => {
    try {
      if (!document.referrer) return '';
      const u = new URL(document.referrer);
      return u.hostname === location.hostname ? 'internal' : u.hostname;
    } catch (_) { return ''; }
  })();

  const params = new URLSearchParams(location.search);
  const attribution = {
    landing_page: sessionStorage.getItem('fc_landing_page') || path,
    first_referrer: sessionStorage.getItem('fc_first_referrer') || safeReferrer,
    utm_source: params.get('utm_source') || sessionStorage.getItem('fc_utm_source') || '',
    utm_medium: params.get('utm_medium') || sessionStorage.getItem('fc_utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || sessionStorage.getItem('fc_utm_campaign') || ''
  };
  if (!sessionStorage.getItem('fc_landing_page')) {
    sessionStorage.setItem('fc_landing_page', path);
    sessionStorage.setItem('fc_first_referrer', safeReferrer);
    if (attribution.utm_source) sessionStorage.setItem('fc_utm_source', attribution.utm_source);
    if (attribution.utm_medium) sessionStorage.setItem('fc_utm_medium', attribution.utm_medium);
    if (attribution.utm_campaign) sessionStorage.setItem('fc_utm_campaign', attribution.utm_campaign);
  }

  function common(extra={}) {
    return {
      page_path: path,
      page_name: pageName,
      page_type: pageType,
      ...attribution,
      ...extra
    };
  }

  const d1Events = new Set([
    'scroll_depth',
    'engaged_30s',
    'affiliate_click_unified',
    'comparison_page_click',
    'diagnosis_entry_click',
    'tool_entry_click',
    'internal_navigation',
    'external_link_click',
    'affiliate_offer_view'
  ]);

  function collect(eventName, detail={}) {
    if (localStorage.getItem(ownerExcludedKey) === '1') return;
    const payload = {
      event_name: eventName,
      browser_id: browserId,
      session_id: sessionId,
      page_path: path,
      page_name: pageName,
      page_type: pageType,
      page_title: document.title,
      device_type: deviceType,
      ...attribution,
      ...detail
    };
    try {
      fetch('/api/analytics/collect', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload),
        keepalive:true,
        credentials:'same-origin'
      }).catch(()=>{});
    } catch (_) {}
  }

  const originalTrack = window.trackSiteEvent || function(name, detail={}) {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag === 'function') window.gtag('event', name, detail);
    else window.dataLayer.push({event:name, ...detail});
  };

  function loadPostHog() {
    const key = String(cfg.posthogProjectKey || '').trim();
    const host = String(cfg.posthogHost || 'https://us.i.posthog.com').trim();
    if (!key || window.posthog) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://us-assets.i.posthog.com/static/array.js';
    s.onload = () => {
      try {
        window.posthog?.init?.(key, {
          api_host: host,
          person_profiles: 'identified_only',
          autocapture: true,
          capture_pageview: true,
          capture_pageleave: true,
          disable_session_recording: false,
          persistence: 'localStorage+cookie'
        });
      } catch (_) {}
    };
    document.head.appendChild(s);
  }
  loadPostHog();

  window.trackSiteEvent = function(name, detail={}) {
    const payload = common(detail);
    originalTrack(name, payload);
    try { window.posthog?.capture?.(name, payload); } catch (_) {}
    if (d1Events.has(name)) collect(name, detail);
  };

  collect('page_view', {});
  window.trackSiteEvent('site_page_context', {
    referrer_type: safeReferrer || 'direct',
    title: document.title
  });

  const sentDepths = new Set();
  function trackDepth() {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    const pct = Math.min(100, Math.round((scrollY / max) * 100));
    [25,50,75,90].forEach(mark => {
      if (pct >= mark && !sentDepths.has(mark)) {
        sentDepths.add(mark);
        window.trackSiteEvent('scroll_depth', { percent: mark });
      }
    });
  }
  addEventListener('scroll', trackDepth, {passive:true});
  trackDepth();

  setTimeout(() => {
    if (!document.hidden) window.trackSiteEvent('engaged_30s', {});
  }, 30000);

  function affiliateProgram(link) {
    const card = link.closest('[data-program-card],[data-review-program]');
    const fromData = card?.dataset?.programCard || card?.dataset?.reviewProgram || '';
    if (fromData) return fromData;
    const href = link.href || '';
    if (href.includes('a8.net') || href.includes('makers-job')) return 'makersJob';
    if (href.includes('accesstrade.net') || href.includes('samuraijob')) return 'samuraiJob';
    return 'other';
  }

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    let target;
    try { target = new URL(link.href, location.href); } catch (_) { return; }

    const placement = link.dataset.placement
      || link.closest('[data-program-card]')?.dataset?.programCard
      || link.closest('section')?.className
      || 'link';

    if (
      link.matches('[data-program-link],[data-review-affiliate],[data-affiliate-link]') ||
      target.hostname.includes('a8.net') ||
      target.hostname.includes('accesstrade.net')
    ) {
      window.trackSiteEvent('affiliate_click_unified', {
        program: affiliateProgram(link),
        placement: String(placement).slice(0,100),
        outbound_domain: target.hostname
      });
      return;
    }

    if (target.origin === location.origin) {
      const to = target.pathname;
      window.trackSiteEvent('internal_navigation', {
        to_path: to,
        placement: String(placement).slice(0,100)
      });
      if (to.includes('/articles/manufacturing-agent-guide')) {
        window.trackSiteEvent('comparison_page_click', { to_path: to });
      }
      if (to.includes('/diagnosis')) {
        window.trackSiteEvent('diagnosis_entry_click', { to_path: to });
      }
      if (to.includes('/tools/')) {
        window.trackSiteEvent('tool_entry_click', { to_path: to });
      }
    } else {
      window.trackSiteEvent('external_link_click', { outbound_domain: target.hostname });
    }
  }, true);

  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return;
        const el = entry.target;
        const key = el.dataset.programCard || el.closest('[data-review-program]')?.dataset?.reviewProgram || '';
        const id = key + ':' + path + ':' + (el.dataset.placement || el.className);
        if (!key || seen.has(id)) return;
        seen.add(id);
        window.trackSiteEvent('affiliate_offer_view', { program:key, placement: el.dataset.placement || 'offer' });
      });
    }, {threshold:[0.35]});
    document.querySelectorAll('[data-program-card]:not([hidden]), [data-review-affiliate]').forEach(el => io.observe(el));
  }
})();
