(() => {
  'use strict';

  const DEFAULTS = { enabled: true, debug: false };
  const HIDDEN_CLASS = 'nexus-clean-hidden';
  const ROOT_CLASS = 'nexus-clean-enabled';
  const OBSERVER_DEBOUNCE_MS = 120;

  /**
   * Selectors are intentionally conservative. They target verified ad-provider
   * artefacts and explicit ad labels/containers, not arbitrary class names like
   * `.ad`, to avoid hiding legitimate NexusToons reader/navigation content.
   *
   * Direct DOM inspection from this environment was blocked by the remote site / proxy;
   * update SITE_SELECTORS after collecting DOM samples with debug mode enabled.
   */
  const SITE_SELECTORS = [
    '[data-ad-client]',
    '[data-ad-slot]',
    '[data-ad-format]',
    'ins.adsbygoogle',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="googleads.g.doubleclick.net"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="adservice.google."]',
    'iframe[src*="popads.net"]',
    'iframe[src*="propellerads.com"]',
    'iframe[src*="exoclick.com"]',
    'script[src*="googlesyndication.com"] + ins',
    '[aria-label="Advertisement"]',
    '[aria-label="advertisement"]'
  ];

  const SAFE_SELECTOR = [
    'main', 'article', 'header', 'nav', 'footer', 'form', 'input', 'button', 'select',
    'textarea', 'video', 'canvas', '[role="navigation"]', '[role="menu"]', '[role="dialog"]',
    '[role="search"]', '[href*="/login"]', '[href*="/perfil"]', '[href*="/profile"]',
    '[href*="/favorito"]', '[href*="/biblioteca"]', '[href*="/manga/"]', '[href*="/capitulo/"]',
    'img[src*="/storage/"]', 'img[src*="chapter"]', 'img[src*="capitulo"]', '.chapter',
    '.reader', '#reader', '[class*="reader" i]', '[class*="chapter" i]', '[class*="manga" i]',
    '[class*="login" i]', '[class*="menu" i]', '[class*="search" i]', '[class*="profile" i]'
  ].join(',');

  let state = { ...DEFAULTS };
  let observer;
  let pending = false;

  const log = (...args) => state.debug && console.info('[NexusToons Clean]', ...args);
  const warn = (...args) => state.debug && console.warn('[NexusToons Clean]', ...args);

  function isWhitelisted(el) {
    if (!el || el === document.documentElement || el === document.body) return true;
    return Boolean(el.closest(SAFE_SELECTOR));
  }

  function hasAdTextSignal(el) {
    const text = (el.innerText || el.textContent || '').trim().toLowerCase();
    return text.length <= 80 && /^(publicidade|an[uú]ncio|advertisement|ads?)$/i.test(text);
  }

  function looksLikeAdContainer(el) {
    if (isWhitelisted(el)) return false;
    const attrs = `${el.id || ''} ${el.className || ''} ${el.getAttribute('data-testid') || ''}`.toLowerCase();
    const explicit = /(advertisement|adsbygoogle|google-ad|banner-ad|ad-container|ad-wrapper|publi[cç]idade|anuncio|sponsor)/.test(attrs);
    const iframe = el.querySelector?.('iframe[src*="doubleclick.net"],iframe[src*="googlesyndication.com"],iframe[src*="popads.net"],iframe[src*="propellerads.com"],iframe[src*="exoclick.com"]');
    return explicit || Boolean(iframe) || hasAdTextSignal(el);
  }

  function hide(el, reason) {
    if (!el || el.classList?.contains(HIDDEN_CLASS) || isWhitelisted(el)) return;
    el.classList.add(HIDDEN_CLASS);
    el.setAttribute('data-nexus-clean-reason', reason);
    log('hidden', reason, el);
  }

  function hideKnownSelectors(root = document) {
    for (const selector of SITE_SELECTORS) {
      try {
        root.querySelectorAll?.(selector).forEach((el) => {
          const target = el.closest('[class*="advertisement" i],[class*="adsbygoogle" i],[class*="google-ad" i],[class*="ad-container" i],[class*="ad-wrapper" i],[class*="publicidade" i],[class*="anuncio" i]') || el;
          hide(target, selector);
        });
      } catch (error) {
        warn('selector failed', selector, error);
      }
    }
  }

  function hideExplicitContainers(root = document) {
    const candidates = root.querySelectorAll?.('div, section, aside, iframe, ins');
    candidates?.forEach((el) => {
      if (looksLikeAdContainer(el)) hide(el, 'explicit-ad-container');
    });
  }

  function unlockBodyIfAdOverlayGone() {
    if (!state.enabled) return;
    document.documentElement.classList.add(ROOT_CLASS);
    [document.documentElement, document.body].filter(Boolean).forEach((el) => {
      if (getComputedStyle(el).overflow === 'hidden') el.classList.add('nexus-clean-overlay-unlocked');
    });
  }

  function clean(root = document) {
    if (!state.enabled) return;
    document.documentElement.classList.add(ROOT_CLASS);
    hideKnownSelectors(root);
    hideExplicitContainers(root);
    unlockBodyIfAdOverlayGone();
  }

  function unhideAll() {
    document.documentElement.classList.remove(ROOT_CLASS);
    document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((el) => {
      el.classList.remove(HIDDEN_CLASS);
      el.removeAttribute('data-nexus-clean-reason');
    });
  }

  function scheduleClean(root = document) {
    if (pending) return;
    pending = true;
    window.setTimeout(() => {
      pending = false;
      clean(root);
    }, OBSERVER_DEBOUNCE_MS);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!state.enabled) return;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          scheduleClean(document);
          return;
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function applyState(nextState) {
    state = { ...DEFAULTS, ...nextState };
    if (state.enabled) {
      clean(document);
      startObserver();
    } else {
      unhideAll();
    }
  }

  chrome.storage.local.get(DEFAULTS, applyState);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    applyState({
      enabled: changes.enabled ? changes.enabled.newValue : state.enabled,
      debug: changes.debug ? changes.debug.newValue : state.debug
    });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'NEXUS_CLEAN_APPLY') {
      clean(document);
      sendResponse({ ok: true, enabled: state.enabled });
    }
    return true;
  });

  document.addEventListener('DOMContentLoaded', () => clean(document), { once: true });
})();
