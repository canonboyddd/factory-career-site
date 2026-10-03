const fs=require('fs');
const assert=require('assert');

function read(p){return fs.readFileSync(p,'utf8')}
function has(text,needle,msg){assert(text.includes(needle),msg||`Missing: ${needle}`)}

const seoApi=read('functions/api/admin/seo-data.js');
const seoUi=read('assets/admin-seo-data.js');
const intelApi=read('functions/api/admin/ops-intelligence.js');
const intelUi=read('assets/ops-intelligence.js');
const okazuApi=read('functions/api/admin/okazu-analytics.js');
const dashApi=read('functions/api/admin/central-dashboard.js');
const healthApi=read('functions/api/admin/production-health.js');
const centralCollect=read('functions/api/central/collect.js');
const dashHtml=read('ops-dashboard.html');
const sharedApi=read('functions/shared/ops-analytics-contract.js');

for(const key of ['factory','sugutsucool','okazu','car-bike','clipmade']){
  has(seoApi,`'${key}'`,`SEO API lost site ${key}`);
}
has(seoApi,"site==='all'",'SEO portfolio endpoint missing');
has(seoApi,'順位8〜20位・SEO伸びしろ','SEO rank opportunity rule missing');
has(seoApi,'検索表示あり・クリック0','zero-click opportunity rule missing');
has(seoApi,'検索CTR低','low CTR opportunity rule missing');
has(seoApi,'検索表示あり・サイト内PV0（30日）','zero onsite PV opportunity rule missing');
has(seoApi,"['query','page','index']",'GSC CSV import types missing');
has(seoApi,'gsc_performance','GSC performance storage missing');
has(seoApi,'gsc_index_status','GSC index storage missing');
has(seoUi,'5サイト検索パフォーマンス','five-site SEO portfolio UI missing');
has(seoUi,'seoOpportunityRows','SEO opportunity table missing');

has(intelApi,"'affiliate_impression','affiliate_slot_view'",'affiliate impression normalization missing');
has(sharedApi,"CENTRAL_CLICK_SQL=\"('affiliate_click','affiliate_click_unified')\"",'affiliate click normalization missing');
has(intelApi,'クリックあり・成果0','revenue no-conversion rule missing');
has(intelApi,'高PV・クリック0','high-PV zero-click rule missing');
has(intelApi,'広告到達不足','low affiliate reach rule missing');
has(intelApi,'x.impressions>=3','high-PV zero-click sample threshold missing');
has(intelApi,'x.impressions/x.pv<0.5','low affiliate reach ratio missing');
has(intelApi,'表示ありCTR低','low affiliate CTR rule missing');
has(intelApi,'CTA未到達','CTA reach rule missing');
has(intelApi,"c.site_key<>'car-bike'",'vehicle D1 de-duplication missing');
has(intelApi,'[mod,mod,mod,mod]);','executive analytics bind count regression');
has(intelApi,'PROBE_PATHS','executive security-probe filtering missing');
has(sharedApi,'COUNT(DISTINCT page_path)>=18','executive behavioral crawler filtering missing');
has(sharedApi,'"/openid_connect/"','executive scanner path filtering missing');
has(intelApi,"LIKE '%.html/%'",'executive malformed html path filtering missing');
has(intelApi,'bike_value_post_estimate_alt','bike king placement mapping missing');
has(intelApi,"return'bikeland'",'bike land placement mapping missing');
has(intelApi,'car?.summary?.cta_reached_sessions','vehicle CTA reach merge missing');
has(intelApi,"x.site_key!=='clipmade'",'ClipMade revenue-priority exclusion missing');
has(intelApi,'x.impressions>=3&&x.ctr>0','zero CTR must not be a high-CTR ad');
has(intelApi,'x.impressions>=3&&x.clicks>0','zero-click pages must not be CTR leaders');
has(intelApi,'else score=0','generic low-signal priority rows must be excluded');
has(intelApi,"x.page_type='vehicle_bike'",'bike page type fallback missing');
has(intelApi,'car_value_post_estimate','known AFB placement program mapping missing');
has(intelApi,"WHEN c.page_path='/index.html'",'canonical path merge missing');
has(intelApi,"x.provider&&x.provider!=='unknown'",'unknown ASP rows must be filtered');
has(intelUi,"startsWith('/bikes/')?'バイク':'車'",'bike vehicle label fallback missing');

has(okazuApi,'const safe=async','Okazu resilient query wrapper missing');
has(okazuApi,'partial:warnings.length>0','Okazu partial-result reporting missing');
has(okazuApi,'CENTRAL_CLICK_SQL','Okazu normalized affiliate clicks missing');
has(dashApi,'filtered_automated_pv','automated traffic exclusion summary missing');
has(dashApi,'PROBE_PATHS','central dashboard security-probe filtering missing');
has(sharedApi,'COUNT(DISTINCT page_path)>=18','central dashboard behavioral crawler filtering missing');
has(sharedApi,'"/openid_connect/"','central dashboard scanner path filtering missing');
has(healthApi,'central-tracker\\.js\\?v=20261001-1','production health tracker version is stale');
has(centralCollect,'function securityProbe','central collector security-probe filter missing');
has(centralCollect,"filtered:'security_probe'",'central collector probe rejection response missing');
has(centralCollect,'behavioralCrawler','central collector behavioral crawler filter missing');
has(centralCollect,"filtered:'behavioral_crawler'",'central collector behavioral crawler response missing');
has(centralCollect,'openid_connect','central collector scanner path filtering missing');
has(dashHtml,'全ASP 実収益','actual earnings panel missing');
has(dashHtml,'SEO成果・インデックス管理','SEO panel missing');
has(dashHtml,'収益改善の自動ランキング','automatic revenue ranking panel missing');

console.log('Ops dashboard contract QA passed.');

require('./analytics-consistency.spec.cjs');
