window.SITE_CONFIG = {
  siteName: "工場キャリア診断",
  affiliateUrl: "",
  affiliateServiceName: "メーカー・製造業特化の転職支援サービス",

  // GA4を使う場合だけ G-XXXXXXXXXX を設定。空欄なら外部計測スクリプトは読み込みません。
  analytics: {
    ga4MeasurementId: ""
  },

  // ASP審査承認後、発行された広告リンクURLだけを設定してください。
  // 空欄の案件は自動で非表示になります。
  affiliatePrograms: {
    makersJob: { name: "メーカーズジョブ", url: "" },
    samuraiJob: { name: "Samurai Job", url: "" },
    magicari: { name: "マジキャリ", url: "" },
    zen: { name: "ZENの退職代行", url: "" }
  },

  // 収益中核8記事の初期優先順位。実績が貯まったら発生率・承認率・承認報酬で更新する。
  articleProgramPriority: {
    "factory-quit.html": ["makersJob", "zen"],
    "night-shift-hard.html": ["makersJob", "zen"],
    "manufacturing-30s.html": ["makersJob", "samuraiJob"],
    "production-tech-career.html": ["makersJob", "samuraiJob"],
    "quality-quit.html": ["makersJob", "samuraiJob"],
    "manufacturing-500-income.html": ["samuraiJob", "makersJob"],
    "manufacturing-other-industry.html": ["magicari", "makersJob"],
    "period-worker-next.html": ["makersJob", "magicari"],
    "manufacturing-agent-guide.html": ["makersJob", "samuraiJob", "magicari"],
    "production-tech-agent.html": ["samuraiJob", "makersJob"],
    "quality-agent.html": ["samuraiJob", "makersJob"]
  },

  disclosure: "当サイトはアフィリエイト広告を利用しています。"
};
