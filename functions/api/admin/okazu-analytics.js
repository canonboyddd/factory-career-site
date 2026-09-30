function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function auth(request,env){const x=request.headers.get('authorization')||'';return Boolean(env.ADMIN_TOKEN&&x===`Bearer ${env.ADMIN_TOKEN}`)}
function rows(x){return x?.results||[]}
function pct(n,d){return d?Math.round((Number(n||0)/Number(d||0))*10000)/100:0}
function num(v){return Number(v||0)}

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
  const cols=new Set(rows(info).map(x=>String(x.name||'')));
  for(const [name,type] of [
    ['provider','TEXT'],['program','TEXT'],['placement','TEXT'],['device_type','TEXT'],['page_type','TEXT'],
    ['actress','TEXT'],['genre','TEXT'],['maker','TEXT'],['product_id','TEXT'],['cta_position','TEXT'],
    ['origin_page_path','TEXT'],['origin_page_type','TEXT'],['origin_actress','TEXT'],['origin_genre','TEXT'],['origin_maker','TEXT']
  ]){
    if(!cols.has(name)){try{await db.prepare(`ALTER TABLE central_events ADD COLUMN ${name} ${type}`).run()}catch(e){if(!/duplicate column/i.test(String(e?.message||e)))throw e}}
  }
  await db.batch([
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_okazu_time ON central_events(site_key,occurred_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_okazu_event ON central_events(site_key,event_name)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_okazu_actress ON central_events(site_key,origin_actress)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_okazu_genre ON central_events(site_key,origin_genre)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_okazu_maker ON central_events(site_key,origin_maker)`)
  ]);
}

async function entityRows(db,cutoff,mod,type,column,originColumn){
  const valid=['actress','genre','maker'];
  if(!valid.includes(type))throw new Error('invalid entity type');
  const sql=`WITH period AS (
      SELECT * FROM central_events WHERE site_key='okazu' AND occurred_at>=${cutoff}
    ), views AS (
      SELECT ${column} name,COUNT(*) views,COUNT(DISTINCT session_id) view_sessions
      FROM period
      WHERE event_name='page_view' AND page_type='${type}' AND COALESCE(${column},'')<>''
      GROUP BY ${column}
    ), clicks AS (
      SELECT CASE
        WHEN COALESCE(${originColumn},'')<>'' THEN ${originColumn}
        WHEN page_type='${type}' THEN ${column}
        ELSE '' END name,
        COUNT(*) clicks,COUNT(DISTINCT session_id) click_sessions
      FROM period
      WHERE event_name='affiliate_click'
      GROUP BY name
    ), keys AS (
      SELECT name FROM views UNION SELECT name FROM clicks WHERE name<>''
    )
    SELECT k.name,COALESCE(v.views,0) views,COALESCE(v.view_sessions,0) view_sessions,
      COALESCE(c.clicks,0) clicks,COALESCE(c.click_sessions,0) click_sessions
    FROM keys k
    LEFT JOIN views v ON v.name=k.name
    LEFT JOIN clicks c ON c.name=k.name
    WHERE COALESCE(k.name,'')<>''
    ORDER BY clicks DESC,views DESC,name
    LIMIT 100`;
  const stmt=db.prepare(sql).bind(mod);
  const result=rows(await stmt.all());
  return result.map(x=>({...x,views:num(x.views),view_sessions:num(x.view_sessions),clicks:num(x.clicks),click_sessions:num(x.click_sessions),ctr:pct(x.clicks,x.views)}));
}

export async function onRequestGet({request,env}){
  if(!auth(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!env.ANALYTICS_DB)return json({ok:false,error:'ANALYTICS_DB missing'},503);
  const u=new URL(request.url),requested=Number(u.searchParams.get('days')||7),days=[1,7,30,90].includes(requested)?requested:7;
  const mod=`-${Math.max(days-1,0)} days`;
  const cutoff=`datetime(date('now','+9 hours',?),'-9 hours')`;
  const db=env.ANALYTICS_DB;
  await schema(db);
  const q=async(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return rows(await s.all())};
  const q1=async(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return await s.first()||{}};

  const summary=await q1(`SELECT
      SUM(CASE WHEN event_name='page_view' THEN 1 ELSE 0 END) page_views,
      COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) sessions,
      SUM(CASE WHEN event_name='product_open' THEN 1 ELSE 0 END) product_opens,
      SUM(CASE WHEN event_name='affiliate_click' THEN 1 ELSE 0 END) affiliate_clicks,
      COUNT(DISTINCT CASE WHEN event_name='affiliate_click' THEN session_id END) affiliate_sessions
    FROM central_events
    WHERE site_key='okazu' AND occurred_at>=${cutoff}`,[mod]);
  for(const k of ['page_views','sessions','product_opens','affiliate_clicks','affiliate_sessions'])summary[k]=num(summary[k]);
  summary.clicks_per_100_pv=summary.page_views?Math.round(summary.affiliate_clicks/summary.page_views*10000)/100:0;

  const actresses=await entityRows(db,cutoff,mod,'actress','actress','origin_actress');
  const genres=await entityRows(db,cutoff,mod,'genre','genre','origin_genre');
  const makers=await entityRows(db,cutoff,mod,'maker','maker','origin_maker');

  const ctaPositions=await q(`SELECT COALESCE(NULLIF(cta_position,''),'affiliate_link') cta_position,
      COUNT(*) clicks,COUNT(DISTINCT session_id) sessions
    FROM central_events
    WHERE site_key='okazu' AND event_name='affiliate_click' AND occurred_at>=${cutoff}
    GROUP BY COALESCE(NULLIF(cta_position,''),'affiliate_link')
    ORDER BY clicks DESC`,[mod]);
  ctaPositions.forEach(x=>{x.clicks=num(x.clicks);x.sessions=num(x.sessions)});

  const devices=await q(`SELECT COALESCE(NULLIF(device_type,''),'unknown') device_type,
      COUNT(*) clicks,COUNT(DISTINCT session_id) sessions
    FROM central_events
    WHERE site_key='okazu' AND event_name='affiliate_click' AND occurred_at>=${cutoff}
    GROUP BY COALESCE(NULLIF(device_type,''),'unknown')
    ORDER BY clicks DESC`,[mod]);
  devices.forEach(x=>{x.clicks=num(x.clicks);x.sessions=num(x.sessions)});

  const sourcePages=await q(`SELECT COALESCE(NULLIF(origin_page_path,''),page_path) source_page,
      COALESCE(NULLIF(origin_page_type,''),page_type) source_type,
      COUNT(*) clicks,COUNT(DISTINCT session_id) sessions
    FROM central_events
    WHERE site_key='okazu' AND event_name='affiliate_click' AND occurred_at>=${cutoff}
    GROUP BY COALESCE(NULLIF(origin_page_path,''),page_path),COALESCE(NULLIF(origin_page_type,''),page_type)
    ORDER BY clicks DESC LIMIT 50`,[mod]);
  sourcePages.forEach(x=>{x.clicks=num(x.clicks);x.sessions=num(x.sessions)});

  return json({ok:true,days,generated_at:new Date().toISOString(),summary,actresses,genres,makers,cta_positions:ctaPositions,devices,source_pages:sourcePages});
}
