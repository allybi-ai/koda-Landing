// Allybi domain locale and language switcher.
// Production domains decide language; localhost can use ?lang= or localStorage.
(function (root) {
  'use strict';

  const SUPPORTED_LANGS = ['en', 'pt', 'es'];
  const HOST_LOCALES = {
    'allybi.co': 'en',
    'www.allybi.co': 'en',
    'allybi.com.br': 'pt',
    'www.allybi.com.br': 'pt'
  };
  const CANONICAL_ORIGINS = {
    en: 'https://allybi.co',
    pt: 'https://allybi.com.br'
  };
  const LANGUAGE_HOSTS = {
    en: 'allybi.co',
    pt: 'allybi.com.br'
  };
  const APP_ORIGINS = {
    en: 'https://app.allybi.co',
    pt: 'https://app.allybi.com.br',
    es: 'https://app.allybi.co'
  };
  const HTML_LANGS = {
    en: 'en',
    pt: 'pt-BR',
    es: 'es'
  };
  const LANG_NAMES = {
    en: 'English',
    pt: 'Português (BR)',
    es: 'Español'
  };
  const HOME_META = {
    en: {
      title: 'Allybi — find, confirm and send the right document',
      description: 'Connect Outlook, OneDrive, SharePoint and uploads. Ask in chat, get source-cited answers, and prepare email or WhatsApp with confirmation.',
      ogTitle: 'Allybi — source-cited answers, ready to send',
      ogDescription: 'A chat for finding, confirming, and sending the right document.',
      twitterTitle: 'Allybi — source-cited answers, ready to send',
      twitterDescription: 'Connect sources, ask in chat, get answers with source. Prepare email or WhatsApp with confirmation.'
    },
    pt: {
      title: 'Allybi | Encontre, confirme e envie o documento certo',
      description: 'Conecte Outlook, OneDrive, SharePoint e uploads. Pergunte no chat, veja a fonte da resposta e envie e-mails via Outlook com confirmação. WhatsApp abre como handoff.',
      ogTitle: 'Allybi | Encontre, confirme e envie o documento certo',
      ogDescription: 'Pergunte no chat, receba resposta com fonte e revise antes de enviar.',
      twitterTitle: 'Allybi | Encontre, confirme e envie o documento certo',
      twitterDescription: 'Pergunte no chat, receba resposta com fonte e revise antes de enviar.'
    }
  };

  function normalizeHost(host) {
    return String(host || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0];
  }

  function isSupportedLang(lang) {
    return SUPPORTED_LANGS.includes(lang);
  }

  function localeForHost(host) {
    return HOST_LOCALES[normalizeHost(host)] || null;
  }

  function queryLang(search) {
    try {
      const params = new URLSearchParams(search || '');
      const lang = params.get('lang') || params.get('locale');
      return isSupportedLang(lang) ? lang : null;
    } catch (_err) {
      return null;
    }
  }

  function storageLang(storage) {
    try {
      const lang = storage && storage.getItem('language');
      return isSupportedLang(lang) ? lang : null;
    } catch (_err) {
      return null;
    }
  }

  function getInitialLocale(locationLike, storage) {
    const hostLocale = localeForHost(locationLike && (locationLike.hostname || locationLike.host));
    if (hostLocale) return hostLocale;
    return queryLang(locationLike && locationLike.search) || storageLang(storage) || 'en';
  }

  function htmlLangForLocale(locale) {
    return HTML_LANGS[locale] || HTML_LANGS.en;
  }

  function canonicalPath(pathname) {
    const path = pathname || '/';
    if (path === '/' || path.endsWith('/index.html')) return '';
    return path.charAt(0) === '/' ? path : '/' + path;
  }

  function canonicalUrlForLocale(locale, pathname) {
    const origin = CANONICAL_ORIGINS[locale] || CANONICAL_ORIGINS.en;
    return origin + canonicalPath(pathname);
  }

  function localizedPageUrl(locale, pathname, hash) {
    if (!LANGUAGE_HOSTS[locale]) return null;
    return canonicalUrlForLocale(locale, pathname) + (hash || '');
  }

  function appUrlForLocale(locale, href) {
    const origin = APP_ORIGINS[locale] || APP_ORIGINS.en;
    try {
      const url = new URL(href || origin, origin);
      const target = new URL(origin);
      url.protocol = target.protocol;
      url.host = target.host;
      return url.toString();
    } catch (_err) {
      return origin;
    }
  }

  const DomainLocale = {
    SUPPORTED_LANGS,
    HOST_LOCALES,
    APP_ORIGINS,
    HOME_META,
    normalizeHost,
    localeForHost,
    queryLang,
    getInitialLocale,
    htmlLangForLocale,
    canonicalPath,
    canonicalUrlForLocale,
    localizedPageUrl,
    appUrlForLocale
  };

  root.AllybiDomainLocale = DomainLocale;
  if (typeof module === 'object' && module.exports) {
    module.exports = DomainLocale;
  }

  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', () => {
    const selectors = [];

    document.querySelectorAll('.language-selector').forEach((container) => {
      const toggle = container.querySelector('.language-toggle');
      const menu = container.querySelector('.language-menu');
      const label = container.querySelector('[id$="current-language"], .lang-label');
      if (toggle && menu) {
        selectors.push({ container, toggle, menu, label });
      }
    });

    selectors.forEach(({ toggle, menu }) => {
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const wasOpen = !menu.classList.contains('hidden');
        closeAllMenus();
        if (!wasOpen) {
          menu.classList.remove('hidden');
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
    });

    function closeAllMenus() {
      selectors.forEach(({ toggle, menu }) => {
        menu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.language-selector')) closeAllMenus();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAllMenus();
    });

    selectors.forEach(({ menu }) => {
      menu.addEventListener('click', (event) => {
        const item = event.target.closest('[data-lang]');
        if (!item) return;

        event.preventDefault();
        event.stopPropagation();

        const lang = item.getAttribute('data-lang');
        const hostLocale = localeForHost(window.location.hostname);
        if (hostLocale && lang !== hostLocale) {
          const destination = localizedPageUrl(lang, window.location.pathname, window.location.hash);
          if (destination) {
            window.location.assign(destination);
            return;
          }
          setLanguage(hostLocale, { persist: false });
          return;
        }

        setLanguage(lang, { persist: !hostLocale });
      });
    });

    async function setLanguage(lang, options = {}) {
      if (!isSupportedLang(lang)) lang = 'en';
      try {
        if (options.persist) localStorage.setItem('language', lang);
      } catch (_err) {
        // localStorage can be unavailable in private browsing or test contexts.
      }

      selectors.forEach(({ label }) => {
        if (label) label.textContent = LANG_NAMES[lang] || LANG_NAMES.en;
      });

      const translations = await applyTranslations(lang);
      applyAppLinks(lang);
      applyMetadata(lang, translations);
      closeAllMenus();
    }

    async function applyTranslations(lang) {
      try {
        const basePath = window.location.pathname.includes('/homepage/') ? '/homepage/' : '';
        const response = await fetch(basePath + 'translations/' + lang + '.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const translations = await response.json();

        document.documentElement.setAttribute('lang', htmlLangForLocale(lang));

        document.querySelectorAll('[data-i18n-key]').forEach((element) => {
          const key = element.getAttribute('data-i18n-key');
          const value = resolve(translations, key);
          if (value == null) return;

          if (element.hasAttribute('placeholder')) {
            element.setAttribute('placeholder', value);
          } else {
            element.innerHTML = value;
          }
        });

        // Translate accessible names that target attributes other than text content.
        document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
          const key = element.getAttribute('data-i18n-aria-label');
          const value = resolve(translations, key);
          if (value != null) element.setAttribute('aria-label', value);
        });

        return translations;
      } catch (err) {
        console.error('Translation error:', err);
        document.documentElement.setAttribute('lang', htmlLangForLocale(lang));
        return null;
      }
    }

    function resolve(obj, key) {
      return key.split('.').reduce((value, part) => (
        value && typeof value === 'object' && part in value ? value[part] : null
      ), obj);
    }

    function applyAppLinks(lang) {
      document.querySelectorAll('a[href*="app.allybi.co"], a[href*="app.allybi.com.br"]').forEach((anchor) => {
        anchor.href = appUrlForLocale(lang, anchor.getAttribute('href'));
      });
    }

    function applyMetadata(lang, translations) {
      const canonicalUrl = canonicalUrlForLocale(lang, window.location.pathname);
      ensureLink('canonical', canonicalUrl);
      ensureAlternate('en', canonicalUrlForLocale('en', window.location.pathname));
      ensureAlternate('pt-BR', canonicalUrlForLocale('pt', window.location.pathname));
      ensureAlternate('x-default', canonicalUrlForLocale('en', window.location.pathname));
      setMeta('property', 'og:url', canonicalUrl);
      setMeta('name', 'twitter:url', canonicalUrl);

      const homeMeta = isHomePage() ? resolve(translations || {}, 'meta.home') || HOME_META[lang] : null;
      if (!homeMeta) return;

      document.title = homeMeta.title;
      setMeta('name', 'description', homeMeta.description);
      setMeta('property', 'og:title', homeMeta.ogTitle || homeMeta.title);
      setMeta('property', 'og:description', homeMeta.ogDescription || homeMeta.description);
      setMeta('name', 'twitter:title', homeMeta.twitterTitle || homeMeta.ogTitle || homeMeta.title);
      setMeta('name', 'twitter:description', homeMeta.twitterDescription || homeMeta.ogDescription || homeMeta.description);
      updateStructuredDataUrl(canonicalUrl, homeMeta.description);
    }

    function isHomePage() {
      const path = window.location.pathname || '/';
      return path === '/' || path.endsWith('/index.html');
    }

    function setMeta(attributeName, attributeValue, content) {
      if (!content) return;
      let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    }

    function ensureLink(rel, href) {
      let element = document.head.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    }

    function ensureAlternate(hreflang, href) {
      let element = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', 'alternate');
        element.setAttribute('hreflang', hreflang);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    }

    function updateStructuredDataUrl(url, description) {
      const element = document.head.querySelector('script[type="application/ld+json"]');
      if (!element) return;
      try {
        const data = JSON.parse(element.textContent);
        data.url = url;
        if (description) data.description = description;
        element.textContent = JSON.stringify(data);
      } catch (_err) {
        // Leave hand-written structured data untouched if it is not parseable.
      }
    }

    const hostLocale = localeForHost(window.location.hostname);
    const initialLang = getInitialLocale(window.location, localStorage);
    setLanguage(initialLang, { persist: !hostLocale && Boolean(queryLang(window.location.search)) });
  });
}(typeof globalThis !== 'undefined' ? globalThis : window));
