(()=>{
const tokenKey='factory_admin_token';
const $=id=>document.getElementById(id);
const names={factory:'工場キャリア診断',sugutsucool:'SuguTsucool',okazu:'おかずよりどりみどり','car-bike':'車・バイク維持費',clipmade:'ClipMade'};
const urls={factory:'https://factory-career-site.pages.dev',sugutsucool:'https://sugutsucool.pages.dev',okazu:'https://okazu-yoridori-midori.pages.dev','car-bike':'https://norimono-cost.com',clipmade:'https://clipmade-site.pages.dev'};
const providerNames={rakuten:'楽天',a8:'A8.net',accesstrade:'AccessTrade',afb:'afb','dmm-fanza':'DMM/FANZA',fc2:'FC2'};
let days=7,loadSeq=0,revenueSeq=0;
const fmt=n=>Number(n||0).toLocaleString('ja-JP');
const yen=n=>'¥'+Math.round(Number(n||0)).toLocaleString('ja-JP');
const pct=(a,b)=>Number(b||0)?(Number(a||0)/Number(b)).toFixed(2):'0.00';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function siteName(k){return names[k]||k;}
function providerName(k){return providerNames[k]||k;}
function ownerUrl(k){const base=urls[k]||'#';if(k==='clipmade')return `${base}/?ops_owner=1`;return `${base}/api/owner-exclude?next=%2F`;}
function normalUrl(k){return urls[k]||'#';}
function when(v){if(!v)return'未受信';try{return new Date(v+'Z').toLocaleString('ja-JP')}catch{return v}}
function deltaInfo(current,previous){
  const c=Number(current||0),p=Number(previous||0);
  if(!p)return {text:c>0?'新規増加':'0.0%',cls:c>0?'up':''};
  const d=(c-p)/p*100;
  return {text:`${d>=0?'+':''}${d.toFixed(1)}%`,cls:d>0?'up':d<0?'down':''};
}
function deltaHtml(current,previous,table=false){const d=deltaInfo(current,previous);return `<small class="delta ${d.cls}${table?' table-delta':''}">前期間 ${fmt(previous)} / ${d.text}</small>`;}
function jstKeyAgo(iso,daysAgo){const base=new Date(iso||Date.now());return new Date(base.getTime()+9*3600000-daysAgo*86400000).toISOString().slice(0,10);}
function previousPeriod(data,periodDays){
  const out={totals:{pv:0,sessions:0},sites:{}};
  if(!data?.generated_at||!Array.isArray(data.daily))return out;
  const start=jstKeyAgo(data.generated_at,periodDays*2-1),end=jstKeyAgo(data.generated_at,periodDays-1);
  for(const x of data.daily){
    if(String(x.day)<start||String(x.day)>=end)continue;
    const pv=Number(x.pv||0),sessions=Number(x.sessions||0),key=String(x.site_key||'');
    out.totals.pv+=pv;out.totals.sessions+=sessions;
    if(!out.sites[key])out.sites[key]={pv:0,sessions:0};
    out.sites[key].pv+=pv;out.sites[key].sessions+=sessions;
  }
  return out;
}
function comparisonDays(periodDays){return periodDays===1?7:periodDays===7?30:periodDays===30?90:180;}
function renderLaunchers(){const el=$('siteLaunchers');if(!el)return;el.innerHTML=Object.keys(names).map(k=>`<div class="site-launch"><div><strong>${esc(siteName(k))}</strong><span>${esc(normalUrl(k).replace(/^https?:\/\//,''))}</span></div><a class="owner-open" href="${esc(ownerUrl(k))}" target="_blank" rel="noopener">管理者として開く ↗</a></div>`).join('');}
async function loadRevenue(forDays=days){const seq=++revenueSeq;const token=sessionStorage.getItem(tokenKey)||'';if(!token)return;const res=await fetch(`/api/admin/ops-revenue?days=${forDays}&v=2`,{headers:{authorization:'Bearer '+token},cache:'no-store'});let data={};try{data=await res.json();}catch{}if(!res.ok||!data.ok){if($('revenueUpdated'))$('revenueUpdated').textContent=`収益取得エラー: ${data.error||`HTTP ${res.status}`}`;return;}if(seq!==revenueSeq||forDays!==days)return;renderRevenue(data);}
function renderRevenue(data){const t=data.totals||{};if($('revenueUpdated'))$('revenueUpdated').textContent=`収益更新 ${new Date(data.generated_at).toLocaleString('ja-JP')}`;if($('revenueMetrics'))$('revenueMetrics').innerHTML=[['発生報酬',yen(t.generated_reward)],['確定報酬',yen(t.confirmed_reward)],['売上',yen(t.sales_amount)],['発生件数',fmt(t.generated_count)],['確定件数',fmt(t.confirmed_count)],['否認/取消',yen(t.cancelled_reward)]].map(([l,v])=>`<div class="revenue-metric"><span>${l}</span><strong>${v}</strong></div>`).join('');if($('revenueProviderRows'))$('revenueProviderRows').innerHTML=(data.providers||[]).map(x=>`<tr><td><strong>${esc(providerName(x.provider))}</strong></td><td>${fmt(x.generated_count)}</td><td>${yen(x.generated_reward)}</td><td>${fmt(x.confirmed_count)}</td><td><strong>${yen(x.confirmed_reward)}</strong></td><td>${yen(x.sales_amount)}</td><td>${yen(x.cancelled_reward)}</td></tr>`).join('')||'<tr><td colspan="7">まだ成果データがありません。</td></tr>';if($('revenueSiteRows'))$('revenueSiteRows').innerHTML=(data.sites||[]).map(x=>`<tr><td>${esc(providerName(x.provider))}</td><td>${esc(x.site_name||'未判定')}</td><td>${fmt(x.generated_count)}</td><td>${yen(x.generated_reward)}</td><td>${yen(x.confirmed_reward)}</td></tr>`).join('')||'<tr><td colspan="5">CSVにサイト名があればここへ表示します。</td></tr>';if($('revenueProgramRows'))$('revenueProgramRows').innerHTML=(data.programs||[]).map(x=>`<tr><td>${esc(providerName(x.provider))}</td><td>${esc(x.program_name||x.program_key||'未判定')}</td><td>${fmt(x.generated_count)}</td><td>${yen(x.generated_reward)}</td><td>${fmt(x.confirmed_count)}</td><td><strong>${yen(x.confirmed_reward)}</strong></td><td>${yen(x.sales_amount)}</td></tr>`).join('')||'<tr><td colspan="7">成果CSVを取り込むと案件別に表示します。</td></tr>';if($('revenueImportRows'))$('revenueImportRows').innerHTML=(data.imports||[]).map(x=>`<tr><td>${esc(providerName(x.provider))}</td><td>${esc(x.file_name||'')}</td><td>${fmt(x.row_count)}</td><td>${esc(when(x.imported_at))}</td></tr>`).join('')||'<tr><td colspan="4">まだ取込履歴がありません。</td></tr>';}
async function load(){
  const requestDays=days,seq=++loadSeq,token=sessionStorage.getItem(tokenKey)||'';
  if(!token){$('msg').textContent='ADMIN_TOKENを入力してください。';return;}
  const headers={authorization:'Bearer '+token};
  const res=await fetch(`/api/admin/central-dashboard?days=${requestDays}&v=7`,{headers,cache:'no-store'});
  let data={};try{data=await res.json();}catch{}
  if(!res.ok){$('msg').textContent=data.error||`HTTP ${res.status}`;return;}
  let comparisonData=null;
  try{
    const cr=await fetch(`/api/admin/central-dashboard?days=${comparisonDays(requestDays)}&v=7`,{headers,cache:'no-store'});
    if(cr.ok)comparisonData=await cr.json();
  }catch{}
  if(seq!==loadSeq||requestDays!==days)return;
  $('msg').textContent='';$('dashboard').hidden=false;renderLaunchers();render(data,comparisonData);window.__opsDashboardDays=requestDays;window.__opsCanonicalTotals=data.totals||{};window.dispatchEvent(new CustomEvent('ops:period-ready',{detail:{days:requestDays,totals:data.totals||{},generated_at:data.generated_at}}));loadRevenue(requestDays);
}
function render(data,comparisonData){
  const t=data.totals||{},car=data.sources?.car||{},previous=previousPeriod(comparisonData,data.days||days),pt=previous.totals||{};
  const pvDelta=deltaInfo(t.pv,pt.pv),sessionDelta=deltaInfo(t.sessions,pt.sessions);
  $('updated').textContent=`更新 ${new Date(data.generated_at).toLocaleString('ja-JP')} / 前期間比 PV ${pvDelta.text}・セッション ${sessionDelta.text}`;
  $('metrics').innerHTML=[['全PV',t.pv,pt.pv],['訪問者',t.browsers,null],['セッション',t.sessions,pt.sessions],['案件クリック',t.affiliate_clicks,null],['設定サイト',t.configured_sites,null],['受信済',t.received_sites,null],['自動巡回除外',t.filtered_automated_pv,null]].map(([l,v,p])=>`<div class="metric"><span>${l}</span><strong>${fmt(v)}</strong>${p===null?'':deltaHtml(v,p)}</div>`).join('');
  $('siteRows').innerHTML=(data.sites||[]).map(x=>{let statusText=x.connected?'受信済':'未受信';if(x.site_key==='car-bike'){if(x.source==='vehicle-d1')statusText='受信済・既存D1参照';else if(x.source==='vehicle-unavailable')statusText=`既存D1未取得${car.error?`（${car.error}）`:''}`;else if(car.error)statusText=`未受信（既存D1 ${car.error}）`;}const p=previous.sites?.[x.site_key]||{pv:0,sessions:0};return `<tr><td><span class="sitebadge"><i class="dot ${x.connected?'ok':'wait'}"></i>${esc(siteName(x.site_key))}</span><br><span class="status ${x.connected?'oktxt':'waittxt'}">${esc(statusText)}</span>${x.last_seen?`<span class="muted"> 最終 ${esc(when(x.last_seen))}</span>`:''}</td><td>${fmt(x.pv)}${deltaHtml(x.pv,p.pv,true)}</td><td>${fmt(x.browsers)}</td><td>${fmt(x.sessions)}${deltaHtml(x.sessions,p.sessions,true)}</td><td>${fmt(x.affiliate_clicks)}</td><td>${pct(x.pv,x.sessions)}</td><td><a class="table-open" href="${esc(ownerUrl(x.site_key))}" target="_blank" rel="noopener">管理者として開く ↗</a></td></tr>`}).join('')||'<tr><td colspan="7">まだデータがありません。</td></tr>';
  const byDay=new Map();for(const x of data.daily||[]){if(!byDay.has(x.day))byDay.set(x.day,{pv:0,sessions:0});const d=byDay.get(x.day);d.pv+=Number(x.pv||0);d.sessions+=Number(x.sessions||0);}const arr=[...byDay.entries()];const max=Math.max(1,...arr.map(([,x])=>x.pv));$('trend').innerHTML=arr.map(([day,x])=>`<div class="trendrow"><span>${esc(day.slice(5).replace('-','/'))}</span><div class="bars"><div class="bar"><i style="width:${Math.max(2,x.pv/max*100)}%"></i></div><span class="muted">${fmt(x.sessions)} sessions</span></div><strong>${fmt(x.pv)} PV</strong></div>`).join('')||'<div class="muted">まだ推移データがありません。</div>';
  $('pageRows').innerHTML=(data.pages||[]).map(x=>`<tr><td>${esc(siteName(x.site_key))}</td><td><strong>${esc(x.title||x.page_path)}</strong><br><span class="muted">${esc(x.page_path)}</span></td><td>${fmt(x.pv)}</td><td>${fmt(x.sessions)}</td></tr>`).join('')||'<tr><td colspan="4">まだページデータがありません。</td></tr>';
  $('affiliateList').innerHTML=(data.affiliates||[]).map(x=>`<div class="listitem"><div><strong>${esc(siteName(x.site_key))} / ${esc(providerName(x.program||'unknown'))}</strong><span class="muted">${fmt(x.sessions)} sessions</span></div><strong>${fmt(x.clicks)}</strong></div>`).join('')||'<div class="muted">まだクリックデータがありません。</div>';
  const connected=(data.sites||[]).filter(x=>x.connected).length,total=(data.sites||[]).length;
  $('connectionSummary').textContent=`設定済み ${total}サイト / データ受信済み ${connected}サイト。自動巡回 ${fmt(t.filtered_automated_pv)}PV を表示集計から除外。前期間比較は同じ日数（今日=昨日、7日=直前7日、30日=直前30日、90日=直前90日）です。管理者として開いたサイトでは、このブラウザのアクセスも除外します。`;
}
window.loadRevenueAnalytics=loadRevenue;
document.addEventListener('click',e=>{const b=e.target.closest('[data-days]');if(b){days=Number(b.dataset.days);document.querySelectorAll('[data-days]').forEach(x=>x.classList.toggle('active',x===b));load();}if(e.target.closest('#load')){const v=$('token').value.trim();if(v)sessionStorage.setItem(tokenKey,v);load();}if(e.target.closest('#refresh'))load();});
const saved=sessionStorage.getItem(tokenKey);if(saved){$('token').value=saved;load();}
})();
