function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function auth(request,env){const x=request.headers.get('authorization')||'';return Boolean(env.ADMIN_TOKEN&&x===`Bearer ${env.ADMIN_TOKEN}`)}
function rows(x){return x?.results||[]}
async function schema(db){await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS gsc_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,site_key TEXT NOT NULL,snapshot_date TEXT NOT NULL,dimension TEXT NOT NULL,key TEXT NOT NULL,
    clicks REAL NOT NULL DEFAULT 0,impressions REAL NOT NULL DEFAULT 0,ctr REAL NOT NULL DEFAULT 0,position REAL NOT NULL DEFAULT 0,
    imported_at TEXT NOT NULL DEFAULT (datetime('now')),UNIQUE(site_key,snapshot_date,dimension,key))`),
  db.prepare(`CREATE TABLE IF NOT EXISTS gsc_index_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,site_key TEXT NOT NULL,snapshot_date TEXT NOT NULL,url TEXT NOT NULL,status TEXT,reason TEXT,last_crawled TEXT,
    imported_at TEXT NOT NULL DEFAULT (datetime('now')),UNIQUE(site_key,snapshot_date,url))`),
  db.prepare(`CREATE TABLE IF NOT EXISTS gsc_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,site_key TEXT NOT NULL,snapshot_date TEXT NOT NULL,import_type TEXT NOT NULL,file_name TEXT,row_count INTEGER NOT NULL DEFAULT 0,
    imported_at TEXT NOT NULL DEFAULT (datetime('now')))`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_gsc_perf_site_date ON gsc_performance(site_key,snapshot_date)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_gsc_perf_dim ON gsc_performance(site_key,dimension)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_gsc_index_site_date ON gsc_index_status(site_key,snapshot_date)`)
])}
function parseCsv(text){const out=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c}else if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));out.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell.replace(/\r$/,''));out.push(row)}return out.filter(r=>r.some(x=>String(x).trim()!==''))}
function norm(v){return String(v||'').replace(/^\uFEFF/,'').trim().toLowerCase()}
function num(v){const s=String(v??'').replace(/[,%\s]/g,'');const n=Number(s);return Number.isFinite(n)?n:0}
function findHeader(headers,names){const set=names.map(norm);for(let i=0;i<headers.length;i++)if(set.includes(norm(headers[i])))return i;return-1}
async function runBatches(db,statements,size=50){for(let i=0;i<statements.length;i+=size)await db.batch(statements.slice(i,i+size))}
export async function onRequestPost({request,env}){
  if(!auth(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!env.ANALYTICS_DB)return json({ok:false,error:'ANALYTICS_DB missing'},503);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400)}
  const site=String(body.site_key||'').trim();const date=String(body.snapshot_date||'').trim();const type=String(body.import_type||'').trim();const file=String(body.file_name||'').slice(0,240);const csv=String(body.csv||'');
  if(!/^[a-z0-9_-]{2,40}$/i.test(site))return json({ok:false,error:'invalid_site_key'},400);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({ok:false,error:'invalid_snapshot_date'},400);
  if(!['query','page','index'].includes(type))return json({ok:false,error:'invalid_import_type'},400);
  if(!csv||csv.length>4_000_000)return json({ok:false,error:'invalid_or_too_large_csv'},400);
  const table=parseCsv(csv);if(table.length<2)return json({ok:false,error:'csv_has_no_rows'},400);
  const headers=table[0];const data=table.slice(1);const db=env.ANALYTICS_DB;await schema(db);const statements=[];
  if(type==='query'||type==='page'){
    const keyNames=type==='query'?['上位のクエリ','top queries','query','クエリ']:['上位のページ','top pages','page','ページ'];
    let ki=findHeader(headers,keyNames);if(ki<0)ki=0;
    const ci=findHeader(headers,['クリック数','clicks']);const ii=findHeader(headers,['表示回数','impressions']);const ti=findHeader(headers,['ctr']);const pi=findHeader(headers,['掲載順位','position']);
    if(ci<0||ii<0||pi<0)return json({ok:false,error:'missing_performance_columns',headers},400);
    for(const r of data){const key=String(r[ki]||'').trim();if(!key)continue;const clicks=num(r[ci]),impressions=num(r[ii]),ctr=ti>=0?num(r[ti]):(impressions?clicks/impressions*100:0),position=num(r[pi]);statements.push(db.prepare(`INSERT INTO gsc_performance(site_key,snapshot_date,dimension,key,clicks,impressions,ctr,position,imported_at) VALUES(?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(site_key,snapshot_date,dimension,key) DO UPDATE SET clicks=excluded.clicks,impressions=excluded.impressions,ctr=excluded.ctr,position=excluded.position,imported_at=datetime('now')`).bind(site,date,type,key,clicks,impressions,ctr,position))}
  }else{
    let ui=findHeader(headers,['url','ページ','page']);if(ui<0)ui=0;const si=findHeader(headers,['ステータス','status']);const ri=findHeader(headers,['理由','reason']);const li=findHeader(headers,['最終クロール','last crawled','last crawl']);
    for(const r of data){const url=String(r[ui]||'').trim();if(!url)continue;statements.push(db.prepare(`INSERT INTO gsc_index_status(site_key,snapshot_date,url,status,reason,last_crawled,imported_at) VALUES(?,?,?,?,?,?,datetime('now')) ON CONFLICT(site_key,snapshot_date,url) DO UPDATE SET status=excluded.status,reason=excluded.reason,last_crawled=excluded.last_crawled,imported_at=datetime('now')`).bind(site,date,url,si>=0?String(r[si]||''):'',ri>=0?String(r[ri]||''):'',li>=0?String(r[li]||''):''))}
  }
  await runBatches(db,statements);
  await db.prepare(`INSERT INTO gsc_imports(site_key,snapshot_date,import_type,file_name,row_count) VALUES(?,?,?,?,?)`).bind(site,date,type,file,statements.length).run();
  return json({ok:true,site_key:site,snapshot_date:date,import_type:type,row_count:statements.length});
}
export async function onRequestGet({request,env}){
  if(!auth(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!env.ANALYTICS_DB)return json({ok:false,error:'ANALYTICS_DB missing'},503);
  const u=new URL(request.url);const site=String(u.searchParams.get('site')||'car-bike').trim();const db=env.ANALYTICS_DB;await schema(db);
  const q=async(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return rows(await s.all())};const q1=async(sql,b=[])=>{let s=db.prepare(sql);if(b.length)s=s.bind(...b);return await s.first()||{}};
  const latest=await q1(`SELECT MAX(snapshot_date) snapshot_date FROM gsc_performance WHERE site_key=?`,[site]);
  const currentDate=latest.snapshot_date||'';
  const previous= currentDate?await q1(`SELECT MAX(snapshot_date) snapshot_date FROM gsc_performance WHERE site_key=? AND snapshot_date<?`,[site,currentDate]):{};
  const previousDate=previous.snapshot_date||'';
  const indexLatest=await q1(`SELECT MAX(snapshot_date) snapshot_date FROM gsc_index_status WHERE site_key=?`,[site]);
  if(!currentDate){const imports=await q(`SELECT * FROM gsc_imports WHERE site_key=? ORDER BY imported_at DESC LIMIT 20`,[site]);return json({ok:true,configured:false,site_key:site,message:'Search Console CSV未取込',imports});}
  const summary=await q1(`SELECT SUM(clicks) clicks,SUM(impressions) impressions,CASE WHEN SUM(impressions)>0 THEN SUM(clicks)*100.0/SUM(impressions) ELSE 0 END ctr,CASE WHEN SUM(impressions)>0 THEN SUM(position*impressions)/SUM(impressions) ELSE AVG(position) END position FROM gsc_performance WHERE site_key=? AND snapshot_date=?`,[site,currentDate]);
  const queries=await q(`SELECT key query,clicks,impressions,ctr,position FROM gsc_performance WHERE site_key=? AND snapshot_date=? AND dimension='query' ORDER BY impressions DESC LIMIT 100`,[site,currentDate]);
  const pages=await q(`SELECT key page,clicks,impressions,ctr,position FROM gsc_performance WHERE site_key=? AND snapshot_date=? AND dimension='page' ORDER BY impressions DESC LIMIT 100`,[site,currentDate]);
  let changes=[];if(previousDate)changes=await q(`SELECT c.key page,c.clicks,c.impressions,c.ctr,c.position,COALESCE(p.clicks,0) prev_clicks,COALESCE(p.impressions,0) prev_impressions,COALESCE(p.position,0) prev_position,(c.clicks-COALESCE(p.clicks,0)) click_delta,(c.impressions-COALESCE(p.impressions,0)) impression_delta,(COALESCE(p.position,0)-c.position) position_gain FROM gsc_performance c LEFT JOIN gsc_performance p ON p.site_key=c.site_key AND p.dimension='page' AND p.key=c.key AND p.snapshot_date=? WHERE c.site_key=? AND c.snapshot_date=? AND c.dimension='page' AND (c.key LIKE '%/cars/%' OR c.key LIKE '%/bikes/%') ORDER BY ABS(c.impressions-COALESCE(p.impressions,0)) DESC LIMIT 200`,[previousDate,site,currentDate]);
  const growing=changes.filter(x=>num(x.impression_delta)>0||num(x.click_delta)>0).sort((a,b)=>num(b.impression_delta)-num(a.impression_delta)||num(b.click_delta)-num(a.click_delta)).slice(0,30);
  const declining=changes.filter(x=>num(x.impression_delta)<0||num(x.click_delta)<0).sort((a,b)=>num(a.impression_delta)-num(b.impression_delta)||num(a.click_delta)-num(b.click_delta)).slice(0,30);
  const indexRows=indexLatest.snapshot_date?await q(`SELECT COALESCE(NULLIF(status,''),'未分類') status,COUNT(*) count FROM gsc_index_status WHERE site_key=? AND snapshot_date=? GROUP BY COALESCE(NULLIF(status,''),'未分類') ORDER BY count DESC`,[site,indexLatest.snapshot_date]):[];
  const indexIssues=indexLatest.snapshot_date?await q(`SELECT url,status,reason,last_crawled FROM gsc_index_status WHERE site_key=? AND snapshot_date=? AND lower(COALESCE(status,'')) NOT LIKE '%登録済%' AND lower(COALESCE(status,'')) NOT LIKE '%indexed%' ORDER BY url LIMIT 100`,[site,indexLatest.snapshot_date]):[];
  const imports=await q(`SELECT site_key,snapshot_date,import_type,file_name,row_count,imported_at FROM gsc_imports WHERE site_key=? ORDER BY imported_at DESC LIMIT 20`,[site]);
  return json({ok:true,configured:true,site_key:site,snapshot_date:currentDate,previous_snapshot_date:previousDate,index_snapshot_date:indexLatest.snapshot_date||'',summary,queries,pages,growing,declining,index_status:indexRows,index_issues:indexIssues,imports});
}
