export async function onRequestGet({env}){
  if(!env.ANALYTICS_DB)return new Response('<!doctype html><meta charset="utf-8"><title>DB_MISSING</title><h1>DB missing</h1>',{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  const r=await env.ANALYTICS_DB.prepare(`SELECT site_key,SUM(CASE WHEN event_name='page_view' THEN 1 ELSE 0 END) AS pv,COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) AS sessions,MAX(occurred_at) AS last_seen FROM central_events GROUP BY site_key ORDER BY site_key`).all();
  const rows=r.results||[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const title=rows.length?rows.map(x=>`${x.site_key}:${Number(x.pv||0)}/${Number(x.sessions||0)}`).join(' | '):'NO_DATA';
  const body=rows.map(x=>`<li><b>${esc(x.site_key)}</b> PV ${Number(x.pv||0)} / sessions ${Number(x.sessions||0)} / last ${esc(x.last_seen||'')}</li>`).join('')||'<li>NO_DATA</li>';
  return new Response(`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><body><h1>Central diagnostics</h1><ul>${body}</ul></body></html>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}
