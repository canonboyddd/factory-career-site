const fs=require('fs');

function read(p){return fs.readFileSync(p,'utf8')}
function write(p,s){fs.mkdirSync(require('path').dirname(p),{recursive:true});fs.writeFileSync(p,s)}
function one(p,from,to,label){let s=read(p);const n=s.split(from).length-1;if(n!==1)throw new Error(`${label||p}: expected 1 match, got ${n}`);write(p,s.replace(from,to))}
function many(p,from,to,min,label){let s=read(p);const n=s.split(from).length-1;if(n<min)throw new Error(`${label||p}: expected >=${min} matches, got ${n}`);write(p,s.split(from).join(to))}
function reOne(p,re,to,label){let s=read(p);const m=s.match(re);if(!m)throw new Error(`${label||p}: regex not found`);write(p,s.replace(re,to))}

const shared=`export const CENTRAL_CLICK_EVENTS=['affiliate_click','affiliate_click_unified'];
export const CENTRAL_CLICK_SQL="('affiliate_click','affiliate_click_unified')";
export const VEHICLE_CLICK_EVENTS=['affiliate_click','affiliate_click_unified','affiliate_slot_click','car_valuation_click','bike_buyback_click','rakuten_click'];
export const PROBE_PATHS=["//","/.git/","/.ssh/","/actuator/","/.env","/wp-admin","/wp-login","/wordpress/","/wp/","/wp-content/","/wp-includes/","/xmlrpc.php","/openid_connect/","/cpanel/","/phpmyadmin","/server-status","/vendor/phpunit","/.aws/","/.docker/","/config/","/boaform/","/cgi-bin/"];
export const SUSPICIOUS_BROWSER_SQL=\`SELECT site_key,browser_id,date(occurred_at,'+9 hours') day FROM central_events WHERE event_name='page_view' GROUP BY site_key,browser_id,date(occurred_at,'+9 hours') HAVING (COUNT(*)>=20 AND COUNT(DISTINCT session_id)>=20 AND COUNT(DISTINCT page_path)>=10 AND (CAST(COUNT(DISTINCT session_id) AS REAL)/COUNT(*))>=0.90) OR (COUNT(*)>=25 AND COUNT(DISTINCT page_path)>=18 AND COUNT(DISTINCT session_id)<=5 AND (CAST(COUNT(DISTINCT page_path) AS REAL)/COUNT(*))>=0.60)\`;
`;
write('functions/shared/ops-analytics-contract.js',shared);

// 1/2/3: central dashboard = canonical period + vehicle D1 only + shared click contract.
{
  const p='functions/api/admin/central-dashboard.js';
  one(p,'function json(data,status=200){',"import {CENTRAL_CLICK_SQL,VEHICLE_CLICK_EVENTS,PROBE_PATHS,SUSPICIOUS_BROWSER_SQL} from '../../shared/ops-analytics-contract.js';\nfunction json(data,status=200){",'central import');
  one(p,'const PROBE_PATHS=["//","/.git/","/.ssh/","/actuator/","/.env","/wp-admin","/wp-login","/wordpress/","/wp/","/wp-content/","/wp-includes/","/xmlrpc.php","/openid_connect/","/cpanel/","/phpmyadmin","/server-status","/vendor/phpunit","/.aws/","/.docker/","/config/","/boaform/","/cgi-bin/"];\n','', 'central shared probes');
  one(p,"return ['affiliate_slot_click','car_valuation_click','bike_buyback_click','rakuten_click','affiliate_click','affiliate_click_unified'].includes(String(row?.event||row?.event_name||''));","return VEHICLE_CLICK_EVENTS.includes(String(row?.event||row?.event_name||''));",'central click events');
  reOne(p,/  const suspicious=`SELECT site_key,browser_id,date\(occurred_at,'\+9 hours'\) day[\s\S]*?COUNT\(DISTINCT page_path\) AS REAL\)\/COUNT\(\*\)\)>=0\.60\n    \)`;/,"  const suspicious=SUSPICIOUS_BROWSER_SQL;",'central suspicious source');
  one(p,"  const carClause=car?.summary?`AND c.site_key<>'car-bike'`:'';","  const carClause=`AND c.site_key<>'car-bike'`;",'central vehicle source');
  many(p,"event_name IN ('affiliate_click','affiliate_click_unified')","event_name IN ${CENTRAL_CLICK_SQL}",3,'central click sql');
  one(p,"source:site_key==='car-bike'?(car?'vehicle-d1':'central-fallback'):'central'","source:site_key==='car-bike'?(car?'vehicle-d1':'vehicle-unavailable'):'central'",'central source label');
  one(p,"mode:car?'vehicle-d1':'central-fallback'","mode:car?'vehicle-d1':'vehicle-unavailable'",'central source mode');
}

// 1/2/3: executive analytics uses the same period/click contract and never falls back to central car rows.
{
  const p='functions/api/admin/ops-intelligence.js';
  one(p,'function json(data,status=200){',"import {CENTRAL_CLICK_SQL,VEHICLE_CLICK_EVENTS,PROBE_PATHS,SUSPICIOUS_BROWSER_SQL} from '../../shared/ops-analytics-contract.js';\nfunction json(data,status=200){",'intel import');
  one(p,"const CLICK_EVENTS=new Set(['affiliate_click','affiliate_click_unified','affiliate_slot_click','car_valuation_click','bike_buyback_click','rakuten_click']);","const CLICK_EVENTS=new Set(VEHICLE_CLICK_EVENTS);",'intel click contract');
  one(p,'const PROBE_PATHS=["//","/.git/","/.ssh/","/actuator/","/.env","/wp-admin","/wp-login","/wordpress/","/wp/","/wp-content/","/wp-includes/","/xmlrpc.php","/openid_connect/","/cpanel/","/phpmyadmin","/server-status","/vendor/phpunit","/.aws/","/.docker/","/config/","/boaform/","/cgi-bin/"];\n','', 'intel shared probes');
  reOne(p,/  const suspicious=`SELECT site_key,browser_id,date\(occurred_at,'\+9 hours'\) day FROM central_events[\s\S]*?>=0\.60\)`;/,"  const suspicious=SUSPICIOUS_BROWSER_SQL;",'intel suspicious source');
  one(p,"  const carClause=car?.summary?`AND c.site_key<>'car-bike'`:'';","  const carClause=`AND c.site_key<>'car-bike'`;",'intel vehicle source');
  one(p,"  const clickSql=`('affiliate_click','affiliate_click_unified')`,impressionSql=`('affiliate_impression','affiliate_slot_view')`;","  const clickSql=CENTRAL_CLICK_SQL,impressionSql=`('affiliate_impression','affiliate_slot_view')`;",'intel central click sql');
}

// 4: Okazu analytics reads the same filtered central_events population as the portfolio/executive views.
{
  const p='functions/api/admin/okazu-analytics.js';
  one(p,'function json(data,status=200){',"import {CENTRAL_CLICK_SQL,PROBE_PATHS,SUSPICIOUS_BROWSER_SQL} from '../../shared/ops-analytics-contract.js';\nfunction json(data,status=200){",'okazu import');
  one(p,"function safeMessage(error){return String(error?.message||error||'unknown').slice(0,220)}","function safeMessage(error){return String(error?.message||error||'unknown').slice(0,220)}\nfunction probeSql(alias){return `(${PROBE_PATHS.map(p=>`lower(${alias}.page_path) LIKE '${p.replace(/'/g,\"''\")}%'`).join(' OR ')} OR lower(${alias}.page_path) LIKE '%.html/%')`}",'okazu probe helper');
  one(p,'async function entityRows(db,cutoff,mod,type,column,originColumn){','async function entityRows(db,cutoff,mod,type,column,originColumn,filteredPeriod){','okazu entity args');
  one(p,"      SELECT * FROM central_events WHERE site_key='okazu' AND occurred_at>=${cutoff}","      SELECT * FROM (${filteredPeriod})",'okazu entity source');
  const marker="  const safe=async(label,fn,fallback)=>{try{return await fn()}catch(e){warnings.push(`${label}: ${safeMessage(e)}`);return fallback}};";
  one(p,marker,marker+"\n  const suspicious=SUSPICIOUS_BROWSER_SQL;\n  const filteredPeriod=`SELECT c.* FROM central_events c LEFT JOIN (${suspicious}) b ON b.site_key=c.site_key AND b.browser_id=c.browser_id AND b.day=date(c.occurred_at,'+9 hours') WHERE b.browser_id IS NULL AND c.site_key='okazu' AND NOT ${probeSql('c')} AND c.occurred_at>=${cutoff}`;",'okazu filtered period');
  one(p,"    FROM central_events\n    WHERE site_key='okazu' AND occurred_at>=${cutoff}","    FROM (${filteredPeriod})",'okazu summary source');
  many(p,"event_name IN ('affiliate_click','affiliate_click_unified')","event_name IN ${CENTRAL_CLICK_SQL}",4,'okazu click sql');
  many(p,"    FROM central_events\n    WHERE site_key='okazu' AND event_name IN ${CENTRAL_CLICK_SQL} AND occurred_at>=${cutoff}","    FROM (${filteredPeriod})\n    WHERE event_name IN ${CENTRAL_CLICK_SQL}",3,'okazu detail source');
  one(p,"entityRows(db,cutoff,mod,'actress','actress','origin_actress')","entityRows(db,cutoff,mod,'actress','actress','origin_actress',filteredPeriod)",'okazu actress source');
  one(p,"entityRows(db,cutoff,mod,'genre','genre','origin_genre')","entityRows(db,cutoff,mod,'genre','genre','origin_genre',filteredPeriod)",'okazu genre source');
  one(p,"entityRows(db,cutoff,mod,'maker','maker','origin_maker')","entityRows(db,cutoff,mod,'maker','maker','origin_maker',filteredPeriod)",'okazu maker source');
}

// 1: parent dashboard owns the selected period and publishes it only after the canonical response arrives.
{
  const p='assets/ops-dashboard.js';
  one(p,";let days=7;const fmt=",";let days=7,loadSeq=0,revenueSeq=0;const fmt=",'dashboard sequences');
  one(p,'async function loadRevenue(){','async function loadRevenue(forDays=days){const seq=++revenueSeq;','revenue period arg');
  one(p,'/api/admin/ops-revenue?days=${days}&v=1','/api/admin/ops-revenue?days=${forDays}&v=2','revenue request period');
  one(p,'if(!res.ok||!data.ok){if($(\'revenueUpdated\'))$(\'revenueUpdated\').textContent=`収益取得エラー: ${data.error||`HTTP ${res.status}`}`;return;}renderRevenue(data);','if(!res.ok||!data.ok){if($(\'revenueUpdated\'))$(\'revenueUpdated\').textContent=`収益取得エラー: ${data.error||`HTTP ${res.status}`}`;return;}if(seq!==revenueSeq||forDays!==days)return;renderRevenue(data);','revenue stale response');
  one(p,'async function load(){const token=','async function load(){const requestDays=days;const seq=++loadSeq;const token=','dashboard request capture');
  one(p,'/api/admin/central-dashboard?days=${days}&v=5','/api/admin/central-dashboard?days=${requestDays}&v=6','dashboard request period');
  one(p,"if(!res.ok){$('msg').textContent=data.error||`HTTP ${res.status}`;return;}$('msg').textContent='';$('dashboard').hidden=false;renderLaunchers();render(data);loadRevenue();","if(!res.ok){$('msg').textContent=data.error||`HTTP ${res.status}`;return;}if(seq!==loadSeq||requestDays!==days)return;$('msg').textContent='';$('dashboard').hidden=false;renderLaunchers();render(data);window.__opsDashboardDays=requestDays;window.__opsCanonicalTotals=data.totals||{};window.dispatchEvent(new CustomEvent('ops:period-ready',{detail:{days:requestDays,totals:data.totals||{},generated_at:data.generated_at}}));loadRevenue(requestDays);",'dashboard period event');
  one(p,"else if(x.source==='central-fallback'&&x.connected)statusText=`受信済・中央転送${car.error?`（既存D1 ${car.error}）`:''}`;","else if(x.source==='vehicle-unavailable')statusText=`既存D1未取得${car.error?`（${car.error}）`:''}`;",'vehicle unavailable UI');
}

// 1: intelligence waits for the parent period event and queues rapid period changes.
{
  const p='assets/ops-intelligence.js';
  one(p,'let busy=false;','let busy=false,pendingDays=null;','intel queue state');
  one(p,"function days(){return Number(document.querySelector('[data-days].active')?.dataset.days||7)}","function days(){return Number(window.__opsDashboardDays||document.querySelector('[data-days].active')?.dataset.days||7)}",'intel canonical days');
  reOne(p,/async function load\(\)\{if\(busy\|\|!\$\('intelligenceMetrics'\)\)return;[\s\S]*?\}finally\{busy=false\}\}/,`async function load(forDays=days()){const requested=Number(forDays||days());if(!$('intelligenceMetrics'))return;if(busy){pendingDays=requested;return}const t=token();if(!t)return;busy=true;try{const res=await fetch(\`/api/admin/ops-intelligence?days=\${requested}&v=4\`,{headers:{authorization:'Bearer '+t},cache:'no-store'});let data={};try{data=await res.json()}catch{}if(!res.ok||!data.ok){if($('intelligenceUpdated'))$('intelligenceUpdated').textContent=\`分析取得エラー: \${data.error||\`HTTP \${res.status}\`}\`;return}if(requested!==days()||Number(data.days)!==requested)return;render(data)}finally{busy=false;if(pendingDays!=null){const next=pendingDays;pendingDays=null;if(next!==requested)load(next)}}}`,'intel queued loader');
  one(p,"document.addEventListener('click',e=>{if(e.target.closest('#load,#refresh,[data-days]'))setTimeout(load,80)});ensureAdvanced();if(token())setTimeout(load,120);window.loadOpsIntelligence=load;","window.addEventListener('ops:period-ready',e=>load(e.detail?.days));ensureAdvanced();if(token()&&window.__opsDashboardDays)setTimeout(()=>load(window.__opsDashboardDays),0);window.loadOpsIntelligence=load;",'intel period listener');
  one(p,"s.src='/assets/ops-health.js?v=3'","s.src='/assets/ops-health.js?v=20261003-1'",'health cache bump');
}

// 1/4: Okazu panel follows the canonical period event and labels the unified affiliate click metric correctly.
{
  const p='assets/ops-okazu.js';
  one(p,'  let busy=false;','  let busy=false,pendingDays=null;','okazu queue state');
  one(p,"  const days=()=>Number(document.querySelector('[data-days].active')?.dataset.days||7);","  const days=()=>Number(window.__opsDashboardDays||document.querySelector('[data-days].active')?.dataset.days||7);",'okazu canonical days');
  one(p,"['PV',fmt(s.page_views)],['セッション',fmt(s.sessions)],['商品遷移',fmt(s.product_opens)],['FANZAクリック',fmt(s.affiliate_clicks)]","['PV',fmt(s.page_views)],['セッション',fmt(s.sessions)],['商品遷移',fmt(s.product_opens)],['アフィリエイトクリック',fmt(s.affiliate_clicks)]",'okazu click label');
  reOne(p,/  async function load\(\)\{[\s\S]*?\n  \}/,`  async function load(forDays=days()){
    if(!ensurePanel())return;
    const requested=Number(forDays||days());
    if(busy){pendingDays=requested;return}
    const t=token();
    if(!t)return;
    busy=true;
    try{
      if($('okazuUpdated'))$('okazuUpdated').textContent='集計中…';
      const res=await fetch(\`/api/admin/okazu-analytics?days=\${requested}&v=2\`,{headers:{authorization:'Bearer '+t},cache:'no-store'});
      let data={};try{data=await res.json()}catch{}
      if(!res.ok||!data.ok){if($('okazuUpdated'))$('okazuUpdated').textContent=\`取得エラー: \${data.error||\`HTTP \${res.status}\`}\`;return}
      if(requested!==days()||Number(data.days)!==requested)return;
      render(data);
    }finally{busy=false;if(pendingDays!=null){const next=pendingDays;pendingDays=null;if(next!==requested)load(next)}}
  }`,'okazu queued loader');
  one(p,"    document.addEventListener('click',e=>{if(e.target.closest('#load,#refresh,[data-days]'))setTimeout(load,120)});\n    if(token())setTimeout(load,260);","    window.addEventListener('ops:period-ready',e=>load(e.detail?.days));\n    if(token()&&window.__opsDashboardDays)setTimeout(()=>load(window.__opsDashboardDays),0);",'okazu period listener');
}

// 5: cache-bust every dashboard script involved in the coordinated refresh.
{
  const p='assets/ops-health.js';
  one(p,"s.src='/assets/ops-okazu.js?v=1'","s.src='/assets/ops-okazu.js?v=20261003-1'",'okazu cache bump');
}
{
  const p='ops-dashboard.html';
  let s=read(p);
  s=s.replace('/assets/ops-dashboard.js?v=20260928-5','/assets/ops-dashboard.js?v=20261003-1')
     .replace('/assets/admin-affiliate-import.js?v=20260928-5','/assets/admin-affiliate-import.js?v=20261003-1')
     .replace('/assets/ops-intelligence.js?v=1','/assets/ops-intelligence.js?v=20261003-1')
     .replace('/assets/admin-seo-data.js?v=1','/assets/admin-seo-data.js?v=20261003-1');
  if(!s.includes('/assets/ops-dashboard.js?v=20261003-1')||!s.includes('/assets/ops-intelligence.js?v=20261003-1'))throw new Error('dashboard cache bump failed');
  write(p,s);
}

const qa=`const fs=require('fs');
const assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const shared=read('functions/shared/ops-analytics-contract.js');
const central=read('functions/api/admin/central-dashboard.js');
const intel=read('functions/api/admin/ops-intelligence.js');
const okazu=read('functions/api/admin/okazu-analytics.js');
const dash=read('assets/ops-dashboard.js');
const intelUi=read('assets/ops-intelligence.js');
const okazuUi=read('assets/ops-okazu.js');
const html=read('ops-dashboard.html');
assert(shared.includes("CENTRAL_CLICK_SQL=\"('affiliate_click','affiliate_click_unified')\""));
assert(shared.includes("VEHICLE_CLICK_EVENTS=['affiliate_click','affiliate_click_unified','affiliate_slot_click','car_valuation_click','bike_buyback_click','rakuten_click']"));
assert(central.includes("const carClause=\`AND c.site_key<>'car-bike'\`;"));
assert(intel.includes("const carClause=\`AND c.site_key<>'car-bike'\`;"));
assert(!central.includes('central-fallback'));
assert(central.includes("vehicle-unavailable"));
assert(central.includes('CENTRAL_CLICK_SQL')&&intel.includes('CENTRAL_CLICK_SQL')&&okazu.includes('CENTRAL_CLICK_SQL'));
assert(okazu.includes('const filteredPeriod=')&&okazu.includes('SUSPICIOUS_BROWSER_SQL'));
assert(dash.includes("new CustomEvent('ops:period-ready'"));
assert(dash.includes('const requestDays=days;const seq=++loadSeq'));
assert(intelUi.includes("window.addEventListener('ops:period-ready'"));
assert(okazuUi.includes("window.addEventListener('ops:period-ready'"));
assert(html.includes('/assets/ops-dashboard.js?v=20261003-1'));
assert(html.includes('/assets/ops-intelligence.js?v=20261003-1'));
console.log('Analytics consistency QA passed.');
`;
write('qa/analytics-consistency.spec.cjs',qa);

// Extend existing QA so the fix cannot regress.
{
  const p='.github/workflows/ops-dashboard-qa.yml';
  let s=read(p);
  if(!s.includes("      - 'functions/shared/ops-analytics-contract.js'"))s=s.replace("      - 'functions/api/admin/central-dashboard.js'","      - 'functions/shared/ops-analytics-contract.js'\n      - 'functions/api/admin/central-dashboard.js'");
  if(!s.includes("      - 'assets/ops-dashboard.js'"))s=s.replace("      - 'assets/admin-seo-data.js'","      - 'assets/admin-seo-data.js'\n      - 'assets/ops-dashboard.js'\n      - 'assets/ops-okazu.js'\n      - 'assets/ops-health.js'");
  if(!s.includes("      - 'qa/analytics-consistency.spec.cjs'"))s=s.replace("      - 'qa/ops-dashboard-contract.spec.cjs'","      - 'qa/ops-dashboard-contract.spec.cjs'\n      - 'qa/analytics-consistency.spec.cjs'");
  if(!s.includes('node --check functions/shared/ops-analytics-contract.js'))s=s.replace('          node --check functions/api/admin/central-dashboard.js','          node --check functions/shared/ops-analytics-contract.js\n          node --check functions/api/admin/central-dashboard.js');
  if(!s.includes('node --check assets/ops-dashboard.js'))s=s.replace('          node --check assets/ops-intelligence.js','          node --check assets/ops-intelligence.js\n          node --check assets/ops-dashboard.js\n          node --check assets/ops-okazu.js\n          node --check assets/ops-health.js');
  if(!s.includes('node qa/analytics-consistency.spec.cjs'))s=s.replace('        run: node qa/ops-dashboard-contract.spec.cjs','        run: |\n          node qa/ops-dashboard-contract.spec.cjs\n          node qa/analytics-consistency.spec.cjs');
  write(p,s);
}

console.log('Applied analytics consistency fix.');
