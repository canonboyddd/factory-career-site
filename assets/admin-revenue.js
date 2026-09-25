(() => {
  const tokenKey = 'factory_admin_token';
  const $ = id => document.getElementById(id);
  const labels = {
    rakuten:'楽天アフィリエイト',
    zen:'ZENの退職代行',
    makersJob:'メーカーズジョブ',
    samuraiJob:'Samurai Job'
  };
  const categoryLabels = {
    work:'仕事用品',shoes:'安全靴・足元',summer:'暑さ対策',night:'夜勤・睡眠',
    commute:'通勤・持ち物',hydration:'水分補給',light:'作業ライト',interview:'転職準備'
  };

  const esc = v => String(v ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt = n => Number(n || 0).toLocaleString('ja-JP');
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
    if(status) status.textContent='収益導線を集計中…';
    try {
      const data=await api(currentDays());
      if(request!==lastRequest || !data) return;
      renderProgramMetrics(data.programs||[]);
      renderPrograms(data.programs||[]);
      renderPages(data.page_program||[]);
      renderRakuten(data.rakuten_placement||[]);
      renderDaily(data.daily||[]);
      renderTotals(data.totals||{});
      section.classList.remove('is-hidden');
      if(status) status.textContent=(data.query_errors||[]).length ? '一部集計をスキップしました。' : 'サイト内クリック計測。実際の成果・報酬額は各ASP管理画面で確認してください。';
    } catch(error) {
      if(request!==lastRequest) return;
      if(status) status.textContent='収益導線の読み込みに失敗: '+String(error.message||error);
    }
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#loadBtn,#refreshBtn,.period-tabs button')) setTimeout(loadRevenue,250);
  });
  addEventListener('focus',()=>{ if(!document.hidden) setTimeout(loadRevenue,50); });
  setTimeout(loadRevenue,500);
  window.loadRevenueAnalytics=loadRevenue;
})();
