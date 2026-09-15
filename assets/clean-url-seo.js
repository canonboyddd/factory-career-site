(() => {
  const SITE = 'https://factory-career-site.pages.dev';
  const path = window.location.pathname;
  const slug = (path.split('/').pop() || '').replace(/\.html$/i, '');
  const isArticle = path.includes('/articles/') && slug && slug !== 'index';

  const clusters = {
    workstyle: {
      hub: '/workstyle-guide', label: '働き方・シフト',
      core: [
        ['night-shift-hard','夜勤がきつい人の転職条件'],
        ['factory-quit','工場勤務を辞めたい人の判断軸'],
        ['factory-job-offer-check','工場・製造業の求人票の見方'],
        ['no-night-shift','夜勤なしで働く選択肢']
      ],
      tails: [
        ['factory-two-shift-hard','2交替勤務がきつい'],
        ['factory-three-shift-hard','3交替勤務がきつい'],
        ['factory-fixed-night-shift','夜勤専属を辞めたい'],
        ['factory-night-to-day','夜勤から日勤へ転職'],
        ['factory-day-shift-job','日勤のみ正社員求人の見方'],
        ['factory-day-shift-salary-drop','日勤転職で年収は下がる？'],
        ['factory-overtime','工場の残業が多い'],
        ['factory-weekend-work','休日出勤が多い'],
        ['factory-holidays','工場の休日が少ない'],
        ['factory-shift-change','交替勤務を辞めたい'],
        ['factory-commute-long','工場の通勤時間が長い'],
        ['factory-transfer-relocation','転勤したくない']
      ],
      extra: [
        ['factory-human-relations','工場の人間関係がきつい'],
        ['factory-body-hard','工場勤務が体力的にきつい'],
        ['factory-no-future','工場勤務の将来性が不安'],
        ['factory-resignation-reasons','工場を辞める理由を整理する']
      ]
    },
    salary: {
      hub: '/salary-guide', label: '年収・給与',
      core: [
        ['manufacturing-500-income','製造業で年収500万円を目指す条件'],
        ['factory-salary-up','工場・製造業で年収アップする方法'],
        ['manufacturing-30s','製造業30代の転職'],
        ['factory-job-offer-check','求人票で給与条件を確認する']
      ],
      tails: [
        ['factory-basic-salary-low','工場の基本給が低い'],
        ['factory-bonus-low','工場のボーナスが少ない'],
        ['low-salary','製造業で年収が低いと感じたら'],
        ['factory-day-shift-salary-drop','日勤転職で年収は下がる？'],
        ['manufacturing-supervisor-career','班長・リーダー経験を年収につなげる'],
        ['factory-small-company','中小工場から転職する'],
        ['manufacturing-20s','製造業20代の転職'],
        ['manufacturing-40s','製造業40代の転職'],
        ['manufacturing-50s','製造業50代の転職']
      ],
      extra: [
        ['manufacturing-job-change-age','製造業の転職は何歳まで？'],
        ['factory-permanent-employee','工場で正社員を目指す'],
        ['period-worker-next','期間工のその後を考える']
      ]
    },
    career: {
      hub: '/career-guide', label: '職種別キャリア',
      core: [
        ['production-tech-career','生産技術の転職'],
        ['quality-quit','品質管理を辞めたい人の転職先'],
        ['maintenance-career','設備保全の転職'],
        ['machine-design-career','機械設計の転職'],
        ['electrical-design-career','電気・制御設計の転職'],
        ['production-control-career','生産管理の転職']
      ],
      tails: [
        ['plc-career','PLC経験を活かす転職'],
        ['maintenance-qualification','設備保全の資格と転職'],
        ['production-tech-overseas-travel','生産技術の出張が多い'],
        ['quality-claim-hard','品質のクレーム対応がつらい'],
        ['quality-audit-hard','品質監査がきつい'],
        ['production-control-overtime','生産管理の残業が多い'],
        ['quality-assurance-career','品質保証の転職'],
        ['inspection-career','検査から転職'],
        ['assembly-career','組立から転職'],
        ['machining-career','機械加工から転職']
      ],
      extra: [
        ['welding-career','溶接工から転職'],
        ['factory-logistics-career','工場内物流から転職'],
        ['operator-quit','機械オペレーターを辞めたい'],
        ['line-work-quit','ライン作業を辞めたい'],
        ['cleanroom-career','クリーンルーム勤務がきつい'],
        ['automotive-parts-career','自動車部品メーカーの転職']
      ]
    },
    prep: {
      hub: '/job-change-guide', label: '転職準備',
      core: [
        ['manufacturing-agent-guide','製造業向け転職サービスの選び方'],
        ['factory-job-offer-check','工場・製造業の求人票の見方'],
        ['factory-resume','工場・製造業の職務経歴書'],
        ['factory-interview','工場・製造業の転職面接'],
        ['factory-white-company','働きやすい工場求人の見分け方'],
        ['factory-job-change-failure','工場転職で失敗しやすいパターン']
      ],
      tails: [
        ['factory-resignation-reasons','工場を辞める理由の整理'],
        ['factory-permanent-employee','工場で正社員を目指す'],
        ['manufacturing-job-change-age','製造業の転職は何歳まで？'],
        ['factory-no-qualification-job-change','資格なしで工場から転職'],
        ['factory-short-tenure-job-change','1年未満で辞めたい'],
        ['factory-job-change-no-experience','工場から未経験職へ転職'],
        ['factory-high-school-graduate-job-change','高卒の製造業転職'],
        ['factory-temp-worker-job-change','工場派遣から転職'],
        ['factory-contract-worker-permanent','契約社員から正社員へ']
      ],
      extra: [
        ['production-tech-agent','生産技術向け転職サービス'],
        ['quality-agent','品質職向け転職サービス'],
        ['manufacturing-other-industry','製造業から異業種へ転職']
      ]
    }
  };

  const cleanUrl = value => {
    try {
      const u = new URL(value, location.href);
      if (u.origin !== location.origin) return value;
      if (/\/index\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\/index\.html$/i, '/');
      else if (/\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\.html$/i, '');
      return u.pathname + u.search + u.hash;
    } catch (_) {
      return value;
    }
  };

  const normalizeNode = root => {
    if (!root) return;
    const anchors = root.matches?.('a[href]') ? [root] : [...(root.querySelectorAll?.('a[href]') || [])];
    anchors.forEach(a => {
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:)/i.test(raw)) return;
      try {
        const u = new URL(raw, location.href);
        if (u.origin === location.origin) a.setAttribute('href', cleanUrl(raw));
      } catch (_) { }
    });
  };

  normalizeNode(document);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = SITE + cleanUrl(canonical.href).split('#')[0];
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl?.content) ogUrl.content = SITE + cleanUrl(ogUrl.content).split('#')[0];

  const membership = Object.entries(clusters).filter(([, c]) =>
    [...c.core, ...c.tails, ...(c.extra || [])].some(([s]) => s === slug)
  );

  const card = (href, title, note = '') => `<a class="internal-link-card" href="${href}"><strong>${title}</strong>${note ? `<span>${note}</span>` : ''}<b>読む →</b></a>`;

  if (isArticle && membership.length) {
    const article = document.querySelector('.article-main');
    if (article && !article.querySelector('[data-clean-seo-links]')) {
      const seen = new Set([slug]);
      const parents = membership.map(([, c]) => c);
      const coreLinks = [];
      const detailLinks = [];
      parents.forEach(c => {
        c.core.forEach(item => {
          if (!seen.has(item[0]) && coreLinks.length < 5) {
            seen.add(item[0]); coreLinks.push(item);
          }
        });
        [...c.tails, ...(c.extra || [])].forEach(item => {
          if (!seen.has(item[0]) && detailLinks.length < 5) {
            seen.add(item[0]); detailLinks.push(item);
          }
        });
      });

      const box = document.createElement('section');
      box.className = 'internal-link-hub';
      box.dataset.cleanSeoLinks = '';
      box.innerHTML = `<div class="internal-link-head"><span class="eyebrow">関連ガイド</span><h2>このテーマを次に深掘り</h2><p>${parents.map(c => `<a href="${c.hub}">${c.label}のまとめ</a>`).join(' ・ ')}</p></div><div class="internal-link-grid">${coreLinks.map(([s,t]) => card(`/articles/${s}`, t, '中心記事で判断軸を整理')).join('')}${detailLinks.slice(0,3).map(([s,t]) => card(`/articles/${s}`, t, '具体的な悩みを確認')).join('')}</div>`;

      const offer = article.querySelector('.offer-section,[data-offer-section]');
      const service = article.querySelector('[data-service-bridge]');
      if (offer) article.insertBefore(box, offer);
      else if (service) article.insertBefore(box, service);
      else article.appendChild(box);
      normalizeNode(box);
    }
  }

  const hubEntry = Object.values(clusters).find(c => c.hub === path.replace(/\.html$/i, ''));
  if (hubEntry) {
    const main = document.querySelector('main .section .container') || document.querySelector('main .container');
    if (main && !main.querySelector('[data-clean-seo-sibling-hubs]')) {
      const sec = document.createElement('section');
      sec.className = 'internal-link-hub';
      sec.dataset.cleanSeoSiblingHubs = '';
      sec.innerHTML = `<div class="internal-link-head"><span class="eyebrow">関連テーマ</span><h2>別の切り口でも比較する</h2><p>働き方・年収・職種・転職準備は相互に関係します。</p></div><div class="internal-link-grid">${Object.values(clusters).filter(c => c.hub !== hubEntry.hub).map(c => card(c.hub, c.label, 'テーマ別まとめ')).join('')}</div>`;
      main.appendChild(sec);
      normalizeNode(sec);
    }
  }

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) normalizeNode(node);
    }));
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
})();