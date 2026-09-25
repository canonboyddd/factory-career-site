(() => {
  if (window.__rakutenProductsLoaded) return;
  window.__rakutenProductsLoaded = true;

  const money = n => Number(n || 0).toLocaleString('ja-JP');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  const nav = document.querySelector('.site-header nav');
  if (nav && !nav.querySelector('a[href="/factory-items"]')) {
    const a = document.createElement('a');
    a.href = '/factory-items';
    a.textContent = '仕事グッズ';
    nav.appendChild(a);
  }

  const articleCategory = (() => {
    const slug = location.pathname.split('/').filter(Boolean).pop() || '';
    const map = {
      'night-shift-hard':'night','factory-night-to-day':'night','factory-fixed-night-shift':'night','factory-shift-change':'night',
      'factory-body-hard':'shoes','line-work-quit':'shoes','operator-quit':'shoes','assembly-career':'shoes','inspection-career':'shoes',
      'factory-overtime':'hydration','factory-weekend-work':'hydration','factory-holidays':'commute','factory-commute-long':'commute',
      'factory-resume':'interview','factory-interview':'interview','factory-job-offer-check':'interview',
      'production-tech-career':'light','maintenance-career':'light','plc-career':'light','machine-design-career':'light',
      'quality-quit':'work','quality-assurance-career':'work','production-control-career':'work'
    };
    return map[slug] || '';
  })();

  async function load(container, category='work', hits=6) {
    if (!container || container.dataset.rakutenLoaded === '1') return;
    container.dataset.rakutenLoaded = '1';
    const grid = container.querySelector('[data-rakuten-grid]') || container;
    const status = container.querySelector('[data-rakuten-status]');
    if (status) status.textContent = '楽天市場から商品を読み込み中…';

    try {
      const res = await fetch(`/api/rakuten/items?category=${encodeURIComponent(category)}&hits=${hits}`, {cache:'default'});
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.setup_required) {
          if (status) status.textContent = '楽天APIの設定を確認中です。';
          return;
        }
        throw new Error(data.detail || data.error || '商品を取得できませんでした');
      }

      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) {
        if (status) status.textContent = '現在表示できる商品がありません。';
        return;
      }

      grid.innerHTML = items.map((item, index) => `
        <article class="rakuten-product" data-program-card="rakuten" data-placement="rakuten_${esc(category)}_${index + 1}">
          <a class="rakuten-product-image" href="${esc(item.url)}" target="_blank" rel="nofollow sponsored noopener" data-program-link data-placement="product_image">
            ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" decoding="async">` : '<span class="rakuten-no-image">画像準備中</span>'}
          </a>
          <div class="rakuten-product-body">
            <span class="rakuten-pr">PR・楽天市場</span>
            <h3>${esc(item.name)}</h3>
            <div class="rakuten-meta">
              <strong>¥${money(item.price)}</strong>
              ${item.reviewCount ? `<span>★ ${Number(item.reviewAverage || 0).toFixed(1)} / ${money(item.reviewCount)}件</span>` : ''}
            </div>
            ${item.shop ? `<p class="rakuten-shop">${esc(item.shop)}</p>` : ''}
            <a class="btn btn-primary rakuten-buy" href="${esc(item.url)}" target="_blank" rel="nofollow sponsored noopener" data-program-link data-placement="product_button">楽天市場で詳細を見る ↗</a>
          </div>
        </article>`).join('');

      if (status) status.textContent = `${data.label || 'おすすめ商品'}を表示中。価格・在庫は楽天市場で最新情報をご確認ください。`;
      container.hidden = false;

      if (typeof window.trackSiteEvent === 'function') {
        window.trackSiteEvent('affiliate_offer_view', {program:'rakuten', placement:`rakuten_${category}`});
      }
    } catch (error) {
      if (status) status.textContent = '現在、商品情報を取得できません。時間をおいて再度ご確認ください。';
      grid.innerHTML = '';
    }
  }

  function bindCategoryButtons(root) {
    root.querySelectorAll('[data-rakuten-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('[data-rakuten-category]').forEach(x => x.classList.toggle('active', x === btn));
        const grid = root.querySelector('[data-rakuten-grid]');
        if (grid) grid.innerHTML = '';
        root.dataset.rakutenLoaded = '0';
        load(root, btn.dataset.rakutenCategory || 'work', 8);
      });
    });
  }

  document.querySelectorAll('[data-rakuten-widget]').forEach(root => {
    bindCategoryButtons(root);
    const category = root.dataset.category || 'work';
    const hits = Number(root.dataset.hits || 6);
    const eager = location.pathname === '/factory-items' || location.pathname === '/factory-items.html' || root.dataset.eager === '1';

    if (eager) {
      load(root, category, hits);
    } else if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        if (entries.some(x => x.isIntersecting)) {
          io.disconnect();
          load(root, category, hits);
        }
      }, {rootMargin:'300px'});
      io.observe(root);
    } else {
      load(root, category, hits);
    }
  });

  if (location.pathname === '/' && !document.querySelector('[data-rakuten-home]')) {
    const main = document.querySelector('main');
    if (main) {
      const section = document.createElement('section');
      section.className = 'section rakuten-home-section';
      section.dataset.rakutenHome = '';
      section.innerHTML = `<div class="container"><div class="rakuten-home-box"><span class="eyebrow">仕事を整える</span><h2>工場勤務の便利アイテムも比較できます</h2><p>安全靴、暑さ対策、夜勤の睡眠環境、通勤用品などを楽天市場の商品情報から確認できます。職場の指定品・安全基準を優先してください。</p><div class="category-links"><a href="/factory-items">仕事グッズ一覧 →</a><a href="/factory-items#shoes">安全靴</a><a href="/factory-items#night">夜勤・睡眠</a><a href="/factory-items#summer">暑さ対策</a></div></div></div>`;
      const target = main.querySelector('#prep') || main.children[Math.min(4, main.children.length - 1)];
      if (target) target.before(section); else main.appendChild(section);
    }
  }

  if (articleCategory && location.pathname.startsWith('/articles/')) {
    const article = document.querySelector('article.article-main, article');
    if (article && !document.querySelector('[data-auto-rakuten-widget]')) {
      const section = document.createElement('section');
      section.className = 'rakuten-article-widget';
      section.dataset.rakutenWidget = '';
      section.dataset.autoRakutenWidget = '';
      section.dataset.category = articleCategory;
      section.dataset.hits = '4';
      section.innerHTML = `
        <div class="rakuten-widget-head"><div><span class="eyebrow">仕事を整えるアイテム</span><h2>この記事に関連する楽天市場の商品</h2><p>職場のルール・指定品を優先し、必要なものだけ比較してください。</p></div><a href="/factory-items">工場勤務の便利アイテム一覧 →</a></div>
        <p class="rakuten-status" data-rakuten-status>商品を準備しています…</p>
        <div class="rakuten-grid compact" data-rakuten-grid></div>
        <p class="rakuten-disclaimer">PR：楽天アフィリエイトを利用しています。価格・在庫・送料・仕様は販売ページの最新情報をご確認ください。安全保護具は勤務先の規定・指定品を優先してください。</p>`;
      const faq = article.querySelector('#faq');
      if (faq) faq.before(section); else article.appendChild(section);
      load(section, articleCategory, 4);
    }
  }
})();
