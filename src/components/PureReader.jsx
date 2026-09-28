import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Type,
  BookOpen,
  Volume2,
  Play,
  Pause,
  Square,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function PureReader({
  book,
  onClose,
  onSwitchToGoogleViewer,
  onUpdateProgress
}) {
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('pure_books_font') || 'serif');
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('pure_books_size') || '18', 10));
  const [maxWidth, setMaxWidth] = useState(() => localStorage.getItem('pure_books_width') || 'max-w-3xl');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(book.progress || 0);

  // Text-To-Speech (TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem('pure_books_tts_rate') || '1.0'));

  const contentRef = useRef(null);
  const typeMenuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('pure_books_font', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('pure_books_size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('pure_books_width', maxWidth);
  }, [maxWidth]);

  useEffect(() => {
    localStorage.setItem('pure_books_tts_rate', speechRate.toString());
  }, [speechRate]);

  // Handle outside click for typography dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target)) {
        setShowTypeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track scroll progress
  const handleScroll = () => {
    if (!contentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const totalScrollable = scrollHeight - clientHeight;
    if (totalScrollable <= 0) return;

    const percent = Math.min(100, Math.max(0, Math.round((scrollTop / totalScrollable) * 100)));
    setScrollPercent(percent);

    if (book.pageCount) {
      const estimatedPage = Math.max(1, Math.round((percent / 100) * book.pageCount));
      onUpdateProgress(book.id, percent, estimatedPage);
    }
  };

  // Text to Speech
  const handleStartTTS = () => {
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
    const textToRead = `${book.title}. By ${book.authors?.join(', ')}. ${book.description || ''} ${book.userNotes || ''}`;
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

  const handlePauseTTS = () => {
    if ('speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleStopTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Compute word count and estimated reading time
  const sampleContent = book.description || 'No description preview available.';
  const wordCount = sampleContent.split(/\s+/).filter(Boolean).length;
  const readingTimeMins = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface text-on-surface overflow-hidden">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-surface-container border-b border-outline z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Back to Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-on-surface truncate max-w-sm sm:max-w-md md:max-w-xl">
              {book.title}
            </h2>
            <p className="text-xs text-on-surface-variant truncate">
              {book.authors?.join(', ') || 'Unknown Author'}
            </p>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2">
          {/* TTS Controls */}
          <div className="flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded-lg border border-outline">
            {!isSpeaking || isPaused ? (
              <button
                onClick={handleStartTTS}
                className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                title="Play Narration (TTS)"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handlePauseTTS}
                className="p-1 text-primary transition-colors cursor-pointer"
                title="Pause Narration"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
              </button>
            )}

            {(isSpeaking || isPaused) && (
              <button
                onClick={handleStopTTS}
                className="p-1 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                title="Stop Narration"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
            <Volume2 className="w-3.5 h-3.5 text-on-surface-variant opacity-70 ml-1 hidden sm:block" />
          </div>

          {/* Typography Settings Dropdown */}
          <div className="relative" ref={typeMenuRef}>
            <button
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline transition-colors cursor-pointer"
              title="Typography & Reading Style"
            >
              <Type className="w-4 h-4" />
            </button>

            {showTypeMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-surface-container-high border border-outline rounded-2xl shadow-2xl p-4 z-40 text-xs">
                <div className="font-semibold text-on-surface mb-3">Reading Typography</div>

                {/* Font Family */}
                <div className="mb-3.5">
                  <label className="text-on-surface-variant mb-1.5 block">Typeface</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-surface-container p-1 rounded-xl border border-outline">
                    <button
                      onClick={() => setFontFamily('serif')}
                      className={`py-1.5 rounded-lg font-serif ${fontFamily === 'serif' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high'}`}
                    >
                      Serif
                    </button>
                    <button
                      onClick={() => setFontFamily('sans')}
                      className={`py-1.5 rounded-lg font-sans ${fontFamily === 'sans' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high'}`}
                    >
                      Sans
                    </button>
                    <button
                      onClick={() => setFontFamily('mono')}
                      className={`py-1.5 rounded-lg font-mono ${fontFamily === 'mono' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high'}`}
                    >
                      Mono
                    </button>
                  </div>
                </div>

                {/* Font Size Slider */}
                <div className="mb-3.5">
                  <div className="flex justify-between text-on-surface-variant mb-1">
                    <span>Font Size</span>
                    <span>{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="28"
                    step="1"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                {/* Reading Width */}
                <div>
                  <label className="text-on-surface-variant mb-1.5 block">Reading Width</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-surface-container p-1 rounded-xl border border-outline">
                    <button
                      onClick={() => setMaxWidth('max-w-2xl')}
                      className={`py-1.5 rounded-lg ${maxWidth === 'max-w-2xl' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high'}`}
                    >
                      Narrow
                    </button>
                    <button
                      onClick={() => setMaxWidth('max-w-3xl')}
                      className={`py-1.5 rounded-lg ${maxWidth === 'max-w-3xl' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high'}`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => setMaxWidth('max-w-4xl')}
                      className={`py-1.5 rounded-lg ${maxWidth === 'max-w-4xl' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high'}`}
                    >
                      Wide
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Switch back to Google Books viewer */}
          <button
            onClick={onSwitchToGoogleViewer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            title="Switch to Google Books Viewer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Viewer</span>
          </button>
        </div>
      </div>

      {/* Reading Progress Top Bar */}
      <div className="h-1 bg-surface-container-high w-full">
        <div
          className="h-full bg-primary transition-all duration-150"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {/* Main Content Area */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 md:py-12"
      >
        <div className={`mx-auto ${maxWidth} transition-all duration-200`}>
          
          {/* Book Header Card */}
          <div className="mb-10 pb-8 border-b border-outline">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {book.imageLinks?.thumbnail && (
                <img
                  src={book.imageLinks.thumbnail}
                  alt={book.title}
                  className="w-32 h-44 object-contain rounded-xl shadow-lg border border-outline bg-surface-container-high"
                />
              )}
              <div className="flex-1">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-container text-primary">
                  {book.shelfName || 'Google Play Book'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface mt-3">
                  {book.title}
                </h1>
                {book.subtitle && (
                  <p className="text-base text-on-surface-variant font-normal mt-1">
                    {book.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-on-surface-variant">
                  <span>By <strong>{book.authors?.join(', ') || 'Unknown'}</strong></span>
                  {book.publisher && <span>• {book.publisher}</span>}
                  {book.publishedDate && <span>• {book.publishedDate}</span>}
                  {book.pageCount > 0 && <span>• {book.pageCount} pages</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Book Content / Description Typography */}
          <article
            className={`prose-reader ${
              fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans'
            }`}
            style={{ fontSize: `${fontSize}px` }}
          >
            <h2 className="text-xl font-bold text-on-surface mb-4">Synopsis & Overview</h2>
            <div
              className="leading-relaxed text-on-surface"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked.parse(book.description || '*No synopsis preview available for this volume.*'))
              }}
            />

            {/* Personal Book Notes */}
            {book.userNotes && (
              <div className="mt-12 p-6 rounded-2xl bg-surface-container border border-outline">
                <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>My Notes & Highlights</span>
                </h3>
                <div
                  className="prose-reader text-sm"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(marked.parse(book.userNotes))
                  }}
                />
              </div>
            )}
          </article>

          {/* Web Reader Footer Link */}
          {book.webReaderLink && (
            <div className="mt-16 p-6 rounded-2xl bg-surface-container-high/60 border border-outline text-center">
              <h4 className="font-semibold text-on-surface mb-2">Want to read the full volume?</h4>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-4">
                Launch the full Google Play Books web reader to browse all pages, sync bookmarks, and view your Google cloud reading position.
              </p>
              <a
                href={book.webReaderLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Google Play Books Web Reader</span>
              </a>
            </div>
          )}

        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="px-6 py-2 bg-surface-container border-t border-outline flex items-center justify-between text-xs text-on-surface-variant shrink-0">
        <div>{scrollPercent}% read</div>
        <div>Estimated read time: ~{readingTimeMins} mins</div>
      </div>
    </div>
  );
}
