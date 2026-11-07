(() => {
  if (window.__factoryAnalyticsLoaded) return;
  window.__factoryAnalyticsLoaded = true;

  const cfg = window.SITE_CONFIG?.analytics || {};
  const path = location.pathname;
  const browserKey = 'fc_browser_id';
  const sessionKey = 'fc_session_id';
  const ownerExcludedKey = 'fc_owner_excluded';
  const query = new URLSearchParams(location.search);
  const automated = navigator.webdriver === true || /bot|crawler|spider|slurp|bingpreview|google-inspectiontool|lighthouse|pagespeed|headless|phantom|selenium|puppeteer|playwright|facebookexternalhit|twitterbot|linkedinbot|discordbot|uptimerobot|pingdom|monitor/i.test(navigator.userAgent || '');
  const excluded = () => {
    if (automated || query.get('qa') === '1' || query.get('ops_qa') === '1') return true;
    try { return localStorage.getItem(ownerExcludedKey) === '1' || localStorage.getItem('ops_owner_excluded') === '1' || /(?:^|;\s*)ops_owner_excluded=1(?:;|$)/.test(document.cookie); } catch (_) { return true; }
  };
  try {
    const ownerParams = new URLSearchParams(location.search);
    if (ownerParams.get('ops_owner') === '1') {
      localStorage.setItem(ownerExcludedKey, '1');
      localStorage.setItem('ops_owner_excluded', '1');
      ownerParams.delete('ops_owner');
      const q = ownerParams.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
    }
  } catch (_) {}
  if (excluded()) { window.trackSiteEvent = () => {}; return; }

  function randomId(prefix) {
    const id = crypto.randomUUID ? crypto.randomUUID() :
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    return prefix + id;
  }
  function storedId(storage, key, prefix) {
    try {
      let id = storage.getItem(key);
      if (!id) { id = randomId(prefix); storage.setItem(key, id); }
      return id;
    } catch (_) { return randomId(prefix); }
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
  const campaignValue = value => /^[a-z0-9_.-]{1,80}$/i.test(value || '') ? value : '';
  const attribution = {
    landing_page: sessionStorage.getItem('fc_landing_page') || path,
    first_referrer: sessionStorage.getItem('fc_first_referrer') || safeReferrer,
    utm_source: campaignValue(params.get('utm_source') || sessionStorage.getItem('fc_utm_source')),
    utm_medium: campaignValue(params.get('utm_medium') || sessionStorage.getItem('fc_utm_medium')),
    utm_campaign: campaignValue(params.get('utm_campaign') || sessionStorage.getItem('fc_utm_campaign'))
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
    'scroll_depth','engaged_30s','affiliate_click_unified','comparison_page_click',
    'diagnosis_entry_click','tool_entry_click','internal_navigation','external_link_click','affiliate_offer_view',
    'diagnosis_start','diagnosis_complete','diagnosis_result_view'
  ]);
  const funnelEvents = new Set(['diagnosis_start','diagnosis_complete','diagnosis_result_view']);
  const funnelQueue = [];
  if (!window.__centralOpsTracker && !document.querySelector('[data-factory-central]')) {
    const script = document.createElement('script');
    script.src = '/assets/central-tracker.js';
    script.dataset.site = 'factory';
    script.dataset.factoryCentral = '';
    script.onload = () => funnelQueue.splice(0).forEach(name => window.trackCentralOps?.(name));
    document.head.appendChild(script);
  }

  function collect(eventName, detail={}) {
    if (excluded()) return;
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
    if (excluded()) return;
    const payload = common(detail);
    originalTrack(name, payload);
    try { window.posthog?.capture?.(name, payload); } catch (_) {}
    if (d1Events.has(name)) collect(name, detail);
    if (funnelEvents.has(name)) {
      if (window.trackCentralOps) window.trackCentralOps(name);
      else funnelQueue.push(name);
    }
  };

  collect('page_view', {});
  window.trackSiteEvent('site_page_context', {referrer_type:safeReferrer || 'direct',title:document.title});

  const sentDepths = new Set();
  function trackDepth() {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    const pct = Math.min(100, Math.round((scrollY / max) * 100));
    [25,50,75,90].forEach(mark => {
      if (pct >= mark && !sentDepths.has(mark)) {
        sentDepths.add(mark);
        window.trackSiteEvent('scroll_depth', {percent:mark});
      }
    });
  }
  addEventListener('scroll', trackDepth, {passive:true});
  trackDepth();

  setTimeout(() => {
    if (!document.hidden) window.trackSiteEvent('engaged_30s', {});
  }, 30000);

  function affiliateProgram(link) {
    if (link.dataset.program) return link.dataset.program;
    if (link.matches('[data-rakuten-link]') || link.closest('[data-rakuten-card]')) return 'rakuten';
    const card = link.closest('[data-program-card],[data-review-program]');
    const fromData = card?.dataset?.programCard || card?.dataset?.reviewProgram || '';
    if (fromData) return fromData;
    const href = link.href || '';
    if (href.includes('0100q5')) return 'zen';
    if (href.includes('0100q6np') || href.includes('samuraijob')) return 'samuraiJob';
    if (href.includes('a8.net') || href.includes('makers-job')) return 'makersJob';
    return 'other';
  }

  function trackLink(e) {
    if (!e.isTrusted || (e.type === 'auxclick' ? e.button !== 1 : e.button !== 0)) return;
    const link = e.target.closest('a[href]');
    if (!link) return;
    let target;
    try { target = new URL(link.href, location.href); } catch (_) { return; }

    const placement = link.dataset.placement
      || link.closest('[data-program-card]')?.dataset?.programCard
      || link.closest('[data-rakuten-card]')?.dataset?.rakutenCard
      || link.closest('section')?.className
      || 'link';

    const rakutenAffiliate = link.matches('[data-rakuten-link]') && link.dataset.affiliateActive === '1';
    const knownAffiliate = target.origin !== location.origin && (link.matches('[data-program-link],[data-review-affiliate],[data-affiliate-link]')
      || target.hostname.includes('a8.net')
      || target.hostname.includes('accesstrade.net')
      || rakutenAffiliate);

    if (knownAffiliate) {
      window.trackSiteEvent('affiliate_click_unified', {
        program: affiliateProgram(link),
        placement: String(placement).slice(0,100),
        variant: link.dataset.affiliateVariant || '',
        outbound_domain: target.hostname
      });
      return;
    }

    if (target.origin === location.origin) {
      const to = target.pathname;
      window.trackSiteEvent('internal_navigation', {to_path:to,placement:String(placement).slice(0,100)});
      if (to.includes('/articles/manufacturing-agent-guide')) window.trackSiteEvent('comparison_page_click', {to_path:to});
      if (to.includes('/diagnosis')) window.trackSiteEvent('diagnosis_entry_click', {to_path:to});
      if (to.includes('/tools/')) window.trackSiteEvent('tool_entry_click', {to_path:to});
    } else {
      window.trackSiteEvent('external_link_click', {outbound_domain:target.hostname});
    }
  }
  document.addEventListener('click', trackLink, true);
  document.addEventListener('auxclick', trackLink, true);

  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const pending = new Map();
    const selector = '[data-program-link],[data-review-affiliate],[data-affiliate-link],[data-rakuten-link][data-affiliate-active="1"]';
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const el = entry.target;
        clearTimeout(pending.get(el)); pending.delete(el);
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || document.hidden) return;
        const key = affiliateProgram(el);
        const placement = el.dataset.placement || 'offer';
        const id = key + ':' + path + ':' + placement + ':' + (el.closest('[data-rakuten-card]')?.dataset.rakutenCard || '');
        if (!key || seen.has(id) || el.closest('[hidden]')) return;
        pending.set(el, setTimeout(() => {
          pending.delete(el);
          if (document.hidden || !el.isConnected || el.closest('[hidden]') || seen.has(id)) return;
          seen.add(id);
          window.trackSiteEvent('affiliate_offer_view', {program:key,placement,variant:el.dataset.affiliateVariant || ''});
          io.unobserve(el);
        }, 1000));
      });
    }, {threshold:[0,0.5]});
    const watch = root => {
      const observe = el => { try { if(new URL(el.href,location.href).origin!==location.origin)io.observe(el); } catch (_) {} };
      if (root.matches?.(selector)) observe(root);
      root.querySelectorAll?.(selector).forEach(observe);
    };
    watch(document);
    new MutationObserver(list => list.forEach(change => {
      if (change.type === 'attributes') watch(change.target);
      change.addedNodes.forEach(node => { if (node.nodeType === 1) watch(node); });
    })).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-affiliate-active']});
    document.addEventListener('visibilitychange', () => {
      pending.forEach(clearTimeout); pending.clear();
      if (!document.hidden) document.querySelectorAll(selector).forEach(el => { io.unobserve(el); io.observe(el); });
    });
  }
})();
