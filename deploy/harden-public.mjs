import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export async function hardenPublic(output) {
  const files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(path.join(output, dir), { withFileTypes: true })) {
      const name = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Publication symlink forbidden');
      if (entry.isDirectory()) await walk(name);
      else if (name !== 'server.js') files.push(name);
    }
  }
  await walk('');
  for (const name of files.filter(n => n.endsWith('.html'))) {
    let html = await fs.readFile(path.join(output, name), 'utf8');
    html = html.replace('href="./allybi-components.css />', 'href="./allybi-components.css" />');
    html = html.replace(/(<link rel="stylesheet" href="\.\/allybi-responsive.css" \/>)\s*\1/g, '$1');
    // Replace the two known inline event-handler shapes without adding eval.
    html = html.replaceAll('onclick="window.scrollTo({top:0,behavior:\'smooth\'});return false;"', 'data-scroll-top');
    html = html.replaceAll('onclick="this.setAttribute(\'aria-expanded\', this.getAttribute(\'aria-expanded\')===\'false\');this.nextElementSibling.classList.toggle(\'is-open\')"', 'data-formula-expand');
    if (/\son\w+\s*=/i.test(html)) throw new Error(`Unreviewed inline handler: ${name}`);
    html = html.replace('</body>', '<script src="/safe-events.js" defer></script>\n</body>');
    await fs.writeFile(path.join(output, name), html);
  }
  await fs.writeFile(path.join(output, 'safe-events.js'), `document.addEventListener('click', function(event) {
  const top = event.target.closest('[data-scroll-top]');
  if (top) { event.preventDefault(); window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }
  const formula = event.target.closest('[data-formula-expand]');
  if (formula) { formula.setAttribute('aria-expanded', String(formula.getAttribute('aria-expanded')==='false')); formula.nextElementSibling?.classList.toggle('is-open'); }
});\n`);
  files.push('safe-events.js');
  let server = await fs.readFile(path.join(output, 'server.js'), 'utf8');
  const replace = (before, after) => {
    if (!server.includes(before)) throw new Error('Landing hardening anchor changed');
    server = server.replace(before, after);
  };
  replace("const PORT =", `const { createHash } = require('crypto');
const published = new Set(${JSON.stringify(files)});
function csp(html) {
  const hashes = [...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)]
    .filter(m => m[1].trim()).map(m => "'sha256-" + createHash('sha256').update(m[1]).digest('base64') + "'");
  return "default-src 'self'; script-src 'self' " + hashes.join(' ') + "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
}
const PORT =`);
  replace("  // Parse URL and remove query string", `  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'private, no-store');
  let decoded;
  try { decoded = decodeURIComponent(req.url.split('?')[0]); }
  catch { res.writeHead(400); res.end(); return; }
  if (/[\\x00-\\x1f\\x7f\\\\]/.test(decoded)) { res.writeHead(400); res.end(); return; }
  const aliases = { '/app':'/h/m7t3j9', '/login':'/a/r9p3q1', '/signup':'/a/t4w8n6' };
  const alias = aliases[decoded.replace(/\\/$/, '')];
  if (alias) {
    const incoming = new URL(req.url, 'http://landing.invalid').searchParams;
    const out = new URLSearchParams();
    if (['en','pt','pt-BR'].includes(incoming.get('lang'))) out.set('lang', incoming.get('lang'));
    const destination = incoming.get('returnTo');
    // UX hint only; the app must enforce authorization on the destination.
    if (destination && /^\\/(?:h|c|d|f)(?:\\/|$)/.test(destination) && !/[\\\\\\x00-\\x1f]/.test(destination)) out.set('returnTo', destination);
    res.writeHead(302, {Location:alias + (out.size ? '?' + out : '')}); res.end(); return;
  }
  if (decoded === '/healthz') { res.writeHead(200); res.end('ok'); return; }
  // Parse URL and remove query string`);
  replace("  // Read and serve the file", "  if (!published.has(publishedPath)) { res.writeHead(404); res.end(); return; }\n  // Read and serve the file");
  replace("      res.writeHead(200, {", "      if (extname === '.html') res.setHeader('Content-Security-Policy', csp(body.toString('utf8')));\n      res.writeHead(200, {");
  replace('      res.end(body);', "      res.end(req.method === 'HEAD' ? undefined : body);");
  await fs.writeFile(path.join(output, 'server.js'), server);
  const manifest = {};
  for (const name of [...files, 'server.js']) manifest[name] = createHash('sha256').update(await fs.readFile(path.join(output, name))).digest('hex');
  // Kept outside HTTP allowlist even if accidentally copied into the container.
  await fs.writeFile(path.join(output, 'publication-sha256.json'), JSON.stringify(manifest, null, 2) + '\n');
}
