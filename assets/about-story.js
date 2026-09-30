/* One scroll-led gesture for the brand sculpture. No scroll interception or idle loop. */
(() => {
  'use strict';
  const page=document.querySelector('#about-page');
  const opening=page?.querySelector('.about-opening');
  if(!opening)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;
  function paint(){
    frame=0;
    const bounds=opening.getBoundingClientRect();
    const progress=reduced.matches?0:Math.max(0,Math.min(1,-bounds.top/Math.max(1,bounds.height)));
    page.style.setProperty('--about-motion',progress.toFixed(3));
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule);
  reduced.addEventListener('change',schedule);
  paint();
})();
