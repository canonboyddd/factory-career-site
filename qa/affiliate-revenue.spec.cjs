// Offline behavioral QA: every analytics POST, ASP pixel and external navigation is intercepted.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const playwright = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(playwright);
const root = path.resolve(__dirname, '..');
const proof = path.join(root, 'reports', 'affiliate-revenue-qa');
const baseSha = 'aafed820c34530464170a59f0a53c675bf7627ae';
let baseline = false;
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.xml':'application/xml','.png':'image/png','.svg':'image/svg+xml'};
const checks = [];
const pass = name => { checks.push(name); console.log('PASS:', name); };

async function main() {
  fs.mkdirSync(proof,{recursive:true});
  const server = http.createServer((req,res) => {
    const url = new URL(req.url,'http://localhost');
    let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!relative) relative = 'index.html';
    if (!path.extname(relative)) relative += fs.existsSync(path.join(root,relative,'index.html')) ? '/index.html' : '.html';
    const file = path.resolve(root,relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {res.writeHead(404);res.end();return;}
    try {
      const content = baseline ? execFileSync('git',['show',`${baseSha}:${relative}`],{cwd:root,maxBuffer:4*1024*1024}) : fs.readFileSync(file);
      res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(content);
    } catch { res.writeHead(404);res.end(); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  server.unref();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
  const events = [];
  const errors = [];
  const noOverflow = async page => {
    const state = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(el=>[el.tagName,el.className,Math.round(el.getBoundingClientRect().right)])}));
    assert(state.scroll<=state.width+1,JSON.stringify(state));
  };
  async function context(width=375,{human=true,qa=false}={}) {
    const c = await browser.newContext({viewport:{width,height:900},userAgent:'Mozilla/5.0 Chrome/145.0.0.0 Safari/537.36'});
    if (human) await c.addInitScript(() => Object.defineProperty(navigator,'webdriver',{get:()=>false}));
    await c.route('**/*', async route => {
      const request=route.request(); const u=new URL(request.url());
      if (request.method()==='POST' || /\/api\/(?:analytics|central)\/collect$/.test(u.pathname)) {
        let body;try{body=request.postDataJSON();}catch{}
        if(body)events.push({endpoint:u.pathname,...body});
        await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});return;
      }
      if(u.origin!==base){await route.abort();return;}
      if(u.pathname.startsWith('/api/')){await route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'});return;}
      await route.continue();
    });
    const page=await c.newPage();page.on('pageerror',err=>errors.push(err.message));
    await page.goto(base+'/diagnosis'+(qa?'?qa=1':''));
    await page.waitForTimeout(200);
    return {c,page};
  }
  async function diagnose(page, overrides={}) {
    const answers={job:'production-tech',experience:'3-5',income:'400',night:'some',overtime:'ok',change:'salary',intent:'open',...overrides};
    assert.equal(await page.locator('#nextBtn').isDisabled(),true);
    for(const [key,value] of Object.entries(answers)) {
      await page.locator(`.question[data-key="${key}"] .choice[data-value="${value}"]`).click();
      await page.locator('#nextBtn').click();
    }
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#resultBox').evaluate(el=>el.classList.contains('active')),true);
  }
  try {
    for (const before of [true,false]) {
      baseline=before;
      for(const width of [375,768,1440]) {
        const {c,page}=await context(width,{qa:true});
        await diagnose(page);
        await page.screenshot({path:path.join(proof,`${before?'before':'after'}-diagnosis-${width}.jpg`),type:'jpeg',quality:80,fullPage:true});
        if(!before)await noOverflow(page);
        await page.goto(base+'/articles/manufacturing-agent-guide?qa=1');
        await page.waitForTimeout(450);
        await page.screenshot({path:path.join(proof,`${before?'before':'after'}-comparison-${width}.jpg`),type:'jpeg',quality:80,fullPage:true});
        if(!before)await noOverflow(page);
        await c.close();
      }
    }
    pass('before/after diagnosis and comparison screenshots at 375/768/1440; no new overflow');
    baseline=false;events.length=0;
    const {c,page}=await context();
    await diagnose(page);
    assert.deepEqual(await page.locator('#prBox [data-affiliate-link]').evaluateAll(a=>a.map(x=>x.dataset.program)),['samuraiJob','makersJob']);
    for(const name of ['diagnosis_start','diagnosis_complete','diagnosis_result_view']) {
      assert.equal(events.filter(x=>x.endpoint==='/api/analytics/collect'&&x.event_name===name).length,1);
      assert.equal(events.filter(x=>x.endpoint==='/api/central/collect'&&x.event_name===name).length,1);
    }
    assert(!events.some(x=>JSON.stringify(x).includes('production-tech')));
    pass('diagnosis emits one start/completion/result event per store with no answer values');
    const link=page.locator('#prBox [data-affiliate-link]').first();
    await link.scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
    assert.equal(events.filter(x=>x.endpoint==='/api/analytics/collect'&&x.event_name==='affiliate_offer_view'&&x.program==='samuraiJob').length,1);
    assert.equal(events.filter(x=>x.endpoint==='/api/central/collect'&&x.event_name==='affiliate_impression'&&x.program==='samuraiJob').length,1);
    pass('dynamic diagnosis CTA visible for one second records one impression per store');
    const clicks=()=>events.filter(x=>x.event_name==='affiliate_click_unified'||x.event_name==='affiliate_click');
    assert.equal(clicks().length,0);
    await link.evaluate(el=>el.click());await page.waitForTimeout(100);
    assert.equal(clicks().length,0);
    await link.click();await page.waitForTimeout(100);
    assert.equal(events.filter(x=>x.endpoint==='/api/analytics/collect'&&x.event_name==='affiliate_click_unified').length,1);
    assert.equal(events.filter(x=>x.endpoint==='/api/central/collect'&&x.event_name==='affiliate_click').length,1);
    await link.click({button:'middle'});await page.waitForTimeout(100);
    assert.equal(events.filter(x=>x.endpoint==='/api/analytics/collect'&&x.event_name==='affiliate_click_unified').length,2);
    assert.equal(events.filter(x=>x.endpoint==='/api/central/collect'&&x.event_name==='affiliate_click').length,2);
    pass('script clicks ignored; primary and middle user clicks count once each per store');
    const variant = await link.getAttribute('data-affiliate-variant');
    assert(['A','B'].includes(variant));
    await page.reload();await diagnose(page);
    assert.equal(await page.locator('#prBox [data-affiliate-link]').first().getAttribute('data-affiliate-variant'),variant);
    pass('diagnosis CTA A/B wording is stable across reloads for the same browser');
    await c.close();
    for(const intent of ['stay','research']) {
      const {c,page}=await context();await diagnose(page,{intent});
      assert.equal(await page.locator('#prBox').isVisible(),false);await c.close();
    }
    const generic=await context();await diagnose(generic.page,{job:'production',experience:'10plus',income:'600',change:'people',intent:'soon'});
    assert.deepEqual(await generic.page.locator('#prBox [data-affiliate-link]').evaluateAll(a=>a.map(x=>x.dataset.program)),['makersJob']);
    await generic.c.close();
    pass('research/stay uses preparation; generic roles and people concerns do not imply specialist or resignation services');
    const article=await context();events.length=0;
    await article.page.goto(base+'/articles/manufacturing-agent-guide');await article.page.waitForTimeout(500);
    const review=article.page.locator('[data-top-sites-comparison] a[href*="makers-job-review"]').first();
    await review.click();await article.page.waitForTimeout(200);
    assert.equal(clicks().length,0);
    await article.page.goto(base+'/articles/factory-quit');await article.page.waitForTimeout(500);
    assert.equal(await article.page.locator('[data-program-card="zen"]:visible').count(),0);
    assert.equal(await article.page.locator('[data-program-card="magicari"]:visible').count(),0);
    await article.page.goto(base+'/tools/salary-compare?qa=1');
    for(const [id,value] of Object.entries({base:'250000',bonus:'800000',night:'40000',ot:'35000',other:'15000'}))await article.page.locator('#'+id).fill(value);
    await article.page.locator('#calc').click();
    assert.equal(await article.page.locator('#annual').textContent(),'4,880,000円');
    assert.equal(await article.page.locator('#variable').textContent(),'900,000円');
    assert.equal(await article.page.locator('#ratio').textContent(),'18%');
    await article.page.goto(base+'/tools/resume-draft?qa=1');
    await article.page.locator('#years').fill('3');
    await article.page.locator('#process').fill('検証用の組立工程');
    await article.page.locator('#make').click();
    assert((await article.page.locator('#output').textContent()).includes('検証用の組立工程'));
    assert(!events.some(event=>JSON.stringify(event).includes('検証用の組立工程')));
    await article.c.close();
    pass('comparison-to-review is internal; unrelated resignation/unset offers hidden; salary and resume tools work without input telemetry');
    for(const options of [{human:false},{qa:true}]) {
      events.length=0;const {c,page}=await context(375,options);await diagnose(page);await page.waitForTimeout(100);
      assert.equal(events.length,0);await c.close();
    }
    pass('webdriver and explicit QA sessions produce zero collector requests');
    const collectorSource=fs.readFileSync(path.join(root,'functions/api/analytics/collect.js'),'utf8');
    const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(collectorSource).toString('base64'));
    let inserts=0;
    const db={batch:async()=>[],prepare:()=>({bind(){return this;},first:async()=>null,run:async()=>{inserts++;}})};
    const body={event_name:'diagnosis_complete',browser_id:'test',session_id:'test',page_path:'/diagnosis'};
    const req=headers=>new Request(base+'/api/analytics/collect',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
    for(const headers of [{'user-agent':'Googlebot'},{'x-analytics-test':'1'},{cookie:'ops_owner_excluded=1'}]) {
      assert.equal((await (await onRequestPost({request:req(headers),env:{ANALYTICS_DB:db}})).json()).excluded,true);
    }
    assert.equal(inserts,0);
    assert.equal((await onRequestPost({request:req({'user-agent':'Mozilla/5.0'}),env:{ANALYTICS_DB:db}})).status,200);
    assert.equal(inserts,1);
    pass('collector excludes bot/QA/owner before D1 writes; valid funnel event accepted');
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(proof,'results.json'),JSON.stringify({base_sha:baseSha,checks,js_errors:errors,production_writes:0,external_requests_allowed:0},null,2));
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
