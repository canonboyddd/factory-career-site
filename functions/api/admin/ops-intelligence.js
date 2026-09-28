function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function auth(request,env){const x=request.headers.get('authorization')||'';return Boolean(env.ADMIN_TOKEN&&x===`Bearer ${env.ADMIN_TOKEN}`)}
function rows(x){return x?.results||[]}
const PROGRAMS=[
  ['zubatto','ズバット'],['ucarpac','UcarPAC'],['carnext','カーネクスト'],['bikeland','バイクランド'],
  ['bikeking','バイク王'],['insurance_bang','保険スクエアbang！'],['niconori','ニコノリ'],['rakuten','楽天']
];
const PROVIDER_LABEL={afb:'AFB',accesstrade:'AccessTrade',rakuten:'楽天',a8:'A8.net','dmm-fanza':'DMM/FANZA',fc2:'FC2'};
async function schema(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS central_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
    site_key TEXT NOT NULL,event_name TEXT NOT NULL,browser_id TEXT NOT NULL,session_id TEXT NOT NULL,
    page_path TEXT NOT NULL,page_title TEXT,referrer TEXT,provider TEXT,program TEXT,placement TEXT,
    outbound_domain TEXT,device_type TEXT,page_type TEXT,vehicle TEXT
  )`).run();
  const info=await db.prepare('PRAGMA table_info(central_events)').all();
  const cols=new Set(rows(info).map(x=>String(x.name||'')));
  for(const [name,type] of [['provider','TEXT'],['page_type','TEXT'],['vehicle','TEXT']])if(!cols.has(name))await db.prepare(`ALTER TABLE central_events ADD COLUMN ${name} ${type}`).run();
}
function pct(n,d){return d?Math.round((Number(n||0)/Number(d||0))*10000)/100:0}
function number(v){return Number(v||0)}
export async function onRequestGet({request,env}){
  if(!auth(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!env.ANALYTICS_DB)return json({ok:false,error:'ANALYTICS_DB missing'},503);
  const u=new URL(request.url);const requested=Number(u.searchParams.get('days')||7);const days=[1,7,30,90].includes(requested)?requested:7;
  const mod=`-${Math.max(days-1,0)} days`;const cutoff=`datetime(date('now','+9 hours',?),'-9 hours')`;
  const db=env.ANALYTICS_DB;await schema(db);
  const q=async(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return rows(await s.all())};
  const q1=async(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return await s.first()||{}};

  const executive=await q1(`WITH period AS (
      SELECT * FROM central_events WHERE occurred_at>=${cutoff}
    ), first_seen AS (
      SELECT site_key,browser_id,MIN(occurred_at) first_seen FROM central_events WHERE event_name='page_view' GROUP BY site_key,browser_id
    ), period_browsers AS (
      SELECT DISTINCT site_key,browser_id FROM period WHERE event_name='page_view'
    ), visitor_mix AS (
      SELECT SUM(CASE WHEN f.first_seen>=${cutoff} THEN 1 ELSE 0 END) new_visitors,
             SUM(CASE WHEN f.first_seen<${cutoff} THEN 1 ELSE 0 END) returning_visitors
      FROM period_browsers p JOIN first_seen f ON f.site_key=p.site_key AND f.browser_id=p.browser_id
    ), search_sessions AS (
      SELECT COUNT(DISTINCT site_key||'|'||session_id) n FROM period WHERE event_name='page_view' AND lower(COALESCE(referrer,'')) GLOB '*google*' OR 0
    ), search_sessions2 AS (
      SELECT COUNT(DISTINCT site_key||'|'||session_id) n FROM period WHERE event_name='page_view' AND (
        lower(COALESCE(referrer,'')) LIKE '%google.%' OR lower(COALESCE(referrer,'')) LIKE '%yahoo.%' OR
        lower(COALESCE(referrer,'')) LIKE '%bing.%' OR lower(COALESCE(referrer,'')) LIKE '%duckduckgo.%'
      )
    ), cta AS (
      SELECT COUNT(DISTINCT CASE WHEN event_name IN ('cta_impression','affiliate_impression') THEN site_key||'|'||session_id END) reached,
             SUM(CASE WHEN event_name='affiliate_impression' THEN 1 ELSE 0 END) affiliate_impressions,
             SUM(CASE WHEN event_name='affiliate_click' THEN 1 ELSE 0 END) affiliate_clicks,
             SUM(CASE WHEN event_name='cta_click' THEN 1 ELSE 0 END) cta_clicks
      FROM period
    )
    SELECT
      (SELECT COUNT(*) FROM period WHERE event_name='page_view') pv,
      (SELECT COUNT(DISTINCT site_key||'|'||session_id) FROM period WHERE event_name='page_view') sessions,
      (SELECT COUNT(DISTINCT site_key||'|'||browser_id) FROM period WHERE event_name='page_view') visitors,
      COALESCE((SELECT new_visitors FROM visitor_mix),0) new_visitors,
      COALESCE((SELECT returning_visitors FROM visitor_mix),0) returning_visitors,
      COALESCE((SELECT n FROM search_sessions2),0) search_sessions,
      COALESCE((SELECT reached FROM cta),0) cta_reached_sessions,
      COALESCE((SELECT affiliate_impressions FROM cta),0) affiliate_impressions,
      COALESCE((SELECT affiliate_clicks FROM cta),0) affiliate_clicks,
      COALESCE((SELECT cta_clicks FROM cta),0) cta_clicks`,[mod,mod]);
  executive.search_share=pct(executive.search_sessions,executive.sessions);
  executive.cta_reach_rate=pct(executive.cta_reached_sessions,executive.sessions);
  executive.affiliate_ctr=pct(executive.affiliate_clicks,executive.affiliate_impressions);

  const programRaw=await q(`WITH e AS (SELECT * FROM central_events WHERE occurred_at>=${cutoff}) SELECT
      COALESCE(NULLIF(program,''),'unknown') program,
      MAX(COALESCE(NULLIF(provider,''),'')) provider,
      SUM(CASE WHEN event_name='affiliate_impression' THEN 1 ELSE 0 END) impressions,
      SUM(CASE WHEN event_name='affiliate_click' THEN 1 ELSE 0 END) clicks,
      COUNT(DISTINCT CASE WHEN event_name='affiliate_click' THEN site_key||'|'||session_id END) click_sessions
    FROM e WHERE event_name IN ('affiliate_impression','affiliate_click') GROUP BY COALESCE(NULLIF(program,''),'unknown')`,[mod]);
  const programMap=new Map(programRaw.map(x=>[x.program,x]));
  const programs=PROGRAMS.map(([key,label])=>{const x=programMap.get(key)||{};const impressions=number(x.impressions),clicks=number(x.clicks);return{program:key,label,provider:x.provider||'',impressions,clicks,click_sessions:number(x.click_sessions),ctr:pct(clicks,impressions)}});

  const providerRaw=await q(`WITH e AS (SELECT * FROM central_events WHERE occurred_at>=${cutoff}) SELECT
      COALESCE(NULLIF(provider,''),'unknown') provider,
      SUM(CASE WHEN event_name='affiliate_impression' THEN 1 ELSE 0 END) impressions,
      SUM(CASE WHEN event_name='affiliate_click' THEN 1 ELSE 0 END) clicks
    FROM e WHERE event_name IN ('affiliate_impression','affiliate_click') GROUP BY COALESCE(NULLIF(provider,''),'unknown') ORDER BY clicks DESC`,[mod]);
  const providers=providerRaw.map(x=>({provider:x.provider,label:PROVIDER_LABEL[x.provider]||x.provider,impressions:number(x.impressions),clicks:number(x.clicks),ctr:pct(x.clicks,x.impressions)}));

  const placements=await q(`WITH e AS (SELECT * FROM central_events WHERE occurred_at>=${cutoff}) SELECT site_key,
      COALESCE(NULLIF(program,''),'unknown') program,COALESCE(NULLIF(placement,''),'unknown') placement,
      SUM(CASE WHEN event_name='affiliate_impression' THEN 1 ELSE 0 END) impressions,
      SUM(CASE WHEN event_name='affiliate_click' THEN 1 ELSE 0 END) clicks
    FROM e WHERE event_name IN ('affiliate_impression','affiliate_click')
    GROUP BY site_key,COALESCE(NULLIF(program,''),'unknown'),COALESCE(NULLIF(placement,''),'unknown')
    ORDER BY impressions DESC LIMIT 100`,[mod]);
  placements.forEach(x=>x.ctr=pct(x.clicks,x.impressions));

  const pageRows=await q(`WITH e AS (SELECT * FROM central_events WHERE occurred_at>=${cutoff}),
    pv AS (SELECT site_key,page_path,MAX(COALESCE(page_title,'')) title,MAX(COALESCE(page_type,'')) page_type,MAX(COALESCE(vehicle,'')) vehicle,COUNT(*) pv,COUNT(DISTINCT session_id) sessions FROM e WHERE event_name='page_view' GROUP BY site_key,page_path),
    ai AS (SELECT site_key,page_path,COUNT(*) impressions FROM e WHERE event_name='affiliate_impression' GROUP BY site_key,page_path),
    ac AS (SELECT site_key,page_path,COUNT(*) clicks FROM e WHERE event_name='affiliate_click' GROUP BY site_key,page_path),
    ci AS (SELECT site_key,page_path,COUNT(*) cta_impressions FROM e WHERE event_name='cta_impression' GROUP BY site_key,page_path),
    cc AS (SELECT site_key,page_path,COUNT(*) cta_clicks FROM e WHERE event_name='cta_click' GROUP BY site_key,page_path)
    SELECT pv.*,COALESCE(ai.impressions,0) impressions,COALESCE(ac.clicks,0) clicks,COALESCE(ci.cta_impressions,0) cta_impressions,COALESCE(cc.cta_clicks,0) cta_clicks
    FROM pv LEFT JOIN ai USING(site_key,page_path) LEFT JOIN ac USING(site_key,page_path) LEFT JOIN ci USING(site_key,page_path) LEFT JOIN cc USING(site_key,page_path)
    ORDER BY pv.pv DESC LIMIT 300`,[mod]);
  for(const x of pageRows){x.pv=number(x.pv);x.sessions=number(x.sessions);x.impressions=number(x.impressions);x.clicks=number(x.clicks);x.cta_impressions=number(x.cta_impressions);x.cta_clicks=number(x.cta_clicks);x.ctr=pct(x.clicks,x.impressions);x.cta_ctr=pct(x.cta_clicks,x.cta_impressions)}

  const popularVehicles=pageRows.filter(x=>/^vehicle_/.test(x.page_type||'')||/^\/(cars|bikes)\//.test(x.page_path||'')).slice(0,50);
  const topCtr=pageRows.filter(x=>x.impressions>=3).sort((a,b)=>b.ctr-a.ctr||b.impressions-a.impressions).slice(0,20);
  const lowCtr=pageRows.filter(x=>x.impressions>=3).sort((a,b)=>a.ctr-b.ctr||b.impressions-a.impressions).slice(0,20);
  const priority=pageRows.map(x=>{
    let score=0,reason='改善候補';
    if(x.pv>=5&&x.clicks===0){score=x.pv*10+x.impressions*4;reason='高PV・クリック0'}
    else if(x.impressions>=3&&x.ctr<1){score=x.pv*6+x.impressions*5;reason='表示ありCTR低'}
    else if(x.pv>=5&&x.cta_impressions===0&&x.impressions===0){score=x.pv*5;reason='CTA未到達'}
    else score=x.pv+x.impressions;
    return{...x,score,reason};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,30);

  const highAds=programs.filter(x=>x.impressions>=3).slice().sort((a,b)=>b.ctr-a.ctr).slice(0,10);
  const lowAds=programs.filter(x=>x.impressions>=3).slice().sort((a,b)=>a.ctr-b.ctr).slice(0,10);
  return json({ok:true,days,generated_at:new Date().toISOString(),executive,programs,providers,placements,pages:pageRows.slice(0,100),popular_vehicles:popularVehicles,top_ctr_pages:topCtr,low_ctr_pages:lowCtr,priority,high_ads:highAds,low_ads:lowAds});
}
