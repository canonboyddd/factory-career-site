const {test,expect}=require('@playwright/test');

test.setTimeout(180000);
const HUMAN_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const sites=[
  {key:'factory',url:'https://factory-career-site.pages.dev/',must:[/factory-career-site\.pages\.dev\/api\/analytics\/collect/]},
  {key:'sugutsucool',url:'https://sugutsucool.pages.dev/',must:[/sugutsucool-analytics\.super-canon-boy\.workers\.dev\/collect/,/sugutsucool\.pages\.dev\/api\/ops-collect/],mustNot:[/factory-career-site\.pages\.dev\/api\/central\/collect.*site_key=sugutsucool/]},
  {key:'car-bike',url:'https://norimono-cost.com/',must:[/norimono-cost\.com\/api\/analytics/,/factory-career-site\.pages\.dev\/api\/central\/collect.*site_key=car-bike/]},
  {key:'okazu',url:'https://okazu-yoridori-midori.pages.dev/',must:[/okazu-yoridori-midori\.pages\.dev\/api\/ops-collect/]},
  {key:'clipmade',url:'https://clipmade-site.pages.dev/',must:[/clipmade-site\.pages\.dev\/api\/ops-collect/]}
];

const isAnalytics=url=>/\/api\/(?:analytics(?:\/collect)?|ops-collect|central\/collect)(?:[/?]|$)/.test(url)||/sugutsucool-analytics\.super-canon-boy\.workers\.dev\/collect/.test(url);

async function waitForFactoryDeploy(request){
  for(let i=0;i<40;i++){
    const r=await request.get('https://factory-career-site.pages.dev/assets/main.js?live-analytics-qa=1',{failOnStatusCode:false});
    const text=await r.text();
    if(r.ok()&&text.includes('initD1Analytics')&&text.includes('assets/analytics.js?v=20261003-1'))return;
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
  throw new Error('Factory production did not deploy the D1 analytics loader');
}

async function waitForSuguDeploy(request){
  for(let i=0;i<40;i++){
    const r=await request.get('https://sugutsucool.pages.dev/assets/analytics-track.js?live-analytics-qa=1',{failOnStatusCode:false});
    const text=await r.text();
    if(r.ok()&&text.includes('function send(eventType,extra,opts){return post(payload(eventType,extra)'))return;
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
  throw new Error('Sugu production did not deploy the deduplicated analytics sender');
}

async function waitForVerificationApi(request){
  for(let i=0;i<40;i++){
    const r=await request.get('https://factory-career-site.pages.dev/api/central/verify-sites?hours=168&format=json&live-analytics-qa=1',{failOnStatusCode:false});
    if(r.ok()){
      try{
        const data=await r.json();
        if(data?.ok&&Array.isArray(data.sites)&&data.sites.some(x=>x.site_key==='factory'))return data;
      }catch{}
    }
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
  throw new Error('Five-site verification API did not deploy');
}

test('all five production sites emit access analytics',async({browser,request})=>{
  await waitForFactoryDeploy(request);
  await waitForSuguDeploy(request);
  for(const site of sites){
    const context=await browser.newContext({userAgent:HUMAN_UA});
    await context.addInitScript(()=>{try{Object.defineProperty(navigator,'webdriver',{get:()=>undefined});}catch{}});
    const page=await context.newPage();
    const seen=[];
    await page.route('**/*',async route=>{
      const req=route.request();
      if(isAnalytics(req.url())){seen.push(`${req.method()} ${req.url()}`);return route.abort('blockedbyclient');}
      return route.continue();
    });
    const response=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:45000});
    expect(response,`${site.key} homepage did not respond`).toBeTruthy();
    expect(response.status(),`${site.key} homepage HTTP status`).toBeLessThan(400);
    await page.waitForTimeout(1800);
    console.log(`\n[${site.key}] analytics requests`);
    for(const x of seen)console.log(x);
    for(const re of site.must)expect(seen.some(x=>re.test(x)),`${site.key} did not emit expected analytics request: ${re}`).toBeTruthy();
    for(const re of site.mustNot||[])expect(seen.some(x=>re.test(x)),`${site.key} emitted forbidden duplicate analytics request: ${re}`).toBeFalsy();
    await context.close();
  }
});

test('central D1 has page-view receipt history for all five sites',async({request})=>{
  const data=await waitForVerificationApi(request);
  console.log('\n[central receipt verification]');
  console.log(JSON.stringify(data,null,2));
  const keys=new Set(data.sites.map(x=>x.site_key));
  for(const key of ['factory','sugutsucool','car-bike','okazu','clipmade'])expect(keys.has(key),`missing site in verification API: ${key}`).toBeTruthy();
  for(const row of data.sites)expect(row.status,`${row.site_key} has never written a page_view to D1`).not.toBe('never');
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
  const r=await fetch(url,{redirect:'manual',headers:{'user-agent':'Mozilla/5.0 all-site-indexability-live/1.0'}});
  let body='';try{body=await r.text()}catch{}
  return {url,status:r.status,headers:r.headers,body};
}
async function pool(items,fn,limit=16){
  let i=0;const out=new Array(items.length);
  async function worker(){while(true){const n=i++;if(n>=items.length)return;out[n]=await fn(items[n],n)}}
  await Promise.all(Array.from({length:Math.min(limit,items.length||1)},worker));return out;
}
const seoSites=[
  {key:'factory',home:'https://factory-career-site.pages.dev/',sitemap:'https://factory-career-site.pages.dev/sitemap.xml',allowNoindex:[/^\/admin-/,/^\/ops-dashboard(?:\/|$)/,/^\/rakuten-check(?:\.html)?$/, /^\/shorts-content-factory(?:-audit)?\//,
    /^\/articles\/(?:factory-annual-holidays-check|factory-bonus-offer-check|factory-callout-duty-check|factory-early-shift-check|factory-late-shift-check|factory-long-hours-offer-check|factory-oncall-check|factory-overtime-pay-check|factory-paid-leave-check|factory-salary-down-transfer-check|factory-transfer-policy-check|factory-weekend-shift-check|manufacturing-allowances-check|manufacturing-base-salary-check|production-tech-business-travel-check)(?:\.html)?$/]},
  {key:'sugutsucool',home:'https://sugutsucool.pages.dev/',sitemap:'https://sugutsucool.pages.dev/sitemap.xml',allowNoindex:[/^\/admin-/,/^\/404(?:\.html)?$/]},
  {key:'car-bike',home:'https://norimono-cost.com/',sitemap:'https://norimono-cost.com/sitemap-index.xml',allowNoindex:[/^\/admin-feedback(?:\.html)?$/, /^\/product(?:\.html)?$/, /^\/404(?:\.html)?$/]},
  {key:'okazu',home:'https://okazu-yoridori-midori.pages.dev/',sitemap:'https://okazu-yoridori-midori.pages.dev/sitemap.xml',allowNoindex:[/^\/404(?:\.html)?$/, /^\/ga4-check(?:\.html)?$/]},
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
    const checked=await pool(unique,getText,18);
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
    const linked=await pool(links,getText,16);
    for(const x of linked){
      if(x.status!==200||!/text\/html/i.test(String(x.headers.get('content-type')||'')))continue;
      const path=new URL(x.url).pathname;const allow=site.allowNoindex.some(re=>re.test(path));
      const robots=(String(x.headers.get('x-robots-tag')||'')+' '+metaRobots(x.body)).toLowerCase();
      if(!allow)expect(robots,`${site.key}: unexpected noindex on public home-linked page ${x.url}`).not.toContain('noindex');
    }
    console.log(`SEO_OK ${site.key} sitemap=${unique.length} homeLinks=${links.length}`);
  }
});
