(() => {
  const cfg = window.SITE_CONFIG || {};
  const programs = cfg.affiliatePrograms || {};
  const path = location.pathname.replace(/\/index(?:\.html)?$/i, '/');

  function ensureCss(){
    if(document.querySelector('link[data-benchmark-layout]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/assets/benchmark-layout.css';
    link.dataset.benchmarkLayout='';
    document.head.appendChild(link);
  }

  function cleanInternal(href){
    try{
      const u=new URL(href,location.href);
      if(u.origin!==location.origin) return href;
      if(/\/index\.html$/i.test(u.pathname)) u.pathname=u.pathname.replace(/\/index\.html$/i,'/');
      else if(/\.html$/i.test(u.pathname)) u.pathname=u.pathname.replace(/\.html$/i,'');
      return u.pathname+u.search+u.hash;
    }catch(_){return href;}
  }

  function bindAffiliate(link,key,placement){
    const p=programs[key]||{};
    const url=String(p.url||'').trim();
    if(!url) return false;
    link.href=url;
    link.target='_blank';
    link.rel='sponsored nofollow noopener';
    link.referrerPolicy=p.referrerPolicy||'no-referrer-when-downgrade';
    link.addEventListener('click',()=>window.trackSiteEvent?.('affiliate_click',{program:key,page:location.pathname,placement}));
    return true;
  }

  function addPixel(card,key){
    const p=programs[key]||{};
    const pixel=String(p.impressionPixel||'').trim();
    if(!pixel||card.querySelector('[data-benchmark-pixel]')) return;
    const img=document.createElement('img');
    img.src=pixel;img.width=1;img.height=1;img.alt='';img.decoding='async';img.dataset.benchmarkPixel='';
    img.referrerPolicy=p.referrerPolicy||'no-referrer-when-downgrade';
    img.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;';
    card.appendChild(img);
  }

  function homeBenchmark(){
    const isHome=path==='/' || path==='/index.html';
    if(!isHome || document.querySelector('[data-benchmark-home]')) return;
    const anchor=document.querySelector('.entry-section') || document.querySelector('.home-hero');
    if(!anchor) return;

    const sec=document.createElement('section');
    sec.className='benchmark-section';
    sec.dataset.benchmarkHome='';
    sec.innerHTML=`<div class="container"><div class="benchmark-head"><div><span class="eyebrow">30秒で次の行動を選ぶ</span><h2>今の段階に合う入口だけを見る</h2></div><p>比較サイトでよく使われる「先に結論→目的別→詳細」の流れを、製造業向けに整理しました。転職を決めていない人は診断からで大丈夫です。</p></div><div class="benchmark-grid"><article class="benchmark-card"><span class="benchmark-label">まだ迷っている</span><strong>まず条件を整理</strong><p>夜勤・年収・仕事内容・将来性を7問で整理し、変えたい条件を先に決めます。</p><a class="btn btn-secondary" href="/diagnosis">3分で無料診断 →</a></article><article class="benchmark-card is-primary" data-benchmark-program="makersJob"><span class="benchmark-label">製造業経験を活かす</span><span class="pr-label">PR</span><strong>メーカー・製造業の転職支援を確認</strong><p>今の経験を活かしながら、会社・勤務条件・仕事内容を変えたい人向け。</p><a class="btn btn-primary" data-affiliate-shortlist>サービス内容を確認 →</a></article><article class="benchmark-card is-premium" data-benchmark-program="samuraiJob"><span class="benchmark-label">専門職・年収を重視</span><span class="pr-label">PR</span><strong>技術職・専門職向けの求人を確認</strong><p>生産技術・設計・品質・保全など、経験と役割を活かして比較したい人向け。</p><a class="btn btn-secondary" data-affiliate-shortlist>サービス内容を確認 →</a></article></div><p class="benchmark-method">表示する提携サービスは承認済みのものだけです。順位付けはせず、目的との相性で分けています。詳しい比較基準は <a href="/editorial-policy">編集・広告ポリシー</a> と <a href="/articles/manufacturing-agent-guide">転職サービスの選び方</a> で確認できます。</p></div>`;

    anchor.insertAdjacentElement('afterend',sec);
    sec.querySelectorAll('[data-benchmark-program]').forEach(card=>{
      const key=card.dataset.benchmarkProgram;
      const link=card.querySelector('[data-affiliate-shortlist]');
      if(!bindAffiliate(link,key,'home_shortlist')){card.remove();return;}
      addPixel(card,key);
    });
    sec.querySelectorAll('a[href^="/"]').forEach(a=>{if(!a.hasAttribute('data-affiliate-shortlist')) a.setAttribute('href',cleanInternal(a.getAttribute('href')));});
  }

  function guideBenchmark(){
    if(!/\/articles\/manufacturing-agent-guide(?:\.html)?\/?$/i.test(location.pathname) || document.querySelector('[data-benchmark-guide]')) return;
    const article=document.querySelector('.article-main');
    if(!article) return;
    const lead=article.querySelector('.article-lead');
    const answer=article.querySelector('.answer-box');
    const insertion=answer || lead;
    if(!insertion) return;

    const box=document.createElement('section');
    box.className='benchmark-quick';
    box.dataset.benchmarkGuide='';
    box.innerHTML=`<span class="eyebrow">先に比較</span><h2>最初に見るのはこの3ルート</h2><p>上位の転職比較メディアで共通する「結論を先に見せる」構成を、ランキングではなく目的別に置き換えています。</p><div class="benchmark-axis"><span>職種</span><span>年収・役割</span><span>働き方</span><span>転職意欲</span></div><div class="benchmark-mini-grid"><div class="benchmark-mini-card"><strong>転職するかまだ迷う</strong><p>サービス登録より先に、変えたい条件だけ整理します。</p><a href="/diagnosis">7問の無料診断 →</a></div><div class="benchmark-mini-card" data-benchmark-program="makersJob"><span class="pr-label">PR</span><strong>製造業の中で条件を変えたい</strong><p>製造業経験を活かしながら、会社・勤務条件・仕事内容を比較。</p><a data-affiliate-shortlist>メーカーズジョブを確認 →</a></div><div class="benchmark-mini-card" data-benchmark-program="samuraiJob"><span class="pr-label">PR</span><strong>専門性・年収・役割を重視</strong><p>技術職・専門職としての経験を活かして求人を比較。</p><a data-affiliate-shortlist>Samurai Jobを確認 →</a></div></div></section>`;
    insertion.insertAdjacentElement('afterend',box);
    box.querySelectorAll('[data-benchmark-program]').forEach(card=>{
      const key=card.dataset.benchmarkProgram;
      const link=card.querySelector('[data-affiliate-shortlist]');
      if(!bindAffiliate(link,key,'guide_quick_compare')){card.remove();return;}
      addPixel(card,key);
    });
    box.querySelectorAll('a[href^="/"]').forEach(a=>a.setAttribute('href',cleanInternal(a.getAttribute('href'))));
  }

  function addComparisonNav(){
    if(document.querySelector('[data-benchmark-nav]')) return;
    const pageIsGuide=/\/articles\/manufacturing-agent-guide(?:\.html)?\/?$/i.test(location.pathname);
    if(!pageIsGuide) return;
    const h1=document.querySelector('.article-main h1');
    if(!h1) return;
    const nav=document.createElement('nav');
    nav.dataset.benchmarkNav='';
    nav.setAttribute('aria-label','このページの比較ポイント');
    nav.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 22px';
    nav.innerHTML='<a class="quick-link" href="#benchmark-top">先に比較</a><a class="quick-link" href="#services">利用できるサービス</a><a class="quick-link" href="#selection">選び方</a><a class="quick-link" href="#faq">よくある質問</a>';
    h1.insertAdjacentElement('afterend',nav);
    const quick=document.querySelector('[data-benchmark-guide]'); if(quick) quick.id='benchmark-top';
    const offer=document.querySelector('.offer-section'); if(offer&&!offer.id) offer.id='services';
    const hs=[...document.querySelectorAll('.article-main h2')];
    const selection=hs.find(h=>/転職サービスは|選び方|役割/.test(h.textContent)); if(selection&&!selection.id) selection.id='selection';
    const faq=hs.find(h=>/よくある質問/.test(h.textContent)); if(faq&&!faq.id) faq.id='faq';
  }

  ensureCss();
  homeBenchmark();
  guideBenchmark();
  requestAnimationFrame(addComparisonNav);
})();
