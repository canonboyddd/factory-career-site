(() => {
  const cfg = window.SITE_CONFIG || {};
  const programs = cfg.affiliatePrograms || {};
  const slug = (location.pathname.split('/').filter(Boolean).pop() || '').replace(/\.html$/i, '');

  const profiles = {
    'factory-quit': {
      eyebrow: '先に判断', title: '工場を辞める前に、この3ルートだけ比較',
      intro: '辞めたい気持ちだけで決めず、原因・変えたい条件・次の働き方を先に分けると判断しやすくなります。',
      axis: ['辞めたい理由','変えたい条件','次の職種','転職時期'],
      internal: { title:'まだ転職を決めない', text:'まず7問で不満と優先条件を整理します。', href:'/diagnosis', cta:'無料診断で整理 →' },
      midTitle:'変えたい条件が見えたら、今より良い求人があるか確認',
      midText:'会社を辞める決断より先に、同じ製造業で条件を変えられるか比較すると判断材料が増えます。',
      bottomTitle:'ここまで読んで「条件を変えたい」と感じた人へ'
    },
    'night-shift-hard': {
      eyebrow: '先に比較', title: '夜勤を続ける・日勤へ移る・会社を変えるを比較',
      intro: '夜勤そのものが原因か、交替周期・残業・通勤まで含めた負担かを分けてから求人条件を見ます。',
      axis: ['夜勤回数','交替周期','年収差','日勤求人'],
      internal: { title:'夜勤以外の条件も整理', text:'年収・残業・仕事内容まで含めて優先順位を確認します。', href:'/diagnosis', cta:'7問で整理 →' },
      midTitle:'日勤へ移った場合の条件差を、求人側から確認',
      midText:'夜勤手当が減る分だけでなく、基本給・残業・休日・仕事内容までまとめて比べます。',
      bottomTitle:'夜勤を減らせる求人を実際に比較する段階なら'
    },
    'manufacturing-30s': {
      eyebrow: '30代の転職軸', title: '経験を活かす・年収を上げる・役割を広げる',
      intro: '30代は年齢だけでなく、工程・設備・品質・改善・リーダー経験をどこまで言語化できるかで比較しやすさが変わります。',
      axis: ['経験範囲','年収','役割','勤務地'],
      internal: { title:'まず市場価値の材料を整理', text:'今の経験と変えたい条件を先に分けます。', href:'/diagnosis', cta:'無料診断で整理 →' },
      midTitle:'経験を活かせる求人で、年収と役割を比較',
      midText:'30代は「何年働いたか」より、任されてきた範囲を求人条件につなげて見るのが重要です。',
      bottomTitle:'30代の経験を活かして次の求人を比べるなら'
    },
    'manufacturing-500-income': {
      eyebrow: '年収アップの入口', title: '年収500万円は、総額より「何で上げるか」を先に決める',
      intro: '基本給・賞与・夜勤・残業・専門性・役割を分けると、働き方を悪化させずに年収を上げる方向を比較できます。',
      axis: ['基本給','賞与・手当','専門性','役割'],
      internal: { title:'今の年収を分解', text:'基本給・賞与・夜勤・残業への依存度を確認します。', href:'/tools/salary-compare', cta:'年収を分解する →' },
      midTitle:'年収だけでなく、役割と働き方まで求人で比較',
      midText:'500万円を目指す場合も、夜勤・残業依存なのか、専門性・役割で上げるのかを分けて見ます。',
      bottomTitle:'年収アップ候補を具体的に確認したい人へ'
    },
    'production-tech-career': {
      eyebrow: '生産技術の転職軸', title: '設備・工程・立上げ経験を、次の求人条件につなげる',
      intro: '同じ生産技術でも、設備導入・工程設計・改善・立上げ・海外対応で求人との相性が変わります。',
      axis: ['担当工程','設備・PLC','立上げ','出張・転勤'],
      internal: { title:'経験を職務経歴書に落とす', text:'担当工程・設備・改善成果を下書きに整理します。', href:'/tools/resume-draft', cta:'職務要約を作る →' },
      midTitle:'生産技術の経験範囲に合う求人を比較',
      midText:'設備導入・工程改善・立上げ・PLCなど、強みが求人側の募集要件と合うか確認します。',
      bottomTitle:'生産技術として条件を上げたい人へ'
    },
    'quality-quit': {
      eyebrow: '品質職の転職軸', title: '検査・解析・監査・顧客対応のどこを活かすか決める',
      intro: '品質管理・品質保証は担当範囲の差が大きいため、つらい業務と残したい専門性を分けて比較します。',
      axis: ['検査・解析','監査','顧客対応','QMS'],
      internal: { title:'辞めたい理由を先に整理', text:'仕事内容・人間関係・勤務条件を分けて考えます。', href:'/diagnosis', cta:'7問で整理 →' },
      midTitle:'残したい品質経験に合う求人を確認',
      midText:'検査・解析・監査・顧客対応のうち、続けたい領域と避けたい領域を求人条件で比較します。',
      bottomTitle:'品質経験を活かして職場を変えたい人へ'
    },
    'maintenance-career': {
      eyebrow: '設備保全の転職軸', title: '故障対応・予防保全・PLC・夜勤条件を分けて比較',
      intro: '保全経験は設備種類と担当範囲に加え、呼び出し・夜勤・休日対応まで求人ごとの差が出やすい領域です。',
      axis: ['設備種類','予防保全','PLC','夜勤・呼出'],
      internal: { title:'求人条件を同じ基準で比較', text:'年収・夜勤・残業・休日・仕事内容を点数化します。', href:'/tools/job-offer-score', cta:'求人を比較する →' },
      midTitle:'設備保全は、年収と呼び出し条件をセットで比較',
      midText:'給与だけでなく、夜勤・休日対応・担当設備・PLC経験の扱いまで求人ごとに確認します。',
      bottomTitle:'保全経験を活かせる求人を比べるなら'
    },
    'manufacturing-other-industry': {
      eyebrow: '異業種転職の入口', title: '製造業を離れる前に「持っていける経験」を確認',
      intro: '安全・品質・改善・設備・調整・リーダー経験は、職種を変えても説明材料になります。',
      axis: ['改善経験','品質・安全','調整力','希望職種'],
      internal: { title:'異業種へ行く理由を整理', text:'製造業に残る選択肢と比較しながら条件を決めます。', href:'/diagnosis', cta:'条件を整理する →' },
      midTitle:'異業種だけでなく、製造業内で条件を変える案も比較',
      midText:'業界を変える前に、今の経験をそのまま使える求人も見ておくと選択肢の差が分かります。',
      bottomTitle:'製造業に残るか異業種へ行くか比較したい人へ'
    },
    'factory-job-offer-check': {
      eyebrow: '応募前チェック', title: '求人票は年収だけでなく、働き方まで同じ表で比較',
      intro: '基本給・賞与・夜勤・残業・休日・勤務地・仕事内容を同じ順番で見ると、見落としを減らせます。',
      axis: ['基本給','夜勤・残業','休日','配属・転勤'],
      internal: { title:'求人票を点数化', text:'複数求人を同じ基準で比較できます。', href:'/tools/job-offer-score', cta:'求人条件スコアを使う →' },
      midTitle:'求人票の読み方が分かったら、実際の求人で比較',
      midText:'条件を見る順番を揃えたまま、複数の求人を比べると判断しやすくなります。',
      bottomTitle:'応募候補の求人を増やして比較したい人へ'
    },
    'factory-resume': {
      eyebrow: '応募書類の入口', title: '職務経歴書は「担当したこと」より「任された範囲」を先に整理',
      intro: '工程・設備・品質・改善・役割・成果を分けて書くと、製造業の経験を求人側が読み取りやすくなります。',
      axis: ['工程','設備・技術','改善','成果・役割'],
      internal: { title:'下書きを先に作る', text:'入力した経験から職務要約のたたき台を作ります。', href:'/tools/resume-draft', cta:'職務経歴書を下書き →' },
      midTitle:'書類が整ったら、自分の経験に合う求人を確認',
      midText:'職務経歴書の内容と求人の募集要件を照らし合わせると、応募先を絞りやすくなります。',
      bottomTitle:'職務経歴書を使って応募先を探す段階なら'
    },
    'factory-interview': {
      eyebrow: '面接前チェック', title: '退職理由・志望動機・経験・逆質問を4点セットで準備',
      intro: '製造業の面接では、辞めたい理由だけでなく、次の職場で何を変えたいかまで一貫させます。',
      axis: ['退職理由','志望動機','経験','逆質問'],
      internal: { title:'応募先条件を再確認', text:'面接前に年収・夜勤・残業・休日・仕事内容を見直します。', href:'/tools/job-offer-score', cta:'求人条件を確認 →' },
      midTitle:'面接準備と同時に、応募先の条件も再確認',
      midText:'志望動機だけでなく、入社後に条件のズレが出ないよう求人内容も同じ基準で見直します。',
      bottomTitle:'面接先以外の候補も比較しておきたい人へ'
    }
  };

  const profile = profiles[slug];
  if (!profile || document.querySelector('[data-priority-conversion]')) return;
  const article = document.querySelector('.article-main');
  if (!article) return;

  const labels = {
    makersJob: { title:'製造業の経験を活かして条件を変える', text:'メーカー・製造業領域の求人や支援内容を確認したい人向け。' },
    samuraiJob: { title:'専門性・年収・役割を重視して比較', text:'技術職・専門職としての経験やポジションを重視したい人向け。' }
  };

  const priority = (cfg.articleProgramPriority?.[slug] || cfg.articleProgramPriority?.[slug + '.html'] || [])
    .filter(key => labels[key] && String(programs[key]?.url || '').trim())
    .slice(0, 2);

  function trackStage(stage, kind, extra = {}) {
    window.trackSiteEvent?.('conversion_stage_click', {
      page: location.pathname,
      stage,
      kind,
      ...extra
    });
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
      window.trackSiteEvent?.('affiliate_click', { program:key, page:location.pathname, placement });
      trackStage(placement, 'affiliate', { program:key });
    });
    return true;
  }

  function createProgramCard(key, placement, cta = 'サービス内容を確認 →') {
    const meta = labels[key];
    if (!meta) return null;
    const card = document.createElement('div');
    card.className = 'benchmark-mini-card';
    card.dataset.priorityProgram = key;
    card.innerHTML = `<span class="pr-label">PR</span><strong>${meta.title}</strong><p>${meta.text}</p><a>${cta}</a>`;
    if (!bindAffiliate(card.querySelector('a'), key, placement)) return null;
    return card;
  }

  // 上部：先に結論と3ルートを見せる。
  const top = document.createElement('section');
  top.className = 'benchmark-quick priority-top-cta';
  top.dataset.priorityConversion = '';
  top.dataset.conversionStage = 'top';
  top.innerHTML = `
    <span class="eyebrow">${profile.eyebrow}</span>
    <h2>${profile.title}</h2>
    <p>${profile.intro}</p>
    <div class="benchmark-axis">${profile.axis.map(x => `<span>${x}</span>`).join('')}</div>
    <div class="benchmark-mini-grid" data-top-routes>
      <div class="benchmark-mini-card" data-internal-route>
        <strong>${profile.internal.title}</strong>
        <p>${profile.internal.text}</p>
        <a href="${profile.internal.href}">${profile.internal.cta}</a>
      </div>
    </div>
    <p class="benchmark-method">PRを含みます。提携サービスは承認済みのものだけを表示し、順位付けではなく目的との相性で分けています。最終的な対象条件・求人内容はリンク先で確認してください。</p>`;

  const topRoutes = top.querySelector('[data-top-routes]');
  priority.forEach(key => {
    const card = createProgramCard(key, 'article_top');
    if (card) topRoutes.appendChild(card);
  });
  if (topRoutes.children.length < 3) {
    const fallback = document.createElement('div');
    fallback.className = 'benchmark-mini-card';
    fallback.innerHTML = '<strong>サービスの違いを先に比較</strong><p>製造業向け・専門職向けなど、目的別の使い分けを確認します。</p><a href="/articles/manufacturing-agent-guide">転職サービスの選び方 →</a>';
    topRoutes.appendChild(fallback);
  }

  const insertion = article.querySelector('.answer-box') || article.querySelector('.article-lead') || article.querySelector('h1');
  if (insertion) insertion.insertAdjacentElement('afterend', top); else article.prepend(top);
  top.querySelectorAll('a[href^="/"]').forEach(a => a.addEventListener('click', () => {
    trackStage('article_top', 'internal', { to_url:a.getAttribute('href') });
    window.trackSiteEvent?.('article_conversion_click', { page:location.pathname, placement:'top', to_url:a.getAttribute('href') });
  }));

  // 中部：本文を読んで条件が具体化した人に、1つだけ強い次の行動を出す。
  const headings = [...article.querySelectorAll(':scope > h2')].filter(h => !h.closest('[data-priority-conversion]'));
  if (headings.length >= 3 && !article.querySelector('[data-priority-mid]')) {
    const mid = document.createElement('section');
    mid.className = 'benchmark-quick priority-mid-cta';
    mid.dataset.priorityMid = '';
    mid.dataset.conversionStage = 'middle';
    mid.innerHTML = `<span class="eyebrow">条件が見えてきたら</span><h2>${profile.midTitle}</h2><p>${profile.midText}</p><div class="benchmark-mini-grid" data-mid-routes></div>`;
    const routes = mid.querySelector('[data-mid-routes]');

    const guide = document.createElement('div');
    guide.className = 'benchmark-mini-card';
    guide.innerHTML = '<strong>サービスの違いを比較してから進む</strong><p>製造業向け・専門職向けの違いと使い分けを先に確認できます。</p><a href="/articles/manufacturing-agent-guide">転職サービスの選び方 →</a>';
    routes.appendChild(guide);

    if (priority[0]) {
      const card = createProgramCard(priority[0], 'article_middle', '求人・支援内容を確認 →');
      if (card) routes.appendChild(card);
    }
    const tool = document.createElement('div');
    tool.className = 'benchmark-mini-card';
    tool.innerHTML = `<strong>${profile.internal.title}</strong><p>${profile.internal.text}</p><a href="${profile.internal.href}">${profile.internal.cta}</a>`;
    routes.appendChild(tool);

    const target = headings[Math.floor(headings.length / 2)];
    target.insertAdjacentElement('beforebegin', mid);
    mid.querySelectorAll('a[href^="/"]').forEach(a => a.addEventListener('click', () => {
      trackStage('article_middle', 'internal', { to_url:a.getAttribute('href') });
      window.trackSiteEvent?.('article_conversion_click', { page:location.pathname, placement:'middle', to_url:a.getAttribute('href') });
    }));
  }

  // 下部：既存の提携サービス枠を「最後の比較」に統一し、4つ目の広告枠を増やさない。
  const offer = article.querySelector('.offer-section');
  if (offer && !offer.dataset.priorityBottom) {
    offer.dataset.priorityBottom = '';
    offer.dataset.conversionStage = 'bottom';
    offer.classList.add('benchmark-quick', 'priority-bottom-cta');
    const heading = offer.querySelector('h2');
    if (heading) heading.textContent = profile.bottomTitle;
    const intro = offer.querySelector('p');
    if (intro) intro.textContent = 'ここまで整理した条件を基準に、利用できる提携サービスを比較してください。登録を急ぐ必要はなく、対象職種・勤務地・求人条件はリンク先の最新情報を確認してください。';

    if (!offer.querySelector('[data-bottom-guide]')) {
      const guide = document.createElement('p');
      guide.className = 'conversion-stage-note';
      guide.dataset.bottomGuide = '';
      guide.innerHTML = '<strong>迷う場合：</strong> <a href="/articles/manufacturing-agent-guide">製造業向け転職サービスの選び方</a>で違いを確認してから進めます。';
      offer.appendChild(guide);
      guide.querySelector('a').addEventListener('click', () => {
        trackStage('article_bottom', 'internal', { to_url:'/articles/manufacturing-agent-guide' });
        window.trackSiteEvent?.('article_conversion_click', { page:location.pathname, placement:'bottom', to_url:'/articles/manufacturing-agent-guide' });
      });
    }

    offer.querySelectorAll('[data-program-link]').forEach(link => {
      const card = link.closest('[data-program-card]');
      const key = card?.dataset.programCard || card?.dataset.programKey || '';
      link.addEventListener('click', () => trackStage('article_bottom', 'affiliate', { program:key }));
    });

    const related = article.querySelector('[data-core-links], .internal-link-hub, [data-clean-seo-links]');
    if (related && related !== offer && related.parentNode === article) article.insertBefore(offer, related);
    else article.appendChild(offer);
  }
})();
