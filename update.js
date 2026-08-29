(() => {
  'use strict';

  // This file is intentionally non-blocking. It never creates a fullscreen layer.
  // The progression UI is loaded locally so the main menu remains fully interactive.
  const isNative = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!isNative) return;

  function loadLocalFeatureScript(src) {
    try {
      if ([...document.scripts].some(s => s.src.includes(src))) return;
      const script = document.createElement('script');
      script.src = `${src}?cacheBust=${Date.now()}`;
      script.async = false;
      script.onload = () => window.dispatchEvent(new Event('dontstop:features-ready'));
      script.onerror = () => {};
      document.head.appendChild(script);
    } catch {}
  }

  const boot = () => {
    // Never load gameplay overlays here. game.html does not include this script anymore.
    loadLocalFeatureScript('./levels20.js');
    loadLocalFeatureScript('./features.js');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
