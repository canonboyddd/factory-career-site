(() => {
  const path = window.location.pathname;
  const isArticlePath = path.includes('/articles/');
  const isToolPath = path.includes('/tools/');
  const currentFile = path.split('/').pop() || '';
  const rootPrefix = (isArticlePath || isToolPath) ? '../' : '';

  const menu = document.querySelector('.menu-btn');
  const nav = document.querySelector('nav');
  if(menu && nav){ menu.addEventListener('click',()=>nav.classList.toggle('open')); }
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

  // 古い記事でもconfigを自動ロードし、後からGA4を設定するだけで全ページ計測可能にする。
  function ensureConfig(done){
    if(window.SITE_CONFIG){ done(); return; }
    const s=document.createElement('script');
    s.src=rootPrefix+'assets/config.js';
    s.onload=done;
    s.onerror=()=>done();
    document.head.appendChild(s);
  }

  window.trackSiteEvent = window.trackSiteEvent || function(name, params={}){
    window.dataLayer = window.dataLayer || [];
    if(typeof window.gtag === 'function') window.gtag('event', name, params);
    else window.dataLayer.push({event:name,...params});
  };

  function initAnalytics(){
    const id=String(window.SITE_CONFIG?.analytics?.ga4MeasurementId||'').trim();
    if(!/^G-[A-Z0-9]+$/i.test(id) || document.querySelector('[data-site-ga4]')) return;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){dataLayer.push(arguments);};
    window.gtag('js',new Date());
    window.gtag('config',id,{anonymize_ip:true});
    const s=document.createElement('script');
    s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);s.dataset.siteGa4='';
    document.head.appendChild(s);
  }
  ensureConfig(initAnalytics);

  // 全ページから記事一覧・無料ツールへ行ける導線を確保。
  if(nav && !nav.querySelector('[data-tools-nav]')){
    const a=document.createElement('a');
    a.href=rootPrefix+'tools/';a.textContent='無料ツール';a.dataset.toolsNav='';nav.appendChild(a);
  }

  // ホームに無料ツール導線を自動挿入。
  const faqSection=[...document.querySelectorAll('.section')].find(s=>s.querySelector('.faq-list'));
  if(faqSection && !document.querySelector('[data-tool-home]')){
    const sec=document.createElement('section');
    sec.className='section';sec.dataset.toolHome='';
    sec.innerHTML=`<div class="container"><div class="section-head"><div><span class="eyebrow">FREE TOOLS</span><h2>求人を見る前に数字で比較</h2></div><p>登録不要。入力内容はブラウザ内だけで計算します。</p></div><div class="grid-2"><a class="card" href="tools/salary-compare.html"><div class="icon">💴</div><h3>年収・手当依存度チェック →</h3><p>基本給・賞与・夜勤・残業を分けて、今の年収の中身を整理。</p></a><a class="card" href="tools/job-offer-score.html"><div class="icon">📋</div><h3>求人条件スコア比較 →</h3><p>年収・夜勤・残業・休日・通勤・仕事内容を同じ基準で比較。</p></a></div></div>`;
    faqSection.parentNode.insertBefore(sec,faqSection);
  }

  const articleSection = document.querySelector('#articles .container');
  if(articleSection && !document.querySelector('[data-all-guides-link]')){
    const row=document.createElement('div');row.className='cta-row';row.style.marginTop='28px';row.dataset.allGuidesLink='';
    row.innerHTML='<a class="btn btn-secondary" href="articles/">製造業・工場勤務の記事をすべて見る →</a>';
    articleSection.appendChild(row);
  }

  const coreGuides = {
    'factory-quit.html': {title:'工場勤務を辞めたい人の判断軸',reason:'辞めたい原因と転職条件を整理'},
    'night-shift-hard.html': {title:'夜勤がきつい・辞めたい人の転職条件',reason:'夜勤から日勤へ移る条件を整理'},
    'manufacturing-30s.html': {title:'製造業30代の転職で強みになる経験',reason:'経験の棚卸しと市場価値を整理'},
    'production-tech-career.html': {title:'生産技術の転職で見るべき条件',reason:'仕事内容・年収・働き方を比較'},
    'quality-quit.html': {title:'品質管理を辞めたい人の転職先',reason:'品質経験を活かす転職先を整理'},
    'manufacturing-500-income.html': {title:'製造業で年収500万円を目指す条件',reason:'年収アップの求人条件を比較'},
    'manufacturing-other-industry.html': {title:'製造業から異業種へ転職する方法',reason:'異業種で活かせる経験を整理'},
    'period-worker-next.html': {title:'期間工のその後に選べる4つの進路',reason:'正社員・メーカー転職・異業種を比較'}
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
    'no-night-shift.html':['night-shift-hard.html','factory-quit.html','manufacturing-30s.html'],
    'manufacturing-agent-guide.html':['manufacturing-30s.html','production-tech-career.html','manufacturing-500-income.html'],
    'production-tech-agent.html':['production-tech-career.html','manufacturing-500-income.html','manufacturing-30s.html'],
    'quality-agent.html':['quality-quit.html','manufacturing-500-income.html','manufacturing-30s.html'],
    'factory-job-offer-check.html':['factory-quit.html','manufacturing-500-income.html','night-shift-hard.html'],
    'factory-resume.html':['manufacturing-30s.html','production-tech-career.html','quality-quit.html'],
    'factory-interview.html':['manufacturing-30s.html','factory-quit.html','production-tech-career.html']
  };
  const coreCrossLinks={
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
    if(currentFile===''||currentFile==='index.html'){
      const listContainer=document.querySelector('main .section .container');const grid=listContainer?.querySelector('.grid-3');
      if(listContainer&&grid&&!document.querySelector('[data-core-guide-hub]')){
        const hub=document.createElement('section');hub.className='core-guide-hub';hub.dataset.coreGuideHub='';
        hub.innerHTML=`<div class="core-guide-heading"><span class="eyebrow">まず読む8記事</span><h2>転職・年収・働き方の重要ガイド</h2><p>特に成約につながりやすい悩みを、判断しやすい8テーマにまとめています。</p></div><div class="core-guide-grid">${Object.entries(coreGuides).map(([file,item])=>`<a class="core-guide-card" href="${file}"><strong>${item.title}</strong><span>${item.reason}</span></a>`).join('')}</div>`;
        listContainer.insertBefore(hub,grid);
      }return;
    }
    const article=document.querySelector('.article-main');if(!article||document.querySelector('[data-core-links]')) return;
    let targets=(clusterMap[currentFile]||coreCrossLinks[currentFile]||[]).filter(f=>f!==currentFile&&coreGuides[f]).slice(0,3);
    if(!targets.length)return;
    const block=document.createElement('section');block.className='internal-link-hub';block.dataset.coreLinks='';
    block.innerHTML=`<div class="internal-link-head"><span class="eyebrow">次に読む</span><h2>この悩みに近い重要ガイド</h2><p>条件をもう一段具体化したい人向けです。</p></div><div class="internal-link-grid">${targets.map(file=>{const item=coreGuides[file];return `<a class="internal-link-card" href="${file}" data-core-link="${file}"><strong>${item.title}</strong><span>${item.reason}</span><b>詳しく見る →</b></a>`;}).join('')}</div>`;
    article.appendChild(block);
  }
  addCoreGuideLinks();

  document.addEventListener('click',e=>{
    const core=e.target.closest('[data-core-link]');if(core) window.trackSiteEvent('core_article_click',{from_page:path,to_article:core.dataset.coreLink});
    const diag=e.target.closest('a[href*="diagnosis.html"]');if(diag) window.trackSiteEvent('diagnosis_link_click',{from_page:path});
    const tool=e.target.closest('a[href*="tools/"]');if(tool) window.trackSiteEvent('tool_link_click',{from_page:path,to_url:tool.getAttribute('href')});
  });

  document.querySelectorAll('[data-affiliate-link]').forEach(link=>{
    ensureConfig(()=>{
      const url=window.SITE_CONFIG?.affiliateUrl||'';
      if(url){link.href=url;link.target='_blank';link.rel='sponsored nofollow noopener';}
      else{link.href=rootPrefix+'diagnosis.html';link.removeAttribute('target');link.removeAttribute('rel');if(link.dataset.fallbackText)link.textContent=link.dataset.fallbackText;}
    });
  });
})();
