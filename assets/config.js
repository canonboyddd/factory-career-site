window.SITE_CONFIG = {
  siteName: "工場キャリア診断",
  affiliateUrl: "",
  affiliateServiceName: "メーカー・製造業特化の転職支援サービス",
  analytics: { ga4MeasurementId: "" },
  affiliatePrograms: {
    makersJob: { name: "メーカーズジョブ", url: "" },
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

// Older article pages do not all include offers.js directly. After the parser
// finishes, load it once on article pages so approved programs can appear
// without rewriting every article whenever an ASP approves a new program.
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

// Build one consistent internal-link cluster across both old and newly added
// article pages. The article hub is included so priority pillar links sit close
// to the top of the site architecture.
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
