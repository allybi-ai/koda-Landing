'use strict';
const { createHash } = require('node:crypto');
const RECIPIENT = 'info@allybi.com.br';
const TEN_MINUTES = 10 * 60 * 1000;

function validateMessage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const limits = { email: 254, subject: 160, message: 3000 };
  const result = {};
  for (const [key, limit] of Object.entries(limits)) {
    const value = input[key] == null && key === 'subject' ? '' : input[key];
    if (typeof value !== 'string' || value.length > limit) return null;
    if (key !== 'message' && /[\r\n\0]/.test(value)) return null;
    result[key] = value.trim();
  }
  if (!result.message || input.website) return null;
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(result.email)) return null;
  result.subject ||= 'Contato pelo site do Allybi';
  return result;
}

function createSmtpDelivery(env = process.env, mailer = require('nodemailer')) {
  const {CONTACT_SMTP_HOST: host, CONTACT_SMTP_USER: user, CONTACT_SMTP_PASS: pass, CONTACT_FROM: from} = env;
  if (!host || !user || !pass || !from) return null;
  const port = Number(env.CONTACT_SMTP_PORT || 587);
  const transport = mailer.createTransport({
    host, port, secure: port === 465, requireTLS: true,
    auth: {user, pass}, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true
  });
  return async function deliver(message) {
    const result = await transport.sendMail({
      from, to: RECIPIENT,
      replyTo: {address: message.email},
      subject: `[Site Allybi] ${message.subject}`,
      text: `De: ${message.email}\n\n${message.message}`
    });
    if (!result.accepted?.some(address => String(address).toLowerCase() === RECIPIENT)) {
      throw new Error('Contact recipient was not accepted');
    }
  };
}

function createContactHandler({deliver = null, maxAttempts = 5} = {}) {
  const attempts = new Map();
  const deliveries = new Map();
  function respond(res, status, body) {
    res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify(body));
  }
  return async function contact(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow','POST'); return respond(res,405,{error:'method'});
    }
    let origin;
    try { origin = new URL(req.headers.origin); } catch { return respond(res,403,{error:'origin'}); }
    if (origin.host !== req.headers.host || !['http:','https:'].includes(origin.protocol) || req.headers['sec-fetch-site'] === 'cross-site') {
      return respond(res,403,{error:'origin'});
    }
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') return respond(res,415,{error:'format'});
    let raw;
    const chunks = [];
    try {
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 20000) return respond(res,413,{error:'size'});
        chunks.push(chunk);
      }
      raw = Buffer.concat(chunks).toString('utf8');
    } catch { return respond(res,400,{error:'body'}); }
    let message;
    try { message = validateMessage(JSON.parse(raw)); } catch { return respond(res,400,{error:'body'}); }

    const now = Date.now();
    // Short-lived counters and fingerprints only; message bodies are never persisted.
    for (const [key,item] of attempts) if (item.until < now) attempts.delete(key);
    for (const [key,item] of deliveries) if (item.until < now) deliveries.delete(key);
    const peer = req.socket.remoteAddress;
    const key = req.headers['idempotency-key'];
    const fingerprint = message && createHash('sha256').update(JSON.stringify(message)).digest('hex');
    const existing = key && deliveries.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint || existing.peer !== peer) return respond(res,409,{error:'conflict'});
      const accepted = await existing.result;
      return respond(res,accepted ? 200 : 502,accepted ? {ok:true} : {error:'delivery'});
    }
    const count = attempts.get(peer) || {count:0,until:now + TEN_MINUTES};
    if (count.count >= maxAttempts || attempts.size > 10000 || deliveries.size > 10000) {
      res.setHeader('Retry-After','600'); return respond(res,429,{error:'rate'});
    }
    count.count++; attempts.set(peer,count);
    if (!message) return respond(res,400,{error:'fields'});
    if (key && !/^[a-zA-Z0-9-]{16,64}$/.test(key)) return respond(res,400,{error:'key'});
    if (!deliver) return respond(res,503,{error:'unavailable'});
    // Record the pending promise before yielding, so a second click cannot send twice.
    const result = Promise.resolve().then(()=>deliver(message)).then(()=>true,()=>false);
    if (key) deliveries.set(key,{fingerprint,peer,result,until:now + TEN_MINUTES});
    const accepted = await result;
    if (!accepted && key) deliveries.delete(key);
    respond(res,accepted ? 200 : 502,accepted ? {ok:true} : {error:'delivery'});
  };
}
module.exports = {createContactHandler, createSmtpDelivery, validateMessage};
