(() => {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function addFaqSchema(items, id) {
    if (!items.length || document.getElementById(id)) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(([q,a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a }
      }))
    });
    document.head.appendChild(script);
  }

  function enhanceGuide() {
    if (path !== '/job-change-guide') return;
    const main = document.querySelector('main .container');
    if (!main || main.querySelector('[data-job-difficulty-intent]')) return;

    const desc = '工場・製造業への転職は難しいのかを、未経験・正社員・20代〜50代・職種別に整理。求人条件、年収、職務経歴書、面接、転職サービスまで順番に確認できます。';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = desc;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = desc;

    const section = document.createElement('section');
    section.className = 'card';
    section.dataset.jobDifficultyIntent = '';
    section.style.marginTop = '28px';
    section.innerHTML = `
      <span class="eyebrow">転職難易度を先に確認</span>
      <h2>工場・製造業への転職は難しい？未経験・正社員・年代別に整理</h2>
      <p>「工場へ転職したい」「製造業へ転職したい」と思っても、難易度は年齢だけで決まりません。未経験か経験者か、正社員を目指すのか、現場職か技術職かで見るポイントが変わります。</p>
      <div class="grid-2">
        <div><strong>未経験</strong><p>仕事内容・教育体制・必要資格を確認。未経験可でも配属工程や夜勤の有無まで見ます。</p><p><a href="/articles/factory-job-change-no-experience">工場から未経験職へ転職する方法 →</a></p></div>
        <div><strong>資格なし</strong><p>資格がなくても応募できる求人はあります。資格より担当工程・安全・品質・改善経験が評価材料になる場合があります。</p><p><a href="/articles/factory-no-qualification-job-change">資格なしの工場転職 →</a></p></div>
        <div><strong>正社員</strong><p>雇用形態だけでなく基本給、賞与、夜勤、配属、転勤、試用期間まで同じ表で比較します。</p><p><a href="/articles/factory-permanent-employee">工場で正社員を目指す →</a></p></div>
        <div><strong>年代別</strong><p>20代は伸びしろ、30代は改善・教育、40代以降は専門性・リーダー経験など、説明する強みが変わります。</p><p><a href="/articles/manufacturing-job-change-age">製造業の転職は何歳まで？ →</a></p></div>
      </div>
      <div class="answer-box" style="margin-top:18px"><strong>求人を見る前の順番</strong><ol><li>変えたい条件を3つに絞る</li><li>同職種・隣接職種・未経験職を分けて比較する</li><li>求人票で基本給・夜勤・休日・配属・転勤を確認する</li><li>経験を職務経歴書と面接で言語化する</li></ol></div>
    `;

    const steps = main.querySelector('.steps');
    if (steps) steps.insertAdjacentElement('beforebegin', section);
    else main.appendChild(section);

    const faq = [
      ['工場への転職は未経験だと難しい？', '未経験可の求人はありますが、担当工程、教育体制、勤務形態、必要資格を確認することが重要です。経験者向け求人とは比較軸を分けて探します。'],
      ['工場転職で正社員を目指すとき何を見る？', '基本給、賞与、夜勤、年間休日、配属、転勤、試用期間、仕事内容の変更範囲を同じ基準で比較します。'],
      ['製造業の転職は何歳まで可能？', '年齢だけで一律には決まりません。年代が上がるほど、担当工程、改善、教育、品質、安全、専門技術、リーダー経験など具体的な経験の説明が重要になります。'],
      ['工場からの転職先はどこが多い？', '同業他社の製造職に加え、品質、生産管理、生産技術、設備保全、物流など、製造経験を活かせる隣接職種があります。']
    ];
    addFaqSchema(faq, 'job-change-guide-serp-faq');
  }

  function enhanceQuit() {
    if (!/^\/articles\/factory-quit(?:\.html)?$/.test(path)) return;
    const article = document.querySelector('.article-main');
    if (!article || article.querySelector('[data-quit-amai-intent]')) return;

    const section = document.createElement('section');
    section.className = 'card';
    section.dataset.quitAmaiIntent = '';
    section.style.margin = '26px 0';
    section.innerHTML = `
      <span class="eyebrow">よくある迷い</span>
      <h2>工場勤務を辞めたいのは甘え？判断は「つらさの原因」で分ける</h2>
      <p>辞めたいと感じることだけで、甘えかどうかを決めることはできません。夜勤・長時間労働・人間関係・体力負担など、会社を変えれば改善しやすい問題と、仕事内容そのものが合わない問題を分ける方が実用的です。</p>
      <div class="grid-2">
        <div><strong>会社を変える余地が大きい</strong><p>夜勤回数、残業、給与、人間関係、通勤、休日などが主因。</p></div>
        <div><strong>職種変更も比較する</strong><p>単調作業、重量物、ライン作業など仕事内容そのものが主因。</p></div>
      </div>
      <p><a href="/articles/factory-resignation-reasons">工場を辞める理由の整理 →</a> ・ <a href="/articles/factory-job-change-failure">工場転職で失敗しやすいパターン →</a></p>
    `;

    const anchor = article.querySelector('[data-core-intent-upgrade]') || article.querySelector('.answer-box');
    if (anchor) anchor.insertAdjacentElement('afterend', section);
    else article.prepend(section);

    addFaqSchema([
      ['工場勤務を辞めたいと思うのは甘えですか？', '一律には判断できません。夜勤、残業、人間関係、体力負担など原因を分け、会社変更で改善するか、職種変更まで必要かを比較する方が現実的です。']
    ], 'factory-quit-amai-faq');
  }

  function run() { enhanceGuide(); enhanceQuit(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
