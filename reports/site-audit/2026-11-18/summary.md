# 工場キャリア診断 サイト監査サマリー

- 監査日: 2026-11-18〜19（JST）
- 本番URL: https://factory-career-site.pages.dev/ （canonicalホスト: 同じ）
- リポジトリ: `canonboyddd/factory-career-site`（public）
- main: 監査開始時 `25586c9` → 監査後 `938db20`（サイト本体のファイルは変更なし。CI と QA スクリプトのみ）
- デプロイ: Cloudflare Pages の Git 連携（リポジトリ直下を配信）
- 収益化: A8.net（メーカーズジョブ）、アクセストレード（Samurai Job／ZENの退職代行）、楽天アフィリエイト（`/factory-items`）。マジキャリは URL 未設定で非掲載

## 【重要】Functions の一時停止（2026-11-19 02:30 JST ごろ〜）

監査の終盤に、Cloudflare 側の要因でサーバー側処理（Functions）が一時的に実行されない状態になりました。このサイトでは `/api/rakuten/items`（`/factory-items` の商品表示）と計測の収集 API が該当します（その間の計測データは欠ける可能性があります）。診断・記事・ツールなど静的なページは影響を受けません。**2026-11-19 09:00 JST ごろに復旧する見込み**です。経緯と対策は、オーナー向けの全体報告に記載しています。

## 結論

サイト本体に修正が必要な不具合は見つかりませんでした。このリポジトリにある、車・バイクサイト向けの定期検査（GitHub Actions）3 本が壊れていたため修理しました。

| 対象 | 状態（監査前） | 対応 | 結果 |
|---|---|---|---|
| Norimono production QA（週次） | 2026-11-08・11-15 と連続失敗。要望ボードを「検索対象」と期待する古い判定が原因 | 現在の仕様（noindex）に合わせて判定を修正。検査ブラウザから広告・計測ホストへ通信しない設定を追加 | 成功（run 44338212933） |
| Audit car-bike public copy（週次） | 連続失敗。新しい実行環境で Playwright 1.55 の導入に失敗 | 実行環境を `ubuntu-24.04` に固定 | 成功（run 44338214118） |
| Norimono deep production audit | 開始 1 秒で終了し原因が表示されない／グッズ検索の判定ミス | 再試行と原因表示（注釈）を追加、判定を修正 | 成功（run 44358070331） |

## 主要な検証結果（本番）

| 検証 | 結果 |
|---|---|
| サイトマップ（4 ファイル・重複を除き 100 URL） | すべて 200・canonical 一致・noindex なし。存在しない URL は 404 |
| 全ページ表示（100 ページ × 375/1440px = 200 回） | HTTP エラー 0、横スクロール 0、画像切れ 0、JS エラー 0 |
| 7 問の診断を含む操作フロー（375/768/1440px、191 手順） | 191/191 |
| 広告 CTA の模擬クリック（ASP 通信は遮断） | 74/74（新規タブ・URL 一致・`rel="sponsored nofollow noopener"`）。スマホ記事の固定バー 4 件はスクロール後に表示されることを別途確認 |
| 本番と main の一致 | 209/209 ファイル一致 |

気づいた点（修正はしていません）:

- `/factory-items` を多数同時に開くと、楽天商品 API が一時的に 429 を返すことがありました（画面は空表示にならず案内が出ます）。
- サイトマップは `sitemap.xml`（99 件）と `sitemap-core.xml`（44 件）で 43 件が重複しています（害はありません）。

明細は [affiliate-links-audit.csv](affiliate-links-audit.csv)、数値は [browser-results.json](browser-results.json)、テストは [qa-results.md](qa-results.md)、残課題は [next-actions.md](next-actions.md) を参照してください。

## 確認できていないこと

- ASP 管理画面（承認状態・成果・クリック数）。**未取得**です。
- ZENの退職代行の広告主公式ページ（URL を特定できず未確認）。
