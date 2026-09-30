/* One reversible scroll gesture for the security illustrations on both pages. */
(() => {
 'use strict';
 const art=[...document.querySelectorAll('.sec-art,.privacy__art,.privacy-proof__visual')];
 if(!art.length)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),visible=new Set(),seen=new WeakSet(),running=new Set();
 let frame=0;
 const ease=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};
 function draw(){
  frame=0;
  for(const node of visible){
   const r=node.getBoundingClientRect(),h=innerHeight;
   const enter=ease((h*.98-r.top)/(Math.min(r.height,h*.5)+h*.12));
   const leave=ease((-r.top-r.height*.16)/(r.height*.8));
   node.style.setProperty('--art-enter',reduced.matches?1:enter.toFixed(3));
   node.style.setProperty('--art-leave',reduced.matches?0:leave.toFixed(3));
   if(!reduced.matches&&!seen.has(node)&&enter>.1){
    seen.add(node);
    const a=node.animate([{opacity:0},{opacity:1}],{duration:700,easing:'cubic-bezier(.22,.72,.18,1)'});
    running.add(a);a.finished.catch(()=>{}).finally(()=>running.delete(a));
   }
  }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?visible.add(e.target):visible.delete(e.target));schedule();},{rootMargin:'140px'});
  art.forEach(node=>observer.observe(node));
 }else art.forEach(node=>visible.add(node));
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
 reduced.addEventListener('change',()=>{running.forEach(a=>a.cancel());art.forEach(node=>{node.style.setProperty('--art-enter',1);node.style.setProperty('--art-leave',0);});schedule();});
 schedule();
})();
