(() => {
  const cfg = window.SITE_CONFIG || {};
  const programs = cfg.affiliatePrograms || {};
  const slug = (location.pathname.split('/').filter(Boolean).pop() || '').replace(/\.html$/i, '');
  const targetSlugs = new Set([
    'manufacturing-agent-guide','factory-quit','night-shift-hard','manufacturing-30s','manufacturing-500-income',
    'production-tech-career','quality-quit','maintenance-career','manufacturing-other-industry',
    'factory-job-offer-check','factory-resume','factory-interview'
  ]);
  if (!targetSlugs.has(slug)) return;

  const article = document.querySelector('.article-main');
  if (!article) return;

  if (!document.querySelector('link[data-top-sites-layout]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/assets/top-sites-layout.css';
    css.dataset.topSitesLayout = '';
    document.head.appendChild(css);
  }

  const labels = {
    makersJob: {
      short: 'メーカーズジョブ',
      fit: '製造業の経験を活かして、会社・仕事内容・勤務条件を変えたい人向け',
      point: '製造業に特化した転職支援。まず個別ページで特徴と向いている人を確認',
      review: '/articles/makers-job-review'
    },
    samuraiJob: {
      short: 'Samurai Job',
      fit: '生産技術・設計・品質・保全など、専門性や役割を重視したい人向け',
      point: 'グローバル・外資系・ハイクラス寄り。個別ページで対象イメージを確認',
      review: '/articles/samurai-job-review'
    }
  };

  const priority = (cfg.articleProgramPriority?.[slug] || cfg.articleProgramPriority?.[slug + '.html'] || [])
    .filter((key, i, arr) => arr.indexOf(key) === i && labels[key] && String(programs[key]?.url || '').trim());
  const fallbackApproved = ['makersJob','samuraiJob'].filter(key => labels[key] && String(programs[key]?.url || '').trim());
  const approved = [...new Set([...priority, ...fallbackApproved])].slice(0, 2);

  function track(name, params = {}) {
    window.trackSiteEvent?.(name, { page: location.pathname, ...params });
  }

  function bindAffiliate(link, key, placement) {
    const p = programs[key] || {};
    const url = String(p.url || '').trim();
    if (!url) return false;
    link.href = url;
    link.target = '_blank';
    link.rel = 'sponsored nofollow noopener';
    link.referrerPolicy = p.referrerPolicy || 'no-referrer-when-downgrade';
    link.addEventListener('click', () => {
      track('affiliate_click', { program: key, placement });
      track('top_sites_cta_click', { kind: 'affiliate', program: key, placement });
    });
    return true;
  }

  function bindReview(link, key, placement) {
    const review = labels[key]?.review;
    if (!review) return false;
    link.href = review;
    link.removeAttribute('target');
    link.removeAttribute('rel');
    link.removeAttribute('referrerpolicy');
    link.addEventListener('click', () => track('service_review_entry_click', { program:key, placement, to_url:review }));
    return true;
  }

  function addTrustRow() {
    if (article.querySelector('[data-top-sites-trust]')) return;
    const meta = article.querySelector('.article-meta');
    const lead = article.querySelector('.article-lead');
    const anchor = meta || lead || article.querySelector('h1');
    if (!anchor) return;
    const row = document.createElement('div');
    row.className = 'top-sites-trust';
    row.dataset.topSitesTrust = '';
    row.innerHTML = '<span>広告を含みます</span><a href="/editorial-policy">編集・広告ポリシー</a><a href="/sources">参考情報・出典方針</a>';
    anchor.insertAdjacentElement('afterend', row);
  }

  function addGuideComparison() {
    if (slug !== 'manufacturing-agent-guide' || article.querySelector('[data-top-sites-comparison]')) return;
    const section = document.createElement('section');
    section.className = 'top-sites-comparison';
    section.dataset.topSitesComparison = '';
    section.id = 'quick-service-compare';
    section.innerHTML = `
      <div class="top-sites-section-head">
        <span class="eyebrow">先に比較</span>
        <h2>製造業転職で最初に比較する2つの選択肢</h2>
        <p>比較記事ではサービスの違いだけを確認し、気になるサービスは個別ページで対象者・特徴・注意点を確認してから公式申込みへ進めます。</p>
      </div>
      <div class="top-sites-compare-list" data-top-sites-compare-list></div>
      <div class="top-sites-undecided">
        <div><strong>まだ転職するか決めていない</strong><p>夜勤・年収・仕事内容・将来性を7問で整理してから比較できます。</p></div>
        <a class="btn btn-secondary" href="/diagnosis" data-top-sites-internal>3分で無料診断 →</a>
      </div>
      <p class="top-sites-disclosure">PR：個別ページから提携サービスへ申込み等があった場合、当サイトが報酬を受け取る場合があります。掲載順は報酬額ではなく、ページの目的との適合性で整理しています。</p>`;

    const list = section.querySelector('[data-top-sites-compare-list]');
    approved.forEach(key => {
      const meta = labels[key];
      const card = document.createElement('article');
      card.className = 'top-sites-compare-card';
      card.dataset.program = key;
      card.innerHTML = `<div class="top-sites-compare-title"><span class="pr-label">PR</span><h3>${meta.short}</h3></div><p class="top-sites-fit">${meta.fit}</p><p class="top-sites-point">${meta.point}</p><a class="btn btn-primary">特徴・向いている人を見る →</a>`;
      if (bindReview(card.querySelector('a'), key, 'guide_top_comparison')) list.appendChild(card);
    });

    const existing = article.querySelector('[data-benchmark-guide]') || article.querySelector('[data-priority-conversion]') || article.querySelector('.answer-box') || article.querySelector('.article-lead');
    if (existing) existing.insertAdjacentElement('afterend', section); else article.prepend(section);
    section.querySelectorAll('[data-top-sites-internal]').forEach(a => a.addEventListener('click', () => track('top_sites_cta_click', { kind:'internal', placement:'guide_top_comparison', to_url:a.getAttribute('href') })));
  }

  // On the main comparison article, keep the intended 3-step funnel:
  // comparison article -> dedicated service review -> official affiliate application.
  function rewriteGuideDirectLinksToReviews() {
    if (slug !== 'manufacturing-agent-guide') return;
    ['makersJob','samuraiJob'].forEach(key => {
      const review = labels[key]?.review;
      if (!review) return;
      const selectors = [
        `.offer-section [data-program-card="${key}"] [data-program-link]`,
        `[data-benchmark-program="${key}"] [data-affiliate-shortlist]`
      ];
      document.querySelectorAll(selectors.join(',')).forEach(oldLink => {
        const link = oldLink.cloneNode(true);
        link.href = review;
        link.removeAttribute('target');
        link.removeAttribute('rel');
        link.removeAttribute('referrerpolicy');
        link.removeAttribute('data-program-link');
        link.removeAttribute('data-affiliate-shortlist');
        link.textContent = '特徴・向いている人を確認 →';
        link.addEventListener('click', () => track('service_review_entry_click', { program:key, placement:'guide_existing_card', to_url:review }));
        oldLink.replaceWith(link);
      });
    });
  }

  function addTocIfMissing() {
    if (article.querySelector('.toc,[data-top-sites-toc]')) return;
    const headings = [...article.querySelectorAll(':scope > h2')].filter(h =>
      !h.closest('[data-priority-conversion],[data-priority-mid],[data-top-sites-comparison],.offer-section')
    );
    if (headings.length < 4) return;
    headings.forEach((h, i) => { if (!h.id) h.id = `section-${i + 1}`; });
    const toc = document.createElement('nav');
    toc.className = 'top-sites-toc';
    toc.dataset.topSitesToc = '';
    toc.setAttribute('aria-label','この記事の目次');
    toc.innerHTML = `<strong>この記事の目次</strong><ol>${headings.slice(0,8).map(h => `<li><a href="#${h.id}">${h.textContent.trim()}</a></li>`).join('')}</ol>`;
    const anchor = article.querySelector('[data-top-sites-comparison]') || article.querySelector('[data-priority-conversion]') || article.querySelector('.answer-box') || article.querySelector('.article-lead');
    if (anchor) anchor.insertAdjacentElement('afterend', toc);
  }

  function addMobileSticky() {
    if (document.querySelector('[data-top-sites-sticky]')) return;
    const bar = document.createElement('div');
    bar.className = 'top-sites-sticky';
    bar.dataset.topSitesSticky = '';
    bar.setAttribute('aria-label','転職サービスへのショートカット');

    if (slug === 'manufacturing-agent-guide') {
      const keys = approved.slice(0,2);
      bar.innerHTML = `<button class="top-sites-sticky-close" type="button" aria-label="閉じる">×</button><div class="top-sites-sticky-inner" data-sticky-links></div>`;
      const wrap = bar.querySelector('[data-sticky-links]');
      keys.forEach((key, i) => {
        const a = document.createElement('a');
        a.className = `top-sites-sticky-btn${i === 0 ? ' primary' : ''}`;
        a.innerHTML = `<small>PR</small>${labels[key].short} 詳細`;
        if (bindReview(a, key, 'mobile_sticky_guide')) wrap.appendChild(a);
      });
      if (!wrap.children.length) return;
    } else {
      const key = priority[0] || approved[0];
      bar.innerHTML = '<button class="top-sites-sticky-close" type="button" aria-label="閉じる">×</button><div class="top-sites-sticky-inner"><a class="top-sites-sticky-link" href="/articles/manufacturing-agent-guide">サービス比較</a><a class="top-sites-sticky-btn primary" data-sticky-affiliate><small>PR</small>求人・支援内容を見る</a></div>';
      const affiliate = bar.querySelector('[data-sticky-affiliate]');
      if (!key || !bindAffiliate(affiliate, key, 'mobile_sticky_article')) affiliate.remove();
      bar.querySelector('.top-sites-sticky-link').addEventListener('click', () => track('top_sites_cta_click', { kind:'internal', placement:'mobile_sticky_article', to_url:'/articles/manufacturing-agent-guide' }));
    }

    document.body.appendChild(bar);
    const close = bar.querySelector('.top-sites-sticky-close');
    close.addEventListener('click', () => { bar.classList.add('is-dismissed'); try { sessionStorage.setItem('factoryCtaDismissed','1'); } catch(_) {} });
    try { if (sessionStorage.getItem('factoryCtaDismissed') === '1') bar.classList.add('is-dismissed'); } catch(_) {}

    const blockers = [...article.querySelectorAll('[data-priority-conversion],[data-priority-mid],.offer-section,[data-top-sites-comparison]')];
    let blocked = false;
    if ('IntersectionObserver' in window && blockers.length) {
      const io = new IntersectionObserver(entries => {
        blocked = entries.some(e => e.isIntersecting && e.intersectionRatio > 0.08);
        update();
      }, { threshold:[0,.08,.2] });
      blockers.forEach(el => io.observe(el));
    }
    function update(){
      const visible = window.scrollY > 520 && !blocked && !bar.classList.contains('is-dismissed');
      bar.classList.toggle('is-visible', visible);
    }
    window.addEventListener('scroll', update, { passive:true });
    window.addEventListener('resize', update, { passive:true });
    update();
  }

  addTrustRow();
  addGuideComparison();
  rewriteGuideDirectLinksToReviews();
  addTocIfMissing();
  addMobileSticky();
})();
