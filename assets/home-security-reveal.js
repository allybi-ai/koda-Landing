/* Native, reversible scroll. Each illustration settles in its own reading frame;
   the dark field follows the chapter’s lower edge. No wheel capture. */
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
 function sceneState(top,bottom,height){
  var enter=smooth((height*.6-top)/(height*.6));
  var dark=smooth((height*1.25-top)/(height*.45));
  // Finish the light transition before the invitation reaches its reading anchor.
  var clear=smooth((height*.38-bottom)/(height*.38-Math.min(100,height*.12)));
  return {dark:dark*(1-clear),enter:enter};
 }
 function proofProgress(top,height){return smooth((height*1.1-top)/(height*.85));}
 function mount(win){
  var section=win.document.querySelector('#security.privacy-chapter');
  if(!section)return;
  var root=win.document.documentElement;
  var proofs=Array.from(section.querySelectorAll('.privacy-proof'));
  var reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  var frame=0,previous=0,edge=0,current={dark:0,enter:1},progress=proofs.map(function(){return 1;});
  function paint(){
   root.style.setProperty('--privacy-dark',current.dark.toFixed(4));
   root.style.setProperty('--privacy-edge',edge.toFixed(2)+'px');
   root.style.setProperty('--privacy-tone',current.dark>.4?'100%':'0%');
   root.style.setProperty('--privacy-header-dark',current.dark>.4?'1':'0');
   section.style.setProperty('--privacy-enter',current.enter.toFixed(4));
   proofs.forEach(function(proof,index){proof.style.setProperty('--proof',progress[index].toFixed(4));});
  }
  function read(){var box=section.getBoundingClientRect();edge=box.bottom;return sceneState(box.top,box.bottom,win.innerHeight);}
  function readProofs(){return proofs.map(function(proof){return proofProgress(proof.getBoundingClientRect().top,win.innerHeight);});}
  function tick(now){
   frame=0;
   var target=read(),targets=readProofs(),dt=Math.min(48,Math.max(8,now-previous||16)),moving=false;
   function approach(value,goal){
    value+=(goal-value)*(1-Math.exp(-dt/85));
    if(Math.abs(goal-value)<.0003)return goal;
    moving=true;return value;
   }
   Object.keys(current).forEach(function(key){current[key]=approach(current[key],target[key]);});
   progress=progress.map(function(value,index){return approach(value,targets[index]);});
   paint();previous=now;
   if(moving)schedule();
  }
  function schedule(){if(!frame&&!reduced.matches)frame=win.requestAnimationFrame(tick);}
  function sync(){
   win.cancelAnimationFrame(frame);frame=0;previous=0;
   section.dataset.motion=reduced.matches?'static':'flow';
   current=reduced.matches?{dark:0,enter:1}:read();
   progress=reduced.matches?proofs.map(function(){return 1;}):readProofs();
   paint();
  }
  win.addEventListener('scroll',schedule,{passive:true});
  win.addEventListener('resize',sync,{passive:true});
  reduced.addEventListener('change',sync);
  if(win.document.fonts)win.document.fonts.ready.then(sync);
  sync();
 }
 return {sceneState:sceneState,proofProgress:proofProgress,mount:mount};
}));
