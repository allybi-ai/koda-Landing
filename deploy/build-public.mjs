// Publication step for the Allybi landing on allybi.com.br (Zuck, 2026-09-29).
// Adapts the designer's source for production without changing any visual:
// no CSS, layout, copy or asset is edited. It only
//   - publishes an allowlist (pages, styles, scripts, assets, translations);
//   - sends app buttons to same-origin /app, /login, /signup;
//   - keeps one language across every tab, the landing and the web app
//     (?lang -> the shared choice -> Portuguese), using the app's own keys;
//   - adds security headers, a CSP with hashed inline scripts, /healthz,
//     read-only methods except POST /api/contact, and a published-file allowlist;
//   - rewires the three inline event handlers to identical listeners (CSP-safe).
// Every rewrite is anchored: if the source changes shape, the build stops.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) throw new Error('Usage: node deploy/build-public.mjs <landing-source> <new-output-directory>');
const source = path.resolve(sourceArg);
const output = path.resolve(outputArg);
if (output === source || output.startsWith(source + path.sep)) throw new Error('Output must be outside the landing source');
try { await fs.access(output); throw new Error(`Output already exists; use a new empty path: ${output}`); }
catch (error) { if (error?.code !== 'ENOENT') throw error; }

// The web app's entry routes (same as the live landing).
const APP_ALIASES = { '/app': '/h/m7t3j9', '/login': '/a/r9p3q1', '/signup': '/a/t4w8n6' };
const PUBLISHED_DIRS = ['assets', 'pages', 'translations'];
const RUNTIME_ONLY = new Set(['server.js', 'package.json', 'package-lock.json']);

function replaceRequired(input, before, after, label) {
  if (!input.includes(before)) throw new Error(`Source shape changed: ${label}`);
  return input.replace(before, after);
}
function replaceRequiredRegex(input, pattern, replacement, label) {
  if (!pattern.test(input)) throw new Error(`Source shape changed: ${label}`);
  pattern.lastIndex = 0;
  return input.replace(pattern, replacement);
}

async function copyTree(relative) {
  for (const entry of await fs.readdir(path.join(source, relative), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const item = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in publication: ${item}`);
    if (entry.isDirectory()) await copyTree(item);
    else if (entry.isFile()) {
      await fs.mkdir(path.dirname(path.join(output, item)), { recursive: true });
      await fs.copyFile(path.join(source, item), path.join(output, item));
    }
  }
}

await fs.mkdir(output, { recursive: true });
for (const entry of await fs.readdir(source, { withFileTypes: true })) {
  if (!entry.isFile() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
  if (/\.(html|css|js)$/.test(entry.name) || RUNTIME_ONLY.has(entry.name)) {
    await fs.copyFile(path.join(source, entry.name), path.join(output, entry.name));
  }
}
for (const dir of [...PUBLISHED_DIRS, 'server']) await copyTree(dir);

// App buttons: https://app.allybi.com.br[/login|/signup] -> same-origin entry.
const appLink = /https:\/\/app\.allybi\.(?:com\.br|co)(\/(?:login|signup))?\/?(?=[?#"'\s<]|$)/g;
const toEntry = (_m, route) => (route === '/login' ? '/login' : route === '/signup' ? '/signup' : '/app');

// Inline handlers -> identical listeners. Exact strings only; anything new stops the build.
const SCROLL_TOP = ` onclick="window.scrollTo({top:0,behavior:'smooth'});return false;"`;
const HERO_FALLBACK_BODY = "document.documentElement.classList.remove('has-cinematic-potential','has-cinematic-runway','has-cinematic-hero','home-hero-runway-locked','home-hero-lock-visible');document.documentElement.classList.add('home-hero-fallback-ready');document.querySelector('.home-hero').classList.add('is-revealed')";
const HERO_TAG = `<script src="assets/home-hero-reveal.js" defer onerror="${HERO_FALLBACK_BODY}"></script>`;
const HERO_REPLACEMENT = '<script src="assets/home-hero-reveal.js" defer></script>\n' +
  `<script>document.currentScript.previousElementSibling.addEventListener('error',function(){${HERO_FALLBACK_BODY}});</script>`;

let appLinks = 0;
let handlers = 0;
const htmlFiles = (await fs.readdir(output)).filter(name => name.endsWith('.html'));
for (const name of htmlFiles) {
  let html = await fs.readFile(path.join(output, name), 'utf8');
  html = html.replace(appLink, (...args) => { appLinks += 1; return toEntry(...args); });
  if (html.includes(HERO_TAG)) { html = html.replace(HERO_TAG, HERO_REPLACEMENT); handlers += 1; }
  if (html.includes(SCROLL_TOP)) {
    html = html.replaceAll(SCROLL_TOP, ' data-scroll-top');
    html = replaceRequired(html, '</body>', '<script src="/publication-events.js" defer></script>\n</body>', `${name} body end`);
    handlers += 1;
  }
  if (/<[^>]+\son[a-z]+\s*=/i.test(html)) throw new Error(`Unreviewed inline event handler in ${name}`);
  if (/app\.allybi\.(?:com\.br|co)/.test(html)) throw new Error(`An app origin survived in ${name}`);
  await fs.writeFile(path.join(output, name), html);
}
if (appLinks < 40) throw new Error(`Expected the app buttons; rewrote only ${appLinks}`);
if (handlers !== 3) throw new Error(`Expected 3 inline handler sites; rewired ${handlers}`);
await fs.writeFile(path.join(output, 'publication-events.js'), `document.addEventListener('click', function (event) {
  var top = event.target.closest('[data-scroll-top]');
  if (top) { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
`);

// One language everywhere: same cookie and storage keys as the web app.
let locale = await fs.readFile(path.join(output, 'language-switcher.js'), 'utf8');
locale = replaceRequiredRegex(locale, /const HOST_LOCALES = \{[\s\S]*?\n  \};/,
  'const HOST_LOCALES = {}; // One host; the shared choice decides the language.', 'host locale map');
locale = replaceRequiredRegex(locale, /const CANONICAL_ORIGINS = \{[\s\S]*?\n  \};/,
  "const CANONICAL_ORIGINS = { en: 'https://allybi.com.br', pt: 'https://allybi.com.br', es: 'https://allybi.com.br' };", 'canonical origins');
locale = replaceRequiredRegex(locale, /const LANGUAGE_HOSTS = \{[\s\S]*?\n  \};/,
  "const LANGUAGE_HOSTS = { en: 'allybi.com.br', pt: 'allybi.com.br', es: 'allybi.com.br' };", 'language hosts');
locale = replaceRequired(locale,
  "      const lang = storage && storage.getItem('language');\n      return isSupportedLang(lang) ? lang : null;",
  "      const lang = storage && String(storage.getItem('allybiExplicitLanguage') || '').toLowerCase().split('-')[0];\n      return isSupportedLang(lang) ? lang : null;",
  'shared stored language');
locale = replaceRequired(locale,
  "    if (hostLocale) return hostLocale;\n    return queryLang(locationLike && locationLike.search) || storageLang(storage) || 'en';",
  "    if (hostLocale) return hostLocale;\n    return queryLang(locationLike && locationLike.search) || sharedCookieLang() || storageLang(storage) || 'pt';",
  'initial language order');
locale = replaceRequired(locale, '  function htmlLangForLocale(locale) {',
  "  function sharedCookieLang() {\n    if (typeof document === 'undefined' || !/(?:^|;\\s*)allybi_lang_explicit=1(?:;|$)/.test(document.cookie)) return null;\n    const value = document.cookie.match(/(?:^|;\\s*)allybi_lang=(en|pt|es)(?:;|$)/);\n    return value ? value[1] : null;\n  }\n\n  function htmlLangForLocale(locale) {",
  'shared cookie reader');
locale = replaceRequired(locale,
  "    return origin + canonicalPath(pathname);",
  "    return origin + canonicalPath(pathname) + (locale === 'pt' ? '' : '?lang=' + locale);",
  'localized canonical');
locale = replaceRequired(locale,
  "      try {\n        if (options.persist) localStorage.setItem('language', lang);\n      } catch (_err) {\n        // localStorage can be unavailable in private browsing or test contexts.\n      }",
  "      if (options.persist) {\n        try { localStorage.setItem('allybiExplicitLanguage', lang === 'pt' ? 'pt-BR' : lang); } catch (_err) {}\n        const secure = window.location.protocol === 'https:' ? '; Secure' : '';\n        document.cookie = 'allybi_lang=' + lang + '; Path=/; Max-Age=31536000; SameSite=Lax' + secure;\n        document.cookie = 'allybi_lang_explicit=1; Path=/; Max-Age=31536000; SameSite=Lax' + secure;\n      }",
  'shared language persistence');
locale = replaceRequired(locale,
  "    setLanguage(initialLang, { persist: !hostLocale && Boolean(queryLang(window.location.search)) });",
  "    setLanguage(initialLang, { persist: !hostLocale && Boolean(queryLang(window.location.search)) });\n\n" +
  "    // A choice made in another tab or in the web app follows into this one.\n" +
  "    window.addEventListener('storage', (event) => {\n" +
  "      if (event.key !== 'allybiExplicitLanguage') return;\n" +
  "      const lang = String(event.newValue || '').toLowerCase().split('-')[0];\n" +
  "      if (isSupportedLang(lang)) setLanguage(lang, { persist: false });\n" +
  "    });",
  'cross-tab language');
await fs.writeFile(path.join(output, 'language-switcher.js'), locale);

// Everything a browser may fetch. Server code, packages and dependencies never are.
const published = [];
async function walk(dir) {
  for (const entry of await fs.readdir(path.join(output, dir), { withFileTypes: true })) {
    const name = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) { if (name !== 'server') await walk(name); }
    else if (!RUNTIME_ONLY.has(name)) published.push(name);
  }
}
await walk('');
published.sort();

// Every local reference in a published page, style or script must resolve.
const missing = [];
for (const file of published.filter(n => /\.(html|css|js)$/.test(n))) {
  const text = await fs.readFile(path.join(output, file), 'utf8');
  const refs = [];
  if (file.endsWith('.html')) refs.push(...[...text.matchAll(/(?:src|href|action|poster)=["']([^"']+)["']/g)].map(m => m[1]));
  if (/\.(html|css)$/.test(file)) refs.push(...[...text.matchAll(/url\(["']?([^)"']+)/g)].map(m => m[1]));
  if (file.endsWith('.js')) refs.push(...[...text.matchAll(/["'`]((?:\/?(?:assets|pages|translations)\/)[^"'`\s<>$]+\.(?:svg|png|jpg|webp|css|js|json|woff2))/g)].map(m => m[1]));
  for (let ref of refs) {
    if (/^(?:#|data:|mailto:|tel:|javascript:|https?:|\/\/)/.test(ref) || ref.includes('${')) continue;
    ref = ref.split(/[?#]/)[0];
    if (!ref || ref === '/' || ref === '/api/contact' || Object.hasOwn(APP_ALIASES, ref)) continue;
    const base = file.endsWith('.css') ? path.posix.dirname(file) : '';
    const target = ref.startsWith('/') ? ref.slice(1) : path.posix.normalize(path.posix.join(base, decodeURIComponent(ref)));
    if (!published.includes(target)) missing.push(`${file} -> ${ref}`);
  }
}
if (missing.length) throw new Error(`Unpublished references:\n${[...new Set(missing)].join('\n')}`);

let server = await fs.readFile(path.join(output, 'server.js'), 'utf8');
server = replaceRequired(server, "const PORT = Number(",
  `const { createHash } = require('crypto');
const PUBLISHED = new Set(${JSON.stringify(published)});
const APP_ALIASES = ${JSON.stringify(APP_ALIASES)};
function csp(html) {
  const hashes = [...html.matchAll(/<script\\b(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)<\\/script>/gi)]
    .filter(m => m[1].trim() && !/type="application\\/ld\\+json"/i.test(m[0]))
    .map(m => "'sha256-" + createHash('sha256').update(m[1]).digest('base64') + "'");
  return "default-src 'self'; script-src 'self' " + hashes.join(' ') + "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
}
// Language: ?lang, then the choice shared with the web app, then Portuguese.
function requestLocale(req) {
  const requested = new URL(req.url, 'http://landing.invalid').searchParams.get('lang');
  if (['en', 'pt', 'es'].includes(requested)) return { locale: requested, chosen: true };
  const cookies = req.headers.cookie || '';
  const shared = /(?:^|;\\s*)allybi_lang_explicit=1(?:;|$)/.test(cookies) && cookies.match(/(?:^|;\\s*)allybi_lang=(en|pt|es)(?:;|$)/);
  return shared ? { locale: shared[1], chosen: true } : { locale: 'pt', chosen: false };
}
function languageCookies(locale) {
  return ['allybi_lang=' + locale + '; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
    'allybi_lang_explicit=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure'];
}
const PORT = Number(`, 'publication prelude');
server = replaceRequired(server,
  "const server = http.createServer((req, res) => {\n  // Parse, decode, and normalize URL path segments before resolving a file.",
  `const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'private, no-store');
  const bare = req.url.split('?')[0];
  if (bare === '/healthz') { res.writeHead(200); res.end('ok'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD' && bare !== '/api/contact') {
    res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
  }
  const alias = APP_ALIASES[bare.replace(/\\/$/, '')];
  if (alias) {
    // The language shown here follows into the app and every other window.
    const { locale } = requestLocale(req);
    const incoming = new URL(req.url, 'http://landing.invalid').searchParams;
    const out = new URLSearchParams();
    const headers = { Location: '' };
    if (locale === 'pt' || locale === 'en') {
      out.set('lang', locale === 'pt' ? 'pt-BR' : 'en');
      headers['Set-Cookie'] = languageCookies(locale);
    }
    const destination = incoming.get('returnTo');
    // UX hint only; the app enforces authorization on the destination.
    if (destination && /^\\/(?:h|c|d|f)(?:\\/|$)/.test(destination) && !/[\\\\\\x00-\\x1f]/.test(destination)) out.set('returnTo', destination);
    headers.Location = alias + (out.size ? '?' + out : '');
    res.writeHead(302, headers); res.end(); return;
  }
  // Parse, decode, and normalize URL path segments before resolving a file.`, 'request prelude');
server = replaceRequired(server,
  "  if (filePath === '/') {\n    filePath = '/index.html';\n  }",
  `  if (filePath === '/') {
    // A returning visitor marker is a routing preference, never authentication.
    if (/(?:^|;\\s*)(?:__Host-allybi_seen|allybi_seen)=1(?:;|$)/.test(req.headers.cookie || '')) {
      res.writeHead(302, { Location: '/app', Vary: 'Cookie' }); res.end(); return;
    }
    filePath = '/index.html';
  } else if (filePath === '/explore') {
    filePath = '/index.html';
  }`, 'first and returning visitor routing');
server = replaceRequired(server,
  "  // Read and serve the file\n  fs.readFile(fullPath, (error, content) => {",
  "  if (!PUBLISHED.has(path.relative(BASE_DIR, fullPath).split(path.sep).join('/'))) { writeNotFound(res); return; }\n\n  // Read and serve the file\n  fs.readFile(fullPath, (error, content) => {",
  'published allowlist');
server = replaceRequired(server,
  "        res.end('<h1>500 Server Error</h1><p>' + error.code + '</p>');",
  "        res.end('<h1>500 Server Error</h1>');", 'no internal error codes');
server = replaceRequired(server,
  "      res.writeHead(200, { 'Content-Type': contentType + (extname === '.html' ? '; charset=UTF-8' : '') });\n      res.end(body);",
  `      const headers = { 'Content-Type': contentType + (extname === '.html' ? '; charset=UTF-8' : '') };
      if (extname === '.html') {
        headers['Content-Security-Policy'] = csp(body.toString('utf8'));
        headers.Vary = 'Cookie';
        const { locale, chosen } = requestLocale(req);
        if (chosen) headers['Set-Cookie'] = languageCookies(locale);
      }
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : body);`, 'response headers');
server = replaceRequired(server,
  "  const hostLocale = domainLocale.localeForHost(req.headers.host);\n  // Default unmapped hosts (localhost/dev/preview) to Portuguese — the site is PT-first.\n  const locale = hostLocale || 'pt';",
  "  const { locale } = requestLocale(req);", 'server language order');
server = replaceRequiredRegex(server, /function replaceAppOrigins\(html, locale\) \{[\s\S]*?\n\}/,
  "function replaceAppOrigins(html) {\n  return html.replace(/https:\\/\\/app\\.allybi\\.(?:com\\.br|co)(\\/(?:login|signup))?\\/?(?=[?#\"'\\s<]|$)/g,\n    (_m, route) => route === '/login' ? '/login' : route === '/signup' ? '/signup' : '/app');\n}",
  'same-origin app entry');
await fs.writeFile(path.join(output, 'server.js'), server);

const manifest = {};
for (const name of [...published, 'server.js', 'server/contact.js']) {
  manifest[name] = createHash('sha256').update(await fs.readFile(path.join(output, name))).digest('hex');
}
await fs.writeFile(path.join(output, 'publication-sha256.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ sourceRevision: process.env.SOURCE_REVISION || 'unrecorded', published: published.length, appLinks, handlers }, null, 2));
