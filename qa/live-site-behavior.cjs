const { chromium } = require('playwright');

const BASE='https://factory-career-site.pages.dev';
const EXTRA=['/','/diagnosis','/tools/','/tools/salary-compare','/tools/job-offer-score','/tools/resume-draft','/factory-items','/about','/privacy','/disclaimer','/editorial-policy','/sources','/site-map'];
const norm=p=>{try{const u=new URL(p,BASE);u.hash='';return u.href}catch{return p}};
const cleanPath=p=>{let x=p.replace(/\/index\.html$/i,'/').replace(/\.html$/i,'');if(x.length>1)x=x.replace(/\/$/,'');return x||'/'};

(async()=>{
  const failures=[]; const warnings=[]; const internalLinks=new Set();
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
  const request=context.request;

  let sitemapText='';
  try{
    const res=await request.get(BASE+'/sitemap.xml');
    if(!res.ok()) throw new Error(`status ${res.status()}`);
    sitemapText=await res.text();
  }catch(e){failures.push(`SITEMAP_FETCH ${e.message}`)}
  const sitemapUrls=[...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1].trim()).filter(u=>u.startsWith(BASE));
  const urls=[...new Set([...sitemapUrls,...EXTRA.map(x=>BASE+x)].map(norm))];

  async function preparePage(page, label){
    const pageErrors=[]; const badSameOrigin=[];
    page.on('pageerror',e=>pageErrors.push(String(e.message||e).slice(0,300)));
    page.on('response',r=>{
      try{
        const u=new URL(r.url());
        if(u.origin===BASE && r.status()>=400 && !u.pathname.startsWith('/api/analytics/collect')) badSameOrigin.push(`${r.status()} ${u.pathname}`);
      }catch{}
    });
    await page.route('**/api/analytics/collect',route=>route.fulfill({status:204,body:''}));
    await page.route('https://www.google-analytics.com/**',route=>route.fulfill({status:204,body:''})).catch(()=>{});
    return {pageErrors,badSameOrigin};
  }

  for(let i=0;i<urls.length;i++){
    const url=urls[i]; const page=await context.newPage(); const runtime=await preparePage(page,url);
    try{
      const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      if(!res || res.status()>=400){failures.push(`PAGE_STATUS ${res?.status()||0} ${url}`);continue;}
      await page.waitForTimeout(650);
      const state=await page.evaluate((base)=>{
        const visible=el=>{
          const s=getComputedStyle(el); const r=el.getBoundingClientRect();
          return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0&&!el.closest('[hidden],[aria-hidden="true"]');
        };
        const dead=[...document.querySelectorAll('a[href]')].filter(visible).map(a=>({href:a.getAttribute('href')||'',text:(a.textContent||'').trim().replace(/\s+/g,' ').slice(0,80)})).filter(x=>!x.href||x.href==='#'||/^javascript:/i.test(x.href));
        const links=[...document.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>{try{return new URL(h).origin===base}catch{return false}});
        const canonical=document.querySelector('link[rel="canonical"]')?.href||'';
        const overflow=document.documentElement.scrollWidth-window.innerWidth;
        return {dead,links,canonical,overflow,title:document.title};
      },BASE);
      if(!state.title.trim()) failures.push(`EMPTY_TITLE ${url}`);
      if(state.dead.length) failures.push(`VISIBLE_DEAD_LINK ${url} :: ${JSON.stringify(state.dead.slice(0,5))}`);
      if(state.overflow>6) warnings.push(`MOBILE_OVERFLOW +${state.overflow}px ${url}`);
      state.links.forEach(x=>internalLinks.add(norm(x)));
      if(sitemapUrls.includes(url)){
        if(!state.canonical) failures.push(`NO_CANONICAL ${url}`);
        else {
          const a=new URL(url),c=new URL(state.canonical);
          if(c.origin!==BASE||cleanPath(c.pathname)!==cleanPath(a.pathname)) failures.push(`CANONICAL_MISMATCH ${url} -> ${state.canonical}`);
        }
      }
      if(runtime.pageErrors.length) failures.push(`PAGEERROR ${url} :: ${[...new Set(runtime.pageErrors)].join(' | ')}`);
      if(runtime.badSameOrigin.length) failures.push(`RESOURCE_4XX ${url} :: ${[...new Set(runtime.badSameOrigin)].join(', ')}`);
    }catch(e){failures.push(`CRAWL_EXCEPTION ${url} :: ${String(e.message||e).slice(0,220)}`)}finally{await page.close()}
  }

  // Deduplicated internal-link HTTP verification.
  for(const href of internalLinks){
    try{
      const u=new URL(href); if(u.origin!==BASE) continue;
      if(u.pathname.startsWith('/api/')) continue;
      const r=await request.get(href,{timeout:20000,maxRedirects:5});
      if(r.status()>=400) failures.push(`BROKEN_INTERNAL ${r.status()} ${href}`);
    }catch(e){failures.push(`BROKEN_INTERNAL_ERR ${href} :: ${String(e.message||e).slice(0,140)}`)}
  }

  async function withPage(path,fn){
    const page=await context.newPage(); const runtime=await preparePage(page,path);
    try{
      const res=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:30000});
      if(!res||res.status()>=400) throw new Error(`HTTP ${res?.status()}`);
      await page.waitForTimeout(800); await fn(page);
      if(runtime.pageErrors.length) throw new Error(`pageerror: ${runtime.pageErrors.join(' | ')}`);
      if(runtime.badSameOrigin.length) throw new Error(`resource errors: ${runtime.badSameOrigin.join(', ')}`);
    }catch(e){failures.push(`FLOW ${path} :: ${String(e.message||e).slice(0,350)}`)}finally{await page.close()}
  }

  await withPage('/articles/assembly-career',async page=>{
    const links=page.locator('[data-program-link]:visible');
    if(await links.count()<1) throw new Error('no visible affiliate offer after runtime enhancement');
    for(let i=0;i<await links.count();i++){
      const href=await links.nth(i).getAttribute('href');
      if(!href||href==='#'||!/^https?:\/\//.test(href)) throw new Error(`affiliate CTA unresolved: ${href}`);
    }
  });

  await withPage('/diagnosis',async page=>{
    for(let i=0;i<7;i++){
      const q=page.locator('.question.active');
      if(await q.count()!==1) throw new Error(`active question missing at ${i+1}`);
      await q.locator('.choice').first().click();
      await page.locator('#nextBtn').click();
      await page.waitForTimeout(80);
    }
    if(!await page.locator('#resultBox').evaluate(el=>el.classList.contains('active'))) throw new Error('result box not active');
    const score=(await page.locator('#score').textContent()||'').trim();
    if(!/^\d+%$/.test(score)) throw new Error(`invalid result score ${score}`);
    const diagEvent=await page.evaluate(()=>[...(window.dataLayer||[])].reverse().find(x=>x&&x.event==='diagnosis_complete')||null);
    if(diagEvent && ['score','result_type','job','change','intent','guide'].some(k=>Object.prototype.hasOwnProperty.call(diagEvent,k))) throw new Error(`diagnosis answers leaked to analytics event: ${JSON.stringify(diagEvent)}`);
  });

  await withPage('/tools/salary-compare',async page=>{
    const values={base:'250000',bonus:'800000',night:'40000',ot:'35000',other:'15000'};
    for(const [id,v] of Object.entries(values)) await page.locator('#'+id).fill(v);
    await page.locator('#calc').click();
    const annual=(await page.locator('#annual').textContent()||'').replace(/\s/g,'');
    const ratio=(await page.locator('#ratio').textContent()||'').trim();
    if(annual!=='4,880,000円') throw new Error(`annual mismatch: ${annual}`);
    if(ratio!=='18%') throw new Error(`ratio mismatch: ${ratio}`);
    if(!await page.locator('#result').evaluate(el=>el.classList.contains('active'))) throw new Error('salary result hidden');
  });

  await withPage('/tools/job-offer-score',async page=>{
    const ids=['income','night','overtime','holiday','commute','work'];
    for(const id of ids) await page.locator('#'+id).selectOption('3');
    await page.locator('#calc').click();
    if((await page.locator('#total').textContent()||'').trim()!=='18/30') throw new Error('total score mismatch');
    if((await page.locator('#pct').textContent()||'').trim()!=='60点') throw new Error('100-point score mismatch');
  });

  await withPage('/tools/resume-draft',async page=>{
    await page.locator('#years').fill('5');
    await page.locator('#process').fill('自動車部品の組立工程');
    await page.locator('#tools').fill('トルクレンチ');
    await page.locator('#quality').fill('5Sと不良一次対応');
    await page.locator('#role').fill('新人教育');
    await page.locator('#make').click();
    const out=(await page.locator('#output').textContent()||'');
    for(const s of ['5年程度','自動車部品の組立工程','トルクレンチ','5Sと不良一次対応','新人教育']) if(!out.includes(s)) throw new Error(`resume output missing ${s}`);
    const ev=await page.evaluate(()=>[...(window.dataLayer||[])].reverse().find(x=>x&&x.event==='resume_tool_complete')||null);
    if(ev&&Object.prototype.hasOwnProperty.call(ev,'job')) throw new Error(`resume input leaked to analytics event: ${JSON.stringify(ev)}`);
  });

  await browser.close();
  const uniq=a=>[...new Set(a)]; const F=uniq(failures),W=uniq(warnings);
  console.log(`AUDITED_PAGES=${urls.length}`);
  console.log(`INTERNAL_LINKS_CHECKED=${internalLinks.size}`);
  console.log(`WARNINGS=${W.length}`); W.forEach(x=>console.log('WARN',x));
  console.log(`FAILURES=${F.length}`); F.forEach(x=>console.error('FAIL',x));
  if(F.length) process.exit(1);
  console.log('PASS: production pages and critical user flows are consistent.');
})().catch(e=>{console.error(e);process.exit(1)});
