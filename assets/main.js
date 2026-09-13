(() => {
  const menu = document.querySelector('.menu-btn');
  const nav = document.querySelector('nav');
  if(menu && nav){ menu.addEventListener('click',()=>nav.classList.toggle('open')); }
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

  const isArticlePath = window.location.pathname.includes('/articles/');
  const currentFile = window.location.pathname.split('/').pop() || '';

  // ホームの悩み別記事セクションから、全記事一覧へ内部リンクを追加。
  const articleSection = document.querySelector('#articles .container');
  if(articleSection && !document.querySelector('[data-all-guides-link]')){
    const row = document.createElement('div');
    row.className = 'cta-row';
    row.style.marginTop = '28px';
    row.setAttribute('data-all-guides-link','');
    row.innerHTML = '<a class="btn btn-secondary" href="articles/">製造業・工場勤務の記事をすべて見る →</a>';
    articleSection.appendChild(row);
  }

  // 収益化の中核となる8記事。周辺記事からテーマごとにリンクを集める。
  const coreGuides = {
    'factory-quit.html': { title:'工場勤務を辞めたい人の判断軸', reason:'辞めたい原因と転職条件を整理' },
    'night-shift-hard.html': { title:'夜勤がきつい・辞めたい人の転職条件', reason:'夜勤から日勤へ移る条件を整理' },
    'manufacturing-30s.html': { title:'製造業30代の転職で強みになる経験', reason:'経験の棚卸しと市場価値を整理' },
    'production-tech-career.html': { title:'生産技術の転職で見るべき条件', reason:'仕事内容・年収・働き方を比較' },
    'quality-quit.html': { title:'品質管理を辞めたい人の転職先', reason:'品質経験を活かす転職先を整理' },
    'manufacturing-500-income.html': { title:'製造業で年収500万円を目指す条件', reason:'年収アップの求人条件を比較' },
    'manufacturing-other-industry.html': { title:'製造業から異業種へ転職する方法', reason:'異業種で活かせる経験を整理' },
    'period-worker-next.html': { title:'期間工のその後に選べる4つの進路', reason:'正社員・メーカー転職・異業種を比較' }
  };

  const clusterMap = {
    'factory-human-relations.html':['factory-quit.html','manufacturing-other-industry.html','night-shift-hard.html'],
    'factory-resignation-reasons.html':['factory-quit.html','manufacturing-other-industry.html','night-shift-hard.html'],
    'factory-no-future.html':['manufacturing-other-industry.html','factory-quit.html','manufacturing-30s.html'],
    'factory-body-hard.html':['factory-quit.html','night-shift-hard.html','manufacturing-other-industry.html'],
    'factory-overtime.html':['factory-quit.html','manufacturing-500-income.html','night-shift-hard.html'],
    'factory-holidays.html':['factory-quit.html','night-shift-hard.html','manufacturing-30s.html'],
    'factory-night-to-day.html':['night-shift-hard.html','factory-quit.html','manufacturing-30s.html'],
    'factory-shift-change.html':['night-shift-hard.html','factory-quit.html','manufacturing-other-industry.html'],
    'factory-commute-long.html':['factory-quit.html','manufacturing-30s.html','manufacturing-500-income.html'],
    'factory-small-company.html':['manufacturing-30s.html','manufacturing-500-income.html','factory-quit.html'],
    'low-salary.html':['manufacturing-500-income.html','manufacturing-30s.html','factory-quit.html'],
    'factory-bonus-low.html':['manufacturing-500-income.html','manufacturing-30s.html','factory-quit.html'],
    'manufacturing-20s.html':['manufacturing-30s.html','manufacturing-other-industry.html','factory-quit.html'],
    'manufacturing-40s.html':['manufacturing-30s.html','manufacturing-500-income.html','factory-quit.html'],
    'manufacturing-50s.html':['manufacturing-30s.html','factory-quit.html','manufacturing-other-industry.html'],
    'operator-quit.html':['factory-quit.html','manufacturing-other-industry.html','production-tech-career.html'],
    'line-work-quit.html':['factory-quit.html','manufacturing-other-industry.html','period-worker-next.html'],
    'assembly-career.html':['manufacturing-30s.html','production-tech-career.html','manufacturing-500-income.html'],
    'inspection-career.html':['quality-quit.html','manufacturing-30s.html','manufacturing-other-industry.html'],
    'quality-assurance-career.html':['quality-quit.html','manufacturing-500-income.html','manufacturing-30s.html'],
    'production-control-career.html':['manufacturing-30s.html','manufacturing-500-income.html','production-tech-career.html'],
    'maintenance-career.html':['production-tech-career.html','manufacturing-500-income.html','manufacturing-30s.html'],
    'machine-design-career.html':['production-tech-career.html','manufacturing-500-income.html','manufacturing-30s.html'],
    'electrical-design-career.html':['production-tech-career.html','manufacturing-500-income.html','manufacturing-30s.html'],
    'automotive-parts-career.html':['manufacturing-30s.html','manufacturing-500-income.html','production-tech-career.html'],
    'no-night-shift.html':['night-shift-hard.html','factory-quit.html','manufacturing-30s.html']
  };

  const coreCrossLinks = {
    'factory-quit.html':['night-shift-hard.html','manufacturing-other-industry.html','manufacturing-30s.html'],
    'night-shift-hard.html':['factory-quit.html','manufacturing-30s.html','manufacturing-500-income.html'],
    'manufacturing-30s.html':['manufacturing-500-income.html','production-tech-career.html','factory-quit.html'],
    'production-tech-career.html':['manufacturing-500-income.html','manufacturing-30s.html','quality-quit.html'],
    'quality-quit.html':['production-tech-career.html','manufacturing-30s.html','manufacturing-500-income.html'],
    'manufacturing-500-income.html':['manufacturing-30s.html','production-tech-career.html','quality-quit.html'],
    'manufacturing-other-industry.html':['factory-quit.html','manufacturing-30s.html','period-worker-next.html'],
    'period-worker-next.html':['manufacturing-30s.html','manufacturing-other-industry.html','factory-quit.html']
  };

  function addCoreGuideLinks(){
    if(!isArticlePath) return;

    // 記事一覧では、8本の中核記事を最上部に固定表示。
    if(currentFile === '' || currentFile === 'index.html'){
      const listContainer = document.querySelector('main .section .container');
      const grid = listContainer?.querySelector('.grid-3');
      if(listContainer && grid && !document.querySelector('[data-core-guide-hub]')){
        const hub = document.createElement('section');
        hub.className = 'core-guide-hub';
        hub.setAttribute('data-core-guide-hub','');
        hub.innerHTML = `<div class="core-guide-heading"><span class="eyebrow">まず読む8記事</span><h2>転職・年収・働き方の重要ガイド</h2><p>検索から来た人が判断しやすいよう、特に重要な8テーマをまとめています。</p></div><div class="core-guide-grid">${Object.entries(coreGuides).map(([file,item])=>`<a class="core-guide-card" href="${file}"><strong>${item.title}</strong><span>${item.reason}</span></a>`).join('')}</div>`;
        listContainer.insertBefore(hub, grid);
      }
      return;
    }

    const article = document.querySelector('.article-main');
    if(!article || document.querySelector('[data-core-links]')) return;
    let targets = clusterMap[currentFile] || coreCrossLinks[currentFile] || [];
    targets = targets.filter(file => file !== currentFile && coreGuides[file]).slice(0,3);
    if(!targets.length) return;

    const block = document.createElement('section');
    block.className = 'internal-link-hub';
    block.setAttribute('data-core-links','');
    block.innerHTML = `<div class="internal-link-head"><span class="eyebrow">次に読む</span><h2>この悩みに近い重要ガイド</h2><p>条件をもう一段具体化したい人向けの記事です。</p></div><div class="internal-link-grid">${targets.map(file=>{const item=coreGuides[file];return `<a class="internal-link-card" href="${file}"><strong>${item.title}</strong><span>${item.reason}</span><b>詳しく見る →</b></a>`;}).join('')}</div>`;
    article.appendChild(block);
  }
  addCoreGuideLinks();

  const ctaLinks = document.querySelectorAll('[data-affiliate-link]');
  ctaLinks.forEach(link=>{
    const url = window.SITE_CONFIG?.affiliateUrl || '';
    if(url){
      link.href = url;
      link.target = '_blank';
      link.rel = 'sponsored nofollow noopener';
    }else{
      link.href = isArticlePath ? '../diagnosis.html' : 'diagnosis.html';
      link.removeAttribute('target');
      link.removeAttribute('rel');
      if(link.dataset.fallbackText) link.textContent = link.dataset.fallbackText;
    }
  });
})();
