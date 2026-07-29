const { ipcRenderer } = require('electron')

window.api = {
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  quitApp: () => ipcRenderer.invoke('quit-app')
}

// ── ad blocking ──────────────────────────────────────────────────────────────
var adKeys = 'adPlacements,adSlots,playerAds,adBreakHeartbeatParams,frameworkUpdates,auxiliaryUi.messageRenderers.upsellDialogRenderer,promotedSparklesWebRenderer,promotedVideoRenderer,compactPromotedVideoRenderer,compactPromotedItemRenderer,backgroundPromoRenderer,statementBannerRenderer,brandVideoShelfRenderer,inlineAdLayoutRenderer,adSlotRenderer,adBreak,adBreakParams,adBreakHeartbeatParams,adPlacementId,adSlotId,adVideoId,playerAdParams,adParams,adTagUrl,adTagUrls,companionAd,instreamVideoAd,overlayAd,promotedUrl,promotedSparklesTextRenderer,promotedSparklesVideosRenderer,searchPyvRenderer,actionCompanionAdRenderer,displayAdRenderer,videoMastheadAdRenderer,mastheadAdRenderer,mastheadAd'
var pk = adKeys.split(',')

function dn(o, p) {
  var k = p.split('.'), c = o
  for (var i = 0; i < k.length - 1; i++) {
    if (!c || typeof c !== 'object') return false
    c = c[k[i]]
  }
  if (c && typeof c === 'object') {
    var l = k[k.length - 1]
    if (l in c) { delete c[l]; return true }
  }
  return false
}

function pr(o) {
  if (!o || typeof o !== 'object') return false
  var p = false
  for (var i = 0; i < pk.length; i++) { if (dn(o, pk[i])) p = true }
  return p
}

var _jp = JSON.parse
JSON.parse = new Proxy(_jp, {
  apply: function(t, a, r) {
    var x = Reflect.apply(t, a, r)
    try { if (x && typeof x === 'object') pr(x) } catch (e) {}
    return x
  }
})

var _fw = window.fetch
window.fetch = function(u, o) {
  var u2 = (typeof u === 'string' ? u : u && u.url) || ''
  if (/\/youtubei\/v1\//.test(u2)) {
    return _fw.apply(this, arguments).then(function(r) {
      try {
        return r.clone().text().then(function(t) {
          try {
            var j = _jp(t)
            if (pr(j)) r = new Response(JSON.stringify(j), { status: r.status, statusText: r.statusText, headers: r.headers })
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
          if (pr(j)) Object.defineProperty(x, 'responseText', { value: JSON.stringify(j), writable: false })
        }
      } catch (e) {}
      if (ol) ol.call(x)
    })
  }
  return _xs.apply(this, arguments)
}

try {
  if (window.ytInitialPlayerResponse) { pr(window.ytInitialPlayerResponse); pr(window.ytInitialData) }
  if (window.ytplayer) { pr(window.ytplayer.config) }
  if (window.ytcfg) { delete window.ytcfg.data_.PLAYER_ADS }
  if (window.ytads) { delete window.ytads }
} catch (e) {}

// ── ad skip via events (NO polling) ──────────────────────────────────────────
function skipAds(v) {
  if (!v || !v.src) return
  if (v.src.includes('ad') && v.duration < 60) { v.currentTime = v.duration; v.pause() }
}

var adSkipTimer = null
document.addEventListener('timeupdate', function(e) {
  if (e.target.tagName !== 'VIDEO') return
  if (adSkipTimer) return
  adSkipTimer = setTimeout(function() {
    adSkipTimer = null
    skipAds(e.target)
  }, 200)
}, true)

var adObserver = new MutationObserver(function() {
  var s = document.querySelector('.ytp-ad-skip-button,.ytp-ad-skip-button-modern')
  if (s) s.click()
  var o = document.querySelector('.ytp-ad-overlay-close-container')
  if (o) o.click()
})
adObserver.observe(document.body, { childList: true, subtree: true })

// ── CSS hide ad elements ─────────────────────────────────────────────────────
var style = document.createElement('style')
style.textContent = '.ytp-ad-progress,.ytp-ad-progress-list,.ytp-ad-image-overlay,.ytp-ad-skip-button-container,.ytp-ad-message-container,.ytp-ad-player-overlay,.ytp-ad-overlay-container,ytd-ad-slot-renderer,ytd-video-masthead-ad-advertiser-info-renderer,ytd-in-feed-ad-layout-renderer,ytd-banner-promo-renderer,ytd-promoted-video-renderer,ytd-compact-promoted-video-renderer,ytd-action-companion-ad-renderer,ytd-display-ad-renderer,ytd-statement-banner-renderer,#masthead-ad,#player-ads,#merch-shelf,#promotion-shelf,.ytp-suggested-action-badge,.ytp-ad-survey-player-overlay,.ytp-ad-preview-container,.ytp-ad-text-overlay,.ytp-ad-module,.ytp-ad-badge-overlay,.ytp-ad-skip-button,.ytp-ad-skip-button-modern{display:none!important}ytmusic-mealbar-promo-renderer,ytmusic-ad-slot-renderer,ytmusic-banner-promo-renderer,ytmusic-display-ad-renderer,.ytmusic-mealbar-promo,.ytmusic-ad-slot{display:none!important}'
document.documentElement.appendChild(style)

// ── cleanup on page unload ───────────────────────────────────────────────────
window.addEventListener('beforeunload', function() {
  adObserver.disconnect()
  if (adSkipTimer) clearTimeout(adSkipTimer)
})
