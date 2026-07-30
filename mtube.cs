using System;
using System.Drawing;
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
        private Label loadingLabel;
        private bool quitting = false;

        private string[] blockedDomains = {
            "doubleclick.net",
            "googlesyndication.com"
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
        .ytp-ad-player-overlay { display: none !important; }
    `;
    document.head.appendChild(style);
    const pruneAdData = function(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        try {
            if (obj.adPlacements) delete obj.adPlacements;
            if (obj.playerAds) delete obj.playerAds;
            if (obj.adSlots) delete obj.adSlots;
        } catch(e) {}
        return obj;
    };
    var origParse = JSON.parse;
    JSON.parse = function() {
        return pruneAdData(origParse.apply(this, arguments));
    };
    var checkAds = function() {
        var video = document.querySelector('video');
        if (video) {
            var ad = document.querySelector('.ad-showing') || document.querySelector('.ytp-ad-player-overlay');
            if (ad) {
                video.muted = true;
                video.playbackRate = 16.0;
                var skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
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
            this.BackColor = Color.FromArgb(18, 18, 24);
            this.MinimumSize = new Size(400, 300);

            var appPath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            var appDir = System.IO.Path.GetDirectoryName(appPath);
            var icoPath = System.IO.Path.Combine(appDir, "icon.ico");
            if (System.IO.File.Exists(icoPath))
                this.Icon = new Icon(icoPath);

            loadingLabel = new Label();
            loadingLabel.Text = "mtube\nLoading...";
            loadingLabel.ForeColor = Color.FromArgb(180, 180, 180);
            loadingLabel.BackColor = Color.FromArgb(18, 18, 24);
            loadingLabel.Dock = DockStyle.Fill;
            loadingLabel.TextAlign = ContentAlignment.MiddleCenter;
            loadingLabel.Font = new Font("Segoe UI", 20, FontStyle.Regular);
            loadingLabel.AutoSize = false;
            this.Controls.Add(loadingLabel);

            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            webView.Visible = false;
            var userData = System.IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "mtube"
            );
            webView.CreationProperties = new CoreWebView2CreationProperties
            {
                Language = "en",
                UserDataFolder = userData
            };
            webView.CoreWebView2InitializationCompleted += OnWebViewReady;
            webView.NavigationCompleted += OnNavigationCompleted;
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
                ShowError("WebView2 failed:\n" + exMsg);
                return;
            }

            if (webView.CoreWebView2 == null)
            {
                ShowError("WebView2 core is null");
                return;
            }

            loadingLabel.Text = "mtube\nInitializing...";

            webView.CoreWebView2.Settings.IsScriptEnabled = true;
            webView.CoreWebView2.Settings.AreDefaultScriptDialogsEnabled = false;
            webView.CoreWebView2.Settings.IsPasswordAutosaveEnabled = false;

            webView.CoreWebView2.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            webView.CoreWebView2.WebResourceRequested += (s, args) =>
            {
                try
                {
                    var uri = args.Request.Uri.ToLower();
                    foreach (var domain in blockedDomains)
                    {
                        if (uri.Contains(domain))
                        {
                            args.Response = webView.CoreWebView2.Environment.CreateWebResourceResponse(
                                null, 403, "Blocked", null
                            );
                            break;
                        }
                    }
                }
                catch { }
            };

            try
            {
                await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(adBlockerScript);
            }
            catch { }

            loadingLabel.Text = "mtube\nLoading YouTube Music...";
            webView.Visible = true;
            webView.CoreWebView2.Navigate("https://music.youtube.com");
        }

        private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (e.IsSuccess)
            {
                loadingLabel.Visible = false;
                this.Text = "mtube — YouTube Music";
            }
            else
            {
                loadingLabel.Text = "mtube\nConnection issue.\nClick to retry.";
                loadingLabel.Click += (s, args) =>
                {
                    loadingLabel.Text = "mtube\nRetrying...";
                    loadingLabel.Click -= null;
                    if (webView.CoreWebView2 != null)
                        webView.CoreWebView2.Navigate("https://music.youtube.com");
                };
            }
        }

        private void ShowError(string message)
        {
            loadingLabel.Text = message;
            loadingLabel.Font = new Font("Segoe UI", 12);
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
