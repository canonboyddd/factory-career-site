(() => {
  const cfg = window.SITE_CONFIG || {};
  const programs = cfg.affiliatePrograms || {};
  const slug = (location.pathname.split('/').filter(Boolean).pop() || '').replace(/\.html$/i, '');

  const profiles = {
    'factory-quit': {
      eyebrow: '先に判断',
      title: '工場を辞める前に、この3ルートだけ比較',
      intro: '辞めたい気持ちだけで決めず、原因・変えたい条件・次の働き方を先に分けると判断しやすくなります。',
      axis: ['辞めたい理由','変えたい条件','次の職種','転職時期'],
      internal: { title:'まだ転職を決めない', text:'まず7問で不満と優先条件を整理します。', href:'/diagnosis', cta:'無料診断で整理 →' }
    },
    'night-shift-hard': {
      eyebrow: '先に比較',
      title: '夜勤を続ける・日勤へ移る・会社を変えるを比較',
      intro: '夜勤そのものが原因か、交替周期・残業・通勤まで含めた負担かを分けてから求人条件を見ます。',
      axis: ['夜勤回数','交替周期','年収差','日勤求人'],
      internal: { title:'夜勤以外の条件も整理', text:'年収・残業・仕事内容まで含めて優先順位を確認します。', href:'/diagnosis', cta:'7問で整理 →' }
    },
    'manufacturing-30s': {
      eyebrow: '30代の転職軸',
      title: '経験を活かす・年収を上げる・役割を広げる',
      intro: '30代は年齢だけでなく、工程・設備・品質・改善・リーダー経験をどこまで言語化できるかで比較しやすさが変わります。',
      axis: ['経験範囲','年収','役割','勤務地'],
      internal: { title:'まず市場価値の材料を整理', text:'今の経験と変えたい条件を先に分けます。', href:'/diagnosis', cta:'無料診断で整理 →' }
    },
    'manufacturing-500-income': {
      eyebrow: '年収アップの入口',
      title: '年収500万円は、総額より「何で上げるか」を先に決める',
      intro: '基本給・賞与・夜勤・残業・専門性・役割を分けると、働き方を悪化させずに年収を上げる方向を比較できます。',
      axis: ['基本給','賞与・手当','専門性','役割'],
      internal: { title:'今の年収を分解', text:'基本給・賞与・夜勤・残業への依存度を確認します。', href:'/tools/salary-compare', cta:'年収を分解する →' }
    },
    'production-tech-career': {
      eyebrow: '生産技術の転職軸',
      title: '設備・工程・立上げ経験を、次の求人条件につなげる',
      intro: '同じ生産技術でも、設備導入・工程設計・改善・立上げ・海外対応で求人との相性が変わります。',
      axis: ['担当工程','設備・PLC','立上げ','出張・転勤'],
      internal: { title:'経験を職務経歴書に落とす', text:'担当工程・設備・改善成果を下書きに整理します。', href:'/tools/resume-draft', cta:'職務要約を作る →' }
    },
    'quality-quit': {
      eyebrow: '品質職の転職軸',
      title: '検査・解析・監査・顧客対応のどこを活かすか決める',
      intro: '品質管理・品質保証は担当範囲の差が大きいため、つらい業務と残したい専門性を分けて比較します。',
      axis: ['検査・解析','監査','顧客対応','QMS'],
      internal: { title:'辞めたい理由を先に整理', text:'仕事内容・人間関係・勤務条件を分けて考えます。', href:'/diagnosis', cta:'7問で整理 →' }
    },
    'maintenance-career': {
      eyebrow: '設備保全の転職軸',
      title: '故障対応・予防保全・PLC・夜勤条件を分けて比較',
      intro: '保全経験は設備種類と担当範囲に加え、呼び出し・夜勤・休日対応まで求人ごとの差が出やすい領域です。',
      axis: ['設備種類','予防保全','PLC','夜勤・呼出'],
      internal: { title:'求人条件を同じ基準で比較', text:'年収・夜勤・残業・休日・仕事内容を点数化します。', href:'/tools/job-offer-score', cta:'求人を比較する →' }
    },
    'manufacturing-other-industry': {
      eyebrow: '異業種転職の入口',
      title: '製造業を離れる前に「持っていける経験」を確認',
      intro: '安全・品質・改善・設備・調整・リーダー経験は、職種を変えても説明材料になります。',
      axis: ['改善経験','品質・安全','調整力','希望職種'],
      internal: { title:'異業種へ行く理由を整理', text:'製造業に残る選択肢と比較しながら条件を決めます。', href:'/diagnosis', cta:'条件を整理する →' }
    },
    'factory-job-offer-check': {
      eyebrow: '応募前チェック',
      title: '求人票は年収だけでなく、働き方まで同じ表で比較',
      intro: '基本給・賞与・夜勤・残業・休日・勤務地・仕事内容を同じ順番で見ると、見落としを減らせます。',
      axis: ['基本給','夜勤・残業','休日','配属・転勤'],
      internal: { title:'求人票を点数化', text:'複数求人を同じ基準で比較できます。', href:'/tools/job-offer-score', cta:'求人条件スコアを使う →' }
    },
    'factory-resume': {
      eyebrow: '応募書類の入口',
      title: '職務経歴書は「担当したこと」より「任された範囲」を先に整理',
      intro: '工程・設備・品質・改善・役割・成果を分けて書くと、製造業の経験を求人側が読み取りやすくなります。',
      axis: ['工程','設備・技術','改善','成果・役割'],
      internal: { title:'下書きを先に作る', text:'入力した経験から職務要約のたたき台を作ります。', href:'/tools/resume-draft', cta:'職務経歴書を下書き →' }
    },
    'factory-interview': {
      eyebrow: '面接前チェック',
      title: '退職理由・志望動機・経験・逆質問を4点セットで準備',
      intro: '製造業の面接では、辞めたい理由だけでなく、次の職場で何を変えたいかまで一貫させます。',
      axis: ['退職理由','志望動機','経験','逆質問'],
      internal: { title:'応募先条件を再確認', text:'面接前に年収・夜勤・残業・休日・仕事内容を見直します。', href:'/tools/job-offer-score', cta:'求人条件を確認 →' }
    }
  };

  const profile = profiles[slug];
  if (!profile || document.querySelector('[data-priority-conversion]')) return;
  const article = document.querySelector('.article-main');
  if (!article) return;

  const labels = {
    makersJob: {
      title: '製造業の経験を活かして条件を変える',
      text: 'メーカー・製造業領域の求人や支援内容を確認したい人向け。'
    },
    samuraiJob: {
      title: '専門性・年収・役割を重視して比較',
      text: '技術職・専門職としての経験やポジションを重視したい人向け。'
    }
  };

  function bindAffiliate(card, key) {
    const p = programs[key] || {};
    const url = String(p.url || '').trim();
    if (!url) return false;
    const a = card.querySelector('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'sponsored nofollow noopener';
    a.referrerPolicy = p.referrerPolicy || 'no-referrer-when-downgrade';
    a.addEventListener('click', () => window.trackSiteEvent?.('affiliate_click', {
      program: key,
      page: location.pathname,
      placement: 'priority_article_quick_route'
    }));
    const pixel = String(p.impressionPixel || '').trim();
    if (pixel) {
      const img = document.createElement('img');
      img.src = pixel;
      img.width = 1;
      img.height = 1;
      img.alt = '';
      img.decoding = 'async';
      img.referrerPolicy = p.referrerPolicy || 'no-referrer-when-downgrade';
      img.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;';
      card.appendChild(img);
    }
    return true;
  }

  const box = document.createElement('section');
  box.className = 'benchmark-quick';
  box.dataset.priorityConversion = '';
  box.innerHTML = `
    <span class="eyebrow">${profile.eyebrow}</span>
    <h2>${profile.title}</h2>
    <p>${profile.intro}</p>
    <div class="benchmark-axis">${profile.axis.map(x => `<span>${x}</span>`).join('')}</div>
    <div class="benchmark-mini-grid" data-priority-routes>
      <div class="benchmark-mini-card" data-internal-route>
        <strong>${profile.internal.title}</strong>
        <p>${profile.internal.text}</p>
        <a href="${profile.internal.href}">${profile.internal.cta}</a>
      </div>
    </div>
    <p class="benchmark-method">PRを含みます。提携サービスは承認済みのものだけを表示し、順位付けではなく目的との相性で分けています。最終的な対象条件・求人内容はリンク先で確認してください。</p>`;

  const routes = box.querySelector('[data-priority-routes]');
  const priority = (cfg.articleProgramPriority?.[slug] || cfg.articleProgramPriority?.[slug + '.html'] || [])
    .filter(key => labels[key] && String(programs[key]?.url || '').trim())
    .slice(0, 2);

  priority.forEach(key => {
    const meta = labels[key];
    const card = document.createElement('div');
    card.className = 'benchmark-mini-card';
    card.dataset.priorityProgram = key;
    card.innerHTML = `<span class="pr-label">PR</span><strong>${meta.title}</strong><p>${meta.text}</p><a>サービス内容を確認 →</a>`;
    if (bindAffiliate(card, key)) routes.appendChild(card);
  });

  if (routes.children.length < 3) {
    const fallback = document.createElement('div');
    fallback.className = 'benchmark-mini-card';
    fallback.innerHTML = '<strong>サービスの違いを先に比較</strong><p>製造業向け・専門職向けなど、目的別の使い分けを確認します。</p><a href="/articles/manufacturing-agent-guide">転職サービスの選び方 →</a>';
    routes.appendChild(fallback);
  }

  const insertion = article.querySelector('.answer-box') || article.querySelector('.article-lead') || article.querySelector('h1');
  if (insertion) insertion.insertAdjacentElement('afterend', box);
  else article.prepend(box);

  box.querySelectorAll('a[href^="/"]').forEach(a => {
    a.addEventListener('click', () => window.trackSiteEvent?.('article_conversion_click', {
      page: location.pathname,
      to_url: a.getAttribute('href')
    }));
  });
})();
