const { app, BrowserWindow, session, globalShortcut, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const ublockPath = fs.existsSync(path.join(__dirname, 'ublock', 'uBlock0.chromium'))
  ? path.join(__dirname, 'ublock', 'uBlock0.chromium')
  : path.join(process.resourcesPath, 'ublock', 'uBlock0.chromium');

const adDomains = [
  'doubleclick.net','googlesyndication.com','googleadservices.com',
  'google-analytics.com','googletagmanager.com','pagead2.googlesyndication.com',
  '2mdn.net','gstatic.com','tpc.googlesyndication.com',
  'adservice.google.com','adsafeprotected.com','moatads.com','moat.com',
  'adsrvr.org','serving-sys.com','casalemedia.com','rfihub.com','openx.net',
  'pubmatic.com','rubiconproject.com','indexww.com','sonobi.com','appnexus.com',
  'criteo.com','criteo.net','taboola.com','outbrain.com','scorecardresearch.com',
  'exelator.com','demdex.net','bluekai.com','bat.bing.com',
  'adsymptotic.com','adnxs.com','advertising.com','yieldmo.com',
  'sharethrough.com','improvedigital.com','smartadserver.com',
  'adform.net','adzerk.net','media.net','contextweb.com',
  'amazon-adsystem.com','aax.amazon-adsystem.com'
];

let mainWindow;
let tray = null;
let lastMediaCall = 0;

function debouncedMedia(action) {
  var now = Date.now();
  if (now - lastMediaCall < 250) return;
  lastMediaCall = now;
  execMedia(action);
}

function execMedia(action) {
  if (!mainWindow) return;
  var wc = mainWindow.webContents;
  var url = mainWindow.getURL() || '';
  var isMusic = url.indexOf('music') > -1;
  if (action === 'toggle') {
    wc.executeJavaScript(
      isMusic
        ? "document.querySelector('ytmusic-player-bar paper-icon-button[icon*=play]')?.click() || document.querySelector('.play-pause-button')?.click()"
        : "document.querySelector('video')?.paused ? document.querySelector('video')?.play() : document.querySelector('video')?.pause()"
    );
  } else if (action === 'next') {
    wc.executeJavaScript(
      isMusic
        ? "document.querySelector('ytmusic-player-bar paper-icon-button[icon*=skip]')?.click() || document.querySelector('.next-button')?.click()"
        : "document.querySelector('.ytp-next-button')?.click()"
    );
  } else if (action === 'prev') {
    wc.executeJavaScript(
      isMusic
        ? "document.querySelector('ytmusic-player-bar paper-icon-button[icon*=previous]')?.click() || document.querySelector('.previous-button')?.click()"
        : "document.querySelector('.ytp-prev-button')?.click()"
    );
  }
}

app.whenReady().then(async () => {
  var filter = { urls: adDomains.map(function(d) { return '*://*.' + d + '/*' }) };
  session.defaultSession.webRequest.onBeforeRequest(filter, function(d, c) { c({ cancel: true }) });
  try { await session.defaultSession.loadExtension(ublockPath); } catch (e) {}

  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: false,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('browser.html');
  mainWindow.once('ready-to-show', function() { mainWindow.show() });

  mainWindow.on('close', function(e) {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  var icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('YT Desktop');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: function() { mainWindow.show() } },
    { label: 'Play/Pause', click: function() { debouncedMedia('toggle') } },
    { label: 'Next', click: function() { debouncedMedia('next') } },
    { label: 'Previous', click: function() { debouncedMedia('prev') } },
    { type: 'separator' },
    { label: 'Quit', click: function() { app.isQuitting = true; app.quit() } }
  ]));
  tray.on('click', function() { mainWindow.show() });

  globalShortcut.register('MediaPlayPause', function() { debouncedMedia('toggle') });
  globalShortcut.register('MediaNextTrack', function() { debouncedMedia('next') });
  globalShortcut.register('MediaPreviousTrack', function() { debouncedMedia('prev') });
});

ipcMain.handle('minimize-to-tray', function() { mainWindow.hide() });
ipcMain.handle('quit-app', function() { app.isQuitting = true; app.quit() });

app.on('will-quit', function() { globalShortcut.unregisterAll() });
app.on('window-all-closed', function() { if (process.platform !== 'darwin') app.quit() });
