(() => {
  const SITE='https://factory-career-site.pages.dev';
  const path=window.location.pathname;
  const normalizedPath=path.replace(/\.html$/i,'').replace(/\/index$/i,'/');
  const file=path.split('/').pop()||'';
  const isArticlePath=path.includes('/articles/');
  const isArticleDetail=isArticlePath && file && file!=='index.html';
  const isArticleHub=isArticlePath && (!file || file==='index.html');
  const isToolHub=normalizedPath==='/tools/' || normalizedPath==='/tools';
  const hubPaths=new Set(['/workstyle-guide','/salary-guide','/career-guide','/job-change-guide','/site-map']);
  const isTopicHub=hubPaths.has(normalizedPath);

  function ensureMeta(selector, attrs){
    let el=document.head.querySelector(selector);
    if(!el){
      el=document.createElement('meta');
      Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
      document.head.appendChild(el);
    }
    return el;
  }

  function cleanAbsolute(value){
    try{
      const u=new URL(value,location.href);
      if(u.origin!==location.origin) return value;
      if(/\/index\.html$/i.test(u.pathname)) u.pathname=u.pathname.replace(/\/index\.html$/i,'/');
      else if(/\.html$/i.test(u.pathname)) u.pathname=u.pathname.replace(/\.html$/i,'');
      return SITE+u.pathname+u.search+u.hash;
    }catch(_){return value;}
  }

  function canonicalUrl(){
    const existing=document.querySelector('link[rel="canonical"]')?.href;
    if(existing) return cleanAbsolute(existing).split('#')[0];
    return SITE+normalizedPath;
  }

  function uniqueLinks(selector, limit=40){
    const seen=new Set();
    return [...document.querySelectorAll(selector)].filter(a=>{
      const href=a.getAttribute('href');
      if(!href || href.startsWith('#') || href.startsWith('javascript:')) return false;
      let url;
      try{ url=new URL(href,location.href); }catch(_){ return false; }
      if(url.origin!==location.origin) return false;
      const clean=cleanAbsolute(url.href).split('#')[0];
      if(seen.has(clean)) return false;
      seen.add(clean);
      return true;
    }).slice(0,limit);
  }

  function applySeo(){
    const canonical=canonicalUrl();
    const canonicalEl=document.querySelector('link[rel="canonical"]');
    if(canonicalEl) canonicalEl.href=canonical;
    const title=(document.title||'工場キャリア診断').trim();
    const h1=document.querySelector('h1')?.textContent.trim()||title;
    const description=document.querySelector('meta[name="description"]')?.content?.trim()||'';

    const robots=document.querySelector('meta[name="robots"]');
    if(!robots){
      const m=document.createElement('meta');
      m.name='robots';
      m.content='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
      document.head.appendChild(m);
    }else if(!/noindex/i.test(robots.content||'')){
      const rules=new Set((robots.content||'').split(',').map(v=>v.trim()).filter(Boolean));
      ['index','follow','max-image-preview:large','max-snippet:-1','max-video-preview:-1'].forEach(v=>rules.add(v));
      robots.content=[...rules].join(',');
    }

    const ogTitle=ensureMeta('meta[property="og:title"]',{property:'og:title',content:title});
    if(!ogTitle.content) ogTitle.content=title;
    const ogDesc=ensureMeta('meta[property="og:description"]',{property:'og:description',content:description});
    if(!ogDesc.content&&description) ogDesc.content=description;
    const ogUrl=ensureMeta('meta[property="og:url"]',{property:'og:url',content:canonical});
    ogUrl.content=canonical;
    const ogType=ensureMeta('meta[property="og:type"]',{property:'og:type',content:isArticleDetail?'article':'website'});
    ogType.content=isArticleDetail?'article':'website';
    ensureMeta('meta[property="og:site_name"]',{property:'og:site_name',content:'工場キャリア診断'});
    ensureMeta('meta[name="twitter:card"]',{name:'twitter:card',content:'summary'});

    document.querySelectorAll('.ad-note,.offer-section,.pr-box').forEach(el=>el.setAttribute('data-nosnippet',''));
    document.querySelectorAll('script[data-auto-schema],script[data-seo-schema-v2]').forEach(el=>el.remove());

    const orgId=SITE+'/#organization';
    const websiteId=SITE+'/#website';
    const webPageId=canonical+'#webpage';
    const graph=[
      {
        '@type':'Organization',
        '@id':orgId,
        name:'工場キャリア診断',
        url:SITE+'/',
        description:'製造業・工場勤務者向けに、転職判断・働き方・年収・職種別キャリア・応募準備を整理する情報サイト。'
      },
      {
        '@type':'WebSite',
        '@id':websiteId,
        url:SITE+'/',
        name:'工場キャリア診断',
        inLanguage:'ja',
        publisher:{'@id':orgId}
      }
    ];

    let pageType='WebPage';
    if(isArticleHub||isToolHub||isTopicHub) pageType='CollectionPage';
    if(normalizedPath==='/about') pageType='AboutPage';

    const webPage={
      '@type':pageType,
      '@id':webPageId,
      url:canonical,
      name:h1,
      description,
      inLanguage:'ja',
      isPartOf:{'@id':websiteId},
      about:{'@id':orgId}
    };
    graph.push(webPage);

    if(isArticleDetail){
      const section=(document.querySelector('.article-main .eyebrow')?.textContent||'').trim();
      const article={
        '@type':'Article',
        '@id':canonical+'#article',
        mainEntityOfPage:{'@id':webPageId},
        headline:h1,
        description,
        inLanguage:'ja',
        author:{'@type':'Organization','@id':orgId,name:'工場キャリア診断',url:SITE+'/about'},
        publisher:{'@id':orgId},
        isPartOf:{'@id':websiteId}
      };
      if(section&&section.length<=40) article.articleSection=section;
      graph.push(article);
    }

    const bc=document.querySelector('.breadcrumbs');
    if(bc){
      const items=[];
      [...bc.querySelectorAll('a')].forEach((a,i)=>{
        try{
          items.push({
            '@type':'ListItem',
            position:i+1,
            name:a.textContent.trim(),
            item:cleanAbsolute(new URL(a.getAttribute('href'),location.href).href)
          });
        }catch(_){ }
      });
      if(h1) items.push({'@type':'ListItem',position:items.length+1,name:h1,item:canonical});
      if(items.length>1) graph.push({'@type':'BreadcrumbList','@id':canonical+'#breadcrumb',itemListElement:items});
    }

    if(isArticleHub){
      const links=uniqueLinks('[data-seo-priority-hub] a, .core-guide-hub a',12);
      if(links.length){
        graph.push({
          '@type':'ItemList',
          '@id':canonical+'#priority-guides',
          name:'製造業・工場勤務の重要ガイド',
          itemListElement:links.map((a,i)=>({
            '@type':'ListItem',position:i+1,
            name:a.textContent.trim().replace(/\s+/g,' '),
            url:cleanAbsolute(new URL(a.getAttribute('href'),location.href).href)
          }))
        });
      }
    }

    if(isTopicHub){
      const links=uniqueLinks('main a[href*="/articles/"], main a[href^="articles/"]',30);
      if(links.length){
        const listId=canonical+'#related-guides';
        graph.push({
          '@type':'ItemList',
          '@id':listId,
          name:h1+' 関連ガイド',
          numberOfItems:links.length,
          itemListElement:links.map((a,i)=>({
            '@type':'ListItem',
            position:i+1,
            name:a.textContent.trim().replace(/\s+/g,' '),
            url:cleanAbsolute(new URL(a.getAttribute('href'),location.href).href)
          }))
        });
        webPage.mainEntity={'@id':listId};
      }
    }

    const script=document.createElement('script');
    script.type='application/ld+json';
    script.dataset.seoSchemaV2='';
    script.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});
    document.head.appendChild(script);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(applySeo,0),{once:true});
  }else{
    setTimeout(applySeo,0);
  }
})();