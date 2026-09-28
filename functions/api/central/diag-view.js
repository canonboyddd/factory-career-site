export async function onRequestGet({env}){
  if(!env.ANALYTICS_DB)return new Response('<title>DB_MISSING</title>',{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  const r=await env.ANALYTICS_DB.prepare(`SELECT site_key,SUM(CASE WHEN event_name='page_view' THEN 1 ELSE 0 END) AS pv,COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) AS sessions,MAX(occurred_at) AS last_seen FROM central_events GROUP BY site_key ORDER BY site_key`).all();
  const rows=r.results||[];
  const title=rows.length?rows.map(x=>`${x.site_key}:${Number(x.pv||0)}/${Number(x.sessions||0)}`).join(' | '):'NO_DATA';
  const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const body=rows.map(x=>`${esc(x.site_key)} | pv=${Number(x.pv||0)} | sessions=${Number(x.sessions||0)} | last=${esc(x.last_seen||'')}`).join('\n')||'NO_DATA';
  return new Response(`<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><pre>${body}</pre>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}
