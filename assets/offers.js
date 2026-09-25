(() => {
  const cfg=window.SITE_CONFIG||{};
  const programs=cfg.affiliatePrograms||{};
  const page=window.location.pathname.split('/').pop()||'';
  const priority=cfg.articleProgramPriority?.[page]||[];
  const availablePriority=priority.filter(key=>String(programs[key]?.url||'').trim());

  const labels={
    makersJob:{type:'メーカー・製造業転職',desc:'製造業の経験を活かしながら、条件の違う求人を比較したい人向け。'},
    samuraiJob:{type:'専門職・年収重視',desc:'技術職・専門職としての経験を活かし、年収やポジションを重視して比較したい人向け。'},
    magicari:{type:'キャリア整理',desc:'異業種も含めて、今後のキャリアや転職軸を整理したい人向け。'},
    zen:{type:'退職サポート',desc:'転職先探しとは別に、退職手続きの支援が必要な段階の人向け。'}
  };

  if(availablePriority.length && !document.querySelector('.offer-grid')){
    const article=document.querySelector('.article-main');
    if(article){
      const section=document.createElement('section');
      section.className='offer-section';
      section.dataset.offerSection='';
      section.innerHTML='<h2>条件に合う転職支援を確認</h2><p>現在利用できる提携サービスだけを表示しています。対象者・サービス内容はリンク先の最新情報を確認してください。</p><div class="offer-grid" data-offer-grid></div><p class="offer-disclosure">PR：リンク経由の申込み等で当サイトが報酬を受け取る場合があります。</p>';
      const next=document.querySelector('.internal-link-hub');
      if(next&&next.parentNode===article) article.insertBefore(section,next); else article.appendChild(section);
    }
  }

  document.querySelectorAll('.offer-grid').forEach(grid=>{
    availablePriority.forEach(key=>{
      if(grid.querySelector(`[data-program-card="${key}"]`)) return;
      const meta=labels[key]||{type:'転職支援',desc:'条件に合うサービスか、最新の対象者・利用条件を確認してください。'};
      const card=document.createElement('div');
      card.className='offer-card';
      card.dataset.programCard=key;
      card.hidden=true;
      card.innerHTML=`<span class="offer-type">${meta.type}</span><span class="pr-label">PR</span><h3 data-program-name>${programs[key]?.name||''}</h3><p>${meta.desc}</p><a class="btn btn-secondary" data-program-link href="#">サービス内容を確認する</a>`;
      grid.appendChild(card);
    });
  });

  document.querySelectorAll('.offer-grid').forEach(grid=>{
    const cards=[...grid.querySelectorAll('[data-program-card]')];
    cards.forEach(card=>{
      const key=card.dataset.programCard;
      const program=programs[key]||{};
      const url=String(program.url||'').trim();
      if(!url){card.hidden=true;return;}
      card.hidden=false;
      card.dataset.programKey=key;
      if(!card.querySelector('.pr-label')){
        const type=card.querySelector('.offer-type');
        if(type){const pr=document.createElement('span');pr.className='pr-label';pr.textContent='PR';type.insertAdjacentElement('afterend',pr);}
      }
      card.querySelectorAll('[data-program-link]').forEach(link=>{
        link.href=url;
        link.target='_blank';
        link.rel='sponsored nofollow noopener';
        link.referrerPolicy=program.referrerPolicy||'no-referrer-when-downgrade';
        if(!link.dataset.trackingBound){
          link.dataset.trackingBound='';
          link.addEventListener('click',()=>window.trackSiteEvent?.('affiliate_click',{program:key,page:window.location.pathname,placement:'offer_card'}));
        }
      });
      card.querySelectorAll('[data-program-name]').forEach(el=>{if(program.name)el.textContent=program.name;});

      if(key==='zen' && program.banners?.large && !card.querySelector('[data-zen-banner]')){
        const banner=program.banners.large;
        const wrap=document.createElement('a');
        wrap.href=banner.url;
        wrap.target='_blank';
        wrap.rel='sponsored nofollow noopener';
        wrap.referrerPolicy=program.referrerPolicy||'no-referrer-when-downgrade';
        wrap.dataset.programLink='';
        wrap.dataset.zenBanner='';
        wrap.dataset.placement='zen_banner_300x250';
        wrap.style.cssText='display:block;text-align:center;margin:12px auto 14px;max-width:300px;';
        const img=document.createElement('img');
        img.src=banner.image;
        img.width=banner.width;
        img.height=banner.height;
        img.alt='ZENの退職代行';
        img.loading='lazy';
        img.decoding='async';
        img.style.cssText='display:block;max-width:100%;height:auto;margin:auto;';
        wrap.appendChild(img);
        const button=card.querySelector('[data-program-link]');
        if(button) button.before(wrap); else card.appendChild(wrap);
      }

      const pixel=String(program.impressionPixel||'').trim();
      if(pixel&&!card.querySelector('[data-affiliate-impression]')){
        const img=document.createElement('img');
        img.src=pixel;img.width=1;img.height=1;img.alt='';img.decoding='async';
        img.referrerPolicy=program.referrerPolicy||'no-referrer-when-downgrade';
        img.dataset.affiliateImpression='';
        img.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;';
        card.appendChild(img);
      }
    });

    if(priority.length){
      const ordered=cards.slice().sort((a,b)=>{
        const ai=priority.indexOf(a.dataset.programCard),bi=priority.indexOf(b.dataset.programCard);
        return (ai<0?999:ai)-(bi<0?999:bi);
      });
      ordered.forEach(card=>grid.appendChild(card));
    }
    const visible=[...grid.querySelectorAll('[data-program-card]')].filter(el=>!el.hidden);
    visible.forEach((card,i)=>card.classList.toggle('featured',i===0));
    const section=grid.closest('.offer-section');
    if(section && visible.length && !section.querySelector('.offer-disclosure')){
      const p=document.createElement('p');p.className='offer-disclosure';p.textContent='PR：リンク経由の申込み等で当サイトが報酬を受け取る場合があります。';section.appendChild(p);
    }
  });

  document.querySelectorAll('[data-offer-grid]').forEach(grid=>{
    const visible=[...grid.children].filter(el=>!el.hidden);
    if(!visible.length){const section=grid.closest('[data-offer-section]');if(section)section.hidden=true;}
  });
})();