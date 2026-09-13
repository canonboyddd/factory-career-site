(() => {
  const cfg = window.SITE_CONFIG || {};
  const programs = cfg.affiliatePrograms || {};

  document.querySelectorAll('[data-program-card]').forEach(card => {
    const key = card.dataset.programCard;
    const program = programs[key] || {};
    const url = String(program.url || '').trim();
    if (!url) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    card.querySelectorAll('[data-program-link]').forEach(link => {
      link.href = url;
      link.target = '_blank';
      link.rel = 'sponsored nofollow noopener';
    });
    card.querySelectorAll('[data-program-name]').forEach(el => {
      if (program.name) el.textContent = program.name;
    });
  });

  document.querySelectorAll('[data-offer-grid]').forEach(grid => {
    const visible = [...grid.children].filter(el => !el.hidden);
    if (!visible.length) {
      const section = grid.closest('[data-offer-section]');
      if (section) section.hidden = true;
    }
  });
})();
