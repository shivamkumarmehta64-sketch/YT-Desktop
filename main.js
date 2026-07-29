const { app, BrowserWindow, session, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

const ublockPath = fs.existsSync(path.join(__dirname, '..', 'ublock', 'uBlock0.chromium'))
  ? path.join(__dirname, '..', 'ublock', 'uBlock0.chromium')
  : path.join(process.resourcesPath, 'uBlock0.chromium');

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

app.whenReady().then(async () => {
  const filter = { urls: adDomains.map(d => '*://*.' + d + '/*') };
  session.defaultSession.webRequest.onBeforeRequest(filter, (d, c) => c({ cancel: true }));
  try { await session.defaultSession.loadExtension(ublockPath); } catch (e) {}
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false
    }
  });
  win.loadURL('https://youtube.com');
  globalShortcut.register('MediaPlayPause', () => win.webContents.executeJavaScript(
    "document.querySelector('video')?.paused ? document.querySelector('video')?.play() : document.querySelector('video')?.pause()"
  ));
  globalShortcut.register('MediaNextTrack', () => win.webContents.executeJavaScript(
    "document.querySelector('.ytp-next-button')?.click()"
  ));
});
app.on('will-quit', () => globalShortcut.unregisterAll());
