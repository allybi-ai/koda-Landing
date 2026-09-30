/**
 * Home hero — deterministic source-rail reveal controller.
 *
 * When the shared cinematic capability gate passes, the hero becomes a sticky
 * runway whose view-timeline flies the five real source icons in from dispersed
 * positions and settles them into one evenly spaced horizontal rail. Otherwise
 * the hero is the complete static rail authored in CSS (the same markup, no
 * hidden duplicate layer).
 *
 * Geometry and mode only change while the reader is at the safe top boundary,
 * so a live resize or capability flip never shifts content under the reader.
 * There is no composer, no product frame, and no idle animation loop — only the
 * scroll-linked convergence.
 */
(function() {
  'use strict';

  var root = document.documentElement;
  var hero = document.querySelector('.home-hero');
  if (!hero) return;

  var timeline = window.AllybiHeroTimeline || {
    runwayHeight: function(height) { return Math.round(height * 2); }
  };
  var coordinator = window.AllybiHomepageCoordinator;
  var cinematicQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 1180px) and (min-height: 732px) and (prefers-reduced-motion: no-preference)')
    : null;
  var supportsViewTimeline = Boolean(
    window.CSS &&
    typeof window.CSS.supports === 'function' &&
    window.CSS.supports('animation-timeline: view()') &&
    window.CSS.supports('view-timeline-name: --home-chapter') &&
    window.CSS.supports('animation-range: exit-crossing 0% exit-crossing 100%')
  );
  var resizeFrame = 0;

  hero.classList.add('is-revealed');

  function measureHeader() {
    if (coordinator && typeof coordinator.measureHeader === 'function') {
      coordinator.measureHeader();
      return;
    }
    var header = document.querySelector('#allybi-header, .allybi-header, header, .site-header');
    root.style.setProperty('--site-header-height', (header ? header.offsetHeight : 64) + 'px');
  }

  function isCapable() {
    if (coordinator && typeof coordinator.isCapable === 'function') return coordinator.isCapable();
    return Boolean(supportsViewTimeline && cinematicQuery && cinematicQuery.matches);
  }

  function readerIsAtSafeStartBoundary() {
    return window.scrollY <= Math.max(480, window.innerHeight * 0.6);
  }

  function latchHeaderHeight() {
    // Latch the sticky header's current (desktop) height alongside the runway
    // geometry. The header is 72px at >=1024px and 64px below it; the cinematic
    // gate is >=1180px, so an active runway is always established under a desktop
    // header. If eligibility is later lost while the reader is deep, the header is
    // held at this latched height (see html.home-hero-runway-locked in home.css)
    // so it does not shrink across the 1024px breakpoint and pull the whole page —
    // and therefore the next-section anchor — up under the reader.
    // Latch the sticky header's integer offsetHeight. The inner element carries
    // the true content box (72px); a fractional bounding rect can round up to 73
    // and shift the latched runway — and the next-section anchor — by a pixel.
    var inner = document.querySelector('.site-header__inner');
    var header = inner || document.querySelector('.site-header, #allybi-header, .allybi-header, header');
    if (header) root.style.setProperty('--home-hero-latched-header', header.offsetHeight + 'px');
  }

  function activate(refreshGeometry) {
    if (refreshGeometry || !hero.style.getPropertyValue('--home-hero-runway-height')) {
      hero.style.setProperty('--home-hero-runway-height', timeline.runwayHeight(window.innerHeight) + 'px');
      latchHeaderHeight();
    }
    if (root.classList.contains('has-cinematic-hero')) return;
    root.classList.remove('home-hero-fallback-ready');
    root.classList.add('has-cinematic-potential', 'has-cinematic-runway', 'has-cinematic-hero');
  }

  function release() {
    hero.style.removeProperty('--home-hero-runway-height');
    root.style.removeProperty('--home-hero-latched-header');
    if (!root.classList.contains('has-cinematic-hero') && root.classList.contains('home-hero-fallback-ready')) return;
    root.classList.remove('has-cinematic-potential', 'has-cinematic-runway', 'has-cinematic-hero');
    root.classList.add('home-hero-fallback-ready');
  }

  function lock() {
    // Deep eligibility loss (desktop -> tablet, low height, or reduced motion
    // while the reader is past the safe boundary): drop the live scroll
    // animation immediately but keep the already-latched runway geometry so the
    // reader's scroll position and the next-section anchor never shift. The
    // source rail reverts to its settled, fully painted static positions.
    if (!root.classList.contains('has-cinematic-hero')) return;
    root.classList.remove('has-cinematic-hero');
    root.classList.add('home-hero-runway-locked');
  }

  function unlock() {
    root.classList.remove('home-hero-runway-locked');
  }

  function syncAnchorSuppression() {
    // Suppress root scroll anchoring only while the runway geometry is active
    // AND the hero still intersects the viewport. This keeps browser anchoring
    // from shifting scrollY mid-runway during a live breakpoint change, yet
    // removes the suppression the moment the hero scrolls out of view so later
    // sections own their normal finite anchor lifecycle. No timers, no perpetual
    // global suppression.
    if (root.classList.contains('has-cinematic-potential')) {
      var rect = hero.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        root.classList.add('home-hero-anchor-suppressed');
        return;
      }
    }
    root.classList.remove('home-hero-anchor-suppressed');
  }

  function syncCinematicMode(fromResize) {
    if (readerIsAtSafeStartBoundary()) {
      // Only at the safe top boundary may mode and runway geometry change. Any
      // temporary locked runway is fully released here before the normal
      // static/cinematic decision runs, so the reader lands on the correct hero.
      unlock();
      if (isCapable()) activate(fromResize === true);
      else release();
      syncAnchorSuppression();
      return;
    }
    // Deep in the page: never touch latched geometry, and never re-enable motion
    // (if eligibility returns while deep it stays static until the top). Only a
    // live cinematic hero that just lost eligibility is latched into the static
    // locked runway.
    if (!isCapable()) lock();
    syncAnchorSuppression();
  }

  function onResize() {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(function() {
      resizeFrame = 0;
      measureHeader();
      syncCinematicMode(true);
    });
  }

  function observeMedia(query) {
    if (!query) return;
    if (typeof query.addEventListener === 'function') query.addEventListener('change', function() { syncCinematicMode(true); });
    else if (typeof query.addListener === 'function') query.addListener(function() { syncCinematicMode(true); });
  }

  measureHeader();
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', function() { syncCinematicMode(false); }, { passive: true });
  document.addEventListener('allybi:cinematic-capability-change', function() { syncCinematicMode(true); });
  observeMedia(cinematicQuery);

  syncCinematicMode(true);
})();
