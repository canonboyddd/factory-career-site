function cors(request){const origin=request.headers.get('origin')||'';return {'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':origin||'*','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type','vary':'Origin'};}
function json(request,data,status=200){return new Response(JSON.stringify(data),{status,headers:cors(request)});}
async function schema(db){await db.batch([
 db.prepare(`CREATE TABLE IF NOT EXISTS central_events (id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL DEFAULT (datetime('now')), site_key TEXT NOT NULL, event_name TEXT NOT NULL, browser_id TEXT NOT NULL, session_id TEXT NOT NULL, page_path TEXT NOT NULL, page_title TEXT, referrer TEXT, program TEXT, placement TEXT, outbound_domain TEXT, device_type TEXT)`),
 db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_time ON central_events(occurred_at)`),
 db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_site ON central_events(site_key)`),
 db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_event ON central_events(event_name)`)
]);}
const validSite=/^[a-z0-9_-]{2,40}$/i;
export async function onRequestOptions({request}){return new Response(null,{status:204,headers:cors(request)});}
export async function onRequestPost({request,env}){
 if(!env.ANALYTICS_DB) return json(request,{ok:false,error:'ANALYTICS_DB missing'},503);
 let body={};try{body=await request.json();}catch{return json(request,{ok:false,error:'invalid_json'},400);}
 const site=String(body.site_key||'').trim(); const event=String(body.event_name||'page_view').slice(0,80);
 if(!validSite.test(site)) return json(request,{ok:false,error:'invalid_site_key'},400);
 const browser=String(body.browser_id||'').slice(0,120); const session=String(body.session_id||'').slice(0,120);
 if(!browser||!session) return json(request,{ok:false,error:'missing_ids'},400);
 await schema(env.ANALYTICS_DB);
 await env.ANALYTICS_DB.prepare(`INSERT INTO central_events(site_key,event_name,browser_id,session_id,page_path,page_title,referrer,program,placement,outbound_domain,device_type) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(site,event,browser,session,String(body.page_path||'/').slice(0,500),String(body.page_title||'').slice(0,300),String(body.referrer||'').slice(0,500),String(body.program||'').slice(0,100),String(body.placement||'').slice(0,160),String(body.outbound_domain||'').slice(0,180),String(body.device_type||'').slice(0,40)).run();
 return json(request,{ok:true});
}
