(() => {
  const cfg=window.SITE_CONFIG||{};
  const programs=cfg.affiliatePrograms||{};
  const page=window.location.pathname.split('/').pop()||'';
  const priority=cfg.articleProgramPriority?.[page]||[];

  document.querySelectorAll('.offer-grid').forEach(grid=>{
    const cards=[...grid.querySelectorAll('[data-program-card]')];
    cards.forEach(card=>{
      const key=card.dataset.programCard;
      const program=programs[key]||{};
      const url=String(program.url||'').trim();
      if(!url){card.hidden=true;return;}
      card.hidden=false;
      card.dataset.programKey=key;
      card.querySelectorAll('[data-program-link]').forEach(link=>{
        link.href=url;
        link.target='_blank';
        link.rel='sponsored nofollow noopener';
        link.referrerPolicy=program.referrerPolicy||'no-referrer-when-downgrade';
        link.addEventListener('click',()=>window.trackSiteEvent?.('affiliate_click',{program:key,page:window.location.pathname,placement:'offer_card'}));
      });
      card.querySelectorAll('[data-program-name]').forEach(el=>{if(program.name)el.textContent=program.name;});

      const pixel=String(program.impressionPixel||'').trim();
      if(pixel&&!card.querySelector('[data-affiliate-impression]')){
        const img=document.createElement('img');
        img.src=pixel;
        img.width=1;
        img.height=1;
        img.alt='';
        img.decoding='async';
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
  });

  document.querySelectorAll('[data-offer-grid]').forEach(grid=>{
    const visible=[...grid.children].filter(el=>!el.hidden);
    if(!visible.length){const section=grid.closest('[data-offer-section]');if(section)section.hidden=true;}
  });
})();
