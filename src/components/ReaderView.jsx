import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  Circle,
  ExternalLink,
  Type,
  Copy,
  User,
  Calendar,
  Check,
  Code,
  FileText,
  Volume2,
  Play,
  Pause,
  Square,
  Book,
  FileDown
} from 'lucide-react';

export default function ReaderView({
  article,
  onClose,
  onToggleRead,
  onToggleStar,
  onUpdateProgress,
  apiBase = '/api',
  passwordToken = ''
}) {
  const [viewMode, setViewMode] = useState('rendered'); // 'rendered' or 'markdown'
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('pure_read_font') || 'serif');
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('pure_read_size') || '18', 10));
  const [maxWidth, setMaxWidth] = useState(() => localStorage.getItem('pure_read_width') || 'max-w-3xl');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(article.progress || 0);

  // Text-To-Speech (TTS) Reader state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem('pure_read_tts_rate') || '1.0'));

  const contentRef = useRef(null);
  const typeMenuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('pure_read_font', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('pure_read_size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('pure_read_width', maxWidth);
  }, [maxWidth]);

  useEffect(() => {
    localStorage.setItem('pure_read_tts_rate', speechRate.toString());
  }, [speechRate]);

  // Clean and prepare markdown text for speech synthesis
  const cleanTextForSpeech = (text) => {
    if (!text) return '';
    return text
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[#*`_~>]/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleStartSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();

    const rawText = article.content || article.markdown || article.excerpt || article.title;
    const textToRead = cleanTextForSpeech(`${article.title}. By ${article.author || 'Unknown'}. ${rawText}`);

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = speechRate;
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handlePauseSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  };

  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  // Stop speech when closing or changing article
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [article.id]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close type menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target)) {
        setShowTypeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track scroll position
  useEffect(() => {
    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docEl = document.documentElement;
          const totalHeight = docEl.scrollHeight - docEl.clientHeight;
          if (totalHeight > 0) {
            const currentScroll = window.scrollY;
            const pct = Math.min(100, Math.max(0, Math.round((currentScroll / totalHeight) * 100)));
            setScrollPercent(pct);
            if (pct >= 90 && !article.read) {
              onToggleRead(article.id, true);
            }
            onUpdateProgress(article.id, pct);
          }
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article.id, article.read, onToggleRead, onUpdateProgress]);

  const handleCopyMarkdown = () => {
    const md = article.markdown || `# ${article.title}\n\n*Source: [${article.siteName}](${article.url})*\n*Author: ${article.author || 'Unknown'}*\n\n${article.excerpt}\n`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFontFamilyClass = () => {
    switch (fontFamily) {
      case 'sans': return 'font-sans';
      case 'mono': return 'font-mono';
      case 'serif':
      default: return 'font-serif';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-background)] transition-colors duration-150">
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-50 pointer-events-none">
        <div
          className="h-full bg-[var(--md-sys-color-primary)] transition-all duration-150"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {/* Sticky Reader Toolbar */}
      <header className="sticky top-0 z-40 border-b border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5 transition-colors">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-primary)] transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Center Info */}
          <div className="text-center truncate px-2 max-w-xs sm:max-w-md">
            <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)] truncate block">{article.siteName}</span>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-1.5">
            {/* Text-to-Speech (TTS) Reader Controls */}
            <div className="flex items-center gap-1 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] rounded-xl px-1.5 py-1">
              {!isSpeaking ? (
                <button
                  onClick={handleStartSpeech}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-primary)] transition-colors cursor-pointer"
                  title="Listen to Article (Text-to-Speech)"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" />
                  <span className="hidden md:inline">Listen</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePauseSpeech}
                    className="p-1 rounded-lg text-amber-400 hover:bg-[var(--md-sys-color-surface-container-high)] cursor-pointer"
                    title="Pause"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleStopSpeech}
                    className="p-1 rounded-lg text-red-400 hover:bg-[var(--md-sys-color-surface-container-high)] cursor-pointer"
                    title="Stop Listening"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              )}

              {/* Speed rate toggle button */}
              <button
                onClick={() => {
                  const rates = [1.0, 1.25, 1.5, 0.75];
                  const nextIdx = (rates.indexOf(speechRate) + 1) % rates.length;
                  setSpeechRate(rates[nextIdx]);
                }}
                className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] cursor-pointer"
                title="Change Speech Speed"
              >
                {speechRate}x
              </button>
            </div>

            {/* Star */}
            <button
              onClick={() => onToggleStar(article.id, !article.starred)}
              className={`p-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors cursor-pointer ${
                article.starred ? 'text-amber-400' : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
              }`}
              title={article.starred ? 'Starred' : 'Star'}
            >
              <Star className={`w-4 h-4 ${article.starred ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Read / Unread */}
            <button
              onClick={() => onToggleRead(article.id, !article.read)}
              className={`p-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors cursor-pointer ${
                article.read ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
              }`}
              title={article.read ? 'Mark Unread' : 'Mark Read'}
            >
              {article.read ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </button>

            {/* Typography Popover Toggle */}
            <div className="relative" ref={typeMenuRef}>
              <button
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className={`p-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors cursor-pointer ${
                  showTypeMenu ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
                title="Appearance Settings"
              >
                <Type className="w-4 h-4" />
              </button>

              {showTypeMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface)] rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-4">
                  {/* Font Family */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider mb-2">
                      Font
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'serif', label: 'Serif', font: 'font-serif' },
                        { id: 'sans', label: 'Sans', font: 'font-sans' },
                        { id: 'mono', label: 'Mono', font: 'font-mono' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFontFamily(f.id)}
                          className={`py-1.5 rounded-xl border transition-all cursor-pointer ${f.font} ${
                            fontFamily === f.id
                              ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)] font-bold'
                              : 'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                        Size
                      </label>
                      <span className="text-[var(--md-sys-color-on-surface)] font-mono">{fontSize}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFontSize((s) => Math.max(14, s - 1))}
                        className="px-3 py-1 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] rounded-lg hover:bg-[var(--md-sys-color-surface-container-high)] font-bold cursor-pointer"
                      >
                        A-
                      </button>
                      <input
                        type="range"
                        min="14"
                        max="26"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                        className="flex-1 accent-[var(--md-sys-color-primary)] cursor-pointer"
                      />
                      <button
                        onClick={() => setFontSize((s) => Math.min(26, s + 1))}
                        className="px-3 py-1 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] rounded-lg hover:bg-[var(--md-sys-color-surface-container-high)] font-bold cursor-pointer"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Content Width */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider mb-2">
                      Reading Width
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'max-w-2xl', label: 'Narrow' },
                        { id: 'max-w-3xl', label: 'Medium' },
                        { id: 'max-w-4xl', label: 'Wide' },
                      ].map((w) => (
                        <button
                          key={w.id}
                          onClick={() => setMaxWidth(w.id)}
                          className={`py-1.5 rounded-xl border transition-all cursor-pointer ${
                            maxWidth === w.id
                              ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)] font-bold'
                              : 'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle Formatted / Markdown View */}
            <button
              onClick={() => setViewMode((m) => (m === 'rendered' ? 'markdown' : 'rendered'))}
              className={`p-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] transition-colors cursor-pointer ${
                viewMode === 'markdown'
                  ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)]'
                  : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)]'
              }`}
              title={viewMode === 'markdown' ? 'Switch to Formatted Reader' : 'Switch to Raw Markdown'}
            >
              {viewMode === 'markdown' ? <FileText className="w-4 h-4" /> : <Code className="w-4 h-4" />}
            </button>

            {/* Copy Markdown */}
            <button
              onClick={handleCopyMarkdown}
              className="p-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors cursor-pointer"
              title="Copy Full Markdown"
            >
              {copied ? <Check className="w-4 h-4 text-[var(--md-sys-color-primary)]" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Download EPUB */}
            <a
              href={`${apiBase}/articles/${article.id}/epub${passwordToken ? `?token=${encodeURIComponent(passwordToken)}` : ''}`}
              download
              className="p-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors"
              title="Download EPUB eBook (for Kindle / e-reader)"
            >
              <Book className="w-4 h-4" />
            </a>

            {/* Download Standalone Offline HTML */}
            <a
              href={`${apiBase}/articles/${article.id}/html${passwordToken ? `?token=${encodeURIComponent(passwordToken)}` : ''}`}
              download
              className="p-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors"
              title="Download Standalone Offline HTML (printable)"
            >
              <FileDown className="w-4 h-4" />
            </a>

            {/* Original Link (only for web URLs) */}
            {article.url && article.url.startsWith('http') && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors"
                title="Open Original Page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Reading Canvas */}
      <main className={`mx-auto px-6 py-10 sm:py-14 ${maxWidth} ${getFontFamilyClass()}`}>
        {/* Article Metadata Header */}
        <header className="mb-10 pb-8 border-b border-[var(--md-sys-color-outline)]">
          <div className="flex items-center gap-2 text-xs text-[var(--md-sys-color-primary)] uppercase tracking-widest font-mono font-bold mb-3">
            <span>{article.siteName}</span>
            <span>•</span>
            <span>{article.readingTimeMinutes} MIN READ</span>
            <span>•</span>
            <span>{article.wordCount} WORDS</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight text-[var(--md-sys-color-on-surface)] mb-5">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[var(--md-sys-color-on-surface-variant)]">
            {article.author && (
              <div className="flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" />
                <span>{article.author}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" />
              <span>{new Date(article.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
            </div>
          </div>
        </header>

        {/* Lead Image */}
        {article.leadImage && (
          <div className="mb-10 rounded-2xl overflow-hidden border border-[var(--md-sys-color-outline)] shadow-md">
            <img
              src={article.leadImage}
              alt={article.title}
              className="w-full h-auto max-h-[500px] object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Rendered Clean Article Content or Raw Markdown View */}
        {viewMode === 'markdown' ? (
          <div className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)] rounded-2xl p-6 sm:p-8 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap select-text text-[var(--md-sys-color-on-surface)] shadow-inner">
            {article.markdown || 'No raw Markdown source available.'}
          </div>
        ) : (
          <div
            ref={contentRef}
            className="prose-reader leading-relaxed"
            style={{ fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        )}

        {/* Footer End of Article */}
        <footer className="mt-16 pt-8 border-t border-[var(--md-sys-color-outline)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[var(--md-sys-color-on-surface-variant)]">
          <div>
            <span>Finished reading?</span>
            <button
              onClick={() => onToggleRead(article.id, true)}
              className="ml-2 font-bold text-[var(--md-sys-color-primary)] underline underline-offset-2 hover:opacity-90 cursor-pointer"
            >
              {article.read ? 'Marked as read' : 'Mark as read'}
            </button>
          </div>

          {article.url && article.url.startsWith('http') ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[var(--md-sys-color-on-surface)] hover:text-[var(--md-sys-color-primary)] font-semibold transition-colors"
            >
              <span>Visit source at {article.siteName}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="font-semibold text-[var(--md-sys-color-on-surface)]">
              {article.siteName}
            </span>
          )}
        </footer>
      </main>
    </div>
  );
}
