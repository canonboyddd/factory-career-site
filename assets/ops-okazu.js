(()=>{
  const tokenKey='factory_admin_token';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n||0).toLocaleString('ja-JP');
  const pct=n=>`${Number(n||0).toFixed(2)}%`;
  const token=()=>sessionStorage.getItem(tokenKey)||'';
  const days=()=>Number(document.querySelector('[data-days].active')?.dataset.days||7);
  let busy=false;

  function empty(cols,text='まだデータがありません。'){return `<tr><td colspan="${cols}" class="muted">${esc(text)}</td></tr>`}
  function ctaLabel(v){return ({product_top:'商品上部',product_middle:'商品中部',product_bottom:'商品下部',ranking_cta:'ランキング',subscription_cta:'見放題',affiliate_link:'その他リンク'})[v]||v||'不明'}
  function deviceLabel(v){return ({mobile:'スマホ',tablet:'タブレット',desktop:'PC',unknown:'不明'})[v]||v||'不明'}

  function ensurePanel(){
    if($('okazuAnalyticsPanel'))return true;
    const anchor=document.querySelector('.seo-panel')||document.querySelector('.revenue-panel')||document.querySelector('.qa-panel');
    if(!anchor)return false;
    const panel=document.createElement('section');
    panel.id='okazuAnalyticsPanel';
    panel.className='panel okazu-analytics-panel';
    panel.innerHTML=`
      <div class="heading"><div><span class="kicker">OKAZU AFFILIATE</span><h2>おかずよりどりみどり 売上導線</h2><p class="muted">女優・ジャンル・メーカーからFANZAへ進んだクリックを、CTA位置・端末まで分解します。商品詳細を経由したクリックも元の一覧ページへ帰属します。</p></div><span id="okazuUpdated" class="muted"></span></div>
      <div id="okazuMetrics" class="intelligence-metrics"></div>
      <div class="grid okazu-grid">
        <section class="revenue-box"><h3>女優別CTR</h3><div class="tablewrap"><table><thead><tr><th>女優</th><th>PV</th><th>クリック</th><th>CTR</th></tr></thead><tbody id="okazuActressRows"></tbody></table></div></section>
        <section class="revenue-box"><h3>ジャンル別CTR</h3><div class="tablewrap"><table><thead><tr><th>ジャンル</th><th>PV</th><th>クリック</th><th>CTR</th></tr></thead><tbody id="okazuGenreRows"></tbody></table></div></section>
        <section class="revenue-box"><h3>メーカー別CTR</h3><div class="tablewrap"><table><thead><tr><th>メーカー</th><th>PV</th><th>クリック</th><th>CTR</th></tr></thead><tbody id="okazuMakerRows"></tbody></table></div></section>
        <section class="revenue-box"><h3>CTA位置別クリック</h3><div class="tablewrap"><table><thead><tr><th>位置</th><th>クリック</th><th>セッション</th></tr></thead><tbody id="okazuCtaRows"></tbody></table></div></section>
        <section class="revenue-box"><h3>端末別クリック</h3><div class="tablewrap"><table><thead><tr><th>端末</th><th>クリック</th><th>セッション</th></tr></thead><tbody id="okazuDeviceRows"></tbody></table></div></section>
        <section class="revenue-box"><h3>クリック元ページ</h3><div class="tablewrap"><table><thead><tr><th>ページ</th><th>種別</th><th>クリック</th></tr></thead><tbody id="okazuSourceRows"></tbody></table></div></section>
      </div>
      <p class="muted okazu-note">CTRは各女優・ジャンル・メーカー詳細ページのPVを分母にしています。商品詳細経由のFANZAクリックは直前の一覧コンテキストを最大2時間保持して帰属します。</p>`;
    anchor.parentNode.insertBefore(panel,anchor);
    if(!$('okazu-analytics-style')){
      const style=document.createElement('style');
      style.id='okazu-analytics-style';
      style.textContent='.okazu-analytics-panel{border-color:#f9a8d4}.okazu-analytics-panel .kicker{color:#be185d}.okazu-analytics-panel .money-positive{font-weight:900}.okazu-note{margin-top:14px}.okazu-grid .revenue-box{min-width:0}@media(max-width:900px){.okazu-grid{grid-template-columns:1fr}}';
      document.head.appendChild(style);
    }
    return true;
  }

  function entityRows(items){return (items||[]).slice(0,30).map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${fmt(x.views)}</td><td>${fmt(x.clicks)}</td><td><strong>${pct(x.ctr)}</strong></td></tr>`).join('')||empty(4,'計測データが貯まると表示します。')}

  function render(data){
    ensurePanel();
    const s=data.summary||{};
    if($('okazuUpdated'))$('okazuUpdated').textContent=`更新 ${new Date(data.generated_at).toLocaleString('ja-JP')}`;
    if($('okazuMetrics'))$('okazuMetrics').innerHTML=[
      ['PV',fmt(s.page_views)],['セッション',fmt(s.sessions)],['商品遷移',fmt(s.product_opens)],['FANZAクリック',fmt(s.affiliate_clicks)],['クリックセッション',fmt(s.affiliate_sessions)],['100PVあたりクリック',Number(s.clicks_per_100_pv||0).toFixed(2)]
    ].map(([l,v])=>`<div class="intel-metric"><span>${l}</span><strong>${v}</strong></div>`).join('');
    if($('okazuActressRows'))$('okazuActressRows').innerHTML=entityRows(data.actresses);
    if($('okazuGenreRows'))$('okazuGenreRows').innerHTML=entityRows(data.genres);
    if($('okazuMakerRows'))$('okazuMakerRows').innerHTML=entityRows(data.makers);
    if($('okazuCtaRows'))$('okazuCtaRows').innerHTML=(data.cta_positions||[]).map(x=>`<tr><td><strong>${esc(ctaLabel(x.cta_position))}</strong><br><span class="muted">${esc(x.cta_position)}</span></td><td>${fmt(x.clicks)}</td><td>${fmt(x.sessions)}</td></tr>`).join('')||empty(3);
    if($('okazuDeviceRows'))$('okazuDeviceRows').innerHTML=(data.devices||[]).map(x=>`<tr><td><strong>${esc(deviceLabel(x.device_type))}</strong></td><td>${fmt(x.clicks)}</td><td>${fmt(x.sessions)}</td></tr>`).join('')||empty(3);
    if($('okazuSourceRows'))$('okazuSourceRows').innerHTML=(data.source_pages||[]).slice(0,30).map(x=>`<tr><td><strong>${esc(x.source_page)}</strong></td><td>${esc(x.source_type||'')}</td><td>${fmt(x.clicks)}</td></tr>`).join('')||empty(3);
  }

  async function load(){
    if(!ensurePanel()||busy)return;
    const t=token();
    if(!t)return;
    busy=true;
    try{
      if($('okazuUpdated'))$('okazuUpdated').textContent='集計中…';
      const res=await fetch(`/api/admin/okazu-analytics?days=${days()}&v=1`,{headers:{authorization:'Bearer '+t},cache:'no-store'});
      let data={};try{data=await res.json()}catch{}
      if(!res.ok||!data.ok){if($('okazuUpdated'))$('okazuUpdated').textContent=`取得エラー: ${data.error||`HTTP ${res.status}`}`;return}
      render(data);
    }finally{busy=false}
  }

  function init(){
    ensurePanel();
    document.addEventListener('click',e=>{if(e.target.closest('#load,#refresh,[data-days]'))setTimeout(load,120)});
    if(token())setTimeout(load,260);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.loadOkazuAnalytics=load;
})();
