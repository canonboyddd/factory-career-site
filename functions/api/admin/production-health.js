function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function auth(request,env){const x=request.headers.get('authorization')||'';return Boolean(env.ADMIN_TOKEN&&x===`Bearer ${env.ADMIN_TOKEN}`)}
const BASE='https://norimono-cost.com';
async function fetchText(path,limit=350000){const started=Date.now();let res=null,text='';try{res=await fetch(BASE+path,{headers:{'user-agent':'ops-health-check/1.0','cache-control':'no-cache'},cf:{cacheTtl:0}});text=(await res.text()).slice(0,limit);return{ok:res.ok,status:res.status,ms:Date.now()-started,text}}catch(e){return{ok:false,status:0,ms:Date.now()-started,text:'',error:String(e?.message||e)}}}
function check(name,kind,path,result,pass,detail=''){return{name,kind,path,ok:Boolean(result?.ok&&pass),http_status:Number(result?.status||0),ms:Number(result?.ms||0),detail:detail||(!result?.ok?(result?.error||`HTTP ${result?.status||0}`):'')}}
export async function onRequestGet({request,env}){
  if(!auth(request,env))return json({ok:false,error:'unauthorized'},401);
  const pages=['/','/car-value','/sell-car','/trade-in-vs-buyback','/old-car-sell','/bike-value','/car-insurance','/recommend','/cars/honda-n-box','/bikes/honda-rebel-250'];
  const pageResults=await Promise.all(pages.map(p=>fetchText(p,180000)));
  const checks=[];
  pages.forEach((p,i)=>{const r=pageResults[i];checks.push(check(`ページ ${p}`,'page',p,r,r.ok&&/<!doctype|<html/i.test(r.text),r.ok?'HTML応答':'到達失敗'))});
  const [robots,sitemap,loader,afb,cro,marker]=await Promise.all([
    fetchText('/robots.txt',120000),fetchText('/sitemap-index.xml',260000),fetchText('/page-loader-v50.js',260000),fetchText('/affiliate-afb-v84.js',260000),fetchText('/affiliate-cro-v114.js',260000),fetchText('/deploy-marker.txt',50000)
  ]);
  checks.push(check('robots → sitemap-index','seo','/robots.txt',robots,/sitemap-index\.xml/i.test(robots.text)&&!/Sitemap:\s*https?:\/\/[^\s]+\/sitemap-(?:cars|bikes|guides)/i.test(robots.text),'sitemap-index.xml を正規入口にする'));
  checks.push(check('サイトマップ index','seo','/sitemap-index.xml',sitemap,/<sitemapindex/i.test(sitemap.text)&&/sitemap/i.test(sitemap.text),'分割サイトマップのindex'));
  checks.push(check('中央計測トラッカー接続','analytics','/page-loader-v50.js',loader,/central-tracker\.js\?v=20260928-6/.test(loader.text)&&/data\.site|dataset\.site/.test(loader.text),'car-bike → 統合管理計測'));
  checks.push(check('AFB ズバット設定','affiliate','/affiliate-afb-v84.js',afb,/Z209o-31470S/.test(afb.text)&&/affiliate-b\.com/.test(afb.text),'AFB ID 1470'));
  checks.push(check('収益導線CRO','affiliate','/affiliate-cro-v114.js',cro,/sell_diagnosis_result|car_value_post_estimate|car_insurance_post_estimate/.test(cro.text),'主要配置ID'));
  checks.push(check('デプロイマーカー','deploy','/deploy-marker.txt',marker,/v115-github-production-qa/.test(marker.text),'GitHub本番QAマーカー'));
  const failed=checks.filter(x=>!x.ok);const passed=checks.length-failed.length;const slow=checks.filter(x=>x.ms>=2500).map(x=>({name:x.name,path:x.path,ms:x.ms}));
  return json({ok:true,generated_at:new Date().toISOString(),base:BASE,summary:{total:checks.length,passed,failed:failed.length,slow:slow.length,status:failed.length?'warning':'pass'},checks,failed,slow});
}
