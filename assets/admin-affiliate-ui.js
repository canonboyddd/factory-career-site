(() => {
  const host = document.getElementById('revenueIntelligence');
  const marker = document.getElementById('revenueMetricGrid');
  if (!host || !marker || document.getElementById('actualRevenueBlock')) return;

  const block = document.createElement('section');
  block.id = 'actualRevenueBlock';
  block.className = 'actual-revenue-block';
  block.innerHTML = `
    <div class="actual-revenue-heading">
      <div><span class="eyebrow">ACTUAL EARNINGS</span><h3>ASP実績金額</h3><p class="muted">楽天 / A8.net / AccessTradeの成果CSVをD1へ取り込み、発生報酬と確定報酬を集計します。</p></div>
      <span class="actual-badge">CSV取込</span>
    </div>

    <div id="actualRevenueMetricGrid" class="actual-metric-grid"></div>

    <div class="actual-subgrid">
      <div class="revenue-box">
        <h3>ASP別の実績</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ASP</th><th>発生件数</th><th>発生報酬</th><th>確定件数</th><th>確定報酬</th><th>売上</th><th>取消/否認</th></tr></thead>
            <tbody id="actualProviderBody"></tbody>
          </table>
        </div>
      </div>
      <div class="revenue-box">
        <h3>日別：確定報酬 / 発生報酬</h3>
        <div id="actualRevenueDaily" class="revenue-daily"></div>
      </div>
    </div>

    <h3 class="actual-table-title">案件別の実際の成果</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ASP</th><th>案件</th><th>発生件数</th><th>発生報酬</th><th>確定件数</th><th>確定報酬</th><th>売上</th></tr></thead>
        <tbody id="actualProgramBody"></tbody>
      </table>
    </div>

    <div class="affiliate-import-panel">
      <div class="affiliate-import-heading">
        <div><span class="eyebrow">IMPORT</span><h3>成果CSVを取り込む</h3><p>同じ成果を再度取り込むと更新されるため、発生→確定へ変わった後も二重計上しません。</p></div>
      </div>
      <div class="affiliate-import-controls">
        <label><span>ASP</span><select id="affiliateImportProvider"><option value="rakuten">楽天アフィリエイト</option><option value="a8">A8.net</option><option value="accesstrade">AccessTrade</option></select></label>
        <label class="file-field"><span>成果CSV</span><input id="affiliateImportFile" type="file" accept=".csv,.txt,text/csv"></label>
        <button id="affiliateImportBtn" class="primary-btn" type="button">D1へ取り込む</button>
      </div>
      <div id="affiliateImportPreview" class="affiliate-import-preview"><div class="empty">CSVを選ぶと取込内容を確認できます。</div></div>
      <p id="affiliateImportStatus" class="affiliate-import-status"></p>
      <div class="affiliate-import-help">
        <div><strong>楽天</strong><span>アフィリエイトレポート → 成果レポート → CSV</span></div>
        <div><strong>A8.net</strong><span>レポート → 成果報酬 → 表示データをダウンロード → CSV</span></div>
        <div><strong>AccessTrade</strong><span>レポート → 成果別 → 成果分析レポート → ダウンロード</span></div>
      </div>
      <h4>最近の取込</h4>
      <div class="table-wrap">
        <table><thead><tr><th>ASP</th><th>ファイル</th><th>行数</th><th>取込日時</th></tr></thead><tbody id="affiliateImportHistoryBody"></tbody></table>
      </div>
    </div>
    <div class="actual-divider"><span>以下はサイト内の表示・クリック計測</span></div>`;

  marker.before(block);
})();
