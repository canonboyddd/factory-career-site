(() => {
  const path=window.location.pathname;
  const hubs=[
    {href:'/workstyle-guide.html',icon:'🌙',title:'働き方・シフト',desc:'夜勤・交替勤務・残業・休日をまとめて整理'},
    {href:'/salary-guide.html',icon:'💴',title:'年収・給与',desc:'基本給・賞与・手当・年収アップを比較'},
    {href:'/career-guide.html',icon:'🛠️',title:'職種別キャリア',desc:'生産技術・品質・保全・設計・生産管理から探す'},
    {href:'/job-change-guide.html',icon:'📋',title:'転職準備',desc:'求人票・職務経歴書・面接・サービス選びを順番に進める'}
  ];

  function hubMarkup(){
    return `<div class="grid-2">${hubs.map(h=>`<a class="card" href="${h.href}"><div class="icon">${h.icon}</div><h3>${h.title}</h3><p>${h.desc}</p><strong>まとめて見る →</strong></a>`).join('')}</div>`;
  }

  if((path==='/'||path.endsWith('/index.html'))&&!document.querySelector('[data-discovery-hubs]')){
    const anchor=document.querySelector('#roles')||document.querySelector('[data-tool-home]');
    if(anchor){
      const sec=document.createElement('section');sec.className='section alt';sec.dataset.discoveryHubs='';
      sec.innerHTML=`<div class="container"><div class="section-head"><div><span class="eyebrow">テーマ別まとめ</span><h2>悩みをまとめて探す</h2></div><p>細かい記事へ進む前に、近いテーマをまとめて比較できます。</p></div>${hubMarkup()}</div>`;
      anchor.parentNode.insertBefore(sec,anchor);
    }
  }

  if((path==='/articles/'||path.endsWith('/articles/index.html'))&&!document.querySelector('[data-discovery-hubs]')){
    const hub=document.querySelector('[data-core-guide-hub]');
    if(hub){
      const sec=document.createElement('section');sec.className='core-guide-hub';sec.dataset.discoveryHubs='';
      sec.innerHTML=`<div class="core-guide-heading"><span class="eyebrow">TOPIC HUBS</span><h2>4つのテーマからまとめて探す</h2><p>働き方、年収、職種、転職準備の4方向から関連記事をまとめています。</p></div>${hubMarkup()}`;
      hub.insertAdjacentElement('afterend',sec);
    }
  }

  if(path.includes('/articles/')&&!path.endsWith('/articles/')&&!path.endsWith('/articles/index.html')&&!document.querySelector('[data-topic-hub-links]')){
    const article=document.querySelector('.article-main');
    if(article){
      const box=document.createElement('section');box.className='internal-link-hub';box.dataset.topicHubLinks='';
      box.innerHTML=`<div class="internal-link-head"><span class="eyebrow">テーマ別まとめ</span><h2>関連テーマを広く見る</h2><p>近い悩みを横断して比較できます。</p></div><div class="internal-link-grid">${hubs.slice(0,3).map(h=>`<a class="internal-link-card" href="${h.href}"><strong>${h.icon} ${h.title}</strong><span>${h.desc}</span><b>まとめて見る →</b></a>`).join('')}</div>`;
      const service=article.querySelector('[data-service-bridge]');
      if(service) article.insertBefore(box,service); else article.appendChild(box);
    }
  }

  const footer=document.querySelector('.footer .container');
  if(footer&&!footer.querySelector('[data-html-sitemap-link]')){
    const p=document.createElement('p');p.dataset.htmlSitemapLink='';p.style.fontSize='13px';
    p.innerHTML='<a href="/site-map.html">サイトマップ</a> ・ <a href="/workstyle-guide.html">働き方</a> ・ <a href="/salary-guide.html">年収</a> ・ <a href="/career-guide.html">職種</a> ・ <a href="/job-change-guide.html">転職準備</a>';
    footer.appendChild(p);
  }
})();