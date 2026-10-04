const ORIGIN='https://norimono-cost.com';
const START=`${ORIGIN}/sitemap-index.xml`;
const CONCURRENCY=10;
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
function visibleText(html){return html
  .replace(/<script\b[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
  .replace(/<template\b[\s\S]*?<\/template>/gi,' ')
  .replace(/<!--([\s\S]*?)-->/g,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/\s+/g,' ').trim();
}
async function get(url){const r=await fetch(url,{headers:{'user-agent':'NorimonoPublicCopyAudit/1.2'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return {text:await r.text(),type:r.headers.get('content-type')||''};}
async function collectSitemaps(start){const seen=new Set(),pages=new Set(),queue=[start];while(queue.length){const u=queue.shift();if(seen.has(u))continue;seen.add(u);const {text}=await get(u);for(const loc of urlsFromXml(text)){if(/\.xml(?:$|\?)/i.test(loc))queue.push(loc);else if(loc.startsWith(ORIGIN))pages.add(loc);}}return [...pages];}
const pages=await collectSitemaps(START);
console.log(`AUDIT_URLS=${pages.length}`);
let next=0;const violations=[];const errors=[];
async function worker(){while(true){const i=next++;if(i>=pages.length)return;const url=pages[i];try{const {text,type}=await get(url);if(!type.includes('text/html'))continue;const path=new URL(url).pathname;const body=visibleText(text);for(const [name,re] of PATTERNS){if(LEGAL_ALLOW[path]?.has(name))continue;if(re.test(body)){const m=body.match(re);const at=m?.index??0;violations.push({url,name,excerpt:body.slice(Math.max(0,at-80),Math.min(body.length,at+180))});}}
}catch(e){errors.push(String(e.message||e));}}
}
await Promise.all(Array.from({length:CONCURRENCY},()=>worker()));
const unique=[];const keys=new Set();for(const v of violations){const k=`${v.url}|${v.name}`;if(!keys.has(k)){keys.add(k);unique.push(v);}}
for(const v of unique)console.log(`VIOLATION\t${v.name}\t${v.url}\t${v.excerpt}`);
for(const e of errors.slice(0,100))console.log(`FETCH_ERROR\t${e}`);
console.log(`AUDIT_RESULT urls=${pages.length} violations=${unique.length} fetchErrors=${errors.length}`);
if(unique.length||errors.length)process.exitCode=1;
