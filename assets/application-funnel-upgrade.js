(() => {
  const slug = location.pathname.replace(/\/+$/, '').split('/').pop()?.replace(/\.html$/i, '') || '';
  const targets = new Set(['factory-job-offer-check','factory-resume','factory-interview','manufacturing-agent-guide']);
  if (!targets.has(slug)) return;
  const article = document.querySelector('.article-main');
  if (!article) return;

  const track = (event, meta = {}) => window.trackSiteEvent?.(event, { from_page: location.pathname, ...meta });
  const steps = [
    ['求人票を確認','/articles/factory-job-offer-check','給与・夜勤・休日・配属・変更範囲を確認'],
    ['職務経歴書を作る','/articles/factory-resume','製品・工程・設備・改善・安全・教育を具体化'],
    ['面接を準備','/articles/factory-interview','志望動機・退職理由・経験・逆質問を同じ転職軸で整理'],
    ['サービスを比較','/articles/manufacturing-agent-guide','職種・経験・年収・勤務地に合う支援を使い分け']
  ];

  if (!article.querySelector('[data-application-funnel]')) {
    const nav = document.createElement('section');
    nav.className = 'application-funnel';
    nav.dataset.applicationFunnel = '';
    nav.innerHTML = `<span class="eyebrow">応募準備4ステップ</span><h2>求人を見つけてから応募・面接までを順番に進める</h2><p>転職活動は各作業を別々に進めるより、同じ求人条件・経験・転職軸を使ってつなげると矛盾を減らせます。</p><div class="application-funnel-grid">${steps.map((s,i)=>`<a class="application-step${s[1].includes(slug)?' is-current':''}" href="${s[1]}" data-funnel-step="${i+1}"><strong>STEP ${i+1}<br>${s[0]}</strong><span>${s[2]}</span></a>`).join('')}</div>`;
    const lead = article.querySelector('.article-lead');
    const answer = article.querySelector('.answer-box');
    if (answer) answer.insertAdjacentElement('afterend', nav); else if (lead) lead.insertAdjacentElement('afterend', nav); else article.prepend(nav);
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => track('application_funnel_click', { step: a.dataset.funnelStep, to: a.getAttribute('href') })));
  }

  const insertAfterLeadOrAnswer = section => {
    const existingFunnel = article.querySelector('[data-application-funnel]');
    if (existingFunnel) existingFunnel.insertAdjacentElement('afterend', section);
    else (article.querySelector('.answer-box') || article.querySelector('.article-lead'))?.insertAdjacentElement('afterend', section);
  };

  if (slug === 'factory-job-offer-check' && !article.querySelector('[data-offer-redflags-upgrade]')) {
    const s = document.createElement('section');
    s.className = 'core-intent-upgrade'; s.dataset.offerRedflagsUpgrade = '';
    s.innerHTML = `<span class="eyebrow">応募前の見落とし防止</span><h2>求人票の「良さそうな言葉」は数字と運用に置き換える</h2><div class="core-intent-table-wrap"><table class="core-intent-table"><tbody>
      <tr><th>未経験歓迎</th><td>教育期間・配属先・独り立ちまでの流れ</td><td>誰でも同じ仕事か、経験で配属が変わるか確認</td></tr>
      <tr><th>残業少なめ</th><td>通常月・繁忙期・設備トラブル時</td><td>月平均だけでなく幅を確認</td></tr>
      <tr><th>日勤中心</th><td>将来の交替勤務・応援・休日出勤</td><td>「中心」の例外条件を確認</td></tr>
      <tr><th>高収入</th><td>基本給・賞与・夜勤・残業・各種手当</td><td>変動手当を除いた年収も比較</td></tr>
      <tr><th>製造業務全般</th><td>工程・設備・製品・重量物・温度環境</td><td>1日の具体的な業務比率を確認</td></tr>
    </tbody></table></div><div class="core-intent-next"><strong>求人を絞ったら次は書類</strong><span>求人の必須・歓迎要件と、自分の経験が重なる部分を職務経歴書の前半へ置きます。</span><a href="/articles/factory-resume">工場・製造業の職務経歴書 →</a></div>`;
    insertAfterLeadOrAnswer(s);
  }

  if (slug === 'factory-resume' && !article.querySelector('[data-resume-example-upgrade]')) {
    const s = document.createElement('section');
    s.className = 'core-intent-upgrade'; s.dataset.resumeExampleUpgrade = '';
    s.innerHTML = `<span class="eyebrow">例文を自分の経験へ変換</span><h2>職種別：自己PRは「強み→行動→再現性」で作る</h2><div class="core-intent-table-wrap"><table class="core-intent-table"><tbody>
      <tr><th>製造・組立</th><td>安全・品質・正確性</td><td>手順遵守だけでなく、異常発見・段取り・改善まで具体化</td></tr>
      <tr><th>機械オペレーター</th><td>設備操作・条件確認・一次対応</td><td>扱った設備、点検、異常時の切り分け範囲を書く</td></tr>
      <tr><th>生産技術</th><td>設備導入・立上げ・改善</td><td>対象工程、使用技術、自分の担当範囲、成果をセットにする</td></tr>
      <tr><th>品質</th><td>解析・是正・再発防止</td><td>不良の種類、関係部署との調整、自分の役割を明確にする</td></tr>
      <tr><th>設備保全</th><td>故障対応・予防保全・改善</td><td>機械/電気/PLCなど担当領域と呼び出し・工事調整経験も整理</td></tr>
    </tbody></table></div><div class="core-intent-faq"><h3>書類でよく迷うポイント</h3>
      <details><summary>数字の実績がないと弱いですか？</summary><p>必須ではありません。根拠のない数字を作らず、担当範囲、改善前後の違い、再発防止や標準化など事実ベースで書く方が安全です。</p></details>
      <details><summary>資格やPCスキルはどこに書く？</summary><p>求人要件に関係する資格・CAD・PLC・測定器・Office等は、活かせる経験や資格欄で見つけやすく整理します。</p></details>
    </div><div class="core-intent-next"><strong>書類ができたら、同じ内容を面接用に60秒へ圧縮</strong><span>職務経歴書と面接回答を別物にせず、同じ経験を短く話せるようにします。</span><a href="/articles/factory-interview">工場・製造業の面接対策 →</a></div>`;
    insertAfterLeadOrAnswer(s);
  }

  if (slug === 'factory-interview' && !article.querySelector('[data-interview-question-upgrade]')) {
    const s = document.createElement('section');
    s.className = 'core-intent-upgrade'; s.dataset.interviewQuestionUpgrade = '';
    s.innerHTML = `<span class="eyebrow">よく聞かれる質問</span><h2>工場・製造業の面接で準備しておきたい8問</h2><div class="core-intent-table-wrap"><table class="core-intent-table"><tbody>
      <tr><th>1. 自己紹介</th><td>経験年数・製品・工程・強みを60秒で</td><td>求人に近い経験から話す</td></tr>
      <tr><th>2. 退職理由</th><td>事実→変えたい条件→次の職場</td><td>現職批判だけで終わらせない</td></tr>
      <tr><th>3. 志望動機</th><td>経験→求人との接点→次にしたいこと</td><td>会社名を変えても通る内容にしない</td></tr>
      <tr><th>4. 改善経験</th><td>状況→課題→行動→結果</td><td>自分の担当範囲を明確に</td></tr>
      <tr><th>5. ミス・不具合対応</th><td>報告・切り分け・再発防止</td><td>隠さず安全・品質を優先した流れを説明</td></tr>
      <tr><th>6. 安全意識</th><td>手順・KY・5S・異常時対応</td><td>実際に続けている行動で答える</td></tr>
      <tr><th>7. シフト・夜勤</th><td>求人条件と自分の希望を一致させる</td><td>曖昧にせず勤務可能範囲を確認</td></tr>
      <tr><th>8. 逆質問</th><td>配属・教育・繁忙期・期待役割</td><td>入社判断に必要な情報を聞く</td></tr>
    </tbody></table></div><div class="core-intent-next"><strong>面接後は「合否」より条件を再確認</strong><span>配属・勤務・年収・役割が求人票と一致しているかを記録し、複数社を同じ基準で比較します。</span><a href="/articles/manufacturing-agent-guide">転職サービスの使い分けも確認 →</a></div>`;
    insertAfterLeadOrAnswer(s);
  }

  if (slug === 'manufacturing-agent-guide' && !article.querySelector('[data-agent-comparison-upgrade]')) {
    const s = document.createElement('section');
    s.className = 'core-intent-upgrade'; s.dataset.agentComparisonUpgrade = '';
    s.innerHTML = `<span class="eyebrow">ランキングより先に適合性</span><h2>製造業向け転職サービスは「求人の多さ」だけで選ばない</h2><div class="core-intent-table-wrap"><table class="core-intent-table"><tbody>
      <tr><th>製造・組立・オペレーター</th><td>勤務地、雇用形態、夜勤、寮、休日</td><td>現場職を実際に扱っているか確認</td></tr>
      <tr><th>生産技術・設備・設計</th><td>担当技術、製品、年収帯、役割</td><td>専門経験を理解できる担当・求人があるか確認</td></tr>
      <tr><th>品質・生産管理</th><td>顧客対応、監査、改善、マネジメント</td><td>職種名だけでなく求人の業務範囲を比較</td></tr>
      <tr><th>異業種も検討</th><td>経験の言い換え、転用可能性</td><td>求人紹介型とキャリア整理型の役割を分ける</td></tr>
      <tr><th>年収アップ重視</th><td>基本給、賞与、役職、夜勤・残業依存</td><td>想定年収の中身まで比較</td></tr>
    </tbody></table></div><div class="core-intent-faq"><h3>複数サービスを使うとき</h3>
      <details><summary>何社くらい登録すべき？</summary><p>数を増やすこと自体が目的ではありません。製造業求人を見る役割、専門職求人を見る役割など目的を分け、管理できる範囲で比較してください。</p></details>
      <details><summary>紹介された求人はそのまま応募していい？</summary><p>最終的には求人票・面接・提示条件を自分でも確認し、年収・夜勤・休日・配属・勤務地を同じ基準で比較します。</p></details>
    </div><div class="core-intent-next"><strong>サービスへ登録する前に応募材料を揃える</strong><span>求人条件と職務経歴書が整理できていると、希望条件や経験を担当者へ伝えやすくなります。</span><a href="/articles/factory-job-offer-check">求人票チェックへ戻る →</a></div>`;
    insertAfterLeadOrAnswer(s);
  }

  if (!document.querySelector('style[data-application-funnel-style]')) {
    const style = document.createElement('style');
    style.dataset.applicationFunnelStyle = '';
    style.textContent = `.application-funnel{margin:26px 0;padding:22px;border:1px solid #cbd5e1;border-radius:18px;background:#f8fafc}.application-funnel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px}.application-step{display:grid;gap:7px;padding:14px;border:1px solid #dbe3ec;border-radius:14px;background:#fff;text-decoration:none;color:inherit}.application-step strong{color:#0f172a}.application-step span{font-size:.92rem;color:#475569}.application-step.is-current{border-color:#0f766e;background:#ecfdf5}.core-intent-upgrade{margin:26px 0;padding:22px;border:1px solid #cbd5e1;border-radius:18px;background:#f8fafc}.core-intent-table-wrap{overflow-x:auto;margin:16px 0}.core-intent-table{width:100%;border-collapse:collapse;background:#fff}.core-intent-table th,.core-intent-table td{padding:12px;border:1px solid #e2e8f0;text-align:left;vertical-align:top}.core-intent-table th{white-space:nowrap;background:#f1f5f9}.core-intent-next{display:grid;gap:5px;margin:16px 0;padding:16px;border-radius:14px;background:#ecfdf5}.core-intent-next a{font-weight:800}.core-intent-faq details{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:8px 0}.core-intent-faq summary{font-weight:800;cursor:pointer}@media(max-width:860px){.application-funnel-grid{grid-template-columns:1fr 1fr}}@media(max-width:620px){.application-funnel,.core-intent-upgrade{padding:16px}.application-funnel-grid{grid-template-columns:1fr}.core-intent-table{min-width:650px}}`;
    document.head.appendChild(style);
  }
})();
