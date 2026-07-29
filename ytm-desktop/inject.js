(function () {
  'use strict';

  const AD_URLS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'pagead2.googlesyndication.com', 'tpc.googlesyndication.com',
    'adservice.google.com', '2mdn.net', 'google-analytics.com',
    'googletagmanager.com', 'googletagservices.com',
    'youtube.com/api/stats/ads', 'youtube.com/pagead',
    'music.youtube.com/api/stats/ads',
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

  function cleanAds() {
    if (!settings.ad_block_enabled) return;
    document.querySelectorAll(
      '#player-ads, #masthead-ad, .ytp-ad-module, .ytp-ad-image-overlay, ' +
      '.ytp-ad-text-overlay, .ytp-ad-skip-button-container, .ytp-ad-overlay-container, ' +
      '.ytd-ad-slot-renderer, ytd-ad-slot-renderer, .ytd-mealbar-promo-renderer, ' +
      'ytd-mealbar-promo-renderer, .ytd-display-ad-renderer, .ad-showing, ' +
      '.video-ads, .ytp-ad-player-overlay, ytmusic-mealbar-promo-renderer, ' +
      '.ytmusic-mealbar-overlay, tp-yt-iron-overlay-backdrop'
    ).forEach(el => el.remove());
  }

  function skipAd() {
    if (!settings.ad_block_enabled) return;
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
    s.textContent = on ? 'ytmusic-app{max-width:500px!important;max-height:400px!important;overflow:hidden!important}#left-content,#nav-bar,#side-panel{display:none!important}.music-player-bar{width:100%!important}' : '';
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
    document.querySelectorAll('[class*="skip"], [aria-label*="Skip"]').forEach(b => b.click());
  });
  sponsorObs.observe(document.body, { childList: true, subtree: true });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => document.querySelector('video')?.play());
    navigator.mediaSession.setActionHandler('pause', () => document.querySelector('video')?.pause());
    navigator.mediaSession.setActionHandler('seekforward', () => { const v = document.querySelector('video'); if (v) v.currentTime += 10; });
    navigator.mediaSession.setActionHandler('seekbackward', () => { const v = document.querySelector('video'); if (v) v.currentTime -= 10; });
    setInterval(() => {
      const title = document.querySelector('.title.ytmusic-player-bar')?.textContent?.trim()
        || document.querySelector('#title h1')?.textContent?.trim() || '';
      const channel = document.querySelector('.byline.ytmusic-player-bar')?.textContent?.trim()
        || document.querySelector('#owner-name a')?.textContent?.trim() || '';
      const thumb = document.querySelector('link[rel="image_src"]')?.href || '';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'YouTube Music', artist: channel, album: '',
        artwork: thumb ? [{ src: thumb, sizes: '512x512', type: 'image/jpeg' }] : [],
      });
    }, 3000);
  }
})();
