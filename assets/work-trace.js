(function(root,factory){
 'use strict';
 const story=factory();
 if(typeof module==='object'&&module.exports)module.exports=story;
 if(!root||!root.document)return;
 const section=document.querySelector('.work-trace');if(!section)return;
 const find=s=>section.querySelector(s),all=s=>[...section.querySelectorAll(s)];
 const svg=find('svg'),camera=find('[data-wt-camera]'),token=find('[data-wt-token]');
 const nodes=all('[data-wt-node]'),paths=all('[data-wt-path]'),occluders=all('[data-wt-occluder]');
 const residues=all('[data-wt-residue]').map(el=>({el,index:Number(el.getAttribute('data-wt-residue'))}));
 const icon=find('[data-wt-token-icon]'),detail=find('[data-wt-token-detail]');
 const wait=find('[data-wt-wait]'),confirm=find('[data-wt-confirm]'),epilogue=find('.work-trace__epilogue');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let mobile=false,geometry,focusScale=1.55,overviewScale=.8,overviewShift=0,top=0,distance=1,raf=0,dirty=true,visible=true;
 let overview=false,displayed=0,flight=null,queued=null,expectedScroll=null,lastWheel=-Infinity,lastWheelDirection=0,settledAt=-Infinity,touch=null;
 const opacity=(el,value)=>{if(el)el.style.opacity=String(value);};
 function measure(){
  mobile=innerWidth<768;geometry=story.layout(mobile);
  overviewScale=mobile?.62+.11*story.clamp((innerHeight-568)/276):.8;
  section.classList.toggle('is-motion',!reduced.matches);
  svg.setAttribute('viewBox',mobile?'0 0 420 780':'0 0 1200 800');
  const box=svg.getBoundingClientRect(),pixel=Math.min(box.width/(mobile?420:1200),box.height/(mobile?780:800));
  // Reserve breathing room below the closing copy, independent of SVG letterboxing.
  overviewShift=(90-Math.max(0,box.height-(mobile?780:800)*pixel)/2)/pixel;
  const maxWidth=Math.max(...geometry.sizes.map(s=>s[0])),maxHeight=Math.max(...geometry.sizes.map(s=>s[1]));
  focusScale=Math.min((mobile?.85:1.2)/(geometry.unit*pixel),(box.width-40)/(maxWidth*geometry.unit*pixel),(box.height-24)/(maxHeight*geometry.unit*pixel));
  geometry.positions.forEach((p,i)=>nodes[i].setAttribute('transform',`translate(${p[0]} ${p[1]}) scale(${geometry.unit})`));
  geometry.curves.forEach((c,i)=>paths[i].setAttribute('d',story.path(c)));
  occluders.forEach((r,i)=>{
   r.setAttribute('x',geometry.positions[i][0]-5);r.setAttribute('y',geometry.positions[i][1]-5);
   r.setAttribute('width',geometry.sizes[i][0]*geometry.unit+10);r.setAttribute('height',geometry.sizes[i][1]*geometry.unit+10);
  });
  residues.forEach(({el,index:i})=>el.setAttribute('transform',`translate(${geometry.local[i][0]} ${geometry.local[i][1]}) scale(${geometry.widths[i]/160}) translate(-80 -104)`));
  const r=section.getBoundingClientRect();top=r.top+scrollY;distance=Math.max(1,r.height-innerHeight);
  dirty=false;
 }
 function render(now=0){
  raf=0;if(document.hidden||(!visible&&!dirty&&!flight))return;
  if(dirty){measure();cancelPassage();}
  // Replay only after the complete scene has faded out into the hero.
  if(overview&&scrollY<=top-innerHeight*.62){
   overview=false;delete section.dataset.overview;measure();
  }
  if(flight){
   const elapsed=now-flight.started;
   displayed=story.sample(flight,elapsed);
   expectedScroll=flight.entry===undefined?top+displayed*distance:flight.entry+(flight.destination-flight.entry)*story.smooth(elapsed/flight.duration);
   scrollTo({top:expectedScroll,behavior:'instant'});
   if(elapsed>=flight.duration){
    const destination=flight.to,next=queued;flight=null;queued=null;settledAt=now;
    if(next)beginPassage(story.transition(destination,next),next,now);
   }
  }else displayed=reduced.matches||overview?1:story.clamp((scrollY-top)/distance);
  if(!overview&&!reduced.matches&&!flight&&displayed===1){
   // Once read, this chapter is one ordinary screen in either direction.
   // Remove only its pinned runway, compensating scroll before the next paint.
   const position=scrollY,height=section.getBoundingClientRect().height;
   overview=true;section.dataset.overview='true';cancelPassage();measure();
   scrollTo({top:position-height+section.getBoundingClientRect().height,behavior:'instant'});
  }
  const progress=displayed;
  const state=story.frame(progress,mobile);
  section.style.setProperty('--wt-difference',state.difference);
  // The request is already entering while the hero releases its attention.
  const entry=overview?1:story.smooth((scrollY-top+innerHeight*.6)/(innerHeight*.6));
  const target=mobile?[210,250+80*entry+(110+overviewShift)*state.overview]:[600,235+105*entry+(100+overviewShift)*state.overview];
  const visibility=reduced.matches?1:story.smooth((scrollY-top+innerHeight*.62)/(innerHeight*.22));
  opacity(camera,visibility);
  const scale=state.scale+(focusScale-(mobile?1.62:1.55))*(1-state.overview)+(overviewScale-(mobile?.62:.8))*state.overview;
  camera.setAttribute('transform',`translate(${target[0]} ${target[1]}) scale(${scale}) translate(${-state.focus[0]} ${-state.focus[1]})`);
  nodes.forEach((n,i)=>{
   const focus=i===4?1:1-.5*state.presence[i+1];
   opacity(n,state.presence[i]*(focus+(1-focus)*state.overview));
  });
  paths.forEach((p,i)=>{
   p.setAttribute('pathLength','1');p.style.strokeDasharray='1';p.style.strokeDashoffset=String(1-state.lines[i]);
   opacity(p,.6+.4*state.overview);
  });
  residues.forEach(({el,index})=>opacity(el,state.residues[index]));
  token.setAttribute('transform',`translate(${state.token[0]} ${state.token[1]}) rotate(${state.rotation}) scale(${state.documentScale}) translate(-80 -104)`);
  opacity(token,state.documentOpacity);
  opacity(icon,1-state.detail);opacity(detail,state.detail);
  opacity(wait,1-state.reply);opacity(confirm,state.reply);
  opacity(epilogue,state.epilogue*(overview?visibility:1));
  epilogue.style.transform=`translate3d(${(1-state.epilogue)*-24}px,${(1-state.epilogue)*8}px,0)`;
  section.dataset.stage=String(state.active);section.dataset.progress=progress.toFixed(3);
  if(flight)schedule();
 }
 function schedule(){if(!raf&&!document.hidden)raf=requestAnimationFrame(render);}
 function cancelPassage(){flight=null;queued=null;expectedScroll=null;settledAt=-Infinity;}
 function beginPassage(move,direction,now=performance.now()){
  if(!move)return false;
  expectedScroll=scrollY;flight={...move,direction,started:now};schedule();return true;
 }
 // Only this pinned chapter owns vertical gestures. The rest of the page stays native.
 function gesture(direction,amount,event,fresh=true){
  if(reduced.matches||overview||!event.cancelable)return false;
  if(dirty)measure();
  const end=top+distance,inside=scrollY>=top-1&&scrollY<=end+1;
  const entering=direction>0&&scrollY<top-1&&top-scrollY<innerHeight&&scrollY+amount>=top;
  const returning=direction<0&&scrollY>end+1&&scrollY-end<innerHeight&&scrollY+amount<=end;
  if(!inside&&!entering&&!returning&&!flight)return false;
  if(flight){
   // A deliberate new gesture must not disappear behind the active passage.
   if(direction!==flight.direction&&flight.entry!==undefined){cancelPassage();return false;}
   event.preventDefault();
   if(direction!==flight.direction){
    queued=null;
    const reverse=story.transition(displayed,direction);
    if(reverse){
     const remaining=Math.min(1,Math.max(.3,Math.abs(reverse.to-displayed)/Math.abs(flight.to-flight.from)));
     reverse.duration*=remaining;reverse.knots=reverse.knots.map(([time,value])=>[time*remaining,value]);
     beginPassage(reverse,direction);
    }else cancelPassage();
   }else if(fresh)queued=direction;
   return true;
  }
  const from=story.clamp((scrollY-top)/distance);
  const move=entering||returning?{from:entering?0:1,to:entering?0:1,duration:700,entry:scrollY,destination:entering?top:end}:story.transition(from,direction);
  // Outward movement is always native, even during a continuous wheel burst.
  if(!move)return false;
  // Briefly settle between passages; never require the user to stop scrolling.
  if(!fresh&&!entering&&!returning&&performance.now()-settledAt<140){event.preventDefault();return true;}
  event.preventDefault();return beginPassage(move,direction);
 }
 const interactive=event=>event.target?.closest?.('a,button,input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"]');
 addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||interactive(event)||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
  const now=performance.now(),direction=Math.sign(event.deltaY),fresh=now-lastWheel>180||direction!==lastWheelDirection;
  lastWheel=now;lastWheelDirection=direction;
  const amount=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
  gesture(Math.sign(amount),amount,event,fresh);
 },{passive:false});
 addEventListener('touchstart',event=>{
  touch=event.touches.length===1&&!interactive(event)?{x:event.touches[0].clientX,y:event.touches[0].clientY,used:false,owned:false}:null;
 },{passive:true});
 addEventListener('touchmove',event=>{
  if(!touch||event.touches.length!==1)return;
  const dx=touch.x-event.touches[0].clientX,dy=touch.y-event.touches[0].clientY;
  if(Math.abs(dy)<8||Math.abs(dx)>Math.abs(dy))return;
  if(touch.owned){event.preventDefault();return;}
  if(!touch.used){touch.owned=gesture(Math.sign(dy),dy,event);touch.used=touch.owned;}
 },{passive:false});
 addEventListener('touchend',()=>{touch=null;},{passive:true});
 addEventListener('touchcancel',()=>{touch=null;},{passive:true});
 addEventListener('keydown',event=>{
  if(interactive(event)||event.ctrlKey||event.metaKey||event.altKey)return;
  const direction=event.key==='ArrowDown'||event.key==='PageDown'||event.key===' '&&!event.shiftKey?1:event.key==='ArrowUp'||event.key==='PageUp'||event.key===' '&&event.shiftKey?-1:0;
  if(direction)gesture(direction,direction*innerHeight*.8,event,!event.repeat);
  else if(['Home','End','Escape','Tab'].includes(event.key))cancelPassage();
 });
 addEventListener('scroll',()=>{
  // A scrollbar drag, anchor or browser navigation can always take control back.
  if(flight&&expectedScroll!==null&&Math.abs(scrollY-expectedScroll)>2)cancelPassage();
  schedule();
 },{passive:true});
 addEventListener('resize',()=>{dirty=true;schedule();},{passive:true});
 addEventListener('pageshow',()=>{dirty=true;schedule();});
 reduced.addEventListener('change',()=>{dirty=true;schedule();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
 if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){dirty=true;schedule();}},{rootMargin:'100px'}).observe(section);
 measure();render();
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
 const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
 // Each gesture advances one reading stop; geometry supplies the easing once.
 const stops=[0,.24,.48,.76,.88,1],durations=[1650,1600,1900,1650,1800];
 const rests=[120,180,600,90,140];
 function transition(from,direction){
  const index=direction>0?stops.findIndex(p=>p>from+.002):stops.findLastIndex(p=>p<from-.002);
  if(index<0)return null;
  const edge=direction>0?index-1:index,to=stops[index],duration=durations[edge];
  const bounds=(edge<steps.length?[steps[edge].start,steps[edge].end]:[.89,.98]).map(p=>Math.max(Math.min(from,to),Math.min(Math.max(from,to),p)));
  // A short lead gives immediate feedback; most time belongs to the actual journey.
  const knots=direction>0?[[0,from],[80,bounds[0]],[duration-rests[edge],bounds[1]],[duration,to]]:[[0,from],[Math.min(rests[edge],120),bounds[1]],[duration-80,bounds[0]],[duration,to]];
  const pace=edge===steps.length?.8:1;
  return {from,to,duration:duration*pace,knots:knots.map(([time,value])=>[time*pace,value])};
 }
 function sample(move,elapsed){
  const knots=move.knots||[[0,move.from],[move.duration,move.to]];
  for(let i=1;i<knots.length;i++)if(elapsed<=knots[i][0]){
   const [time,value]=knots[i-1],[nextTime,nextValue]=knots[i];
   return value+(nextValue-value)*clamp((elapsed-time)/(nextTime-time));
  }
  return move.to;
 }
 const lerp=(a,b,t)=>a+(b-a)*t;
 const mix=(a,b,t)=>a.map((x,i)=>lerp(x,b[i],t));
 const point=(c,t)=>{const u=1-t;return [0,1].map(i=>u*u*u*c[0][i]+3*u*u*t*c[1][i]+3*u*t*t*c[2][i]+t*t*t*c[3][i]);};
 // Travel windows leave deliberate reading rests: search, the small difference, approval.
 const steps=[{start:.085,end:.205},{start:.275,end:.415},{start:.525,end:.655},{start:.785,end:.875}];
 function layout(mobile){
  const unit=mobile?.68:1;
  const positions=mobile?[[20,30],[142,205],[10,440],[145,665],[46,923]]:[[52,65],[118,375],[502,32],[838,348],[574,680]];
  const sizes=[[344,126],[358,282],[348,258],[342,268],[288,148]];
  const local=[[280,121],[107,169],[263,154],[103,122],[40,94]],widths=[28,18,152,36,30];
  const anchors=positions.map((p,i)=>[p[0]+local[i][0]*unit,p[1]+local[i][1]*unit]);
  const controls=mobile?[
   [[-30,185],[110,235]],[[420,435],[390,548]],[[8,715],[62,780]],[[420,932],[316,1070]]
  ]:[
   [[-10,320],[0,552]],[[570,665],[388,175]],[[1100,80],[1210,395]],[[1240,790],[947,885]]
  ];
  const curves=controls.map((c,i)=>[anchors[i],...c,anchors[i+1]]);
  const centers=positions.map((p,i)=>[p[0]+sizes[i][0]*unit/2,p[1]+sizes[i][1]*unit/2]);
  centers[2][1]=anchors[2][1];
  return {unit,positions,sizes,local,widths,anchors,curves,centers,documentScales:widths.map(w=>w/160*unit)};
 }
 function frame(p,mobile){
  p=clamp(p);const l=layout(mobile);
  const presence=[1,...steps.map(s=>smooth((p-s.start-.018)/.075))];
  const lines=steps.map(s=>smooth((p-s.start)/(s.end-s.start)));
  const residues=steps.map(s=>smooth((p-s.start)/.035));
  let active=0,token=l.anchors[0],focus=l.centers[0],documentScale=l.documentScales[0],rotation=0,detail=0;
  steps.forEach((s,i)=>{
   if(p<s.start)return;
   const raw=clamp((p-s.start)/(s.end-s.start)),t=smooth(raw);
   active=raw>.55?i+1:i;
   token=point(l.curves[i],t);focus=mix(l.centers[i],l.centers[i+1],smooth((raw-.035)/.965));
   const out=smooth(raw/.3),into=smooth((raw-.58)/.42),travel=32/160*l.unit;
   documentScale=lerp(l.documentScales[i],travel,out)+(l.documentScales[i+1]-travel)*into;
   rotation=Math.sin(Math.PI*t)*(i%2?-4:4);
   detail=(i===2?1-out:0)+(i===1?into:0);
   if(raw===1){token=l.anchors[i+1];focus=l.centers[i+1];rotation=0;documentScale=l.documentScales[i+1];}
  });
  const overview=smooth((p-.89)/.09),epilogue=smooth((p-.895)/.085);
  focus=mix(focus,mobile?[208,518]:[610,442],overview);
  const scale=lerp(mobile?1.62:1.55,mobile?.62:.8,overview);
  const difference=smooth((p-.405)/.045)*(1-smooth((p-.53)/.1));
  return {presence,lines,residues,active,token,focus,scale,documentScale,documentOpacity:smooth((p-steps[0].start)/.05),rotation,detail,difference,overview,epilogue,reply:smooth((p-.69)/.06)};
 }
 const path=c=>'M'+c[0].join(' ')+'C'+c.slice(1).map(p=>p.join(' ')).join(' ');
 return {frame,layout,steps,transition,sample,clamp,smooth,path};
});
