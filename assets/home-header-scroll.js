(function(root){
 'use strict';
 // Different thresholds prevent oscillation while scrolling near the boundary.
 function nextState(y,floating){return floating ? y>8 : y>48;}
 if(typeof module!=='undefined' && module.exports) module.exports={nextState};
 if(!root.document) return;
 root.document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.site-header');
  if(!header) return;
  let floating=false, scrollFrame=0, geometryFrame=0;
  function sync(){
   scrollFrame=0;
   const next=nextState(root.scrollY,floating);
   if(next===floating && header.hasAttribute('data-floating')) return;
   floating=next; header.setAttribute('data-floating',String(next));
  }
  sync();
  root.addEventListener('scroll',()=>{
   if(!scrollFrame) scrollFrame=requestAnimationFrame(sync);
  },{passive:true});
  root.addEventListener('pageshow',sync);
  // Menus remain attached to moving triggers throughout the CSS contraction.
  header.addEventListener('transitionrun',event=>{
   const movingSurface=event.target===header && event.propertyName==='top';
   const movingInner=event.target===header.querySelector('.site-header__inner') && event.propertyName==='padding-left';
   if(!movingSurface && !movingInner) return;
   cancelAnimationFrame(geometryFrame);
   const style=getComputedStyle(header);
   const duration=Math.max(parseFloat(style.getPropertyValue('--workspace-dropdown-motion-duration'))||300,parseFloat(style.getPropertyValue('--header-motion'))||380);
   const until=performance.now()+duration+32;
   function track(now){
    header.dispatchEvent(new Event('allybi:header-geometry'));
    if(now<until) geometryFrame=requestAnimationFrame(track);
   }
   geometryFrame=requestAnimationFrame(track);
  });
 });
})(typeof window==='undefined'?globalThis:window);
