# 工場キャリア診断：収益導線改善と検証記録

監査日：2026-11-08（日本時間）。対象：`canonboyddd/factory-career-site`。
開始時のGitHub mainはAPIとfetchで `aafed820c34530464170a59f0a53c675bf7627ae` と照合済み。既存の作業コピーは変更せず、同じmainを独立した作業コピーで改善した。

## 1. 現状の広告・申込導線

- 記事 → 7問の診断／年収比較／職務経歴書作成 → 比較記事 → 個別サービス紹介 → 提携サービスの条件確認という導線がある。
- `assets/config.js` にメーカーズジョブ（A8）、Samurai Job（AccessTrade）、ZEN退職支援（AccessTrade）が設定されている。マジキャリはURL未設定。
- 楽天商品は工場向け用品の記事・仕事グッズ一覧で表示する。正常に取得できる商品のみ表示する既存処理を維持した。
- ASP管理画面での最新承認状態・成果条件・掲載許可は未取得。設定済みリンクをそのまま利用し、未設定リンクの捏造、ID変更、別案件への置換はしていない。ASPへの実申込み・購入・試験クリックは行っていない。

## 2. 問題と重要度

| 重要度 | 確認した問題 | 修正・扱い |
| --- | --- | --- |
| 高 | 診断開始・完了が独自D1の許可イベントに含まれず、結果表示も未計測 | 3段階を許可し、回答を含めず各1回送信 |
| 高 | 広告カード作成時の表示イベントと可視判定による表示イベントが重複 | 作成時イベントを削除。CTAの50%以上が1秒間見えた時のみ記録 |
| 高 | 診断結果の動的CTAに識別属性が不足 | 案件・位置・文言群を付与、動的DOMも監視 |
| 高 | 独自計測とGA初期化で自動操作・QAを除外していない | webdriver／既知bot UA／QAクエリ／運営者を除外。サーバーにもbot・QA除外 |
| 高 | 人間関係の悩みと早期転職の回答から退職支援を提示 | 診断では退職支援を提示せず、一般記事のZEN広告も専用ページ以外で非表示 |
| 中 | 検討段階が情報収集／現職継続でも広告へ直結 | 記事・条件整理を優先し、その段階の診断結果は直接広告を表示しない |
| 中 | 経験年数の点数や年収だけで専門職向け案件が先頭になる | 専門職種を回答した場合に専門職向け案件を優先 |
| 中 | 多層のレイアウトJSで同じ広告クリックを別名の広告イベントとして送信 | 直接の広告計測を共通ハンドラーに集約。スクリプトによるclickは除外 |
| 中 | 比較記事の375px表示が708pxまで横にはみ出す | グリッド子の`min-width:auto`が原因。記事本体を`min-width:0`に修正 |
| 中 | 既存CIが本番D1へ架空のクリックを保存 | 通信を遮断したローカル検証と、QA除外応答を確認する方式へ変更 |
| 低 | 既存メニューに無料ツールがあっても追加される | 既存リンクを認識し、二重表示を防止 |

## 3. 修正ファイルとコミット

- `assets/diagnosis.js`：検討段階・職種・働き方の説明、未設定案件除外、診断イベント、安定したCTA文言A/B。
- `assets/analytics.js`：可視表示、動的CTA、信頼できるクリックと中ボタン、bot/QA除外、中央トラッカー接続、回答非送信、UTMの入力制限。
- `assets/central-tracker.js`：各サイトが参照する共通配布コード。QA除外、信頼できるクリック、50%／1秒の表示、案件・文言群の識別を整合。
- `assets/offers.js`、`assets/service-review.js`、`assets/benchmark-layout.js`、`assets/article-conversion-layout.js`、`assets/top-sites-layout.js`、`assets/rakuten-products.js`：広告クリック重複・生成時表示を除去し、位置・案件を明示。
- `assets/main.js`、`assets/styles.css`：GA除外とURLからクエリを除く設定、メニュー重複、スマホ横幅。
- `functions/api/analytics/collect.js`：診断3イベント許可、bot/QAのDB書込前除外。既存の列・データ・認証は維持。
- `_headers`：更新対象JSの再検証、監査資料のnoindex。
- `qa/affiliate-revenue.spec.cjs`：通信を遮断した行動回帰と前後画像。
- `qa/factory-seo-core.spec.cjs`：CRLFをLFに正規化。Windowsの改行差で既存_headers規則が見つからない偽失敗の原因を修正し、検査条件は維持。
- `.github/workflows/analytics-production-smoke.yml`：既存Pages反映待ち・回帰・安全な本番除外確認・証拠保存。
- `qa/live-site-behavior.cjs`：従来の実画面QAにも中央計測とASPピクセルの遮断を追加（`1d34c3c`）。
- `qa/all-site-analytics-live.spec.cjs`：5サイトの新経路を検証。通常訪問の模倣とbot/QA除外を分け、各ストアのPVが1件であること、車の中央転送がサーバーのみであること、中央の未取得状態を正しく扱うことを検査。SEOの既存検査は維持。

実装コミット：`e533cf75da7dbce459fe191276df324a72c7de1d` — `Improve factory diagnosis intent matching and trustworthy revenue measurement`。この行の追記は実装後の監査記録コミット。

追加修正：`07ddf51dba31eefc13a0aa842f48aa510d449a45` はCI環境と本番QA、`048df3716ed7b10faedf7c61b322c0eebd5d08b8` は未取得報酬の表示と工場イベント重複集計を修正した。後者は `functions/api/admin/{central-dashboard,ops-intelligence,ops-revenue}.js`、`functions/shared/ops-analytics-contract.js`、`assets/{ops-dashboard,ops-intelligence,admin-revenue}.js`、`ops-dashboard.html` と回帰QAを含む。

`863c9c3887127d9656057969e06c05ec59d254a5` では、動的 `assets/ops-health.js` にも残っていた固定の「20 / 20 PASS」等を撤去し、最新GitHub実行結果は未取得と明示した。`functions/api/admin/production-health.js` は車の新しい `/analytics.js` の単一POST設計を確認し、廃止されたクライアント中央送信を必須としない。古いdeploy-markerはバージョン証明として扱わない。新旧クライアントを混同しないfixtureも追加した。

未取得ASPの0円表示をなくし、取込分のみの値であることを明示した。PV/CTRは「既知の巡回を除外した観測値」であり、人間の訪問の保証ではないと画面に記載した。2026-09-28の固定runner失敗表示は現在の状態と誤認されるため、最新Actions履歴を開く案内に置き換えた。案件一覧は車以外の実際に観測した案件も保持する。

`assets/config.js`、案件URL・ID、sitemap、既存記事データ、診断採点、D1の既存データは変更していない。

## 4. 成果発生につながる理由

情報収集段階では条件整理に集中でき、実際に求人比較を始める人には対象職種・勤務条件・給与内訳を確認する理由とともに広告を表示する。専門職と一般製造職を混同せず、診断だけで退職支援の必要性を決めない。比較記事から個別紹介への内部遷移は広告クリックに数えず、実際の外部遷移だけを計測する。

これは導線と計測の改善であり、増収を証明したものではない。

## 5. 前後比較

| 場面 | 変更前 | 変更後 |
| --- | --- | --- |
| 現職継続・情報収集の診断 | 外部広告を表示 | 条件整理・関連ガイドを優先 |
| 一般製造職で経験10年以上／高年収 | 専門職向けを優先し得る | 製造業向け案件を表示、専門職向けと混同しない |
| 人間関係＋早めに転職 | 退職支援の候補あり | 診断では退職支援を表示しない |
| 表示計測 | DOM生成時と可視時の両方 | 実際の可視CTAのみ、1秒・50% |
| クリック | 複数JSの広告イベント | 正規のクリックイベント1件／操作／計測ストア |
| 動的診断CTA | 表示・案件識別が不十分 | 案件・位置・文言群が識別可能 |
| 比較記事375px | 横幅708px | 375px内に収まる、表は枠内でスクロール |

前後画像は `reports/affiliate-revenue-qa/{before,after}-{diagnosis,comparison}-{375,768,1440}.jpg`。同じ回答・同じ画面幅で比較した。

## 6. QA・画面証拠

`qa/affiliate-revenue.spec.cjs` はローカルHTTPサーバーで動作し、全POST・全外部通信・ASP画像・外部遷移を遮断する。人の操作を模した測定テストのwebdriver変更は、この完全遮断したローカルテスト内に限定している。

検証内容：7問の進行／未選択の次へ抑止／開始・完了・結果各1件／回答値非送信／動的CTAの実可視表示／主ボタン・中ボタンを各1件／スクリプトclickを除外／安定した文言A/B／情報収集と継続の分岐／未設定案件非表示／比較から個別紹介への遷移／年収計算／職務経歴書作成／bot・運営者・QA除外／DB書込前フィルター。

既存QA：`node qa/full-site-integrity.cjs`（最終追加QA込み163 HTML・69 JS/CJS/MJS、警告0）、`node qa/factory-seo-core.spec.cjs`、`node qa/ops-dashboard-contract.spec.cjs`、`node qa/analytics-consistency.spec.cjs`、`node --test qa/central-index-budget.test.mjs`（2テスト）。実行結果は `reports/affiliate-revenue-qa/results.json` とコミット前の検証ログ参照。

追加 `qa/dashboard-revenue-state.cjs` は、実際のAPIが発行するSQLをSQLiteで実行し、「旧工場1PV＋同じ新訪問の独自1PV＋中央1PV」が2PVとなることを検証した。ASP実績行なしのAPI・画面が0円でなく未取得となることも通信遮断したfixtureで検証済み。`dashboard-fixture-unavailable.jpg` は**架空データを用いたローカルQA画面**であり、本番の実績画面ではない。

画面は375px／768px／1440px。診断と比較記事で横はみ出しを確認し、修正後はなし。ブラウザーJavaScriptエラー0。実ASP申込・購入0、実計測へのQA書込0。

## 7. 本番反映確認

開始時の本番 `/diagnosis?qa=1` はHTTP 200（2026-11-08、HTMLのみ取得・実行せず）。配布先は既存の `factory-career-site.pages.dev`。

GitHub main `2960b3bfeee2adc2396efd95a22282cf29c65160` の既存Cloudflare Pages自動デプロイ成功をAPIとGitHub checkで確認した。デプロイID：`6ff54507-3535-4bf9-9955-45218b38551d`。成功時刻：2026-11-08 01:37:30 JST。別経路での上書きデプロイは行っていない。

2026-11-08 01:42 JSTの本番QA：`analytics.js`／`diagnosis.js`／`main.js`／`central-tracker.js` はローカル検証済みソースと本文一致（SHA256は `production-results.json`）。375／768／1440pxで広告あり・なしの診断結果、比較記事、年収計算、職務経歴書作成を検証。JavaScriptエラー0、同一originの404/500等0、計測POST試行0。全ASP通信と全POSTはブラウザーで遮断している。唯一のcollector応答確認は `x-analytics-test: 1` を付け、DB書込前に `excluded:true` となることを確認した。

`qa/live-site-behavior.cjs` でも本番99ページと内部106リンクを検査し、警告0・失敗0。`production-*.jpg` 9枚と `production-results.json` を保存した。

初回GitHub ActionsではSEO core、Full Site Integrity、production headers、search qualityの成功を確認。既存のブラウザー2ジョブはUbuntu最新イメージが26.04へ変更されPlaywright 1.55が起動前に失敗した。analytics smokeは`curl | grep -q`のパイプ早期終了によるcurl exit23だった。`07ddf51`でUbuntu24.04固定と本文完全取得後の検査に修正し、テスト条件は維持した。追加ダッシュボード修正・CI修正の最終反映結果は下記追記欄で確認する。

追加反映：main `a27b893dd3cdaf6ab20702d39e17693a4c4811f4`、Cloudflare Pages `782c21f3-73da-4784-a2d0-f633673ae6eb` が成功。GitHubの全7チェック（Pages、analytics-smoke、production-behavior、public-copy、Ops syntax、2つのaudit）も全成功。証拠：`github-checks-a27.json`。未認証で管理API3本（中央ダッシュボード／収益／intelligence）を読み、いずれも401を確認した。実管理トークンを使った本番画面は取得していない。

4サイト先行計測QA：factory／SuguTsucool／車・バイク／ClipMadeで4テスト全成功（20.2秒）。各ストアのPVは1回、車のクライアント中央送信0、webdriver＋明示QAの送信0、中央のraw／未取得／古いデータ表示の契約を確認。すべての計測とASP通信は遮断。`four-site-measurement.json` に記録した。おかずサイトは当該実行時に本番スナップショット更新中のため対象外であり、5サイト完了とは報告していない。初回CIの全5サイトSEO検査自体は通過した。

最終ヘルス表示修正も `43d95ba1e6c604c72b2aa7c87e0abad5c361cc73` までGitHub mainへ反映済み。Cloudflare Pages `982994f8-fac5-41a2-903a-b5489f0b78e6` が成功し、`ops-health.js`／`ops-dashboard.js`／`ops-intelligence.js`／`ops-dashboard.html` がHTTP200・検証済み本文と一致、固定の過去QA成功表現なしを確認した（`dashboard-production-source.json`）。待ち状態ではない。

`863c9c3` のコードチェックでは工場のPages／Ops syntax／public-copy／production-behavior／Integrity／analytics-smokeは成功。全サイトlive QAだけは更新途中のおかずサイトのPV二重送信と、新しい車本番で `/feedback` がsitemap掲載なのにnoindexである不一致を検出した（`github-checks-863.json`）。後者は車担当へ修正を依頼した。当該2点の解消は後述の全5サイト最終検証で確認した。

車の不一致は `4466928` で修正され、Cloudflare Pages `7eafd93f-b3b3-4d20-8f2f-f7a4821463eb` の成功後に統合QAから再検証した。sitemap全428URLとホーム15リンクで、直接200・noindexなし・canonical一致・重複なしを確認し、1テスト成功（6.1秒）。`car-seo-after-feedback.json` を参照。車のブロッカーは解消し、その後のおかず更新も含む最終結果は次項の通り。

### 5サイト最終検証：完了

2026-11-08 02:19 JST開始、683.331秒で全5テスト成功、失敗・skip・flakyは0。おかずサイトの更新反映後に、対象を絞らない既定の全5サイト検査を実行した。`five-site-final-playwright.json` は実行結果、`five-site-final-summary.json` はそのstdoutから抽出した対象数。ローカル端末の絶対パスだけを正規化しており、判定結果は変更していない。

| サイト | sitemap実HTTP検査URL数 | ホーム内部リンク数 |
| --- | ---: | ---: |
| 工場キャリア診断 | 99 | 35 |
| SuguTsucool | 260 | 49 |
| 車・バイク維持費 | 428 | 15 |
| おかずよりどりみどり | 15,954 | 47 |
| ClipMade | 46 | 9 |
| 合計 | 16,787 | 155 |

全sitemap URLで直接HTTP200・noindexなし・canonical一致・重複URLなしを確認。各サイトの正本ストアへのPVは1回（工場・Suguは用途の異なる2ストアに各1回）、車のクライアント中央直送0、全5サイトでbot/明示QAの収益計測送信0、中央のraw／未取得／古いデータの契約も通過した。全collectorとASP通信を遮断し、年齢確認の送信・申込み・購入は行っていない。

最終実行は元の15分以内で完走したため、実行時間枠とHTTP同時数8を維持した。条件の緩和、URLの間引き、テストの削除はしていない。

## 8. 実測値と未取得データ

2026-11-08の読み取り専用DB確認、過去30日、既存データの生集計：

| ストア／イベント | イベント数 | 一意セッション数 |
| --- | ---: | ---: |
| 工場独自D1：page_view | 27 | 27 |
| 工場独自D1：affiliate_offer_view | 2 | 1 |
| 工場独自D1：engaged_30s | 5 | 5 |
| 工場独自D1：scroll_depth | 6 | 3 |
| 中央：site_key=factory | 保存行0 | 未取得 |

これらは変更前の生データで、実ユーザー認定した値ではない。旧表示定義・旧QAの影響があり、実ユーザーPV・CTR・改善率を計算する根拠にしない。

`affiliate_results`、`affiliate_imports`、`gsc_performance`、`gsc_index_status` は確認時に0行。意味は**未インポート／未取得**であり、実成果0件、確定報酬0円、検索流入0件とは断定できない。ASP画面・成果CSV・GSCの最新実データ、ページ別離脱の有効標本は未取得。

## 9. 今後の検証条件・計測仕様

- 共通分析は中央 `central_events` を使用。工場独自 `analytics_events` は互換・診断調査用の補助ストアであり、中央の数値と足し合わせない。同じ操作が両方に1件ずつあるのは別用途の保存であり、合算用ではない。
- 既存ダッシュボードの工場履歴は、最初の中央計測デプロイ時刻 `2026-11-07 16:37:30 UTC` より前の独自履歴と、その後の中央イベントを使用する。同じ新訪問の鏡像イベントをUNIONで二重加算しない。原データは削除しない。古いキャッシュの計測や新旧定義の境界を含む期間には欠測・定義差があり、前期間比を増加実績とみなさない。
- 中央の `page_view`、`affiliate_impression`、`affiliate_click`、`diagnosis_start`、`diagnosis_complete`、`diagnosis_result_view` を分離する。案件・ASP・位置・文言群・端末・日付・匿名ブラウザー／セッションで集計する。
- 表示はCTAが50%以上見える状態を1秒継続したもの。ページ内の同じ案件・位置・文言群は最大1表示。動的追加にも対応。クリックは信頼できるclick／auxclickのみ。再訪や別の意図したクリックは個別の操作として扱う。
- 表示セッションは`COUNT(DISTINCT session_id)`を表示イベントで数える。クリックセッションはクリックイベントで別に数える。クリック数÷可視表示数と、クリックセッション÷CTA到達セッションを区別し、PVをCTRの分母にしない。
- 既知UA／webdriverの排除だけでは、人間を装う巡回を完全には見分けられない。中央管理画面の既存の多ページ・短時間巡回フィルターも併用し、未検証の数を「実ユーザー」と呼ばない。
- 診断CTA文言A/Bは`fc_browser_id`を固定hashし、`diagnosis-cta-20261108`の固定実験として振り分ける。保存不能時は固定の標準文言で、実験群を付けない。中央の`variant`で比較できる。診断回答・年収・職務経歴書入力・メールアドレスは送らない。
- まず2週間以上、各文言群で100以上の可視到達セッションと20以上の実クリックを観測し、差の不確実性と端末・流入構成を確認する。この下限に届くだけで成功とはしない。ASP成果CSV・確定報酬の同じ帰属期間が揃うまで収益優位とは判定しない。
- QAは`?qa=1`／`?ops_qa=1`、運営は既存`?ops_owner=1`を利用し、ASP通信・計測POSTを必ず遮断する。CI collector確認は`x-analytics-test: 1`でDB前に除外する。

## 10. 残る作業・ブロッカー

最終追記: GitHub Actions「All-site analytics live QA」run `42394589768` attempt2が2026-11-08 02:50 JSTにsuccess。更新前のおかずサイトの2PVで失敗した同一CIを、全サイト反映後に元の検査条件・全URL対象のまま再実行した。ローカル全5テスト合格とCI成功がそろった。`reports/affiliate-revenue-qa/github-final-run.json`参照。追加の広範囲再試験は不要。

1. 5サイト計測・SEO QAは完了。車 `/feedback` の不一致も修正・本番検証済み。工場の最終ヘルス表示修正も反映済み。実トークンを用いた管理画面確認だけは未取得。
2. ASP側の最新提携承認・リンク有効性・掲載条件を管理画面で照合する必要がある。URL未設定のマジキャリは表示しない。
3. ASP成果CSV／確定報酬とGSC実データのインポート後に成果の帰属期間・取消・確定を照合する。
4. 新定義で有効な表示・クリック標本が貯まるまで、CTR改善・申込増加・増収は未検証。

再開地点：この独立作業コピーとmain基準SHA、`qa/affiliate-revenue.spec.cjs`、`reports/affiliate-revenue-qa/results.json`、本節を使用する。既存D1データの削除や推測補完は不要。
