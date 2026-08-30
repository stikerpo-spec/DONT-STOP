(() => {
  'use strict';
  const native = !location.hostname.endsWith('.github.io') && (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /Capacitor/i.test(navigator.userAgent));
  if (native) document.documentElement.classList.add('native', 'is-native-app');

  const markInteractive = () => {
    document.querySelectorAll('button,a,input,select,textarea,[role="button"]').forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.touchAction = 'manipulation';
      if (el instanceof HTMLElement) el.style.webkitTapHighlightColor = 'transparent';
    });
  };

  const neutralizeAccidentalLayers = () => {
    const vw = Math.max(1, innerWidth), vh = Math.max(1, innerHeight), area = vw * vh;
    for (const el of document.body?.querySelectorAll('*') || []) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.dataset.dsInteractionSafe === '1') continue;
      const cs = getComputedStyle(el);
      if (cs.pointerEvents === 'none') continue;
      if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
      const r = el.getBoundingClientRect();
      const covers = Math.max(0, r.width) * Math.max(0, r.height) > area * 0.90;
      const interactive = el.matches('button,a,input,select,textarea,[role="button"]') || Boolean(el.querySelector('button,a,input,select,textarea,[role="button"]'));
      const canvasOrGameOverlay = el.id === 'overlay' || el.classList.contains('overlay') || el.classList.contains('controls') || el.classList.contains('hud');
      if (covers && !interactive && !canvasOrGameOverlay) el.style.pointerEvents = 'none';
    }
  };

  const boot = () => {
    markInteractive();
    neutralizeAccidentalLayers();
    setTimeout(() => { markInteractive(); neutralizeAccidentalLayers(); }, 150);
    setTimeout(() => { markInteractive(); neutralizeAccidentalLayers(); }, 800);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('resize', () => { markInteractive(); neutralizeAccidentalLayers(); }, { passive: true });
})();
