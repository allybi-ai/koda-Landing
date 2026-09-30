// Builds the publication into a temp folder, starts it, and checks the production contract.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allybi-landing-')), 'site');
const port = 18000 + Math.floor(Math.random() * 1000);
let child;
const url = p => `http://127.0.0.1:${port}${p}`;
const get = (p, init = {}) => fetch(url(p), { redirect: 'manual', ...init });

before(async () => {
  execFileSync('node', ['deploy/build-public.mjs', root, out], { cwd: root, stdio: 'pipe' });
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(out, 'node_modules'));
  child = spawn('node', ['server.js'], { cwd: out, env: { PATH: process.env.PATH, PORT: String(port), BASE_DIR: out }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(url('/healthz')); return; } catch { await new Promise(r => setTimeout(r, 100)); } }
  throw new Error('server did not start');
});
after(() => child?.kill());

test('pages are served with security headers and a CSP that covers every inline script', async () => {
  for (const p of ['/', '/pricing.html', '/how-it-works.html', '/security-overview.html', '/contact.html', '/tempo.html', '/diagnostico.html', '/privacy.html', '/terms.html', '/explore']) {
    const res = await get(p);
    assert.equal(res.status, 200, p);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    const csp = res.headers.get('content-security-policy');
    const html = await res.text();
    const inline = [...html.matchAll(/<script\b(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)].filter(m => m[1].trim());
    assert.equal((csp.match(/'sha256-/g) || []).length, inline.length, p);
    assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=/i, p);
    assert.doesNotMatch(html, /app\.allybi\./, p);
  }
});

test('server code, packages and dependencies are never served', async () => {
  for (const p of ['/server.js', '/server/contact.js', '/package.json', '/package-lock.json', '/node_modules/nodemailer/package.json', '/publication-sha256.json', '/deploy/build-public.mjs', '/tests/x', '/assets', '/%2e%2e/etc/passwd']) {
    assert.equal((await get(p)).status >= 400, true, p);
  }
});

test('app buttons enter the app in the language being shown, and the choice is shared', async () => {
  let res = await get('/app');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/h/m7t3j9?lang=pt-BR');
  assert.match(res.headers.get('set-cookie'), /allybi_lang=pt/);
  res = await get('/login', { headers: { cookie: 'allybi_lang=en; allybi_lang_explicit=1' } });
  assert.equal(res.headers.get('location'), '/a/r9p3q1?lang=en');
  res = await get('/signup?lang=en&returnTo=/c/abc');
  assert.equal(res.headers.get('location'), '/a/t4w8n6?lang=en&returnTo=%2Fc%2Fabc');
  res = await get('/app?returnTo=//evil.example');
  assert.equal(res.headers.get('location'), '/h/m7t3j9?lang=pt-BR');
});

test('language: Portuguese by default, a choice persists and is rendered on every page', async () => {
  const plain = await (await get('/')).text();
  assert.match(plain, /<html lang="pt-BR"/);
  const chosen = await get('/pricing.html?lang=en');
  assert.match(chosen.headers.get('set-cookie'), /allybi_lang=en/);
  const next = await (await get('/about.html', { headers: { cookie: 'allybi_lang=en; allybi_lang_explicit=1' } })).text();
  assert.match(next, /<html lang="en"/);
  const switcher = fs.readFileSync(path.join(out, 'language-switcher.js'), 'utf8');
  assert.match(switcher, /addEventListener\('storage'/);
  assert.match(switcher, /allybiExplicitLanguage/);
  assert.doesNotMatch(switcher, /'allybi\.co'/);
});

test('returning visitors go to the app; /healthz; read-only except the contact form', async () => {
  assert.equal((await get('/', { headers: { cookie: 'allybi_seen=1' } })).headers.get('location'), '/app');
  assert.equal(await (await get('/healthz')).text(), 'ok');
  assert.equal((await get('/pricing.html', { method: 'POST' })).status, 405);
  const res = await get('/api/contact', { method: 'POST', headers: { origin: `http://127.0.0.1:${port}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'a@example.com', subject: 'x', message: 'hello' }) });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'unavailable' });
});

test('visuals unchanged: every published style, image and font is byte-identical to the source', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'publication-sha256.json'), 'utf8'));
  for (const name of Object.keys(manifest).filter(n => /\.(css|svg|png|jpg|webp|woff2?|json)$/.test(n))) {
    assert.deepEqual(fs.readFileSync(path.join(out, name)), fs.readFileSync(path.join(root, name)), name);
  }
});
