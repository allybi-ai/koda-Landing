/**
 * Thin homepage coordinator.
 *
 * It owns only the shared capability decision, header measurement, declarative
 * image preloads, and normalized handoff events. Each chapter retains its own
 * scroll geometry and timeline.
 */
(function (root, factory) {
  'use strict';

  var exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root && root.document) {
    root.AllybiHomepageCoordinator = exported.createCoordinator(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MIN_WIDTH = 1180;
  var MIN_HEIGHT = 732;
  var VIEW_TIMELINE_FEATURES = [
    'animation-timeline: view()',
    'view-timeline-name: --home-chapter',
    'animation-range: entry 0% exit 100%',
    'animation-range: exit-crossing 0% exit-crossing 100%'
  ];

  function supportsViewTimeline(scope) {
    var css = scope && scope.CSS;
    return Boolean(
      css &&
      typeof css.supports === 'function' &&
      VIEW_TIMELINE_FEATURES.every(function (feature) {
        return css.supports(feature);
      })
    );
  }

  function capabilityFrom(state) {
    return Number(state && state.width) >= MIN_WIDTH &&
      Number(state && state.height) >= MIN_HEIGHT &&
      state && state.reduced === false &&
      state.supported === true;
  }

  function createCoordinator(win) {
    var doc = win.document;
    var root = doc.documentElement;
    var viewport = win.matchMedia(
      '(min-width: ' + MIN_WIDTH + 'px) and (min-height: ' + MIN_HEIGHT + 'px)'
    );
    var reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
    var current = null;
    var preloadUrls = new Set();
    var headerObserver = null;

    function readCapability() {
      return capabilityFrom({
        width: win.innerWidth,
        height: win.innerHeight,
        reduced: reduced.matches,
        supported: supportsViewTimeline(win)
      });
    }

    function dispatch(name, detail) {
      try {
        doc.dispatchEvent(new win.CustomEvent(name, { detail: detail }));
      } catch (_error) {}
    }

    function syncCapability() {
      var next = readCapability();
      root.dataset.homeCinematicCapable = next ? 'true' : 'false';
      root.classList.toggle('has-home-cinematic-capability', next);
      if (current === next) return next;
      current = next;
      dispatch('allybi:cinematic-capability-change', { capable: next });
      return next;
    }

    function measureHeader() {
      var header = doc.querySelector('#allybi-header, .allybi-header, header');
      var height = header ? header.offsetHeight : 64;
      root.style.setProperty('--site-header-height', Math.max(0, height || 0) + 'px');
      return height;
    }

    function observeHeader() {
      var header = doc.querySelector('#allybi-header, .allybi-header, header');
      measureHeader();
      if (!header || !win.ResizeObserver) return;
      headerObserver = new win.ResizeObserver(measureHeader);
      headerObserver.observe(header);
    }

    function preload(urls) {
      (Array.isArray(urls) ? urls : [urls]).forEach(function (url) {
        if (!url || preloadUrls.has(url)) return;
        preloadUrls.add(url);
        var link = doc.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        link.setAttribute('data-home-coordinator-preload', '');
        doc.head.appendChild(link);
      });
    }

    function recordHandoff(chapter, event) {
      root.dataset.homeJourneyHandoff = chapter;
      dispatch('allybi:homepage-handoff', {
        chapter: chapter,
        source: event && event.target ? event.target.id || '' : '',
        detail: event && event.detail ? event.detail : null
      });
    }

    function onPreload(event) {
      preload(event && event.detail ? event.detail.urls : []);
    }

    function addMediaListener(query, listener) {
      if (query.addEventListener) query.addEventListener('change', listener);
      else if (query.addListener) query.addListener(listener);
    }

    addMediaListener(viewport, syncCapability);
    addMediaListener(reduced, syncCapability);
    win.addEventListener('resize', syncCapability, { passive: true });
    doc.addEventListener('allybi:homepage-preload', onPreload);
    doc.addEventListener('allybi:find-gap-handoff', function (event) {
      recordHandoff('find-gap', event);
    });
    // The flow chapter is now a static code-native scene and no longer emits a
    // handoff; only the live cinematic chapters retain their coordinator wiring.
    doc.addEventListener('allybi:integrations-handoff', function (event) {
      recordHandoff('integrations', event);
    });

    syncCapability();
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', observeHeader, { once: true });
    } else {
      observeHeader();
    }

    return {
      MIN_WIDTH: MIN_WIDTH,
      MIN_HEIGHT: MIN_HEIGHT,
      isCapable: function () { return current === true; },
      refresh: syncCapability,
      measureHeader: measureHeader,
      preload: preload
    };
  }

  return {
    MIN_WIDTH: MIN_WIDTH,
    MIN_HEIGHT: MIN_HEIGHT,
    supportsViewTimeline: supportsViewTimeline,
    capabilityFrom: capabilityFrom,
    createCoordinator: createCoordinator
  };
}));
