var ipcRenderer
try { ipcRenderer = require('electron').ipcRenderer } catch(e) {}

if (ipcRenderer) {

window.api = {
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  onWindowState: (cb) => { ipcRenderer.on('window-state-changed', (e, v) => cb(v)) }
}

ipcRenderer.on('media-action', function(event, action) {
  var wv = document.querySelector('webview')
  if (!wv) return
  var js = ''
  if (action === 'toggle') {
    js = "(function(){var v=document.querySelector('video');if(v)v.paused?v.play():v.pause()})()"
  } else if (action === 'next') {
    js = "document.querySelector('.ytp-next-button')?.click()"
  } else if (action === 'prev') {
    js = "document.querySelector('.ytp-prev-button')?.click()"
  }
  if (js) wv.executeJavaScript(js)
})

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
  'adSlotRenderer','adSlotRendererViewModel',
  // extra aggressive - catch any new ad renderers
  'masthead','sparkles','promoted','promo','promotion',
  'mealbar','legalBanner','enforcementMessage',
  'bannerPromo','displayAd','actionCompanion',
  'inFeedAd','feedAd','shelfAd','sectionListAd',
  'puzzleAd','quizAd','expandableAd','engagementAd',
  'fullWidthAd','gridAd','heroAd','landscapeAd',
  'mosaicAd','portraitAd','reminderAd','squareAd',
  'verticalAd','watchNextAd','watchNextAds',
  'adInfoDialog','adPreview','adDisclaimer',
  'adSignIn','adSurvey','adChoices',
  'adSelector','adCreative','adMetadata',
  'adPlacement','adPosition','adSection',
  'adSequence','adTiming','adTracking',
  'adVideo','adOverlayModule','adOverlayRenderer',
  'brandInteraction','brandSurvey','brandVideo',
  'ctaOverlay','ctaBanner','ctaButton',
  'invideo','instream','outstream',
  'preRoll','postRoll','midRoll',
  'skippableAd','nonSkippableAd',
  'adVariant','adVersion','adWarning','adZone',
  'hotelAd','flightAd','productAd','shoppingAd',
  'subscriptionAd','trialAd','upsellAd',
  'ypcAd','ypcGetPremium','ypcPurchase',
  'getPremium','premiumLabel','premiumDialog',
  'musicPass','musicAd','musicBanner',
  'reelAd','reelShelfAd','shortsAd'
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

// ── API-level ad blocking (backup plan 2) ────────────────────────────────────
try {
  var _jp = JSON.parse
  var _jpFastPath = /youtube|ytInitial|playerResponse|ytcfg|ytplayer|innertube|music\.youtube/i
  JSON.parse = new Proxy(_jp, {
    apply: function(t, a, r) {
      var s = r && r.length ? String(r[0] || '') : ''
      if (s.length < 100 || s.length > 500000 || !_jpFastPath.test(s)) return Reflect.apply(t, a, r)
      try {
        var x = Reflect.apply(t, a, r)
        if (x && typeof x === 'object') deepWalk(x, [], adKeys)
        return x
      } catch (e) { return Reflect.apply(t, a, r) }
    }
  })
} catch(e) {}

try {
  var _fw = window.fetch
  window.fetch = function(u, o) {
    var u2 = (typeof u === 'string' ? u : u && u.url) || ''
    if (/\/youtubei\/v1\//.test(u2)) {
      return _fw.apply(this, arguments).then(function(r) {
        if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) return r
        var len = parseInt(r.headers.get('content-length') || '0')
        if (len > 500000) return r
        try {
          return r.clone().text().then(function(t) {
            var j = _jp(t)
            if (deepWalk(j, [], adKeys)) return new Response(JSON.stringify(j), { status: r.status, statusText: r.statusText, headers: r.headers })
            return r
          })
        } catch (e) { return r }
      })
    }
    return _fw.apply(this, arguments)
  }
} catch(e) {}

try {
  var _xo = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function(m, u) { this._yu = u; return _xo.apply(this, arguments) }
  var _xs = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.send = function() {
    if (this._yu && /\/youtubei\/v1\//.test(this._yu)) {
      var x = this, ol = x.onload
      var handler = function() {
        try {
          var ct = x.getResponseHeader('content-type') || ''
          if (!/json/.test(ct)) return
          var t = x.responseText
          if (t && t.length > 100 && t.length < 500000) {
            var j = _jp(t)
            if (deepWalk(j, [], adKeys)) Object.defineProperty(x, 'responseText', { value: JSON.stringify(j), writable: false })
          }
        } catch (e) {}
        if (ol) ol.call(x)
      }
      if (x._ytAdHandler) { x.removeEventListener('load', x._ytAdHandler) }
      x._ytAdHandler = handler
      x.addEventListener('load', handler)
    }
    return _xs.apply(this, arguments)
  }
} catch(e) {}

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

// ── aggressive ad removal ────────────────────────────────────────────────────
function handleAdElements() {
  try {
    // skip buttons
    document.querySelectorAll('.ytp-ad-skip-button,.ytp-ad-skip-button-modern,.ytp-ad-skip-button-slot,.ytp-ad-skip-button-container').forEach(function(s) { s.click() })
    // overlay close
    document.querySelectorAll('.ytp-ad-overlay-close-container,.ytp-ad-overlay-close-button,.ytp-ad-overlay-close,.ytp-ad-overlay-close-button').forEach(function(o) { o.click() })
    // dialogs / popups
    document.querySelectorAll('ytd-popup-container tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer), ytd-modal-with-title-and-button-renderer:has(ytd-mealbar-promo-renderer), tp-yt-paper-dialog:has(ytd-ad-slot-renderer), ytd-popup-container:has(ytd-get-premium)').forEach(function(d) { d.remove() })
    // dismiss buttons
    document.querySelectorAll('[aria-label="Dismiss"], [aria-label="Close"], [label="Dismiss"], [label="Close"], [aria-label="Remove"], button[aria-label*="ad"], button[aria-label*="Ad"]').forEach(function(b) {
      if (b.offsetParent !== null) b.click()
    })
    document.querySelectorAll('#dismiss-button, ytd-button-renderer#dismiss-button, #close-button').forEach(function(b) {
      var btn = b.querySelector('button, a')
      if (btn && btn.offsetParent !== null) btn.click()
    })
    // enforcement / premium nagging
    document.querySelectorAll('ytd-enforcement-message-view-model, ytd-legal-banner, ytd-get-premium, ytd-premium-label, ytd-premium-upsell, ytd-unlimited-premium-upsell, ytmusic-mealbar-promo-renderer').forEach(function(e) { e.style.display = 'none' })
    // masthead removal
    var masthead = document.querySelector('#masthead-ad, ytd-masthead-ad, [masthead-ad]')
    if (masthead) { masthead.style.display = 'none'; masthead.remove() }
    // rich section ads (feed)
    document.querySelectorAll('ytd-rich-section-renderer:has(ytd-ad-slot-renderer), ytd-rich-item-renderer:has([is-ad]), ytd-rich-item-renderer:has([data-is-ad]), ytd-shelf-renderer:has(ytd-ad-slot-renderer)').forEach(function(e) { e.remove() })
    // player ad overlay
    var pv = document.querySelector('ytd-player-video, #movie_player')
    if (pv) {
      var adOverlay = pv.querySelector('.ytp-ad-player-overlay, .ytp-ad-overlay-container')
      if (adOverlay) adOverlay.style.display = 'none'
    }
    // video elements marked as ads
    document.querySelectorAll('ytd-video-renderer[is-ad], ytd-compact-video-renderer[is-ad], ytd-search-result-renderer[is-ad]').forEach(function(e) { e.style.display = 'none' })
    // merchant shelf
    document.querySelectorAll('#merch-shelf, #promotion-shelf, #offer-shelf').forEach(function(e) { e.style.display = 'none' })
    // ad badges on thumbnails
    document.querySelectorAll('.ytd-badge-supported-ad, .badge-style-type-ad, [aria-label*="Ad"]').forEach(function(e) { e.style.display = 'none' })
  } catch (e) {}
}

// Run immediately and then observe
handleAdElements()
setTimeout(handleAdElements, 100)
setTimeout(handleAdElements, 500)

var _adObsTimer = null
var adObserver = new MutationObserver(function() {
  if (_adObsTimer) return
  _adObsTimer = setTimeout(function() { _adObsTimer = null; handleAdElements() }, 200)
})
adObserver.observe(document.body, { childList: true, subtree: true })

setInterval(function() { handleAdElements() }, 2000)

// ── CSS hide ad elements (backup plan 3) ─────────────────────────────────────
try {
  var adStyle = document.createElement('style')
  adStyle.textContent = [
    '.ytp-ad-progress,.ytp-ad-progress-list,.ytp-ad-image-overlay',
    '.ytp-ad-player-overlay,.ytp-ad-overlay-container,.ytp-ad-module',
    '.ytp-ad-badge-overlay,.ytp-ad-survey-player-overlay',
    '.ytp-ad-preview-container,.ytp-ad-text-overlay',
    '.ytp-ad-message-container,.ytp-ad-skip-button-container',
    '.ytp-ad-skip-button,.ytp-ad-skip-button-modern',
    '.ytp-suggested-action-badge',
    '.ytp-ad-skip-button-slot,.ytp-ad-skip-button-container-slot',
    '.ytp-ad-progress-thumb,.ytp-ad-progress-line',
    '.ytp-suggested-action,.ytp-suggested-action-badge-with-controls',
    '#masthead-ad,#masthead-ad-container',
    'ytd-masthead-ad,[masthead-ad],div[id^=masthead]',
    'ytd-ad-slot-renderer,ytd-video-masthead-ad-advertiser-info-renderer',
    'ytd-in-feed-ad-layout-renderer,ytd-banner-promo-renderer',
    'ytd-promoted-video-renderer,ytd-compact-promoted-video-renderer',
    'ytd-action-companion-ad-renderer,ytd-display-ad-renderer',
    'ytd-statement-banner-renderer',
    'ytd-ad-slot-renderer,ytd-in-feed-ad-layout-renderer',
    'ytd-video-masthead-ad,[layout$=ad],ytd-ad-slot',
    'ytd-rich-section-renderer:has(ytd-ad-slot-renderer)',
    'ytd-rich-item-renderer:has([is-ad])',
    'ytd-rich-item-renderer:has([data-is-ad])',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    'ytd-rich-item-renderer:has(.ytd-ad-slot-renderer)',
    'ytd-rich-shelf-renderer:has(ytd-ad-slot-renderer)',
    'ytd-shelf-renderer:has(ytd-ad-slot-renderer)',
    '#merch-shelf,#promotion-shelf,#offer-shelf',
    '#player-ads,#player-message',
    'ytd-mealbar-promo-renderer,ytd-get-premium,ytd-premium-label',
    'ytd-enforcement-message-view-model,ytd-legal-banner',
    'ytd-modal-with-title-and-button-renderer:has(ytd-mealbar-promo-renderer)',
    'tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer)',
    'ytd-popup-container:has(ytd-mealbar-promo-renderer)',
    'ytd-unlimited-premium-upsell,ytd-premium-upsell',
    'ytmusic-mealbar-promo-renderer,ytmusic-ad-slot-renderer',
    'ytmusic-banner-promo-renderer,ytmusic-display-ad-renderer',
    'ytmusic-pivot-bar-renderer:has(ytmusic-ad-slot-renderer)',
    '.ytmusic-mealbar-promo,.ytmusic-ad-slot',
    'ytmusic-ad-slot,[is-music-ad]',
    'ytd-reel-shelf-renderer:has(ytd-ad-slot-renderer)',
    'ytd-reel-video-renderer:has([data-is-ad])',
    'ytd-shorts-ad,ytd-reel-ad',
    'ytd-video-renderer:has([data-is-ad])',
    'ytd-video-renderer:has(ytd-ad-slot-renderer)',
    'ytd-video-renderer[is-ad],ytd-compact-video-renderer[is-ad]',
    'ytd-search-result-renderer:has(ytd-ad-slot-renderer)',
    'ytd-search-result-renderer[is-ad]',
    'ytd-compact-video-renderer:has(ytd-ad-slot-renderer)',
    'ytd-channel-renderer:has(ytd-ad-slot-renderer)',
    'ytd-channel-video-player-renderer:has(ytd-ad-slot-renderer)',
    'ytd-comment-dialog-renderer:has(ytd-ad-slot-renderer)',
    '#clarify-box,#notification-preference-button',
    'ytd-remarketing-renderer',
    'ytmusic-pivot-bar-renderer[ad-active],ytmusic-pivot-bar-renderer:has(ytmusic-ad-slot-renderer)',
    'ytmusic-responsive-list-item-renderer[is-ad],ytmusic-responsive-list-item-renderer:has(ytmusic-ad-slot-renderer)',
    'ytmusic-two-row-item-renderer[is-ad],ytmusic-two-row-item-renderer:has([aria-label*="Sponsored"])',
    'ytmusic-section-list-renderer > ytmusic-shelf-renderer:has(ytmusic-ad-slot-renderer)',
    'ytmusic-description-shelf-renderer:has(ytmusic-ad-slot-renderer)',
    'ytmusic-mealbar-promo-renderer,ytmusic-upsell-dialog-renderer',
    'ytmusic-prompt-banner-renderer,ytmusic-legal-banner',
    '#consent-bump,.yt-consent-bump,.g-recaptcha',
    '.ytp-ad-progress-bar-container',
    '.ytp-ad-player-overlay-flyout-cta',
    '.ytp-ad-feedback-dialog',
    '.ytp-ad-skip-button-container,.ytp-ad-skip-button-modern',
    '.ytp-ad-survey,.ytp-ad-survey-container',
    '[data-is-ad],[is-ad],[data-ad],[ad-data]'
  ].join(',') + '{display:none!important}'
  adStyle.textContent += '\n[data-is-ad=true],[is-ad=true],[data-ad-id],[data-ad-slot],[data-ad-type]{display:none!important}'
  adStyle.textContent += '\n#page-manager > ytd-browse[page-subtype=home] #contents.ytd-rich-grid-renderer > ytd-rich-section-renderer:first-child{display:none!important}'
  document.documentElement.appendChild(adStyle)
} catch(e) {}

// ── initial video check ──────────────────────────────────────────────────────
setTimeout(checkForNewVideo, 500)

// ── cleanup on unload ────────────────────────────────────────────────────────

// ── initial video check ──────────────────────────────────────────────────────
setTimeout(checkForNewVideo, 500)

// ── cleanup on unload ────────────────────────────────────────────────────────
window.addEventListener('beforeunload', function() {
  adObserver.disconnect()
  if (adSkipTimer) clearTimeout(adSkipTimer)
})

var _toastEl = null
function showToast(msg) {
  if (!_toastEl) {
    _toastEl = document.createElement('div')
    _toastEl.id = '_ytd_toast'
    _toastEl.style.cssText = 'position:fixed;bottom:50%;left:50%;transform:translate(-50%,50%);background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:8px 16px;font-size:13px;color:#fff;z-index:99999;opacity:0;transition:opacity .2s;pointer-events:none;font-family:sans-serif'
    document.documentElement.appendChild(_toastEl)
  }
  _toastEl.textContent = msg
  _toastEl.style.opacity = '1'
  setTimeout(function() { _toastEl.style.opacity = '0' }, 2000)
}
