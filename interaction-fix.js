(() => {
  'use strict';

  // Final UI interaction guard. It only fixes hit-testing; game logic stays untouched.
  const UI_SELECTOR = [
    'button',
    'a',
    '[role="button"]',
    'input',
    'select',
    'textarea',
    '.level-btn',
    '.avatar-btn',
    '.ds-feature-btn',
    '.top-btn',
    '.control',
    '.btn'
  ].join(',');

  function ensureUiHitTesting() {
    document.querySelectorAll(UI_SELECTOR).forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.touchAction = 'manipulation';
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') el.style.cursor = 'pointer';
    });

    const canvas = document.getElementById('scene');
    if (canvas) {
      // The canvas remains fully visible and receives gameplay input only where no UI is present.
      canvas.style.pointerEvents = 'auto';
    }

    const overlays = document.querySelectorAll('.overlay:not(.hidden)');
    overlays.forEach(overlay => {
      overlay.style.pointerEvents = 'none';
      const card = overlay.querySelector('.card');
      if (card) card.style.pointerEvents = 'auto';
    });
  }

  function routePointerTarget(event) {
    const target = event.target instanceof Element ? event.target.closest(UI_SELECTOR) : null;
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;

    // Make sure dynamically created controls also receive normal browser click dispatch.
    target.style.pointerEvents = 'auto';
    target.style.touchAction = 'manipulation';
  }

  ensureUiHitTesting();
  new MutationObserver(ensureUiHitTesting).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['class','style','disabled']});

  document.addEventListener('pointerdown', routePointerTarget, true);
  document.addEventListener('touchstart', routePointerTarget, {capture:true, passive:true});

  // Never let the full-screen canvas cancel a tap that started on a UI control.
  document.addEventListener('pointerdown', event => {
    const target = event.target instanceof Element ? event.target.closest(UI_SELECTOR) : null;
    if (target) event.stopPropagation();
  }, true);
})();
