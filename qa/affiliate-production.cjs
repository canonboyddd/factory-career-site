// Production UI inspection with every analytics POST and ASP request blocked.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='https://factory-career-site.pages.dev';
const out=path.resolve(__dirname,'../reports/affiliate-revenue-qa');
const blocked=[];const errors=[];const responses=[];const broken=[];
const assets=[];
const expected=['job','experience','income','night','overtime','change','intent'];
async function main(){
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
  try{
    const requestContext=await browser.newContext();
    for(const file of ['assets/analytics.js','assets/diagnosis.js','assets/main.js','assets/central-tracker.js']){
      const response=await requestContext.request.get(base+'/'+file+'?qa=1');assert.equal(response.status(),200);
      const text=(await response.text()).replace(/\r\n/g,'\n');
      assert.equal(text,fs.readFileSync(path.resolve(__dirname,'..',file),'utf8').replace(/\r\n/g,'\n'));
      assets.push({path:file,status:response.status(),sha256:createHash('sha256').update(text).digest('hex'),matches_source:true});
    }
    const excluded=await requestContext.request.post(base+'/api/analytics/collect',{headers:{'x-analytics-test':'1','content-type':'application/json'},data:'{}'});
    assert.equal(excluded.status(),200);assert.equal((await excluded.json()).excluded,true);
    await requestContext.close();
    for(const width of [375,768,1440]){
      const context=await browser.newContext({viewport:{width,height:900}});
      await context.route('**/*',async route=>{
        const req=route.request();const u=new URL(req.url());
        if(req.method()!=='GET'||/\/api\/(?:analytics(?:\/collect)?|central\/collect|ops-collect)(?:[/?]|$)/.test(u.pathname)){
          blocked.push({method:req.method(),path:u.pathname});
          return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
        }
        if(u.origin!==base)return route.abort();
        return route.continue();
      });
      const page=await context.newPage();
      page.on('pageerror',err=>errors.push(err.message));
      page.on('response',response=>{if(new URL(response.url()).origin===base&&response.status()>=400)broken.push({status:response.status(),path:new URL(response.url()).pathname});});
      let response=await page.goto(base+'/diagnosis?qa=1');responses.push({width,path:'/diagnosis',status:response.status()});
      assert.equal(response.status(),200);
      for(const key of expected){await page.locator(`.question[data-key="${key}"] .choice`).first().click();await page.locator('#nextBtn').click();}
      assert.equal(await page.locator('#resultBox.active').count(),1);
      assert.equal(await page.locator('#prBox').isVisible(),false); // first intent is research
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(out,`production-diagnosis-${width}.jpg`),type:'jpeg',quality:80,fullPage:true});
      await page.goto(base+'/diagnosis?qa=1');
      const answers={job:'production-tech',experience:'3-5',income:'400',night:'some',overtime:'ok',change:'salary',intent:'open'};
      for(const[key,value]of Object.entries(answers)){await page.locator(`.question[data-key="${key}"] .choice[data-value="${value}"]`).click();await page.locator('#nextBtn').click();}
      assert.equal(await page.locator('#prBox [data-affiliate-link]').count(),2);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(out,`production-diagnosis-offers-${width}.jpg`),type:'jpeg',quality:80,fullPage:true});
      response=await page.goto(base+'/articles/manufacturing-agent-guide?qa=1');responses.push({width,path:'/articles/manufacturing-agent-guide',status:response.status()});
      await page.waitForTimeout(700);
      assert.equal(await page.locator('[data-top-sites-comparison]').count(),1);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(out,`production-comparison-${width}.jpg`),type:'jpeg',quality:80,fullPage:true});
      await page.goto(base+'/tools/salary-compare?qa=1');
      for(const [id,value]of Object.entries({base:'250000',bonus:'800000',night:'40000',ot:'35000',other:'15000'}))await page.locator('#'+id).fill(value);
      await page.locator('#calc').click();assert.equal(await page.locator('#annual').textContent(),'4,880,000円');
      await page.goto(base+'/tools/resume-draft?qa=1');await page.locator('#process').fill('検証用工程');await page.locator('#make').click();assert((await page.locator('#output').textContent()).includes('検証用工程'));
      await context.close();
    }
    assert.equal(errors.length,0,errors.join('\n'));assert.equal(broken.length,0,JSON.stringify(broken));
    assert.equal(blocked.length,0,'QA should not attempt analytics or submission requests');
    fs.writeFileSync(path.join(out,'production-results.json'),JSON.stringify({url:base,verified_at:new Date().toISOString(),assets,server_qa_excluded:true,responses,js_errors:errors,broken_same_origin:broken,attempted_posts_or_collectors:blocked,production_writes:0,external_asp_requests_allowed:0},null,2));
    console.log('PASS: production diagnosis/comparison at 375/768/1440; salary/resume; zero errors or telemetry attempts');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
