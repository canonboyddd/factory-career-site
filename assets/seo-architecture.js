(() => {
  const path = window.location.pathname;
  const file = path.split('/').pop() || '';

  const groups = {
    workstyle: {
      hub: '/workstyle-guide.html',
      label: '働き方・シフト',
      important: [
        ['night-shift-hard.html','夜勤がきつい人の転職条件'],
        ['factory-quit.html','工場勤務を辞めたい人の判断軸'],
        ['factory-job-offer-check.html','工場・製造業の求人票の見方'],
        ['no-night-shift.html','夜勤なしで働く選択肢']
      ],
      tails: [
        ['factory-two-shift-hard.html','2交替勤務がきつい'],
        ['factory-three-shift-hard.html','3交替勤務がきつい'],
        ['factory-fixed-night-shift.html','夜勤専属を辞めたい'],
        ['factory-night-to-day.html','夜勤から日勤へ転職'],
        ['factory-day-shift-job.html','日勤のみ正社員求人の見方'],
        ['factory-day-shift-salary-drop.html','日勤転職で年収は下がる？'],
        ['factory-overtime.html','工場の残業が多い'],
        ['factory-weekend-work.html','休日出勤が多い'],
        ['factory-holidays.html','工場の休日が少ない'],
        ['factory-shift-change.html','交替勤務を辞めたい'],
        ['factory-commute-long.html','工場の通勤時間が長い'],
        ['factory-transfer-relocation.html','転勤したくない']
      ],
      additional: [
        ['factory-human-relations.html','工場の人間関係がきつい'],
        ['factory-body-hard.html','工場勤務が体力的にきつい'],
        ['factory-no-future.html','工場勤務の将来性が不安'],
        ['factory-resignation-reasons.html','工場を辞める理由を整理する']
      ]
    },
    salary: {
      hub: '/salary-guide.html',
      label: '年収・給与',
      important: [
        ['manufacturing-500-income.html','製造業で年収500万円を目指す条件'],
        ['factory-salary-up.html','工場・製造業で年収アップする方法'],
        ['manufacturing-30s.html','製造業30代の転職'],
        ['factory-job-offer-check.html','求人票で給与条件を確認する']
      ],
      tails: [
        ['factory-basic-salary-low.html','工場の基本給が低い'],
        ['factory-bonus-low.html','工場のボーナスが少ない'],
        ['low-salary.html','製造業で年収が低いと感じたら'],
        ['factory-day-shift-salary-drop.html','日勤転職で年収は下がる？'],
        ['manufacturing-supervisor-career.html','班長・リーダー経験を年収につなげる'],
        ['factory-small-company.html','中小工場から転職する'],
        ['manufacturing-20s.html','製造業20代の転職'],
        ['manufacturing-40s.html','製造業40代の転職'],
        ['manufacturing-50s.html','製造業50代の転職']
      ],
      additional: [
        ['manufacturing-job-change-age.html','製造業の転職は何歳まで？'],
        ['factory-permanent-employee.html','工場で正社員を目指す'],
        ['period-worker-next.html','期間工のその後を考える']
      ]
    },
    career: {
      hub: '/career-guide.html',
      label: '職種別キャリア',
      important: [
        ['production-tech-career.html','生産技術の転職'],
        ['quality-quit.html','品質管理を辞めたい人の転職先'],
        ['maintenance-career.html','設備保全の転職'],
        ['machine-design-career.html','機械設計の転職'],
        ['electrical-design-career.html','電気・制御設計の転職'],
        ['production-control-career.html','生産管理の転職']
      ],
      tails: [
        ['plc-career.html','PLC経験を活かす転職'],
        ['maintenance-qualification.html','設備保全の資格と転職'],
        ['production-tech-overseas-travel.html','生産技術の出張が多い'],
        ['quality-claim-hard.html','品質のクレーム対応がつらい'],
        ['quality-audit-hard.html','品質監査がきつい'],
        ['production-control-overtime.html','生産管理の残業が多い'],
        ['quality-assurance-career.html','品質保証の転職'],
        ['inspection-career.html','検査から転職'],
        ['assembly-career.html','組立から転職'],
        ['machining-career.html','機械加工から転職']
      ],
      additional: [
        ['welding-career.html','溶接工から転職'],
        ['factory-logistics-career.html','工場内物流から転職'],
        ['operator-quit.html','機械オペレーターを辞めたい'],
        ['line-work-quit.html','ライン作業を辞めたい'],
        ['cleanroom-career.html','クリーンルーム勤務がきつい'],
        ['automotive-parts-career.html','自動車部品メーカーの転職']
      ]
    },
    prep: {
      hub: '/job-change-guide.html',
      label: '転職準備',
      important: [
        ['manufacturing-agent-guide.html','製造業向け転職サービスの選び方'],
        ['factory-job-offer-check.html','工場・製造業の求人票の見方'],
        ['factory-resume.html','工場・製造業の職務経歴書'],
        ['factory-interview.html','工場・製造業の転職面接'],
        ['factory-white-company.html','働きやすい工場求人の見分け方'],
        ['factory-job-change-failure.html','工場転職で失敗しやすいパターン']
      ],
      tails: [
        ['factory-resignation-reasons.html','工場を辞める理由の整理'],
        ['factory-permanent-employee.html','工場で正社員を目指す'],
        ['manufacturing-job-change-age.html','製造業の転職は何歳まで？'],
        ['factory-no-qualification-job-change.html','資格なしで工場から転職'],
        ['factory-short-tenure-job-change.html','1年未満で辞めたい'],
        ['factory-job-change-no-experience.html','工場から未経験職へ転職'],
        ['factory-high-school-graduate-job-change.html','高卒の製造業転職'],
        ['factory-temp-worker-job-change.html','工場派遣から転職'],
        ['factory-contract-worker-permanent.html','契約社員から正社員へ']
      ],
      additional: [
        ['production-tech-agent.html','生産技術向け転職サービス'],
        ['quality-agent.html','品質職向け転職サービス'],
        ['manufacturing-other-industry.html','製造業から異業種へ転職']
      ]
    }
  };

  const articleToGroup = new Map();
  Object.entries(groups).forEach(([key,g]) => {
    [...g.important, ...g.tails, ...(g.additional||[])].forEach(([f]) => {
      if (!articleToGroup.has(f)) articleToGroup.set(f, key);
    });
  });

  const card = (href,title,desc='') => `<a class="internal-link-card" href="${href}"><strong>${title}</strong>${desc?`<span>${desc}</span>`:''}<b>読む →</b></a>`;

  function injectHubHierarchy(groupKey){
    const g = groups[groupKey];
    const main = document.querySelector('main .section .container') || document.querySelector('main .container');
    if (!main || main.querySelector('[data-seo-hub-hierarchy]')) return;

    const priority = document.createElement('section');
    priority.className = 'core-guide-hub';
    priority.dataset.seoHubHierarchy = '';
    priority.innerHTML = `<div class="core-guide-heading"><span class="eyebrow">重要記事</span><h2>${g.label}で最初に読む記事</h2><p>このテーマの中心になる記事です。まず全体像を確認し、必要に応じて具体的な悩みへ進んでください。</p></div><div class="core-guide-grid">${g.important.map(([f,t])=>`<a class="core-guide-card" href="/articles/${f}"><strong>${t}</strong><span>重要ガイド</span></a>`).join('')}</div>`;
    const firstGrid = main.querySelector('.grid-2,.steps');
    if(firstGrid) main.insertBefore(priority, firstGrid); else main.prepend(priority);

    const detail = document.createElement('section');
    detail.className = 'internal-link-hub';
    detail.dataset.seoHubDetails = '';
    detail.innerHTML = `<div class="internal-link-head"><span class="eyebrow">具体的な悩み</span><h2>${g.label}のロングテール記事</h2><p>状況が近いテーマを選ぶと、より具体的な条件や判断軸を確認できます。</p></div><div class="internal-link-grid">${g.tails.map(([f,t])=>card(`/articles/${f}`,t)).join('')}</div>`;
    main.appendChild(detail);
  }

  function injectArticleHierarchy(){
    if (!path.includes('/articles/') || !file || file==='index.html') return;
    const groupKey = articleToGroup.get(file);
    if (!groupKey) return;
    const g = groups[groupKey];
    const article = document.querySelector('.article-main');
    if(!article || article.querySelector('[data-seo-article-hierarchy]')) return;
    const isImportant = g.important.some(([f])=>f===file);
    const links = (isImportant ? g.tails : g.important).filter(([f])=>f!==file).slice(0,isImportant?6:4);
    const box = document.createElement('section');
    box.className='internal-link-hub';
    box.dataset.seoArticleHierarchy='';
    box.innerHTML = `<div class="internal-link-head"><span class="eyebrow">${isImportant?'このテーマを深掘り':'まず全体像を確認'}</span><h2>${g.label}の関連ガイド</h2><p><a href="${g.hub}">${g.label}のまとめページ</a>から全体を比較できます。</p></div><div class="internal-link-grid">${links.map(([f,t])=>card(`/articles/${f}`,t,isImportant?'具体的な悩みを深掘り':'中心記事で判断軸を整理')).join('')}</div>`;
    const existing = article.querySelector('[data-topic-hub-links]');
    if(existing) existing.insertAdjacentElement('beforebegin',box); else article.appendChild(box);
  }

  function addHomepagePriorityLinks(){
    if(path!=='/' && !path.endsWith('/index.html')) return;
    if(document.querySelector('[data-seo-priority-paths]')) return;
    const anchor=document.querySelector('[data-discovery-hubs]') || document.querySelector('#roles');
    if(!anchor) return;
    const sec=document.createElement('section');
    sec.className='section';
    sec.dataset.seoPriorityPaths='';
    sec.innerHTML=`<div class="container"><div class="section-head"><div><span class="eyebrow">検索テーマ別</span><h2>4つの入口から、重要記事へ</h2></div><p>働き方・年収・職種・転職準備の順に、まとめページから重要記事、具体的な悩みへ進めます。</p></div><div class="grid-2">${Object.values(groups).map(g=>`<a class="card" href="${g.hub}"><h3>${g.label}</h3><p>${g.important.slice(0,2).map(([,t])=>t).join(' / ')}</p><strong>まとめて見る →</strong></a>`).join('')}</div></div>`;
    anchor.insertAdjacentElement('afterend',sec);
  }

  function addSiblingHubLinks(){
    const currentKey=Object.keys(groups).find(k=>groups[k].hub===path);
    if(!currentKey) return;
    const main=document.querySelector('main .section .container') || document.querySelector('main .container');
    if(!main || main.querySelector('[data-sibling-hubs]')) return;
    const sec=document.createElement('section');
    sec.className='internal-link-hub';
    sec.dataset.siblingHubs='';
    sec.innerHTML=`<div class="internal-link-head"><span class="eyebrow">次のテーマ</span><h2>別の切り口でも比較する</h2><p>働き方・年収・職種・転職準備はつながっています。近いテーマも確認すると条件の見落としを減らせます。</p></div><div class="internal-link-grid">${Object.entries(groups).filter(([k])=>k!==currentKey).map(([,g])=>card(g.hub,g.label,'テーマ別まとめ')).join('')}</div>`;
    main.appendChild(sec);
  }

  const hubPathMap = {
    '/workstyle-guide.html':'workstyle',
    '/salary-guide.html':'salary',
    '/career-guide.html':'career',
    '/job-change-guide.html':'prep'
  };
  if(hubPathMap[path]) injectHubHierarchy(hubPathMap[path]);
  injectArticleHierarchy();
  addHomepagePriorityLinks();
  addSiblingHubLinks();
})();
