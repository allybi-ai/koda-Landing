(function(){
 'use strict';
 const model=window.AllybiTempo;if(!model||document.body.dataset.tempoPage==='entry')return;
 const key='allybi.tempo.reflection.v3',reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const arrow='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const lines=value=>escape(value).replace(/\n/g,'<br> ');
 function read(){
  if(history.state?.allybiTempo)return model.sanitize(history.state.allybiTempo);
  try{return model.sanitize(JSON.parse(sessionStorage.getItem(key)));}catch(_){return model.fresh();}
 }
 let state=read(),busy=false,pane,form,next,back;
 // Answers stay in the current tab. No answer is put in a URL or sent to a server.
 function save(){
  try{sessionStorage.setItem(key,JSON.stringify(state));}catch(_){}
  history.replaceState({allybiTempo:state},'',location.pathname);
 }
 const params=new URLSearchParams(location.search);
 if(params.get('novo')==='1'||params.get('restart')==='1'){state=model.fresh();save();}
 function go(page){save();history.pushState({allybiTempo:state},'',page==='result'?'tempo-resultado.html':'tempo-questionario.html');mount(page,true);}
 function mount(page,focus=false){
  busy=false;document.body.dataset.tempoPage=page;document.body.className='tempo-page tempo-page--'+page;
  document.querySelector('[data-progress]').hidden=page!=='questions';
  document.title=page==='questions'?'O que aconteceu com o seu dia?':'Seu dia, visto de perto';
  if(page==='result'){renderResult(focus);return;}
  state.step=Math.min(state.step,model.lastStep(state));
  for(let i=0;i<state.step;i++)if(!model.valid(state,i)){state.step=i;break;}
  document.querySelector('main').outerHTML=`<main class="tempo-question-shell" id="tempo-main"><form id="tempo-form" novalidate><div id="tempo-question" class="tempo-question"></div><footer class="tempo-controls"><button type="button" class="tempo-back" data-back>Voltar</button><span class="tempo-selection-note" data-selection-note></span><button class="tempo-action" type="submit" data-next disabled>Próximo ${arrow}</button></footer></form></main>`;
  form=document.querySelector('#tempo-form');pane=document.querySelector('#tempo-question');next=form.querySelector('[data-next]');back=form.querySelector('[data-back]');
  pane.addEventListener('change',event=>{
   const input=event.target,q=model.question(state,state.step);if(!input.matches('.tempo-option input'))return;
   state=model.choose(state,q.key,['days','number'].includes(q.kind)?Number(input.value):input.value);
   const custom=pane.querySelector('[data-custom-number]');if(custom){custom.value='';custom.removeAttribute('aria-invalid');pane.querySelector('#tempo-number-error').textContent='';}
   save();update();
  });
  pane.addEventListener('input',event=>{
   const input=event.target,q=model.question(state,state.step);if(!input.matches('[data-custom-number]'))return;
   const n=input.value.trim()===''?null:Number(input.value),valid=n!==null&&Number.isInteger(n)&&n>=q.min&&n<=q.max;
   state=model.choose(state,q.key,valid?n:null);pane.querySelectorAll('.tempo-option input').forEach(r=>r.checked=false);
   input.setAttribute('aria-invalid',n!==null&&!valid?'true':'false');pane.querySelector('#tempo-number-error').textContent=n!==null&&!valid?`Use um número inteiro de ${q.min} a ${q.max}.`:'';save();update();
  });
  pane.addEventListener('click',event=>{
   if(!event.target.closest('[data-unknown]'))return;
   const q=model.question(state,state.step);state=model.choose(state,q.key,'unknown');pane.querySelectorAll('.tempo-option input').forEach(r=>r.checked=false);
   const custom=pane.querySelector('[data-custom-number]');if(custom){custom.value='';custom.removeAttribute('aria-invalid');pane.querySelector('#tempo-number-error').textContent='';}save();update();
  });
  form.addEventListener('submit',event=>{event.preventDefault();if(busy||!model.valid(state,state.step))return;if(state.step===model.lastStep(state))go('result');else move(1);});
  back.addEventListener('click',()=>{if(busy)return;if(state.step===0)location.assign('tempo.html');else move(-1);});
  content();if(focus)pane.querySelector('h1').focus({preventScroll:true});
 }
 function option(o,q){
  const numeric=q.kind!=='choice';
  return `<label class="tempo-option"><input type="radio" name="${q.key}" value="${o.id}" ${state[q.key]===o.id?'checked':''}><span class="tempo-option__text"><strong>${escape(o.label)}</strong>${o.detail?`<small>${escape(o.detail)}</small>`:''}</span><span class="tempo-option__check" aria-hidden="true">${numeric?'<svg viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="1.6"/></svg>':''}</span></label>`;
 }
 function content(){
  const q=model.question(state,state.step);
  let answers=`<fieldset class="tempo-options tempo-options--${q.kind}" aria-labelledby="tempo-question-title"><legend class="tempo-sr-only">${escape(q.title)}</legend>${q.options.map(o=>option(o,q)).join('')}</fieldset>`;
  if(q.kind==='number')answers+=`<div class="tempo-custom-line"><label class="tempo-custom"><span>Ou outro tempo</span><input data-custom-number type="number" inputmode="numeric" min="${q.min}" max="${q.max}" step="1" aria-label="Tempo em minutos" aria-describedby="tempo-number-error" value=""><span>min</span></label><button type="button" class="tempo-unknown" data-unknown aria-pressed="false">Não sei estimar</button></div><p class="tempo-input-error" id="tempo-number-error" aria-live="polite"></p>`;
  if(q.kind==='days')answers+='<button type="button" class="tempo-unknown" data-unknown aria-pressed="false">Não consigo lembrar</button>';
  pane.innerHTML=`<div class="tempo-question__content" data-step="${state.step}"><p class="tempo-context"><span class="tempo-context__line" aria-hidden="true"></span>${escape(q.context)}</p><h1 id="tempo-question-title" tabindex="-1">${lines(q.title)}</h1><p class="tempo-question__hint" id="tempo-question-hint">${escape(q.hint)}</p>${answers}</div>`;
  const custom=pane.querySelector('[data-custom-number]');if(custom)custom.value=typeof state[q.key]==='number'&&!q.options.some(o=>o.id===state[q.key])?state[q.key]:'';
  update();save();
 }
 function update(){
  next.disabled=busy||!model.valid(state,state.step);next.innerHTML=(state.step===model.lastStep(state)?'Ver meu retrato':'Próximo')+' '+arrow;
  const q=model.question(state,state.step),unknown=pane.querySelector('[data-unknown]');if(unknown)unknown.setAttribute('aria-pressed',String(state[q.key]==='unknown'));
  document.querySelector('[data-selection-note]').textContent=state[q.key]==='unknown'?'Tudo bem. Não vamos inventar esse número.':'';
  const total=model.lastStep(state)+1,progress=document.querySelector('.tempo-progress__track');
  progress.setAttribute('aria-valuenow',state.step+1);progress.setAttribute('aria-valuemax',total);
  document.querySelector('[data-count]').textContent=`${state.step+1} / ${total}`;document.querySelector('[data-progress-bar]').style.width=((state.step+1)/total*100)+'%';
 }
 async function move(direction){
  if(busy)return;busy=true;next.disabled=true;back.disabled=true;
  if(document.activeElement?.matches('input'))document.activeElement.blur();
  if(!reduced.matches)await pane.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:`translateY(${-direction*8}px)`}],{duration:130,easing:'ease-out'}).finished.catch(()=>{});
  state.step+=direction;content();pane.scrollTop=0;pane.querySelector('h1').focus({preventScroll:true});
  if(!reduced.matches)pane.animate([{opacity:0,transform:`translateY(${direction*12}px)`},{opacity:1,transform:'translateY(0)'}],{duration:330,easing:'cubic-bezier(.22,.75,.25,1)'});
  busy=false;back.disabled=false;update();
 }
 function renderResult(focus){
  const result=model.estimate(state),main=document.querySelector('main');
  if(!result){main.outerHTML=`<main class="tempo-result"><div class="tempo-empty"><p class="tempo-eyebrow">Seu dia, visto de perto</p><h1>Seu retrato começa<br>com você.</h1><p>Responda a algumas perguntas sobre os seus últimos dias.</p><a class="tempo-action" href="tempo-questionario.html?novo=1">Começar ${arrow}</a></div></main>`;return;}
  const p=model.patterns[state.pattern],f=model.feelings[state.feeling],e=model.effects[state.effect];
  const normal=result.kind==='estimate',outside=result.kind==='outside',zero=result.kind==='zero';
  const title=outside?(state.feeling==='calm'?'Você está conseguindo\nencerrar o dia.':'Seu dia não cabe\nem uma resposta pronta.'):zero?'Esse desvio não tomou\nmais tempo do seu dia.':e.heading;
  const frequency=typeof state.days==='number'?`<div class="tempo-days" aria-label="${state.days} de 5 dias"><div class="tempo-days__marks" aria-hidden="true">${[1,2,3,4,5].map(n=>`<span class="${n<=state.days?'is-filled':''}" style="--i:${n}"></span>`).join('')}</div><p>Em <strong>${state.days} dos seus últimos 5 dias</strong> de trabalho.</p></div>`:'';
  const measure=normal?`<div class="tempo-result__measure"><strong>${model.formatMinutes(result.periodMinutes)}</strong><p>nos seus últimos 5 dias de trabalho,<br>${state.pattern==='wait'?'sem conseguir avançar enquanto esperava':'só para '+escape(p.verb)}.</p></div><p class="tempo-result__equation">${state.minutes} min por dia × ${state.days} ${state.days===1?'dia':'dias'} em que isso aconteceu.</p>`:outside?`<p class="tempo-result__lead">${escape(f.result)} ${state.feeling==='calm'?'E não reconheceu nenhuma dessas situações no seu dia. Não apareceu aqui uma perda de tempo para calcular.':'Você não reconheceu nenhuma das situações que perguntamos. O que está por trás dessa sensação ainda precisa de outro olhar.'}</p>`:zero?'<p class="tempo-result__lead">Você não identificou tempo extra nessa situação. Por aqui, não há uma perda de tempo a somar.</p>':'<p class="tempo-result__lead">Você identificou o que aconteceu, mas ainda falta uma parte da conta. O seu relato continua valendo. A estimativa pode esperar.</p>';
  const projection=normal?`<details class="tempo-result__method"><summary><span>Se esse ritmo continuar por um mês</span><span aria-hidden="true">+</span></summary><div class="tempo-method__body"><strong>Cerca de ${model.formatMinutes(result.monthlyMinutes)}</strong><p>Esta projeção usa os ${state.minutes} minutos por dia que você estimou, na frequência de ${state.days} em cada 5 dias, para um mês com 22 dias de trabalho.</p><p>É uma aproximação das suas respostas. Não é uma medição nem significa que todo esse tempo poderia ser eliminado.</p></div></details>`:'';
  const reflection=outside?`<section class="tempo-result__reflection"><p class="tempo-eyebrow">Uma pista para observar</p><h2>${state.feeling==='calm'?'O que ajudou o seu dia<br>a funcionar?':'O que deixou o dia diferente<br>do que você esperava?'}</h2><p>${state.feeling==='calm'?'No próximo dia, repare no que ajudou você a concluir o trabalho e desligar. Reconhecer o que funciona também faz parte de entender seu tempo.':'Ao encerrar o próximo dia, compare o que pretendia fazer com o que de fato fez. Se houver uma diferença, comece por ela.'}</p></section>`:`<div class="tempo-result__details"><section><p class="tempo-eyebrow">Além dos minutos</p><h2>O que você contou.</h2><p>“${escape(f.label)}”</p></section><section><p class="tempo-eyebrow">No seu próximo dia</p><h2>Observe uma coisa.</h2><p>${escape(p.observation)}</p></section></div>`;
  main.outerHTML=`<main class="tempo-result"><p class="tempo-eyebrow">Seu dia, visto de perto</p><h1 tabindex="-1">${lines(title)}</h1>${measure}${outside?'':frequency}${projection}${reflection}<footer class="tempo-result__footer"><button class="tempo-back" data-review>Rever minhas respostas</button><a class="tempo-action" href="tempo.html">Voltar ao início ${arrow}</a></footer></main>`;
  document.querySelector('[data-review]').addEventListener('click',()=>go('questions'));
  if(focus)document.querySelector('h1').focus({preventScroll:true});window.scrollTo(0,0);
 }
 addEventListener('popstate',()=>{state=read();mount(location.pathname.endsWith('tempo-resultado.html')?'result':'questions',true);});
 mount(document.body.dataset.tempoPage);
})();
