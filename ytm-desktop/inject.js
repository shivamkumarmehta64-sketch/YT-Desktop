(function () {
  'use strict';

  const CONFIG = {
    adBlockEnabled: true,
    audioOnly: false,
    backgroundPlayback: true,
    sponsorSkip: true,
  };

  let isAudioOnly = false;
  let isAdBlockEnabled = true;
  let isBackgroundPlayback = true;
  let isSponsorSkip = true;

  let currentVideoUrl = '';
  let currentTrackInfo = {};

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        if (Date.now() - start > timeout) return resolve(null);
        requestAnimationFrame(check);
      };
      check();
    });
  }

  function waitForAnyElement(selectors, timeout = 10000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) return resolve(el);
        }
        if (Date.now() - start > timeout) return resolve(null);
        requestAnimationFrame(check);
      };
      check();
    });
  }

  function injectCustomCSS(css) {
    const style = document.createElement('style');
    style.id = 'ytm-premium-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---- Ad Blocking ----
  function blockAds() {
    if (!isAdBlockEnabled) return;

    const adSelectors = [
      'ytmusic-mealbar-promo-renderer',
      '#mealbar',
      'ytmusic-navigation-button[aria-label*="Premium"]',
      'ytmusic-popup-container',
      'ytmusic-dismissible-panel-renderer',
    ];

    const adObserver = new MutationObserver(() => {
      for (const sel of adSelectors) {
        document.querySelectorAll(sel).forEach((el) => {
          if (el.matches('ytmusic-mealbar-promo-renderer, #mealbar, ytmusic-navigation-button[aria-label*="Premium"]')) {
            el.remove();
          }
        });
      }

      document.querySelectorAll('video').forEach((video) => {
        const adBadge = video.closest('ytmusic-player')?.querySelector('[aria-label*="Ad"]');
        if (adBadge) {
          video.muted = true;
          video.currentTime = video.duration || Infinity;
        }
      });
    });

    adObserver.observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
      for (const sel of adSelectors) {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      }
    }, 2000);
  }

  // ---- Background Playback ----
  function enableBackgroundPlayback() {
    if (!isBackgroundPlayback) return;

    Object.defineProperty(document, 'hidden', { get: () => false });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
    document.addEventListener('visibilitychange', (e) => {
      e.stopImmediatePropagation();
    }, true);

    const origAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === 'visibilitychange') return;
      return origAddEventListener.call(this, type, listener, options);
    };
  }

  // ---- Audio-Only Mode ----
  function applyAudioOnly(enabled) {
    if (enabled) {
      document.querySelectorAll('video').forEach((v) => {
        v.style.display = 'none';
      });
      injectCustomCSS(`
        video { display: none !important; }
        .video-player-page { background: #000 !important; }
        ytmusic-player video { display: none !important; }
        .ytmusic-player-bar { display: flex !important; }
        #player-bar-ui { display: flex !important; }
      `);
    } else {
      document.querySelectorAll('video').forEach((v) => {
        v.style.display = '';
      });
      document.querySelectorAll('#ytm-premium-css').forEach((el) => el.remove());
    }
    isAudioOnly = enabled;
  }

  // ---- Sponsor Block ----
  function skipSponsors() {
    if (!isSponsorSkip) return;

    const skipObserver = new MutationObserver(() => {
      const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, [aria-label*="Skip"], [aria-label*="スキップ"]');
      if (skipBtn) skipBtn.click();

      const sponsorSegments = document.querySelectorAll('[class*="sponsor"], [id*="sponsor"]');
      sponsorSegments.forEach((el) => {
        if (el.textContent?.toLowerCase().includes('sponsored')) {
          el.style.display = 'none';
        }
      });
    });

    skipObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  // ---- Media Session Integration ----
  function setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        document.querySelector('video')?.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        document.querySelector('video')?.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        document.querySelector('[aria-label="Previous"]')?.click();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        document.querySelector('[aria-label="Next"]')?.click();
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        const video = document.querySelector('video');
        if (video) video.currentTime += 10;
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        const video = document.querySelector('video');
        if (video) video.currentTime -= 10;
      });
    }
  }

  function updateMediaSession(trackInfo) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackInfo.title || 'Unknown',
        artist: trackInfo.artist || 'Unknown',
        album: trackInfo.album || '',
        artwork: trackInfo.coverUrl
          ? [{ src: trackInfo.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
    }
  }

  // ---- Track Info Detection ----
  function detectTrackInfo() {
    const titleEl = document.querySelector('.ytmusic-player-bar .title, ytmusic-player-bar .title, #song-title');
    const artistEl = document.querySelector('.ytmusic-player-bar .byline, ytmusic-player-bar .byline, #byline');
    const thumbnailEl = document.querySelector('.ytmusic-player-bar img, ytmusic-player-bar img, #thumbnail img');

    const title = titleEl?.textContent?.trim() || 'Unknown';
    const artist = artistEl?.textContent?.trim() || 'Unknown';
    const coverUrl = thumbnailEl?.src || '';

    const info = { title, artist, album: '', coverUrl, duration: '' };
    currentTrackInfo = info;

    updateMediaSession(info);

    try {
      if (window.__TAURI__) {
        const { invoke } = window.__TAURI__.core;
        invoke('set_media_info', { track: info });
      }
    } catch (e) {
      // ignore
    }
  }

  // ---- Download Button ----
  function addDownloadButton() {
    const buttonContainer = document.querySelector(
      '#right-controls, .ytmusic-player-bar > :last-child, ytmusic-player-bar .right-controls'
    );
    if (!buttonContainer || document.querySelector('#ytm-download-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ytm-download-btn';
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    `;
    btn.title = 'Download Track';
    btn.style.cssText = `
      background: none; border: none; color: #fff; cursor: pointer;
      padding: 8px; opacity: 0.7; transition: opacity 0.2s;
    `;
    btn.onmouseenter = () => (btn.style.opacity = '1');
    btn.onmouseleave = () => (btn.style.opacity = '0.7');

    btn.addEventListener('click', async () => {
      const videoId = new URLSearchParams(window.location.hash.split('?')[1]).get('v')
        || currentVideoUrl.split('v=')[1]?.split('&')[0];
      if (!videoId) return;

      try {
        if (window.__TAURI__) {
          const { invoke } = window.__TAURI__.core;
          const { open } = window.__TAURI__.dialog;
          const selected = await open({ directory: true, title: 'Select download folder' });
          if (selected) {
            btn.innerHTML = '...';
            const url = `https://music.youtube.com/watch?v=${videoId}`;
            const result = await invoke('download_track', { url, outputDir: selected });
            console.log('Downloaded:', result);
            btn.innerHTML = '✓';
            setTimeout(() => {
              btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              `;
            }, 2000);
          }
        }
      } catch (e) {
        console.error('Download failed:', e);
        btn.innerHTML = '✗';
      }
    });

    buttonContainer.appendChild(btn);
  }

  // ---- Keyboard Shortcuts ----
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          document.querySelector('video')?.paused
            ? document.querySelector('video')?.play()
            : document.querySelector('video')?.pause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          const v = document.querySelector('video');
          if (v) v.currentTime -= 10;
          break;
        case 'ArrowRight':
          e.preventDefault();
          const v2 = document.querySelector('video');
          if (v2) v2.currentTime += 10;
          break;
        case 'm':
        case 'M':
          const video = document.querySelector('video');
          if (video) video.muted = !video.muted;
          break;
        case 'f':
        case 'F':
          document.querySelector('[aria-label="Full screen"], [aria-label*="fullscreen"]')?.click();
          break;
      }
    });
  }

  // ---- Preferences Persistence ----
  function loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem('ytm_premium_prefs') || '{}');
      if (saved.audioOnly !== undefined) isAudioOnly = saved.audioOnly;
      if (saved.adBlock !== undefined) isAdBlockEnabled = saved.adBlock;
      if (saved.backgroundPlayback !== undefined) isBackgroundPlayback = saved.backgroundPlayback;
      if (saved.sponsorSkip !== undefined) isSponsorSkip = saved.sponsorSkip;

      CONFIG.audioOnly = isAudioOnly;
      CONFIG.adBlockEnabled = isAdBlockEnabled;
      CONFIG.backgroundPlayback = isBackgroundPlayback;
      CONFIG.sponsorSkip = isSponsorSkip;
    } catch (e) {
      // ignore
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(
        'ytm_premium_prefs',
        JSON.stringify({
          audioOnly: isAudioOnly,
          adBlock: isAdBlockEnabled,
          backgroundPlayback: isBackgroundPlayback,
          sponsorSkip: isSponsorSkip,
        })
      );
    } catch (e) {
      // ignore
    }
  }

  // ---- Settings UI ----
  function addSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'ytm-premium-panel';
    panel.innerHTML = `
      <style>
        #ytm-premium-toggle {
          position: fixed; bottom: 80px; right: 20px; z-index: 9999;
          background: #282828; border: 1px solid #444; border-radius: 50%;
          width: 44px; height: 44px; display: flex; align-items: center;
          justify-content: center; cursor: pointer; color: #fff;
          font-size: 20px; transition: all 0.2s;
        }
        #ytm-premium-toggle:hover { background: #3a3a3a; }
        #ytm-premium-menu {
          position: fixed; bottom: 132px; right: 20px; z-index: 9999;
          background: #1a1a1a; border: 1px solid #333; border-radius: 12px;
          padding: 16px; min-width: 240px; display: none;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        #ytm-premium-menu.open { display: block; }
        #ytm-premium-menu h3 {
          margin: 0 0 12px; font-size: 14px; color: #fff;
          font-weight: 600;
        }
        .ytm-premium-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 0; color: #ccc; font-size: 13px;
        }
        .ytm-premium-item label { cursor: pointer; flex: 1; }
        .ytm-premium-switch {
          position: relative; width: 36px; height: 20px;
          cursor: pointer;
        }
        .ytm-premium-switch input { opacity: 0; width: 0; height: 0; }
        .ytm-premium-slider {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: #555; border-radius: 20px; transition: 0.3s;
        }
        .ytm-premium-slider::before {
          content: ''; position: absolute; width: 16px; height: 16px;
          border-radius: 50%; background: #fff; top: 2px; left: 2px;
          transition: 0.3s;
        }
        .ytm-premium-switch input:checked + .ytm-premium-slider {
          background: #ff4444;
        }
        .ytm-premium-switch input:checked + .ytm-premium-slider::before {
          transform: translateX(16px);
        }
      </style>
    `;

    const menu = document.createElement('div');
    menu.id = 'ytm-premium-menu';

    const title = document.createElement('h3');
    title.textContent = 'YT Premium';
    menu.appendChild(title);

    const settings = [
      { id: 'adblock', label: 'Ad Block', key: 'adBlock' },
      { id: 'bgplayback', label: 'Background Playback', key: 'backgroundPlayback' },
      { id: 'sponsorskp', label: 'Skip Sponsors', key: 'sponsorSkip' },
      { id: 'audioonly', label: 'Audio Only', key: 'audioOnly' },
    ];

    settings.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'ytm-premium-item';

      const label = document.createElement('label');
      label.textContent = s.label;
      label.htmlFor = `ytm-switch-${s.id}`;

      const switchWrap = document.createElement('label');
      switchWrap.className = 'ytm-premium-switch';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `ytm-switch-${s.id}`;
      input.checked = CONFIG[s.key];

      const slider = document.createElement('span');
      slider.className = 'ytm-premium-slider';

      switchWrap.appendChild(input);
      switchWrap.appendChild(slider);

      input.addEventListener('change', () => {
        CONFIG[s.key] = input.checked;
        switch (s.key) {
          case 'adBlock':
            isAdBlockEnabled = input.checked;
            break;
          case 'backgroundPlayback':
            isBackgroundPlayback = input.checked;
            if (input.checked) enableBackgroundPlayback();
            break;
          case 'sponsorSkip':
            isSponsorSkip = input.checked;
            break;
          case 'audioOnly':
            applyAudioOnly(input.checked);
            break;
        }
        savePreferences();
      });

      item.appendChild(label);
      item.appendChild(switchWrap);
      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    const toggle = document.createElement('div');
    toggle.id = 'ytm-premium-toggle';
    toggle.textContent = '✦';
    toggle.title = 'YT Premium Settings';
    document.body.appendChild(toggle);

    let menuOpen = false;
    toggle.addEventListener('click', () => {
      menuOpen = !menuOpen;
      menu.classList.toggle('open', menuOpen);
    });

    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
        menuOpen = false;
      }
    });
  }

  // ---- Track Observer ----
  function observeTrackChanges() {
    let lastTitle = '';
    setInterval(() => {
      const titleEl = document.querySelector('.ytmusic-player-bar .title, ytmusic-player-bar .title, #song-title');
      const currentTitle = titleEl?.textContent?.trim() || '';
      if (currentTitle && currentTitle !== lastTitle) {
        lastTitle = currentTitle;
        detectTrackInfo();
        const videoUrl = window.location.href;
        if (videoUrl !== currentVideoUrl) {
          currentVideoUrl = videoUrl;
          addDownloadButton();
        }
      }
    }, 1000);
  }

  // ---- Init ----
  function init() {
    loadPreferences();

    if (isBackgroundPlayback) enableBackgroundPlayback();
    if (isAdBlockEnabled) blockAds();
    if (isSponsorSkip) skipSponsors();
    if (isAudioOnly) applyAudioOnly(true);

    setupMediaSession();
    setupKeyboardShortcuts();
    observeTrackChanges();

    setTimeout(addSettingsPanel, 3000);
    setTimeout(() => detectTrackInfo(), 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
