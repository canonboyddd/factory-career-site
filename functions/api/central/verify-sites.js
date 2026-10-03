const CENTRAL_SITES=['sugutsucool','car-bike','okazu','clipmade'];
const ALL_SITES=['factory',...CENTRAL_SITES];
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function statusOf(recent,last){if(Number(recent||0)>0)return'recent';if(last)return'stale';return'never'}
export async function onRequestGet({request,env}){
  if(!env.ANALYTICS_DB)return json({ok:false,error:'ANALYTICS_DB missing'},503);
  const u=new URL(request.url);
  const hours=Math.max(1,Math.min(168,Number(u.searchParams.get('hours')||24)||24));
  const mod=`-${hours} hours`;
  const centralRecent=await env.ANALYTICS_DB.prepare(`SELECT site_key,COUNT(*) AS page_views,MAX(occurred_at) AS last_recent FROM central_events WHERE site_key IN ('sugutsucool','car-bike','okazu','clipmade') AND event_name='page_view' AND occurred_at>=datetime('now',?) GROUP BY site_key`).bind(mod).all();
  const centralLast=await env.ANALYTICS_DB.prepare(`SELECT site_key,MAX(occurred_at) AS last_page_view FROM central_events WHERE site_key IN ('sugutsucool','car-bike','okazu','clipmade') AND event_name='page_view' GROUP BY site_key`).all();
  const factoryRecent=await env.ANALYTICS_DB.prepare(`SELECT COUNT(*) AS page_views,MAX(occurred_at) AS last_recent FROM analytics_events WHERE event_name='page_view' AND occurred_at>=datetime('now',?)`).bind(mod).first()||{};
  const factoryLast=await env.ANALYTICS_DB.prepare(`SELECT MAX(occurred_at) AS last_page_view FROM analytics_events WHERE event_name='page_view'`).first()||{};
  const recentMap=new Map((centralRecent.results||[]).map(x=>[x.site_key,x]));
  const lastMap=new Map((centralLast.results||[]).map(x=>[x.site_key,x.last_page_view||null]));
  const sites=ALL_SITES.map(site_key=>{
    const recent=site_key==='factory'?factoryRecent:(recentMap.get(site_key)||{});
    const page_views=Number(recent.page_views||0);
    const last_page_view=site_key==='factory'?(factoryLast.last_page_view||null):(lastMap.get(site_key)||null);
    return{site_key,page_views,last_page_view,status:statusOf(page_views,last_page_view)};
  });
  const payload={ok:true,hours,generated_at:new Date().toISOString(),sites,note:'page_views is raw accepted page_view receipt in the selected window. Dashboard reporting may further exclude automated traffic.'};
  if(u.searchParams.get('format')==='json')return json(payload);
  const rows=sites.map(x=>`<tr><td>${esc(x.site_key)}</td><td>${x.page_views}</td><td>${esc(x.last_page_view||'-')}</td><td>${esc(x.status)}</td></tr>`).join('');
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>all-five-analytics-verification</title></head><body><h1>All-site analytics receipt verification</h1><p>Window: ${hours} hours</p><table border="1" cellpadding="6"><thead><tr><th>site</th><th>page views received</th><th>last page view</th><th>status</th></tr></thead><tbody>${rows}</tbody></table><p>${esc(payload.note)}</p></body></html>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}
