window.SITE_CONFIG = {
  siteName: "工場キャリア診断",
  affiliateUrl: "",
  affiliateServiceName: "メーカー・製造業特化の転職支援サービス",
  analytics: { ga4MeasurementId: "G-MR6KP8HJNR" },
  affiliatePrograms: {
    makersJob: {
      name: "メーカーズジョブ",
      url: "https://px.a8.net/svt/ejp?a8mat=4BCA79+GHL6WI+5B0Y+TRVYQ",
      impressionPixel: "https://www15.a8.net/0.gif?a8mat=4BCA79+GHL6WI+5B0Y+TRVYQ"
    },
    samuraiJob: {
      name: "Samurai Job",
      url: "https://h.accesstrade.net/sp/cc?rk=0100q6np00oyrf",
      impressionPixel: "https://h.accesstrade.net/sp/rr?rk=0100q6np00oyrf",
      referrerPolicy: "no-referrer-when-downgrade"
    },
    magicari: { name: "マジキャリ", url: "" },
    zen: { name: "ZENの退職代行", url: "" }
  },
  articleProgramPriority: {
    "factory-quit.html": ["makersJob", "zen"], "night-shift-hard.html": ["makersJob", "zen"],
    "manufacturing-30s.html": ["makersJob", "samuraiJob"], "production-tech-career.html": ["makersJob", "samuraiJob"],
    "quality-quit.html": ["makersJob", "samuraiJob"], "manufacturing-500-income.html": ["samuraiJob", "makersJob"],
    "manufacturing-other-industry.html": ["magicari", "makersJob"], "period-worker-next.html": ["makersJob", "magicari"],
    "manufacturing-agent-guide.html": ["makersJob", "samuraiJob", "magicari"], "production-tech-agent.html": ["samuraiJob", "makersJob"],
    "quality-agent.html": ["samuraiJob", "makersJob"], "factory-salary-up.html": ["samuraiJob", "makersJob"],
    "factory-day-shift-job.html": ["makersJob"], "factory-permanent-employee.html": ["makersJob", "magicari"],
    "maintenance-career.html": ["makersJob", "samuraiJob"], "machine-design-career.html": ["samuraiJob", "makersJob"],
    "electrical-design-career.html": ["samuraiJob", "makersJob"], "production-control-career.html": ["makersJob", "samuraiJob"],
    "quality-assurance-career.html": ["samuraiJob", "makersJob"], "inspection-career.html": ["makersJob"],
    "operator-quit.html": ["makersJob", "magicari"], "line-work-quit.html": ["makersJob", "magicari"],
    "factory-overtime.html": ["makersJob"], "factory-holidays.html": ["makersJob"], "factory-body-hard.html": ["makersJob", "magicari"],
    "factory-no-future.html": ["makersJob", "magicari"], "factory-resignation-reasons.html": ["makersJob", "zen"],
    "factory-shift-change.html": ["makersJob"], "factory-commute-long.html": ["makersJob"], "factory-small-company.html": ["makersJob", "samuraiJob"],
    "assembly-career.html": ["makersJob"], "automotive-parts-career.html": ["makersJob", "samuraiJob"],
    "manufacturing-20s.html": ["makersJob", "magicari"], "manufacturing-50s.html": ["makersJob"],
    "factory-night-to-day.html": ["makersJob"], "factory-bonus-low.html": ["makersJob", "samuraiJob"],
    "factory-resume.html": ["samuraiJob", "makersJob"], "factory-interview.html": ["samuraiJob", "makersJob"],
    "factory-job-offer-check.html": ["samuraiJob", "makersJob"],
    "plc-career.html": ["samuraiJob", "makersJob"], "maintenance-qualification.html": ["samuraiJob", "makersJob"],
    "production-tech-overseas-travel.html": ["samuraiJob", "makersJob"], "quality-claim-hard.html": ["samuraiJob", "makersJob"],
    "quality-audit-hard.html": ["samuraiJob", "makersJob"], "production-control-overtime.html": ["samuraiJob", "makersJob"],
    "manufacturing-supervisor-career.html": ["samuraiJob", "makersJob"]
  },
  disclosure: "当サイトはアフィリエイト広告を利用しています。"
};

// Cloudflare Pages serves HTML files at clean URLs (for example, /articles/foo).
// Keep affiliate routing compatible with both legacy .html paths and the live clean paths.
Object.entries(window.SITE_CONFIG.articleProgramPriority || {}).forEach(([key, value]) => {
  if (key.endsWith('.html')) {
    const cleanKey = key.slice(0, -5);
    if (!window.SITE_CONFIG.articleProgramPriority[cleanKey]) {
      window.SITE_CONFIG.articleProgramPriority[cleanKey] = value;
    }
  }
});

// Normalize browser-visible internal links and canonical signals to the URL that Cloudflare actually serves.
(() => {
  const SITE = 'https://factory-career-site.pages.dev';
  const cleanPath = value => {
    try {
      const u = new URL(value, location.href);
      if (u.origin !== location.origin) return value;
      if (/\/index\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\/index\.html$/i, '/');
      else if (/\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\.html$/i, '');
      return u.pathname + u.search + u.hash;
    } catch (_) {
      return value;
    }
  };
  const cleanAbsolute = value => {
    try {
      const u = new URL(value, location.href);
      if (u.origin !== location.origin) return value;
      if (/\/index\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\/index\.html$/i, '/');
      else if (/\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\.html$/i, '');
      return SITE + u.pathname + u.search + u.hash;
    } catch (_) {
      return value;
    }
  };
  const apply = () => {
    document.querySelectorAll('a[href]').forEach(a => {
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:)/i.test(raw)) return;
      try {
        const u = new URL(raw, location.href);
        if (u.origin === location.origin) a.setAttribute('href', cleanPath(raw));
      } catch (_) { }
    });
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = cleanAbsolute(canonical.href);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl?.content) ogUrl.content = cleanAbsolute(ogUrl.content);
  };
  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
})();

setTimeout(() => {
  const path = window.location.pathname;
  if (!path.includes('/articles/') || path.endsWith('/articles/') || path.endsWith('/articles/index.html')) return;
  const alreadyLoaded = [...document.scripts].some(s => /\/assets\/offers\.js(?:\?|$)/.test(s.src));
  if (alreadyLoaded || document.querySelector('[data-auto-offers-script]')) return;
  const script = document.createElement('script');
  script.src = '../assets/offers.js';
  script.dataset.autoOffersScript = '';
  document.body.appendChild(script);
}, 0);

setTimeout(() => {
  const path = window.location.pathname;
  if (!path.includes('/articles/')) return;
  const alreadyLoaded = [...document.scripts].some(s => /\/assets\/seo-clusters\.js(?:\?|$)/.test(s.src));
  if (alreadyLoaded || document.querySelector('[data-auto-seo-clusters-script]')) return;
  const script = document.createElement('script');
  script.src = '../assets/seo-clusters.js';
  script.dataset.autoSeoClustersScript = '';
  document.body.appendChild(script);
}, 0);

setTimeout(() => {
  if (document.querySelector('[data-auto-seo-enhance-script]')) return;
  const script = document.createElement('script');
  script.src = '/assets/seo-enhance.js';
  script.dataset.autoSeoEnhanceScript = '';
  document.body.appendChild(script);
}, 0);

(() => {
  if (document.querySelector('link[data-colorful-theme]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/assets/colorful.css';
  link.dataset.colorfulTheme = '';
  document.head.appendChild(link);
})();

setTimeout(() => {
  if (document.querySelector('[data-auto-discovery-hubs-script]')) return;
  const script = document.createElement('script');
  script.src = '/assets/discovery-hubs.js';
  script.dataset.autoDiscoveryHubsScript = '';
  document.body.appendChild(script);
}, 0);

setTimeout(() => {
  if (document.querySelector('[data-auto-seo-architecture-script]')) return;
  const script = document.createElement('script');
  script.src = '/assets/seo-architecture.js';
  script.dataset.autoSeoArchitectureScript = '';
  document.body.appendChild(script);
}, 0);

setTimeout(() => {
  if (document.querySelector('[data-auto-clean-url-seo-script]')) return;
  const script = document.createElement('script');
  script.src = '/assets/clean-url-seo.js';
  script.dataset.autoCleanUrlSeoScript = '';
  document.body.appendChild(script);
}, 0);

setTimeout(() => {
  const path = window.location.pathname;
  if (!path.includes('/articles/') || path.endsWith('/articles/')) return;
  if (document.querySelector('[data-auto-pillar-content-script]')) return;
  const script = document.createElement('script');
  script.src = '/assets/pillar-content.js';
  script.dataset.autoPillarContentScript = '';
  document.body.appendChild(script);
}, 0);