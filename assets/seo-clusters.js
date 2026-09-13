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

  const supportMeta={
    'factory-human-relations.html':['工場の人間関係がきつい','異動・同業転職・異業種を比較'],
    'factory-resignation-reasons.html':['工場を辞める理由の整理','退職理由を面接につなげる'],
    'factory-no-future.html':['工場勤務の将来性が不安','残るか転職するかを比較'],
    'factory-body-hard.html':['工場勤務が体力的にきつい','負担の原因と働き方を整理'],
    'factory-two-shift-hard.html':['2交替勤務がきつい','勤務サイクルと転職条件を確認'],
    'factory-three-shift-hard.html':['3交替勤務がきつい','深夜帯・休日・年収を比較'],
    'factory-fixed-night-shift.html':['夜勤専属を辞めたい','夜勤手当と日勤転職を比較'],
    'factory-day-shift-salary-drop.html':['日勤転職で年収は下がる？','夜勤手当を外して比較'],
    'factory-night-to-day.html':['夜勤から日勤へ転職','年収差と求人の見方を整理'],
    'factory-basic-salary-low.html':['工場の基本給が低い','手当ではなく基本給を比較'],
    'factory-bonus-low.html':['工場のボーナスが少ない','賞与と基本給を分けて確認'],
    'factory-salary-up.html':['製造業で年収アップ','昇格・転職・専門性を比較'],
    'manufacturing-supervisor-career.html':['班長・リーダー経験を活かす','人数・品質・生産管理を具体化'],
    'plc-career.html':['PLC経験を活かす転職','ラダー・立上げ・制御経験を整理'],
    'production-tech-overseas-travel.html':['生産技術の出張が多い','立上げ・海外出張の負担を整理'],
    'electrical-design-career.html':['電気・制御設計の転職','PLC・回路・立上げ経験を整理'],
    'machine-design-career.html':['機械設計の転職','構想・詳細・量産まで整理'],
    'quality-claim-hard.html':['品質のクレーム対応がつらい','顧客対応を減らす選択肢を整理'],
    'quality-audit-hard.html':['品質監査がきつい','監査頻度・出張・役割を確認'],
    'quality-assurance-career.html':['品質保証の転職','監査・QMS・顧客品質を整理'],
    'inspection-career.html':['検査から転職','品質経験を次に活かす'],
    'quality-agent.html':['品質職の転職サービス選び','品質管理・品質保証の求人を比較'],
    'maintenance-qualification.html':['設備保全の資格と転職','資格と実務経験を分けて整理'],
    'factory-no-qualification-job-change.html':['資格なしで工場から転職','経験をどう言い換えるか整理'],
    'factory-job-change-no-experience.html':['工場から未経験職へ転職','未経験転職で残す強みを整理'],
    'factory-logistics-career.html':['工場内物流から転職','在庫・搬送・改善経験を活かす'],
    'cleanroom-career.html':['クリーンルーム勤務がきつい','環境負担と転職条件を整理'],
    'operator-quit.html':['機械オペレーターを辞めたい','設備経験を次の仕事へつなぐ'],
    'line-work-quit.html':['ライン作業を辞めたい','単純作業から次の経験へつなぐ'],
    'factory-white-company.html':['ホワイトな工場の見分け方','求人票と面接で条件を確認'],
    'factory-job-change-failure.html':['工場転職の失敗・後悔','入社前の見落としを減らす'],
    'factory-day-shift-job.html':['日勤のみ正社員求人','日勤固定か求人条件を確認'],
    'factory-weekend-work.html':['休日出勤が多い工場','頻度・代休・年収を比較'],
    'factory-transfer-relocation.html':['工場勤務で転勤したくない','勤務地と変更範囲を確認'],
    'factory-short-tenure-job-change.html':['工場を1年未満で辞めたい','短期離職の説明を準備'],
    'factory-high-school-graduate-job-change.html':['高卒の製造業転職','経験・資格・求人条件を整理'],
    'factory-temp-worker-job-change.html':['工場派遣から転職','正社員・同業・異業種を比較'],
    'factory-contract-worker-permanent.html':['契約社員から正社員へ','登用と転職を比較'],
    'production-tech-agent.html':['生産技術の転職サービス選び','設備・工程・改善経験で比較'],
    'factory-permanent-employee.html':['派遣・期間工から正社員へ','登用と他社転職を比較']
  };

  const supportGroups={
    'factory-quit.html':['factory-human-relations.html','factory-resignation-reasons.html','factory-no-future.html','factory-body-hard.html'],
    'night-shift-hard.html':['factory-two-shift-hard.html','factory-three-shift-hard.html','factory-fixed-night-shift.html','factory-day-shift-salary-drop.html','factory-night-to-day.html'],
    'manufacturing-30s.html':['manufacturing-supervisor-career.html','factory-high-school-graduate-job-change.html','factory-short-tenure-job-change.html'],
    'manufacturing-500-income.html':['factory-basic-salary-low.html','factory-bonus-low.html','factory-salary-up.html','manufacturing-supervisor-career.html','plc-career.html'],
    'production-tech-career.html':['plc-career.html','production-tech-overseas-travel.html','electrical-design-career.html','machine-design-career.html'],
    'quality-quit.html':['quality-claim-hard.html','quality-audit-hard.html','quality-assurance-career.html','inspection-career.html','quality-agent.html'],
    'maintenance-career.html':['maintenance-qualification.html','plc-career.html','electrical-design-career.html'],
    'manufacturing-other-industry.html':['factory-no-qualification-job-change.html','factory-job-change-no-experience.html','factory-logistics-career.html','cleanroom-career.html','operator-quit.html','line-work-quit.html'],
    'factory-job-offer-check.html':['factory-white-company.html','factory-job-change-failure.html','factory-day-shift-job.html','factory-weekend-work.html','factory-transfer-relocation.html'],
    'factory-resume.html':['factory-short-tenure-job-change.html','factory-high-school-graduate-job-change.html','factory-temp-worker-job-change.html','factory-contract-worker-permanent.html','manufacturing-supervisor-career.html'],
    'factory-interview.html':['factory-short-tenure-job-change.html','factory-resignation-reasons.html','factory-job-change-failure.html','factory-white-company.html'],
    'manufacturing-agent-guide.html':['production-tech-agent.html','quality-agent.html','factory-day-shift-job.html','factory-permanent-employee.html']
  };

  const css=`
    .seo-priority-hub{margin:34px 0;padding:22px;border:1px solid #a7f3d0;border-radius:20px;background:linear-gradient(135deg,#f0fdf4,#f8fafc)}
    .seo-priority-hub h2{margin:4px 0 8px}.seo-priority-hub>p{margin-top:0;color:#475569}
    .seo-priority-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
    .seo-priority-card{display:grid;gap:5px;padding:16px;border:1px solid #dfe5ec;border-radius:14px;background:#fff;text-decoration:none}
    .seo-priority-card strong{color:#172033}.seo-priority-card span{color:#64748b;font-size:13px;font-weight:400}.seo-priority-card b{color:#0f766e;font-size:13px}
    .seo-support-hub{margin:30px 0;padding:20px;border:1px solid #dfe5ec;border-radius:18px;background:#fff}
    @media(max-width:820px){.seo-priority-grid{grid-template-columns:1fr}}
  `;
  if(!document.querySelector('[data-seo-cluster-style]')){
    const style=document.createElement('style');style.dataset.seoClusterStyle='';style.textContent=css;document.head.appendChild(style);
  }

  function makePillarCards(files){
    return files.filter(f=>pillars[f]).map(f=>{
      const p=pillars[f];
      return `<a class="seo-priority-card" href="${f}" data-seo-pillar-link="${f}"><strong>${p.title}</strong><span>${p.reason}</span><b>重要ガイドへ →</b></a>`;
    }).join('');
  }
  function makeSupportCards(files){
    return files.filter(f=>supportMeta[f]).map(f=>{
      const [title,reason]=supportMeta[f];
      return `<a class="seo-priority-card" href="${f}" data-seo-support-link="${f}"><strong>${title}</strong><span>${reason}</span><b>詳しく見る →</b></a>`;
    }).join('');
  }

  if(currentFile===''||currentFile==='index.html'){
    const container=document.querySelector('main .section .container');
    if(container&&!document.querySelector('[data-seo-priority-hub]')){
      const hub=document.createElement('section');hub.className='seo-priority-hub';hub.dataset.seoPriorityHub='';
      hub.innerHTML=`<span class="eyebrow">PRIORITY GUIDES</span><h2>まず押さえたい重要12ガイド</h2><p>働き方・年収・技術職・応募準備・転職サービスまで、サイト内の中心になる記事です。</p><div class="seo-priority-grid">${makePillarCards(Object.keys(pillars))}</div>`;
      const newGuides=container.querySelector('.new-guides');
      const core=container.querySelector('.core-guide-hub');
      if(newGuides) container.insertBefore(hub,newGuides); else if(core) core.insertAdjacentElement('afterend',hub); else container.prepend(hub);
    }
    return;
  }

  const article=document.querySelector('.article-main');
  if(!article) return;
  const targets=(clusterMap[currentFile]||pillarCross[currentFile]||[]).filter(f=>f!==currentFile&&pillars[f]).slice(0,3);
  if(targets.length&&!document.querySelector('[data-seo-cluster-links]')){
    const block=document.createElement('section');block.className='seo-priority-hub';block.dataset.seoClusterLinks='';
    block.innerHTML=`<span class="eyebrow">関連する重要ガイド</span><h2>次に確認したい3記事</h2><p>このテーマと関係が深い中核記事へつないでいます。</p><div class="seo-priority-grid">${makePillarCards(targets)}</div>`;
    const service=article.querySelector('[data-service-bridge]');
    const existing=article.querySelector('[data-core-links]');
    if(service) article.insertBefore(block,service); else if(existing) article.insertBefore(block,existing); else article.appendChild(block);
  }

  const supports=(supportGroups[currentFile]||[]).filter(f=>f!==currentFile&&supportMeta[f]).slice(0,6);
  if(supports.length&&!document.querySelector('[data-seo-support-links]')){
    const deep=document.createElement('section');deep.className='seo-support-hub';deep.dataset.seoSupportLinks='';
    deep.innerHTML=`<span class="eyebrow">このテーマを深掘り</span><h2>具体的な悩み・条件から読む</h2><p>中核記事と検索意図の細かいガイドを相互につないでいます。</p><div class="seo-priority-grid">${makeSupportCards(supports)}</div>`;
    const cluster=article.querySelector('[data-seo-cluster-links]');
    if(cluster) cluster.insertAdjacentElement('afterend',deep); else article.appendChild(deep);
  }

  document.addEventListener('click',e=>{
    const pillar=e.target.closest('[data-seo-pillar-link]');
    if(pillar) window.trackSiteEvent?.('seo_pillar_click',{from_page:path,to_article:pillar.dataset.seoPillarLink});
    const support=e.target.closest('[data-seo-support-link]');
    if(support) window.trackSiteEvent?.('seo_support_click',{from_page:path,to_article:support.dataset.seoSupportLink});
  });
})();
