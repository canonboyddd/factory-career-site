(() => {
  const tokenKey = 'factory_admin_token';
  const browserKey = 'fc_browser_id';
  const excludedKey = 'fc_owner_excluded';

  const $ = id => document.getElementById(id);
  const els = {
    tokenInput:$('tokenInput'), loadBtn:$('loadBtn'), authMessage:$('authMessage'),
    ownerPanel:$('ownerPanel'), ownerText:$('ownerText'), ownerToggle:$('ownerToggle'),
    dashboard:$('dashboard'), metricGrid:$('metricGrid'), trendChart:$('trendChart'),
    hourlyChart:$('hourlyChart'), sourceBody:$('sourceBody'), landingList:$('landingList'),
    sessionDepthList:$('sessionDepthList'), deviceList:$('deviceList'),
    engagementBody:$('engagementBody'), scrollDepthList:$('scrollDepthList'),
    exitList:$('exitList'), navigationBody:$('navigationBody'), affiliateBody:$('affiliateBody'),
    campaignBody:$('campaignBody'), actionList:$('actionList'), popularList:$('popularList'),
    funnel:$('funnel'), updatedAt:$('updatedAt'), periodLabel:$('periodLabel'),
    refreshBtn:$('refreshBtn')
  };

  let days = 7;
  let token = sessionStorage.getItem(tokenKey) || '';

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
      err.status = res.status;
      err.data = data;
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
    const f = data.funnel || {};
    const cards = [
      ['ページ閲覧数', fmt(s.pv) + ' PV', '運営者端末を除外'],
      ['セッション', fmt(s.sessions) + ' 回', '訪問単位'],
      ['平均PV / 訪問', Number(s.avg_pages_per_session || 0).toFixed(2), '回遊の深さ'],
      ['新規ブラウザ', fmt(s.new_browsers) + ' 人相当', '期間内に初めて訪問'],
      ['再訪ブラウザ', fmt(s.returning_browsers) + ' 人相当', '以前にも訪問'],
      ['収益CTA到達率', pct(f.affiliate_sessions, f.visit_sessions), fmt(f.affiliate_sessions) + ' / ' + fmt(f.visit_sessions) + ' セッション']
    ];
    els.metricGrid.innerHTML = cards.map(([l,v,n]) =>
      `<div class="metric"><div class="metric-label">${esc(l)}</div><div class="metric-value">${esc(v)}</div><div class="metric-note">${esc(n)}</div></div>`
    ).join('');
  }

  function renderTrend(items) {
    if (!items.length) {
      els.trendChart.innerHTML='<div class="empty">まだデータがありません。</div>';
      return;
    }
    const max = Math.max(...items.map(x=>Number(x.pv||0)), 1);
    els.trendChart.innerHTML = items.map(x => {
      const h = Math.max(3, Math.round((Number(x.pv||0)/max)*160));
      const d = String(x.day||'').slice(5).replace('-','/');
      return `<div class="trend-col"><div class="trend-value">${fmt(x.pv)}</div><div class="trend-bar-wrap"><div class="trend-bar" style="height:${h}px"></div></div><div class="trend-day">${esc(d)}</div></div>`;
    }).join('');
  }

  function renderHourly(items) {
    const map = new Map(items.map(x=>[Number(x.hour),Number(x.pv||0)]));
    const values = Array.from({length:24},(_,h)=>map.get(h)||0);
    const max = Math.max(...values,1);
    els.hourlyChart.innerHTML = values.map((v,h) => {
      const height=Math.max(3,Math.round((v/max)*92));
      return `<div class="hour-col" title="${h}:00  ${v} PV"><div class="hour-bar-wrap"><div class="hour-bar" style="height:${height}px"></div></div><span>${h}</span></div>`;
    }).join('');
  }

  function renderRank(target, items, labelFn, valueKey) {
    if (!items.length) {
      target.innerHTML='<div class="empty">まだデータがありません。</div>';
      return;
    }
    const max = Math.max(...items.map(x=>Number(x[valueKey]||0)),1);
    target.innerHTML = items.map(x => {
      const v=Number(x[valueKey]||0);
      const label=typeof labelFn==='function' ? labelFn(x) : x[labelFn];
      return `<div class="rank-row"><div class="rank-label" title="${esc(label)}">${esc(label)}</div><div class="rank-value">${fmt(v)}</div><div class="rank-track"><div class="rank-fill" style="width:${Math.max(2,(v/max)*100)}%"></div></div></div>`;
    }).join('');
  }

  function renderSources(items) {
    els.sourceBody.innerHTML = items.length ? items.map(x => {
      const sessions=Number(x.sessions||0), cta=Number(x.affiliate_sessions||0);
      return `<tr><td><strong>${esc(x.source||'direct')}</strong></td><td>${fmt(sessions)}</td><td>${fmt(cta)}</td><td class="good">${pct(cta,sessions)}</td></tr>`;
    }).join('') : '<tr><td colspan="4" class="empty">まだ流入データがありません。</td></tr>';
  }

  function renderEngagement(items) {
    els.engagementBody.innerHTML = items.length ? items.map(x => {
      const pv=Number(x.pv||0), e=Number(x.engaged_30s||0), s90=Number(x.scroll_90||0), cta=Number(x.cta_clicks||0);
      return `<tr><td class="page-cell"><strong>${esc(x.title||x.page_path)}</strong><br><span class="muted">${esc(x.page_path)}</span></td><td>${fmt(pv)}</td><td>${pct(e,pv)}</td><td>${pct(s90,pv)}</td><td>${fmt(cta)}</td><td class="good">${pct(cta,pv)}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="empty">まだデータがありません。</td></tr>';
  }

  function renderNavigation(items) {
    els.navigationBody.innerHTML = items.length ? items.map(x =>
      `<tr><td class="page-cell">${esc(x.page_path)}</td><td class="page-cell">${esc(x.to_path)}</td><td>${esc(x.link_area||'link')}</td><td>${fmt(x.clicks)}</td><td>${fmt(x.sessions)}</td></tr>`
    ).join('') : '<tr><td colspan="5" class="empty">まだページ間移動データがありません。</td></tr>';
  }

  function renderAffiliate(items) {
    els.affiliateBody.innerHTML = items.length ? items.map(x => {
      const clicks=Number(x.clicks||0), pv=Number(x.pv||0), views=Number(x.offer_views||0);
      const den=views||pv;
      return `<tr><td><strong>${esc(labelProgram(x.program))}</strong></td><td class="page-cell">${esc(x.page_path)}</td><td>${esc(x.placement||'-')}</td><td>${fmt(views)}</td><td>${fmt(clicks)}</td><td>${fmt(pv)}</td><td class="good">${pct(clicks,den)}</td></tr>`;
    }).join('') : '<tr><td colspan="7" class="empty">まだCTAクリックはありません。</td></tr>';
  }

  function renderCampaigns(items) {
    els.campaignBody.innerHTML = items.length ? items.map(x => {
      const sessions=Number(x.sessions||0), cta=Number(x.affiliate_sessions||0);
      return `<tr><td>${esc(x.utm_source||'-')}</td><td>${esc(x.utm_medium||'-')}</td><td>${esc(x.utm_campaign||'-')}</td><td>${fmt(sessions)}</td><td>${fmt(cta)}</td><td class="good">${pct(cta,sessions)}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="empty">UTM付き流入はまだありません。</td></tr>';
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
    renderMetrics(data);
    renderTrend(data.trend || []);
    renderHourly(data.hourly || []);
    renderSources(data.sources || []);
    renderRank(els.landingList, data.landings || [], 'landing_page', 'sessions');
    renderRank(els.sessionDepthList, data.session_depth || [], 'depth', 'sessions');
    renderRank(els.deviceList, data.devices || [], 'device_type', 'sessions');
    renderEngagement(data.engagement || []);
    renderRank(els.scrollDepthList, data.scroll_depth || [], x => (x.percent||0) + '%到達', 'sessions');
    renderRank(els.exitList, data.exits || [], x => x.title || x.page_path, 'exits');
    renderNavigation(data.navigation || []);
    renderAffiliate(data.affiliate || []);
    renderCampaigns(data.campaigns || []);
    renderActions(data.actions || []);
    renderRank(els.popularList, data.pages || [], x => x.title || x.page_path, 'pv');
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
      if (Array.isArray(data.query_errors) && data.query_errors.length) {
        const names = data.query_errors.map(x => x.name).join(', ');
        setAuthMessage('認証済み（一部集計をスキップ: ' + names + '）', false);
      } else {
        setAuthMessage('認証済み', true);
      }
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
