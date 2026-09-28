export async function onRequestGet({env}){
  if(!env.ANALYTICS_DB){return new Response(JSON.stringify({ok:false,error:'DB missing'}),{status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
  const result=await env.ANALYTICS_DB.prepare(`
    SELECT site_key,
           SUM(CASE WHEN event_name='page_view' THEN 1 ELSE 0 END) AS page_views,
           COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) AS sessions,
           MAX(occurred_at) AS last_seen
    FROM central_events
    GROUP BY site_key
    ORDER BY site_key
  `).all();
  return new Response(JSON.stringify({ok:true,sites:result.results||[]}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
}
