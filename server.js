const http = require('http');
const fs = require('fs');
const path = require('path');
const domainLocale = require('./language-switcher.js');
const { createContactHandler, createSmtpDelivery } = require('./server/contact.js');
const contactHandler = createContactHandler({deliver: createSmtpDelivery()});

const PORT = Number(process.env.PORT || 8080);
const BASE_DIR = path.resolve(process.env.BASE_DIR || __dirname);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Parse, decode, and normalize URL path segments before resolving a file.
  let requestPath;
  try {
    requestPath = normalizeRequestPath(req.url.split('?')[0]);
  } catch (_err) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>400 Bad Request</h1>');
    return;
  }

  if (requestPath.outsideRoot) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('<h1>403 Forbidden</h1>');
    return;
  }

  let filePath = requestPath.pathname;

  if (filePath === '/faq.html') {
    res.writeHead(301, { Location: '/#faq' });
    res.end();
    return;
  }

  if (filePath === '/api/contact') {
    contactHandler(req, res);
    return;
  }

  if (isPrivateAuditPath(filePath)) {
    writeNotFound(res);
    return;
  }

  // Default to index.html
  if (filePath === '/') {
    filePath = '/index.html';
  }

  // Build full path
  const fullPath = path.resolve(BASE_DIR, '.' + filePath);

  // Get file extension for content type
  const extname = String(path.extname(fullPath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  if (fullPath !== BASE_DIR && !fullPath.startsWith(BASE_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('<h1>403 Forbidden</h1>');
    return;
  }

  // Read and serve the file
  fs.readFile(fullPath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        writeNotFound(res);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 Server Error</h1><p>' + error.code + '</p>');
      }
    } else {
      let body = content;
      if (extname === '.html') {
        body = Buffer.from(renderHtmlForHost(content.toString('utf8'), req, filePath), 'utf8');
      }
      res.writeHead(200, { 'Content-Type': contentType + (extname === '.html' ? '; charset=UTF-8' : '') });
      res.end(body);
    }
  });
});

function normalizeRequestPath(rawPath) {
  const segments = [];
  let outsideRoot = false;
  const decoded = decodeURIComponent(rawPath).replace(/\\/g, '/');
  if (decoded.includes('\0')) throw new URIError('NUL byte in path');

  for (const segment of decoded.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) outsideRoot = true;
      else segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return { pathname: '/' + segments.join('/'), outsideRoot };
}

function isPrivateAuditPath(filePath) {
  const firstSegment = filePath.split('/').find(Boolean);
  const privateRoots = new Set(['audit', 'server', 'node_modules', 'tests', 'docs', 'scripts']);
  return filePath.split('/').some(segment => segment.startsWith('.')) ||
    privateRoots.has((firstSegment || '').toLowerCase()) ||
    ['/server.js', '/backend-server.js', '/package.json', '/package-lock.json', '/dockerfile', '/readme.md'].includes(filePath.toLowerCase());
}

function writeNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('<h1>404 Not Found</h1><p>The requested file was not found.</p>');
}

function renderHtmlForHost(html, req, filePath) {
  const hostLocale = domainLocale.localeForHost(req.headers.host);
  // Default unmapped hosts (localhost/dev/preview) to Portuguese — the site is PT-first.
  const locale = hostLocale || 'pt';
  const translations = readTranslations(locale);
  let rendered = html;

  rendered = rendered.replace(/<html\s+lang="[^"]*"/i, '<html lang="' + domainLocale.htmlLangForLocale(locale) + '"');
  rendered = replaceAppOrigins(rendered, locale);

  if (translations) {
    rendered = rendered.replace(
      /(<([a-z0-9]+)\b[^>]*data-i18n-key="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/gi,
      (match, openTag, _tagName, key, _inner, closeTag) => {
        const value = resolve(translations, key);
        return value == null ? match : openTag + value + closeTag;
      }
    );
  }

  rendered = applySeo(rendered, locale, filePath);
  return rendered;
}

function replaceAppOrigins(html, locale) {
  const target = domainLocale.APP_ORIGINS[locale] || domainLocale.APP_ORIGINS.en;
  return html.replace(/https:\/\/app\.allybi\.(?:com\.br|co)(?=[\/?#"'\s<]|$)/g, target);
}

function applySeo(html, locale, filePath) {
  const pathname = filePath === '/index.html' ? '/' : filePath;
  const canonicalUrl = domainLocale.canonicalUrlForLocale(locale, pathname);
  const enUrl = domainLocale.canonicalUrlForLocale('en', pathname);
  const ptUrl = domainLocale.canonicalUrlForLocale('pt', pathname);
  const homeMeta = isHomePage(filePath) ? domainLocale.HOME_META[locale] || domainLocale.HOME_META.en : null;
  let rendered = html;

  rendered = upsertLink(rendered, 'canonical', null, canonicalUrl);
  rendered = upsertLink(rendered, 'alternate', 'en', enUrl);
  rendered = upsertLink(rendered, 'alternate', 'pt-BR', ptUrl);
  rendered = upsertLink(rendered, 'alternate', 'x-default', enUrl);
  rendered = setMeta(rendered, 'property', 'og:url', canonicalUrl);
  rendered = setMeta(rendered, 'name', 'twitter:url', canonicalUrl);

  if (homeMeta) {
    rendered = rendered.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + escapeHtml(homeMeta.title) + '</title>');
    rendered = setMeta(rendered, 'name', 'description', homeMeta.description);
    rendered = setMeta(rendered, 'property', 'og:title', homeMeta.ogTitle || homeMeta.title);
    rendered = setMeta(rendered, 'property', 'og:description', homeMeta.ogDescription || homeMeta.description);
    rendered = setMeta(rendered, 'name', 'twitter:title', homeMeta.twitterTitle || homeMeta.ogTitle || homeMeta.title);
    rendered = setMeta(rendered, 'name', 'twitter:description', homeMeta.twitterDescription || homeMeta.ogDescription || homeMeta.description);
    rendered = updateStructuredData(rendered, canonicalUrl, homeMeta.description);
  }

  return rendered;
}

function updateStructuredData(html, url, description) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i, (match, json) => {
    try {
      const data = JSON.parse(json);
      data.url = url;
      if (description) data.description = description;
      return '<script type="application/ld+json">\n  ' + JSON.stringify(data, null, 2) + '\n  </script>';
    } catch (_err) {
      return match;
    }
  });
}

function upsertLink(html, rel, hreflang, href) {
  const replacement = hreflang
    ? '<link rel="' + rel + '" hreflang="' + hreflang + '" href="' + escapeAttribute(href) + '">'
    : '<link rel="' + rel + '" href="' + escapeAttribute(href) + '">';
  const pattern = hreflang
    ? new RegExp('<link\\b(?=[^>]*rel="' + rel + '")(?=[^>]*hreflang="' + hreflang + '")[^>]*>', 'i')
    : new RegExp('<link\\b(?=[^>]*rel="' + rel + '")[^>]*>', 'i');

  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace('</head>', '  ' + replacement + '\n</head>');
}

function setMeta(html, attributeName, attributeValue, content) {
  const replacement = '<meta ' + attributeName + '="' + attributeValue + '" content="' + escapeAttribute(content) + '">';
  const pattern = new RegExp('<meta\\b(?=[^>]*' + attributeName + '="' + attributeValue + '")[^>]*>', 'i');
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace('</head>', '  ' + replacement + '\n</head>');
}

function isHomePage(filePath) {
  return filePath === '/' || filePath === '/index.html';
}

function readTranslations(locale) {
  try {
    const file = path.join(BASE_DIR, 'translations', locale + '.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function resolve(obj, key) {
  return key.split('.').reduce((value, part) => (
    value && typeof value === 'object' && part in value ? value[part] : null
  ), obj);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Allybi Landing Page Server is running!`);
  console.log(`🌐 Open in browser: http://localhost:${PORT}/`);
  console.log(`📂 Serving files from: ${BASE_DIR}`);
});
