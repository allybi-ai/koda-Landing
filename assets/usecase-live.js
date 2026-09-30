/* Two pairs of conversations. Native scroll, reversible, no wheel capture. */
(function(root,factory){
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document){
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',function(){api.mount(root);},{once:true});
  else api.mount(root);
 }
}(typeof window==='undefined'?null:window,function(){
 'use strict';
 function smooth(n){n=Math.max(0,Math.min(1,n));return n*n*n*(n*(n*6-15)+10);}
 function sceneState(top,height){
  var p=-top/height;
  return {
   file:smooth((.85+p)/.72),mail:smooth((.72+p)/.65),
   follow:smooth((p-.32)/.46),exit:smooth((p-1.3)/.42),
   sheet:smooth((p-1.62)/.45),whatsapp:smooth((p-1.74)/.45),
   secondExit:smooth((p-2.95)/.45),copyLeave:smooth((p-3.3)/.25)
  };
 }
 function readable(){return {file:1,mail:1,follow:1,exit:0,sheet:1,whatsapp:1,secondExit:0,copyLeave:0};}
 function mount(win){
  var section=win.document.querySelector('#use-cases.retrieval-section');
  if(!section)return;
  var reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  var wide=win.matchMedia('(min-width:1151px) and (min-height:760px)');
  var cards={};['file','mail','sheet','whatsapp'].forEach(function(key){cards[key]=section.querySelector('.retrieval__case--'+key);});
  var thread=section.querySelector('.retrieval__thread'),view=section.querySelector('.retrieval__conversation--comparison'),table=section.querySelector('.retrieval__comparison');
  var frame=0,previous=0,active=true,current=readable();
  function set(key,value){section.style.setProperty('--'+(key==='exit'?'leave':key),value.toFixed(4));}
  function paint(now){
   frame=0;
   if(reduced.matches)return;
   var h=win.innerHeight,top=section.getBoundingClientRect().top;
   var target=wide.matches?sceneState(top,h):readable();
   if(!wide.matches)Object.keys(cards).forEach(function(key){target[key]=smooth((h*.97-cards[key].getBoundingClientRect().top)/(h*.3));});
   var dt=Math.min(48,Math.max(8,(now||0)-previous||16)),moving=false;
   Object.keys(current).forEach(function(key){
    current[key]+=(target[key]-current[key])*(1-Math.exp(-dt/100));
    if(Math.abs(target[key]-current[key])<.0003)current[key]=target[key];else moving=true;
    set(key,current[key]);
   });
   set('copy',wide.matches?smooth((h*.9-top)/(h*.45))*(1-current.copyLeave):1);
   previous=now||0;
   if(moving)schedule();
  }
  function schedule(){if(!frame&&active&&!reduced.matches)frame=win.requestAnimationFrame(paint);}
  function sync(){
   win.cancelAnimationFrame(frame);frame=0;previous=0;
   section.dataset.motion=String(!reduced.matches&&wide.matches);
   if(thread&&view)section.style.setProperty('--thread-travel',Math.max(0,thread.scrollHeight-view.clientHeight+14,table?table.offsetTop-8:0)+'px');
   if(reduced.matches){Object.keys(readable()).forEach(function(key){set(key,readable()[key]);});set('copy',1);}
   else {current=wide.matches?sceneState(section.getBoundingClientRect().top,win.innerHeight):readable();paint(0);}
  }
  win.addEventListener('scroll',schedule,{passive:true});
  win.addEventListener('resize',sync,{passive:true});
  reduced.addEventListener('change',sync);wide.addEventListener('change',sync);
  if(win.IntersectionObserver)new win.IntersectionObserver(function(entries){active=entries[0].isIntersecting;if(active)schedule();else {win.cancelAnimationFrame(frame);frame=0;previous=0;}},{rootMargin:'120px'}).observe(section);
  if(win.document.fonts)win.document.fonts.ready.then(sync);
  sync();
 }
 return {sceneState:sceneState,mount:mount};
}));
