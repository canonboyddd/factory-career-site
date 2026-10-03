const {test,expect}=require('@playwright/test');

const HUMAN_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const sites=[
  {key:'factory',url:'https://factory-career-site.pages.dev/',must:[/factory-career-site\.pages\.dev\/api\/analytics\/collect/]},
  {key:'sugutsucool',url:'https://sugutsucool.pages.dev/',must:[/sugutsucool-analytics\.super-canon-boy\.workers\.dev\/collect/,/factory-career-site\.pages\.dev\/api\/central\/collect.*site_key=sugutsucool/]},
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
    if(r.ok()&&text.includes('central(eventType,extra);return post(payload(eventType,extra)'))return;
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
  throw new Error('Sugu production did not deploy central page-view tracking');
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
