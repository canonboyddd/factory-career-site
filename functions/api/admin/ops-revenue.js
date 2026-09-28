function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function auth(request,env){const x=request.headers.get('authorization')||'';return Boolean(env.ADMIN_TOKEN&&x===`Bearer ${env.ADMIN_TOKEN}`)}
function rows(x){return x?.results||[]}
const PROVIDERS=['rakuten','a8','accesstrade','afb','dmm-fanza','fc2'];
async function schema(db){await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS affiliate_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    source_key TEXT NOT NULL,
    source_id TEXT,
    occurred_on TEXT,
    confirmed_on TEXT,
    status TEXT NOT NULL DEFAULT 'unknown',
    program_key TEXT,
    program_id TEXT,
    program_name TEXT,
    site_name TEXT,
    page_url TEXT,
    sales_amount REAL NOT NULL DEFAULT 0,
    reward_amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'JPY',
    imported_at TEXT NOT NULL DEFAULT (datetime('now')),
    raw_json TEXT,
    UNIQUE(provider,source_key)
  )`),
  db.prepare(`CREATE TABLE IF NOT EXISTS affiliate_imports (
    import_id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    file_name TEXT,
    row_count INTEGER NOT NULL DEFAULT 0,
    imported_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_ops_aff_provider ON affiliate_results(provider)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_ops_aff_occurred ON affiliate_results(occurred_on)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_ops_aff_confirmed ON affiliate_results(confirmed_on)`)
])}
export async function onRequestGet({request,env}){
  if(!auth(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!env.ANALYTICS_DB)return json({ok:false,error:'ANALYTICS_DB missing'},503);
  const u=new URL(request.url);const d=Number(u.searchParams.get('days')||7);const days=[1,7,30,90].includes(d)?d:7;const modifier=`-${Math.max(days-1,0)} days`;
  const db=env.ANALYTICS_DB;await schema(db);
  const q=(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return s.all()};
  const q1=(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return s.first()};
  const providerValues=PROVIDERS.map(x=>`('${x}')`).join(',');
  const providers=await q(`WITH p(provider) AS (VALUES ${providerValues}), cutoff(day) AS (SELECT date('now','+9 hours',?)), a AS (
    SELECT provider,
      SUM(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) generated_reward,
      COUNT(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN 1 END) generated_count,
      SUM(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN sales_amount ELSE 0 END) sales_amount,
      SUM(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on)>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) confirmed_reward,
      COUNT(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on)>=(SELECT day FROM cutoff) THEN 1 END) confirmed_count,
      SUM(CASE WHEN status='cancelled' AND occurred_on>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) cancelled_reward,
      COUNT(CASE WHEN status='cancelled' AND occurred_on>=(SELECT day FROM cutoff) THEN 1 END) cancelled_count
    FROM affiliate_results GROUP BY provider)
    SELECT p.provider,COALESCE(a.generated_reward,0) generated_reward,COALESCE(a.generated_count,0) generated_count,
      COALESCE(a.sales_amount,0) sales_amount,COALESCE(a.confirmed_reward,0) confirmed_reward,COALESCE(a.confirmed_count,0) confirmed_count,
      COALESCE(a.cancelled_reward,0) cancelled_reward,COALESCE(a.cancelled_count,0) cancelled_count
    FROM p LEFT JOIN a ON a.provider=p.provider ORDER BY confirmed_reward DESC,generated_reward DESC`,[modifier]);
  const totals=await q1(`WITH cutoff(day) AS (SELECT date('now','+9 hours',?)) SELECT
    SUM(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) generated_reward,
    COUNT(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN 1 END) generated_count,
    SUM(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN sales_amount ELSE 0 END) sales_amount,
    SUM(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on)>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) confirmed_reward,
    COUNT(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on)>=(SELECT day FROM cutoff) THEN 1 END) confirmed_count,
    SUM(CASE WHEN status='cancelled' AND occurred_on>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) cancelled_reward,
    COUNT(CASE WHEN status='cancelled' AND occurred_on>=(SELECT day FROM cutoff) THEN 1 END) cancelled_count
    FROM affiliate_results`,[modifier]);
  const programs=await q(`WITH cutoff(day) AS (SELECT date('now','+9 hours',?)) SELECT provider,
    COALESCE(NULLIF(program_key,''),provider) program_key,
    COALESCE(NULLIF(program_name,''),COALESCE(NULLIF(program_key,''),provider)) program_name,
    SUM(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) generated_reward,
    COUNT(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN 1 END) generated_count,
    SUM(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on)>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) confirmed_reward,
    COUNT(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on)>=(SELECT day FROM cutoff) THEN 1 END) confirmed_count,
    SUM(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN sales_amount ELSE 0 END) sales_amount
    FROM affiliate_results GROUP BY provider,program_key,program_name
    HAVING generated_count>0 OR confirmed_count>0 ORDER BY confirmed_reward DESC,generated_reward DESC LIMIT 100`,[modifier]);
  const sites=await q(`WITH cutoff(day) AS (SELECT date('now','+9 hours',?)) SELECT provider,
    COALESCE(NULLIF(site_name,''),'未判定') site_name,
    SUM(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) generated_reward,
    SUM(CASE WHEN status='confirmed' AND COALESCE(NULLIF(confirmed_on,''),occurred_on)>=(SELECT day FROM cutoff) THEN reward_amount ELSE 0 END) confirmed_reward,
    COUNT(CASE WHEN occurred_on>=(SELECT day FROM cutoff) THEN 1 END) generated_count
    FROM affiliate_results GROUP BY provider,COALESCE(NULLIF(site_name,''),'未判定')
    HAVING generated_count>0 ORDER BY confirmed_reward DESC,generated_reward DESC LIMIT 100`,[modifier]);
  const imports=await q(`SELECT import_id,provider,file_name,row_count,imported_at FROM affiliate_imports ORDER BY imported_at DESC LIMIT 20`);
  return json({ok:true,days,generated_at:new Date().toISOString(),totals:totals||{},providers:rows(providers),programs:rows(programs),sites:rows(sites),imports:rows(imports)});
}
