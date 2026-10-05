const fs = require('fs');

const HOST = 'https://factory-career-site.pages.dev';
const headers = fs.readFileSync('_headers', 'utf8');
const robots = fs.readFileSync('robots.txt', 'utf8');
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const core = fs.readFileSync('sitemap-core.xml', 'utf8');

const SUPPORTING_NOINDEX = [
  '/articles/factory-annual-holidays-check',
  '/articles/factory-bonus-offer-check',
  '/articles/factory-callout-duty-check',
  '/articles/factory-early-shift-check',
  '/articles/factory-late-shift-check',
  '/articles/factory-long-hours-offer-check',
  '/articles/factory-oncall-check',
  '/articles/factory-overtime-pay-check',
  '/articles/factory-paid-leave-check',
  '/articles/factory-salary-down-transfer-check',
  '/articles/factory-transfer-policy-check',
  '/articles/factory-weekend-shift-check',
  '/articles/manufacturing-allowances-check',
  '/articles/manufacturing-base-salary-check',
  '/articles/production-tech-business-travel-check'
];

const CORE_INDEXABLE = [
  '/',
  '/articles/',
  '/job-change-guide',
  '/salary-guide',
  '/career-guide',
  '/articles/factory-quit',
  '/articles/night-shift-hard',
  '/articles/factory-white-company',
  '/articles/manufacturing-role-salary-comparison',
  '/articles/factory-job-offer-check',
  '/articles/manufacturing-agent-guide'
];

const errors = [];
const blockFor = path => {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = headers.match(new RegExp(`(?:^|\\n)${escaped}\\n([\\s\\S]*?)(?=\\n\\S|$)`, 'm'));
  return m ? m[1] : '';
};
const sitemapHas = (xml, path) => xml.includes(`<loc>${HOST}${path}</loc>`);

for (const path of SUPPORTING_NOINDEX) {
  const block = blockFor(path);
  if (!/X-Robots-Tag:\s*noindex,\s*follow/i.test(block)) {
    errors.push(`NOINDEX_HEADER_MISSING ${path}`);
  }
  if (sitemapHas(sitemap, path)) errors.push(`NOINDEX_IN_MAIN_SITEMAP ${path}`);
  if (sitemapHas(core, path)) errors.push(`NOINDEX_IN_CORE_SITEMAP ${path}`);

  const disallow = `Disallow: ${path}`;
  if (robots.includes(disallow)) errors.push(`NOINDEX_BLOCKED_BY_ROBOTS ${path}`);
}

for (const path of CORE_INDEXABLE) {
  const block = blockFor(path);
  if (/X-Robots-Tag:\s*noindex/i.test(block)) errors.push(`CORE_PAGE_NOINDEXED ${path}`);
  if (path !== '/' && robots.includes(`Disallow: ${path}`)) errors.push(`CORE_PAGE_ROBOTS_BLOCKED ${path}`);
  if (!sitemapHas(core, path)) errors.push(`CORE_PAGE_MISSING_FROM_CORE_SITEMAP ${path}`);
}

if (!/^User-agent:\s*\*/m.test(robots) || !/^Allow:\s*\/$/m.test(robots)) {
  errors.push('ROBOTS_PUBLIC_ALLOW_MISSING');
}

if (errors.length) {
  console.error(`Search quality focus QA failed: ${errors.length}`);
  errors.forEach(e => console.error('ERROR', e));
  process.exit(1);
}

console.log(`PASS: ${SUPPORTING_NOINDEX.length} supporting pages are noindex/follow and excluded from sitemaps.`);
console.log(`PASS: ${CORE_INDEXABLE.length} priority pages remain crawlable, indexable, and present in sitemap-core.`);
