import fs from 'node:fs/promises';
import path from 'node:path';
import { hardenPublic } from './harden-public.mjs';

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) {
  throw new Error('Usage: node landing/build-public.mjs <pinned-landing-repo> <new-output-directory>');
}

const source = path.resolve(sourceArg);
const output = path.resolve(outputArg);
if (output === source || output.startsWith(source + path.sep)) {
  throw new Error('Output must be outside the landing source repository');
}
const head = process.env.SOURCE_REVISION || 'unrecorded-local-build';
try {
  await fs.access(output);
  throw new Error(`Output already exists; use a new empty path: ${output}`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const publishedRootJs = new Set([
  'allybi-animations.js', 'allybi-header.js', 'animations.js',
  'language-switcher.js', 'mobile-menu.js',
]);
const publishedAssets = [
  'assets/images/allybi-favicon.svg',
  'assets/images/allybi-logo.svg',
  'assets/images/gmail-icon.svg',
  'assets/images/google-drive-icon.svg',
  'assets/images/logo.png',
  'assets/images/onedrive-icon.svg',
  'assets/images/outlook-icon.svg',
  'assets/images/sharepoint-icon.svg',
  'assets/images/uploads-icon.svg',
  'assets/images/whatsapp-icon.svg',
];

async function copyPublicTree(relative, extensions) {
  const from = path.join(source, relative);
  const to = path.join(output, relative);
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const itemRelative = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in publication: ${itemRelative}`);
    if (entry.isDirectory()) {
      await copyPublicTree(itemRelative, extensions);
    } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
      await fs.copyFile(path.join(source, itemRelative), path.join(output, itemRelative));
    }
  }
}

function replaceRequired(input, before, after, label) {
  if (!input.includes(before)) throw new Error(`Pinned source shape changed: ${label}`);
  return input.replace(before, after);
}

function replaceRequiredRegex(input, pattern, replacement, label) {
  if (!pattern.test(input)) throw new Error(`Pinned source shape changed: ${label}`);
  pattern.lastIndex = 0;
  return input.replace(pattern, replacement);
}

const appHrefPattern = /https:\/\/app\.allybi\.(?:com\.br|co)(\/(?:login|signup))?/g;
function canonicalAppLink(_match, route) {
  if (route === '/login') return '/login';
  if (route === '/signup') return '/signup';
  return '/app';
}

await fs.mkdir(output, { recursive: true });
let rewrittenLinks = 0;
for (const entry of await fs.readdir(source, { withFileTypes: true })) {
  if (!entry.isFile() || entry.name.startsWith('_')) continue;
  if (entry.name.endsWith('.html')) {
    let html = await fs.readFile(path.join(source, entry.name), 'utf8');
    // The source's social preview points at a file that does not exist.
    // Use an actual approved logo asset until a dedicated OG image is made.
    if (entry.name === 'use-cases.html') {
      html = html.replaceAll('assets/images/og-home.png', 'assets/images/logo.png');
    }
    html = html.replace(appHrefPattern, (...args) => {
      rewrittenLinks += 1;
      return canonicalAppLink(args[0], args[1]);
    });
    if (/https:\/\/app\.allybi\.(?:com\.br|co)/.test(html)) {
      throw new Error(`An old app origin survived in ${entry.name}`);
    }
    await fs.writeFile(path.join(output, entry.name), html);
  } else if (entry.name.endsWith('.css') || publishedRootJs.has(entry.name)) {
    await fs.copyFile(path.join(source, entry.name), path.join(output, entry.name));
  }
}
if (rewrittenLinks < 147) throw new Error(`Expected the published app links; found only ${rewrittenLinks}`);

for (const [directory, extensions] of [
  ['pages', new Set(['.css'])],
  ['translations', new Set(['.json'])],
]) {
  await copyPublicTree(directory, extensions);
}
for (const relative of publishedAssets) {
  const destination = path.join(output, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(path.join(source, relative), destination);
}

// Refuse to publish if a later page starts using another asset without an
// explicit review and allowlist update. This is not just a size optimization:
// it ensures unreviewed design/source files never become HTTP-accessible.
const assetRef = /assets\/[A-Za-z0-9_./%+() -]+\.(?:svg|png|jpg|jpeg|webp|gif|ico|avif|woff2?|ttf)/gi;
const textFiles = [
  ...(await fs.readdir(output)).filter(name => /\.(?:html|css|js)$/.test(name)),
  ...(await fs.readdir(path.join(output, 'pages')))
    .filter(name => name.endsWith('.css')).map(name => path.join('pages', name)),
];
for (const file of textFiles) {
  const content = await fs.readFile(path.join(output, file), 'utf8');
  for (const match of content.matchAll(assetRef)) {
    const relative = decodeURIComponent(match[0]);
    if (!publishedAssets.includes(relative)) throw new Error(`Unreviewed asset reference ${relative} in ${file}`);
  }
}

let locale = await fs.readFile(path.join(output, 'language-switcher.js'), 'utf8');
locale = replaceRequiredRegex(locale,
  /const HOST_LOCALES = \{[\s\S]*?\n  \};/,
  'const HOST_LOCALES = {}; // Language is selected on one canonical host.',
  'host locale map');
locale = replaceRequiredRegex(locale,
  /const CANONICAL_ORIGINS = \{[\s\S]*?\n  \};/,
  "const CANONICAL_ORIGINS = { en: 'https://allybi.com.br', pt: 'https://allybi.com.br', es: 'https://allybi.com.br' };",
  'canonical origins');
locale = replaceRequiredRegex(locale,
  /const LANGUAGE_HOSTS = \{[\s\S]*?\n  \};/,
  "const LANGUAGE_HOSTS = { en: 'allybi.com.br', pt: 'allybi.com.br', es: 'allybi.com.br' };",
  'language hosts');
locale = replaceRequiredRegex(locale,
  /const APP_ORIGINS = \{[\s\S]*?\n  \};/,
  "const APP_ORIGINS = { en: 'https://allybi.com.br', pt: 'https://allybi.com.br', es: 'https://allybi.com.br' };",
  'app origins');
locale = replaceRequired(locale,
  "    if (hostLocale) return hostLocale;\n    return queryLang(locationLike && locationLike.search) || storageLang(storage) || 'en';",
  "    const browser = typeof navigator === 'undefined' ? [] : [...(navigator.languages || []), navigator.language];\n    const detected = browser.map(value => String(value || '').toLowerCase().split('-')[0]).find(value => SUPPORTED_LANGS.includes(value));\n    return queryLang(locationLike && locationLike.search) || browserCookieLang() || detected || 'en';",
  'initial locale order');
locale = replaceRequired(locale,
  "  function htmlLangForLocale(locale) {",
  "  function browserCookieLang() {\n    if (typeof document === 'undefined' || !/(?:^|;\\s*)allybi_lang_explicit=1(?:;|$)/.test(document.cookie)) return null;\n    const value = document.cookie.match(/(?:^|;\\s*)allybi_lang=(en|pt|es)(?:;|$)/);\n    return value ? value[1] : null;\n  }\n\n  function htmlLangForLocale(locale) {",
  'language cookie reader');
locale = replaceRequired(locale,
  "    return origin + canonicalPath(pathname);",
  "    return origin + canonicalPath(pathname) + (locale === 'pt' ? '' : '?lang=' + locale);",
  'localized canonical');
locale = replaceRequired(locale,
  "      try {\n        if (options.persist) localStorage.setItem('language', lang);\n      } catch (_err) {\n        // localStorage can be unavailable in private browsing or test contexts.\n      }",
  "      if (options.persist) {\n        try { localStorage.setItem('allybiExplicitLanguage', lang); } catch (_err) {}\n        document.cookie = 'allybi_lang=' + lang + '; Path=/; Max-Age=31536000; SameSite=Lax' +\n          (window.location.protocol === 'https:' ? '; Secure' : '');\n        document.cookie = 'allybi_lang_explicit=1; Path=/; Max-Age=31536000; SameSite=Lax' +\n          (window.location.protocol === 'https:' ? '; Secure' : '');\n      }",
  'language persistence');
await fs.writeFile(path.join(output, 'language-switcher.js'), locale);

let server = await fs.readFile(path.join(source, 'server.js'), 'utf8');
server = replaceRequired(server,
  "const server = http.createServer((req, res) => {\n  // Parse URL and remove query string",
  "const server = http.createServer((req, res) => {\n  if (req.method !== 'GET' && req.method !== 'HEAD') {\n    res.writeHead(405, { Allow: 'GET, HEAD' });\n    res.end();\n    return;\n  }\n  // Parse URL and remove query string",
  'landing read-only methods');
server = replaceRequired(server,
  "  if (filePath === '/') {\n    filePath = '/index.html';\n  }",
  "  if (filePath === '/') {\n    const seen = /(?:^|;\\s*)(?:__Host-allybi_seen|allybi_seen)=1(?:;|$)/.test(req.headers.cookie || '');\n    if (seen) {\n      res.writeHead(302, { Location: '/app', 'Cache-Control': 'private, no-store', Vary: 'Cookie' });\n      res.end();\n      return;\n    }\n    filePath = '/index.html';\n  } else if (filePath === '/explore') {\n    filePath = '/index.html';\n  }\n  if (filePath === '/server.js' || filePath.split('/').some(part => part.startsWith('.'))) {\n    res.writeHead(404); res.end(); return;\n  }",
  'first and returning visitor routing');
server = replaceRequired(server,
  "  // Read and serve the file\n  fs.readFile(fullPath, (error, content) => {",
  "  const publishedPath = path.relative(BASE_DIR, fullPath);\n  if (publishedPath === 'server.js' || publishedPath.split(path.sep).some(part => part.startsWith('.'))) {\n    res.writeHead(404); res.end(); return;\n  }\n\n  // Read and serve the file\n  fs.readFile(fullPath, (error, content) => {",
  'post-decode publication boundary');
server = replaceRequired(server,
  "      res.writeHead(200, { 'Content-Type': contentType + (extname === '.html' ? '; charset=UTF-8' : '') });",
  "      res.writeHead(200, {\n        'Content-Type': contentType + (extname === '.html' ? '; charset=UTF-8' : ''),\n        'X-Content-Type-Options': 'nosniff',\n        ...(extname === '.html' ? { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Accept-Language' } : {}),\n      });",
  'localized HTML caching');
server = replaceRequired(server,
  "  const hostLocale = domainLocale.localeForHost(req.headers.host);\n  const locale = hostLocale || 'en';",
  "  const requested = new URL(req.url, 'http://landing.invalid').searchParams.get('lang');\n  const cookies = req.headers.cookie || '';\n  const cookieMatch = /(?:^|;\\s*)allybi_lang_explicit=1(?:;|$)/.test(cookies) && cookies.match(/(?:^|;\\s*)allybi_lang=(en|pt|es)(?:;|$)/);\n  const preferences = String(req.headers['accept-language'] || '').split(',').map(entry => { const [tag, ...params] = entry.trim().split(';'); const q = params.find(p => p.trim().startsWith('q=')); return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q.trim().slice(2)) : 1 }; }).filter(p => p.q > 0 && p.q <= 1 && ['en','pt','es'].includes(p.lang)).sort((a,b) => b.q-a.q);\n  const locale = ['en', 'pt', 'es'].includes(requested) ? requested :\n    (cookieMatch ? cookieMatch[1] : preferences[0]?.lang || 'en');",
  'server locale selection');
server = replaceRequiredRegex(server,
  /function replaceAppOrigins\(html, locale\) \{[\s\S]*?\n\}/,
  "function replaceAppOrigins(html) {\n  return html.replace(/https:\\/\\/app\\.allybi\\.(?:com\\.br|co)(\\/(?:login|signup))?/g,\n    (_match, route) => route === '/login' ? '/login' : route === '/signup' ? '/signup' : '/app');\n}",
  'single-pass app URL mapping');
await fs.writeFile(path.join(output, 'server.js'), server);
await hardenPublic(output);

console.log(JSON.stringify({ sourceHead: head, publishedAppLinks: rewrittenLinks, output }, null, 2));
