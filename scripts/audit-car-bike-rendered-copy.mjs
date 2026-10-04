import { chromium } from 'playwright';

const ORIGIN='https://norimono-cost.com';
const START=`${ORIGIN}/sitemap-index.xml`;
const CONCURRENCY=6;
const PATTERNS=[
  ['運営者向け',/運営者向け/],['サイト運営者',/サイト運営者/],['管理者向け',/管理者向け/],['運営用',/運営用/],['管理用',/管理用/],
  ['運営メモ',/運営メモ/],['運用メモ',/運用メモ/],['管理メモ',/管理メモ/],['内部用',/内部用/],['サイト改善用',/サイト改善用/],
  ['本番では',/本番では/],['本番公開',/本番公開/],['成果報酬案件',/成果報酬案件/],['収益導線',/収益導線/],['収益化',/収益化/],['収益確認',/収益確認/],['案件クリック',/案件クリック/],
  ['ASP',/(^|[^A-Za-z])ASP([^A-Za-z]|$)/],['CTA',/(^|[^A-Za-z])CTA([^A-Za-z]|$)/],['CTR',/(^|[^A-Za-z])CTR([^A-Za-z]|$)/],['CVR',/(^|[^A-Za-z])CVR([^A-Za-z]|$)/],['A/Bテスト',/A\s*\/\s*B\s*テスト|ABテスト/i],['コンバージョン',/コンバージョン/],
  ['SEO用',/SEO用/i],['SEO強化',/SEO強化/i],['検索意図',/検索意図/],['内部リンク強化',/内部リンク強化/],['インデックス',/インデックス/],['canonical',/canonical/i],['構造化データ',/構造化データ/],['Search Console',/Search\s*Console/i],['IndexNow',/IndexNow/i],['サイトマップ送信',/サイトマップ送信/],
  ['D1',/(^|[^A-Za-z0-9])D1([^A-Za-z0-9]|$)/],['Cloudflare',/Cloudflare/i],['GitHub',/GitHub/i],['デバッグ',/デバッグ/],['テスト用',/テスト用/],['管理画面',/管理画面/],['デモ版',/デモ版/],['デモ収録',/デモ収録/],['開発版',/開発版/]
];
const LEGAL_ALLOW={
  '/policy':new Set(['サイト運営者','Cloudflare']),
  '/policy.html':new Set(['サイト運営者','Cloudflare'])
};
function urlsFromXml(xml){return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));}
async function fetchText(url){const r=await fetch(url,{headers:{'user-agent':'NorimonoRenderedCopyAudit/1.0'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.text();}
async function collectSitemaps(start){const seen=new Set(),pages=new Set(),queue=[start];while(queue.length){const u=queue.shift();if(seen.has(u))continue;seen.add(u);const xml=await fetchText(u);for(const loc of urlsFromXml(xml)){if(/\.xml(?:$|\?)/i.test(loc))queue.push(loc);else if(loc.startsWith(ORIGIN))pages.add(loc);}}return [...pages];}
const urls=await collectSitemaps(START);
console.log(`RENDERED_AUDIT_URLS=${urls.length}`);
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({userAgent:'NorimonoRenderedCopyAudit/1.0'});
await context.route('**/*',async route=>{
  const req=route.request();const t=req.resourceType();const u=req.url();
  if(['image','media','font'].includes(t)||/\/api\/(?:analytics|ops-collect|central\/collect)/.test(u))return route.abort();
  return route.continue();
});
let next=0;const hits=[];const errors=[];
async function worker(){const page=await context.newPage();while(true){const i=next++;if(i>=urls.length)break;const url=urls[i];try{const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});if(!res||res.status()>=400){errors.push(`${res?.status()||0} ${url}`);continue;}await page.waitForTimeout(800);const body=(await page.locator('body').innerText({timeout:5000}).catch(()=>'' )).replace(/\s+/g,' ').trim();const path=new URL(url).pathname;for(const [name,re] of PATTERNS){if(LEGAL_ALLOW[path]?.has(name))continue;if(re.test(body)){const m=body.match(re),at=m?.index??0;hits.push({url,name,excerpt:body.slice(Math.max(0,at-80),Math.min(body.length,at+180))});}}
}catch(e){errors.push(`${url} ${String(e.message||e).slice(0,180)}`);}}
await page.close();}
await Promise.all(Array.from({length:CONCURRENCY},()=>worker()));
await browser.close();
const unique=[];const keys=new Set();for(const h of hits){const k=`${h.url}|${h.name}`;if(!keys.has(k)){keys.add(k);unique.push(h);}}
for(const h of unique)console.log(`RENDERED_VIOLATION\t${h.name}\t${h.url}\t${h.excerpt}`);
for(const e of errors.slice(0,100))console.log(`RENDERED_FETCH_ERROR\t${e}`);
console.log(`RENDERED_AUDIT_RESULT urls=${urls.length} violations=${unique.length} fetchErrors=${errors.length}`);
if(unique.length||errors.length)process.exitCode=1;
