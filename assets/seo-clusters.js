(() => {
  const path=window.location.pathname;
  const isArticle=path.includes('/articles/');
  const currentFile=path.split('/').pop()||'';
  if(!isArticle) return;

  const pillars={
    'factory-quit.html':{title:'工場勤務を辞めたい人の判断軸',reason:'辞めたい原因を分解し、残る・同業転職・異業種を比較'},
    'night-shift-hard.html':{title:'夜勤がきつい人の転職条件',reason:'夜勤・交替勤務から働き方を変える条件を整理'},
    'manufacturing-30s.html':{title:'製造業30代の転職',reason:'経験・役割・年収・働き方を棚卸し'},
    'manufacturing-500-income.html':{title:'製造業で年収500万円を目指す条件',reason:'基本給・手当・専門性から年収アップを比較'},
    'production-tech-career.html':{title:'生産技術の転職',reason:'設備・工程・改善・立ち上げ経験を次に活かす'},
    'quality-quit.html':{title:'品質管理を辞めたい人の転職先',reason:'品質経験を活かして役割・会社・職種を変える'},
    'maintenance-career.html':{title:'設備保全の転職',reason:'夜勤・呼び出し・技術領域・年収を比較'},
    'manufacturing-other-industry.html':{title:'製造業から異業種へ転職',reason:'製造経験を別業界でどう言い換えるか整理'},
    'factory-job-offer-check.html':{title:'工場・製造業の求人票の見方',reason:'基本給・夜勤・残業・休日・配属を確認'},
    'factory-resume.html':{title:'工場・製造業の職務経歴書',reason:'工程・設備・品質・改善経験を応募書類に落とす'},
    'factory-interview.html':{title:'工場・製造業の転職面接',reason:'退職理由・志望動機・逆質問を準備'},
    'manufacturing-agent-guide.html':{title:'製造業向け転職サービスの選び方',reason:'職種・年収・転職意欲でサービスを使い分ける'}
  };

  const clusterMap={
    // Newly added long-tail guides: every article sends relevance toward 2-3 selected pillars.
    'factory-two-shift-hard.html':['night-shift-hard.html','factory-quit.html','factory-job-offer-check.html'],
    'factory-three-shift-hard.html':['night-shift-hard.html','factory-quit.html','factory-job-offer-check.html'],
    'factory-fixed-night-shift.html':['night-shift-hard.html','manufacturing-500-income.html','factory-quit.html'],
    'factory-weekend-work.html':['factory-quit.html','factory-job-offer-check.html','manufacturing-500-income.html'],
    'factory-transfer-relocation.html':['factory-job-offer-check.html','factory-quit.html','manufacturing-other-industry.html'],
    'factory-basic-salary-low.html':['manufacturing-500-income.html','manufacturing-30s.html','manufacturing-agent-guide.html'],
    'factory-day-shift-salary-drop.html':['night-shift-hard.html','manufacturing-500-income.html','factory-job-offer-check.html'],
    'factory-temp-worker-job-change.html':['factory-resume.html','manufacturing-agent-guide.html','manufacturing-other-industry.html'],
    'factory-contract-worker-permanent.html':['factory-resume.html','factory-job-offer-check.html','manufacturing-agent-guide.html'],
    'factory-no-qualification-job-change.html':['manufacturing-other-industry.html','factory-resume.html','manufacturing-agent-guide.html'],
    'factory-high-school-graduate-job-change.html':['manufacturing-agent-guide.html','factory-resume.html','manufacturing-other-industry.html'],
    'factory-short-tenure-job-change.html':['factory-resume.html','factory-interview.html','factory-quit.html'],
    'factory-job-change-no-experience.html':['manufacturing-other-industry.html','factory-resume.html','factory-interview.html'],
    'welding-career.html':['manufacturing-agent-guide.html','factory-resume.html','manufacturing-500-income.html'],
    'machining-career.html':['manufacturing-agent-guide.html','factory-resume.html','manufacturing-500-income.html'],
    'cleanroom-career.html':['factory-quit.html','manufacturing-other-industry.html','manufacturing-agent-guide.html'],
    'factory-logistics-career.html':['manufacturing-other-industry.html','factory-resume.html','manufacturing-agent-guide.html'],
    'manufacturing-supervisor-career.html':['manufacturing-500-income.html','manufacturing-30s.html','manufacturing-agent-guide.html'],
    'production-tech-overseas-travel.html':['production-tech-career.html','manufacturing-500-income.html','manufacturing-agent-guide.html'],
    'maintenance-qualification.html':['maintenance-career.html','manufacturing-500-income.html','factory-resume.html'],
    'quality-claim-hard.html':['quality-quit.html','factory-quit.html','manufacturing-agent-guide.html'],
    'quality-audit-hard.html':['quality-quit.html','factory-job-offer-check.html','manufacturing-agent-guide.html'],
    'production-control-overtime.html':['factory-quit.html','manufacturing-500-income.html','manufacturing-agent-guide.html'],
    'plc-career.html':['production-tech-career.html','maintenance-career.html','manufacturing-500-income.html'],

    // Existing supporting guides: concentrate their internal equity toward the same pillars.
    'factory-human-relations.html':['factory-quit.html','manufacturing-other-industry.html','factory-interview.html'],
    'factory-resignation-reasons.html':['factory-quit.html','factory-interview.html','factory-resume.html'],
    'factory-no-future.html':['factory-quit.html','manufacturing-other-industry.html','manufacturing-agent-guide.html'],
    'factory-body-hard.html':['factory-quit.html','night-shift-hard.html','manufacturing-other-industry.html'],
    'factory-overtime.html':['factory-quit.html','manufacturing-500-income.html','factory-job-offer-check.html'],
    'factory-holidays.html':['factory-quit.html','night-shift-hard.html','factory-job-offer-check.html'],
    'factory-night-to-day.html':['night-shift-hard.html','manufacturing-500-income.html','factory-job-offer-check.html'],
    'factory-shift-change.html':['night-shift-hard.html','factory-quit.html','factory-job-offer-check.html'],
    'factory-commute-long.html':['factory-quit.html','factory-job-offer-check.html','manufacturing-agent-guide.html'],
    'factory-small-company.html':['manufacturing-30s.html','manufacturing-500-income.html','manufacturing-agent-guide.html'],
    'low-salary.html':['manufacturing-500-income.html','manufacturing-30s.html','manufacturing-agent-guide.html'],
    'factory-bonus-low.html':['manufacturing-500-income.html','factory-job-offer-check.html','manufacturing-agent-guide.html'],
    'manufacturing-20s.html':['manufacturing-other-industry.html','factory-resume.html','manufacturing-agent-guide.html'],
    'manufacturing-40s.html':['manufacturing-30s.html','manufacturing-500-income.html','factory-resume.html'],
    'manufacturing-50s.html':['factory-resume.html','manufacturing-agent-guide.html','factory-job-offer-check.html'],
    'operator-quit.html':['factory-quit.html','manufacturing-other-industry.html','factory-resume.html'],
    'line-work-quit.html':['factory-quit.html','manufacturing-other-industry.html','factory-resume.html'],
    'assembly-career.html':['manufacturing-30s.html','factory-resume.html','manufacturing-agent-guide.html'],
    'inspection-career.html':['quality-quit.html','factory-resume.html','manufacturing-agent-guide.html'],
    'quality-assurance-career.html':['quality-quit.html','factory-resume.html','manufacturing-agent-guide.html'],
    'production-control-career.html':['manufacturing-500-income.html','factory-resume.html','manufacturing-agent-guide.html'],
    'machine-design-career.html':['manufacturing-500-income.html','factory-resume.html','manufacturing-agent-guide.html'],
    'electrical-design-career.html':['production-tech-career.html','manufacturing-500-income.html','manufacturing-agent-guide.html'],
    'automotive-parts-career.html':['manufacturing-30s.html','manufacturing-500-income.html','manufacturing-agent-guide.html'],
    'no-night-shift.html':['night-shift-hard.html','factory-job-offer-check.html','manufacturing-agent-guide.html'],
    'production-tech-agent.html':['production-tech-career.html','factory-resume.html','manufacturing-agent-guide.html'],
    'quality-agent.html':['quality-quit.html','factory-resume.html','manufacturing-agent-guide.html'],
    'factory-salary-up.html':['manufacturing-500-income.html','manufacturing-30s.html','manufacturing-agent-guide.html'],
    'factory-day-shift-job.html':['night-shift-hard.html','factory-job-offer-check.html','manufacturing-agent-guide.html'],
    'factory-permanent-employee.html':['factory-resume.html','factory-job-offer-check.html','manufacturing-agent-guide.html'],
    'manufacturing-job-change-age.html':['manufacturing-30s.html','factory-resume.html','manufacturing-agent-guide.html'],
    'factory-white-company.html':['factory-job-offer-check.html','factory-interview.html','manufacturing-agent-guide.html'],
    'factory-job-change-failure.html':['factory-job-offer-check.html','factory-interview.html','manufacturing-agent-guide.html']
  };

  const pillarCross={
    'factory-quit.html':['night-shift-hard.html','factory-job-offer-check.html','manufacturing-agent-guide.html'],
    'night-shift-hard.html':['factory-quit.html','manufacturing-500-income.html','factory-job-offer-check.html'],
    'manufacturing-30s.html':['manufacturing-500-income.html','factory-resume.html','manufacturing-agent-guide.html'],
    'manufacturing-500-income.html':['manufacturing-30s.html','production-tech-career.html','manufacturing-agent-guide.html'],
    'production-tech-career.html':['maintenance-career.html','factory-resume.html','manufacturing-agent-guide.html'],
    'quality-quit.html':['factory-resume.html','factory-interview.html','manufacturing-agent-guide.html'],
    'maintenance-career.html':['production-tech-career.html','manufacturing-500-income.html','manufacturing-agent-guide.html'],
    'manufacturing-other-industry.html':['factory-resume.html','factory-interview.html','manufacturing-agent-guide.html'],
    'factory-job-offer-check.html':['factory-interview.html','manufacturing-500-income.html','manufacturing-agent-guide.html'],
    'factory-resume.html':['factory-interview.html','manufacturing-30s.html','manufacturing-agent-guide.html'],
    'factory-interview.html':['factory-job-offer-check.html','factory-resume.html','manufacturing-agent-guide.html'],
    'manufacturing-agent-guide.html':['factory-job-offer-check.html','factory-resume.html','factory-interview.html']
  };

  const css=`
    .seo-priority-hub{margin:34px 0;padding:22px;border:1px solid #a7f3d0;border-radius:20px;background:linear-gradient(135deg,#f0fdf4,#f8fafc)}
    .seo-priority-hub h2{margin:4px 0 8px}.seo-priority-hub>p{margin-top:0;color:#475569}
    .seo-priority-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
    .seo-priority-card{display:grid;gap:5px;padding:16px;border:1px solid #dfe5ec;border-radius:14px;background:#fff;text-decoration:none}
    .seo-priority-card strong{color:#172033}.seo-priority-card span{color:#64748b;font-size:13px;font-weight:400}.seo-priority-card b{color:#0f766e;font-size:13px}
    @media(max-width:820px){.seo-priority-grid{grid-template-columns:1fr}}
  `;
  if(!document.querySelector('[data-seo-cluster-style]')){
    const style=document.createElement('style');style.dataset.seoClusterStyle='';style.textContent=css;document.head.appendChild(style);
  }

  function makeCards(files){
    return files.filter(f=>pillars[f]).map(f=>{
      const p=pillars[f];
      return `<a class="seo-priority-card" href="${f}" data-seo-pillar-link="${f}"><strong>${p.title}</strong><span>${p.reason}</span><b>重要ガイドへ →</b></a>`;
    }).join('');
  }

  // Article hub: place the 12 pages we want Google and users to reach most easily near the top.
  if(currentFile===''||currentFile==='index.html'){
    const container=document.querySelector('main .section .container');
    if(container&&!document.querySelector('[data-seo-priority-hub]')){
      const hub=document.createElement('section');hub.className='seo-priority-hub';hub.dataset.seoPriorityHub='';
      hub.innerHTML=`<span class="eyebrow">PRIORITY GUIDES</span><h2>まず押さえたい重要12ガイド</h2><p>働き方・年収・技術職・応募準備・転職サービスまで、サイト内の中心になる記事です。</p><div class="seo-priority-grid">${makeCards(Object.keys(pillars))}</div>`;
      const newGuides=container.querySelector('.new-guides');
      const core=container.querySelector('.core-guide-hub');
      if(newGuides) container.insertBefore(hub,newGuides); else if(core) core.insertAdjacentElement('afterend',hub); else container.prepend(hub);
    }
    return;
  }

  const article=document.querySelector('.article-main');
  if(!article||document.querySelector('[data-seo-cluster-links]')) return;
  const targets=(clusterMap[currentFile]||pillarCross[currentFile]||[]).filter(f=>f!==currentFile&&pillars[f]).slice(0,3);
  if(!targets.length) return;

  const block=document.createElement('section');block.className='seo-priority-hub';block.dataset.seoClusterLinks='';
  block.innerHTML=`<span class="eyebrow">関連する重要ガイド</span><h2>次に確認したい3記事</h2><p>このテーマと関係が深い中核記事へつないでいます。</p><div class="seo-priority-grid">${makeCards(targets)}</div>`;
  const service=article.querySelector('[data-service-bridge]');
  const existing=article.querySelector('[data-core-links]');
  if(service) article.insertBefore(block,service); else if(existing) article.insertBefore(block,existing); else article.appendChild(block);

  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-seo-pillar-link]');
    if(link) window.trackSiteEvent?.('seo_pillar_click',{from_page:path,to_article:link.dataset.seoPillarLink});
  });
})();
