# 検証結果の詳細（工場キャリア診断）

## 検証環境と安全対策

- ブラウザ: Playwright 1.65.0 / Chromium（ヘッドレス）。375×812 / 768×1024 / 1440×900。Claude in Chrome 拡張が未接続だったための代替です。
- 計測: `navigator.webdriver`・除外 Cookie・収集エンドポイントの模擬応答で、本番計測（中央収集を含む）への書き込みは 0 件。
- 広告: `px.a8.net` / `h.accesstrade.net` / `hb.afl.rakuten.co.jp` への通信は遮断。実トラッキング URL への到達は 0 件。
- フォーム: 診断・年収計算・職務経歴ツールなど自サイトの操作のみ。外部への申込み・登録は 0 件。

## 1. 全ページ監査（本番）

| 項目 | 結果 |
|---|---|
| サイトマップ | `sitemap.xml` 99 件 + `sitemap-core.xml` 44 件（重複 43）= 100 URL。全件 200・canonical 一致・noindex なし |
| 全ページ表示（200 回） | HTTP エラー 0、横スクロール 0、画像切れ 0、未捕捉の JS エラー 0 |
| 自サイト API のエラー | 1 件（`/api/rakuten/items?category=work` が 429。同時アクセス時のみ） |
| 本番と main の一致 | 209/209 |

コンソールエラーの件数は、監査ブラウザが広告・計測の通信を遮断したことによるものです。

## 2. 操作フロー（191 手順・全合格）

- トップ（メニュー開閉を含む）、7 問の診断を 6 通りの回答パターン × 3 画面幅で最後まで操作し、結果の種類・推奨先・PR 表記・リンク属性を確認。
- 年収ツール・職務経歴ツール、`/factory-items`、記事ページのスマホ固定 CTA、404 ページ。

## 3. 広告 CTA の模擬クリック

13 ページ × 2 画面幅で、表示されている広告リンクを 1 つずつクリックし、ローカルの模擬ページに到達することを確認しました。

| 結果 | 件数 |
|---|---|
| 新規タブで開き、URL が改変されず模擬ページに到達 | 74 |
| 失敗 | 0 |
| スクロール前は非表示のため対象外（スマホ記事の固定バー） | 4 |

広告主の公式ページ（メーカーズジョブ・Samurai Job・楽天市場）は、トラッキング URL を使わず直接開いて 200 を確認しました。

## 4. GitHub Actions（このリポジトリで動く検査）

| ワークフロー | 監査前 | 監査後 |
|---|---|---|
| Norimono production QA | 失敗（run 42483549996、43720860138） | 成功（run 44338212933、コミット `20d2d7b`） |
| Audit car-bike public copy | 失敗（run 42485940331、43722557980） | 成功（run 44338214118） |
| Norimono deep production audit | 直近の実行結果は未確認（push・手動実行のみで、定期実行はなし） | `20d2d7b`: 失敗（開始 1 秒で終了・原因表示なし）→ `5f150fb`: 失敗（注釈で原因が判明: 判定ミス 2 件）→ `938db20`: 成功（run 44358070331） |
| Norimono indexability audit | 成功（run 43722833954） | 変更なし |

変更したファイル: `.github/workflows/norimono-production-qa.yml`、`audit-car-bike-public-copy.yml`、`norimono-deep-audit.yml`、`qa/norimono-production.config.cjs`（新規）、`qa/norimono-indexability.spec.cjs`、`scripts/audit-norimono-deep.mjs`。

注意: Norimono deep production audit は全ページを巡回する負荷の大きい検査です。実行頻度の見直しを next-actions に記載しています。

## 5. Functions の一時停止

2026-11-18 17:30 UTC ごろから、`/api/rakuten/items` などが一時的に応答しない状態になりました（復旧見込み: 2026-11-19 09:00 JST ごろ）。それ以前に取得した上記の結果には影響しません。経緯はオーナー向けの全体報告に記載しています。
