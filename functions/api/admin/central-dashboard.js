function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function auth(request,env){const x=request.headers.get('authorization')||'';return Boolean(env.ADMIN_TOKEN&&x===`Bearer ${env.ADMIN_TOKEN}`);}
function rows(x){return x?.results||[];}
const CONFIGURED_SITES=['factory','sugutsucool','car-bike','okazu','clipmade'];
const CAR_URL='https://norimono-cost.com/api/admin/analytics';
async function schema(db){await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS central_events (id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL DEFAULT (datetime('now')), site_key TEXT NOT NULL, event_name TEXT NOT NULL, browser_id TEXT NOT NULL, session_id TEXT NOT NULL, page_path TEXT NOT NULL, page_title TEXT, referrer TEXT, program TEXT, placement TEXT, outbound_domain TEXT, device_type TEXT)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_time ON central_events(occurred_at)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_central_site ON central_events(site_key)`)
]);}
function affiliateProgram(row){
  const ev=String(row?.event||'');const target=String(row?.target||'');
  if(ev==='rakuten_click')return'rakuten';
  if(ev==='affiliate_slot_click'){
    const parts=target.split('|');return parts[1]||'affiliate';
  }
  if(ev==='car_valuation_click')return'car-valuation';
  if(ev==='bike_buyback_click')return'bike-buyback';
  return'';
}
export async function onRequestGet({request,env}){
  if(!auth(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!env.ANALYTICS_DB)return json({ok:false,error:'ANALYTICS_DB missing'},503);
  const db=env.ANALYTICS_DB;await schema(db);
  const u=new URL(request.url);const d=Number(u.searchParams.get('days')||7);const days=[1,7,30,90].includes(d)?d:7;
  const mod=`-${Math.max(days-1,0)} days`;const cutoff=`datetime(date('now','+9 hours',?),'-9 hours')`;
  const q=(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return s.all();};
  const q1=(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return s.first();};

  // Prefer the vehicle site's existing D1 when the same admin token is valid.
  // If it cannot be read, fall back to car-bike events forwarded into central_events.
  let car=null,carError='';
  try{
    const r=await fetch(`${CAR_URL}?days=${days}`,{headers:{authorization:request.headers.get('authorization')||''},cf:{cacheTtl:0}});
    if(r.ok)car=await r.json();else carError=`HTTP ${r.status}`;
  }catch(e){carError=String(e?.message||e||'fetch failed');}

  // Exclude obvious automated crawl sessions from central_events without deleting raw data.
  // Pattern: one browser opens many distinct pages in many brand-new sessions on the same day.
  const suspicious=`SELECT site_key,browser_id,date(occurred_at,'+9 hours') day
    FROM central_events
    WHERE event_name='page_view'
    GROUP BY site_key,browser_id,date(occurred_at,'+9 hours')
    HAVING COUNT(*)>=20
       AND COUNT(DISTINCT session_id)>=20
       AND COUNT(DISTINCT page_path)>=10
       AND (CAST(COUNT(DISTINCT session_id) AS REAL)/COUNT(*))>=0.90`;
  const carClause=car?.summary?`AND c.site_key<>'car-bike'`:'';
  const centralClean=`SELECT c.* FROM central_events c
    LEFT JOIN (${suspicious}) b
      ON b.site_key=c.site_key AND b.browser_id=c.browser_id AND b.day=date(c.occurred_at,'+9 hours')
    WHERE b.browser_id IS NULL ${carClause}`;
  const union=`SELECT 'factory' site_key,event_name,browser_id,session_id,page_path,page_title,occurred_at,program,placement,device_type FROM analytics_events
    UNION ALL
    SELECT site_key,event_name,browser_id,session_id,page_path,page_title,occurred_at,program,placement,device_type FROM (${centralClean})`;

  const baseTotals=await q1(`WITH e AS (${union}) SELECT SUM(CASE WHEN event_name='page_view' THEN 1 ELSE 0 END) pv,COUNT(DISTINCT CASE WHEN event_name='page_view' THEN browser_id END) browsers,COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) sessions,SUM(CASE WHEN event_name IN ('affiliate_click','affiliate_click_unified') THEN 1 ELSE 0 END) affiliate_clicks FROM e WHERE occurred_at>=${cutoff}`,[mod]);
  const liveSites=await q(`WITH e AS (${union}) SELECT site_key,SUM(CASE WHEN event_name='page_view' THEN 1 ELSE 0 END) pv,COUNT(DISTINCT CASE WHEN event_name='page_view' THEN browser_id END) browsers,COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) sessions,SUM(CASE WHEN event_name IN ('affiliate_click','affiliate_click_unified') THEN 1 ELSE 0 END) affiliate_clicks FROM e WHERE occurred_at>=${cutoff} GROUP BY site_key ORDER BY pv DESC`,[mod]);
  const seen=await q(`WITH e AS (${union}) SELECT site_key,MAX(occurred_at) last_seen FROM e GROUP BY site_key`);
  const dailyResult=await q(`WITH e AS (${union}) SELECT date(occurred_at,'+9 hours') day,site_key,SUM(CASE WHEN event_name='page_view' THEN 1 ELSE 0 END) pv,COUNT(DISTINCT CASE WHEN event_name='page_view' THEN session_id END) sessions FROM e WHERE occurred_at>=${cutoff} GROUP BY day,site_key ORDER BY day,site_key`,[mod]);
  const pagesResult=await q(`WITH e AS (${union}) SELECT site_key,page_path,MAX(COALESCE(page_title,'')) title,COUNT(*) pv,COUNT(DISTINCT session_id) sessions FROM e WHERE event_name='page_view' AND occurred_at>=${cutoff} GROUP BY site_key,page_path ORDER BY pv DESC LIMIT 100`,[mod]);
  const affiliatesResult=await q(`WITH e AS (${union}) SELECT site_key,COALESCE(NULLIF(program,''),'unknown') program,COUNT(*) clicks,COUNT(DISTINCT session_id) sessions FROM e WHERE event_name IN ('affiliate_click','affiliate_click_unified') AND occurred_at>=${cutoff} GROUP BY site_key,program ORDER BY clicks DESC LIMIT 100`,[mod]);
  const filteredRow=await q1(`SELECT COUNT(*) filtered FROM central_events c INNER JOIN (${suspicious}) b ON b.site_key=c.site_key AND b.browser_id=c.browser_id AND b.day=date(c.occurred_at,'+9 hours') WHERE c.event_name='page_view' AND c.occurred_at>=${cutoff}`,[mod]);

  const periodMap=new Map(rows(liveSites).map(x=>[x.site_key,x]));
  const seenMap=new Map(rows(seen).map(x=>[x.site_key,x.last_seen]));
  const daily=rows(dailyResult).slice();
  const pages=rows(pagesResult).slice();
  const affiliates=rows(affiliatesResult).slice();
  let carAffiliateClicks=0;

  if(car?.summary){
    const cRows=Array.isArray(car.rows)?car.rows:[];
    const affMap=new Map();
    for(const r of cRows){
      const p=affiliateProgram(r);if(!p)continue;
      const count=Number(r.count||0);carAffiliateClicks+=count;
      affMap.set(p,(affMap.get(p)||0)+count);
    }
    periodMap.set('car-bike',{site_key:'car-bike',pv:Number(car.summary.views||0),browsers:Number(car.summary.visitors||0),sessions:Number(car.summary.sessions||0),affiliate_clicks:carAffiliateClicks});
    const carDaily=Array.isArray(car.daily)?car.daily:[];
    for(const x of carDaily)daily.push({day:x.day,site_key:'car-bike',pv:Number(x.views||0),sessions:Number(x.sessions||0)});
    const carPages=Array.isArray(car.pages)?car.pages:[];
    for(const x of carPages)pages.push({site_key:'car-bike',page_path:x.page,title:'',pv:Number(x.views||0),sessions:Number(x.visitors||0)});
    for(const [program,clicks] of affMap)affiliates.push({site_key:'car-bike',program,clicks,sessions:0});
    const last=carDaily.length?carDaily[carDaily.length-1].day:null;
    seenMap.set('car-bike',last?`${last} 23:59:59`:'connected');
  }

  const sites=CONFIGURED_SITES.map(site_key=>{const x=periodMap.get(site_key)||{};return{site_key,pv:Number(x.pv||0),browsers:Number(x.browsers||0),sessions:Number(x.sessions||0),affiliate_clicks:Number(x.affiliate_clicks||0),connected:seenMap.has(site_key),last_seen:seenMap.get(site_key)||null,source:site_key==='car-bike'?(car?'vehicle-d1':'central-fallback'):'central'};});

  const totals={
    pv:Number(baseTotals?.pv||0)+Number(car?.summary?.views||0),
    browsers:Number(baseTotals?.browsers||0)+Number(car?.summary?.visitors||0),
    sessions:Number(baseTotals?.sessions||0)+Number(car?.summary?.sessions||0),
    affiliate_clicks:Number(baseTotals?.affiliate_clicks||0)+carAffiliateClicks,
    configured_sites:CONFIGURED_SITES.length,
    received_sites:sites.filter(x=>x.connected).length,
    filtered_automated_pv:Number(filteredRow?.filtered||0)
  };
  pages.sort((a,b)=>Number(b.pv||0)-Number(a.pv||0));
  affiliates.sort((a,b)=>Number(b.clicks||0)-Number(a.clicks||0));
  daily.sort((a,b)=>String(a.day).localeCompare(String(b.day))||String(a.site_key).localeCompare(String(b.site_key)));
  return json({ok:true,days,generated_at:new Date().toISOString(),totals,sites,daily,pages:pages.slice(0,100),affiliates:affiliates.slice(0,100),sources:{car:{ok:Boolean(car),error:carError,mode:car?'vehicle-d1':'central-fallback'}}});
}
