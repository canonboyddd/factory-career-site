const BASE='https://norimono-cost.com';
const INDEX=`${BASE}/sitemap-index.xml`;
const CONCURRENCY=16;\n// feedback indexability guard: public feedback is submitted in the sitemap and must never regress to noindex.

function extractLocs(xml){return [...String(xml||'').matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m=>m[1].trim())}
function canonicalFrom(html){const m=String(html||'').match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);return m?(m[1]||m[2]||'').trim():''}
function robotsFrom(html){const m=String(html||'').match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["'][^>]*>/i);return m?(m[1]||m[2]||'').trim().toLowerCase():''}
function norm(u){try{const x=new URL(u);x.hash='';return x.href.replace(/\/$/,'')}catch{return String(u||'').replace(/\/$/,'')}}
async function fetchText(url,opts={}){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 norimono-indexability-audit/1.0'},...opts});return {r,text:await r.text()}}
async function pooled(items,fn,n=CONCURRENCY){let i=0;const out=[];async function worker(){while(true){const k=i++;if(k>=items.length)return;out[k]=await fn(items[k],k)}}await Promise.all(Array.from({length:Math.min(n,items.length)},worker));return out}

(async()=>{
  const problems=[];
  const warnings=[];
  const index=await fetchText(INDEX);
  if(index.r.status!==200)throw new Error(`sitemap index HTTP ${index.r.status}`);
  const sitemapUrls=extractLocs(index.text);
  if(!sitemapUrls.length)throw new Error('no child sitemaps');
  const maps=await pooled(sitemapUrls,async url=>{
    const x=await fetchText(url);
    if(x.r.status!==200)problems.push({type:'sitemap_http',url,status:x.r.status});
    return {url,locs:extractLocs(x.text)};
  },8);
  const refs=[];for(const m of maps)for(const url of m.locs)refs.push({sitemap:m.url,url});
  const byUrl=new Map();for(const x of refs){const a=byUrl.get(x.url)||[];a.push(x.sitemap);byUrl.set(x.url,a)}
  for(const [url,maps2] of byUrl)if(maps2.length>1)warnings.push({type:'duplicate_sitemap_url',url,count:maps2.length,sitemaps:maps2});
  const urls=[...byUrl.keys()];
  const checks=await pooled(urls,async url=>{
    let manual;
    try{manual=await fetch(url,{redirect:'manual',headers:{'user-agent':'Mozilla/5.0 norimono-indexability-audit/1.0'}})}catch(e){return {url,error:String(e)}}
    const status=manual.status;
    const location=manual.headers.get('location')||'';
    if(status>=300&&status<400)return {url,status,location,redirect:true};
    let html='';try{html=await manual.text()}catch{}
    const type=manual.headers.get('content-type')||'';
    const canonical=/text\/html/i.test(type)?canonicalFrom(html):'';
    const robots=/text\/html/i.test(type)?robotsFrom(html):'';
    return {url,status,type,canonical,robots,redirect:false};
  });
  const canonicalOwners=new Map();
  for(const c of checks){
    if(c.error){problems.push({type:'fetch_error',url:c.url,error:c.error});continue}
    if(c.redirect){problems.push({type:'redirect_in_sitemap',url:c.url,status:c.status,location:c.location});continue}
    if(c.status!==200){problems.push({type:'non_200',url:c.url,status:c.status});continue}
    if(/text\/html/i.test(c.type||'')){
      if(/noindex/.test(c.robots||''))problems.push({type:'noindex_in_sitemap',url:c.url,robots:c.robots});
      if(!c.canonical)problems.push({type:'missing_canonical',url:c.url});
      else if(norm(c.canonical)!==norm(c.url))problems.push({type:'canonical_mismatch',url:c.url,canonical:c.canonical});
      if(c.canonical){const k=norm(c.canonical),a=canonicalOwners.get(k)||[];a.push(c.url);canonicalOwners.set(k,a)}
    }
  }
  for(const [canonical,owners] of canonicalOwners)if(new Set(owners).size>1)problems.push({type:'duplicate_canonical',canonical,urls:[...new Set(owners)]});
  const summary={sitemaps:sitemapUrls.length,raw_refs:refs.length,unique_urls:urls.length,problems:problems.length,warnings:warnings.length,by_type:{},warning_types:{}};
  for(const p of problems)summary.by_type[p.type]=(summary.by_type[p.type]||0)+1;
  for(const w of warnings)summary.warning_types[w.type]=(summary.warning_types[w.type]||0)+1;
  console.log('INDEXABILITY_SUMMARY '+JSON.stringify(summary));
  console.log('SITEMAP_COUNTS '+JSON.stringify(maps.map(m=>({sitemap:m.url,count:m.locs.length}))));
  if(warnings.length)console.log('INDEXABILITY_WARNINGS '+JSON.stringify(warnings.slice(0,200)));
  if(problems.length){console.log('INDEXABILITY_PROBLEMS '+JSON.stringify(problems.slice(0,200)));process.exit(1)}
  console.log('PASS: all unique sitemap URLs are direct 200, indexable, and self-canonical.');
})().catch(e=>{console.error(e);process.exit(2)});
