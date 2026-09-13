(() => {
  const menu = document.querySelector('.menu-btn');
  const nav = document.querySelector('nav');
  if(menu && nav){ menu.addEventListener('click',()=>nav.classList.toggle('open')); }
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

  // ホームの悩み別記事セクションから、全記事一覧へ内部リンクを追加。
  const articleSection = document.querySelector('#articles .container');
  if(articleSection && !document.querySelector('[data-all-guides-link]')){
    const row = document.createElement('div');
    row.className = 'cta-row';
    row.style.marginTop = '28px';
    row.setAttribute('data-all-guides-link','');
    row.innerHTML = '<a class="btn btn-secondary" href="articles/">製造業・工場勤務の記事をすべて見る →</a>';
    articleSection.appendChild(row);
  }

  const ctaLinks = document.querySelectorAll('[data-affiliate-link]');
  ctaLinks.forEach(link=>{
    const url = window.SITE_CONFIG?.affiliateUrl || '';
    if(url){
      link.href = url;
      link.target = '_blank';
      link.rel = 'sponsored nofollow noopener';
    }else{
      link.href = 'diagnosis.html';
      link.removeAttribute('target');
      link.removeAttribute('rel');
      if(link.dataset.fallbackText) link.textContent = link.dataset.fallbackText;
    }
  });
})();
