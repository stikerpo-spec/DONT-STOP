(() => {
  'use strict';

  // Keep normal browser hit-testing. The previous capture listener stopped
  // pointer events before button/link handlers could receive them.
  const selectors = ['button','a','input','select','textarea','[role="button"]'];

  function refresh() {
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.touchAction = 'manipulation';
      if (el instanceof HTMLElement && !el.disabled) el.style.cursor = 'pointer';
    });

    document.querySelectorAll('.overlay').forEach(overlay => {
      const visible = !overlay.classList.contains('hidden');
      overlay.style.pointerEvents = 'none';
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
