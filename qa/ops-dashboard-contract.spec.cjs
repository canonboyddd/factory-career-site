const fs=require('fs');
const assert=require('assert');

function read(p){return fs.readFileSync(p,'utf8')}
function has(text,needle,msg){assert(text.includes(needle),msg||`Missing: ${needle}`)}

const seoApi=read('functions/api/admin/seo-data.js');
const seoUi=read('assets/admin-seo-data.js');
const intelApi=read('functions/api/admin/ops-intelligence.js');
const okazuApi=read('functions/api/admin/okazu-analytics.js');
const dashApi=read('functions/api/admin/central-dashboard.js');
const dashHtml=read('ops-dashboard.html');

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
has(intelApi,"'affiliate_click','affiliate_click_unified'",'affiliate click normalization missing');
has(intelApi,'クリックあり・成果0','revenue no-conversion rule missing');
has(intelApi,'高PV・クリック0','high-PV zero-click rule missing');
has(intelApi,'表示ありCTR低','low affiliate CTR rule missing');
has(intelApi,'CTA未到達','CTA reach rule missing');
has(intelApi,"c.site_key<>'car-bike'",'vehicle D1 de-duplication missing');

has(okazuApi,'safeQuery','Okazu resilient query helper missing');
has(dashApi,'filtered_automated_pv','automated traffic exclusion summary missing');
has(dashHtml,'全ASP 実収益','actual earnings panel missing');
has(dashHtml,'SEO成果・インデックス管理','SEO panel missing');
has(dashHtml,'収益改善の自動ランキング','automatic revenue ranking panel missing');

console.log('Ops dashboard contract QA passed.');
