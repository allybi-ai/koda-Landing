/* Illustrative examples: local presentation only, never network or account actions. */
(() => {
 'use strict';
 const root=document.querySelector('#how-it-works-page');
 if(!root)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const section=root.querySelector('.origins-showcase');
 const tabs=[...section.querySelectorAll('[data-origin]')];
 const panel=section.querySelector('[role=tabpanel]');
 const demo=section.querySelector('.origins-demo');
 const source=section.querySelector('.origins-source');
 const thinking=section.querySelector('.app-thinking');
 const answer=section.querySelector('.origins-answer');
 const image=(name)=>`assets/images/${name}.svg`;
 const native=(name)=>`assets/images/app-native/${name}.svg`;
 const glyph=(name)=>`<img class="app-glyph" src="${native(name)}" alt="" width="19" height="19">`;
 const heading=(title,provider='')=>`<div class="app-panel-heading origin-panel-heading">${provider?`<img class="app-provider" src="${image(provider)}" alt="" width="24" height="24">`:glyph('collapse-panel')}<span>${title}</span><div class="app-panel-actions" aria-hidden="true">${glyph('switch-panels')}${glyph('expand')}</div></div>`;
 const paper=(title,body,page)=>`<div class="origin-preview"><article class="origin-paper"><div class="origin-paper__brand">Aurora<span>Documento de trabalho · 2026</span></div><h4>${title}</h4>${body}<footer><span>Aurora Serviços Ltda.</span><span>${page}</span></footer></article></div>`;
 const file=(title,kind,detail)=>`<div class="origin-file-row"><img src="${native(kind)}" alt="" width="32" height="32"><div><b>${title}</b><small>${detail}</small></div><span aria-hidden="true">···</span></div>`;
 const draft=(provider,person,body,subject='')=>heading(provider==='whatsapp-icon'?'Mensagem no WhatsApp':'Novo e-mail',provider)+`<div class="origin-draft"><div class="origin-draft__recipient"><span>Para</span><b>${person}</b></div>${subject?`<div class="origin-draft__subject"><span>Assunto</span>${subject}</div>`:''}<div class="origin-draft__body">${body}</div><div class="origin-draft__footer"><span>${provider==='whatsapp-icon'?'Revise antes de abrir no WhatsApp.':'Confira antes de enviar.'}</span><button type="button" class="origin-send" data-demo-send>Enviar ${glyph('arrow')}</button></div><p class="origin-draft__status" role="status"></p></div>`;
 const examples={
  upload:{label:'Upload',kind:'document',title:'Um PDF. Uma resposta que você confere.',description:'Traga o arquivo que está com você. Pergunte e abra a cláusula que sustenta a resposta.',chat:'Antes da renovação',question:'Quanto tempo antes preciso avisar que não vou renovar?',response:'<p>O aviso precisa chegar <strong>30 dias antes do vencimento.</strong></p><p>A cláusula 4.2 prevê comunicação por escrito. O trecho está na página 6.</p>',citation:'Contrato de serviços.pdf · p. 6',icon:native('pdf'),source:paper('Contrato de prestação de serviços','<p class="origin-document-meta">Contrato nº 024/2026 · Condições gerais</p><h5>3. Prestação dos serviços</h5><p>3.1. Os serviços serão executados de acordo com o escopo acordado entre as partes, observadas as condições deste instrumento.</p><h5>4. Vigência e renovação</h5><p>4.1. A vigência inicial será de doze meses, contados da data de assinatura deste contrato.</p><p>4.2. A não renovação deverá ser comunicada por escrito com <mark>antecedência mínima de 30 dias do vencimento.</mark></p><p>4.3. Na ausência de comunicação dentro do prazo, permanecem válidas as condições de renovação previstas neste instrumento.</p><h5>5. Comunicações</h5><p>5.1. As comunicações entre as partes serão realizadas pelos endereços eletrônicos indicados no contrato.</p>','6')},
  drive:{label:'Google Drive',kind:'library',title:'A reunião começa com o contexto em dia.',description:'Reúna o que está em arquivos diferentes da mesma pasta. Chegue à reunião com os pontos que precisam de decisão.',chat:'Reunião com a Aurora',question:'O que falta decidir antes de aprovar o projeto da Aurora?',response:'<p>Faltam <strong>o escopo da implantação e a aprovação de R$ 96 mil.</strong></p><p>A proposta detalha o investimento. A pauta registra a implantação como ponto em aberto.</p><p>Leve os dois documentos para fechar essas decisões na reunião.</p>',citation:'Proposta.pdf + Pauta da reunião.docx',icon:native('pdf'),source:heading('Seu workspace')+'<div class="origin-library"><div class="origin-breadcrumb"><img src="'+image('google-drive-icon')+'" alt="Google Drive">Google Drive <span>›</span> Aurora</div><div class="app-library-label">Pastas<span>＋ Nova pasta</span></div><div class="origin-mini-folders">'+['Planejamento','Comercial','Reuniões'].map(n=>'<div><img src="assets/images/app-native/folder-occupied.webp" alt=""><span>'+n+'</span></div>').join('')+'</div><div class="app-library-label">Arquivos<span>＋ Novo arquivo</span></div>'+file('Proposta.pdf','pdf','Atualizado hoje')+file('Pauta da reunião.docx','document','Atualizado ontem')+file('Cronograma.xlsx','sheet','12 de setembro')+'</div>'},
  onedrive:{label:'OneDrive',kind:'spreadsheet',title:'O total conta uma parte. A planilha conta o resto.',description:'Cruze os valores e veja o que mais contribuiu para a mudança, com os números que sustentam a análise.',chat:'Margem por unidade',question:'Qual unidade explica a maior parte da queda da margem?',response:'<p>A unidade <strong>Sul explica 60% da queda.</strong></p><p>São R$ 18 mil de uma redução total de R$ 30 mil. Centro e Norte respondem pelos outros R$ 12 mil.</p><p>O valor está na célula D4, na aba Margem.</p>',citation:'Margem por unidade.xlsx · D2:D5',icon:native('sheet'),source:heading('Margem por unidade.xlsx')+'<div class="origin-sheet"><div class="origin-formula"><span>D4</span><i>ƒx</i> =C4-B4</div><div class="origin-sheet-scroll"><table><thead><tr><th></th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead><tbody><tr><th>1</th><td>Unidade</td><td>Agosto</td><td>Setembro</td><td>Variação</td></tr><tr><th>2</th><td>Centro</td><td>48.000</td><td>40.000</td><td>−8.000</td></tr><tr><th>3</th><td>Norte</td><td>32.000</td><td>28.000</td><td>−4.000</td></tr><tr><th>4</th><td>Sul</td><td>60.000</td><td>42.000</td><td class="is-cell-active">−18.000</td></tr><tr><th>5</th><td>Total</td><td>140.000</td><td>110.000</td><td>−30.000</td></tr>'+[6,7,8,9,10].map(i=>'<tr><th>'+i+'</th><td></td><td></td><td></td><td></td></tr>').join('')+'</tbody></table></div><div class="origin-sheet-tabs"><span>＋</span><b>Margem</b><span>Receitas</span><span>Despesas</span></div><div class="origin-sheet-provider"><img src="'+image('onedrive-icon')+'" alt="">Financeiro / Setembro</div></div>'},
  sharepoint:{label:'SharePoint',kind:'document',title:'A versão mudou. O aceite também.',description:'Compare o conteúdo dos documentos e identifique onde aparece a assinatura, sem depender apenas do nome do arquivo.',chat:'Versão com aceite',question:'Compare a v2 e a v3. O que mudou e qual está assinada?',response:'<p>A v3 inclui a implantação nos mesmos <strong>R$ 24 mil</strong> e traz a assinatura de Camila Rocha.</p><table class="origin-comparison"><thead><tr><th></th><th>v2</th><th>v3</th></tr></thead><tbody><tr><td>Implantação</td><td>À parte</td><td>Incluída</td></tr><tr><td>Total</td><td>R$ 24.000</td><td>R$ 24.000</td></tr><tr><td>Assinatura</td><td>Não consta</td><td>Camila Rocha</td></tr></tbody></table>',citation:'Proposta v2.pdf + Proposta v3.pdf · p. 7',icon:native('pdf'),source:paper('Proposta de serviços','<p class="origin-document-meta">Revisão 3 · 16 de setembro de 2026</p><h5>6. Escopo e investimento</h5><p>O investimento total de <strong>R$ 24.000,00</strong> contempla os serviços apresentados nesta proposta.</p><p><mark>A implantação está incluída no valor total</mark>, conforme as condições acordadas entre as partes.</p><h5>7. Aceite da proposta</h5><p>Ao assinar, a contratante manifesta sua concordância com o escopo, o investimento e as condições descritas neste documento.</p><div class="origin-signature">Camila Rocha</div><small class="origin-signature-caption">Camila Rocha · Representante da contratante</small>','7')},
  gmail:{label:'Gmail',kind:'mail',title:'Você lembra do pedido. A conversa está aqui.',description:'Descreva o que ficou na memória. Recupere a conversa antiga e o detalhe que mudou o combinado.',chat:'A entrega mudou de dia',question:'Ache o e-mail em que o Lucas pediu para trocar a entrega.',response:'<p>Lucas pediu a entrega para <strong>14 de outubro, às 9h.</strong></p><p>A mensagem está na conversa “Entrega dos materiais”, enviada em 8 de setembro.</p><p>Abri o e-mail com o trecho para você conferir.</p>',citation:'Entrega dos materiais · Lucas · 8 set.',icon:image('gmail-icon'),source:heading('Entrega dos materiais','gmail-icon')+'<article class="origin-mail"><div class="origin-mail__from"><span class="origin-mail__avatar">L</span><div><b>Lucas Almeida</b><small>para você</small></div><time>8 set. · 14:32</time></div><div class="origin-mail__body"><p>Oi, tudo bem?</p><p>Conseguimos passar a entrega para <mark>14 de outubro, às 9h</mark>?</p><p>A equipe vai estar no local para receber. Assim conseguimos conferir os materiais e organizar tudo antes da instalação.</p><p>Me avise se esse horário funciona para vocês.</p><p>Obrigado,<br>Lucas</p></div><div class="origin-mail__thread">1 mensagem nesta conversa</div></article>'},
  outlook:{label:'Outlook',kind:'outgoing',title:'Da informação certa à mensagem pronta.',description:'Peça o e-mail com o contexto que importa. Confira o destinatário e a mensagem antes de confirmar o envio.',chat:'Previsão para o Pedro',question:'Prepare um e-mail ao Pedro: a entrega ficou para 14 de outubro, às 9h.',response:'<p>Preparei o e-mail com <strong>a data, o horário e o pedido de confirmação.</strong></p><p>Confira a mensagem ao lado antes de enviar.</p>',citation:'Rascunho no Outlook · Pedro Martins',icon:image('outlook-icon'),source:draft('outlook-icon','Pedro Martins','<p>Oi, Pedro.</p><p>A entrega ficou para <strong>14 de outubro, às 9h.</strong></p><p>Você confirma a disponibilidade da equipe para receber? Assim conseguimos manter a instalação conforme o planejado.</p><p>Obrigada,<br>Joana</p>','Entrega em 14 de outubro')},
  whatsapp:{label:'WhatsApp',kind:'outgoing',title:'O combinado vira uma mensagem clara.',description:'Leve o ponto importante para a conversa com o cliente. Revise o texto e continue no WhatsApp para concluir o envio.',chat:'Mensagem para a Beatriz',question:'Avise a Beatriz que a implantação está incluída nos R$ 24 mil da proposta.',response:'<p>A mensagem destaca que <strong>a implantação já está incluída no valor.</strong></p><p>Confira o texto ao lado. Ao continuar, a mensagem abre no WhatsApp para você concluir o envio.</p>',citation:'Mensagem para Beatriz · para revisão',icon:image('whatsapp-icon'),source:draft('whatsapp-icon','Beatriz Costa','<p>Oi, Beatriz!</p><p>A implantação já está incluída nos <strong>R$ 24 mil</strong> da proposta.</p><p>Esse valor contempla o escopo que alinhamos, sem uma cobrança separada pela implantação.</p><p>Se precisar, posso te encaminhar a versão com esse detalhe.</p>')}
 };
 let selected=0;
 const timers=new Set();
 let animation;
 function cancelPending(){timers.forEach(clearTimeout);timers.clear();animation?.cancel();}
 function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);}
 function finish(){demo.dataset.phase='ready';thinking.hidden=true;answer.hidden=false;demo.removeAttribute('aria-busy');}
 function play(){
  cancelPending();
  if(reduced.matches){finish();return;}
  demo.dataset.phase='question';demo.setAttribute('aria-busy','true');thinking.hidden=true;answer.hidden=true;
  later(()=>{demo.dataset.phase='thinking';thinking.hidden=false;},250);
  later(()=>{finish();animation=answer.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:350,easing:'cubic-bezier(.22,.72,.18,1)'});},1100);
 }
 function show(index,animate=true){
  cancelPending();selected=index;const tab=tabs[index],example=examples[tab.dataset.origin];
  tabs.forEach((t,i)=>{t.setAttribute('aria-selected',String(i===index));t.tabIndex=i===index?0:-1;});
  panel.setAttribute('aria-labelledby',tab.id);
  demo.dataset.kind=example.kind;thinking.lastElementChild.textContent=example.kind==='outgoing'?'Preparando a mensagem':'Consultando a fonte';source.setAttribute('aria-label',example.kind==='outgoing'?'Mensagem para revisão':'Fonte: '+example.label);
  section.querySelector('.origins-copy h3').textContent=example.title;
  section.querySelector('.origins-copy>p').textContent=example.description;
  section.querySelector('.origins-chat .app-panel-heading>span').textContent=example.chat;
  section.querySelector('.app-user-message').textContent=example.question;
  section.querySelector('.app-answer').innerHTML=example.response;
  section.querySelector('.origins-citation').innerHTML=`<img src="${example.icon}" alt="" width="24" height="24"><span>${example.citation}</span>`;
  source.innerHTML=example.source;
  if(animate)play();else finish();
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>show(index));
  tab.addEventListener('keydown',e=>{
   const next={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[e.key];
   if(next===undefined)return;e.preventDefault();show(next);tabs[next].focus();tabs[next].scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  });
 });
 section.querySelector('.origins-citation').addEventListener('click',()=>{
  source.scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});
  if(!reduced.matches)source.animate([{boxShadow:'0 0 0 2px #73869c60'},{boxShadow:'0 0 0 0px #73869c00'}],{duration:850});
 });
 root.querySelectorAll('[data-origin-target]').forEach(node=>node.addEventListener('click',()=>{
  const i=tabs.findIndex(tab=>tab.dataset.origin===node.dataset.originTarget);if(i<0)return;
  show(i);section.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
 }));
 source.addEventListener('click',e=>{
  if(!e.target.closest('[data-demo-send]'))return;
  source.querySelector('.origin-draft__status').textContent=tabs[selected].dataset.origin==='whatsapp'?'Demonstração: você continuaria no WhatsApp para enviar.':'Demonstração: nenhum e-mail foi enviado.';
 });
 reduced.addEventListener('change',()=>{if(reduced.matches){cancelPending();finish();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelPending();finish();}});
 if('IntersectionObserver' in window){
  let entered=false;
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){
   if(entry.isIntersecting&&!entered){entered=true;play();}
   else if(!entry.isIntersecting){cancelPending();finish();}
  }},{threshold:.28});
  observer.observe(demo);
 }
 show(0,false);
})();
