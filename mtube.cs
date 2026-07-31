using System;
using System.Drawing;
using System.IO;
using System.Runtime;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Mtube
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
        private WebView2 webView;
        private NotifyIcon trayIcon;
        private System.Windows.Forms.Timer sleepTimer;
        private System.Windows.Forms.Timer gcTimer;
        private Label statusLabel;
        private bool audioOnlyMode = false;
        private bool webViewReady = false;
        private string logPath;

        [DllImport("user32.dll")]
        private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
        [DllImport("user32.dll")]
        private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        private const int WM_HOTKEY = 0x0312;
        private const uint VK_MEDIA_PLAY_PAUSE = 0xB3;
        private const uint VK_MEDIA_NEXT_TRACK  = 0xB0;
        private const uint VK_MEDIA_PREV_TRACK  = 0xB1;

        public MainForm()
        {
            logPath = Path.Combine(
                Path.GetDirectoryName(Application.ExecutablePath), "debug.log");
            Log("=== mtube v3 starting ===");

            this.Text = "YouTube Music";
            this.Width = 1280;
            this.Height = 800;
            this.BackColor = Color.Black;
            this.MinimumSize = new Size(800, 600);

            string iconPath = Path.Combine(Application.StartupPath, "icon.ico");
            if (File.Exists(iconPath))
                this.Icon = new Icon(iconPath);

            // Loading label
            statusLabel = new Label();
            statusLabel.Text = "Loading YouTube Music...";
            statusLabel.ForeColor = Color.FromArgb(180, 180, 180);
            statusLabel.BackColor = Color.Black;
            statusLabel.Font = new Font("Segoe UI", 14f, FontStyle.Regular);
            statusLabel.AutoSize = false;
            statusLabel.TextAlign = ContentAlignment.MiddleCenter;
            statusLabel.Dock = DockStyle.Fill;
            this.Controls.Add(statusLabel);

            SetupTray();
            SetupTimers();
            InitializeWebView();
        }

        private void Log(string msg)
        {
            try { File.AppendAllText(logPath, "[" + DateTime.Now.ToString("HH:mm:ss") + "] " + msg + "\n"); }
            catch { }
        }

        // ─── Timers: GC every 60s ────────────────────────────────────────────────

        private void SetupTimers()
        {
            // Sleep timer
            sleepTimer = new System.Windows.Forms.Timer();
            sleepTimer.Tick += OnSleepTimerTick;

            // GC trim every 60 seconds to keep RAM low
            gcTimer = new System.Windows.Forms.Timer();
            gcTimer.Interval = 60000;
            gcTimer.Tick += (s, e) =>
            {
                GCSettings.LargeObjectHeapCompactionMode = GCLargeObjectHeapCompactionMode.CompactOnce;
                GC.Collect(2, GCCollectionMode.Optimized, false);
                GC.WaitForPendingFinalizers();
            };
            gcTimer.Start();
        }

        // ─── WebView2 Initialization ──────────────────────────────────────────────

        private async void InitializeWebView()
        {
            Log("InitializeWebView: start");
            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            webView.Visible = false;
            this.Controls.Add(webView);

            try
            {
                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "mtube-webview2");

                Log("UserDataFolder: " + userDataFolder);
                statusLabel.Text = "Initializing browser engine...";

                // ── MEMORY OPTIMIZATION: limit browser RAM via launch args ────────
                // These flags tell Chromium (WebView2) to use less memory
                var options = new CoreWebView2EnvironmentOptions(
                    "--disk-cache-size=33554432 " +       // 32 MB disk cache
                    "--media-cache-size=33554432 " +      // 32 MB media cache
                    "--renderer-process-limit=1 " +       // max 1 renderer process
                    "--disable-extensions " +             // no extensions overhead
                    "--disable-background-networking " +  // less background traffic
                    "--no-first-run " +                   // skip first-run setup
                    "--disable-sync " +                   // no Chrome account sync
                    "--disable-translate " +              // no translate UI
                    "--js-flags=--max-old-space-size=128" // JS heap limit: 128 MB
                );

                CoreWebView2Environment env =
                    await CoreWebView2Environment.CreateAsync(null, userDataFolder, options);

                Log("Environment created");
                await webView.EnsureCoreWebView2Async(env);
                Log("WebView2 ready");

                // Grant notification permission silently
                webView.CoreWebView2.PermissionRequested += (s, e) =>
                {
                    if (e.PermissionKind == CoreWebView2PermissionKind.Notifications)
                        e.State = CoreWebView2PermissionState.Allow;
                };

                // Suspend WebView2 (release RAM) when window is minimized or hidden
                this.Resize += (s, e) =>
                {
                    if (this.WindowState == FormWindowState.Minimized)
                    {
                        webView.CoreWebView2.TrySuspendAsync();
                        GC.Collect(2, GCCollectionMode.Optimized, false);
                    }
                    else
                    {
                        webView.CoreWebView2.Resume();
                    }
                };

                // Inject ad-block JS before page loads
                await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(GetAdBlockerJS());
                Log("JS injected");

                // Network-level ad domain blocking
                SetupNetworkBlocking();
                Log("Network blocking set");

                webView.CoreWebView2.Navigate("https://music.youtube.com");
                Log("Navigation started");

                webView.Visible = true;
                statusLabel.Visible = false;
                webView.BringToFront();
                webViewReady = true;

                SetupHotkeys();
                Log("Ready");
            }
            catch (Exception ex)
            {
                Log("FATAL: " + ex.ToString());
                statusLabel.Text = "Error: " + ex.Message +
                    "\n\nSee debug.log next to mtube.exe";
                statusLabel.ForeColor = Color.FromArgb(255, 80, 80);
            }
        }

        // ─── Layer 1: Network Ad Blocking ────────────────────────────────────────

        private void SetupNetworkBlocking()
        {
            string[] adDomains = {
                "doubleclick.net", "googlesyndication.com", "googleadservices.com",
                "2mdn.net", "moatads.com", "adnxs.com", "advertising.com",
                "taboola.com", "outbrain.com", "scorecardresearch.com",
                "hotjar.com", "mixpanel.com", "bat.bing.com", "demdex.net",
                "bluekai.com", "criteo.com", "adsrvr.org", "pubmatic.com",
                "rubiconproject.com", "openx.net", "amazon-adsystem.com",
                "connect.facebook.net", "an.facebook.com", "google-analytics.com",
                "adservice.google.com", "adservice.google.co.in",
                "googleads.g.doubleclick.net", "pubads.g.doubleclick.net"
            };

            foreach (string domain in adDomains)
            {
                webView.CoreWebView2.AddWebResourceRequestedFilter(
                    "*" + domain + "*", CoreWebView2WebResourceContext.All);
            }

            webView.CoreWebView2.WebResourceRequested += (s, e) =>
            {
                try
                {
                    e.Response = webView.CoreWebView2.Environment.CreateWebResourceResponse(
                        new MemoryStream(new byte[0]), 200, "OK", "Content-Type: text/plain");
                }
                catch { }
            };
        }

        // ─── Layer 2 + 3 + SponsorBlock + Audio-Only ─────────────────────────────

        private string GetAdBlockerJS()
        {
            return @"
(function() {
    'use strict';

    var adKeys = [
        'adPlacements','adSlots','playerAds','adBreak','adBreakHeartbeatParams',
        'promotedSparklesWebRenderer','promotedVideoRenderer',
        'compactPromotedVideoRenderer','compactPromotedItemRenderer',
        'backgroundPromoRenderer','statementBannerRenderer',
        'brandVideoShelfRenderer','inlineAdLayoutRenderer','adSlotRenderer',
        'adBreakParams','playerAdParams','adTagUrl','adTagUrls',
        'companionAd','instreamVideoAd','overlayAd','promotedUrl',
        'searchPyvRenderer','actionCompanionAdRenderer','displayAdRenderer',
        'videoMastheadAdRenderer','mastheadAdRenderer','mastheadAd',
        'midrolls','prerolls','postrolls',
        'adIsActive','adIsPlaying','adIsPaused','adIsSkippable',
        'adType','adMode','adFormat','adSource','adNetwork',
        'cumulativeAds','adCount','totalAds','remainingAds',
        'masthead','sparkles','promoted','promo','promotion',
        'mealbar','legalBanner','enforcementMessage',
        'bannerPromo','displayAd','actionCompanion','inFeedAd'
    ];

    function stripAdKeys(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        try {
            var keys = Object.keys(obj);
            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                if (adKeys.indexOf(k) !== -1) { delete obj[k]; }
                else if (obj[k] && typeof obj[k] === 'object') { stripAdKeys(obj[k]); }
            }
        } catch(e) {}
        return obj;
    }

    var _origParse = JSON.parse;
    JSON.parse = function() {
        try { return stripAdKeys(_origParse.apply(this, arguments)); }
        catch(e) { return _origParse.apply(this, arguments); }
    };

    var style = document.createElement('style');
    style.innerHTML = [
        'ytmusic-mealbar-promo-renderer,ytmusic-brand-promo-renderer,',
        'ytmusic-promotion-message-renderer,ytmusic-statement-banner-renderer,',
        'ytd-ad-slot-renderer,ytd-in-feed-ad-layout-renderer,',
        'ytd-banner-promo-renderer,ytd-statement-banner-renderer,',
        'ytd-display-ad-renderer,.ytp-ad-module,.ytp-ad-player-overlay,',
        '.ytp-ad-image-overlay,.ytp-ad-text-overlay,.ytp-ce-element,',
        '.ytp-suggested-action,#masthead-ad',
        '{display:none!important}'
    ].join('');
    document.head.appendChild(style);

    function checkAds() {
        try {
            var video = document.querySelector('video');
            if (video) {
                var ad = document.querySelector('.ad-showing') ||
                         document.querySelector('.ytp-ad-player-overlay');
                if (ad) {
                    video.muted = true;
                    video.playbackRate = 16.0;
                    var skip = document.querySelector('.ytp-ad-skip-button') ||
                               document.querySelector('.ytp-ad-skip-button-modern');
                    if (skip) skip.click();
                } else if (video.playbackRate === 16.0) {
                    video.playbackRate = 1.0;
                    video.muted = false;
                }
            }
        } catch(e) {}
        setTimeout(checkAds, 500);
    }
    checkAds();

    try {
        new MutationObserver(function() {
            try {
                var els = document.querySelectorAll(
                    'ytmusic-mealbar-promo-renderer,ytd-ad-slot-renderer,.ytp-ad-module');
                for (var i = 0; i < els.length; i++) els[i].style.display = 'none';
            } catch(e) {}
        }).observe(document.documentElement, {childList:true, subtree:true});
    } catch(e) {}

    var sponsorCache = {};
    function skipSponsors(videoId) {
        if (!videoId || sponsorCache[videoId]) return;
        sponsorCache[videoId] = true;
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET',
                'https://sponsor.ajay.app/api/skipSegments?videoID=' + videoId +
                '&categories[]=sponsor&categories[]=selfpromo&categories[]=intro&categories[]=outro');
            xhr.onload = function() {
                try {
                    var segs = _origParse(xhr.responseText);
                    if (!segs || !segs.length) return;
                    sponsorCache[videoId] = segs;
                    var video = document.querySelector('video');
                    if (!video) return;
                    video.addEventListener('timeupdate', function() {
                        for (var i = 0; i < segs.length; i++) {
                            var s = segs[i];
                            if (s.segment && s.segment.length === 2 &&
                                video.currentTime >= s.segment[0] &&
                                video.currentTime < s.segment[1]) {
                                video.currentTime = s.segment[1];
                            }
                        }
                    });
                } catch(e) {}
            };
            xhr.send();
        } catch(e) {}
    }

    function detectVideoId() {
        try {
            var m = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
            if (m) skipSponsors(m[1]);
        } catch(e) {}
    }
    var _origPush = history.pushState;
    history.pushState = function() { _origPush.apply(this, arguments); setTimeout(detectVideoId, 1500); };
    window.addEventListener('popstate', function() { setTimeout(detectVideoId, 1500); });
    setTimeout(detectVideoId, 3000);

    window._mtube_toggleAudioOnly = function(enable) {
        var el = document.getElementById('mtube-audio-only');
        if (enable) {
            if (!el) {
                var s = document.createElement('style');
                s.id = 'mtube-audio-only';
                s.innerHTML = 'video{display:none!important}';
                document.head.appendChild(s);
            }
        } else { if (el) el.parentNode.removeChild(el); }
    };
})();
true;
";
        }

        // ─── System Tray — Zero popups ────────────────────────────────────────────

        private void SetupTray()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Text = "YouTube Music";

            string iconPath = Path.Combine(Application.StartupPath, "icon.ico");
            if (File.Exists(iconPath))
                trayIcon.Icon = new Icon(iconPath);

            var menu = new ContextMenuStrip();
            menu.Items.Add("Show YouTube Music", null, (s, e) => ShowMainWindow());
            menu.Items.Add(new ToolStripSeparator());

            var audioItem = new ToolStripMenuItem("Audio-Only Mode");
            audioItem.CheckOnClick = true;
            audioItem.Click += (s, e) => ToggleAudioOnly(audioItem.Checked);
            menu.Items.Add(audioItem);

            var sleepItem = new ToolStripMenuItem("Sleep Timer");
            sleepItem.DropDownItems.Add("15 minutes", null, (s, e) => SetSleepTimer(15));
            sleepItem.DropDownItems.Add("30 minutes", null, (s, e) => SetSleepTimer(30));
            sleepItem.DropDownItems.Add("60 minutes", null, (s, e) => SetSleepTimer(60));
            sleepItem.DropDownItems.Add("90 minutes", null, (s, e) => SetSleepTimer(90));
            sleepItem.DropDownItems.Add(new ToolStripSeparator());
            sleepItem.DropDownItems.Add("Cancel", null, (s, e) => sleepTimer.Stop());
            menu.Items.Add(sleepItem);

            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Quit", null, (s, e) =>
            {
                trayIcon.Visible = false;
                Application.Exit();
            });

            trayIcon.ContextMenuStrip = menu;
            trayIcon.Visible = true;

            // Left double-click = restore. Right-click = context menu. No popups ever.
            trayIcon.MouseDoubleClick += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                    ShowMainWindow();
            };
        }

        private void OnSleepTimerTick(object sender, EventArgs e)
        {
            sleepTimer.Stop();
            if (webViewReady)
                ExecJS("(function(){var v=document.querySelector('video');if(v)v.pause();})()");
        }

        private void SetSleepTimer(int minutes)
        {
            sleepTimer.Stop();
            sleepTimer.Interval = minutes * 60 * 1000;
            sleepTimer.Start();
        }

        private void ToggleAudioOnly(bool enable)
        {
            audioOnlyMode = enable;
            if (webViewReady)
                ExecJS("window._mtube_toggleAudioOnly(" + (enable ? "true" : "false") + ")");
        }

        private void ShowMainWindow()
        {
            this.Show();
            this.WindowState = FormWindowState.Normal;
            this.Activate();
        }

        // ─── Media Keys ───────────────────────────────────────────────────────────

        private void SetupHotkeys()
        {
            RegisterHotKey(this.Handle, 1, 0, VK_MEDIA_PLAY_PAUSE);
            RegisterHotKey(this.Handle, 2, 0, VK_MEDIA_NEXT_TRACK);
            RegisterHotKey(this.Handle, 3, 0, VK_MEDIA_PREV_TRACK);
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_HOTKEY && webViewReady)
            {
                switch (m.WParam.ToInt32())
                {
                    case 1:
                        ExecJS("(function(){var v=document.querySelector('video');if(v){if(v.paused)v.play();else v.pause();}})()");
                        break;
                    case 2:
                        ExecJS("(function(){var b=document.querySelector('.next-button');if(b)b.click();})()");
                        break;
                    case 3:
                        ExecJS("(function(){var b=document.querySelector('.previous-button');if(b)b.click();})()");
                        break;
                }
            }
            base.WndProc(ref m);
        }

        private void ExecJS(string script)
        {
            try { webView.CoreWebView2.ExecuteScriptAsync(script); }
            catch { }
        }

        // ─── Form Lifecycle ───────────────────────────────────────────────────────

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                // Minimize to tray — zero popup, zero balloon tip, zero notification
                e.Cancel = true;
                this.Hide();

                // Suspend WebView2 to free RAM while in tray
                if (webViewReady)
                {
                    webView.CoreWebView2.TrySuspendAsync();
                    GC.Collect(2, GCCollectionMode.Optimized, false);
                }
            }
            else
            {
                base.OnFormClosing(e);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                try { UnregisterHotKey(this.Handle, 1); } catch { }
                try { UnregisterHotKey(this.Handle, 2); } catch { }
                try { UnregisterHotKey(this.Handle, 3); } catch { }
                if (trayIcon   != null) { trayIcon.Visible = false; trayIcon.Dispose(); }
                if (sleepTimer != null) sleepTimer.Dispose();
                if (gcTimer    != null) gcTimer.Dispose();
                if (webView    != null) webView.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
