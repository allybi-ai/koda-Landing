/* One reversible arrival → reading → departure. Native scrolling stays native. */
(function(root,factory){
 var math=factory();
 if(typeof module==='object'&&module.exports) module.exports=math;
 if(!root||!root.document) return;
 var section=document.querySelector('#home-flow'),stage=section&&section.querySelector('.possibility__stage');
 if(!stage) return;
 var title=section.querySelector('.possibility__title');
 var pieces=Array.from(section.querySelectorAll('[data-possibility-piece]'));
 var reduced=matchMedia('(prefers-reduced-motion: reduce)');
 var models=[],raf=0,dirty=true,visible=true,last=0,current=null,compact=false,titleOffset=0;
 function schedule(){if(!raf&&!document.hidden) raf=requestAnimationFrame(render);}
 function measure(){
  section.classList.toggle('has-possibility-motion',!reduced.matches);
  var box=stage.getBoundingClientRect(),sectionTop=section.getBoundingClientRect().top;
  compact=innerWidth<=800;titleOffset=box.top-sectionTop+title.offsetTop-title.offsetHeight/2;
  models=pieces.map(function(el){return {el:el,left:box.left+el.offsetLeft,top:box.top-sectionTop+el.offsetTop,width:el.offsetWidth,height:el.offsetHeight,side:el.offsetLeft+el.offsetWidth/2<stage.clientWidth/2?-1:1,depth:Number(el.dataset.depth),order:Number(el.dataset.order)};});
  dirty=false;
 }
 function render(now){
  raf=0;if(dirty) measure();
  if(reduced.matches){pieces.forEach(function(el){el.style.removeProperty('transform');});title.style.removeProperty('opacity');current=null;return;}
  var target=section.getBoundingClientRect().top;
  if(current===null) current=target;
  var blend=1-Math.exp(-Math.min(32,Math.max(0,now-last))/110);last=now;
  current+=blend*(target-current);if(Math.abs(target-current)<.1) current=target;
  var phase=compact?math.pairTiming(current+titleOffset,innerHeight):math.timing(current,innerHeight);
  models.forEach(function(n){
   var state=compact?math.pairTiming(current+n.top,innerHeight):phase;
   var p=math.pose(n,state.entry,state.exit,innerWidth);
   n.el.style.transform='translate3d('+p.x.toFixed(3)+'px,'+p.y.toFixed(3)+'px,0) scale('+p.scale.toFixed(5)+')';
  });
  title.style.opacity=String(math.smooth(phase.entry)*(1-math.smooth(phase.exit)));
  section.dataset.arrival=phase.entry.toFixed(3);section.dataset.departure=phase.exit.toFixed(3);
  if(visible&&current!==target) schedule();
 }
 window.addEventListener('scroll',function(){if(visible)schedule();},{passive:true});
 window.addEventListener('resize',function(){dirty=true;current=null;schedule();},{passive:true});
 window.addEventListener('pageshow',function(){dirty=true;current=null;schedule();});
 reduced.addEventListener('change',function(){dirty=true;current=null;schedule();});
 document.addEventListener('visibilitychange',function(){if(!document.hidden){current=null;schedule();}});
 if(typeof IntersectionObserver==='function') new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;if(visible){dirty=true;current=null;schedule();}},{rootMargin:'100px'}).observe(section);
 schedule();
})(typeof window!=='undefined'?window:null,function(){
 function clamp(x){return Math.max(0,Math.min(1,x));}
 function smooth(x){x=clamp(x);return x*x*x*(x*(x*6-15)+10);}
 function timing(top,height){return {entry:clamp((height*.68-top)/(height*.68)),exit:clamp((-top-height*.18)/(height*.50))};}
 function pairTiming(top,height){return {entry:clamp((height*.93-top)/(height*.28)),exit:clamp((height*.24-top)/(height*.30))};}
 function pose(n,entry,exit,width){
  var enter=smooth((entry-n.order)/(1-n.order)),leave=smooth(exit);
  var travel=n.side<0?-(n.left+n.width+28):width-n.left+28;
  var arrival=1-enter;
  return {x:travel*(arrival+leave),y:(-18-14*n.depth)*arrival+(16+12*n.depth)*leave,scale:1-(.045+.035*n.depth)*arrival-(.02+.03*n.depth)*leave};
 }
 return {pose:pose,timing:timing,pairTiming:pairTiming,smooth:smooth};
});
