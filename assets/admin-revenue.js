(() => {
  const tokenKey = 'factory_admin_token';
  const $ = id => document.getElementById(id);
  const labels = {
    rakuten:'楽天アフィリエイト',
    zen:'ZENの退職代行',
    makersJob:'メーカーズジョブ',
    samuraiJob:'Samurai Job'
  };
  const providerLabels = {rakuten:'楽天',a8:'A8.net',accesstrade:'AccessTrade'};
  const categoryLabels = {
    work:'仕事用品',shoes:'安全靴・足元',summer:'暑さ対策',night:'夜勤・睡眠',
    commute:'通勤・持ち物',hydration:'水分補給',light:'作業ライト',interview:'転職準備'
  };

  const esc = v => String(v ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt = n => Number(n || 0).toLocaleString('ja-JP');
  const yen = n => '¥' + Math.round(Number(n || 0)).toLocaleString('ja-JP');
  const pct = (a,b) => Number(b || 0) ? ((Number(a || 0)/Number(b))*100).toFixed(1)+'%' : '0.0%';
  const currentDays = () => Number(document.querySelector('.period-tabs button.active')?.dataset.days || 7);
  let lastRequest = 0;

  function categoryFromPlacement(value) {
    const match = String(value || '').match(/^rakuten_([a-z]+)(?:_|$)/i);
    return match ? match[1] : 'unknown';
  }

  async function api(days) {
    const token = sessionStorage.getItem(tokenKey) || '';
    if (!token) return null;
    const res = await fetch(`/api/admin/revenue?days=${days}`, {
      headers:{authorization:'Bearer '+token}, cache:'no-store'
    });
    let data={};
    try { data=await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
    return data;
  }

  function renderActualSummary(items) {
    const target=$('actualRevenueMetricGrid');
    if(!target) return;
    const totals=(items||[]).reduce((a,x)=>{
      a.generatedReward+=Number(x.generated_reward||0);
      a.generatedCount+=Number(x.generated_count||0);
      a.confirmedReward+=Number(x.confirmed_reward||0);
      a.confirmedCount+=Number(x.confirmed_count||0);
      a.sales+=Number(x.sales_amount||0);
      a.cancelledReward+=Number(x.cancelled_reward||0);
      return a;
    },{generatedReward:0,generatedCount:0,confirmedReward:0,confirmedCount:0,sales:0,cancelledReward:0});
    const cards=[
      ['発生報酬',yen(totals.generatedReward),`${fmt(totals.generatedCount)}件`],
      ['確定報酬',yen(totals.confirmedReward),`${fmt(totals.confirmedCount)}件`],
      ['売上金額',yen(totals.sales),'ASPレポート取込分'],
      ['取消・否認報酬',yen(totals.cancelledReward),'成果状態が取消/否認']
    ];
    target.innerHTML=cards.map(([label,value,note])=>`<div class="actual-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('');
  }

  function renderActualProviders(items) {
    const body=$('actualProviderBody');
    if(!body) return;
    body.innerHTML=(items||[]).map(x=>`<tr>
      <td><strong>${esc(providerLabels[x.provider]||x.provider)}</strong></td>
      <td>${fmt(x.generated_count)}</td><td>${yen(x.generated_reward)}</td>
      <td>${fmt(x.confirmed_count)}</td><td class="good">${yen(x.confirmed_reward)}</td>
      <td>${yen(x.sales_amount)}</td><td>${yen(x.cancelled_reward)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty">成果CSVを取り込むと表示されます。</td></tr>';
  }

  function renderActualPrograms(items) {
    const body=$('actualProgramBody');
    if(!body) return;
    body.innerHTML=(items||[]).map(x=>`<tr>
      <td>${esc(providerLabels[x.provider]||x.provider)}</td>
      <td class="page-cell"><strong>${esc(x.program_name||x.program_key||'-')}</strong></td>
      <td>${fmt(x.generated_count)}</td><td>${yen(x.generated_reward)}</td>
      <td>${fmt(x.confirmed_count)}</td><td class="good">${yen(x.confirmed_reward)}</td>
      <td>${yen(x.sales_amount)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty">案件別のASP実績はまだありません。</td></tr>';
  }

  function renderActualDaily(items) {
    const target=$('actualRevenueDaily');
    if(!target) return;
    const map=new Map();
    (items||[]).forEach(x=>{
      if(!map.has(x.day)) map.set(x.day,{generated:0,confirmed:0});
      const row=map.get(x.day);
      if(x.kind==='confirmed') row.confirmed+=Number(x.reward||0);
      else row.generated+=Number(x.reward||0);
    });
    const rows=[...map.entries()];
    if(!rows.length){ target.innerHTML='<div class="empty">成果CSVを取り込むと日別報酬が表示されます。</div>'; return; }
    const max=Math.max(...rows.map(([,x])=>Math.max(Math.abs(x.generated),Math.abs(x.confirmed))),1);
    target.innerHTML=rows.map(([day,x])=>`<div class="revenue-day actual-day">
      <span>${esc(day.slice(5).replace('-','/'))}</span>
      <div class="revenue-bars"><i style="width:${Math.max(x.generated?2:0,Math.abs(x.generated)/max*100)}%" title="発生 ${yen(x.generated)}"></i><b style="width:${Math.max(x.confirmed?2:0,Math.abs(x.confirmed)/max*100)}%" title="確定 ${yen(x.confirmed)}"></b></div>
      <em>${yen(x.confirmed)} / ${yen(x.generated)}</em>
    </div>`).join('');
  }

  function renderImports(items) {
    const body=$('affiliateImportHistoryBody');
    if(!body) return;
    body.innerHTML=(items||[]).map(x=>`<tr>
      <td>${esc(providerLabels[x.provider]||x.provider)}</td>
      <td class="page-cell">${esc(x.file_name||'-')}</td>
      <td>${fmt(x.row_count)}</td>
      <td>${esc(x.imported_at ? new Date(x.imported_at+'Z').toLocaleString('ja-JP') : '-')}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty">まだ取込履歴はありません。</td></tr>';
  }

  function renderProgramMetrics(items) {
    const target=$('revenueMetricGrid');
    if(!target) return;
    const byKey=new Map((items||[]).map(x=>[x.program,x]));
    target.innerHTML=['rakuten','zen','makersJob','samuraiJob'].map(key=>{
      const x=byKey.get(key)||{};
      const views=Number(x.views||0),clicks=Number(x.clicks||0);
      return `<div class="revenue-metric"><span>${esc(labels[key])}</span><strong>${fmt(clicks)}クリック</strong><small>${fmt(views)}表示 / CTR ${pct(clicks,views)}</small></div>`;
    }).join('');
  }

  function renderPrograms(items) {
    const body=$('programRevenueBody');
    if(!body) return;
    body.innerHTML=(items||[]).map(x=>{
      const views=Number(x.views||0), clicks=Number(x.clicks||0);
      return `<tr><td><strong>${esc(labels[x.program]||x.program)}</strong></td><td>${fmt(views)}</td><td>${fmt(x.view_sessions)}</td><td>${fmt(clicks)}</td><td>${fmt(x.click_sessions)}</td><td>${fmt(x.clicked_pages)}</td><td class="good">${pct(clicks,views)}</td></tr>`;
    }).join('') || '<tr><td colspan="7" class="empty">まだ収益導線データがありません。</td></tr>';
  }

  function renderPages(items) {
    const body=$('programPageBody');
    if(!body) return;
    body.innerHTML=(items||[]).map(x=>{
      const views=Number(x.views||0), clicks=Number(x.clicks||0);
      return `<tr><td class="page-cell"><strong>${esc(x.title||x.page_path)}</strong><br><span class="muted">${esc(x.page_path)}</span></td><td>${esc(labels[x.program]||x.program)}</td><td>${fmt(views)}</td><td>${fmt(clicks)}</td><td>${fmt(x.click_sessions)}</td><td class="good">${pct(clicks,views||x.pv)}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="empty">まだ記事別クリックデータがありません。</td></tr>';
  }

  function renderRakuten(items) {
    const body=$('rakutenCategoryBody');
    if(!body) return;
    const map=new Map();
    (items||[]).forEach(x=>{
      const category=categoryFromPlacement(x.placement);
      if(category==='unknown') return;
      if(!map.has(category)) map.set(category,{views:0,clicks:0,clickSessions:0});
      const row=map.get(category);
      if(x.event_name==='affiliate_offer_view') row.views+=Number(x.count||0);
      if(x.event_name==='affiliate_click_unified') {
        row.clicks+=Number(x.count||0);
        row.clickSessions+=Number(x.sessions||0);
      }
    });
    body.innerHTML=[...map.entries()].sort((a,b)=>b[1].clicks-a[1].clicks||b[1].views-a[1].views).map(([key,x])=>
      `<tr><td><strong>${esc(categoryLabels[key]||key)}</strong></td><td>${fmt(x.views)}</td><td>${fmt(x.clicks)}</td><td>${fmt(x.clickSessions)}</td><td class="good">${pct(x.clicks,x.views)}</td></tr>`
    ).join('') || '<tr><td colspan="5" class="empty">楽天カテゴリデータはまだありません。</td></tr>';
  }

  function renderDaily(items) {
    const target=$('revenueDaily');
    if(!target) return;
    const dayMap=new Map();
    (items||[]).forEach(x=>{
      if(!dayMap.has(x.day)) dayMap.set(x.day,{views:0,clicks:0});
      const d=dayMap.get(x.day);
      if(x.event_name==='affiliate_offer_view') d.views+=Number(x.count||0);
      if(x.event_name==='affiliate_click_unified') d.clicks+=Number(x.count||0);
    });
    const rows=[...dayMap.entries()];
    if(!rows.length){target.innerHTML='<div class="empty">まだ日別データがありません。</div>';return;}
    const max=Math.max(...rows.map(([,x])=>Math.max(x.views,x.clicks)),1);
    target.innerHTML=rows.map(([day,x])=>`<div class="revenue-day"><span>${esc(day.slice(5).replace('-','/'))}</span><div class="revenue-bars"><i style="width:${Math.max(2,x.views/max*100)}%" title="表示 ${x.views}"></i><b style="width:${Math.max(x.clicks?2:0,x.clicks/max*100)}%" title="クリック ${x.clicks}"></b></div><em>${fmt(x.clicks)} / ${fmt(x.views)}</em></div>`).join('');
  }

  function renderTotals(totals) {
    const target=$('revenueSummaryNote');
    if(!target) return;
    target.textContent=`対象期間: ${fmt(totals.offer_views)}表示 / ${fmt(totals.clicks)}クリック / ${fmt(totals.click_sessions)}クリックセッション / ${fmt(totals.clicked_pages)}クリック発生ページ`;
  }

  async function loadRevenue() {
    const token=sessionStorage.getItem(tokenKey)||'';
    const section=$('revenueIntelligence');
    if(!token || !section) return;
    const request=++lastRequest;
    const status=$('revenueStatus');
    if(status) status.textContent='収益データを集計中…';
    try {
      const data=await api(currentDays());
      if(request!==lastRequest || !data) return;
      renderActualSummary(data.actual_providers||[]);
      renderActualProviders(data.actual_providers||[]);
      renderActualPrograms(data.actual_programs||[]);
      renderActualDaily(data.actual_daily||[]);
      renderImports(data.latest_imports||[]);
      renderProgramMetrics(data.programs||[]);
      renderPrograms(data.programs||[]);
      renderPages(data.page_program||[]);
      renderRakuten(data.rakuten_placement||[]);
      renderDaily(data.daily||[]);
      renderTotals(data.totals||{});
      section.classList.remove('is-hidden');
      const imported=(data.latest_imports||[]).length;
      if(status) status.textContent=(data.query_errors||[]).length
        ? '一部集計をスキップしました。'
        : imported ? 'ASP実績金額 + サイト内クリックを統合集計中' : 'ASP成果CSVを取り込むと実際の報酬額も表示されます。';
    } catch(error) {
      if(request!==lastRequest) return;
      if(status) status.textContent='収益データの読み込みに失敗: '+String(error.message||error);
    }
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#loadBtn,#refreshBtn,.period-tabs button')) setTimeout(loadRevenue,250);
  });
  addEventListener('focus',()=>{ if(!document.hidden) setTimeout(loadRevenue,50); });
  setTimeout(loadRevenue,500);
  window.loadRevenueAnalytics=loadRevenue;
})();
