(function () {
  'use strict';

  const AD_URLS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'pagead2.googlesyndication.com', 'tpc.googlesyndication.com',
    'adservice.google.com', '2mdn.net', 'google-analytics.com',
    'googletagmanager.com', 'googletagservices.com',
    'youtube.com/api/stats/ads', 'youtube.com/pagead',
    'youtube.com/adclick', 'youtube.com/api/ads',
    'youtube.com/youtubei/v1/ads', 'youtube.com/sw.js',
    'youtube.com/sw.js_data', 'googleoptimize.com',
    'youtube.com/youtubei/v1/next', 'youtube.com/youtubei/v1/player',
    'youtube.com/youtubei/v1/search', 'youtube.com/youtubei/v1/browse',
  ];

  function invoke(cmd, args) {
    if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
      return window.__TAURI_INTERNALS__.invoke(cmd, args || {});
    }
    return Promise.reject('ipc not ready');
  }

  let settings = { ad_block_enabled: true, audio_only: false, background_playback: true, mini_player: false, sleep_timer_minutes: 0, first_run: false };

  invoke('get_settings').then(s => {
    settings = s;
    if (s.first_run) {
      invoke('set_setting', { key: 'first_run', value: false });
    }
    applySettings();
  }).catch(() => {});

  window.addEventListener('tauri://settings-changed', e => { settings = e.detail; applySettings(); });

  function applySettings() {
    applyAudioOnly(settings.audio_only);
    applyMiniPlayer(settings.mini_player);
    if (settings.sleep_timer_minutes > 0) invoke('start_sleep_timer', { minutes: settings.sleep_timer_minutes });
  }

  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    if (url && settings.ad_block_enabled && AD_URLS.some(a => url.includes(a))) {
      return Promise.resolve(new Response('', { status: 204 }));
    }
    return _fetch.call(this, input, init);
  };

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === 'string' && settings.ad_block_enabled && AD_URLS.some(a => url.includes(a))) return;
    return _open.apply(this, arguments);
  };

  const AD_SELECTORS = [
    '#player-ads', '#masthead-ad', '.ytp-ad-module', '.ytp-ad-image-overlay',
    '.ytp-ad-text-overlay', '.ytp-ad-skip-button-container', '.ytp-ad-overlay-container',
    '.ytd-ad-slot-renderer', 'ytd-ad-slot-renderer', '.ytd-mealbar-promo-renderer',
    'ytd-mealbar-promo-renderer', '.ytd-display-ad-renderer', '.ad-showing',
    '.video-ads', '.ytp-ad-player-overlay',
    'ytd-video-masthead-ad-v3-renderer', 'ytd-in-feed-ad-layout-renderer',
    '.ytp-ad-progress-list', '.ytd-search-pyv-renderer',
    'ytd-compact-promoted-video-renderer', 'ytd-promoted-video-renderer',
    'ytd-companion-slot-renderer', '.ytp-ad-action-interrupt-slot',
    '.ytp-ad-preview-container', '.ytp-ad-message-overlay',
    'ytd-video-masthead-ad', 'ytd-banner-promo-renderer',
    'ytd-compact-promoted-sparkles-renderer',
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-engagement-panel-title-header-renderer',
    '.ytd-banner-promo-renderer', '.ad-container', '.ytd-companion-slot-renderer',
    'ytd-action-companion-ad-renderer', 'ytd-ad-slot-renderer',
    '.ytd-merch-shelf-renderer', 'ytd-merch-shelf-renderer',
    '.ytd-search-pyv-renderer', '.ytd-player-legacy-desktop-watch-ads-renderer',
    '#ad-inline-block', '.ytd-rich-item-renderer[class*="ad"]',
    ytd-ad-slot-renderer, ytd-video-masthead-ad-v3-renderer,
    ytd-in-feed-ad-layout-renderer, ytd-compact-promoted-video-renderer,
    ytd-promoted-video-renderer, ytd-companion-slot-renderer,
    ytd-video-masthead-ad, ytd-banner-promo-renderer,
    ytd-action-companion-ad-renderer, ytd-merch-shelf-renderer,
    ytd-compact-promoted-sparkles-renderer,
    ytd-promoted-sparkles-text-search-renderer,
  ];

  const CONTAINER_SELECTORS = [
    'ytd-ad-slot-renderer', 'ytd-display-ad-renderer',
    'ytd-mealbar-promo-renderer', 'ytd-video-masthead-ad-v3-renderer',
    'ytd-in-feed-ad-layout-renderer', 'ytd-companion-slot-renderer',
    'ytd-action-companion-ad-renderer', 'ytd-banner-promo-renderer',
    'ytd-promoted-video-renderer', 'ytd-compact-promoted-video-renderer',
  ];

  function cleanAds() {
    if (!settings.ad_block_enabled) return;
    for (const sel of AD_SELECTORS) {
      try {
        const els = document.querySelectorAll(sel);
        for (let i = els.length - 1; i >= 0; i--) {
          const el = els[i];
          if (el && el.parentNode) el.remove();
        }
      } catch (e) {}
    }
  }

  function skipAd() {
    if (!settings.ad_block_enabled) return;
    const v = document.querySelector('video');
    if (!v) return;
    const isAd = document.querySelector('.ad-showing, .ytp-ad-module, .video-ads, .ytp-ad-player-overlay');
    if (isAd || (v.duration && v.duration < 60 && document.querySelector('.ytp-time-display')?.textContent?.includes(':'))) {
      v.muted = true;
      v.playbackRate = 16;
      if (v.duration && v.currentTime < v.duration - 0.3) v.currentTime = v.duration - 0.3;
      document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button')?.click();
      setTimeout(() => { v.playbackRate = 1; }, 500);
    }
  }

  function hideAdOverlays() {
    if (!settings.ad_block_enabled) return;
    const style = document.getElementById('bn-ad-style') || (() => {
      const s = document.createElement('style'); s.id = 'bn-ad-style';
      s.textContent = `
        .ytp-ad-overlay-container, .ytp-ad-player-overlay,
        .ytp-ad-image-overlay, .ytp-ad-text-overlay,
        .ytp-ad-action-interrupt-slot, .ytp-ad-preview-container,
        .ytp-ad-message-overlay, .ytp-ad-progress-list,
        .ytp-ad-module { display: none !important; }
        .ad-showing video { display: block !important; }
      `;
      document.head.append(s); return s;
    })();
  }

  const adObs = new MutationObserver(() => { cleanAds(); skipAd(); });
  if (document.body) {
    adObs.observe(document.body, { childList: true, subtree: true });
    hideAdOverlays();
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!adObs.takeRecords) return;
    cleanAds(); skipAd(); hideAdOverlays();
  });
  setInterval(() => { cleanAds(); skipAd(); }, 1500);

  Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
  Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
  const _addListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t, fn, opts) {
    if (t === 'visibilitychange') return;
    return _addListener.call(this, t, fn, opts);
  };

  function applyAudioOnly(on) {
    const el = document.getElementById('yt-ao-style') || (() => {
      const s = document.createElement('style'); s.id = 'yt-ao-style';
      document.head.append(s); return s;
    })();
    el.textContent = on ? 'video{display:none!important}' : '';
  }

  function applyMiniPlayer(on) {
    let s = document.getElementById('yt-mini-style');
    if (!s) { s = document.createElement('style'); s.id = 'yt-mini-style'; document.head.append(s); }
    s.textContent = on ? 'html{--yt-main-win-w:480px!important;--yt-main-win-h:360px!important}ytd-app{max-width:480px!important;max-height:360px!important;overflow:hidden!important}#guide-icon,#guide,#masthead-container,#related,#comments,.ytd-video-secondary-info-renderer{display:none!important}#primary,#player{width:100%!important;max-width:480px!important}' : '';
    if (on) { document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = ''; }
  }

  document.addEventListener('toggle-pip', function (e) {
    invoke('toggle_pip', { url: e.detail?.url || window.location.href }).catch(() => {});
  });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      invoke('toggle_pip', { url: window.location.href }).catch(() => {});
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      const m = parseInt(prompt('Sleep timer (minutes):', '30'), 10);
      if (m > 0) { invoke('start_sleep_timer', { minutes: m }); invoke('set_sleep_timer', { minutes: m }); }
    }
    if (e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      invoke('quit_app').catch(() => {});
    }
  });

  const sponsorObs = new MutationObserver(() => {
    document.querySelectorAll('[class*="skip"], [aria-label*="Skip"], [class*="ytp-ad-skip"]').forEach(b => b.click());
  });
  if (document.body) sponsorObs.observe(document.body, { childList: true, subtree: true });

  const vObs = new MutationObserver(() => {
    const v = document.querySelector('video');
    if (v && !v._bn_patched) {
      v._bn_patched = true;
      const origPlay = v.play.bind(v);
      v.play = function () {
        if (document.querySelector('.ad-showing')) {
          v.muted = true; v.playbackRate = 16;
          setTimeout(() => { v.muted = false; v.playbackRate = 1; }, 3000);
        }
        return origPlay();
      };
    }
  });
  if (document.body) vObs.observe(document.body, { childList: true, subtree: true });

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
