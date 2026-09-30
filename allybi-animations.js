// allybi-animations.js v2.0 — Premium motion system
// Scroll reveals, parallax, counters, magnetic buttons, sticky sequences
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =========================================================================
  // 1. Scroll Reveal
  // =========================================================================
  function initReveal() {
    // Covers both the generic .allybi-reveal pattern and page-scoped patterns
    // like .hiw-reveal (how-it-works.html), .integ-reveal (integrations.html),
    // and .sec-reveal (security-overview.html). New page-scoped patterns can
    // be added to this selector without touching the rest of the function.
    var revealSelector = '.allybi-reveal, .hiw-reveal, .integ-reveal, .sec-reveal, .about-reveal, .hw-reveal';
    var els = document.querySelectorAll(revealSelector);
    if (!els.length) return;

    if (prefersReducedMotion) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

    els.forEach(function (el) { observer.observe(el); });

    // Safety fallback: only reveal items at or above the current viewport so
    // crawlers / screenshot tools see above-the-fold content. Elements below
    // the fold stay hidden until the user actually scrolls them in — that's
    // what makes the per-card reveal animation visible on scroll.
    setTimeout(function () {
      var vh = window.innerHeight;
      document.querySelectorAll(revealSelector).forEach(function (el) {
        if (el.classList.contains('is-visible')) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < vh) {
          el.classList.add('is-visible');
        }
      });
    }, 1500);
  }

  // =========================================================================
  // 2. Parallax layers
  // =========================================================================
  function initParallax() {
    if (prefersReducedMotion) return;
    var els = document.querySelectorAll('[data-parallax]');
    if (!els.length) return;

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var scrollY = window.scrollY;
        els.forEach(function (el) {
          var speed = parseFloat(el.dataset.parallax) || 0.1;
          var rect = el.getBoundingClientRect();
          var center = rect.top + rect.height / 2;
          var offset = (center - window.innerHeight / 2) * speed;
          el.style.transform = 'translateY(' + offset + 'px)';
        });
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // =========================================================================
  // 3. Magnetic buttons
  // =========================================================================
  function initMagnetic() {
    if (prefersReducedMotion) return;
    var btns = document.querySelectorAll('[data-magnetic]');
    btns.forEach(function (btn) {
      var strength = parseFloat(btn.dataset.magnetic) || 0.3;
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = (e.clientX - rect.left - rect.width / 2) * strength;
        var y = (e.clientY - rect.top - rect.height / 2) * strength;
        btn.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(function () { btn.style.transition = ''; }, 400);
      });
    });
  }

  // =========================================================================
  // 4. Counter animation
  // =========================================================================
  function initCounters() {
    if (prefersReducedMotion) return;
    var counters = document.querySelectorAll('[data-count-to]');
    if (!counters.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.dataset.countTo, 10);
        var duration = parseInt(el.dataset.countDuration, 10) || 1500;
        var start = performance.now();

        function update(now) {
          var progress = Math.min((now - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  // =========================================================================
  // 5. Typed text effect for hero
  // =========================================================================
  function initTyped() {
    if (prefersReducedMotion) return;
    var els = document.querySelectorAll('[data-typed]');
    els.forEach(function (el) {
      var text = el.dataset.typed || el.textContent;
      el.textContent = '';
      el.style.borderRight = '2px solid var(--allybi-accent)';
      var i = 0;
      var delay = parseInt(el.dataset.typedDelay, 10) || 800;

      setTimeout(function type() {
        if (i < text.length) {
          el.textContent += text.charAt(i);
          i++;
          setTimeout(type, 30 + Math.random() * 30);
        } else {
          setTimeout(function () { el.style.borderRight = 'none'; }, 1200);
        }
      }, delay);
    });
  }

  // =========================================================================
  // 6. Sticky scroll sequence (workflow steps)
  // =========================================================================
  function initStickySequence() {
    if (prefersReducedMotion) return;
    var containers = document.querySelectorAll('[data-sticky-sequence]');
    containers.forEach(function (container) {
      var steps = container.querySelectorAll('[data-step]');
      var visuals = container.querySelectorAll('[data-step-visual]');
      if (!steps.length || !visuals.length) return;

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var stepId = entry.target.dataset.step;
            // Activate matching visual
            visuals.forEach(function (v) {
              v.classList.toggle('is-active', v.dataset.stepVisual === stepId);
            });
            // Activate step text
            steps.forEach(function (s) {
              s.classList.toggle('is-active', s.dataset.step === stepId);
            });
          }
        });
      }, { threshold: 0.6 });

      steps.forEach(function (step) { observer.observe(step); });
    });
  }

  // =========================================================================
  // 7. Hero scene animation
  // =========================================================================
  function initHeroScene() {
    var scene = document.querySelector('.hero-scene');
    if (!scene || prefersReducedMotion) return;

    var cards = scene.querySelectorAll('.hero-scene__card');
    var query = scene.querySelector('.hero-scene__query');
    var result = scene.querySelector('.hero-scene__result');
    var confirm = scene.querySelector('.hero-scene__confirm');

    // Staggered entrance
    cards.forEach(function (card, i) {
      card.style.animationDelay = (0.3 + i * 0.15) + 's';
    });
  }

  // =========================================================================
  // 8. Glass header background transition
  // =========================================================================
  function initHeaderGlass() {
    var header = document.getElementById('allybi-header');
    if (!header) return;

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        header.classList.toggle('is-scrolled', window.scrollY > 20);
        ticking = false;
      });
    }, { passive: true });

    // Initial check
    header.classList.toggle('is-scrolled', window.scrollY > 20);
  }

  // =========================================================================
  // Init all
  // =========================================================================
  function init() {
    initReveal();
    initParallax();
    initMagnetic();
    initCounters();
    initTyped();
    initStickySequence();
    initHeroScene();
    initHeaderGlass();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(function () {
  var ua = navigator.userAgent;
  var isSafari = /^((?!chrome|android|crios|fxios|edgios|edg|opr).)*safari/i.test(ua);
  if (!isSafari) return;
  function swap() {
    document.querySelectorAll('img[src*="uploads-icon.svg"]').forEach(function (img) {
      img.src = img.src.replace('uploads-icon.svg', 'uploads-icon.png');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', swap);
  } else {
    swap();
  }
})();
