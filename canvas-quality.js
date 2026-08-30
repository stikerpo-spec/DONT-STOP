(() => {
  'use strict';
  const canvas = document.getElementById('scene');
  if (!canvas) return;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      window.dispatchEvent(new Event('dontstop:canvas-resized'));
    }
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 80), { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resizeCanvas, { passive: true });
})();
