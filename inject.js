(function () {
  'use strict';

  const AD_URLS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'pagead2.googlesyndication.com', 'tpc.googlesyndication.com',
    'adservice.google.com', '2mdn.net', 'google-analytics.com',
    'googletagmanager.com', 'googletagservices.com',
    'youtube.com/api/stats/ads', 'youtube.com/pagead',
  ];

  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    if (url && AD_URLS.some(a => url.includes(a))) {
      return Promise.resolve(new Response('', { status: 204 }));
    }
    return _fetch.call(this, input, init);
  };

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === 'string' && AD_URLS.some(a => url.includes(a))) {
      return;
    }
    return _open.apply(this, arguments);
  };

  function cleanAds() {
    document.querySelectorAll(
      '#player-ads, #masthead-ad, .ytp-ad-module, .ytp-ad-image-overlay, ' +
      '.ytp-ad-text-overlay, .ytp-ad-skip-button-container, .ytp-ad-overlay-container, ' +
      '.ytd-ad-slot-renderer, ytd-ad-slot-renderer, .ytd-mealbar-promo-renderer, ' +
      'ytd-mealbar-promo-renderer, .ytd-display-ad-renderer, .ad-showing, ' +
      '.video-ads, .ytp-ad-player-overlay'
    ).forEach(el => el.remove());
  }

  function skipAd() {
    const v = document.querySelector('video');
    if (!v) return;
    if (document.querySelector('.ad-showing, .ytp-ad-module, .video-ads')) {
      v.muted = true;
      if (v.duration && v.currentTime < v.duration - 0.5) v.currentTime = v.duration;
      document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern')?.click();
    }
  }

  const adObs = new MutationObserver(() => { cleanAds(); skipAd(); });
  adObs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  setInterval(() => { cleanAds(); skipAd(); }, 2000);

  Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
  Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
  const _addListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t, fn, opts) {
    if (t === 'visibilitychange') return;
    return _addListener.call(this, t, fn, opts);
  };

  function setAudioOnly(on) {
    const el = document.getElementById('yt-ao-style') || (() => {
      const s = document.createElement('style'); s.id = 'yt-ao-style';
      document.head.append(s); return s;
    })();
    el.textContent = on ? 'video{display:none!important}' : '';
  }

  document.addEventListener('toggle-pip', function (e) {
    const url = e.detail?.url || window.location.href;
    window.__TAURI_INVOKE__('toggle_pip', { url: url }).catch(() => {});
  });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      const url = window.location.href;
      window.__TAURI_INVOKE__('toggle_pip', { url: url }).catch(() => {});
    }
  });

  const sponsorObs = new MutationObserver(() => {
    document.querySelectorAll('[class*="skip"], [aria-label*="Skip"]').forEach(b => b.click());
  });
  sponsorObs.observe(document.body, { childList: true, subtree: true });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => document.querySelector('video')?.play());
    navigator.mediaSession.setActionHandler('pause', () => document.querySelector('video')?.pause());
    navigator.mediaSession.setActionHandler('seekforward', () => { const v = document.querySelector('video'); if (v) v.currentTime += 10; });
    navigator.mediaSession.setActionHandler('seekbackward', () => { const v = document.querySelector('video'); if (v) v.currentTime -= 10; });
    setInterval(() => {
      const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent?.trim()
        || document.querySelector('#title h1')?.textContent?.trim() || '';
      const channel = document.querySelector('#owner yt-formatted-string a')?.textContent?.trim()
        || document.querySelector('.ytd-channel-name a')?.textContent?.trim() || '';
      const thumb = document.querySelector('link[rel="image_src"]')?.href || '';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'YouTube', artist: channel, album: '',
        artwork: thumb ? [{ src: thumb, sizes: '512x512', type: 'image/jpeg' }] : [],
      });
    }, 3000);
  }
})();
