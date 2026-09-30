/**
 * Global header + Mobile menu controllers — 2026-06-30 rebuild.
 *
 *  Header dropdowns (desktop):
 *    - click toggles open;
 *    - Escape closes;
 *    - click outside closes;
 *    - opening one dropdown closes the others;
 *    - aria-expanded mirrored on the trigger.
 *
 *  Mobile menu:
 *    - opens via [data-mobile-menu-toggle];
 *    - closes via [data-mobile-menu-close], any link inside, Escape;
 *    - aria-hidden + inert toggle on the overlay;
 *    - aria-expanded toggle on the menu button;
 *    - body+html get .has-mobile-menu-open while open;
 *    - focus moves to the close button on open;
 *    - focus trap cycles inside the overlay;
 *    - focus returns to the menu button on close.
 *
 *  Active link state:
 *    - any header or footer link whose href resolves to the current
 *      pathname is tagged with aria-current="page".
 *
 *  No third-party dependency.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initDesktopDropdowns();
    initMobileMenu();
    markCurrentPage();
  }

  /* ─────────────── Desktop dropdowns ─────────────── */
  function initDesktopDropdowns() {
    var dropdowns = document.querySelectorAll('.site-header [data-dropdown]');
    if (!dropdowns.length) return;
    var list = Array.prototype.slice.call(dropdowns);

    function closeAll(except) {
      list.forEach(function (d) {
        if (d === except) return;
        d.setAttribute('data-open', 'false');
        var btn = d.querySelector('.site-header__nav-trigger');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    list.forEach(function (d) {
      var btn = d.querySelector('.site-header__nav-trigger');
      if (!btn) return;
      d.setAttribute('data-open', 'false');
      btn.setAttribute('aria-expanded', 'false');

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = d.getAttribute('data-open') === 'true';
        closeAll(open ? null : d);
        d.setAttribute('data-open', open ? 'false' : 'true');
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
    });

    document.addEventListener('click', function (e) {
      var t = e.target;
      var inside = false;
      list.forEach(function (d) { if (d.contains(t)) inside = true; });
      if (!inside) closeAll(null);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });
  }

  /* ─────────────── Mobile menu ─────────────── */
  function initMobileMenu() {
    var toggle = document.querySelector('[data-mobile-menu-toggle]');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    var closeBtn = menu.querySelector('[data-mobile-menu-close]');
    var lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      menu.setAttribute('aria-hidden', 'false');
      menu.removeAttribute('inert');
      toggle.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('has-mobile-menu-open');
      document.body.classList.add('has-mobile-menu-open');
      // Defer focus to next frame so the overlay is rendered first.
      window.requestAnimationFrame(function () {
        if (closeBtn) closeBtn.focus();
      });
    }

    function close() {
      menu.setAttribute('aria-hidden', 'true');
      menu.setAttribute('inert', '');
      toggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('has-mobile-menu-open');
      document.body.classList.remove('has-mobile-menu-open');
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      } else {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      var openNow = menu.getAttribute('aria-hidden') === 'false';
      if (openNow) close(); else open();
    });

    if (closeBtn) closeBtn.addEventListener('click', close);

    // Close on any link click inside the menu.
    menu.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a) close();
    });

    // Close on Escape (while open).
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (menu.getAttribute('aria-hidden') === 'false') {
        e.preventDefault();
        close();
      }
    });

    // Close on route/hash change.
    window.addEventListener('hashchange', function () {
      if (menu.getAttribute('aria-hidden') === 'false') close();
    });
    window.addEventListener('popstate', function () {
      if (menu.getAttribute('aria-hidden') === 'false') close();
    });

    // Focus trap.
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      if (menu.getAttribute('aria-hidden') !== 'false') return;
      var focusables = menu.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ─────────────── aria-current="page" marker ─────────────── */
  function markCurrentPage() {
    var path = window.location.pathname.replace(/\/$/, '') || '/index.html';
    if (path === '') path = '/index.html';
    var here = path.split('/').pop() || 'index.html';

    function tag(scope) {
      var anchors = scope.querySelectorAll('a[href]');
      anchors.forEach(function (a) {
        try {
          var url = new URL(a.getAttribute('href'), window.location.origin);
          var anchorPath = url.pathname.replace(/\/$/, '');
          var anchorFile = (anchorPath.split('/').pop() || 'index.html');
          if (anchorFile === here && !url.hash) {
            a.setAttribute('aria-current', 'page');
          }
        } catch (_e) { /* ignore */ }
      });
    }
    var header = document.querySelector('.site-header');
    var footer = document.querySelector('.site-footer');
    var menu = document.getElementById('mobile-menu');
    if (header) tag(header);
    if (footer) tag(footer);
    if (menu) tag(menu);
  }
})();
