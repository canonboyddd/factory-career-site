(() => {
  const revealRakutenCards = () => {
    document.querySelectorAll('[data-rakuten-grid]').forEach(grid => {
      grid.style.setProperty('display', 'grid', 'important');
      grid.style.setProperty('visibility', 'visible', 'important');
      grid.style.setProperty('opacity', '1', 'important');
      grid.style.setProperty('height', 'auto', 'important');
      grid.style.setProperty('overflow', 'visible', 'important');

      const cards = [...grid.querySelectorAll('.rakuten-product')];
      cards.forEach(card => {
        card.hidden = false;
        card.removeAttribute('hidden');
        card.removeAttribute('data-program-card');
        card.dataset.rakutenProductCard = '';
        card.style.setProperty('display', 'flex', 'important');
        card.style.setProperty('visibility', 'visible', 'important');
        card.style.setProperty('opacity', '1', 'important');
        card.style.setProperty('height', 'auto', 'important');
        card.style.setProperty('min-height', '360px', 'important');
        card.style.setProperty('position', 'relative', 'important');
      });

      if (cards.length) {
        const root = grid.closest('[data-rakuten-widget]') || grid.parentElement;
        const status = root?.querySelector('[data-rakuten-status]');
        if (status) status.textContent = `楽天市場の商品を${cards.length}件表示中。価格・在庫は販売ページで最新情報をご確認ください。`;
      }
    });
  };

  const observer = new MutationObserver(revealRakutenCards);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revealRakutenCards, { once: true });
  } else {
    revealRakutenCards();
  }
  setTimeout(revealRakutenCards, 500);
  setTimeout(revealRakutenCards, 1500);
  setTimeout(revealRakutenCards, 3500);
})();
