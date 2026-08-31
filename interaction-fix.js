(() => {
  'use strict';

  // Keep browser hit-testing completely native. Never intercept, cancel,
  // or re-dispatch pointer/touch/click events.
  function refresh() {
    document.querySelectorAll('button,a,input,select,textarea,[role="button"]').forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.touchAction = 'manipulation';
      if (el instanceof HTMLElement && !el.disabled) el.style.cursor = 'pointer';
    });

    document.querySelectorAll('.overlay').forEach(overlay => {
      const visible = !overlay.classList.contains('hidden');
      overlay.style.pointerEvents = visible ? 'none' : 'none';
      const card = overlay.querySelector('.card');
      if (card) card.style.pointerEvents = visible ? 'auto' : 'none';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  } else {
    refresh();
  }
  window.addEventListener('pageshow', refresh);
})();
