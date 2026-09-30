/* One shared orbit. Only transforms change; motion sleeps outside the hero. */
(function(root,factory){
 const motion=factory();
 if(typeof module==='object'&&module.exports)module.exports=motion;
 if(!root||!root.document)return;
 const page=document.querySelector('#pricing-page'),stage=page?.querySelector('.plan-stage');
 if(!stage)return;
 const center=stage.querySelector('[data-plan-center]'),symbols=[...stage.querySelectorAll('[data-plan-symbol]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let layout,frame=0,dirty=true,inView=true,last=0,clock=0,current=null,entry=scrollY>120?1:0;
 function measure(){
  const box=stage.getBoundingClientRect();
  layout=motion.layout(box.width,box.height,innerWidth,center.offsetWidth,center.offsetHeight,symbols[0].offsetWidth);
  layout.top=box.top+scrollY;
  layout.sizes=symbols.map(el=>el.offsetWidth);
  dirty=false;
 }
 function schedule(){if(!frame&&!document.hidden&&inView)frame=requestAnimationFrame(render);}
 function render(now){
  frame=0;if(document.hidden||!inView)return;
  if(dirty)measure();
  if(reduced.matches){
   stage.classList.remove('has-plan-motion');symbols.forEach(el=>el.style.removeProperty('transform'));
   center.style.removeProperty('--center-y');center.style.removeProperty('--center-opacity');
   stage.dataset.motionState='reduced';last=0;return;
  }
  stage.classList.add('has-plan-motion');
  const dt=last?Math.min(40,now-last):0;last=now;clock+=dt;
  if(current===null)current=scrollY;
  current+=(scrollY-current)*(1-Math.exp(-dt/65));
  if(Math.abs(scrollY-current)<.15)current=scrollY;
  entry=Math.min(1,entry+dt/1250);
  const exit=motion.clamp((current-layout.top)/(layout.height*.65));
  symbols.forEach((el,i)=>{
   const p=motion.pose(Number(el.dataset.angle),clock/96000,entry,exit,layout);
   el.style.transform=`translate3d(${(p.x-layout.sizes[i]/2).toFixed(2)}px,${(p.y-layout.sizes[i]/2).toFixed(2)}px,0)`;
  });
  const leaving=motion.smooth(exit);
  center.style.setProperty('--center-y',`${(1-motion.smooth(entry))*18-leaving*65}px`);
  center.style.setProperty('--center-opacity',String(motion.smooth(entry/.6)*(1-motion.smooth(exit/.85))));
  center.inert=exit>.9;
  stage.dataset.motionState=entry<1?'arriving':exit>=1?'departed':'orbiting';
  if(exit<1||current!==scrollY||entry<1)schedule();
 }
 const reveals=[...page.querySelectorAll('[data-plan-reveal]')];let revealObserver;
 function configureReveals(){
  revealObserver?.disconnect();reveals.forEach(el=>el.classList.remove('plan-pending','plan-ready'));
  if(reduced.matches||!('IntersectionObserver' in root))return;
  revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.replace('plan-pending','plan-ready');revealObserver.unobserve(entry.target);}
  }),{threshold:.04});
  reveals.forEach(el=>{if(el.getBoundingClientRect().top<innerHeight)return;el.classList.add('plan-pending');revealObserver.observe(el);});
 }
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',()=>{dirty=true;current=null;schedule();},{passive:true});
 addEventListener('pageshow',()=>{dirty=true;current=null;last=0;schedule();});
 document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)schedule();});
 reduced.addEventListener('change',()=>{entry=1;center.inert=false;configureReveals();schedule();});
 if('IntersectionObserver' in root)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;last=0;if(inView){dirty=true;current=null;schedule();}},{rootMargin:'0px'}).observe(stage);
 document.fonts?.ready.then(()=>{dirty=true;schedule();});
 configureReveals();schedule();
})(typeof window!=='undefined'?window:null,function(){
 const clamp=x=>Math.max(0,Math.min(1,x));
 const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
 function layout(width,height,viewport,centerWidth=0,centerHeight=0,size=0){
  let rx=width*(viewport<=620?.62:viewport<=1000?.44:.425),ry=height*(viewport<=620?.4:.42);
  // The ellipse must clear the whole reading rectangle, at every angle.
  const clearance=Math.hypot((centerWidth/2+size*.4+18)/rx,(centerHeight/2+size*.4+18)/ry);
  const expand=Math.max(1,clearance);
  return {width,height,rx:rx*expand,ry:ry*expand};
 }
 function pose(angle,turn,entry,exit,geometry){
  const a=angle+turn*Math.PI*2,x=Math.cos(a),y=Math.sin(a);
  const away=(1-smooth(entry)+smooth(exit))*(Math.max(geometry.width,geometry.height)+200);
  return {x:x*(geometry.rx+away),y:y*(geometry.ry+away)};
 }
 return {clamp,smooth,layout,pose};
});
