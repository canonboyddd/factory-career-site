const SITES=['sugutsucool','car-bike','okazu','clipmade'];
export async function onRequestGet({env}){
  if(!env.ANALYTICS_DB)return new Response(JSON.stringify({ok:false,error:'DB missing'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
  const r=await env.ANALYTICS_DB.prepare(`SELECT site_key,COUNT(*) AS events,MAX(occurred_at) AS last_seen FROM central_events WHERE site_key IN ('sugutsucool','car-bike','okazu','clipmade') AND occurred_at>=datetime('now','-30 minutes') GROUP BY site_key`).all();
  const map=new Map((r.results||[]).map(x=>[x.site_key,{events:Number(x.events||0),last_seen:x.last_seen||null}]));
  return new Response(JSON.stringify({ok:true,sites:SITES.map(site_key=>({site_key,received:map.has(site_key),events:map.get(site_key)?.events||0,last_seen:map.get(site_key)?.last_seen||null}))}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
