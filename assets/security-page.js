/* Security uses native scrolling, finite reveals and native disclosure controls. */
(function () {
 'use strict';
 const page = document.getElementById('security-page');
 if (!page) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const nodes = [...page.querySelectorAll('[data-security-reveal]')];
 let observer;
 function configureMotion() {
  if (observer) observer.disconnect();
  nodes.forEach(node => node.classList.remove('sec-pending', 'sec-ready'));
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(entries => {
   entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.replace('sec-pending', 'sec-ready');
    observer.unobserve(entry.target);
   });
  }, { threshold: 0.08 });
  nodes.forEach(node => {
   // Never fade an already visible or restored reading position back out.
   const box = node.getBoundingClientRect();
   if (box.top < innerHeight && box.bottom > 0) return;
   node.classList.add('sec-pending');
   observer.observe(node);
  });
 }
 page.querySelectorAll('details').forEach(detail => {
  const marker = detail.querySelector('summary > span');
  detail.addEventListener('toggle', () => { if (marker) marker.textContent = detail.open ? '−' : '+'; });
 });
 const light = page.querySelector('[data-security-light]');
 let frame = 0;
 function paintHeader() {
  frame = 0;
  const isLight = light.getBoundingClientRect().top <= 88;
  document.body.style.setProperty('--security-light', isLight ? '100%' : '0%');
  document.body.style.setProperty('--security-header-invert', isLight ? '0' : '1');
 }
 function schedule() { if (!frame) frame = requestAnimationFrame(paintHeader); }
 window.addEventListener('scroll', schedule, { passive: true });
 window.addEventListener('resize', schedule, { passive: true });
 reduced.addEventListener('change', configureMotion);
 configureMotion();
 paintHeader();
}());
