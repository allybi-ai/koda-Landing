/* Native scroll reveals Allybi's panels. The finite generation preview uses
   the app's waiting indicator; no wheel capture or permanent animation loop. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.mount(root);
}(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  var clamp = function (n) { return Math.max(0, Math.min(1, n)); };
  function smooth(n) { n = clamp(n); return n * n * n * (n * (n * 6 - 15) + 10); }
  function revealState(progress) {
    var p = clamp(progress);
    return {
      source: smooth((p - .24) / .24),
      document: smooth((p - .48) / .18),
      send: smooth((p - .54) / .12),
      thread: smooth((p - .54) / .14),
      workspace: smooth((p - .70) / .14),
      draft: smooth((p - .90) / (1 - .90))
    };
  }
  function generationState(elapsed) {
    return {
      loading: smooth(elapsed / 120) * (1 - smooth((elapsed - 1250) / 150)),
      answer: smooth((elapsed - 1400) / 400)
    };
  }
  function mount(win) {
    var section = win.document.querySelector('#home-integrations-flow.product-reveal');
    if (!section) return;
    var reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
    var desktop = win.matchMedia('(min-width: 901px) and (min-height: 650px)');
    var source = section.querySelector('[data-product-panel="source"]');
    var context = section.querySelector('[data-product-panel="workspace"]');
    var question = section.querySelector('.product-reveal__question');
    var frame = 0, visible = true, current = 0, previousTime = 0, started = null;
    function set(name, value) { section.style.setProperty('--' + name, value.toFixed(4)); }
    function render(time) {
      frame = 0;
      if (reduced.matches) return;
      var now = time === undefined ? (win.performance ? win.performance.now() : 0) : time;
      var height = win.innerHeight;
      var box = section.getBoundingClientRect();
      var questionTop = question.getBoundingClientRect().top;
      if (box.top > height) { started = null; current = 0; }
      if (started === null && questionTop >= 0 && questionTop < height * .84) started = now;
      var elapsed = started === null ? 0 : Math.max(0, now - started);
      var generating = started !== null && elapsed < 1800;
      var generation = generationState(elapsed);
      set('answer', generation.answer); set('loading', generation.loading);
      section.dataset.generating = String(visible && generation.loading > 0);
      if (desktop.matches) {
        // Keep the answer's first reading frame even after a large scroll gesture.
        var target = elapsed < 1800 ? 0 : clamp(-box.top / (height * 1.36));
        var dt = Math.min(48, Math.max(8, now - previousTime || 16));
        current += (target - current) * (1 - Math.exp(-dt / 110));
        if (Math.abs(target - current) < .0003) current = target;
        var state = revealState(current);
        Object.keys(state).forEach(function (key) { set(key, state[key]); });
        set('arrival', smooth((height * .78 - box.top) / (height * .78)));
        if (current !== target) schedule();
      } else if (win.innerWidth <= 900) {
        // Every panel retains its readable dimensions on native mobile scroll.
        [ ['source', source], ['workspace', context] ].forEach(function (item) {
          set(item[0], smooth((height * .93 - item[1].getBoundingClientRect().top) / (height * .24)));
        });
        set('send', smooth((height * .98 - context.getBoundingClientRect().top) / (height * .24)));
        set('document', 0); set('thread', 0); set('draft', 1);
        set('arrival', 1);
      } else {
        ['source','workspace','send','arrival','document','thread','draft'].forEach(function (key) { set(key, 1); });
      }
      previousTime = now;
      if (generating) schedule();
    }
    function schedule() { if (!frame && visible && !reduced.matches) frame = win.requestAnimationFrame(render); }
    function sync() {
      previousTime = 0;
      section.dataset.motion = reduced.matches ? 'false' : 'true';
      if (reduced.matches) {
        win.cancelAnimationFrame(frame); frame = 0; section.dataset.generating = 'false';
        ['answer','source','workspace','send','arrival','document','thread','draft'].forEach(function (key) { set(key, 1); });
        set('loading', 0);
      } else render();
    }
    win.addEventListener('scroll', schedule, { passive: true });
    win.addEventListener('resize', sync, { passive: true });
    reduced.addEventListener('change', sync);
    desktop.addEventListener('change', sync);
    if (win.IntersectionObserver) new win.IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) schedule();
      else { win.cancelAnimationFrame(frame); frame = 0; section.dataset.generating = 'false'; }
    }, { rootMargin: '0px' }).observe(section);
    sync();
  }
  return { revealState: revealState, generationState: generationState, mount: mount };
}));
