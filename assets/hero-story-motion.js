/* One reversible geometry for arrival, resting composition and edge departure.
 * The authored SVG is the no-JS / reduced-motion fallback and source of truth. */
(function(root, factory) {
  var math = factory();
  if (typeof module === 'object' && module.exports) module.exports = math;
  if (!root || !root.document) return;
  var story = document.querySelector('.hero-story');
  var hero = document.querySelector('.home-hero');
  if (!story || !hero) return;
  var actions = hero.querySelector('.home-hero-container > .home-hero-actions');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var scenes = Array.from(story.querySelectorAll('svg')).map(function(svg) {
    var compact = svg.classList.contains('hero-story-compact');
    var paths = Array.from(svg.querySelectorAll('path'));
    var nodes = Array.from(svg.querySelectorAll('.hero-depth')).map(function(group,i) {
      var image=group.querySelector('image');
      var values=paths[i].getAttribute('d').match(/-?\d*\.?\d+/g).map(Number);
      var curve=[];
      for(var j=0;j<8;j+=2) curve.push([values[j],values[j+1]]);
      if(compact && i>=4) curve.reverse();
      var size=Number(image.getAttribute('width'));
      var center=[Number(image.getAttribute('x'))+size/2,Number(image.getAttribute('y'))+size/2];
      var id=image.getAttribute('href').split('/').pop().replace(/^hero-|\.svg$/g,'');
      group.dataset.motionId=id;
      return {group:group,path:paths[i],original:paths[i].getAttribute('d'),curve:curve,center:center,
        depth:group.classList.contains('hero-depth--near')?'near':group.classList.contains('hero-depth--far')?'far':'mid',id:id,edge:center.slice()};
    });
    return {svg:svg,nodes:nodes,compact:compact,hub:svg.querySelector('.hero-story-hub') || svg.lastElementChild};
  });
  var active, frame=0, start=performance.now(), duration=1250, visible=true, dirty=true;
  var origin=0, travel=1, maxLift=0, entry=window.scrollY>24?1:0, progress=0;
  var latest=[];
  function measure() {
    active=scenes.find(function(s){return getComputedStyle(s.svg).display!=='none';});
    if(!active) return;
    var rect=active.svg.getBoundingClientRect(), box=active.svg.viewBox.baseVal;
    var ratio=rect.width/box.width;
    var left=-rect.left/ratio, right=(innerWidth-rect.left)/ratio;
    var hr=hero.getBoundingClientRect();
    origin=hr.top+scrollY;
    maxLift=Math.max(0,hr.bottom-rect.bottom+(active.lift||0)-16);
    travel=Math.max(280,Math.min(hr.height*.7,innerHeight*.72));
    active.nodes.forEach(function(n,i){
      var side=active.compact?n.center[0]<180:i<4;
      var inset=active.compact?[10,26,22,8,14,30,28,12][i]:[-12,28,8,48,14,-24,4,-40][i];
      n.edge=[side?left+inset:right-inset,n.center[1]+(active.compact?[-21,35,-18,34,30,-17,34,-19][i]:[-30,4,14,45,-62,-32,-15,18][i])];
    });
    dirty=false;
  }
  function schedule(){if(!frame && !document.hidden) frame=requestAnimationFrame(render);}
  function reset(){
    scenes.forEach(function(scene){
      scene.svg.style.removeProperty('transform');
      scene.lift=0;
      scene.nodes.forEach(function(n){n.group.removeAttribute('transform');n.group.style.removeProperty('opacity');n.path.setAttribute('d',n.original);n.path.style.removeProperty('opacity');});
      scene.hub.removeAttribute('transform');
    });
    latest=[];
    if(actions){actions.style.removeProperty('opacity');actions.removeAttribute('inert');}
    scenes.forEach(function(scene){scene.hub.style.removeProperty('opacity');});
  }
  function render(now){
    frame=0;
    if(reduced.matches){reset();return;}
    if(!visible) {entry=1;return;}
    if(dirty) measure();
    if(!active) return;
    entry=Math.max(entry,math.clamp((now-start)/duration));
    progress=math.clamp((scrollY-origin)/travel);
    var lift=Math.min(Math.max(0,scrollY-origin)*.52,travel*.52,maxLift);
    active.lift=lift;
    active.svg.style.transform='translateY('+lift.toFixed(3)+'px)';
    var lineOpacity=1-math.smooth((progress-.28)/.6);
    if(actions){
      var actionOpacity=1-math.smooth((progress-.04)/.32);
      actions.style.opacity=String(actionOpacity);
      actions.toggleAttribute('inert',actionOpacity<.01);
    }
    var iconOpacity=1-math.smooth((progress-.44)/.44);
    latest=active.nodes.map(function(n){
      var state=math.geometry(n,entry,progress);
      var c=n.center, p=state.center, k=state.scale;
      n.group.setAttribute('transform','translate('+p.join(' ')+') scale('+k+') translate('+(-c[0])+' '+(-c[1])+')');
      n.group.style.opacity=String(iconOpacity);
      n.path.setAttribute('d',math.path(state.curve));
      n.path.style.opacity=String(lineOpacity);
      return {id:n.id,x:p[0],y:p[1],scale:k};
    });
    active.hub.style.opacity=String(iconOpacity);
    var hubScale=1-.018*(1-math.ease(entry))-.025*math.smooth(progress);
    var hx=active.compact?180:620,hy=active.compact?170:200;
    active.hub.setAttribute('transform','translate('+hx+' '+hy+') scale('+hubScale+') translate('+(-hx)+' '+(-hy)+')');
    if(entry<1) schedule();
  }
  // Future card choreography can query identity/progress without duplicating clocks.
  root.AllybiHeroStory={getState:function(){return {entry:entry,departure:progress,reducedMotion:reduced.matches,icons:latest.map(function(n){return Object.assign({},n);})};}};
  story.classList.add('has-story-motion');
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',function(){dirty=true;schedule();},{passive:true});
  reduced.addEventListener('change',function(){entry=1;dirty=true;schedule();});
  document.addEventListener('visibilitychange',function(){if(!document.hidden){entry=1;schedule();}});
  window.addEventListener('pageshow',function(e){if(e.persisted){entry=1;dirty=true;schedule();}});
  if(typeof IntersectionObserver==='function') new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;if(visible){dirty=true;schedule();}},{rootMargin:'80px'}).observe(hero);
  schedule();
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function clamp(x){return Math.max(0,Math.min(1,Number(x)||0));}
  function ease(x){return 1-Math.pow(1-clamp(x),3);}
  function smooth(x){x=clamp(x);return x*x*x*(x*(x*6-15)+10);}
  function mix(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
  function tail(p,t){
    var a=mix(p[0],p[1],t),b=mix(p[1],p[2],t),c=mix(p[2],p[3],t);
    var d=mix(a,b,t),e=mix(b,c,t);
    return [mix(d,e,t),e,c,p[3].slice()];
  }
  function geometry(n,entry,exit){
    var arrival=1-ease(entry),departure=smooth(exit);
    var scale=1-.045*arrival+({far:-.05,mid:.025,near:.065}[n.depth]||0)*departure;
    var curve=tail(n.curve,.13*arrival);
    var offset=[n.center[0]-n.curve[0][0],n.center[1]-n.curve[0][1]];
    var center=[curve[0][0]+offset[0]*scale,curve[0][1]+offset[1]*scale];
    var position=mix(center,n.edge,departure);
    var delta=[position[0]-center[0],position[1]-center[1]];
    curve=curve.map(function(p,i){var weight=[1,.7,.08,0][i];return [p[0]+delta[0]*weight,p[1]+delta[1]*weight];});
    return {center:position,curve:curve,scale:scale};
  }
  function path(p){return 'M'+p[0].join(' ')+'C'+p.slice(1).map(function(v){return v.join(' ');}).join(' ');}
  return {geometry:geometry,clamp:clamp,ease:ease,smooth:smooth,path:path};
});
