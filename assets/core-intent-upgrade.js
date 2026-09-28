(() => {
  const slug = location.pathname.replace(/\/+$/, '').split('/').pop()?.replace(/\.html$/i, '') || '';
  const data = {
    'factory-quit': {
      eyebrow: '転職判断を比較',
      title: '「辞めるべきか」を3パターンで整理',
      rows: [
        ['会社だけ変える', '夜勤・給与・人間関係・通勤など会社固有の不満が中心', '同業他社・同職種の求人を比較'],
        ['職種を変える', '仕事内容や体力負担そのものが合わない', '品質・保全・生産管理など隣接職種も確認'],
        ['いったん残る', '配置転換・勤務変更で改善余地がある', '転職活動だけ始めて相場を確認']
      ],
      questions: [
        ['工場を辞めた後は何の仕事に転職しやすい？', '製造経験を活かすなら品質、設備保全、生産管理、生産技術などの隣接職種があります。異業種へ移る場合も、改善・安全・教育・品質対応などの経験を具体化すると説明しやすくなります。'],
        ['辞める前に転職先を決めるべき？', '生活費や空白期間を避けたい場合は、在職中に求人相場を確認して内定後に退職時期を決める方法が一般的です。']
      ]
    },
    'night-shift-hard': {
      eyebrow: '日勤転職の比較',
      title: '夜勤をやめる前に比べる4条件',
      rows: [
        ['年収', '夜勤手当・深夜割増がなくなった後の年収', '基本給・賞与・残業代を分けて比較'],
        ['勤務時間', '日勤固定か、早番・遅番が残るか', '実際の始終業時刻を確認'],
        ['仕事内容', '製造経験をそのまま使えるか', '日勤の品質・生産管理・技術職も比較'],
        ['休日', '年間休日だけでなく休日出勤・呼び出し', '実績や運用も面接で確認']
      ],
      questions: [
        ['夜勤から日勤へ転職すると年収は下がる？', '夜勤手当や深夜割増に依存している場合は下がる可能性があります。基本給・賞与・残業代を分けて比較すると影響を見積もりやすくなります。'],
        ['夜勤なしで製造経験を活かせる仕事は？', '品質管理、生産管理、生産技術、設計、日勤固定の製造職などが候補になります。求人ごとに勤務形態を確認してください。']
      ]
    },
    'manufacturing-30s': {
      eyebrow: '30代の転職戦略',
      title: '30代で評価されやすい経験を言語化',
      rows: [
        ['改善', '工数・不良・停止時間・歩留まり', '数字と自分の役割をセットで整理'],
        ['教育', '新人・後輩・班の教育経験', '人数・期間・標準化まで具体化'],
        ['設備・工程', '担当設備、工程、製品、立上げ', '扱える範囲とトラブル対応を整理'],
        ['リーダー', '班長・工程管理・安全・品質', '責任範囲と成果を説明']
      ],
      questions: [
        ['30代で未経験職へ転職するのは遅い？', '年齢だけで一律には決まりません。未経験職へ行く場合でも、改善・安全・教育・品質など転用できる経験を整理すると説明しやすくなります。'],
        ['30代の製造業転職で年収を下げないコツは？', '同職種・隣接職種を先に比較し、現在の経験が評価される求人を確認してから未経験職まで広げる方法があります。']
      ]
    },
    'manufacturing-500-income': {
      eyebrow: '年収500万円の中身',
      title: '同じ500万円でも働き方は違う',
      rows: [
        ['基本給中心', '基本給＋賞与で年収を作る', '長期的な昇給・賞与実績を確認'],
        ['夜勤中心', '夜勤手当・深夜割増の比重が高い', '夜勤回数と将来の働き方を確認'],
        ['残業中心', '残業代で年収が上がる', '月平均残業と繁忙期を確認'],
        ['専門職・役割', '技術・改善・管理責任で評価', '担当範囲と等級・役職を確認']
      ],
      questions: [
        ['製造業で年収500万円は狙える？', '職種、地域、経験、役割、夜勤や残業の有無で大きく変わります。想定年収だけでなく内訳を確認することが重要です。'],
        ['年収アップ転職で見るべき項目は？', '基本給、賞与実績、残業、夜勤、各種手当、昇給制度を分けて現職と比較します。']
      ]
    },
    'production-tech-career': {
      eyebrow: '生産技術の求人比較',
      title: '「生産技術」の中身を5項目で確認',
      rows: [
        ['工程', '組立・加工・物流・検査など', 'どの工程を担当するか'],
        ['設備', '自動機・ロボット・PLC・治具など', '内製範囲と外注範囲'],
        ['立上げ', '新設備・新製品・海外拠点', '頻度と出張期間'],
        ['改善', 'タクト・歩留まり・品質・省人化', '評価指標と裁量'],
        ['働き方', '夜間対応・休日対応・転勤', '実際の運用を確認']
      ],
      questions: [
        ['生産技術の転職で評価されやすい経験は？', '設備導入、工程改善、立上げ、自動化、不良改善、治具設計などを、対象設備と成果まで具体化すると説明しやすくなります。'],
        ['生産技術は会社によって仕事内容が違う？', '担当工程、設備の内製範囲、保全との分担、出張や立上げ頻度などが会社ごとに異なります。職種名だけで判断しないことが重要です。']
      ]
    },
    'quality-quit': {
      eyebrow: '品質職の転職先比較',
      title: '辞めたい原因別に次の職種を考える',
      rows: [
        ['顧客クレームがつらい', '顧客対応の比重が高い', '工程品質・検査・社内品質寄りを比較'],
        ['監査がつらい', 'QMS・規格対応の負担', '製造・生産技術・工程改善も比較'],
        ['検査量が多い', '人手不足・単純検査中心', '品質保証・工程品質へ役割変更'],
        ['品質自体が合わない', '原因解析・文書・調整が苦手', '製造・生産管理・技術職も検討']
      ],
      questions: [
        ['品質管理から転職しやすい職種は？', '品質保証、工程品質、生産技術、生産管理、製造技術など、原因解析や改善経験を活かせる隣接職種があります。'],
        ['品質管理を辞めたいとき職種を変えるべき？', '負担の原因が顧客対応や会社固有の運用なら、品質職のまま会社を変える選択肢もあります。']
      ]
    },
    'maintenance-career': {
      eyebrow: '設備保全の求人比較',
      title: '求人票だけでは見えにくい5項目',
      rows: [
        ['夜勤', '交替勤務・夜間待機の有無', '回数と勤務サイクル'],
        ['呼び出し', '休日・深夜の緊急対応', '当番制・頻度・手当'],
        ['担当設備', '機械・電気・PLC・ユーティリティ', '担当範囲と教育体制'],
        ['保全方針', '事後保全か予防・予知保全か', '改善活動の比率'],
        ['資格', '電気・保全・安全関連', '必須か入社後取得か']
      ],
      questions: [
        ['設備保全は夜勤や休日呼び出しが多い？', '工場の稼働形態や保全体制によって異なります。求人票だけで分からない場合は、面接で当番制・頻度・手当まで確認します。'],
        ['設備保全から転職するならどんな職種がある？', '生産技術、設備技術、サービスエンジニア、電気・制御系、設備管理など、機械・電気・PLC経験を活かせる職種があります。']
      ]
    }
  };

  const cfg = data[slug];
  if (!cfg) return;

  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const article = document.querySelector('.article-main');
  if (!article || article.querySelector('[data-core-intent-upgrade]')) return;

  const section = document.createElement('section');
  section.className = 'core-intent-upgrade';
  section.dataset.coreIntentUpgrade = '';
  section.innerHTML = `
    <span class="eyebrow">${esc(cfg.eyebrow)}</span>
    <h2>${esc(cfg.title)}</h2>
    <div class="core-intent-table-wrap"><table class="core-intent-table"><tbody>${cfg.rows.map(row => `<tr><th>${esc(row[0])}</th><td>${esc(row[1])}</td><td>${esc(row[2])}</td></tr>`).join('')}</tbody></table></div>
    <div class="core-intent-next"><strong>工場転職全体の進め方も確認</strong><span>求人比較・年収・職種・面接・転職サービスまで順番に整理できます。</span><a href="/job-change-guide" data-core-guide-cta>工場・製造業の転職完全ガイド →</a></div>
    <div class="core-intent-faq"><h3>関連するよくある質問</h3>${cfg.questions.map(([q,a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;

  const answer = article.querySelector('.answer-box');
  const lead = article.querySelector('.article-lead');
  if (answer) answer.insertAdjacentElement('afterend', section);
  else if (lead) lead.insertAdjacentElement('afterend', section);
  else article.insertBefore(section, article.firstChild);

  if (!document.querySelector('style[data-core-intent-style]')) {
    const style = document.createElement('style');
    style.dataset.coreIntentStyle = '';
    style.textContent = `.core-intent-upgrade{margin:26px 0;padding:22px;border:1px solid #99d8ca;border-radius:18px;background:linear-gradient(135deg,#f0fdfa,#fff)}.core-intent-upgrade h2{margin:6px 0 16px}.core-intent-table-wrap{overflow:auto}.core-intent-table{width:100%;border-collapse:collapse;background:#fff}.core-intent-table th,.core-intent-table td{padding:12px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}.core-intent-table th{min-width:120px;color:#115e59}.core-intent-next{display:grid;gap:6px;margin-top:16px;padding:16px;border-radius:14px;background:#ecfdf5}.core-intent-next a{font-weight:800;color:#0f766e}.core-intent-faq{margin-top:18px}.core-intent-faq details{padding:12px 0;border-top:1px solid #d1d5db}.core-intent-faq summary{font-weight:800;cursor:pointer}.core-intent-faq p{margin:8px 0 0}@media(max-width:640px){.core-intent-upgrade{padding:16px}.core-intent-table{min-width:620px}}`;
    document.head.appendChild(style);
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cfg.questions.map(([q,a]) => ({ '@type':'Question', name:q, acceptedAnswer:{ '@type':'Answer', text:a } }))
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.coreIntentFaq = slug;
  script.textContent = JSON.stringify(faq);
  document.head.appendChild(script);

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-core-guide-cta]');
    if (!a) return;
    window.trackSiteEvent?.('core_guide_click', { from_page: location.pathname, source: 'core_intent_upgrade' });
  });
})();
