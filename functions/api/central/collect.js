function cors(request){const origin=request.headers.get('origin')||'';return {'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','access-control-allow-origin':origin||'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type','vary':'Origin'};}
function json(request,data,status=200){return new Response(JSON.stringify(data),{status,headers:cors(request)});}
function automated(request){const ua=String(request.headers.get('user-agent')||'');return /bot|crawler|spider|slurp|bingpreview|google-inspectiontool|lighthouse|pagespeed|headless|phantom|selenium|puppeteer|playwright|facebookexternalhit|twitterbot|linkedinbot|discordbot|uptimerobot|pingdom|monitor/i.test(ua);}
function securityProbe(path){const p=String(path||'').toLowerCase();return /^\/\//.test(p)||/\.html\//.test(p)||/^\/(?:\.git\/|\.ssh\/|actuator\/|\.env(?:\.|$)|wp-admin(?:\/|$)|wp-login(?:\.php)?|wordpress(?:\/|$)|wp(?:\/|$)|wp-content(?:\/|$)|wp-includes(?:\/|$)|xmlrpc\.php(?:\/|$)|openid_connect(?:\/|$)|cpanel(?:\/|$)|phpmyadmin(?:\/|$)|server-status(?:\/|$)|vendor\/phpunit\/|\.aws\/|\.docker\/|config\/|boaform\/|cgi-bin\/)/.test(p);}
async function schema(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS central_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
    site_key TEXT NOT NULL,
    event_name TEXT NOT NULL,
    browser_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    provider TEXT,
    program TEXT,
    placement TEXT,
    variant TEXT,
    outbound_domain TEXT,
    device_type TEXT,
    page_type TEXT,
    vehicle TEXT,
    actress TEXT,
    genre TEXT,
    maker TEXT,
    product_id TEXT,
    cta_position TEXT,
    search_query TEXT,
    result_count INTEGER,
    origin_page_path TEXT,
    origin_page_type TEXT,
    origin_actress TEXT,
    origin_genre TEXT,
    origin_maker TEXT
  )`).run();
  const info=await db.prepare('PRAGMA table_info(central_events)').all();
  const columns=new Set((info?.results||[]).map(x=>String(x.name||'')));
  for(const [name,type] of [
    ['provider','TEXT'],['page_type','TEXT'],['vehicle','TEXT'],['variant','TEXT'],
    ['actress','TEXT'],['genre','TEXT'],['maker','TEXT'],['product_id','TEXT'],
    ['cta_position','TEXT'],['search_query','TEXT'],['result_count','INTEGER'],
    ['origin_page_path','TEXT'],['origin_page_type','TEXT'],['origin_actress','TEXT'],
    ['origin_genre','TEXT'],['origin_maker','TEXT']
  ]){
    if(!columns.has(name)){try{await db.prepare(`ALTER TABLE central_events ADD COLUMN ${name} ${type}`).run()}catch(error){if(!/duplicate column/i.test(String(error?.message||error)))throw error}}
  }
  await db.batch([
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_time ON central_events(occurred_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_site ON central_events(site_key)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_event ON central_events(event_name)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_program ON central_events(program)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_provider ON central_events(provider)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_page ON central_events(site_key,page_path)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_browser ON central_events(site_key,browser_id,occurred_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_variant ON central_events(site_key,program,placement,variant)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_product ON central_events(site_key,product_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_actress ON central_events(site_key,actress)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_genre ON central_events(site_key,genre)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_maker ON central_events(site_key,maker)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_origin_actress ON central_events(site_key,origin_actress)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_origin_genre ON central_events(site_key,origin_genre)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_origin_maker ON central_events(site_key,origin_maker)`)
  ]);
}
const validSite=/^[a-z0-9_-]{2,40}$/i;
function cleanBody(body){return{
  site_key:String(body.site_key||'').trim(),
  event_name:String(body.event_name||'page_view').slice(0,80),
  browser_id:String(body.browser_id||'').slice(0,120),
  session_id:String(body.session_id||'').slice(0,120),
  page_path:String(body.page_path||'/').slice(0,500),
  page_title:String(body.page_title||'').slice(0,300),
  referrer:String(body.referrer||'').slice(0,500),
  provider:String(body.provider||'').slice(0,80),
  program:String(body.program||'').slice(0,100),
  placement:String(body.placement||'').slice(0,160),
  variant:String(body.variant||'').slice(0,24),
  outbound_domain:String(body.outbound_domain||'').slice(0,180),
  device_type:String(body.device_type||'').slice(0,40),
  page_type:String(body.page_type||'').slice(0,80),
  vehicle:String(body.vehicle||'').slice(0,180),
  actress:String(body.actress||'').slice(0,240),
  genre:String(body.genre||'').slice(0,240),
  maker:String(body.maker||'').slice(0,180),
  product_id:String(body.product_id||'').slice(0,160),
  cta_position:String(body.cta_position||'').slice(0,100),
  search_query:String(body.search_query||'').slice(0,300),
  result_count:Number.isFinite(Number(body.result_count))?Math.max(0,Math.trunc(Number(body.result_count))):null,
  origin_page_path:String(body.origin_page_path||'').slice(0,500),
  origin_page_type:String(body.origin_page_type||'').slice(0,80),
  origin_actress:String(body.origin_actress||'').slice(0,240),
  origin_genre:String(body.origin_genre||'').slice(0,240),
  origin_maker:String(body.origin_maker||'').slice(0,180)
};}
async function behavioralCrawler(db,body){
  if(body.event_name!=='page_view')return false;
  const x=await db.prepare(`SELECT COUNT(*) views,COUNT(DISTINCT page_path) paths,COUNT(DISTINCT session_id) sessions FROM central_events WHERE site_key=? AND browser_id=? AND event_name='page_view' AND occurred_at>=datetime('now','-1 day')`).bind(body.site_key,body.browser_id).first();
  const views=Number(x?.views||0),paths=Number(x?.paths||0),sessions=Number(x?.sessions||0);
  return views>=24&&paths>=18&&paths/Math.max(views,1)>=0.60&&sessions<=5;
}
async function save(request,env,raw){
  if(automated(request))return json(request,{ok:true,filtered:'automated'});
  if(!env.ANALYTICS_DB)return json(request,{ok:false,error:'ANALYTICS_DB missing'},503);
  const body=cleanBody(raw||{});
  if(!validSite.test(body.site_key))return json(request,{ok:false,error:'invalid_site_key'},400);
  if(!body.browser_id||!body.session_id)return json(request,{ok:false,error:'missing_ids'},400);
  if(securityProbe(body.page_path))return json(request,{ok:true,filtered:'security_probe'});
  await schema(env.ANALYTICS_DB);
  if(await behavioralCrawler(env.ANALYTICS_DB,body))return json(request,{ok:true,filtered:'behavioral_crawler'});
  await env.ANALYTICS_DB.prepare(`INSERT INTO central_events(site_key,event_name,browser_id,session_id,page_path,page_title,referrer,provider,program,placement,variant,outbound_domain,device_type,page_type,vehicle,actress,genre,maker,product_id,cta_position,search_query,result_count,origin_page_path,origin_page_type,origin_actress,origin_genre,origin_maker) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    body.site_key,body.event_name,body.browser_id,body.session_id,body.page_path,body.page_title,body.referrer,
    body.provider,body.program,body.placement,body.variant,body.outbound_domain,body.device_type,body.page_type,
    body.vehicle,body.actress,body.genre,body.maker,body.product_id,body.cta_position,body.search_query,body.result_count,
    body.origin_page_path,body.origin_page_type,body.origin_actress,body.origin_genre,body.origin_maker
  ).run();
  return json(request,{ok:true});
}
export async function onRequestOptions({request}){return new Response(null,{status:204,headers:cors(request)});}
export async function onRequestGet({request,env}){const u=new URL(request.url);return save(request,env,Object.fromEntries(u.searchParams.entries()));}
export async function onRequestPost({request,env}){let body={};try{const text=await request.text();body=text?JSON.parse(text):{};}catch{return json(request,{ok:false,error:'invalid_json'},400);}return save(request,env,body);}
