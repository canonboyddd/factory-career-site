import {CENTRAL_CLICK_SQL,PROBE_PATHS,SUSPICIOUS_BROWSER_SQL,SUSPICIOUS_BURST_SQL} from '../../shared/ops-analytics-contract.js';
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function auth(request,env){const x=request.headers.get('authorization')||'';return Boolean(env.ADMIN_TOKEN&&x===`Bearer ${env.ADMIN_TOKEN}`)}
function rows(x){return x?.results||[]}
function pct(n,d){return d?Math.round((Number(n||0)/Number(d||0))*10000)/100:0}
function num(v){return Number(v||0)}
function safeMessage(error){return String(error?.message||error||'unknown').slice(0,220)}
function probeSql(alias){return `(${PROBE_PATHS.map(p=>`lower(${alias}.page_path) LIKE '${p.replace(/'/g,"''")}%'`).join(' OR ')} OR lower(${alias}.page_path) LIKE '%.html/%')`}

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
    ['provider','TEXT'],['program','TEXT'],['placement','TEXT'],['variant','TEXT'],['device_type','TEXT'],['page_type','TEXT'],['vehicle','TEXT'],
    ['actress','TEXT'],['genre','TEXT'],['maker','TEXT'],['product_id','TEXT'],['cta_position','TEXT'],
    ['search_query','TEXT'],['result_count','INTEGER'],['origin_page_path','TEXT'],['origin_page_type','TEXT'],
    ['origin_actress','TEXT'],['origin_genre','TEXT'],['origin_maker','TEXT']
  ]){
    if(!cols.has(name)){try{await db.prepare(`ALTER TABLE central_events ADD COLUMN ${name} ${type}`).run()}catch(e){if(!/duplicate column/i.test(String(e?.message||e)))throw e}}
  }
  const indexes=[
    `CREATE INDEX IF NOT EXISTS idx_central_okazu_time ON central_events(site_key,occurred_at)`,
    `CREATE INDEX IF NOT EXISTS idx_central_okazu_event ON central_events(site_key,event_name)`,
    `CREATE INDEX IF NOT EXISTS idx_central_okazu_actress ON central_events(site_key,origin_actress)`,
    `CREATE INDEX IF NOT EXISTS idx_central_okazu_genre ON central_events(site_key,origin_genre)`,
    `CREATE INDEX IF NOT EXISTS idx_central_okazu_maker ON central_events(site_key,origin_maker)`
  ];
  for(const sql of indexes){try{await db.prepare(sql).run()}catch(e){console.warn('okazu index ensure failed',safeMessage(e))}}
}

async function entityRows(db,cutoff,mod,type,column,originColumn,filteredPeriod){
  if(!['actress','genre','maker'].includes(type))throw new Error('invalid entity type');
  const clickName=`CASE WHEN COALESCE(${originColumn},'')<>'' THEN ${originColumn} WHEN page_type='${type}' THEN ${column} ELSE '' END`;
  const sql=`WITH period AS (
      SELECT * FROM (${filteredPeriod})
    ), views AS (
      SELECT ${column} name,COUNT(*) views,COUNT(DISTINCT session_id) view_sessions
      FROM period
      WHERE event_name='page_view' AND page_type='${type}' AND COALESCE(${column},'')<>''
      GROUP BY ${column}
    ), clicks AS (
      SELECT ${clickName} name,COUNT(*) clicks,COUNT(DISTINCT session_id) click_sessions
      FROM period
      WHERE event_name IN ${CENTRAL_CLICK_SQL} AND (${clickName})<>''
      GROUP BY ${clickName}
    ), keys AS (
      SELECT name FROM views UNION SELECT name FROM clicks
    )
    SELECT k.name,COALESCE(v.views,0) views,COALESCE(v.view_sessions,0) view_sessions,
      COALESCE(c.clicks,0) clicks,COALESCE(c.click_sessions,0) click_sessions
    FROM keys k
    LEFT JOIN views v ON v.name=k.name
    LEFT JOIN clicks c ON c.name=k.name
    WHERE COALESCE(k.name,'')<>''
    ORDER BY clicks DESC,views DESC,k.name
    LIMIT 100`;
  const result=rows(await db.prepare(sql).bind(mod).all());
  return result.map(x=>({...x,views:num(x.views),view_sessions:num(x.view_sessions),clicks:num(x.clicks),click_sessions:num(x.click_sessions),ctr:pct(x.clicks,x.views)}));
}

export async function onRequestGet({request,env}){
  if(!auth(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!env.ANALYTICS_DB)return json({ok:false,error:'ANALYTICS_DB missing'},503);
  const u=new URL(request.url),requested=Number(u.searchParams.get('days')||7),days=[1,7,30,90].includes(requested)?requested:7;
  const mod=`-${Math.max(days-1,0)} days`;
  const cutoff=`datetime(date('now','+9 hours',?),'-9 hours')`;
  const db=env.ANALYTICS_DB;
  const warnings=[];
  try{await schema(db)}catch(e){warnings.push(`schema: ${safeMessage(e)}`)}
  const q=async(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return rows(await s.all())};
  const q1=async(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return await s.first()||{}};
  const safe=async(label,fn,fallback)=>{try{return await fn()}catch(e){warnings.push(`${label}: ${safeMessage(e)}`);return fallback}};
  const suspicious=SUSPICIOUS_BROWSER_SQL;
  const burst=SUSPICIOUS_BURST_SQL;
  const filteredPeriod=`SELECT c.* FROM central_events c LEFT JOIN (${suspicious}) b ON b.site_key=c.site_key AND b.browser_id=c.browser_id AND b.day=date(c.occurred_at,'+9 hours')
    LEFT JOIN (${burst}) burst ON burst.site_key=c.site_key AND burst.day=date(c.occurred_at,'+9 hours') WHERE b.browser_id IS NULL AND burst.day IS NULL AND c.site_key='okazu' AND NOT ${probeSql('c')} AND c.occurred_at>=${cutoff}`;

  const summary=await safe('summary',()=>q1(`SELECT
      SUM(CASE WHEN event_name='page_view' THEN 1 ELSE 0 END) page_views,
      COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) sessions,
      SUM(CASE WHEN event_name='product_open' THEN 1 ELSE 0 END) product_opens,
      SUM(CASE WHEN event_name IN ${CENTRAL_CLICK_SQL} THEN 1 ELSE 0 END) affiliate_clicks,
      COUNT(DISTINCT CASE WHEN event_name IN ${CENTRAL_CLICK_SQL} THEN session_id END) affiliate_sessions
    FROM (${filteredPeriod})`,[mod]),{page_views:0,sessions:0,product_opens:0,affiliate_clicks:0,affiliate_sessions:0});
  for(const k of ['page_views','sessions','product_opens','affiliate_clicks','affiliate_sessions'])summary[k]=num(summary[k]);
  summary.clicks_per_100_pv=summary.page_views?Math.round(summary.affiliate_clicks/summary.page_views*10000)/100:0;

  const actresses=await safe('actresses',()=>entityRows(db,cutoff,mod,'actress','actress','origin_actress',filteredPeriod),[]);
  const genres=await safe('genres',()=>entityRows(db,cutoff,mod,'genre','genre','origin_genre',filteredPeriod),[]);
  const makers=await safe('makers',()=>entityRows(db,cutoff,mod,'maker','maker','origin_maker',filteredPeriod),[]);

  const ctaPositions=await safe('cta_positions',()=>q(`SELECT COALESCE(NULLIF(cta_position,''),'affiliate_link') cta_position,
      COUNT(*) clicks,COUNT(DISTINCT session_id) sessions
    FROM (${filteredPeriod})
    WHERE event_name IN ${CENTRAL_CLICK_SQL}
    GROUP BY COALESCE(NULLIF(cta_position,''),'affiliate_link')
    ORDER BY clicks DESC`,[mod]),[]);
  ctaPositions.forEach(x=>{x.clicks=num(x.clicks);x.sessions=num(x.sessions)});

  const devices=await safe('devices',()=>q(`SELECT COALESCE(NULLIF(device_type,''),'unknown') device_type,
      COUNT(*) clicks,COUNT(DISTINCT session_id) sessions
    FROM (${filteredPeriod})
    WHERE event_name IN ${CENTRAL_CLICK_SQL}
    GROUP BY COALESCE(NULLIF(device_type,''),'unknown')
    ORDER BY clicks DESC`,[mod]),[]);
  devices.forEach(x=>{x.clicks=num(x.clicks);x.sessions=num(x.sessions)});

  const sourcePages=await safe('source_pages',()=>q(`SELECT COALESCE(NULLIF(origin_page_path,''),page_path) source_page,
      COALESCE(NULLIF(origin_page_type,''),page_type) source_type,
      COUNT(*) clicks,COUNT(DISTINCT session_id) sessions
    FROM (${filteredPeriod})
    WHERE event_name IN ${CENTRAL_CLICK_SQL}
    GROUP BY COALESCE(NULLIF(origin_page_path,''),page_path),COALESCE(NULLIF(origin_page_type,''),page_type)
    ORDER BY clicks DESC LIMIT 50`,[mod]),[]);
  sourcePages.forEach(x=>{x.clicks=num(x.clicks);x.sessions=num(x.sessions)});

  return json({ok:true,partial:warnings.length>0,warnings,days,generated_at:new Date().toISOString(),summary,actresses,genres,makers,cta_positions:ctaPositions,devices,source_pages:sourcePages});
}
