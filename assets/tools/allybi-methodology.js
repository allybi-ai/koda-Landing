(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-dj-methodology]');
    if (!root) return;
    requestAnimationFrame(function () { root.setAttribute('data-dj-methodology-state', 'ready'); });
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView(reduced ? { block: 'start' } : { block: 'start', behavior: 'smooth' });
        try { target.focus({ preventScroll: true }); } catch (_error) { target.focus(); }
        history.replaceState(null, '', link.getAttribute('href'));
      });
    });
  });
})();
