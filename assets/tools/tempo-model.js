(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.AllybiTempo=model;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const feelings={
  busy:{label:'Fiz muita coisa. O principal ficou.',echo:'Muita coisa feita. O principal esperando.',result:'Você termina com a sensação de ter feito muito e deixado o principal para depois.'},
  on:{label:'Parei de trabalhar. A cabeça, não.',echo:'O trabalho termina. A cabeça continua.',result:'Você percebe que o trabalho continua na cabeça mesmo depois de parar.'},
  tomorrow:{label:'Amanhã eu vou ter que correr de novo.',echo:'O dia seguinte já começa ocupado.',result:'Você encerra o dia pensando no que vai precisar correr para fazer amanhã.'},
  calm:{label:'Consigo encerrar e ficar em paz.',echo:'Você consegue encerrar o dia.',result:'Você conta que consegue encerrar o dia e ficar em paz.'}
 };
 const patterns={
  interrupt:{label:'Uma coisa interrompia a outra.',echo:'Você saía de uma coisa para resolver outra.',verb:'retomar o que você estava fazendo',timeContext:'Retomar uma tarefa interrompida.',result:'interrupções e retomadas',question:'Como ficou a tarefa que você interrompeu?',hint:'Some os minutos para lembrar onde parou e voltar à tarefa. Não conte o trabalho feito durante a interrupção.',observation:'Na próxima interrupção, anote em uma linha onde você parou. Ao voltar, observe quanto precisou reconstruir para continuar.'},
  search:{label:'Eu procurava o que precisava para seguir.',echo:'Antes de fazer, você precisava encontrar.',verb:'procurar o que precisava',timeContext:'Procurar uma informação para seguir.',result:'procurar informações',question:'Como ficou a tarefa que precisava dessa informação?',hint:'Pense só na procura: um arquivo, uma mensagem, uma informação. Não inclua a tarefa em si.',observation:'Na próxima busca, repare se você já tinha encontrado aquela informação antes. Isso ajuda a separar uma descoberta de uma procura que se repete.'},
  redo:{label:'Eu refazia ou conferia coisas de novo.',echo:'Algo que parecia pronto voltou para você.',verb:'refazer ou conferir de novo',timeContext:'Refazer ou conferir mais uma vez.',result:'retrabalho e novas conferências',question:'Como ficou o que você ia fazer depois?',hint:'Conte só o que precisou fazer novamente. Deixe a primeira execução fora desta conta.',observation:'Na próxima conferência, observe o que realmente mudou desde a anterior. Separe uma mudança necessária de uma checagem que voltou por falta de certeza.'},
  wait:{label:'Eu dependia de alguém para continuar.',echo:'O próximo passo dependia de outra pessoa.',verb:'ficar sem conseguir avançar',timeContext:'Esperar sem conseguir seguir.',result:'esperas que impediram você de avançar',question:'Como ficou a tarefa que dependia dessa resposta?',hint:'Conte apenas o tempo em que ficou sem conseguir avançar. Exclua a espera em que fez outras coisas.',observation:'Na próxima espera, observe qual resposta falta e o que depende dela. Conte apenas o intervalo em que você realmente ficou sem conseguir avançar.'},
  none:{label:'Nenhuma dessas situações.',echo:'Você não reconheceu esse tipo de desvio.'}
 };
 const effects={
  delayed:{label:'Terminei, mas tomou mais tempo.',result:'Você terminou, mas levou mais tempo do que esperava.',heading:'A tarefa saiu. O tempo extra ficou pelo caminho.'},
  postponed:{label:'Ficou para depois.',result:'O que você ia fazer ficou para depois.',heading:'O dia ficou cheio. A tarefa ficou para depois.'},
  overtime:{label:'Passou do meu horário.',result:'O trabalho avançou para além do seu horário.',heading:'Uma parte do trabalho entrou no seu tempo.'},
  okay:{label:'Consegui seguir normalmente.',result:'Você conseguiu seguir normalmente.',heading:'Houve desvios. Você conseguiu seguir.'}
 };
 const keys=['feeling','pattern','effect','days','minutes'];
 const fresh=()=>({version:3,step:0,feeling:null,pattern:null,effect:null,days:null,minutes:null});
 const owns=(obj,key)=>typeof key==='string'&&Object.prototype.hasOwnProperty.call(obj,key);
 function sanitize(raw){
  const s=fresh();if(!raw||raw.version!==3)return s;
  s.step=Number.isInteger(raw.step)?Math.max(0,Math.min(4,raw.step)):0;
  if(owns(feelings,raw.feeling))s.feeling=raw.feeling;
  if(s.feeling&&owns(patterns,raw.pattern))s.pattern=raw.pattern;
  if(s.pattern&&s.pattern!=='none'&&owns(effects,raw.effect))s.effect=raw.effect;
  if(s.effect&&(raw.days==='unknown'||Number.isInteger(raw.days)&&raw.days>=1&&raw.days<=5))s.days=raw.days;
  if(s.days!==null&&(raw.minutes==='unknown'||Number.isInteger(raw.minutes)&&raw.minutes>=0&&raw.minutes<=480))s.minutes=raw.minutes;
  return s;
 }
 function choose(state,key,value){
  const s=sanitize(state),index=keys.indexOf(key);if(index<0)return s;
  if(s[key]!==value){s[key]=value;keys.slice(index+1).forEach(k=>s[k]=null);}
  return sanitize(s);
 }
 const lastStep=s=>s.pattern==='none'?1:4;
 const valid=(s,i)=>sanitize(s)[keys[i]]!==null;
 const complete=s=>Array.from({length:lastStep(s)+1},(_,i)=>i).every(i=>valid(s,i));
 function estimate(raw){
  const s=sanitize(raw);if(!complete(s))return null;
  if(s.pattern==='none')return {kind:'outside'};
  if(s.minutes===0)return {kind:'zero',periodMinutes:0,monthlyMinutes:0};
  if(s.days==='unknown'||s.minutes==='unknown')return {kind:'unquantified'};
  return {kind:'estimate',periodMinutes:s.days*s.minutes,monthlyMinutes:Math.round(s.days*s.minutes*22/5)};
 }
 function question(s,index){
  const p=patterns[s.pattern]||patterns.interrupt;
  return [
   {key:'feeling',kind:'choice',context:'Pense em como você tem terminado o dia.',title:'Você fecha o trabalho.\nO que fica com você?',hint:'Escolha a frase que mais parece sua.',options:Object.entries(feelings).map(([id,v])=>({id,label:v.label}))},
   {key:'pattern',kind:'choice',context:feelings[s.feeling]?.echo||'',title:s.feeling==='calm'?'Nos últimos dias, alguma coisa\ntomou tempo sem precisar?':'No último dia em que se sentiu assim,\no que tomou o seu tempo?',hint:s.feeling==='calm'?'Pense no seu último dia de trabalho.':'Pense na situação que mais aconteceu.',options:Object.entries(patterns).map(([id,v])=>({id,label:v.label}))},
   {key:'effect',kind:'choice',context:p.echo,title:p.question||'',hint:'O que aconteceu com aquilo que você pretendia fazer?',options:Object.entries(effects).map(([id,v])=>({id,label:v.label}))},
   {key:'days',kind:'days',context:effects[s.effect]?.result||'',title:'Foi um dia fora da curva\nou isso está se repetindo?',hint:'Em quantos dos seus últimos 5 dias de trabalho isso aconteceu?',unit:'dias',options:[1,2,3,4,5].map(n=>({id:n,label:String(n),detail:n===1?'dia':'dias'}))},
   {key:'minutes',kind:'number',context:p.timeContext,title:s.days===1?'Quanto tempo daquele dia\nfoi só para isso?':'Quanto tempo de cada dia\nfoi só para isso?',hint:p.hint,unit:'min',min:0,max:480,options:[0,15,30,60,120].map(n=>({id:n,label:n===120?'2':n===60?'1':String(n),detail:n===60?'hora':n===120?'horas':'min'}))}
  ][index];
 }
 function formatMinutes(value){const n=Math.round(value);if(n===0)return '0 min';const h=Math.floor(n/60),m=n%60;return h?(m?`${h}h ${m}min`:`${h}h`):`${m} min`;}
 return {fresh,sanitize,choose,valid,lastStep,complete,estimate,question,formatMinutes,feelings,patterns,effects};
});
