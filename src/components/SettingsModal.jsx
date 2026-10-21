import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Palette,
  Key,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Rss,
  Plus,
  Trash2,
  Link,
  Copy,
  Check,
  BookOpen,
  Library,
  FileDown
} from 'lucide-react';

const THEMES = [
  { id: 'theme-nord', name: 'Nord Dark', color: '#2e3440', accent: '#88c0d0' },
  { id: 'theme-nord-light', name: 'Nord Light', color: '#eceff4', accent: '#5e81ac' },
  { id: 'theme-material-dark', name: 'Material Dark', color: '#101418', accent: '#9ecaff' },
  { id: 'theme-material-light', name: 'Material Light', color: '#f8f9ff', accent: '#0061A4' },
  { id: 'theme-sepia', name: 'Warm Sepia', color: '#fbf0d9', accent: '#944d18' },
  { id: 'theme-oled', name: 'OLED Black', color: '#000000', accent: '#3b82f6' },
  { id: 'theme-dracula', name: 'Dracula', color: '#282a36', accent: '#ff79c6' },
  { id: 'theme-sunset', name: 'Sunset Purple', color: '#1a1528', accent: '#f97316' },
  { id: 'theme-solarized', name: 'Solarized Dark', color: '#00212b', accent: '#268bd2' }
];

export default function SettingsModal({
  isOpen,
  onClose,
  defaultTab = 'google',
  currentTheme,
  onSelectTheme,
  googleStatus,
  onConnectGoogle,
  onSaveManualToken,
  onSaveCredentials,
  onLogoutGoogle,
  apiBase = '/api',
  passwordToken = '',
  onRefreshLibrary,
  onRefreshArticles,
  totalBooks = 0,
  totalArticles = 0,
  totalNotes = 0,
  articleCounts = {}
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // RSS Feeds state
  const [feeds, setFeeds] = useState([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [addingFeed, setAddingFeed] = useState(false);
  const [syncingFeeds, setSyncingFeeds] = useState(false);
  const [feedError, setFeedError] = useState('');
  const [feedMessage, setFeedMessage] = useState('');

  // Webhook & Bookmarklet copy states
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  // Export options
  const [articleExportScope, setArticleExportScope] = useState('all');

  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (passwordToken) {
      headers['Authorization'] = `Bearer ${passwordToken}`;
    }
    return headers;
  };

  const fetchFeeds = async () => {
    try {
      const res = await fetch(`${apiBase}/feeds`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFeeds(data);
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      fetchFeeds();
    }
  }, [isOpen, defaultTab]);

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    await onSaveCredentials({ clientId, clientSecret, apiKey });
    setStatusMessage('OAuth configuration saved!');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleSaveToken = async (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await onSaveManualToken(manualToken.trim(), '', apiKey.trim());
    setStatusMessage('Access token saved and authenticated!');
    setManualToken('');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleAddFeed = async (e) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;
    setAddingFeed(true);
    setFeedError('');
    setFeedMessage('');

    try {
      const res = await fetch(`${apiBase}/feeds`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url: newFeedUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add feed');
      setFeeds(prev => [...prev.filter(f => f.id !== data.id), data]);
      setNewFeedUrl('');
      setFeedMessage(`Subscribed to "${data.title}"`);
    } catch (err) {
      setFeedError(err.message);
    } finally {
      setAddingFeed(false);
    }
  };

  const handleDeleteFeed = async (id) => {
    try {
      await fetch(`${apiBase}/feeds/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      setFeeds(prev => prev.filter(f => f.id !== id));
    } catch {}
  };

  const handleSyncFeeds = async () => {
    setSyncingFeeds(true);
    setFeedError('');
    setFeedMessage('');
    try {
      const res = await fetch(`${apiBase}/feeds/sync`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setFeedMessage(`Synced! Stashed ${data.imported || 0} new article(s).`);
        fetchFeeds();
        onRefreshArticles?.();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err) {
      setFeedError(err.message);
    } finally {
      setSyncingFeeds(false);
    }
  };

  // Webhook URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const tokenQuery = passwordToken ? `&token=${encodeURIComponent(passwordToken)}` : '';
  const webhookUrl = `${origin}${apiBase}/inbox?url=PAGE_URL${tokenQuery}`;
  const bookmarkletCode = `javascript:(function(){var u='${origin}${apiBase}/inbox?bookmarklet=true${tokenQuery}&url='+encodeURIComponent(location.href);window.open(u,'_blank','width=450,height=280');})();`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2000);
  };

  // Export Actions
  const handleExportBooksJson = () => {
    const authParam = passwordToken ? `?token=${encodeURIComponent(passwordToken)}` : '';
    window.location.href = `${apiBase}/export/books${authParam}`;
  };

  const handleExportNotesJson = () => {
    const authParam = passwordToken ? `?token=${encodeURIComponent(passwordToken)}` : '';
    window.location.href = `${apiBase}/export/notes${authParam}`;
  };

  const handleExportArticles = (format) => {
    const params = new URLSearchParams();
    if (passwordToken) params.set('token', passwordToken);
    if (articleExportScope !== 'all') params.set('filter', articleExportScope);

    const qs = params.toString() ? `?${params.toString()}` : '';
    if (format === 'epub') {
      window.location.href = `${apiBase}/export/epub${qs}`;
    } else if (format === 'html') {
      window.location.href = `${apiBase}/export/html${qs}`;
    } else if (format === 'json') {
      window.location.href = `${apiBase}/export/articles${qs}`;
    }
  };

  const handleImportBooksFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const books = Array.isArray(parsed) ? parsed : parsed.books;
      if (!Array.isArray(books)) {
        alert('Invalid JSON file format: expected array of books');
        return;
      }

      const res = await fetch(`${apiBase}/import/books`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ books })
      });

      if (res.ok) {
        alert('Library books imported successfully!');
        onRefreshLibrary?.();
        onClose();
      } else {
        alert('Import failed');
      }
    } catch (err) {
      alert('Error parsing JSON file: ' + err.message);
    }
  };

  const handleImportArticlesFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const articles = Array.isArray(parsed) ? parsed : parsed.articles;
      if (!Array.isArray(articles)) {
        alert('Invalid JSON file format: expected array of articles');
        return;
      }

      const res = await fetch(`${apiBase}/import/articles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ articles })
      });

      if (res.ok) {
        alert('Articles imported successfully!');
        onRefreshArticles?.();
        onClose();
      } else {
        alert('Import failed');
      }
    } catch (err) {
      alert('Error parsing JSON file: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-surface-container border border-outline rounded-2xl shadow-2xl overflow-hidden text-on-surface">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-primary flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-on-surface">Settings</h2>
              <p className="text-xs text-on-surface-variant">Theme, Google Play Books, RSS feeds, and data exports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 bg-surface/60 border-b border-outline text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'theme'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Appearance</span>
          </button>

          <button
            onClick={() => setActiveTab('google')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'google'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Google Play Books</span>
          </button>

          <button
            onClick={() => setActiveTab('feeds')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'feeds'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            <span>RSS Feeds</span>
          </button>

          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'webhook'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Web Ingest</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'data'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup & Export</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* TAB: APPEARANCE */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-on-surface mb-1">Color Palette</h3>
                <p className="text-xs text-on-surface-variant">
                  Select a theme that will apply across your library and reading views.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEMES.map((theme) => {
                  const isSelected = currentTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => onSelectTheme(theme.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30 bg-surface-container-high shadow-xs'
                          : 'border-outline hover:border-outline/80 bg-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full shrink-0 shadow-xs flex items-center justify-center border border-white/20"
                        style={{ backgroundColor: theme.color }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: theme.accent }}
                        />
                      </div>
                      <span className="text-xs font-medium text-on-surface truncate">
                        {theme.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: GOOGLE PLAY BOOKS */}
          {activeTab === 'google' && (
            <div className="space-y-5">
              {/* Connection Status Box */}
              <div className="p-4 rounded-xl bg-surface border border-outline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    googleStatus?.authenticated ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {googleStatus?.authenticated ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface">
                      {googleStatus?.authenticated ? 'Connected to Google Play Books' : 'Google Account Not Connected'}
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      {googleStatus?.authenticated
                        ? (googleStatus.userProfile?.email || 'Authenticated and syncing')
                        : 'Connect with Google to sync your purchased books and reading shelves.'}
                    </p>
                  </div>
                </div>

                <div>
                  {googleStatus?.authenticated ? (
                    <button
                      onClick={onLogoutGoogle}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  ) : (
                    <button
                      onClick={onConnectGoogle}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                    >
                      <span>Connect Google</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Access Token Box */}
              <div className="p-4 rounded-xl bg-surface border border-outline space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-on-surface mb-0.5">Quick Access Token</h4>
                  <p className="text-[11px] text-on-surface-variant">
                    If you don't have OAuth credentials configured, you can paste a Google OAuth Access Token directly.
                  </p>
                </div>

                <form onSubmit={handleSaveToken} className="space-y-3">
                  <input
                    type="password"
                    placeholder="Paste ya29.... token"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface-container border border-outline text-on-surface placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Save Token
                  </button>
                </form>
              </div>

              {/* OAuth Credentials Form */}
              <div className="p-4 rounded-xl bg-surface border border-outline space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-on-surface mb-0.5">Google Cloud OAuth 2.0 Credentials</h4>
                  <p className="text-[11px] text-on-surface-variant">
                    Provide Client ID & Secret from Google Cloud Console to enable 1-click web login for any user.
                  </p>
                </div>

                <form onSubmit={handleSaveCredentials} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                      Client ID
                    </label>
                    <input
                      type="text"
                      placeholder="xxxx.apps.googleusercontent.com"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-surface-container border border-outline text-on-surface focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      placeholder="GOCSPX-xxxx"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-surface-container border border-outline text-on-surface focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container-high border border-outline hover:bg-surface-container text-on-surface transition-colors cursor-pointer"
                  >
                    Save Credentials
                  </button>
                </form>
              </div>

              {statusMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  {statusMessage}
                </div>
              )}
            </div>
          )}

          {/* TAB: RSS FEEDS */}
          {activeTab === 'feeds' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-on-surface mb-0.5">RSS & Atom Feed Stasher</h3>
                  <p className="text-xs text-on-surface-variant">
                    Auto-stash new articles from blogs and newsletters directly into your unread queue.
                  </p>
                </div>
                <button
                  onClick={handleSyncFeeds}
                  disabled={syncingFeeds}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingFeeds ? 'animate-spin' : ''}`} />
                  <span>Sync Feeds Now</span>
                </button>
              </div>

              {/* Add Feed Input */}
              <form onSubmit={handleAddFeed} className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/feed.xml"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface border border-outline text-on-surface placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={addingFeed}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-container-high border border-outline hover:bg-surface-container text-on-surface transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Feed</span>
                </button>
              </form>

              {feedMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  {feedMessage}
                </div>
              )}
              {feedError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {feedError}
                </div>
              )}

              {/* Feeds List */}
              <div className="space-y-2">
                {feeds.length === 0 ? (
                  <div className="text-center py-8 text-xs text-on-surface-variant border border-dashed border-outline rounded-xl">
                    No RSS feeds subscribed yet. Add a feed URL above.
                  </div>
                ) : (
                  feeds.map((feed) => (
                    <div
                      key={feed.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-xs text-on-surface truncate">
                          {feed.title || feed.url}
                        </div>
                        <div className="text-[10px] text-on-surface-variant truncate">
                          {feed.url}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFeed(feed.id)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove feed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: WEB INGEST */}
          {activeTab === 'webhook' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-on-surface mb-0.5">Automated Web Ingest & Bookmarklet</h3>
                <p className="text-xs text-on-surface-variant">
                  Instantly save articles into your unread stash from browser bookmarks, Apple Shortcuts, or automated webhooks.
                </p>
              </div>

              {/* Bookmarklet */}
              <div className="p-4 rounded-xl bg-surface border border-outline space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-on-surface">Browser Bookmarklet</h4>
                  <button
                    onClick={copyBookmarklet}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-container border border-outline hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    {copiedBookmarklet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBookmarklet ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Create a new bookmark in Chrome, Safari, or Firefox and paste this JavaScript snippet as the URL. Clicking it while reading any web page will stash it in Pure Books with 1-click.
                </p>
                <pre className="p-2.5 rounded-lg bg-surface-container border border-outline text-[10px] font-mono overflow-x-auto text-primary">
                  {bookmarkletCode}
                </pre>
              </div>

              {/* Webhook Endpoint */}
              <div className="p-4 rounded-xl bg-surface border border-outline space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-on-surface">HTTP Webhook Endpoint</h4>
                  <button
                    onClick={copyWebhook}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-container border border-outline hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Send a <code className="px-1 py-0.5 rounded bg-surface-container font-mono">POST /api/inbox</code> with JSON <code className="px-1 py-0.5 rounded bg-surface-container font-mono">{`{"url": "https://..."}`}</code> to save an article remotely.
                </p>
                <pre className="p-2.5 rounded-lg bg-surface-container border border-outline text-[10px] font-mono overflow-x-auto text-primary">
                  {webhookUrl}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: BACKUP & EXPORT */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              
              {/* Articles Export Section */}
              <div className="p-4 rounded-xl bg-surface border border-outline space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-semibold text-on-surface">Export Reading Stash ({totalArticles} articles)</h4>
                  </div>
                  <select
                    value={articleExportScope}
                    onChange={(e) => setArticleExportScope(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg bg-surface-container border border-outline text-on-surface cursor-pointer"
                  >
                    <option value="all">All Articles ({articleCounts.all || totalArticles})</option>
                    <option value="unread">Unread Only ({articleCounts.unread || 0})</option>
                    <option value="starred">Starred Only ({articleCounts.starred || 0})</option>
                    <option value="archive">Archive Only ({articleCounts.archive || 0})</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleExportArticles('epub')}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>EPUB 3 eBook</span>
                  </button>
                  <button
                    onClick={() => handleExportArticles('html')}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-container border border-outline text-on-surface hover:bg-surface-container-high text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Offline HTML</span>
                  </button>
                  <button
                    onClick={() => handleExportArticles('json')}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-container border border-outline text-on-surface hover:bg-surface-container-high text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Articles JSON</span>
                  </button>
                </div>
              </div>

              {/* Books Export Section */}
              <div className="p-4 rounded-xl bg-surface border border-outline space-y-3">
                <div className="flex items-center gap-2">
                  <Library className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-on-surface">Export Books Library ({totalBooks} books)</h4>
                </div>
                <button
                  onClick={handleExportBooksJson}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container border border-outline text-on-surface hover:bg-surface-container-high text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Books Library JSON</span>
                </button>
              </div>

              {/* Notes Export Section */}
              <div className="p-4 rounded-xl bg-surface border border-outline space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-on-surface">Export Notes & Scratchpad ({totalNotes} notes)</h4>
                </div>
                <button
                  onClick={handleExportNotesJson}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container border border-outline text-on-surface hover:bg-surface-container-high text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Notes & Scratchpad JSON</span>
                </button>
              </div>

              {/* Import / Restore Section */}
              <div className="p-4 rounded-xl bg-surface border border-outline space-y-3">
                <h4 className="text-xs font-semibold text-on-surface">Import & Restore</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-outline hover:border-primary bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 text-primary" />
                    <span>Import Books JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBooksFile}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-outline hover:border-primary bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 text-primary" />
                    <span>Import Articles JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportArticlesFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
