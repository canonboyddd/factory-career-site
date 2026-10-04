import { chromium } from 'playwright';

const BASE='https://norimono-cost.com';
const ORIGIN=new URL(BASE).origin;
const START=`${BASE}/sitemap-index.xml`;
const failures=[];
const warnings=[];
const stats={};

function fail(kind,detail){failures.push({kind,detail:String(detail)});}
function warn(kind,detail){warnings.push({kind,detail:String(detail)});}
function urlsFromXml(xml){return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));}
async function getText(url){const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'NorimonoDeepAudit/1.0'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.text();}
async function collectSitemaps(){const seen=new Set(),pages=new Set(),queue=[START];while(queue.length){const u=queue.shift();if(seen.has(u))continue;seen.add(u);const xml=await getText(u);for(const loc of urlsFromXml(xml)){if(/\.xml(?:$|\?)/i.test(loc))queue.push(loc);else if(loc.startsWith(ORIGIN))pages.add(loc);}}return [...pages];}
function sameOriginHref(raw,base){try{const u=new URL(raw,base);if(u.origin!==ORIGIN)return null;if(!/^https?:$/.test(u.protocol))return null;u.hash='';return u.href;}catch{return null;}}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},userAgent:'NorimonoDeepAudit/1.0'});
await context.route('**/*',async route=>{const r=route.request();const t=r.resourceType();const u=r.url();if(['image','media','font'].includes(t))return route.abort();if(/\/api\/(?:analytics|ops-collect|central\/collect)/.test(u))return route.abort();return route.continue();});

// 1) Crawl every sitemap URL after JS execution. Collect uncaught errors, first-party 4xx/5xx and internal links.
const sitemapPages=await collectSitemaps();
stats.sitemapPages=sitemapPages.length;
const crawlTargets=[...new Set([...sitemapPages,`${BASE}/admin-feedback.html`,`${BASE}/this-page-should-not-exist-deep-audit`])];
const internalLinks=new Set();
let cursor=0;
async function crawlWorker(){
  const page=await context.newPage();
  let current='';
  const pageErrors=[];
  const badResponses=[];
  page.on('pageerror',e=>pageErrors.push({page:current,error:String(e?.message||e)}));
  page.on('response',r=>{try{const u=new URL(r.url());if(u.origin===ORIGIN&&r.status()>=400&&!/\/api\/(?:analytics|ops-collect|central\/collect)/.test(u.pathname))badResponses.push({page:current,url:r.url(),status:r.status()});}catch{}});
  while(true){
    const i=cursor++;if(i>=crawlTargets.length)break;
    current=crawlTargets[i];
    const beforeErr=pageErrors.length,beforeResp=badResponses.length;
    try{
      const res=await page.goto(current,{waitUntil:'domcontentloaded',timeout:30000});
      const expected404=current.includes('this-page-should-not-exist-deep-audit');
      if(!res)fail('navigation',`${current}: no response`);
      else if(expected404){if(res.status()!==404)warn('404-behavior',`${current}: expected 404, got ${res.status()}`);}
      else if(res.status()>=400)fail('page-http',`${current}: ${res.status()}`);
      await page.waitForTimeout(450);
      if(!expected404){
        const hrefs=await page.locator('a[href]').evaluateAll((els)=>els.map(a=>a.getAttribute('href')).filter(Boolean));
        for(const h of hrefs){const abs=sameOriginHref(h,current);if(abs)internalLinks.add(abs);}
      }
    }catch(e){fail('crawl-exception',`${current}: ${String(e?.message||e).slice(0,220)}`);}
    for(const e of pageErrors.slice(beforeErr)){if(!/ResizeObserver loop limit exceeded/i.test(e.error))fail('js-error',`${e.page}: ${e.error}`);}
    for(const b of badResponses.slice(beforeResp)){if(!current.includes('this-page-should-not-exist-deep-audit'))fail('first-party-response',`${b.page}: ${b.status} ${b.url}`);}
  }
  await page.close();
}
await Promise.all(Array.from({length:6},()=>crawlWorker()));

// 2) Validate every discovered first-party link once.
const linkList=[...internalLinks].filter(u=>!u.includes('/admin-feedback.html'));
stats.internalLinks=linkList.length;
let linkCursor=0;
async function linkWorker(){while(true){const i=linkCursor++;if(i>=linkList.length)return;const url=linkList[i];try{const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'NorimonoDeepAudit/1.0'}});if(r.status>=400)fail('broken-internal-link',`${r.status} ${url}`);}catch(e){fail('broken-internal-link',`${url}: ${String(e?.message||e).slice(0,160)}`);}}}
await Promise.all(Array.from({length:16},()=>linkWorker()));

async function newPage(route,wait=900){const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e?.message||e)));const r=await p.goto(`${BASE}${route}`,{waitUntil:'domcontentloaded',timeout:35000});if(!r||r.status()>=400)fail('journey-http',`${route}: ${r?.status()||0}`);await p.waitForTimeout(wait);for(const e of errors){if(!/ResizeObserver loop limit exceeded/i.test(e))fail('journey-js',`${route}: ${e}`);}return p;}
function validMoney(v){return /\d/.test(String(v||''))&&!/NaN|Infinity/i.test(String(v||''));}

// 3) Homepage claims, calculator and fuel-source truthfulness.
{
  const p=await newPage('/',1400);
  const catalog=await p.evaluate(()=>({cars:Array.isArray(window.CAR_CATALOG)?window.CAR_CATALOG.length:0,brands:Array.isArray(window.CAR_CATALOG)?new Set(window.CAR_CATALOG.map(x=>x.brand).filter(Boolean)).size:0}));
  const body=await p.locator('body').innerText();
  stats.carCatalog=catalog.cars;stats.carBrands=catalog.brands;
  console.log(`CATALOG car=${catalog.cars} brands=${catalog.brands}`);
  if(/7,500\s*車種/.test(body)&&catalog.cars<7500)fail('copy-vs-data',`公開表示は7,500車種対応だが CAR_CATALOG は ${catalog.cars}件`);
  if(/430\s*メーカー/.test(body)&&catalog.brands<430)fail('copy-vs-data',`公開表示は430メーカー対応だが CAR_CATALOG のメーカー数は ${catalog.brands}`);
  await p.locator('#price').fill('2000000');await p.locator('#km').fill('12000');await p.locator('#calc').click();
  const gross=await p.locator('#grossTotal').textContent();const monthly=await p.locator('#monthly').textContent();
  if(!validMoney(gross)||String(gross).trim()==='0')fail('calculator','車計算の総額が無効');
  if(!validMoney(monthly))fail('calculator','車計算の月額が無効');
  const fuelJson=await (await fetch(`${BASE}/official-fuel-prices.json`,{cache:'no-store'})).json();
  stats.fuelVerified=fuelJson?.verified===true;
  const panel=await p.locator('[data-fuel-price-panel]').innerText().catch(()=> '');
  if(fuelJson?.verified!==true){
    if(/公式週次価格|最新週次公表値|最新燃料価格|資源エネルギー庁 石油製品価格調査/.test(panel))fail('fuel-copy',`official-fuel-prices.json は verified:false なのに画面が公式・最新値として表示: ${panel.replace(/\s+/g,' ').slice(0,260)}`);
  }
  await p.close();
}

// 4) Bike calculator + catalog count logging.
{
  const p=await newPage('/bike',1200);
  const catalog=await p.evaluate(()=>({bikes:Array.isArray(window.BIKE_CATALOG)?window.BIKE_CATALOG.length:0,brands:Array.isArray(window.BIKE_CATALOG)?new Set(window.BIKE_CATALOG.map(x=>x.brand).filter(Boolean)).size:0}));
  stats.bikeCatalog=catalog.bikes;stats.bikeBrands=catalog.brands;console.log(`BIKE_CATALOG bike=${catalog.bikes} brands=${catalog.brands}`);
  await p.locator('#bikePrice').fill('700000');await p.locator('#bikeKm').fill('6000');await p.locator('#bikeCalc').click();
  if(!validMoney(await p.locator('#bikeGrossTotal').textContent()))fail('calculator','バイク計算の総額が無効');
  await p.close();
}

// 5) Comparisons, recommendations, insurance and sell diagnosis.
{
  const p=await newPage('/compare',800);await p.locator('#carCompareCount button[data-count="3"]').click();await p.locator('#runCarCompare').click();if(!(await p.locator('#carWinner h2').textContent()).trim())fail('compare','車3台比較の勝者結果が空');await p.close();
  const b=await newPage('/bike-compare',800);await b.locator('#bikeCompareCount button[data-count="3"]').click();await b.locator('#runBikeCompare').click();if(!(await b.locator('#bikeWinner h2').textContent()).trim())fail('compare','バイク3台比較の勝者結果が空');await b.close();
  const r=await newPage('/recommend',700);await r.locator('#recommendForm .recommend-btn').click();if(await r.locator('#recommendResults .rec-car').count()!==5)fail('recommend','車おすすめ診断が5件返さない');await r.close();
  const br=await newPage('/bike-recommend',700);await br.locator('#bikeRecommendSubmit').click();if(await br.locator('#bikeRecResults .rec-car').count()!==5)fail('recommend','バイクおすすめ診断が5件返さない');await br.close();
  const ins=await newPage('/car-insurance',600);const before=await ins.locator('#car-estimate strong').textContent();await ins.locator('#car-cover').selectOption('vehicle');await ins.waitForTimeout(120);const after=await ins.locator('#car-estimate strong').textContent();if(before===after)fail('insurance','自動車保険の条件変更で見積りが更新されない');await ins.close();
  const sell=await newPage('/sell-car',700);await sell.locator('#sellDiagnosisForm button[type="submit"]').click();if(!(await sell.locator('#sellDiagnosisResult').evaluate(el=>el.classList.contains('show'))))fail('sell','売却診断結果が表示されない');await sell.close();
}

// 6) Goods URL query: verify it is used on the first request, no duplicate initial API call, and results/config are usable.
for(const [route,expected] of [['/car-goods?q='+encodeURIComponent('ホンダ N-BOX'),'ホンダ N-BOX'],['/bike-goods?q='+encodeURIComponent('ホンダ Rebel 250'),'ホンダ Rebel 250']]){
  const p=await context.newPage();const calls=[];p.on('request',req=>{if(req.url().includes('/api/rakuten-products'))calls.push(req.url());});const r=await p.goto(`${BASE}${route}`,{waitUntil:'domcontentloaded',timeout:35000});if(!r||r.status()>=400)fail('goods-http',`${route}: ${r?.status()||0}`);await p.waitForTimeout(3500);
  const input=await p.locator('#liveGoodsQuery').inputValue().catch(()=> '');const text=await p.locator('#liveGoods').innerText().catch(()=> '');
  console.log(`GOODS ${route.split('?')[0]} calls=${calls.length} input=${input}`);calls.forEach((u,i)=>console.log(`GOODS_CALL ${i+1} ${u}`));
  if(input!==expected)fail('goods-query',`${route}: 入力欄がURL qを反映していない (${input})`);
  if(calls.length!==1)fail('goods-duplicate-request',`${route}: 初期表示で楽天商品APIを${calls.length}回呼び出し`);
  if(calls[0]&&!decodeURIComponent(calls[0]).includes(expected))fail('goods-query',`${route}: 最初のAPIリクエストがURL qではない: ${calls[0]}`);
  if(/RAKUTEN_APP_ID|RAKUTEN_ACCESS_KEY|設定がまだ反映/.test(text))fail('goods-config',`${route}: 楽天API設定エラーが利用者に表示されている`);
  await p.close();
}

// 7) Health and admin authorization boundary.
try{const h=await fetch(`${BASE}/api/health`,{redirect:'manual'});stats.healthStatus=h.status;if(h.status>=400)fail('health',`/api/health status ${h.status}`);}catch(e){fail('health',String(e));}
try{const a=await fetch(`${BASE}/api/admin/analytics?days=1`,{redirect:'manual'});stats.adminUnauthedStatus=a.status;if(![401,403].includes(a.status))fail('admin-auth',`認証なし /api/admin/analytics が ${a.status}`);}catch(e){fail('admin-auth',String(e));}

await browser.close();
console.log(`DEEP_AUDIT_STATS ${JSON.stringify(stats)}`);
for(const w of warnings)console.log(`WARNING\t${w.kind}\t${w.detail}`);
for(const f of failures)console.log(`FAILURE\t${f.kind}\t${f.detail}`);
console.log(`DEEP_AUDIT_RESULT failures=${failures.length} warnings=${warnings.length}`);
if(failures.length)process.exitCode=1;
