window.SITE_CONFIG = {
  siteName: "工場キャリア診断",
  affiliateUrl: "",
  affiliateServiceName: "メーカー・製造業特化の転職支援サービス",
  analytics: { ga4MeasurementId: "G-MR6KP8HJNR", posthogProjectKey: "", posthogHost: "https://us.i.posthog.com" },
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
    zen: {
      name: "ZENの退職代行",
      url: "https://h.accesstrade.net/sp/cc?rk=0100q5pa00oyrf",
      impressionPixel: "https://h.accesstrade.net/sp/rr?rk=0100q5pa00oyrf",
      referrerPolicy: "no-referrer-when-downgrade",
      banners: {
        small: { url: "https://h.accesstrade.net/sp/cc?rk=0100q5nd00oyrf", image: "https://h.accesstrade.net/sp/rr?rk=0100q5nd00oyrf", width: 120, height: 60 },
        large: { url: "https://h.accesstrade.net/sp/cc?rk=0100q5ne00oyrf", image: "https://h.accesstrade.net/sp/rr?rk=0100q5ne00oyrf", width: 300, height: 250 },
        square: { url: "https://h.accesstrade.net/sp/cc?rk=0100q5nf00oyrf", image: "https://h.accesstrade.net/sp/rr?rk=0100q5nf00oyrf", width: 250, height: 250 }
      }
    }
  },
  articleProgramPriority: {
    "factory-quit.html": ["makersJob", "zen"], "night-shift-hard.html": ["makersJob", "zen"],
    "manufacturing-30s.html": ["makersJob", "samuraiJob"], "production-tech-career.html": ["makersJob", "samuraiJob"],
    "quality-quit.html": ["makersJob", "zen", "samuraiJob"], "manufacturing-500-income.html": ["samuraiJob", "makersJob"],
    "manufacturing-other-industry.html": ["magicari", "makersJob"], "period-worker-next.html": ["makersJob", "magicari"],
    "manufacturing-agent-guide.html": ["makersJob", "samuraiJob", "magicari"], "production-tech-agent.html": ["samuraiJob", "makersJob"],
    "quality-agent.html": ["samuraiJob", "makersJob"], "factory-salary-up.html": ["samuraiJob", "makersJob"],
    "factory-day-shift-job.html": ["makersJob"], "factory-permanent-employee.html": ["makersJob", "magicari"],
    "maintenance-career.html": ["makersJob", "samuraiJob"], "machine-design-career.html": ["samuraiJob", "makersJob"],
    "electrical-design-career.html": ["samuraiJob", "makersJob"], "production-control-career.html": ["makersJob", "samuraiJob"],
    "quality-assurance-career.html": ["samuraiJob", "makersJob"], "inspection-career.html": ["makersJob"],
    "operator-quit.html": ["makersJob", "zen"], "line-work-quit.html": ["makersJob", "zen"],
    "factory-overtime.html": ["makersJob"], "factory-holidays.html": ["makersJob"], "factory-body-hard.html": ["makersJob", "zen"],
    "factory-no-future.html": ["makersJob", "zen"], "factory-resignation-reasons.html": ["makersJob", "zen"],
    "factory-shift-change.html": ["makersJob"], "factory-fixed-night-shift.html": ["makersJob", "zen"],
    "factory-commute-long.html": ["makersJob"], "factory-small-company.html": ["makersJob", "samuraiJob"],
    "assembly-career.html": ["makersJob"], "automotive-parts-career.html": ["makersJob", "samuraiJob"],
    "manufacturing-20s.html": ["makersJob", "magicari"], "manufacturing-50s.html": ["makersJob"],
    "factory-night-to-day.html": ["makersJob"], "factory-bonus-low.html": ["makersJob", "samuraiJob"],
    "factory-resume.html": ["samuraiJob", "makersJob"], "factory-interview.html": ["samuraiJob", "makersJob"],
    "factory-job-offer-check.html": ["samuraiJob", "makersJob"],
    "factory-human-relations.html": ["makersJob", "zen"], "factory-short-tenure-job-change.html": ["makersJob", "zen"],
    "plc-career.html": ["samuraiJob", "makersJob"], "maintenance-qualification.html": ["samuraiJob", "makersJob"],
    "production-tech-overseas-travel.html": ["samuraiJob", "makersJob"], "quality-claim-hard.html": ["samuraiJob", "makersJob"],
    "quality-audit-hard.html": ["samuraiJob", "makersJob"], "production-control-overtime.html": ["samuraiJob", "makersJob"],
    "manufacturing-supervisor-career.html": ["samuraiJob", "makersJob"], "factory-heat-hard.html": ["makersJob"]
  },
  disclosure: "当サイトはアフィリエイト広告を利用しています。"
};

Object.entries(window.SITE_CONFIG.articleProgramPriority || {}).forEach(([key, value]) => {
  if (!key.endsWith('.html')) return;
  const cleanKey = key.slice(0, -5);
  if (!window.SITE_CONFIG.articleProgramPriority[cleanKey]) window.SITE_CONFIG.articleProgramPriority[cleanKey] = value;
});

(() => {
  if (document.querySelector('link[data-colorful-theme]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = '/assets/colorful.css'; link.dataset.colorfulTheme = ''; document.head.appendChild(link);
})();

(() => {
  if (document.querySelector('link[data-rakuten-theme]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = '/assets/rakuten.css'; link.dataset.rakutenTheme = ''; document.head.appendChild(link);
})();

(() => {
  const SITE = 'https://factory-career-site.pages.dev';
  const clean = value => {
    try {
      const u = new URL(value, location.href);
      if (u.origin !== location.origin) return value;
      if (/\/index\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\/index\.html$/i, '/');
      else if (/\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\.html$/i, '');
      return u.pathname + u.search + u.hash;
    } catch (_) { return value; }
  };
  const apply = () => {
    document.querySelectorAll('a[href]').forEach(a => {
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:)/i.test(raw)) return;
      try { const u = new URL(raw, location.href); if (u.origin === location.origin) a.setAttribute('href', clean(raw)); } catch (_) { }
    });
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = SITE + clean(canonical.href).split('#')[0];
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl?.content) ogUrl.content = SITE + clean(ogUrl.content).split('#')[0];
  };
  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
})();

function loadSiteScript(src, marker) {
  return new Promise(resolve => {
    if ([...document.scripts].some(s => s.src && new URL(s.src, location.href).pathname === new URL(src, location.href).pathname) || document.querySelector(`[${marker}]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src; script.async = false; script.setAttribute(marker, ''); script.onload = () => resolve(); script.onerror = () => resolve(); document.body.appendChild(script);
  });
}

async function bootstrapSiteEnhancements() {
  await loadSiteScript('/assets/analytics.js', 'data-auto-analytics-script');
  await loadSiteScript('/assets/rakuten-products.js', 'data-rakuten-products-script');
  const path = window.location.pathname;
  const isArticleDetail = path.includes('/articles/') && !path.endsWith('/articles/') && !/\/articles\/index(?:\.html)?$/i.test(path);
  if (isArticleDetail) {
    await loadSiteScript('/assets/offers.js', 'data-auto-offers-script');
    await loadSiteScript('/assets/pillar-content.js', 'data-auto-pillar-content-script');
  }
  await loadSiteScript('/assets/clean-url-seo.js', 'data-auto-clean-url-seo-script');
  await loadSiteScript('/assets/seo-enhance.js', 'data-auto-seo-enhance-script');
  await loadSiteScript('/assets/runtime-fixes.js', 'data-auto-runtime-fixes-script');
  await loadSiteScript('/assets/benchmark-layout.js', 'data-auto-benchmark-layout-script');
  await loadSiteScript('/assets/article-conversion-layout.js', 'data-auto-article-conversion-layout-script');
  await loadSiteScript('/assets/top-sites-layout.js', 'data-auto-top-sites-layout-script');
}
setTimeout(bootstrapSiteEnhancements, 0);
