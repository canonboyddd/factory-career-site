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
for (const p of blockedPaths) check(robots.includes(`Disallow: ${p}`), `robots.txt blocks ${p}`);

const headerNoindexPaths = [
  '/admin-analytics','/admin-analytics.html','/admin-seo','/admin-seo.html','/ops-dashboard','/ops-dashboard.html','/rakuten-check.html','/shorts-content-factory/*','/shorts-content-factory-audit/*'
];
for (const p of headerNoindexPaths) {
  const start = headers.indexOf(`\n${p}\n`) >= 0 ? headers.indexOf(`\n${p}\n`) : headers.indexOf(`${p}\n`);
  check(start >= 0, `_headers has rule for ${p}`);
  if (start >= 0) {
    const end = headers.indexOf('\n\n', start) >= 0 ? headers.indexOf('\n\n', start) : headers.length;
    check(headers.slice(start, end).includes('X-Robots-Tag: noindex'), `${p} sends X-Robots-Tag noindex`);
  }
}

const priorityPages = [
  ['salary-guide.html','https://factory-career-site.pages.dev/salary-guide'],
  ['articles/manufacturing-role-salary-comparison.html','https://factory-career-site.pages.dev/articles/manufacturing-role-salary-comparison'],
  ['articles/production-tech-salary.html','https://factory-career-site.pages.dev/articles/production-tech-salary'],
  ['articles/maintenance-salary.html','https://factory-career-site.pages.dev/articles/maintenance-salary'],
  ['articles/quality-salary.html','https://factory-career-site.pages.dev/articles/quality-salary'],
  ['articles/production-control-salary.html','https://factory-career-site.pages.dev/articles/production-control-salary'],
  ['articles/factory-quit.html','https://factory-career-site.pages.dev/articles/factory-quit'],
  ['articles/night-shift-hard.html','https://factory-career-site.pages.dev/articles/night-shift-hard'],
  ['articles/factory-two-shift-hard.html','https://factory-career-site.pages.dev/articles/factory-two-shift-hard'],
  ['articles/factory-three-shift-hard.html','https://factory-career-site.pages.dev/articles/factory-three-shift-hard'],
  ['articles/factory-night-to-day.html','https://factory-career-site.pages.dev/articles/factory-night-to-day'],
  ['articles/factory-day-shift-job.html','https://factory-career-site.pages.dev/articles/factory-day-shift-job'],
  ['articles/factory-day-shift-salary-drop.html','https://factory-career-site.pages.dev/articles/factory-day-shift-salary-drop'],
  ['articles/factory-shift-change.html','https://factory-career-site.pages.dev/articles/factory-shift-change'],
  ['articles/production-tech-hard.html','https://factory-career-site.pages.dev/articles/production-tech-hard'],
  ['articles/maintenance-hard.html','https://factory-career-site.pages.dev/articles/maintenance-hard'],
  ['articles/quality-quit.html','https://factory-career-site.pages.dev/articles/quality-quit'],
  ['articles/production-control-overtime.html','https://factory-career-site.pages.dev/articles/production-control-overtime']
];
for (const [file, canonical] of priorityPages) {
  const html = read(file);
  check(html.includes(`rel=\"canonical\" href=\"${canonical}\"`) || html.includes(`rel="canonical" href="${canonical}"`), `${file} canonical is correct`);
  check(!/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html), `${file} is not noindex`);
  check(sitemap.includes(`<loc>${canonical}</loc>`), `${file} is in sitemap.xml`);
  check(coreSitemap.includes(`<loc>${canonical}</loc>`), `${file} is in sitemap-core.xml`);
}

const salaryGuide = read('salary-guide.html');
for (const href of ['/articles/manufacturing-role-salary-comparison','/articles/production-tech-salary','/articles/maintenance-salary','/articles/quality-salary','/articles/production-control-salary']) {
  check(salaryGuide.includes(`href=\"${href}\"`) || salaryGuide.includes(`href="${href}"`), `salary-guide links to ${href}`);
}

const factoryQuit = read('articles/factory-quit.html');
check(factoryQuit.includes('工場勤務を辞めたい人へ【2026年】'), 'factory-quit carries 2026 search freshness');
check(factoryQuit.includes('/articles/night-shift-hard'), 'factory-quit links to night-shift guide');
check(factoryQuit.includes('令和７年　雇用動向調査結果の概要'), 'factory-quit cites official employment trends');

const nightShiftHard = read('articles/night-shift-hard.html');
check(nightShiftHard.includes('夜勤がきつい・辞めたい人へ【2026年】'), 'night-shift-hard carries 2026 search freshness');
check(nightShiftHard.includes('健康づくりのための睡眠ガイド2023'), 'night-shift-hard cites official sleep guidance');
check(nightShiftHard.includes('/articles/factory-night-to-day'), 'night-shift-hard links to day-shift transition guide');

const nightCluster = [
  ['articles/factory-two-shift-hard.html','2交替勤務がきつい人へ【2026年】'],
  ['articles/factory-three-shift-hard.html','3交替勤務がきつい人へ【2026年】'],
  ['articles/factory-night-to-day.html','夜勤から日勤へ転職する方法【2026年】'],
  ['articles/factory-day-shift-job.html','工場の日勤のみ正社員求人【2026年】'],
  ['articles/factory-day-shift-salary-drop.html','夜勤から日勤で年収は下がる？【2026年】'],
  ['articles/factory-shift-change.html','交替勤務を辞めたい人へ【2026年】']
];
for (const [file, target] of nightCluster) {
  const html = read(file);
  check(html.includes(target), `${file} carries 2026 night-shift search intent`);
  check(html.includes('/articles/night-shift-hard'), `${file} links back to night-shift hub`);
  check(html.includes('mhlw.go.jp') || html.includes('check-roudou.mhlw.go.jp'), `${file} cites official MHLW guidance`);
}

const twoShift = read('articles/factory-two-shift-hard.html');
const threeShift = read('articles/factory-three-shift-hard.html');
const nightToDay = read('articles/factory-night-to-day.html');
const dayShiftJob = read('articles/factory-day-shift-job.html');
const dayShiftSalary = read('articles/factory-day-shift-salary-drop.html');
const shiftChange = read('articles/factory-shift-change.html');
check(twoShift.includes('/articles/factory-three-shift-hard'), 'two-shift guide links to three-shift guide');
check(twoShift.includes('/articles/factory-night-to-day'), 'two-shift guide links to day-shift transition');
check(threeShift.includes('/articles/factory-two-shift-hard'), 'three-shift guide links to two-shift guide');
check(threeShift.includes('/articles/factory-night-to-day'), 'three-shift guide links to day-shift transition');
check(nightToDay.includes('/articles/factory-two-shift-hard'), 'day-shift transition links to two-shift guide');
check(nightToDay.includes('/articles/factory-three-shift-hard'), 'day-shift transition links to three-shift guide');
check(dayShiftJob.includes('/articles/factory-day-shift-salary-drop'), 'day-shift job guide links to salary-drop guide');
check(dayShiftSalary.includes('/articles/factory-day-shift-job'), 'salary-drop guide links to day-shift job guide');
check(shiftChange.includes('/articles/factory-two-shift-hard') && shiftChange.includes('/articles/factory-three-shift-hard'), 'shift-change hub links to both shift guides');

const productionControlOvertime = read('articles/production-control-overtime.html');
check(productionControlOvertime.includes('生産管理は残業が多い？'), 'production-control-overtime targets the main residual-work query');
check(productionControlOvertime.includes('/articles/production-control-salary'), 'production-control-overtime links to salary page');
check(productionControlOvertime.includes('/articles/production-control-career'), 'production-control-overtime links to career page');
check(productionControlOvertime.includes('shigoto.mhlw.go.jp/User/Occupation/Detail/437'), 'production-control-overtime cites job tag');

for (const p of ['/admin-analytics','/admin-seo','/ops-dashboard','/rakuten-check','/shorts-content-factory/','/shorts-content-factory-audit/']) {
  check(!sitemap.includes(p), `sitemap.xml excludes ${p}`);
  check(!coreSitemap.includes(p), `sitemap-core.xml excludes ${p}`);
}

if (!process.exitCode) console.log('Factory career SEO core QA passed.');
