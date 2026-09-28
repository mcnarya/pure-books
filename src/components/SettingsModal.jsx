import React, { useState } from 'react';
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
  RotateCcw
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
  currentTheme,
  onSelectTheme,
  googleStatus,
  onConnectGoogle,
  onSaveManualToken,
  onSaveCredentials,
  onLogoutGoogle,
  apiBase,
  onRefreshLibrary
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('google'); // 'google', 'theme', 'data'
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

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

  const handleExport = () => {
    window.location.href = `${apiBase}/export`;
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const books = Array.isArray(parsed) ? parsed : parsed.books;
      if (!Array.isArray(books)) {
        alert('Invalid JSON file format');
        return;
      }

      const res = await fetch(`${apiBase}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books })
      });

      if (res.ok) {
        alert('Library imported successfully!');
        onRefreshLibrary();
        onClose();
      } else {
        alert('Import failed');
      }
    } catch (err) {
      alert('Error parsing JSON file: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col bg-surface-container border border-outline rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-primary flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-on-surface">Pure Books Settings</h2>
              <p className="text-xs text-on-surface-variant">Configure Google Play Books connection and themes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-surface/60 border-b border-outline text-xs">
          <button
            onClick={() => setActiveTab('google')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'google'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Google Play Books</span>
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'theme'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Pure Themes</span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'data'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Data & Backup</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Status Alert if any */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* TAB 1: GOOGLE INTEGRATION */}
          {activeTab === 'google' && (
            <div className="space-y-6">
              
              {/* Connection Status Box */}
              <div className="p-4 rounded-xl bg-surface border border-outline flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {googleStatus?.userProfile?.picture ? (
                    <img
                      src={googleStatus.userProfile.picture}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full border border-outline"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                      {googleStatus?.authenticated ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-on-surface">
                      {googleStatus?.authenticated ? (googleStatus.userProfile?.name || 'Google Play Books Connected') : 'Not Connected'}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {googleStatus?.authenticated ? (googleStatus.userProfile?.email || 'Authenticated via OAuth 2.0') : 'Connect to sync your personal library, shelves, and reading progress'}
                    </div>
                  </div>
                </div>

                {googleStatus?.authenticated ? (
                  <button
                    onClick={onLogoutGoogle}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error/10 border border-error/30 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button
                    onClick={onConnectGoogle}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    <span>Connect Account</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Instant Token / API Key Entry */}
              <div className="p-4 rounded-xl bg-surface border border-outline text-xs space-y-3">
                <div className="font-semibold text-on-surface text-sm">
                  Quick Access Token or API Key
                </div>
                <p className="text-on-surface-variant text-[11px]">
                  Already have a Google OAuth Access Token (e.g., from OAuth Playground or gcloud) or an API Key? Paste it here for instant connection without setting up OAuth client IDs.
                </p>
                <form onSubmit={handleSaveToken} className="space-y-2.5">
                  <div>
                    <label className="text-on-surface block mb-1">Bearer Access Token</label>
                    <input
                      type="password"
                      placeholder="ya29.a0AfH6SM..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container border border-outline text-on-surface text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface block mb-1">Google Books API Key (Optional)</label>
                    <input
                      type="text"
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container border border-outline text-on-surface text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Apply Token
                  </button>
                </form>
              </div>

              {/* OAuth Client ID Setup */}
              <div className="p-4 rounded-xl bg-surface border border-outline text-xs space-y-3">
                <div className="font-semibold text-on-surface text-sm">
                  Custom OAuth 2.0 Credentials
                </div>
                <p className="text-on-surface-variant text-[11px] leading-relaxed">
                  To enable 1-click Google OAuth login, configure an OAuth 2.0 Web Client ID in Google Cloud Console. Under <strong>Authorized redirect URIs</strong>, add both of these URIs:
                </p>
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div className="flex items-center justify-between p-2 rounded bg-surface-container border border-outline/50">
                    <span className="truncate select-all">{typeof window !== 'undefined' ? `${window.location.origin}/books/api/auth/google/callback` : ''}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/books/api/auth/google/callback`);
                        setStatusMessage('Copied Pure Hub redirect URI!');
                      }}
                      className="ml-2 px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[10px] font-sans hover:bg-surface-container cursor-pointer shrink-0"
                    >
                      Copy (Hub)
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-surface-container border border-outline/50">
                    <span className="truncate select-all">{typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google/callback` : ''}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/auth/google/callback`);
                        setStatusMessage('Copied Direct redirect URI!');
                      }}
                      className="ml-2 px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[10px] font-sans hover:bg-surface-container cursor-pointer shrink-0"
                    >
                      Copy (Direct)
                    </button>
                  </div>
                </div>
                <form onSubmit={handleSaveCredentials} className="space-y-2.5">
                  <div>
                    <label className="text-on-surface block mb-1">Client ID</label>
                    <input
                      type="text"
                      placeholder="xxxx.apps.googleusercontent.com"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container border border-outline text-on-surface text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-on-surface block mb-1">Client Secret</label>
                    <input
                      type="password"
                      placeholder="GOCSPX-xxxx"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container border border-outline text-on-surface text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline text-on-surface font-medium hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Save Credentials
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 2: PURE THEMES */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-on-surface mb-1">Pure Ecosystem Themes</h3>
                <p className="text-xs text-on-surface-variant">
                  Select a theme. When embedded within Pure Hub, the theme syncs automatically with all Pure suite apps.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTheme(t.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      currentTheme === t.id
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-outline bg-surface hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: t.color, borderColor: t.accent }}
                      />
                      <span className="text-xs font-semibold text-on-surface">{t.name}</span>
                    </div>
                    {currentTheme === t.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DATA & BACKUP */}
          {activeTab === 'data' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-semibold text-on-surface mb-1">Library Data & Flat-File Storage</h3>
                <p className="text-on-surface-variant">
                  Pure Books stores all your reading positions, bookshelves, notes, and book caches in an atomic, corruption-safe flat-file JSON document.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-outline space-y-3">
                <div className="font-semibold text-on-surface">Export & Import</div>
                <p className="text-on-surface-variant text-[11px]">
                  Download a full backup of your library, or restore from a previous JSON backup.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high border border-outline text-on-surface hover:bg-surface-container transition-colors font-medium cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Library JSON</span>
                  </button>

                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high border border-outline text-on-surface hover:bg-surface-container transition-colors font-medium cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import JSON File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
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
