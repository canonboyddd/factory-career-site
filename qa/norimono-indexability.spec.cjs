const {test,expect}=require('@playwright/test');
const base='https://norimono-cost.com';
// Production indexability QA for canonical URLs, verification and priority sitemaps.

test.setTimeout(90000);

test('legacy html URLs permanently redirect to canonical extensionless URLs',async({request})=>{
  const cases=[['/index.html','/'],['/sell-car.html','/sell-car'],['/car-value.html','/car-value'],['/bike-value.html','/bike-value'],['/compare.html','/compare'],['/goods-guides/n-box.html','/goods-guides/n-box']];
  for(const [from,to] of cases){const r=await request.get(base+from,{maxRedirects:0});expect(r.status(),`${from}: permanent redirect`).toBe(301);const location=r.headers()['location']||'';expect(new URL(location,base).pathname,`${from}: redirect target`).toBe(to)}
});

test('extensionless public pages expose one exact canonical and remain indexable',async({page})=>{
  for(const route of ['/sell-car','/car-value','/bike-value','/cars/honda-n-box','/bikes/honda-rebel-250']){const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});expect(response?.status(),`${route}: status`).toBeLessThan(400);const robots=String(response?.headers()['x-robots-tag']||'');expect(robots,`${route}: X-Robots-Tag`).not.toMatch(/noindex/i);const canonicals=page.locator('link[rel="canonical"]');expect(await canonicals.count(),`${route}: canonical count`).toBe(1);await expect(canonicals).toHaveAttribute('href',base+route)}
});

test('Google ownership verification file remains directly accessible',async({request})=>{const r=await request.get(`${base}/google8d061a8385e0755b.html`,{maxRedirects:0});expect(r.status()).toBe(200);expect(await r.text()).toContain('google-site-verification')});

test('old Pages host permanently redirects to primary domain',async({request})=>{const r=await request.get('https://car-bike-cost-site.pages.dev/sell-car',{maxRedirects:0});expect(r.status()).toBe(301);expect(r.headers()['location']).toBe(`${base}/sell-car`)});

test('priority sitemap includes all strengthened vehicle SEO pages with fresh lastmod',async({request})=>{
  const r=await request.get(`${base}/vehicle-search-priority-v74-sitemap.xml`);expect(r.status()).toBe(200);const xml=await r.text();
  const routes=['/cars/toyota-prius','/cars/toyota-alphard','/cars/honda-n-box','/cars/toyota-hiace-wagon','/cars/toyota-harrier','/cars/toyota-sienta','/cars/suzuki-jimny','/cars/suzuki-spacia','/cars/daihatsu-tanto','/cars/honda-freed','/cars/toyota-aqua','/cars/honda-fit','/bikes/honda-rebel-250','/bikes/honda-pcx','/bikes/kawasaki-ninja-250','/bikes/honda-gb350','/bikes/yamaha-nmax','/bikes/yamaha-yzf-r25','/bikes/honda-super-cub-110','/bikes/honda-hunter-cub-ct125','/bikes/kawasaki-z900rs'];
  for(const route of routes)expect(xml,`priority sitemap: ${route}`).toContain(`<loc>${base}${route}</loc>`);
  expect(xml).toContain('<lastmod>2026-10-01</lastmod>');expect(xml).not.toMatch(/<loc>[^<]*\.html<\/loc>/i);
});

test('Search Console winner comparison pages expose tuned metadata and decision guide',async({page})=>{
  const cases=[
    ['/compare-guides/note-vs-aqua','ノートとアクアを比較｜維持費・燃費・5年総額はどっちが安い？','ノートとアクアを比較','/cars/nissan-note'],
    ['/compare-guides/prius-vs-aqua','プリウスとアクアを比較｜維持費・燃費・5年総額はどっちが安い？','プリウスとアクアを比較','/cars/toyota-prius']
  ];
  for(const [route,title,h1,vehicleHref] of cases){
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});expect(response?.status(),`${route}: status`).toBeLessThan(400);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('h1').first()).toContainText(h1);
    await expect(page.locator('[data-gsc-compare-v118="1"]'),`${route}: decision guide`).toBeVisible();
    expect(await page.locator(`[data-gsc-compare-v118="1"] a[href="${vehicleHref}"]`).count(),`${route}: vehicle internal link`).toBeGreaterThan(0);
    const canonical=page.locator('link[rel="canonical"]');expect(await canonical.count(),`${route}: canonical count`).toBe(1);await expect(canonical).toHaveAttribute('href',base+route);
  }
});

test('bike insurance targets age and engine-size search intent',async({page})=>{
  const route='/bike-insurance';
  const response=await page.goto(base+route,{waitUntil:'load',timeout:45000});expect(response?.status(),`${route}: status`).toBeLessThan(400);
  await expect(page).toHaveTitle('バイク任意保険の料金相場は？年齢・排気量別の目安と保険料シミュレーション');
  await expect(page.locator('h1').first()).toContainText('バイク任意保険の料金相場');
  await expect(page.locator('#age-cc')).toBeVisible();
  await expect(page.locator('#age-cc')).toContainText('20歳以下');
  await expect(page.locator('#age-cc')).toContainText('126〜250cc');
  await expect(page.locator('#bike-estimate')).toContainText('円');
  const canonical=page.locator('link[rel="canonical"]');expect(await canonical.count()).toBe(1);await expect(canonical).toHaveAttribute('href',base+route);
});
