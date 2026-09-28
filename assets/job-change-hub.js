(() => {
  if (document.documentElement.dataset.jobChangeHubLoaded) return;
  document.documentElement.dataset.jobChangeHubLoaded = '';

  const path = location.pathname.replace(/\.html$/i, '').replace(/\/index$/i, '/');
  const articleMatch = path.match(/^\/articles\/([^/]+)$/);
  const excludedArticleSlugs = new Set(['manufacturing-agent-guide','makers-job-review','samurai-job-review']);

  function track(placement) {
    window.trackSiteEvent?.('job_change_guide_click', { from_page: location.pathname, placement });
  }

  function addArticleBridge() {
    if (!articleMatch) return;
    const slug = articleMatch[1];
    if (excludedArticleSlugs.has(slug)) return;
    const article = document.querySelector('.article-main');
    if (!article || article.querySelector('[data-job-change-hub-bridge]')) return;

    const section = document.createElement('section');
    section.className = 'inline-cta';
    section.dataset.jobChangeHubBridge = '';
    section.innerHTML = '<span class="eyebrow">工場転職の全体像</span><h3>この記事の次に、転職の順番をまとめて確認</h3><p>条件整理、求人票、年収、職種、未経験転職、職務経歴書、面接までを1ページにまとめています。</p><a class="btn btn-secondary" href="/job-change-guide" data-job-change-guide-link>工場・製造業の転職完全ガイド →</a>';

    const serviceBridge = article.querySelector('[data-service-bridge]');
    const related = article.querySelector('[data-clean-seo-links]');
    const offer = article.querySelector('.offer-section,[data-offer-section]');
    if (serviceBridge) article.insertBefore(section, serviceBridge);
    else if (related) article.insertBefore(section, related);
    else if (offer) article.insertBefore(section, offer);
    else article.appendChild(section);

    section.querySelector('a')?.addEventListener('click', () => track('article_bridge'));
  }

  function addArticleIndexHub() {
    const isIndex = path === '/articles/' || path === '/articles';
    if (!isIndex || document.querySelector('[data-job-change-index-hub]')) return;
    const container = document.querySelector('main .section .container');
    if (!container) return;
    const target = container.querySelector('[data-seo-priority-hub], [data-core-guide-hub]');
    const section = document.createElement('section');
    section.className = 'inline-cta';
    section.dataset.jobChangeIndexHub = '';
    section.innerHTML = '<span class="eyebrow">START HERE</span><h2>工場転職を最初から順番に進める</h2><p>記事を探す前に、進路・求人比較・経験整理・応募準備の全体像を確認できます。</p><a class="btn btn-primary" href="/job-change-guide">工場・製造業の転職完全ガイド →</a>';
    if (target) container.insertBefore(section, target);
    else container.prepend(section);
    section.querySelector('a')?.addEventListener('click', () => track('article_index'));
  }

  function addHomepageShortcut() {
    if (!(path === '/' || path === '') || document.querySelector('[data-job-change-home-shortcut]')) return;
    const entry = document.querySelector('.entry-section');
    if (!entry) return;
    const section = document.createElement('section');
    section.className = 'section-compact';
    section.dataset.jobChangeHomeShortcut = '';
    section.innerHTML = '<div class="container"><div class="inline-cta"><span class="eyebrow">転職の進め方</span><h2>工場転職の全体像を先に確認</h2><p>辞める判断から求人比較、年収、職種、職務経歴書、面接までを順番にまとめています。</p><a class="btn btn-secondary" href="/job-change-guide">工場・製造業の転職完全ガイド →</a></div></div>';
    entry.insertAdjacentElement('afterend', section);
    section.querySelector('a')?.addEventListener('click', () => track('home_shortcut'));
  }

  function run() {
    addArticleBridge();
    addArticleIndexHub();
    addHomepageShortcut();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
