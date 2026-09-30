const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};
const check = (condition, message) => {
  if (!condition) fail(message);
  else console.log(`PASS: ${message}`);
};

const robots = read('robots.txt');
const headers = read('_headers');
const sitemap = read('sitemap.xml');
const coreSitemap = read('sitemap-core.xml');

const blockedPaths = [
  '/admin-analytics',
  '/admin-seo',
  '/ops-dashboard',
  '/rakuten-check',
  '/api/admin/',
  '/shorts-content-factory/',
  '/shorts-content-factory-audit/'
];

for (const p of blockedPaths) {
  check(robots.includes(`Disallow: ${p}`), `robots.txt blocks ${p}`);
}

const headerNoindexPaths = [
  '/admin-analytics',
  '/admin-analytics.html',
  '/admin-seo',
  '/admin-seo.html',
  '/ops-dashboard',
  '/ops-dashboard.html',
  '/rakuten-check.html',
  '/shorts-content-factory/*',
  '/shorts-content-factory-audit/*'
];

for (const p of headerNoindexPaths) {
  const start = headers.indexOf(`\n${p}\n`) >= 0 ? headers.indexOf(`\n${p}\n`) : headers.indexOf(`${p}\n`);
  check(start >= 0, `_headers has rule for ${p}`);
  if (start >= 0) {
    const block = headers.slice(start, headers.indexOf('\n\n', start) >= 0 ? headers.indexOf('\n\n', start) : headers.length);
    check(block.includes('X-Robots-Tag: noindex'), `${p} sends X-Robots-Tag noindex`);
  }
}

const priorityPages = [
  ['salary-guide.html', 'https://factory-career-site.pages.dev/salary-guide'],
  ['articles/manufacturing-role-salary-comparison.html', 'https://factory-career-site.pages.dev/articles/manufacturing-role-salary-comparison'],
  ['articles/production-tech-salary.html', 'https://factory-career-site.pages.dev/articles/production-tech-salary'],
  ['articles/maintenance-salary.html', 'https://factory-career-site.pages.dev/articles/maintenance-salary'],
  ['articles/quality-salary.html', 'https://factory-career-site.pages.dev/articles/quality-salary'],
  ['articles/production-control-salary.html', 'https://factory-career-site.pages.dev/articles/production-control-salary'],
  ['articles/production-tech-hard.html', 'https://factory-career-site.pages.dev/articles/production-tech-hard'],
  ['articles/maintenance-hard.html', 'https://factory-career-site.pages.dev/articles/maintenance-hard'],
  ['articles/quality-quit.html', 'https://factory-career-site.pages.dev/articles/quality-quit'],
  ['articles/production-control-overtime.html', 'https://factory-career-site.pages.dev/articles/production-control-overtime']
];

for (const [file, canonical] of priorityPages) {
  const html = read(file);
  check(html.includes(`rel=\"canonical\" href=\"${canonical}\"`) || html.includes(`rel="canonical" href="${canonical}"`), `${file} canonical is correct`);
  check(!/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html), `${file} is not noindex`);
  check(sitemap.includes(`<loc>${canonical}</loc>`), `${file} is in sitemap.xml`);
  check(coreSitemap.includes(`<loc>${canonical}</loc>`), `${file} is in sitemap-core.xml`);
}

const salaryGuide = read('salary-guide.html');
const salaryLinks = [
  '/articles/manufacturing-role-salary-comparison',
  '/articles/production-tech-salary',
  '/articles/maintenance-salary',
  '/articles/quality-salary',
  '/articles/production-control-salary'
];
for (const href of salaryLinks) {
  check(salaryGuide.includes(`href=\"${href}\"`) || salaryGuide.includes(`href="${href}"`), `salary-guide links to ${href}`);
}

const productionControlOvertime = read('articles/production-control-overtime.html');
check(productionControlOvertime.includes('生産管理は残業が多い？'), 'production-control-overtime targets the main residual-work query');
check(productionControlOvertime.includes('/articles/production-control-salary'), 'production-control-overtime links to salary page');
check(productionControlOvertime.includes('/articles/production-control-career'), 'production-control-overtime links to career page');
check(productionControlOvertime.includes('shigoto.mhlw.go.jp/User/Occupation/Detail/437'), 'production-control-overtime cites job tag');

const forbiddenInSitemap = [
  '/admin-analytics',
  '/admin-seo',
  '/ops-dashboard',
  '/rakuten-check',
  '/shorts-content-factory/',
  '/shorts-content-factory-audit/'
];
for (const p of forbiddenInSitemap) {
  check(!sitemap.includes(p), `sitemap.xml excludes ${p}`);
  check(!coreSitemap.includes(p), `sitemap-core.xml excludes ${p}`);
}

if (!process.exitCode) {
  console.log('Factory career SEO core QA passed.');
}
