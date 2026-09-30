'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { subjectForCategory } = require('../assets/contact-message.js');
const { createContactHandler, createSmtpDelivery, validateMessage } = require('../server/contact.js');
const valid = {email:'ana@example.com',subject:'Dúvida',message:'Como conecto meus arquivos?',website:''};

async function withEndpoint(options, check) {
 const server = http.createServer(createContactHandler(options));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const post = (body=valid, headers={}) => fetch(origin+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(body)});
 try { await check(post,origin); } finally { await new Promise(r=>server.close(r)); }
}
test('category links only prefill recognized subjects',()=>{
 assert.equal(subjectForCategory('security','pt-BR'),'Dúvida sobre privacidade e segurança');
 assert.equal(subjectForCategory('support','en'),'Help with my account');
 assert.equal(subjectForCategory('__proto__','pt'),'');
 assert.equal(subjectForCategory('unknown','pt'),'');
});
test('validates required fields and rejects email/header injection and oversized messages',()=>{
 assert.equal(validateMessage({...valid,email:'ana@example.com\r\nBcc: other@example.com'}),null);
 assert.equal(validateMessage({...valid,message:'  '}),null);
 assert.equal(validateMessage({...valid,message:'a'.repeat(3001)}),null);
 assert.equal(validateMessage({...valid,website:'bot'}),null);
 assert.equal(validateMessage({...valid,email:4}),null);
 assert.equal(validateMessage(valid).email,'ana@example.com');
 assert.equal('name' in validateMessage(valid),false);
 assert.equal(validateMessage({...valid,subject:'Oi\nBcc: other@example.com'}),null);
 assert.equal(validateMessage({...valid,subject:''}).subject,'Contato pelo site do Allybi');
});
test('only confirms after delivery accepts; concurrent retries do not duplicate mail',async()=>{
 let count=0;let release;
 const ready=new Promise(r=>release=r);
 await withEndpoint({deliver:async m=>{count++;assert.equal(m.email,valid.email);await ready;}},async post=>{
  const headers={'Idempotency-Key':'a'.repeat(32)};
  const first=post(valid,headers);const duplicate=post(valid,headers);
  await new Promise(r=>setTimeout(r,50));
  assert.equal(count,1);release();
  const replies=await Promise.all([first,duplicate]);
  assert.deepEqual(replies.map(r=>r.status),[200,200]);
  assert.deepEqual(await replies[0].json(),{ok:true});
  assert.equal((await post({...valid,message:'Outra pergunta'},headers)).status,409);
 });
});
test('unconfigured or failed delivery cannot report success',async()=>{
 await withEndpoint({deliver:null},async post=>assert.equal((await post()).status,503));
 await withEndpoint({deliver:async()=>{throw new Error('private SMTP detail');}},async post=>{
  const response=await post();assert.equal(response.status,502);
  assert.doesNotMatch(await response.text(),/SMTP|private/);
 });
});
test('rejects foreign origins, invalid payloads and repeated submissions',async()=>{
 let count=0;
 await withEndpoint({deliver:async()=>{count++;},maxAttempts:2},async post=>{
  assert.equal((await post(valid,{Origin:'https://unrelated.example'})).status,403);
  assert.equal((await post({...valid,email:'bad'})).status,400);
  assert.equal((await post()).status,200);
  assert.equal((await post()).status,429);
  assert.equal(count,1);
 });
});
test('the endpoint rejects oversized JSON before delivery',async()=>{
 let calls=0;
 await withEndpoint({deliver:async()=>{calls++;}},async post=>{
  const response=await post({...valid,message:'x'.repeat(21000)});
  assert.equal(response.status,413);assert.equal(calls,0);
 });
});
test('SMTP fixes recipient, uses reply-to, and only accepts actual recipient acceptance',async()=>{
 let config,mail;
 const fake={createTransport(c){config=c;return {async sendMail(m){mail=m;return {accepted:['info@allybi.com.br']};}};}};
 const env={CONTACT_SMTP_HOST:'smtp.example.com',CONTACT_SMTP_USER:'user',CONTACT_SMTP_PASS:'secret',CONTACT_FROM:'website@allybi.com.br'};
 const deliver=createSmtpDelivery(env,fake);await deliver(valid);
 assert.equal(mail.to,'info@allybi.com.br');assert.equal(mail.replyTo.address,valid.email);
 assert.equal(mail.from,env.CONTACT_FROM);assert.equal(config.requireTLS,true);
 assert.equal(createSmtpDelivery({},fake),null);
 const reject={createTransport(){return {async sendMail(){return {accepted:[]};}};}};
 await assert.rejects(createSmtpDelivery(env,reject)(valid));
});
