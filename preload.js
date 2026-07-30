const { ipcRenderer } = require('electron')

window.api = {
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  onWindowState: (cb) => { ipcRenderer.on('window-state-changed', (e, v) => cb(v)) }
}

// ── SponsorBlock: skip sponsored segments ────────────────────────────────────
var sponsorBlockCache = {}
function fetchSponsorSegments(videoId) {
  if (!videoId || sponsorBlockCache[videoId]) return
  sponsorBlockCache[videoId] = true
  var xhr = new XMLHttpRequest()
  xhr.open('GET', 'https://sponsor.ajay.app/api/skipSegments?videoID=' + videoId + '&categories[]=sponsor&categories[]=selfpromo&categories[]=exclusive_access&categories[]=interaction&categories[]=intro&categories[]=outro&categories[]=preview&categories[]=music_offtopic')
  xhr.onload = function() {
    try {
      var segments = JSON.parse(xhr.responseText)
      if (!segments || !segments.length) return
      sponsorBlockCache[videoId] = segments
      var vi = document.querySelector('video')
      if (!vi) return
      vi.addEventListener('timeupdate', function sbCheck() {
        for (var i = 0; i < segments.length; i++) {
          var s = segments[i]
          if (s.segment && s.segment.length === 2) {
            var start = s.segment[0], end = s.segment[1]
            if (vi.currentTime >= start && vi.currentTime < end) {
              vi.currentTime = end
              showToast('Sponsor skipped')
            }
          }
        }
      })
    } catch (e) {}
  }
  xhr.send()
}

var _origPushState = history.pushState
history.pushState = function() {
  var result = _origPushState.apply(this, arguments)
  checkForNewVideo()
  return result
}
window.addEventListener('popstate', function() { checkForNewVideo() })

function checkForNewVideo() {
  var vi = document.querySelector('video')
  if (vi && vi.src && vi.src.length > 10) {
    var match = vi.src.match(/\/([a-zA-Z0-9_-]{11})\//)
    if (match) fetchSponsorSegments(match[1])
  }
  var urlMatch = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (urlMatch) fetchSponsorSegments(urlMatch[1])
}

// ── ad key stripping (comprehensive) ─────────────────────────────────────────
var adKeys = [
  'adPlacements','adSlots','playerAds','adBreak','adBreakHeartbeatParams',
  'frameworkUpdates','auxiliaryUi.messageRenderers.upsellDialogRenderer',
  'promotedSparklesWebRenderer','promotedVideoRenderer',
  'compactPromotedVideoRenderer','compactPromotedItemRenderer',
  'backgroundPromoRenderer','statementBannerRenderer',
  'brandVideoShelfRenderer','inlineAdLayoutRenderer','adSlotRenderer',
  'adBreakParams','adPlacementId','adSlotId','adVideoId',
  'playerAdParams','adParams','adTagUrl','adTagUrls',
  'companionAd','instreamVideoAd','overlayAd','promotedUrl',
  'promotedSparklesTextRenderer','promotedSparklesVideosRenderer',
  'searchPyvRenderer','actionCompanionAdRenderer','displayAdRenderer',
  'videoMastheadAdRenderer','mastheadAdRenderer','mastheadAd',
  'adBreakHeartbeatParams','adPlacementId','adSlotId','adVideoId',
  'playerAds','midrolls','prerolls','postrolls',
  'adBreakOffset','adBreakDuration','adBreakType',
  'adBreakList','adBreakIndex','adBreakCount',
  'adBreakInfo','adBreakSection','adBreakTiming',
  'adBreakStart','adBreakEnd','adBreakStatus',
  'adBreakPosition','adBreakSequence','adBreakGroup',
  'adBreakSegment','adBreakMetadata','adBreakTracking',
  'adBreakEvent','adBreakState','adBreakConfig',
  'adBreakPolicy','adBreakRule','adBreakSchedule',
  'adBreakSlot','adBreakTemplate','adBreakVariant',
  'adBreakVersion','adBreakWarning','adBreakZone',
  'adIsActive','adIsPlaying','adIsPaused','adIsSkippable',
  'adIsSkipped','adIsCompleted','adIsBlocked',
  'adType','adMode','adFormat','adSource','adNetwork',
  'adUnit','adServer','adCampaign','adGroup','adCreative',
  'adViewability','adEngagement','adInteraction',
  'cumulativeAds','adCount','totalAds','remainingAds',
  'adSegment','adChapter','adMarker','adTimeline',
  'adOverlay','adBanner','adPopup','adSlide',
  'adInterstitial','adFullscreen','adMinimized',
  'adAudio','adVideo','adImage','adText','adRich',
  'adFeedback','adSkip','adDismiss','adClose',
  'adSettings','adPreferences','adPrivacy',
  'adPersonalization','adTargeting','adAttribution',
  'adMeasurability','adVerification','adViewability',
  'carouselAdRenderer','carouselAdRendererViewModel',
  'carouselAdRendererViewModelGrid','carouselAdRendererViewModelList',
  'searchAdsRenderer','searchAdsRendererViewModel','adSlot',
  'adSlotRenderer','adSlotRendererViewModel'
]

function deepWalk(obj, path, keys) {
  if (!obj || typeof obj !== 'object') return false
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) { if (deepWalk(obj[i], path, keys)) return true }
    return false
  }
  var cleaned = false
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i]
    if (k.indexOf('.') > -1) {
      var parts = k.split('.')
      var current = obj
      for (var j = 0; j < parts.length - 1; j++) {
        if (!current || typeof current !== 'object') { current = null; break }
        current = current[parts[j]]
      }
      if (current && typeof current === 'object') {
        var lastKey = parts[parts.length - 1]
        if (lastKey in current) { delete current[lastKey]; cleaned = true }
      }
    } else {
      if (k in obj) { delete obj[k]; cleaned = true }
    }
  }
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (deepWalk(obj[key], path.concat(key), keys)) cleaned = true
    }
  }
  return cleaned
}

var _jp = JSON.parse
JSON.parse = new Proxy(_jp, {
  apply: function(t, a, r) {
    try {
      var x = Reflect.apply(t, a, r)
      if (x && typeof x === 'object') deepWalk(x, [], adKeys)
      return x
    } catch (e) { return Reflect.apply(t, a, r) }
  }
})

var _fw = window.fetch
window.fetch = function(u, o) {
  var u2 = (typeof u === 'string' ? u : u && u.url) || ''
  if (/\/youtubei\/v1\/(player|browse|search|next|guide|reel_watch_sequence|get_watch|navigation)/.test(u2)) {
    return _fw.apply(this, arguments).then(function(r) {
      try {
        return r.clone().text().then(function(t) {
          try {
            var j = _jp(t)
            if (deepWalk(j, [], adKeys)) r = new Response(JSON.stringify(j), { status: r.status, statusText: r.statusText, headers: r.headers })
          } catch (e) {}
          return r
        }).catch(function() { return r })
      } catch (e) { return r }
    })
  }
  return _fw.apply(this, arguments)
}

var _xo = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function(m, u) { this._yu = u; return _xo.apply(this, arguments) }

var _xs = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.send = function() {
  if (this._yu && /\/youtubei\/v1\//.test(this._yu)) {
    var x = this, ol = x.onload
    x.addEventListener('load', function() {
      try {
        var t = x.responseText
        if (t) {
          var j = _jp(t)
          if (deepWalk(j, [], adKeys)) Object.defineProperty(x, 'responseText', { value: JSON.stringify(j), writable: false })
        }
      } catch (e) {}
      if (ol) ol.call(x)
    })
  }
  return _xs.apply(this, arguments)
}

try {
  if (window.ytInitialPlayerResponse) { deepWalk(window.ytInitialPlayerResponse, [], adKeys); deepWalk(window.ytInitialData, [], adKeys) }
  if (window.ytplayer && window.ytplayer.config) { deepWalk(window.ytplayer.config, [], adKeys) }
  if (window.ytcfg && window.ytcfg.data_) { delete window.ytcfg.data_.PLAYER_ADS }
  if (window.ytads) { window.ytads = undefined }
} catch (e) {}

// ── ad skip via video events ─────────────────────────────────────────────────
function skipAds(v) {
  if (!v || !v.src) return
  if ((v.src.indexOf('ad') > -1 || v.dataset.isAd) && v.duration < 60) {
    v.currentTime = v.duration
    v.pause()
  }
}

var adSkipTimer = null
document.addEventListener('timeupdate', function(e) {
  if (e.target.tagName !== 'VIDEO') return
  if (adSkipTimer) return
  adSkipTimer = setTimeout(function() { adSkipTimer = null; skipAds(e.target) }, 200)
}, true)

// ── MutationObserver: ad skip buttons, overlays, banners ─────────────────────
function handleAdElements() {
  try {
    document.querySelectorAll('.ytp-ad-skip-button,.ytp-ad-skip-button-modern,.ytp-ad-skip-button-slot').forEach(function(s) { s.click() })
    document.querySelectorAll('.ytp-ad-overlay-close-container,.ytp-ad-overlay-close-button,.ytp-ad-overlay-close').forEach(function(o) { o.click() })
    document.querySelectorAll('ytd-popup-container tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer), ytd-modal-with-title-and-button-renderer:has(ytd-mealbar-promo-renderer)').forEach(function(d) { d.remove() })
    document.querySelectorAll('[aria-label="Dismiss"], [aria-label="Close"], [label="Dismiss"], [label="Close"]').forEach(function(b) {
      if (b.offsetParent !== null) b.click()
    })
    document.querySelectorAll('#dismiss-button, ytd-button-renderer#dismiss-button').forEach(function(b) {
      var btn = b.querySelector('button, a')
      if (btn && btn.offsetParent !== null) btn.click()
    })
    document.querySelectorAll('ytd-enforcement-message-view-model, ytd-legal-banner, ytd-get-premium, ytd-premium-label').forEach(function(e) { e.style.display = 'none' })
    var pv = document.querySelector('ytd-player-video')
    if (pv) {
      var adOverlay = pv.querySelector('.ytp-ad-player-overlay')
      if (adOverlay) adOverlay.style.display = 'none'
    }
  } catch (e) {}
}

var adObserver = new MutationObserver(function() { handleAdElements() })
adObserver.observe(document.body, { childList: true, subtree: true })

// Also run periodically but at a low interval (every 3s instead of 500ms)
setInterval(function() { handleAdElements() }, 3000)

// ── CSS hide ad elements (comprehensive) ──────────────────────────────────────
var style = document.createElement('style')
style.textContent = [
  // video player ads
  '.ytp-ad-progress,.ytp-ad-progress-list,.ytp-ad-image-overlay',
  '.ytp-ad-player-overlay,.ytp-ad-overlay-container,.ytp-ad-module',
  '.ytp-ad-badge-overlay,.ytp-ad-survey-player-overlay',
  '.ytp-ad-preview-container,.ytp-ad-text-overlay',
  '.ytp-ad-message-container,.ytp-ad-skip-button-container',
  '.ytp-ad-skip-button,.ytp-ad-skip-button-modern',
  '.ytp-suggested-action-badge',
  '.ytp-ad-skip-button-slot,.ytp-ad-skip-button-container-slot',
  '.ytp-ad-progress-thumb,.ytp-ad-progress-line',
  // feed / sidebar ads
  'ytd-ad-slot-renderer,ytd-video-masthead-ad-advertiser-info-renderer',
  'ytd-in-feed-ad-layout-renderer,ytd-banner-promo-renderer',
  'ytd-promoted-video-renderer,ytd-compact-promoted-video-renderer',
  'ytd-action-companion-ad-renderer,ytd-display-ad-renderer',
  'ytd-statement-banner-renderer',
  '#masthead-ad,#player-ads,#merch-shelf,#promotion-shelf',
  // premium nagging
  'ytd-mealbar-promo-renderer,ytd-get-premium,ytd-premium-label',
  'ytd-enforcement-message-view-model,ytd-legal-banner',
  'ytd-modal-with-title-and-button-renderer:has(ytd-mealbar-promo-renderer)',
  'tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer)',
  'ytd-popup-container:has(ytd-mealbar-promo-renderer)',
  'ytmusic-mealbar-promo-renderer,ytmusic-ad-slot-renderer',
  'ytmusic-banner-promo-renderer,ytmusic-display-ad-renderer',
  '.ytmusic-mealbar-promo,.ytmusic-ad-slot',
  // shorts ads
  'ytd-reel-shelf-renderer:has(ytd-ad-slot-renderer)',
  'ytd-video-renderer:has([data-is-ad])',
  // other
  '#clarify-box,#notification-preference-button',
  'ytd-remarketing-renderer',
  '#consent-bump,.yt-consent-bump,.g-recaptcha',
  '.ytp-ad-progress-bar-container',
  '.ytp-ad-player-overlay-flyout-cta',
  '.ytp-ad-feedback-dialog'
].join(',') + '{display:none!important}'

// Also hide elements that contain ad attributes
style.textContent += '\n[data-is-ad=true],[is-ad=true],[data-ad-id],[data-ad-slot],ytd-ad-slot-renderer,ytd-display-ad-renderer{display:none!important}'

document.documentElement.appendChild(style)

// ── initial video check ──────────────────────────────────────────────────────
setTimeout(checkForNewVideo, 2000)

// ── cleanup on unload ────────────────────────────────────────────────────────
window.addEventListener('beforeunload', function() {
  adObserver.disconnect()
  if (adSkipTimer) clearTimeout(adSkipTimer)
})

function showToast(msg) {
  var t = document.getElementById('_ytd_toast')
  if (!t) {
    t = document.createElement('div')
    t.id = '_ytd_toast'
    t.style.cssText = 'position:fixed;bottom:50%;left:50%;transform:translate(-50%,50%);background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:8px 16px;font-size:13px;color:#fff;z-index:99999;opacity:0;transition:opacity .25s ease;pointer-events:none;font-family:sans-serif'
    document.documentElement.appendChild(t)
  }
  t.textContent = msg
  t.style.opacity = '1'
  setTimeout(function() { t.style.opacity = '0' }, 2000)
}
