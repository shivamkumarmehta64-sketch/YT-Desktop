const { app, BrowserWindow, session, globalShortcut, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

const adDomains = [
  'doubleclick.net','googlesyndication.com','googleadservices.com',
  'google-analytics.com','googletagmanager.com','pagead2.googlesyndication.com',
  '2mdn.net','gstatic.com','tpc.googlesyndication.com',
  'adservice.google.com','adsafeprotected.com','moatads.com','moat.com',
  'adsrvr.org','serving-sys.com','casalemedia.com','rfihub.com','openx.net',
  'pubmatic.com','rubiconproject.com','indexww.com','criteo.com','criteo.net',
  'taboola.com','outbrain.com','scorecardresearch.com',
  'exelator.com','adnxs.com','advertising.com','yieldmo.com',
  'sharethrough.com','improvedigital.com','smartadserver.com',
  'adform.net','adzerk.net','media.net','contextweb.com',
  'amazon-adsystem.com','aax.amazon-adsystem.com',
  'sonobi.com','appnexus.com','bluekai.com','demdex.net',
  'adsymptotic.com','bat.bing.com',
  // tracking / analytics
  'pixel.quantserve.com','pixel.rubiconproject.com','pixel.moat.com',
  'pixel.adsafeprotected.com','tracking.adsrvr.org','bttrack.com',
  'adserver.adtech.de','lon-ads.adapt.tv','ad-apac.doubleclick.net',
  'ad-uk.doubleclick.net','ad.doubleclick.net','ad-g.doubleclick.net',
  'cm.g.doubleclick.net','pubads.g.doubleclick.net',
  'securepubads.g.doubleclick.net','tpc.googlesyndication.com',
  'adclick.g.doubleclick.net','pagead.l.doubleclick.net',
  'partner.googleadservices.com','www.googleadservices.com',
  'stats.g.doubleclick.net','adservice.google.co.in',
  'adservice.google.co.uk','adservice.google.de',
  'adservice.google.fr','adservice.google.ca',
  'adservice.google.com.au','adservice.google.co.jp',
  'adservice.google.es','adservice.google.it',
  'adservice.google.nl','adservice.google.com.br',
  'adservice.google.com.mx','adservice.google.ru',
  'www.googletagservices.com','partneradss.dl.google.com',
  'googleads.g.doubleclick.net','marketingplatform.google.com',
  'analytics.google.com','region1.google-analytics.com',
  'ssl.google-analytics.com','www.google-analytics.com',
  'stats.g.doubleclick.net','adservice.google.com',
  'googletagmanager.com','gtm.js','googlesyndication.com',
  // facebook / meta
  'facebook.com/tr/','connect.facebook.net','pixel.facebook.com',
  'an.facebook.com','staticxx.facebook.com','www.facebook.com/plugins',
  'fbcdn.net','fbsbx.com','atdmt.com',
  // amazon
  'amazon-adsystem.com','aax.amazon-adsystem.com',
  'rcm.amazon.com','rcm-na.amazon-adsystem.com','ws-na.amazon-adsystem.com',
  'ir-na.amazon-adsystem.com','z-na.amazon-adsystem.com',
  // microsoft / bing
  'bat.bing.com','c.bing.com','flex.msn.com','ads.msn.com',
  'ads1.msn.com','rad.msn.com','a.ads2.msn.com','a.ads2.msads.net',
  'ads2.msads.net','adnxs.com','ib.adnxs.com',
  'secure.adnxs.com','fls.doubleclick.net',
  // twitter / x
  'ads.twitter.com','analytics.twitter.com','t.co/',
  'static.ads-twitter.com','www.googleadservices.com',
  // youtube specific tracking
  'youtube.com/api/stats/ads','youtube.com/pagead/',
  'youtube.com/get_midroll_info','youtube.com/api/stats/',
  'youtubei.googleapis.com','i.ytimg.com/vi/',
  // sponsor / affiliate
  'refp.co','skimresources.com','skimlinks.com',
  'impactradius.com','postaffiliatepro.com',
  'shareasale.com','commissionjunction.com',
  'linksynergy.com','clickserve.cc-dt.com',
  'awin1.com','clickbooth.com','convertkit.com',
  // general ad networks
  'adzerk.net','engine.adzerk.net','e.ads.s3tm.com',
  'adserver.yahoo.com','ads.yahoo.com','analytics.yahoo.com',
  'sp.analytics.yahoo.com','adtech.de','adtechus.com',
  'adadvisor.net','bluekai.com','demdex.net',
  'adsymptotic.com','adobedc.net','adobetm.com',
  '2o7.net','omtrdc.net','everesttech.net',
  'everestjs.net','rk.com','sharethis.com',
  'addthis.com','addthisedge.com','adbrite.com',
  'adify.com','adition.com','adk2.com','adlane.com',
  'adlegend.com','adjug.com','adiquity.com',
  'adblade.com','aggregateknowledge.com',
  'agkn.com','akamai.net','amung.us','apmebf.com',
  'atwola.com','bidswitch.net','blueconic.net',
  'boomtrain.com','branch.io','brtstats.com',
  'bttrack.com','cdn.optimizely.com','chango.com',
  'charbeat.com','click.aol.com','clicktale.net',
  'clmbtech.com','collect.igodigital.com',
  'comscore.com','scorecardresearch.com',
  'contextweb.com','conversantmedia.com','crashlytics.com',
  'c3tag.com','d3pkae9owd2lcf.cloudfront.net',
  'dataxu.com','dmdatastudio.com','dmtry.com',
  'dotomi.com','dstillery.com','dt00.net',
  'dwin1.com','effectivemeasure.net','emxdgt.com',
  'engageio.com','exelator.com','exitjunction.com',
  'experian.com','exponential.com','eyeota.net',
  'fifty.io','flash.d3pkae9owd2lcf.cloudfront.net',
  'fls.doubleclick.net','flurry.com','fontdeck.com',
  'forensiq.com','fortawesome.com','freewheel.tv',
  'fresh8.co','gfk.com','gigya.com','gssprt.jp',
  'gumgum.com','harrenmedianetwork.com','hitslink.com',
  'hotjar.com','hubspot.com','ignitad.com','ijedash.com',
  'imrworldwide.com','inmobi.com','innovid.com',
  'insightexpressai.com','intentiq.com','ipredictive.com',
  'js.adsrvr.net','js.agkn.com','jwpltx.com','kantar.com',
  'kissmetrics.com','klaviyo.com','krxd.net','l9gw.com',
  'leadtail.com','lencr.org','liadm.com','liveramp.com',
  'load.s3.amazonaws.com','lotame.com','ltassrv.com',
  'madisonlogic.com','maxmind.com','mb.moatads.com',
  'media6degrees.com','mediapulse.com','mediav.com',
  'meetrics.de','microsoft-analyics.com',
  'microstrategy.com','mint.com','mixpanel.com',
  'ml314.com','mookie1.com','mrshNKr.com','mtrcs.s3.amazonaws.com',
  'myvisualiq.net','narrative.io','nativeads.com',
  'netapplications.com','netmng.com','newrelic.com',
  'nielsen-online.com','nielsen.com','nkredible.com',
  'nr-data.net','nuviadynamics.com','o12cloud.com',
  'odc.impact-ad.com','ogury.co','omma.com',
  'omniture.com','onetag.com','openx.net','optnmnstr.com',
  'orangeclickmedia.com','orbitsoft.com','outbrain.com',
  'outbrain.org','ow.ly','owneriq.com','p.adx.io',
  'p.rfihub.com','parse.com','parsely.com','pathmotion.com',
  'peer39.com','permutive.com','petametrics.com',
  'photoranking.com','pinterest.com/ads','pippio.com',
  'pixel.sitescout.com','pixiv.net','placed.com',
  'platform.twitter.com/ads','po.st','pointroll.com',
  'polldaddy.com','popads.net','popunder.net',
  'prebid.org','proclivitymedia.com','proxilinks.com',
  'ps.eyeota.net','pubmatic.com','pulpix.com',
  'purpleads.io','pusher.com','quantserve.com',
  'quantummetric.com','queryly.com','quisma.com',
  'quora.com/ads','r.brand-display.com',
  'r.casalemedia.com','r10.io','radar.cedexis.com',
  'radiusmarketing.com','rambler.ru','ratings.io',
  'recreativ.ru','redditstatic.com/ads',
  'relestar.com','remintrex.com','reson8.com',
  'revcontent.com','revjet.com','rfihub.com',
  'rlcdn.com','rnkrst.com','roku.com/ads',
  'rsz.skype.com','rubiconproject.com',
  's.adx.io','s.amazon-adsystem.com',
  's.btstatic.com','s.casalemedia.com','s.clickability.com',
  's.innovid.com','s.moatads.com','s.pubmine.com',
  's3.amazonaws.com/ads','sail-personalize.com',
  'sailthru.com','salesforce.com/ads',
  'scorecardresearch.com','script.io','scripted.com',
  'scripts.chitika.net','scrubtheweb.com','sdrv.net',
  'search.spotxchange.com','sekindo.com','sellpoints.com',
  'servedbyadbutler.com','servedby.flashtalking.com',
  'serving-sys.com','shareaholic.com','shareasale.com',
  'sharethrough.com','shbm.com','simpli.fi',
  'simply.com','sitescout.com','skimlinks.com',
  'skimresources.com','sliderocket.com','smartadserver.com',
  'smartclip.net','smartlook.com','smct.io',
  'snapads.com','snapchat.com/ads','snigelweb.com',
  'sociomantic.com','sokrati.com','sonobi.com',
  'sortable.com','specificmedia.net','sptag.com',
  'spx2.com','ssl.akamai.com','ssl.google-analytics.com',
  'ssl.p.jwpcdn.com','stackadapt.com','statcounter.com',
  'static.addtoany.com','static.chartbeat.com',
  'static.criteo.net','static.olark.com',
  'static.queue-it.net','steelhouse.com','stickyadstv.com',
  'stormiq.com','stripehook.com','stumbleupon.com',
  'sumo.com','sumologic.com','survicate.com',
  'swiftype.com','taboola.com','tacoda.net',
  'tag.crsspxl.com','tagmanager.google.com',
  'tail.dpm.dm.origin.dmkt-sp.jp','tailsweep.com',
  'tapad.com','targeting.api.cnn.com','tawk.to',
  'teads.tv','technorati.com','telaria.com',
  'test.fakeref.com','thetradedesk.com','thinkrealtime.com',
  'threatmetrix.com','thrivehive.com','tint.com',
  'tlvs.s3.amazonaws.com','tnk.net','togglemedia.com',
  'tollfreeforwarding.com','toolbarqueries.google.com',
  'top.mail.ru','torbit.com','touchcommerce.com',
  'track.anchor.fm','track.clickalgo.com','tracker.dashthis.com',
  'tracker.marinsm.com','tracking.blogactiv.eu',
  'tracking.cuelinks.com','tracking.customer.io',
  'tracking.epicgames.com','tracking.factormedia.com',
  'tracking.hubspot.com','tracking.ignitad.com',
  'tracking.indieclick.com','tracking.intelliad.de',
  'tracking.io','tracking.kissmetrics.com',
  'tracking.liverail.com','tracking.olx.com',
  'tracking.opencandy.com','tracking.provenpixel.com',
  'tracking.qualityunit.com','tracking.seomator.com',
  'tracking.strikeads.com','tracking.taboola.com',
  'tracking.trutap.com','tracking.veoxa.com',
  'tracking.wheelof.com','tracking.yieldlab.de',
  'tracking.yoins.com','trafficfactory.biz',
  'trafficjunky.net','trafficstars.com','traffiliate.com',
  'tremorhub.com','trendcounter.com','tribalfusion.com',
  'trk.buzzlogic.com','trk.reddit.com','trk.watch',
  'tru.am','trustx.org','tube8.com','turn.com',
  'tvsquared.com','twitchadbot.tv','typekit.com',
  'ubermedia.com','udmserve.net','ugdturner.com',
  'ultra.one','umeng.com','ump.mn','underdogmedia.com',
  'unica.com','unlockmedia.com','us.creative-serving.com',
  'us.emediate.com','us.e-planning.net','us.intellitxt.com',
  'us.yieldmanager.com','usenetreview.com','userecho.com',
  'userplane.com','usersonic.com','uservoice.com',
  'veoxa.com','veremedia.com','verticalacuity.com',
  'vervewireless.com','vibrantmedia.com','videointelligence.com',
  'videologygroup.com','viewbix.com','viewpoint.com',
  'visibli.com','visualwebsiteoptimizer.com',
  'vivads.net','vizu.com','vlix.com','voicefive.com',
  'vrtcal.com','vungle.com','w55c.net','w3.org',
  'warlogic.com','warnermedia.com','watchanalytics.com',
  'wdfl.co','webtrends.com','webtrendslive.com',
  'wetter.com','whatcounts.com','whiskeymedia.com',
  'wholesale-dns.com','widgetserver.com',
  'wikia-ads.com','wildfireapp.com','wiredminds.de',
  'wishabi.com','wishabi.net','wiyw.com',
  'wowanalytics.co.uk','wpm.neustar.biz',
  'x.bidswitch.net','xad.com','xaxis.com','xertiv.com',
  'xg4ken.com','yahoo.nexage.com','yap.yahoo.com',
  'ybx.io','ydrct.com','yellowblue.io','yesads.com',
  'yieldbot.com','yieldbuild.com','yieldify.com',
  'yieldlab.net','yieldlove.com','yieldmo.com',
  'yieldnexus.com','yieldoptimizer.com','yieldr.com',
  'yieldtraffic.com','yimg.com','yns.io','yoggrt.com',
  'yotpo.com','youknowbest.com','z5x.net','z6x.net',
  'z7x.net','z8x.net','z9x.net','zango.com','zapadomain.com',
  'zarget.com','zendesk.com','zeotap.com','zested.com',
  'zillow.com/ads','zmedia.com','zones.com','zoom.us',
  'zqtk.net','zrca.net','zscore.com','zumobi.com',
  'zwoop.com','zym.com','glyphic.com',
  // google tag services
  'snap.licdn.com','ads.linkedin.com','www.linkedin.com/analytics',
  'pippio.com','adsymptotic.com','adhaven.com',
  'ad-cloud.com','adserverpub.com','adsafeprotected.com',
  'bidsxchange.com','brand-display.com','cleament.com',
  'contextweb.com','converstand.com','effectivemeasure.com',
  'exoclick.com','fuelx.com','gpultra.com','gsicommon.com',
  'hemnet.com','inlocomedia.com','insticator.com',
  'liftoff.io','maxbounty.com','mobilefuse.net',
  'nativeads.com','onaudience.com','optmnstr.com',
  'orangeclickmedia.com','ownermq.com','pepperjam.com',
  'performancerevenue.com','playbuzz.com','plista.com',
  'popcash.net','popmyads.com','projectwonderful.com',
  'prosperent.com','proxilinks.com','pubgears.com',
  'pulsepoint.com','readpeak.com','redditmedia.com',
  'responseiq.com','revenuehits.com','rubicproject.com',
  'smaato.com','spoutable.com','spreadshirt.com',
  'streamrail.com','stripe.com','summitmedia.com',
  'svn.com','tapjoy.com','tattomedia.com',
  'thoughtleadr.com','tornadoads.com','traffichaus.com',
  'traveladvertising.com','tremorvideo.com','trionad.com',
  'vsrv2.com','walkme.com','weborama.fr',
  'wpadmngr.com','xandr.com','ybrantdigital.com',
  'yoc.com','zypmedia.com'
].filter(Boolean)

let mainWindow
let tray = null
let lastMediaCall = 0

function debouncedMedia(action) {
  var now = Date.now()
  if (now - lastMediaCall < 250) return
  lastMediaCall = now
  execMedia(action)
}

function execMedia(action) {
  if (!mainWindow) return
  mainWindow.webContents.send('media-action', action)
}

app.whenReady().then(async () => {
  var filter = { urls: adDomains.filter(function(d) { return d && d.length > 0 }).map(function(d) { return '*://*.' + d + '/*' }) }
  filter.urls.push('*://*.doubleclick.net/*', '*://*.googlesyndication.com/*', '*://*.googleadservices.com/*')
  session.defaultSession.webRequest.onBeforeRequest(filter, function(d, c) { c({ cancel: true }) })

  session.defaultSession.webRequest.onBeforeRequest({
    urls: ['*://*.youtube.com/api/stats/ads*', '*://*.youtube.com/pagead/*', '*://*.youtube.com/get_midroll_info*']
  }, function(d, c) { c({ cancel: true }) })

  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    frame: false,
    autoHideMenuBar: true,
    show: true,
    backgroundColor: '#08080e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: false,
      nodeIntegration: false,
      backgroundThrottling: true
    }
  })

  mainWindow.loadFile('browser.html')

  mainWindow.on('close', function(e) {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); mainWindow.webContents.executeJavaScript("showToast('Minimized to tray. Right-click tray icon to Quit.')") }
  })

  app.setAppUserModelId('com.ytdesktop.app')
  var trayIcon = nativeImage.createFromPath(path.join(__dirname, 'build', 'tray.png'))
  if (trayIcon.isEmpty()) trayIcon = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png'))
  if (trayIcon.isEmpty()) trayIcon = nativeImage.createEmpty()
  tray = new Tray(trayIcon)
  tray.setToolTip('YT Desktop')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: function() { mainWindow.show(); mainWindow.focus() } },
    { label: 'Play/Pause', click: function() { debouncedMedia('toggle') } },
    { label: 'Next', click: function() { debouncedMedia('next') } },
    { label: 'Previous', click: function() { debouncedMedia('prev') } },
    { type: 'separator' },
    { label: 'Quit', click: function() { app.isQuitting = true; app.quit() } }
  ]))
  tray.on('click', function() { mainWindow.show(); mainWindow.focus() })

  globalShortcut.register('MediaPlayPause', function() { debouncedMedia('toggle') })
  globalShortcut.register('MediaNextTrack', function() { debouncedMedia('next') })
  globalShortcut.register('MediaPreviousTrack', function() { debouncedMedia('prev') })
})

ipcMain.handle('minimize-to-tray', function() { mainWindow.hide() })
ipcMain.handle('quit-app', function() { app.isQuitting = true; app.quit() })
ipcMain.handle('window-minimize', function() { mainWindow.minimize() })
ipcMain.handle('window-maximize', function() { if (mainWindow.isMaximized()) { mainWindow.unmaximize() } else { mainWindow.maximize() } })
ipcMain.handle('window-close', function() { mainWindow.close() })
ipcMain.handle('window-is-maximized', function() { return mainWindow.isMaximized() })

mainWindow.on('maximize', function() { mainWindow.webContents.send('window-state-changed', true) })
mainWindow.on('unmaximize', function() { mainWindow.webContents.send('window-state-changed', false) })

app.on('will-quit', function() { globalShortcut.unregisterAll() })
app.on('window-all-closed', function() { if (process.platform !== 'darwin') app.quit() })
