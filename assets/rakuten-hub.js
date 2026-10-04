(() => {
  const root = document.querySelector('[data-rakuten-widget]');
  if (!root) return;

  const grid = root.querySelector('[data-rakuten-grid]');
  const status = root.querySelector('[data-rakuten-status]');
  const tabs = [...root.querySelectorAll('[data-rakuten-category]')];
  const money = value => Number(value || 0).toLocaleString('ja-JP');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const CACHE_TTL = 30 * 60 * 1000;
  const memoryCache = new Map();

  const categoryFromHash = () => {
    const key = location.hash.replace(/^#/, '');
    return tabs.some(x => x.dataset.rakutenCategory === key) ? key : (root.dataset.category || 'work');
  };

  const setActive = category => tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.rakutenCategory === category));
  const cacheKey = (category,hits) => `${category}:${hits}`;
  const readSession = key => {
    try {
      const raw=sessionStorage.getItem(`rakuten-hub:${key}`); if(!raw)return null;
      const v=JSON.parse(raw); if(!v?.data?.ok||Date.now()-Number(v.at||0)>CACHE_TTL){sessionStorage.removeItem(`rakuten-hub:${key}`);return null;}
      return v.data;
    } catch(_){return null;}
  };
  const writeSession=(key,data)=>{try{sessionStorage.setItem(`rakuten-hub:${key}`,JSON.stringify({at:Date.now(),data}));}catch(_){}};

  async function fetchData(category,hits,signal){
    const key=cacheKey(category,hits);
    const mem=memoryCache.get(key); if(mem&&Date.now()-mem.at<=CACHE_TTL)return mem.data;
    const stored=readSession(key); if(stored){memoryCache.set(key,{at:Date.now(),data:stored});return stored;}
    const res=await fetch(`/api/rakuten/items?category=${encodeURIComponent(category)}&hits=${hits}`,{cache:'default',signal});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok){const err=new Error(String(data.detail||data.error||`HTTP ${res.status}`).slice(0,180));err.status=res.status;err.data=data;throw err;}
    memoryCache.set(key,{at:Date.now(),data});writeSession(key,data);return data;
  }

  function render(data,category){
    const items=Array.isArray(data.items)?data.items:[];
    if(!items.length){status.textContent='現在表示できる商品がありません。';grid.innerHTML='';return;}
    const affiliateActive=data.affiliate_verified===true||data.affiliate_active===true;
    const affiliateFlag=affiliateActive?'1':'0';
    grid.innerHTML=items.map((item,index)=>`
      <article class="rakuten-product">
        <a class="rakuten-product-image" href="${esc(item.url)}" target="_blank" rel="nofollow ${affiliateActive?'sponsored ':''}noopener" data-rakuten-link data-affiliate-active="${affiliateFlag}" data-placement="rakuten_hub_${esc(category)}_image_${index+1}">
          ${item.image?`<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" decoding="async">`:'<span class="rakuten-no-image">画像準備中</span>'}
        </a>
        <div class="rakuten-product-body">
          <span class="rakuten-pr">${affiliateActive?'PR・楽天市場':'楽天市場'}</span>
          <h3>${esc(item.name)}</h3>
          <div class="rakuten-meta"><strong>¥${money(item.price)}</strong>${item.reviewCount?`<span>★ ${Number(item.reviewAverage||0).toFixed(1)} / ${money(item.reviewCount)}件</span>`:''}</div>
          ${item.shop?`<p class="rakuten-shop">${esc(item.shop)}</p>`:''}
          <a class="btn btn-primary rakuten-buy" href="${esc(item.url)}" target="_blank" rel="nofollow ${affiliateActive?'sponsored ':''}noopener" data-rakuten-link data-affiliate-active="${affiliateFlag}" data-placement="rakuten_hub_${esc(category)}_button_${index+1}">楽天市場で詳細を見る ↗</a>
        </div>
      </article>`).join('');
    status.textContent=`${data.label||'おすすめ商品'}を${items.length}件表示中。価格・在庫・送料は販売ページの最新情報をご確認ください。`;
    if(affiliateActive&&typeof window.trackSiteEvent==='function')items.forEach((_,index)=>window.trackSiteEvent('affiliate_offer_view',{program:'rakuten',placement:`rakuten_hub_${category}_${index+1}`}));
  }

  let controller=null;
  async function load(category){
    controller?.abort(); controller=new AbortController();
    setActive(category); status.textContent='楽天市場から商品を読み込み中…'; grid.innerHTML='';
    try{
      const timeout=setTimeout(()=>controller.abort(),12000);
      let data;
      try{data=await fetchData(category,Number(root.dataset.hits||8),controller.signal);}finally{clearTimeout(timeout);}
      render(data,category);
    }catch(error){
      if(error?.name==='AbortError'){status.textContent='商品情報の取得に時間がかかっています。時間をおいて再度お試しください。';return;}
      if(error?.status===429){status.textContent='商品情報が混み合っています。少し時間をおいて再度お試しください。';return;}
      if(error?.data?.setup_required){status.textContent='商品情報を現在表示できません。';return;}
      status.textContent='商品情報を一時的に取得できません。時間をおいて再度お試しください。';
    }
  }

  tabs.forEach(btn=>btn.addEventListener('click',()=>{
    const category=btn.dataset.rakutenCategory||'work';
    if(location.hash!==`#${category}`)history.replaceState(null,'',`${location.pathname}${location.search}#${category}`);
    load(category);
  }));
  addEventListener('hashchange',()=>load(categoryFromHash()));
  load(categoryFromHash());
})();
