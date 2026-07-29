(function () {
  'use strict';

  const AD_URLS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'pagead2.googlesyndication.com', 'tpc.googlesyndication.com',
    'adservice.google.com', '2mdn.net',
    'youtube.com/api/stats/ads', 'youtube.com/pagead',
    'music.youtube.com/api/stats/ads',
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
      '.video-ads, .ytp-ad-player-overlay, ytmusic-mealbar-promo-renderer, ' +
      '.ytmusic-mealbar-overlay, tp-yt-iron-overlay-backdrop'
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
        title: title || 'YouTube Music',
        artist: channel, album: '',
        artwork: thumb ? [{ src: thumb, sizes: '512x512', type: 'image/jpeg' }] : [],
      });
    }, 3000);
  }

  setTimeout(() => {
    const prefs = JSON.parse(localStorage.getItem('ytp_prefs') || '{"ao":false}');
    const panel = document.createElement('div');
    panel.innerHTML = `<style>
      #ytp-btn{position:fixed;bottom:80px;right:20px;z-index:9999;width:40px;height:40px;border-radius:50%;background:#282828;border:1px solid #444;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:18px;transition:.2s}
      #ytp-btn:hover{background:#3a3a3a}
      #ytp-menu{position:fixed;bottom:130px;right:20px;z-index:9999;background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:16px;min-width:200px;display:none;box-shadow:0 8px 32px rgba(0,0,0,.5)}
      #ytp-menu.o{display:block}
      #ytp-menu h3{margin:0 0 12px;font-size:14px;color:#fff}
      .ytp-r{display:flex;align-items:center;justify-content:space-between;padding:6px 0;color:#ccc;font-size:13px}
      .ytp-r label{flex:1;cursor:pointer}
      .ytp-sw{position:relative;width:34px;height:18px;cursor:pointer}
      .ytp-sw input{opacity:0;width:0;height:0}
      .ytp-sw .sl{position:absolute;inset:0;background:#555;border-radius:9px;transition:.3s}
      .ytp-sw .sl::before{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;top:2px;left:2px;transition:.3s}
      .ytp-sw input:checked+.sl{background:#e33}
      .ytp-sw input:checked+.sl::before{transform:translateX(16px)}
    </style><div id="ytp-btn">✦</div><div id="ytp-menu"><h3>YT Music Settings</h3></div>`;
    document.body.append(panel);
    const menu = document.getElementById('ytp-menu');
    const btn = document.getElementById('ytp-btn');
    const items = [['ao', 'Audio Only']];
    items.forEach(([k, label]) => {
      const d = document.createElement('div'); d.className = 'ytp-r';
      d.innerHTML = `<label for="ytp-${k}">${label}</label><label class="ytp-sw"><input type="checkbox" id="ytp-${k}"${prefs[k]?' checked':''}><span class="sl"></span></label>`;
      d.querySelector('input').onchange = function () {
        prefs[k] = this.checked;
        localStorage.setItem('ytp_prefs', JSON.stringify(prefs));
        if (k === 'ao') setAudioOnly(this.checked);
      };
      menu.append(d);
    });
    let open = false;
    btn.onclick = () => { open = !open; menu.classList.toggle('o', open); };
    document.addEventListener('click', e => { if (!btn.contains(e.target) && !menu.contains(e.target)) { menu.classList.remove('o'); open = false; } });
    if (prefs.ao) setAudioOnly(true);
  }, 4000);
})();
