const {test,expect}=require(process.env.PLAYWRIGHT_TEST_MODULE || '@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

test.setTimeout(900000);
if(process.env.PLAYWRIGHT_EXECUTABLE)test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}});
const HUMAN_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const sites=[
  {key:'factory',url:'https://factory-career-site.pages.dev/',must:['/api/analytics/collect','/api/central/collect']},
  {key:'sugutsucool',url:'https://sugutsucool.pages.dev/',must:['sugutsucool-analytics.super-canon-boy.workers.dev/collect','/api/ops-collect']},
  {key:'car-bike',url:'https://norimono-cost.com/',must:['/api/analytics']},
  {key:'okazu',url:'https://okazu-yoridori-midori.pages.dev/',must:['/api/ops-collect']},
  {key:'clipmade',url:'https://clipmade-site.pages.dev/',must:['/api/ops-collect']}
];
const isAnalytics=url=>/\/api\/(?:analytics(?:\/collect)?|ops-collect|central\/collect)(?:[/?]|$)/.test(url)||/sugutsucool-analytics\.super-canon-boy\.workers\.dev\/collect/.test(url);
const isTrackingHost=url=>/https:\/\/[^/]*(?:a8\.net|accesstrade\.net|affiliate-b\.com|afi-b\.com|affiliate\.dmm\.com|af\.fc2\.com|google-analytics\.com|googletagmanager\.com|doubleclick\.net|posthog\.com)\//.test(url);
async function waitForAsset(request,url,marker){
  for(let i=0;i<60;i++){
    const response=await request.get(url,{failOnStatusCode:false});
    if(response.ok()&&(await response.text()).includes(marker))return;
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  throw new Error(`Updated measurement asset did not deploy: ${url}`);
}
async function measurementContext(browser,{human=false}={}){
  const context=await browser.newContext({userAgent:HUMAN_UA});
  // Human-path simulation is confined to a context with every analytics request blocked.
  if(human)await context.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
  const seen=[];
  await context.route('**/*',async route=>{
    const req=route.request();
    if(isAnalytics(req.url())){
      let body={};try{body=req.postDataJSON()||{};}catch{}
      const u=new URL(req.url());
      seen.push({method:req.method(),url:req.url(),endpoint:u.hostname+u.pathname,...body});
      return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
    }
    if(isTrackingHost(req.url()))return route.abort('blockedbyclient');
    return route.continue();
  });
  return {context,seen};
}
const eventName=x=>x.event_name||x.event_type||x.event||'';

test('normal visitor measurement uses one canonical page-view per store without client duplicate forwarding',async({browser,request})=>{
  await waitForAsset(request,'https://factory-career-site.pages.dev/assets/analytics.js?qa=1','funnelEvents');
  await waitForAsset(request,'https://sugutsucool.pages.dev/assets/analytics-track.js?qa=1','__suguAnalyticsLoaded');
  for(const site of sites){
    const {context,seen}=await measurementContext(browser,{human:true});
    try{
      const page=await context.newPage();
      const response=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:45000});
      expect(response?.status(),`${site.key} homepage HTTP`).toBeLessThan(400);
      await page.waitForTimeout(2000);
      const views=seen.filter(x=>eventName(x)==='page_view');
      for(const endpoint of site.must){
        const matching=views.filter(x=>x.endpoint.endsWith(endpoint));
        expect(matching.length,`${site.key} canonical page_view at ${endpoint}`).toBe(1);
        expect(matching[0].method).toBe('POST');
      }
      if(site.key==='car-bike'){
        expect(seen.some(x=>x.endpoint.includes('/api/central/collect')),'car central forwarding is server-side only').toBe(false);
        const event=views.find(x=>x.endpoint.endsWith('/api/analytics'));
        expect(event.collectionVersion).toBe('human-filtered-v118');
        expect(event.eventId).toBeTruthy();expect(event.visitorToken).toBeTruthy();expect(event.sessionToken).toBeTruthy();
      }
      for(const event of views){
        const pagePath=event.page_path||event.path||event.page||'/';
        expect(pagePath).not.toContain('?');
        expect(JSON.stringify(event)).not.toMatch(/"(?:email|beta_key|access_key|answers)"\s*:/i);
      }
      console.log(`MEASUREMENT_OK ${site.key} canonical_store_views=${views.length}; all telemetry intercepted`);
    }finally{await context.close();}
  }
});

test('automated QA browsers emit zero revenue telemetry across all five sites',async({browser,request})=>{
  await waitForAsset(request,'https://factory-career-site.pages.dev/assets/analytics.js?qa=1','funnelEvents');
  await waitForAsset(request,'https://sugutsucool.pages.dev/assets/analytics-track.js?qa=1','__suguAnalyticsLoaded');
  for(const site of sites){
    const {context,seen}=await measurementContext(browser);
    try{
      const page=await context.newPage();
      await page.goto(site.url+'?qa=1',{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForTimeout(1500);
      expect(seen.length,`${site.key} must exclude webdriver and explicit QA`).toBe(0);
    }finally{await context.close();}
  }
});

function assertReceiptContract(data){
  expect(data.ok).toBe(true);
  expect(data.note).toMatch(/raw accepted page_view/);
  expect(new Set(data.sites.map(row=>row.site_key))).toEqual(new Set(sites.map(site=>site.key)));
  for(const row of data.sites){
    expect(Number.isInteger(row.page_views)).toBe(true);expect(row.page_views).toBeGreaterThanOrEqual(0);
    const expected=row.page_views>0?'recent':row.last_page_view?'stale':'never';
    expect(row.status,`${row.site_key}: status must reflect observed receipts`).toBe(expected);
  }
}
test('central receipt API labels raw and unavailable data without requiring fabricated traffic',async({request})=>{
  const response=await request.get('https://factory-career-site.pages.dev/api/central/verify-sites?hours=168&format=json&qa=1');
  expect(response.ok()).toBe(true);
  const data=await response.json();assertReceiptContract(data);
  console.log('Receipt statuses:',data.sites.map(row=>`${row.site_key}:${row.status}`).join(', '));
});
test('central receipt contract preserves never and stale when no new visitors exist',async()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../functions/api/central/verify-sites.js'),'utf8');
  const {onRequestGet}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const db={prepare:()=>({bind(){return this;},all:async()=>({results:[]}),first:async()=>({})})};
  const response=await onRequestGet({request:new Request('https://example.invalid/api/central/verify-sites?format=json'),env:{ANALYTICS_DB:db}});
  const data=await response.json();assertReceiptContract(data);
  for(const row of data.sites)expect(row.status).toBe('never');
  assertReceiptContract({...data,sites:data.sites.map(row=>({...row,last_page_view:'2026-01-01 00:00:00',status:'stale'}))});
});

function extractLocs(xml){return [...String(xml||'').matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m=>m[1].trim())}
function metaRobots(html){const s=String(html||'');const m=s.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["'][^>]*>/i);return (m?.[1]||m?.[2]||'').toLowerCase()}
function canonicalHref(html){const s=String(html||'');const m=s.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);return m?.[1]||m?.[2]||''}
function samePage(a,b){try{const x=new URL(a),y=new URL(b);const norm=p=>p==='/'?'/':p.replace(/\/$/,'');return x.origin===y.origin&&norm(x.pathname)===norm(y.pathname)}catch{return false}}
function internalLinks(html,base){
  const out=new Set();
  for(const m of String(html||'').matchAll(/<a\b[^>]*\bhref=["']([^"'#]+)["'][^>]*>/gi)){
    try{const u=new URL(m[1],base);const b=new URL(base);if(u.origin!==b.origin)continue;if(/^(?:mailto|tel|javascript):/i.test(m[1]))continue;u.hash='';u.search='';if(/\.(?:png|jpe?g|webp|gif|svg|css|js|json|xml|txt|pdf|zip|exe|mp4|webm|ico)$/i.test(u.pathname))continue;out.add(u.href)}catch{}
  }
  return [...out];
}
async function getText(url){
  let last;
  for(let attempt=1;attempt<=4;attempt++){
    try{
      const r=await fetch(url,{redirect:'manual',headers:{'user-agent':'Mozilla/5.0 all-site-indexability-live/1.0'}});
      let body='';try{body=await r.text()}catch{}
      return {url,status:r.status,headers:r.headers,body};
    }catch(e){
      last=e;
      if(attempt<4)await new Promise(resolve=>setTimeout(resolve,400*attempt));
    }
  }
  throw last;
}
async function pool(items,fn,limit=16){
  let i=0;const out=new Array(items.length);
  async function worker(){while(true){const n=i++;if(n>=items.length)return;out[n]=await fn(items[n],n)}}
  await Promise.all(Array.from({length:Math.min(limit,items.length||1)},worker));return out;
}
const seoSites=[
  {key:'factory',home:'https://factory-career-site.pages.dev/',sitemap:'https://factory-career-site.pages.dev/sitemap.xml',allowNoindex:[/^\/admin-/,/^\/ops-dashboard(?:\/|$)/,/^\/rakuten-check(?:\.html)?$/, /^\/shorts-content-factory(?:-audit)?\//,
    /^\/articles\/(?:factory-annual-holidays-check|factory-bonus-offer-check|factory-callout-duty-check|factory-early-shift-check|factory-late-shift-check|factory-long-hours-offer-check|factory-oncall-check|factory-overtime-pay-check|factory-paid-leave-check|factory-salary-down-transfer-check|factory-transfer-policy-check|factory-weekend-shift-check|manufacturing-allowances-check|manufacturing-base-salary-check|production-tech-business-travel-check)(?:\.html)?$/]},
  {key:'sugutsucool',home:'https://sugutsucool.pages.dev/',sitemap:'https://sugutsucool.pages.dev/sitemap.xml',allowNoindex:[/^\/admin-/,/^\/contact\/$/,/^\/404(?:\.html)?$/]},
  {key:'car-bike',home:'https://norimono-cost.com/',sitemap:'https://norimono-cost.com/sitemap-index.xml',allowNoindex:[/^\/admin-feedback(?:\.html)?$/, /^\/product(?:\.html)?$/, /^\/404(?:\.html)?$/]},
  {key:'okazu',home:'https://okazu-yoridori-midori.pages.dev/',sitemap:'https://okazu-yoridori-midori.pages.dev/sitemap.xml',allowNoindex:[/^\/404(?:\.html)?$/, /^\/ga4-check(?:\.html)?$/, /^\/products\/view\/?$/]},
  {key:'clipmade',home:'https://clipmade-site.pages.dev/',sitemap:'https://clipmade-site.pages.dev/sitemap.xml',allowNoindex:[/^\/404(?:\.html)?$/]}
];
async function sitemapUrls(entry){
  const root=await getText(entry.sitemap);expect(root.status,`${entry.key} sitemap HTTP`).toBe(200);
  if(/<sitemapindex\b/i.test(root.body)){
    const children=extractLocs(root.body);const maps=await pool(children,getText,8);const urls=[];
    for(const m of maps){expect(m.status,`${entry.key} child sitemap HTTP ${m.url}`).toBe(200);urls.push(...extractLocs(m.body))}
    return urls;
  }
  return extractLocs(root.body);
}
test('all five production sites keep public search pages indexable',async()=>{
  for(const site of seoSites){
    const urls=await sitemapUrls(site);
    const unique=[...new Set(urls)];
    expect(unique.length,`${site.key}: sitemap URL count`).toBeGreaterThan(0);
    expect(unique.length,`${site.key}: duplicate sitemap URL`).toBe(urls.length);
    const checked=await pool(unique,getText,8);
    for(const x of checked){
      expect(x.status,`${site.key}: sitemap URL must be direct 200: ${x.url}`).toBe(200);
      const xr=String(x.headers.get('x-robots-tag')||'').toLowerCase();
      expect(xr,`${site.key}: X-Robots-Tag noindex in sitemap: ${x.url}`).not.toContain('noindex');
      if(/text\/html/i.test(String(x.headers.get('content-type')||''))){
        expect(metaRobots(x.body),`${site.key}: meta noindex in sitemap: ${x.url}`).not.toContain('noindex');
        const canonical=canonicalHref(x.body);expect(canonical,`${site.key}: canonical missing: ${x.url}`).toBeTruthy();
        expect(samePage(canonical,x.url),`${site.key}: canonical mismatch: ${x.url} -> ${canonical}`).toBeTruthy();
      }
    }
    const home=await getText(site.home);expect(home.status,`${site.key} home HTTP`).toBe(200);
    const links=internalLinks(home.body,site.home).slice(0,300);
    const linked=await pool(links,getText,8);
    for(const x of linked){
      if(x.status!==200||!/text\/html/i.test(String(x.headers.get('content-type')||'')))continue;
      const path=new URL(x.url).pathname;const allow=site.allowNoindex.some(re=>re.test(path));
      const robots=(String(x.headers.get('x-robots-tag')||'')+' '+metaRobots(x.body)).toLowerCase();
      if(!allow)expect(robots,`${site.key}: unexpected noindex on public home-linked page ${x.url}`).not.toContain('noindex');
    }
    console.log(`SEO_OK ${site.key} sitemap=${unique.length} homeLinks=${links.length}`);
  }
});

// all-site indexability rerun: 2026-10-07 after Sugu legal-page fix

// all-site final rerun: 2026-10-08 after Okazu ranking index fix
