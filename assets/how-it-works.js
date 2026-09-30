/* Static product demonstrations. Only local presentation state changes. */
(() => {
 'use strict';
 const root=document.querySelector('#how-it-works-page');if(!root)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(max-width:760px)');
 const tablist=root.querySelector('.case-tabs'),tabs=[...tablist.querySelectorAll('[data-case]')],panels=[...root.querySelectorAll('.case-panel')];
 let active=Math.max(0,panels.findIndex(p=>'#'+p.id===location.hash)),answerTimer=0;
 const running=new Set();
 function animate(el,frames,options){if(reduced.matches)return;const a=el.animate(frames,options);running.add(a);a.finished.catch(()=>{}).finally(()=>running.delete(a));return a;}
 function settle(){clearTimeout(answerTimer);panels.forEach(p=>{p.querySelector('.app-thinking').hidden=true;p.querySelector('.app-response-group').hidden=false;p.querySelector('.app-chat-scroll').removeAttribute('aria-busy');});}
 function showCase(index,transition=true){
  settle();active=index;
  panels.forEach((p,i)=>{p.hidden=i!==index;tabs[i].setAttribute('aria-selected',String(i===index));tabs[i].tabIndex=i===index?0:-1;});
  const p=panels[index];
  if(transition&&!reduced.matches){
   animate(p,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:400,easing:'cubic-bezier(.22,.72,.18,1)'});
   p.querySelector('.app-thinking').hidden=false;p.querySelector('.app-response-group').hidden=true;p.querySelector('.app-chat-scroll').setAttribute('aria-busy','true');
   answerTimer=setTimeout(()=>{settle();animate(p.querySelector('.app-response-group'),[{opacity:0},{opacity:1}],{duration:250});},800);
  }
  schedule();
 }
 tablist.setAttribute('role','tablist');root.querySelector('.case-panels').dataset.enhanced='';
 panels.forEach(p=>p.setAttribute('role','tabpanel'));tabs.forEach(t=>t.setAttribute('role','tab'));
 tabs.forEach((t,i)=>{t.addEventListener('click',()=>showCase(i));t.addEventListener('keydown',e=>{const next={ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[e.key];if(next===undefined)return;e.preventDefault();showCase(next);tabs[next].focus();});});
 function revealSource(demo,view="document"){
  demo.querySelectorAll("[data-source-view]").forEach(p=>p.hidden=p.dataset.sourceView!==view);
  demo.classList.remove('source-folded');demo.classList.add('mobile-source-open');if(compact.matches&&demo===hero)demo.classList.add('context-folded');
  const source=demo.querySelector('.app-source');source?.classList.add('is-inspected');
  if(small.matches)source?.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});
  else if(source)animate(source,[{opacity:.5,transform:'translateX(-12px)'},{opacity:1,transform:'none'}],{duration:420,easing:'cubic-bezier(.22,.72,.18,1)'});
 }
 root.querySelectorAll('[data-source]').forEach(b=>b.addEventListener('click',()=>revealSource(b.closest('[data-app-demo]'),b.dataset.source||'document')));
 const compact=matchMedia('(min-width:761px) and (max-width:1100px)'),hero=root.querySelector('.app-demo-hero');
 if(compact.matches)hero.classList.add('context-folded');
 root.querySelectorAll('[data-max-chat]').forEach(b=>b.addEventListener('click',()=>{
  const demo=b.closest('[data-app-demo]'),expanded=b.getAttribute('aria-pressed')!=='true';
  b.setAttribute('aria-pressed',String(expanded));b.setAttribute('aria-label',expanded?'Restaurar painéis':'Ampliar conversa');
  demo.classList.toggle('source-folded',expanded);if(demo.querySelector('.app-context'))demo.classList.toggle('context-folded',expanded);
  if(!expanded&&compact.matches&&demo===hero)demo.classList.add('context-folded');
 }));
 root.querySelectorAll('[data-fold]').forEach(b=>b.addEventListener('click',()=>{
  const demo=b.closest('[data-app-demo]'),side=b.dataset.fold;
  if(demo.classList.contains('app-demo-library'))demo.classList.remove((side==='source'?'context':'source')+'-folded');
  demo.classList.add(side+'-folded');if(side==='source')demo.classList.remove('mobile-source-open');
 }));
 root.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{
  const demo=b.closest('[data-app-demo]'),side=b.dataset.open;
  demo.classList.remove(side+'-folded');
  if(compact.matches&&demo===hero&&side==='context')demo.classList.add('source-folded');
 }));
 root.querySelector('.app-send').addEventListener('click',e=>{const b=e.currentTarget,host=b.closest('.app-draft');host.querySelector('.app-send-status').textContent='Demonstração: a mensagem seria aberta no WhatsApp para concluir o envio.';animate(host.querySelector('.app-send-status'),[{opacity:0},{opacity:1}],{duration:250});});
 const shelf=root.querySelector('.app-folder-shelf');
 function measureShelf(){const width=shelf.clientWidth,minimum=width<248?100:120,columns=Math.max(1,Math.min(shelf.children.length,Math.floor((width+8)/(minimum+8)))),track=Math.min(160,(width-8*(columns-1))/columns);shelf.style.setProperty('--folder-columns',columns);shelf.style.setProperty('--folder-track-width',track+'px');}
 if(shelf){measureShelf();if('ResizeObserver' in window)new ResizeObserver(measureShelf).observe(shelf);else addEventListener('resize',measureShelf,{passive:true});}
 const scenes=[...root.querySelectorAll('[data-motion]')],visible=new Set();let frame=0;
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 function paint(){frame=0;if(reduced.matches)return;const readings=[...visible].filter(el=>el.getClientRects().length).map(el=>({el,r:el.getBoundingClientRect()}));readings.forEach(({el,r})=>{const arrival=ease((innerHeight-r.top)/Math.min(innerHeight*.52,380)),departure=ease((-r.top-r.height*.3)/(r.height*.8));el.style.setProperty('--arrival',arrival.toFixed(3));el.style.setProperty('--departure',departure.toFixed(3));if(el.dataset.motion==='possibilities'){const stage=el.querySelector('.possibility-map__stage').getBoundingClientRect(),center=stage.top+stage.height*.5;el.style.setProperty('--map-in',ease((innerHeight*1.22-center)/(innerHeight*.63)).toFixed(3));el.style.setProperty('--map-out',ease((innerHeight*.42-center)/(innerHeight*.68)).toFixed(3));}});}
 function schedule(){if(!frame&&!reduced.matches)frame=requestAnimationFrame(paint);}
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?visible.add(e.target):visible.delete(e.target));schedule();},{rootMargin:'120px'});scenes.forEach(s=>observer.observe(s));}
 addEventListener('scroll',()=>{if(visible.size)schedule();},{passive:true});addEventListener('resize',schedule,{passive:true});
 reduced.addEventListener('change',()=>{settle();running.forEach(a=>a.cancel());if(frame)cancelAnimationFrame(frame);frame=0;schedule();});
 addEventListener('hashchange',()=>{const i=panels.findIndex(p=>'#'+p.id===location.hash);if(i>=0){showCase(i,false);panels[i].scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}});
 showCase(active,false);
})();
