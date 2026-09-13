(() => {
  const menu = document.querySelector('.menu-btn');
  const nav = document.querySelector('nav');
  if(menu && nav){ menu.addEventListener('click',()=>nav.classList.toggle('open')); }
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
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
