(() => {
  const root = document.querySelector('[data-rakuten-widget]');
  if (!root) return;

  const status = root.querySelector('[data-rakuten-status]');
  const grid = root.querySelector('[data-rakuten-grid]');
  const buttons = [...root.querySelectorAll('[data-rakuten-category]')];
  const validCategories = new Set(buttons.map(button => button.dataset.rakutenCategory).filter(Boolean));
  const money = value => Number(value || 0).toLocaleString('ja-JP');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let requestSeq = 0;

  function setStatus(text) { if (status) status.textContent = text; }
  function setActive(category) { buttons.forEach(button => button.classList.toggle('active', button.dataset.rakutenCategory === category)); }
  function categoryFromHash() {
    const value = decodeURIComponent(location.hash.replace(/^#/,''));
    return validCategories.has(value) ? value : '';
  }

  async function fetchJson(url, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
    try {
      const res = await fetch(url, {cache:'no-store',headers:{'Accept':'application/json'},signal:controller.signal});
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      return { res, data };
    } finally { clearTimeout(timer); }
  }

  function render(items, category, affiliateActive) {
    if (!grid) return;
    const affiliateFlag = affiliateActive ? '1' : '0';
    grid.innerHTML = items.map((item, index) => `
      <article class="rakuten-product" data-rakuten-card="${esc(category)}_${index + 1}">
        <a class="rakuten-product-image" href="${esc(item.url)}" target="_blank" rel="nofollow ${affiliateActive ? 'sponsored ' : ''}noopener" data-rakuten-link data-affiliate-active="${affiliateFlag}" data-placement="rakuten_${esc(category)}_image">
          ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" decoding="async">` : '<span class="rakuten-no-image">画像準備中</span>'}
        </a>
        <div class="rakuten-product-body">
          <span class="rakuten-pr">${affiliateActive ? 'PR・楽天市場' : '楽天市場'}</span>
          <h3>${esc(item.name)}</h3>
          <div class="rakuten-meta">
            <strong>¥${money(item.price)}</strong>
            ${item.reviewCount ? `<span>★ ${Number(item.reviewAverage || 0).toFixed(1)} / ${money(item.reviewCount)}件</span>` : ''}
          </div>
          ${item.shop ? `<p class="rakuten-shop">${esc(item.shop)}</p>` : ''}
          <a class="btn btn-primary rakuten-buy" href="${esc(item.url)}" target="_blank" rel="nofollow ${affiliateActive ? 'sponsored ' : ''}noopener" data-rakuten-link data-affiliate-active="${affiliateFlag}" data-placement="rakuten_${esc(category)}_button">楽天市場で詳細を見る ↗</a>
        </div>
      </article>`).join('');
    grid.style.display = 'grid';
    grid.style.visibility = 'visible';
    grid.style.opacity = '1';
  }

  async function load(category = 'work', hits = 8) {
    const seq = ++requestSeq;
    setActive(category);
    if (grid) grid.innerHTML = '';
    setStatus('楽天市場から商品を読み込み中…');
    const endpoint = `/api/rakuten/items?category=${encodeURIComponent(category)}&hits=${hits}&_=${Date.now()}`;
    let result;
    try {
      result = await fetchJson(endpoint, 12000);
    } catch (error) {
      if (seq !== requestSeq) return;
      setStatus('商品取得がタイムアウトしました。再試行しています…');
      try {
        await new Promise(resolve => setTimeout(resolve, 700));
        result = await fetchJson(endpoint + '&retry=1', 12000);
      } catch (retryError) {
        if (seq !== requestSeq) return;
        const message = retryError?.name === 'AbortError' ? '楽天APIの応答が時間内に返りませんでした。' : String(retryError?.message || retryError || '通信エラー');
        setStatus(`楽天API通信エラー: ${message}`);
        return;
      }
    }
    if (seq !== requestSeq) return;
    const { res, data } = result;
    if (!res.ok || !data.ok) {
      setStatus(`楽天APIエラー: ${String(data?.detail || data?.error || `HTTP ${res.status}`).slice(0,220)}`);
      return;
    }
    const items = Array.isArray(data.items) ? data.items.filter(item => item?.name && item?.url) : [];
    if (!items.length) { setStatus('楽天APIには接続できましたが、表示できる商品が0件でした。'); return; }
    const affiliateActive = data.affiliate_verified === true || data.affiliate_active === true;
    render(items, category, affiliateActive);
    setStatus(`${data.label || '楽天市場の商品'}を${items.length}件表示中。価格・在庫は楽天市場で最新情報をご確認ください。`);
    if (affiliateActive) window.trackSiteEvent?.('affiliate_offer_view', {program:'rakuten',placement:`rakuten_${category}`,items:items.length});
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const category = button.dataset.rakutenCategory || 'work';
      if (history.replaceState) history.replaceState(null,'',location.pathname+location.search+'#'+category);
      load(category, 8);
    });
  });
  addEventListener('hashchange', () => {
    const category = categoryFromHash();
    if (category) load(category, 8);
  });

  const initialCategory = categoryFromHash() || root.dataset.category || 'work';
  load(initialCategory, Number(root.dataset.hits || 8));
})();
