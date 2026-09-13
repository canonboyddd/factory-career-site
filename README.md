# 工場キャリア診断

Cloudflare Pagesで無料公開できる静的サイトです。

## 最初に変更する場所

1. `assets/config.js` の `affiliateUrl` にA8.netで発行した広告リンクを設定
2. `robots.txt` と `sitemap.xml` の `https://YOUR-DOMAIN.example` を実際のCloudflare Pages URLまたは独自ドメインに置換
3. 必要に応じてサイト名・運営者情報・問い合わせ方法を追記

## 公開方法

GitHubへこのフォルダの中身をアップロードし、Cloudflare Pagesでリポジトリを接続します。ビルドコマンドは不要、出力ディレクトリは `/` です。

## 診断

診断回答はサーバー送信せずブラウザ内で計算します。
