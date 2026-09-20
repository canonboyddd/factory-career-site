(() => {
  const tokenKey = 'factory_admin_token';
  const browserKey = 'fc_browser_id';
  const excludedKey = 'fc_owner_excluded';

  const $ = id => document.getElementById(id);
  const els = {
    tokenInput:$('tokenInput'), loadBtn:$('loadBtn'), authMessage:$('authMessage'),
    ownerPanel:$('ownerPanel'), ownerText:$('ownerText'), ownerToggle:$('ownerToggle'),
    dashboard:$('dashboard'), metricGrid:$('metricGrid'), trendChart:$('trendChart'),
    sourceList:$('sourceList'), landingList:$('landingList'), pagesBody:$('pagesBody'),
    engagementBody:$('engagementBody'), affiliateBody:$('affiliateBody'),
    actionList:$('actionList'), deviceList:$('deviceList'), funnel:$('funnel'),
    updatedAt:$('updatedAt'), periodLabel:$('periodLabel'), refreshBtn:$('refreshBtn')
  };

  let days = 7;
  let token = sessionStorage.getItem(tokenKey) || '';
  let lastData = null;

  function randomId() {
    return crypto.randomUUID ? crypto.randomUUID() :
      'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
  function browserId() {
    let id = localStorage.getItem(browserKey);
    if (!id) { id = randomId(); localStorage.setItem(browserKey, id); }
    return id;
  }
  browserId();

  if (token) els.tokenInput.value = token;

  function fmt(n) { return Number(n || 0).toLocaleString('ja-JP'); }
  function pct(num, den) {
    const n = Number(num || 0), d = Number(den || 0);
    return d ? ((n / d) * 100).toFixed(1) + '%' : '0.0%';
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[ch]);
  }
  function labelProgram(key) {
    return ({makersJob:'メーカーズジョブ',samuraiJob:'Samurai Job',other:'その他'})[key] || key || '不明';
  }
  function labelAction(name) {
    return ({
      comparison_page_click:'比較ページへ',
      diagnosis_entry_click:'無料診断へ',
      tool_entry_click:'無料ツールへ',
      affiliate_click_unified:'転職サービスCTA',
      engaged_30s:'30秒以上閲覧'
    })[name] || name;
  }

  async function api(path, options={}) {
    const headers = new Headers(options.headers || {});
    headers.set('authorization', 'Bearer ' + token);
    if (options.body) headers.set('content-type', 'application/json');
    const res = await fetch(path, {...options, headers, cache:'no-store'});
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(data.detail || data.error || data.missing || ('HTTP ' + res.status));
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  }

  function setAuthMessage(text, ok=false) {
    els.authMessage.textContent = text || '';
    els.authMessage.style.color = ok ? '#0f766e' : '#b42318';
  }

  function renderMetrics(data) {
    const s = data.summary || {};
    const affiliateSessions = Number(data.funnel?.affiliate_sessions || 0);
    const cards = [
      ['ページ閲覧数', fmt(s.pv) + ' PV', '運営者端末を除外'],
      ['外部ブラウザ数', fmt(s.browsers) + ' 人相当', '匿名ブラウザ単位'],
      ['セッション', fmt(s.sessions) + ' 回', '訪問単位'],
      ['収益CTA到達', fmt(affiliateSessions) + ' セッション', '案件リンクをクリック']
    ];
    els.metricGrid.innerHTML = cards.map(([l,v,n]) =>
      `<div class="metric"><div class="metric-label">${esc(l)}</div><div class="metric-value">${esc(v)}</div><div class="metric-note">${esc(n)}</div></div>`
    ).join('');
  }

  function renderTrend(items) {
    if (!items.length) { els.trendChart.innerHTML='<div class="empty">まだデータがありません。</div>'; return; }
    const max = Math.max(...items.map(x=>Number(x.pv||0)), 1);
    els.trendChart.innerHTML = items.map(x => {
      const h = Math.max(3, Math.round((Number(x.pv||0)/max)*160));
      const d = String(x.day||'').slice(5).replace('-','/');
      return `<div class="trend-col"><div class="trend-value">${fmt(x.pv)}</div><div class="trend-bar-wrap"><div class="trend-bar" style="height:${h}px"></div></div><div class="trend-day">${esc(d)}</div></div>`;
    }).join('');
  }

  function renderRank(target, items, labelKey, valueKey) {
    if (!items.length) { target.innerHTML='<div class="empty">まだデータがありません。</div>'; return; }
    const max = Math.max(...items.map(x=>Number(x[valueKey]||0)),1);
    target.innerHTML = items.map(x => {
      const v=Number(x[valueKey]||0);
      return `<div class="rank-row"><div class="rank-label" title="${esc(x[labelKey])}">${esc(x[labelKey])}</div><div class="rank-value">${fmt(v)}</div><div class="rank-track"><div class="rank-fill" style="width:${Math.max(2,(v/max)*100)}%"></div></div></div>`;
    }).join('');
  }

  function renderPages(items) {
    els.pagesBody.innerHTML = items.length ? items.map(x =>
      `<tr><td class="page-cell"><strong>${esc(x.title || x.page_path)}</strong><br><span class="muted">${esc(x.page_path)}</span></td><td>${fmt(x.pv)}</td><td>${fmt(x.browsers)}</td><td>${fmt(x.sessions)}</td></tr>`
    ).join('') : '<tr><td colspan="4" class="empty">まだデータがありません。</td></tr>';
  }

  function renderEngagement(items) {
    els.engagementBody.innerHTML = items.length ? items.map(x => {
      const p=Number(x.pv||0), e=Number(x.engaged_30s||0), s=Number(x.scroll_90||0);
      return `<tr><td class="page-cell">${esc(x.page_path)}</td><td>${fmt(p)}</td><td>${fmt(e)}</td><td>${pct(e,p)}</td><td>${fmt(s)}</td><td>${pct(s,p)}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="empty">まだデータがありません。</td></tr>';
  }

  function renderAffiliate(items) {
    els.affiliateBody.innerHTML = items.length ? items.map(x => {
      const clicks=Number(x.clicks||0), pv=Number(x.pv||0);
      return `<tr><td><strong>${esc(labelProgram(x.program))}</strong></td><td class="page-cell">${esc(x.page_path)}</td><td>${esc(x.placement||'-')}</td><td>${fmt(clicks)}</td><td>${fmt(pv)}</td><td class="good">${pct(clicks,pv)}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="empty">まだCTAクリックはありません。</td></tr>';
  }

  function renderActions(items) {
    const map = new Map(items.map(x=>[x.event_name,x]));
    const order=['comparison_page_click','diagnosis_entry_click','tool_entry_click','affiliate_click_unified','engaged_30s'];
    els.actionList.innerHTML = order.map(name => {
      const x=map.get(name)||{};
      return `<div class="action-row"><span>${esc(labelAction(name))}</span><b>${fmt(x.count||0)}</b></div>`;
    }).join('');
  }

  function renderFunnel(f) {
    const steps = [
      ['訪問',f.visit_sessions||0],
      ['比較ページ',f.comparison_sessions||0],
      ['転職サービスCTA',f.affiliate_sessions||0],
      ['無料診断',f.diagnosis_sessions||0]
    ];
    els.funnel.innerHTML = steps.map(([l,v]) =>
      `<div class="funnel-step"><span>${esc(l)}</span><strong>${fmt(v)}</strong></div>`
    ).join('');
  }

  function renderOwner(data) {
    const excluded = localStorage.getItem(excludedKey) === '1';
    const count = Number(data.owner_exclusions || 0);
    els.ownerPanel.classList.remove('is-hidden');
    els.ownerText.textContent = excluded
      ? `除外中です。このブラウザのアクセスは集計しません。登録端末: ${count}台`
      : `このブラウザは現在集計対象です。運営者として登録すると、過去分を含め集計から除外します。登録端末: ${count}台`;
    els.ownerToggle.textContent = excluded ? 'このブラウザの除外を解除' : 'このブラウザを除外';
  }

  function render(data) {
    lastData = data;
    renderMetrics(data);
    renderTrend(data.trend || []);
    renderRank(els.sourceList, data.sources || [], 'source', 'sessions');
    renderRank(els.landingList, data.landings || [], 'landing_page', 'sessions');
    renderPages(data.pages || []);
    renderEngagement(data.engagement || []);
    renderAffiliate(data.affiliate || []);
    renderActions(data.actions || []);
    renderRank(els.deviceList, data.devices || [], 'device_type', 'sessions');
    renderFunnel(data.funnel || {});
    renderOwner(data);
    els.periodLabel.textContent = days===1 ? '今日' : '過去'+days+'日';
    els.updatedAt.textContent = data.generated_at ? '更新 ' + new Date(data.generated_at).toLocaleString('ja-JP') : '';
    els.dashboard.classList.remove('is-hidden');
  }

  async function load() {
    token = els.tokenInput.value.trim() || token;
    if (!token) { setAuthMessage('ADMIN_TOKENを入力してください。'); return; }
    els.loadBtn.disabled=true;
    setAuthMessage('読み込み中...', true);
    try {
      const data = await api('/api/admin/analytics?days='+days);
      sessionStorage.setItem(tokenKey, token);
      setAuthMessage('認証済み', true);
      render(data);
    } catch (e) {
      els.dashboard.classList.add('is-hidden');
      els.ownerPanel.classList.add('is-hidden');
      if (e.status===401) setAuthMessage('ADMIN_TOKENが一致しません。');
      else if (e.data?.setup_required) setAuthMessage('Cloudflare設定が未完了です: '+(e.data.missing||'binding'));
      else setAuthMessage('読み込みに失敗しました: '+e.message);
    } finally {
      els.loadBtn.disabled=false;
    }
  }

  async function toggleOwner() {
    const nowExcluded = localStorage.getItem(excludedKey)==='1';
    els.ownerToggle.disabled=true;
    try {
      const data = await api('/api/admin/exclusion', {
        method:'POST',
        body:JSON.stringify({browser_id:browserId(),action:nowExcluded?'remove':'add'})
      });
      if (data.excluded) localStorage.setItem(excludedKey,'1');
      else localStorage.removeItem(excludedKey);
      await load();
    } catch (e) {
      setAuthMessage('除外設定に失敗しました: '+e.message);
    } finally {
      els.ownerToggle.disabled=false;
    }
  }

  els.loadBtn.addEventListener('click', load);
  els.tokenInput.addEventListener('keydown', e => { if (e.key==='Enter') load(); });
  els.refreshBtn.addEventListener('click', load);
  els.ownerToggle.addEventListener('click', toggleOwner);
  document.querySelectorAll('[data-days]').forEach(btn => btn.addEventListener('click', () => {
    days = Number(btn.dataset.days);
    document.querySelectorAll('[data-days]').forEach(x=>x.classList.toggle('active',x===btn));
    load();
  }));

  if (token) load();
})();
