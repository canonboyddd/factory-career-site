// Playwright Test config for the weekly norimono-cost.com production QA.
//
// The specs open real production pages. Without this, every run also loaded the partners'
// impression pixels and the analytics scripts from the CI browser. The hosts below are made
// unresolvable inside the browser, so QA can never add ad impressions, ad clicks or
// analytics traffic. The assertions only read link attributes, so they are unaffected.
const BLOCKED_HOSTS = [
  '*.accesstrade.net',
  '*.a8.net',
  '*.afi-b.com',
  '*.affiliate-b.com',
  'hb.afl.rakuten.co.jp',
  '*.google-analytics.com',
  '*.googletagmanager.com',
  '*.doubleclick.net',
];

module.exports = {
  testDir: __dirname,
  testMatch: ['norimono-production.spec.cjs', 'norimono-indexability.spec.cjs'],
  use: {
    launchOptions: {
      args: ['--host-resolver-rules=' + BLOCKED_HOSTS.map(host => `MAP ${host} 0.0.0.0`).join(', ')],
    },
  },
};
