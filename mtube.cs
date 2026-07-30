using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

namespace Mtube
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MtubeForm());
        }
    }

    class MtubeForm : Form
    {
        private WebView2 webView;
        private NotifyIcon trayIcon;
        private bool quitting = false;
        private string[] blockedDomains = {
            "doubleclick.net", "googlesyndication.com", "googleadservices.com",
            "googletagservices.com", "googletagmanager.com", "google-analytics.com",
            "g.doubleclick.net", "taboola.com", "outbrain.com",
            "scorecardresearch.com", "criteo.com", "criteo.net",
            "amazon-adsystem.com", "adnxs.com", "adsrvr.org",
            "adservice.google.com", "adserver.yahoo.com", "advertising.com",
            "adzerk.net", "adsafeprotected.com", "moatads.com",
            "sharethrough.com", "indexww.com", "pubmatic.com",
            "openx.net", "rubiconproject.com", "appnexus.com",
            "casalemedia.com", "contextweb.com", "onetag.com",
            "ads.linkedin.com", "ads.facebook.com", "ads.yahoo.com",
            "analytics.yahoo.com", "xiti.com",
            "at.atwola.com", "adserver.adtechus.com", "adserver.adtech.de",
            "ad.doubleclick.net", "adclick.g.doubleclick.net",
            "2mdn.net", "googleads.com"
        };

        private string adBlockerScript = @"
(function(){
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        ytmusic-mealbar-promo-renderer,
        ytmusic-brand-promo-renderer,
        ytmusic-promotion-message-renderer,
        ytd-ad-slot-renderer,
        .ytp-ad-module,
        .ytp-ad-player-overlay,
        .ytp-ad-overlay-container,
        .ytp-ad-image-overlay { display: none !important; }
    `;
    document.head.appendChild(style);
    const pruneAdData = function(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        try {
            const s = JSON.stringify(obj);
            if (s.includes('adPlacements') || s.includes('playerAds') || s.includes('adSlots')) {
                delete obj.adPlacements;
                delete obj.playerAds;
                delete obj.adSlots;
                delete obj.adBreak;
                delete obj.adIsPlaying;
                delete obj.adPlaybackUrl;
                delete obj.adVideoId;
            }
        } catch(e) {}
        return obj;
    };
    const origParse = JSON.parse;
    JSON.parse = function() {
        return pruneAdData(origParse.apply(this, arguments));
    };
    const origFetch = window.fetch;
    window.fetch = function() {
        return origFetch.apply(this, arguments).then(function(r) {
            const clone = r.clone();
            if (clone.headers.get('content-type')?.includes('json')) {
                return clone.json().then(function(data) {
                    pruneAdData(data);
                    return new Response(JSON.stringify(data), { status: r.status, headers: r.headers });
                }).catch(function(){ return r; });
            }
            return r;
        });
    };
    const checkAds = function() {
        const video = document.querySelector('video');
        if (video) {
            const ad = document.querySelector('.ad-showing') || document.querySelector('.ytp-ad-player-overlay');
            if (ad) {
                video.muted = true;
                video.playbackRate = 16.0;
                const skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
                if (skip) skip.click();
            } else if (video.playbackRate > 1) {
                video.muted = false;
                video.playbackRate = 1.0;
            }
        }
        setTimeout(checkAds, 500);
    };
    checkAds();
})();";

        public MtubeForm()
        {
            this.Text = "mtube";
            this.Size = new Size(1200, 800);
            this.StartPosition = FormStartPosition.CenterScreen;
            var appPath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            var appDir = System.IO.Path.GetDirectoryName(appPath);
            var icoPath = System.IO.Path.Combine(appDir, "icon.ico");
            if (System.IO.File.Exists(icoPath))
                this.Icon = new Icon(icoPath);
            this.BackColor = Color.FromArgb(18, 18, 24);
            this.MinimumSize = new Size(400, 300);

            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            webView.BackColor = Color.White;
            var userData = System.IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "mtube"
            );
            webView.CreationProperties = new CoreWebView2CreationProperties
            {
                Language = "en",
                UserDataFolder = userData
            };
            webView.Source = new Uri("https://music.youtube.com");

            webView.CoreWebView2InitializationCompleted += OnWebViewReady;
            webView.NavigationStarting += (s, args) =>
            {
                this.Text = "Loading: " + args.Uri;
            };
            webView.NavigationCompleted += (s, args) =>
            {
                this.Text = args.IsSuccess ? "mtube — YouTube Music" : "mtube — Load failed";
            };
            this.Controls.Add(webView);

            trayIcon = new NotifyIcon();
            trayIcon.Text = "mtube — YouTube Music";
            var trayMenu = new ContextMenuStrip();
            trayMenu.Items.Add("Show", null, (s2, e2) => ShowWindow());
            trayMenu.Items.Add("Quit", null, (s2, e2) => QuitApp());
            trayIcon.ContextMenuStrip = trayMenu;
            if (System.IO.File.Exists(icoPath))
                trayIcon.Icon = new Icon(icoPath);
            trayIcon.Click += (s2, e2) => ShowWindow();

            this.Resize += (s2, e2) =>
            {
                if (this.WindowState == FormWindowState.Minimized)
                {
                    this.Hide();
                    trayIcon.Visible = true;
                }
            };

            this.FormClosing += (s2, e2) =>
            {
                if (!quitting)
                {
                    e2.Cancel = true;
                    this.WindowState = FormWindowState.Minimized;
                    this.Hide();
                    trayIcon.Visible = true;
                }
            };
        }

        private async void OnWebViewReady(object sender, CoreWebView2InitializationCompletedEventArgs e)
        {
            if (!e.IsSuccess)
            {
                var exMsg = "Unknown error";
                if (e.InitializationException != null)
                    exMsg = e.InitializationException.Message;
                ShowError("WebView2 init failed:\n" + exMsg);
                return;
            }

            if (webView.CoreWebView2 == null)
            {
                ShowError("WebView2 core is null after init.");
                return;
            }

            webView.CoreWebView2.Settings.IsScriptEnabled = true;
            webView.CoreWebView2.Settings.AreDefaultScriptDialogsEnabled = false;
            webView.CoreWebView2.Settings.IsPasswordAutosaveEnabled = false;

            webView.CoreWebView2.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            webView.CoreWebView2.WebResourceRequested += (s, args) =>
            {
                try
                {
                    var uri = args.Request.Uri.ToLower();
                    if (blockedDomains.Any(d => uri.Contains(d)))
                    {
                        args.Response = webView.CoreWebView2.Environment.CreateWebResourceResponse(
                            null, 403, "Blocked", null
                        );
                    }
                }
                catch { }
            };

            try
            {
                await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(adBlockerScript);
            }
            catch { }
        }

        private void ShowError(string message)
        {
            var label = new Label();
            label.Text = message;
            label.TextAlign = ContentAlignment.MiddleCenter;
            label.ForeColor = Color.White;
            label.BackColor = Color.FromArgb(32, 33, 36);
            label.Dock = DockStyle.Fill;
            label.Font = new Font("Segoe UI", 12);
            this.Controls.Clear();
            this.Controls.Add(label);
        }

        private void ShowWindow()
        {
            this.Show();
            this.WindowState = FormWindowState.Normal;
            this.BringToFront();
            trayIcon.Visible = false;
        }

        private void QuitApp()
        {
            quitting = true;
            trayIcon.Visible = false;
            Application.Exit();
        }
    }
}
