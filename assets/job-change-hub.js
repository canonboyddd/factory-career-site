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

  function addCareerDestinationIntent() {
    if (path !== '/articles/manufacturing-other-industry' || document.querySelector('[data-career-destination-intent]')) return;
    const article = document.querySelector('.article-main');
    if (!article) return;
    const section = document.createElement('section');
    section.className = 'core-intent-upgrade';
    section.dataset.careerDestinationIntent = '';
    section.innerHTML = `
      <span class="eyebrow">転職先候補を比較</span>
      <h2>工場勤務からの転職先は「経験を活かす度合い」で選ぶ</h2>
      <p>転職先を職種名だけで決めず、今までの経験をどの程度そのまま使えるかで比較すると、未経験扱いによる年収ダウンやミスマッチを避けやすくなります。</p>
      <div class="core-intent-table-wrap"><table class="core-intent-table"><tbody>
        <tr><th>品質管理・品質保証</th><td>検査、不良対応、原因分析、記録</td><td>現場経験を比較的そのまま使いやすい</td></tr>
        <tr><th>生産管理・工程管理</th><td>納期、段取り、前後工程との調整</td><td>調整・進捗管理の経験を説明しやすい</td></tr>
        <tr><th>設備保全・設備管理</th><td>機械操作、異常対応、安全</td><td>設備・電気・機械の経験がある人向け</td></tr>
        <tr><th>物流・倉庫</th><td>安全、5S、在庫、正確な作業</td><td>現場経験を活かしつつ業界を変えやすい</td></tr>
        <tr><th>CAD・技術補助</th><td>図面、測定、加工・組立の理解</td><td>図面読解や製品知識がある人は接点を作りやすい</td></tr>
        <tr><th>工業製品の営業</th><td>製品、工程、顧客要求の理解</td><td>現場知識を説明・提案へ転用する方向</td></tr>
        <tr><th>購買・調達</th><td>部材、納期、品質、仕入先との調整</td><td>部品や工程の知識を活かせる場合がある</td></tr>
        <tr><th>未経験職全般</th><td>改善、安全、教育、チーム連携</td><td>初年度条件と研修内容を特に確認</td></tr>
      </tbody></table></div>
      <div class="core-intent-next"><strong>未経験職まで広げる場合</strong><span>年齢・初年度年収・研修・勤務地・休日を同じ条件で比較します。</span><a href="/articles/factory-job-change-no-experience">工場から未経験職へ転職する方法 →</a></div>
      <div class="core-intent-faq"><h3>転職先を選ぶときの確認ポイント</h3>
        <details><summary>工場勤務から異業種へ行くと年収は下がりやすい？</summary><p>未経験扱いになる職種では下がる可能性があります。現職の基本給・賞与・夜勤手当・残業代と、転職先の初年度条件を分けて比較してください。</p></details>
        <details><summary>工場経験を活かしやすい転職先は？</summary><p>品質、生産管理、設備、物流、技術補助などは、安全・改善・品質・工程の経験と接点を作りやすい職種です。実際の要件は求人ごとに確認してください。</p></details>
      </div>`;
    const answer = article.querySelector('.answer-box');
    if (answer) answer.insertAdjacentElement('afterend', section);
    else article.prepend(section);
    section.querySelectorAll('a').forEach(a => a.addEventListener('click', () => track('career_destination')));
  }

  function addNoExperienceIntent() {
    if (path !== '/articles/factory-job-change-no-experience' || document.querySelector('[data-no-experience-intent]')) return;
    const article = document.querySelector('.article-main');
    if (!article) return;
    const section = document.createElement('section');
    section.className = 'core-intent-upgrade';
    section.dataset.noExperienceIntent = '';
    section.innerHTML = `
      <span class="eyebrow">未経験転職の難易度</span>
      <h2>工場から未経験職へ転職するときに難易度を左右する4項目</h2>
      <div class="core-intent-table-wrap"><table class="core-intent-table"><tbody>
        <tr><th>年齢・採用条件</th><td>求人ごとの経験・年齢条件を確認</td><td>年代別記事と合わせて応募範囲を整理</td></tr>
        <tr><th>転用できる経験</th><td>改善、安全、品質、教育、調整</td><td>単なる「工場作業」ではなく行動と成果で説明</td></tr>
        <tr><th>初年度条件</th><td>月給、賞与、研修、試用期間</td><td>現職年収ではなく手取り・働き方まで比較</td></tr>
        <tr><th>仕事内容の理解</th><td>1日の業務、評価基準、将来の役割</td><td>「工場以外なら何でもいい」で決めない</td></tr>
      </tbody></table></div>
      <div class="core-intent-next"><strong>「未経験で工場へ転職したい」場合は別ページ</strong><span>工場に入る側の難易度・正社員・年代別は専用ページに分けています。</span><a href="/articles/factory-job-change-difficulty">工場への転職は難しい？ →</a></div>
      <div class="core-intent-faq"><h3>未経験転職でよくある疑問</h3>
        <details><summary>30代・40代でも未経験職へ転職できますか？</summary><p>求人ごとに求める経験や採用条件が異なります。年齢だけで判断せず、今までの経験を転用できる職種と完全未経験の職種を分けて比較してください。</p></details>
        <details><summary>資格なしでも未経験転職できますか？</summary><p>資格不問の求人もあります。一方で資格が必要な職種もあるため、応募条件と入社後取得が可能かを確認してください。</p></details>
      </div>`;
    const answer = article.querySelector('.answer-box');
    if (answer) answer.insertAdjacentElement('afterend', section);
    else article.prepend(section);
    section.querySelectorAll('a').forEach(a => a.addEventListener('click', () => track('no_experience')));
  }

  function ensureIntentStyles() {
    if (document.querySelector('style[data-job-change-intent-style]')) return;
    const style = document.createElement('style');
    style.dataset.jobChangeIntentStyle = '';
    style.textContent = `.core-intent-upgrade{margin:26px 0;padding:22px;border:1px solid #cbd5e1;border-radius:18px;background:#f8fafc}.core-intent-table-wrap{overflow-x:auto;margin:16px 0}.core-intent-table{width:100%;border-collapse:collapse;background:#fff}.core-intent-table th,.core-intent-table td{padding:12px;border:1px solid #e2e8f0;text-align:left;vertical-align:top}.core-intent-table th{white-space:nowrap;background:#f1f5f9}.core-intent-next{display:grid;gap:5px;margin:16px 0;padding:16px;border-radius:14px;background:#ecfdf5}.core-intent-next a{font-weight:800}.core-intent-faq details{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:8px 0}.core-intent-faq summary{font-weight:800;cursor:pointer}@media(max-width:700px){.core-intent-upgrade{padding:16px}.core-intent-table{min-width:620px}}`;
    document.head.appendChild(style);
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
    section.innerHTML = '<span class="eyebrow">START HERE</span><h2>工場転職を最初から順番に進める</h2><p>進路・求人比較・経験整理・応募準備の全体像と、未経験・年代別の難易度を確認できます。</p><a class="btn btn-primary" href="/job-change-guide">工場・製造業の転職完全ガイド →</a> <a class="btn btn-secondary" href="/articles/factory-job-change-difficulty">工場転職は難しい？ →</a>';
    if (target) container.insertBefore(section, target);
    else container.prepend(section);
    section.querySelectorAll('a').forEach((a, i) => a.addEventListener('click', () => track(i === 0 ? 'article_index' : 'article_index_difficulty')));
  }

  function addHomepageShortcut() {
    if (!(path === '/' || path === '') || document.querySelector('[data-job-change-home-shortcut]')) return;
    const entry = document.querySelector('.entry-section');
    if (!entry) return;
    const section = document.createElement('section');
    section.className = 'section-compact';
    section.dataset.jobChangeHomeShortcut = '';
    section.innerHTML = '<div class="container"><div class="inline-cta"><span class="eyebrow">転職の進め方</span><h2>工場転職の全体像を先に確認</h2><p>辞める判断から求人比較、年収、職種、未経験・年代別、職務経歴書、面接までを順番にまとめています。</p><a class="btn btn-secondary" href="/job-change-guide">工場・製造業の転職完全ガイド →</a> <a class="btn btn-secondary" href="/articles/factory-job-change-difficulty">工場転職は難しい？ →</a></div></div>';
    entry.insertAdjacentElement('afterend', section);
    section.querySelectorAll('a').forEach((a, i) => a.addEventListener('click', () => track(i === 0 ? 'home_shortcut' : 'home_difficulty')));
  }

  function run() {
    ensureIntentStyles();
    addArticleBridge();
    addCareerDestinationIntent();
    addNoExperienceIntent();
    addArticleIndexHub();
    addHomepageShortcut();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
