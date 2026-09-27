const SITES=['sugutsucool','car-bike','okazu','clipmade'];
export async function onRequestGet({env}){
  if(!env.ANALYTICS_DB)return new Response('<html><body>DB missing</body></html>',{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  const r=await env.ANALYTICS_DB.prepare(`SELECT site_key,COUNT(*) AS events,MAX(occurred_at) AS last_seen FROM central_events WHERE site_key IN ('sugutsucool','car-bike','okazu','clipmade') AND occurred_at>=datetime('now','-60 minutes') GROUP BY site_key`).all();
  const map=new Map((r.results||[]).map(x=>[x.site_key,{events:Number(x.events||0),last_seen:x.last_seen||null}]));
  const items=SITES.map(k=>{const x=map.get(k);return `<li>${k}: ${x?`received ${x.events}`:'not-received'}${x?.last_seen?` / ${x.last_seen}`:''}</li>`}).join('');
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>central verify</title></head><body><h1>Central tracking verification</h1><ul>${items}</ul></body></html>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}
