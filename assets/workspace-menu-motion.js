/*
 * Geometry/painting port of the approved frontend's ui/useDropdownMotion.js.
 * endpoint, distanceFraction and mask equations are preserved. React lifecycle
 * and framer-motion's scalar clock are adapted to this static site's DOM/rAF.
 * No scale transform is applied to menu text.
 */
(function (root) {
  'use strict';
  const lerp = (from, to, progress) => from + (to - from) * progress;
  function endpoint(geometry, open) {
    const height = open ? geometry.height : Math.min(2, geometry.height);
    const travel = open ? 0 : geometry.gap * (geometry.placement === 'top' ? 1 : -1);
    return {
      left: geometry.left + (open ? 0 : geometry.sourceLeft),
      top: geometry.top + (open || geometry.placement !== 'top' ? 0 : geometry.height - height) + travel,
      width: open ? geometry.width : geometry.sourceRight - geometry.sourceLeft,
      height, contentLeft: geometry.left, contentTop: geometry.top + travel,
    };
  }
  function distanceFraction(from, to, geometry, opacityDistance) {
    return Math.min(1, Math.max(opacityDistance,
      ...['left', 'width', 'contentLeft'].map(key => Math.abs(to[key] - from[key]) / Math.max(1, geometry.width)),
      ...['top', 'height', 'contentTop'].map(key => Math.abs(to[key] - from[key]) / Math.max(1, geometry.height))));
  }
  function interpolate(from, to, time) {
    return Object.fromEntries(Object.keys(to).map(key => [key, lerp(from[key], to[key], time)]));
  }
  function mask(frame, geometry) {
    const left = frame.left - frame.contentLeft;
    const top = frame.top - frame.contentTop;
    const x = frame.contentLeft - geometry.left;
    const y = frame.contentTop - geometry.top;
    return { left, top, right:geometry.width-left-frame.width,
      bottom:geometry.height-top-frame.height,
      translation:x ? `translate(${x}px, ${y}px)` : `translateY(${y}px)` };
  }
  function cubicBezier(x, points) {
    const axis = (t,a,b) => 3*(1-t)*(1-t)*t*a + 3*(1-t)*t*t*b + t*t*t;
    let low=0, high=1, t=x;
    for(let i=0;i<18;i++) { t=(low+high)/2; if(axis(t,points[0],points[2])<x) low=t; else high=t; }
    return axis(t,points[1],points[3]);
  }
  function createMotion(node, measure) {
    const surface = node.querySelector('.allybi-dropdown__surface');
    const reveal = node.querySelector('.allybi-dropdown__reveal');
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame=null, progress=0, request=0, desired=false;
    function retarget(open) {
      desired=open;
      cancelAnimationFrame(request);
      const geometry=measure();
      if (!geometry || !geometry.width || !geometry.height) return;
      const style=getComputedStyle(node);
      const token=style.getPropertyValue('--dropdown-motion-duration').trim() || '300ms';
      const duration=parseFloat(token)*(token.endsWith('ms')?1:1000);
      const easing=style.getPropertyValue('--dropdown-motion-ease').match(/cubic-bezier\(([^)]+)\)/)?.[1].split(',').map(Number) || [.32,0,.68,1];
      const radius=parseFloat(style.borderRadius)||17;
      const previousOffscreen=frame && (frame.left>=innerWidth || frame.left+frame.width<=0 || frame.top>=innerHeight || frame.top+frame.height<=0);
      const from=frame && !previousOffscreen ? frame : endpoint(geometry,false);
      const to=endpoint(geometry,open), target=open?1:0, initialProgress=progress;
      const fraction=distanceFraction(from,to,geometry,Math.abs(target-initialProgress));
      const start=performance.now();
      node.style.visibility='visible';
      node.inert=!open;
      node.setAttribute('aria-hidden',String(!open));
      node.dataset.overlayState=open?'open':'exiting';
      reveal.style.pointerEvents=open?'auto':'none';
      function write(time) {
        progress=time===1?target:lerp(initialProgress,target,time);
        frame=time===1?to:interpolate(from,to,time);
        const paint=mask(frame,geometry);
        node.style.setProperty('--dropdown-progress',String(progress));
        node.style.opacity=String(Math.min(1,progress*8));
        Object.assign(surface.style,{left:paint.left+'px',top:paint.top+'px',width:frame.width+'px',height:frame.height+'px',transform:paint.translation});
        reveal.style.clipPath=`inset(${paint.top}px ${paint.right}px ${paint.bottom}px ${paint.left}px round ${radius}px)`;
        reveal.style.transform=paint.translation;
        reveal.style.opacity=String(Math.min(1,progress*2));
      }
      function tick(now) {
        const time=media.matches || !duration || !fraction ? 1 : Math.min(1,(now-start)/(duration*fraction));
        write(time===1?1:cubicBezier(time,easing));
        if(time<1) request=requestAnimationFrame(tick);
        else if(!desired) { node.style.visibility='hidden'; frame=null; progress=0; }
      }
      write(0);
      tick(start);
    }
    media.addEventListener('change',()=>retarget(desired));
    return { retarget };
  }
  const api={endpoint,distanceFraction,interpolate,mask,createMotion};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.WorkspaceMenuMotion=api;
})(typeof window==='undefined'?globalThis:window);
