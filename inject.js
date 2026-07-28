(function () {
  'use strict';

  // ---- Network-level ad blocking (intercept fetch/XHR) ----
  const AD_DOMAINS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'googletagservices.com', 'googletagmanager.com', 'adservice.google.com',
    'pagead2.googlesyndication.com', 'tpc.googlesyndication.com',
    'adserverpub.com', 'adsafeprotected.com', 'moatads.com',
    'pubmatic.com', 'rubiconproject.com', 'criteo.com',
    'ads.yahoo.com', 'adnxs.com', 'casalemedia.com',
    'scorecardresearch.com', 'quantserve.com', 'exelator.com',
    '2mdn.net', 'youtube.com/api/stats/ads', 'youtube.com/pagead',
    'yt3.ggpht.com/ytc/',
  ];

  // Block fetch requests to ad domains
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && AD_DOMAINS.some(d => url.includes(d))) {
      return new Response('', { status: 204 });
    }
    // Block YouTube API ad responses
    if (url && url.includes('youtube.com/youtubei/v1/') && args[1]?.body) {
      try {
        const body = JSON.parse(args[1].body);
        if (body?.context?.client?.clientName === 'WEB') {
          const modified = JSON.parse(JSON.stringify(body));
          if (modified?.context?.thirdParty) modified.context.thirdParty = {};
          if (modified?.context?.adContext) delete modified.context.adContext;
          if (modified?.context?.client?.supportsAdSession) modified.context.client.supportsAdSession = false;
          args[1].body = JSON.stringify(modified);
        }
      } catch (e) {}
    }
    return origFetch.apply(this, args);
  };

  // Block XHR requests to ad domains
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (url && AD_DOMAINS.some(d => url.includes(d))) {
      this.abort();
      return;
    }
    return origOpen.apply(this, arguments);
  };

  // Block WebSocket connections to ad servers
  const origWS = window.WebSocket;
  window.WebSocket = function (url, ...args) {
    if (AD_DOMAINS.some(d => url.includes(d))) {
      console.debug('[YT-Block] Blocked WS:', url);
      return { close: () => {} };
    }
    return new origWS(url, ...args);
  };
  window.WebSocket.prototype = origWS.prototype;

  // Block image/script/ad element creation with ad URLs
  const origCreateElement = document.createElement.bind(document);
  document.createElement = function (tag, options) {
    const el = origCreateElement(tag, options);
    if (tag === 'script' || tag === 'img' || tag === 'iframe') {
      const origSetAttribute = el.setAttribute.bind(el);
      el.setAttribute = function (name, value) {
        if (name === 'src' && typeof value === 'string' && AD_DOMAINS.some(d => value.includes(d))) {
          return;
        }
        return origSetAttribute(name, value);
      };
      Object.defineProperty(el, 'src', {
        set: function (value) {
          if (typeof value === 'string' && AD_DOMAINS.some(d => value.includes(d))) return;
          origSetAttribute('src', value);
        },
        configurable: true,
      });
    }
    return el;
  };

  // ---- Block ad-related JSON responses from YouTube API ----
  const origJSONparse = JSON.parse;
  JSON.parse = function (...args) {
    try {
      const result = origJSONparse.apply(this, args);
      if (result && typeof result === 'object') {
        stripAdData(result);
      }
      return result;
    } catch (e) {
      return origJSONparse.apply(this, args);
    }
  };

  function stripAdData(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(stripAdData);
      return;
    }
    const adKeys = ['adPlacements', 'playerAds', 'adSlots', 'adBreak', 'adInfo',
      'adVideoId', 'adBreakOffset', 'adBreakLength', 'adBreakUrl',
      'postRollAd', 'preRollAd', 'midRollAd', 'advertisingId',
      'adBreakTag', 'adBreakPolicy', 'adBreakParams'];
    for (const key of adKeys) {
      if (key in obj) {
        delete obj[key];
      }
    }
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase().includes('ad') && !key.includes('load') && !key.includes('bad')) {
        delete obj[key];
        continue;
      }
      stripAdData(obj[key]);
    }
  }

  // ---- Aggressive DOM ad removal ----
  function removeAds() {
    const selectors = [
      '.video-ads', '.ytp-ad-module', '.ytp-ad-player-overlay',
      '.ytp-ad-text-overlay', '.ytp-ad-image-overlay', '.ytp-ad-skip-button-container',
      '.ytp-ad-message-container', '.ytp-ad-preview-container',
      '.ytp-ad-progress', '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern',
      '#player-ads', '#masthead-ad', '.ytd-ad-slot-renderer',
      '.ytd-promoted-sparkles-text-search-renderer', '.ytd-promoted-video-renderer',
      '.ytd-in-feed-ad-layout', '.ytd-merch-shelf-renderer',
      '.ytd-companion-slot-renderer', '.ytd-banner-promo-renderer',
      '.ytd-action-companion-ad-renderer', '.ytd-display-ad-renderer',
      '.ytd-statement-banner-renderer', '.ytd-mealbar-promo-renderer',
      'ytd-mealbar-promo-renderer', '.ytd-promo-message-renderer',
      '.ad-container', '#polymer-ad', '.ytp-ad-overlay-container',
      '.ytp-ad-message-overlay', '.ytp-ad-survey-overlay',
      '.ytd-video-masthead-ad-v3-renderer', '.ytd-ad-slot-renderer',
      'ytd-ad-slot-renderer', '.ytp-ad-simple-ad-badge',
      '.ytp-ad-visibility-ad-badge', '[class*="ad-badge"]',
      '#ad-background', '.ad-showing', '.ytp-ad-progress-list',
      'ytd-engagement-panel-title-header-renderer[class*="ad"]',
      '.ytp-ad-preview-image', '.ytp-ad-button',
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
  }

  // ---- Fast-forward through ads in the video stream ----
  function skipVideoAds() {
    const video = document.querySelector('video');
    if (!video) return;

    const adContainer = document.querySelector('.ytp-ad-player-overlay, .video-ads, .ytp-ad-module');
    if (adContainer || document.querySelector('.ytp-ad-text-overlay')) {
      video.muted = true;
      video.playbackRate = 16;
      if (video.duration && video.currentTime < video.duration - 0.5) {
        video.currentTime = video.duration - 0.3;
      }
      if (video.remaining) {
        try { video.currentTime = video.duration; } catch (e) {}
      }
    }

    const adBadge = document.querySelector('.ytp-ad-simple-ad-badge, .ytp-ad-visibility-ad-badge, .ytp-ad-badge');
    if (adBadge) {
      video.muted = true;
      video.playbackRate = 16;
    }
  }

  // ---- Watch for ad state changes on the player ----
  function observePlayerAds() {
    const player = document.querySelector('.html5-video-player') || document.body;

    const adObserver = new MutationObserver(() => {
      removeAds();
      skipVideoAds();

      // Click any skip buttons
      document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, [aria-label*="Skip ad"]').forEach(b => b.click());

      // Remove ad overlay if it appears
      const overlay = document.querySelector('.ytp-ad-player-overlay');
      if (overlay) overlay.remove();
    });

    adObserver.observe(player, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-ad'],
    });

    // Also observe body for ad injections
    const bodyObserver = new MutationObserver(() => removeAds());
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // Aggressive periodic cleanup
    setInterval(() => {
      removeAds();
      skipVideoAds();
      document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern').forEach(b => b.click());
    }, 500);
  }

  // ---- Background Playback ----
  function enableBackgroundPlayback() {
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);

    const origAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === 'visibilitychange') return;
      return origAdd.call(this, type, listener, options);
    };
  }

  // ---- Audio Only ----
  function applyAudioOnly(enabled) {
    const css = document.getElementById('yt-ao-css');
    if (enabled) {
      if (!css) {
        const s = document.createElement('style');
        s.id = 'yt-ao-css';
        s.textContent = 'video { display: none !important; } .ytp-chrome-bottom { opacity: 0 !important; }';
        document.head.appendChild(s);
      }
      document.querySelectorAll('video').forEach(v => v.style.display = 'none');
    } else {
      css?.remove();
      document.querySelectorAll('video').forEach(v => v.style.display = '');
    }
  }

  // ---- Sponsor Skip ----
  function skipSponsors() {
    const observer = new MutationObserver(() => {
      document.querySelectorAll('[aria-label*="Skip"], [class*="skip"], .ytp-skip-ad-button').forEach(b => b.click());
      const chapters = document.querySelectorAll('a.ytp-chapter-hover-container');
      chapters.forEach(c => {
        if (c.textContent?.toLowerCase().includes('sponsor')) c.click();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ---- Media Session ----
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => document.querySelector('video')?.play());
    navigator.mediaSession.setActionHandler('pause', () => document.querySelector('video')?.pause());
    navigator.mediaSession.setActionHandler('seekforward', () => { const v = document.querySelector('video'); if (v) v.currentTime += 10; });
    navigator.mediaSession.setActionHandler('seekbackward', () => { const v = document.querySelector('video'); if (v) v.currentTime -= 10; });
  }

  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const title = document.querySelector('h1.title yt-formatted-string')?.textContent?.trim()
      || document.querySelector('#title h1')?.textContent?.trim() || '';
    const channel = document.querySelector('#owner-name a')?.textContent?.trim()
      || document.querySelector('.ytd-channel-name a')?.textContent?.trim() || '';
    const thumb = document.querySelector('link[rel="image_src"]')?.href || '';
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'YouTube',
      artist: channel,
      album: '',
      artwork: thumb ? [{ src: thumb, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
  }

  // ---- Settings Panel ----
  function addSettingsPanel() {
    const menu = document.createElement('div');
    menu.innerHTML = `<style>
      #yt-p-btn{position:fixed;bottom:80px;right:20px;z-index:9999;background:#282828;border:1px solid #444;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:20px;transition:.2s}
      #yt-p-btn:hover{background:#3a3a3a}
      #yt-p-menu{position:fixed;bottom:132px;right:20px;z-index:9999;background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:16px;min-width:240px;display:none;box-shadow:0 8px 32px rgba(0,0,0,.5)}
      #yt-p-menu.open{display:block}
      #yt-p-menu h3{margin:0 0 12px;font-size:14px;color:#fff;font-weight:600}
      .yt-p-item{display:flex;align-items:center;justify-content:space-between;padding:8px 0;color:#ccc;font-size:13px}
      .yt-p-item label{cursor:pointer;flex:1}
      .yt-p-switch{position:relative;width:36px;height:20px;cursor:pointer}
      .yt-p-switch input{opacity:0;width:0;height:0}
      .yt-p-slider{position:absolute;top:0;left:0;right:0;bottom:0;background:#555;border-radius:20px;transition:.3s}
      .yt-p-slider::before{content:'';position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:2px;left:2px;transition:.3s}
      .yt-p-switch input:checked+.yt-p-slider{background:#ff4444}
      .yt-p-switch input:checked+.yt-p-slider::before{transform:translateX(16px)}
    </style>`;

    const m = document.createElement('div'); m.id = 'yt-p-menu';
    const t = document.createElement('h3'); t.textContent = 'YT Premium'; m.appendChild(t);

    const prefs = JSON.parse(localStorage.getItem('yt_prefs') || '{"ad":true,"bg":true,"sp":true,"ao":false}');
    const items = [
      ['ad', 'Ad Block'],
      ['bg', 'Background Playback'],
      ['sp', 'Skip Sponsors'],
      ['ao', 'Audio Only'],
    ];

    items.forEach(([k, label]) => {
      const d = document.createElement('div'); d.className = 'yt-p-item';
      const l = document.createElement('label'); l.textContent = label; l.htmlFor = `ps-${k}`;
      const sw = document.createElement('label'); sw.className = 'yt-p-switch';
      const inp = document.createElement('input'); inp.type = 'checkbox'; inp.id = `ps-${k}`; inp.checked = prefs[k];
      const sl = document.createElement('span'); sl.className = 'yt-p-slider';
      sw.append(inp, sl);
      inp.onchange = () => {
        prefs[k] = inp.checked;
        localStorage.setItem('yt_prefs', JSON.stringify(prefs));
        if (k === 'ao') applyAudioOnly(inp.checked);
        if (k === 'bg') { if (inp.checked) enableBackgroundPlayback(); }
      };
      d.append(l, sw); m.appendChild(d);
    });

    document.body.append(m);

    const btn = document.createElement('div'); btn.id = 'yt-p-btn'; btn.textContent = '✦'; btn.title = 'YT Premium';
    document.body.appendChild(btn);

    let open = false;
    btn.onclick = () => { open = !open; m.classList.toggle('open', open); };
    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !m.contains(e.target)) { m.classList.remove('open'); open = false; }
    });
  }

  // ---- Init ----
  function init() {
    enableBackgroundPlayback();
    observePlayerAds();
    skipSponsors();
    setupMediaSession();

    const prefs = JSON.parse(localStorage.getItem('yt_prefs') || '{}');
    if (prefs.ao) applyAudioOnly(true);

    setInterval(updateMediaSession, 3000);
    setTimeout(addSettingsPanel, 3000);
    setTimeout(updateMediaSession, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
