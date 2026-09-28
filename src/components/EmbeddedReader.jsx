import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  ExternalLink,
  BookOpen,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function EmbeddedReader({
  book,
  onClose,
  onSwitchToPureReader,
  onUpdateProgress
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.currentPage || 1);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(false);

    function initGoogleViewer() {
      if (!window.google || !window.google.books) {
        // Retry shortly
        setTimeout(initGoogleViewer, 300);
        return;
      }

      window.google.books.load();
      window.google.books.setOnLoadCallback(() => {
        if (!isMounted) return;
        const canvas = document.getElementById('google-books-canvas');
        if (!canvas) return;

        try {
          // Initialize Google Books DefaultViewer
          const viewer = new window.google.books.DefaultViewer(canvas);
          viewerRef.current = viewer;

          viewer.load(book.id, () => {
            // Not found callback
            if (isMounted) {
              setLoadError(true);
              setLoading(false);
            }
          }, () => {
            // Success callback
            if (isMounted) {
              setLoading(false);
            }
          });
        } catch (err) {
          console.error('[Pure-Books] Failed initializing Google Books viewer:', err);
          if (isMounted) {
            setLoadError(true);
            setLoading(false);
          }
        }
      });
    }

    if (window.google?.books) {
      initGoogleViewer();
    } else {
      // Load script dynamically if not present
      const scriptId = 'google-books-api-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://www.google.com/books/jsapi.js';
        script.onload = () => initGoogleViewer();
        script.onerror = () => {
          if (isMounted) {
            setLoadError(true);
            setLoading(false);
          }
        };
        document.head.appendChild(script);
      } else {
        setTimeout(initGoogleViewer, 200);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [book.id]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePageChange = (newPage) => {
    const page = Math.max(1, Math.min(book.pageCount || 1000, Number(newPage)));
    setCurrentPage(page);
    if (book.pageCount) {
      const pct = Math.round((page / book.pageCount) * 100);
      onUpdateProgress(book.id, pct, page);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-surface text-on-surface overflow-hidden"
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-container border-b border-outline z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Back to Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-on-surface truncate max-w-sm sm:max-w-md md:max-w-xl">
              {book.title}
            </h2>
            <p className="text-xs text-on-surface-variant truncate">
              {book.authors?.join(', ') || 'Unknown Author'}
            </p>
          </div>
        </div>

        {/* Reader Options */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Switch to Pure Typography Reader */}
          <button
            onClick={onSwitchToPureReader}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-container-high hover:bg-surface-container-high/80 border border-outline text-on-surface transition-colors cursor-pointer"
            title="Switch to distraction-free reading typography"
          >
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span>Pure Reader</span>
          </button>

          {/* Open in Google Play Books Web Reader */}
          {book.webReaderLink && (
            <a
              href={book.webReaderLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-container-high hover:bg-surface-container-high/80 border border-outline text-on-surface transition-colors cursor-pointer"
              title="Open directly in Google Play Books web interface"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Play Books Reader</span>
            </a>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Reader Canvas Area */}
      <div className="relative flex-1 w-full h-full bg-[#181a1b] flex items-center justify-center overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 z-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm font-medium text-on-surface">
              Loading Google Play Books Viewer...
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Initializing digital book canvas for volume {book.id}
            </p>
          </div>
        )}

        {loadError ? (
          <div className="max-w-md p-6 rounded-2xl bg-surface-container border border-outline text-center shadow-xl">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-on-surface mb-1">
              Google Viewer Preview Limited
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Google restricts embedded canvas rendering for some copyrighted books outside of authorized Google accounts or without available public preview pages.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={onSwitchToPureReader}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open in Pure Reader</span>
              </button>
              {book.webReaderLink && (
                <a
                  href={book.webReaderLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-medium bg-surface-container-high border border-outline hover:bg-surface-container text-on-surface transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Play Books</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div
            id="google-books-canvas"
            className="w-full h-full bg-[#1c1d1e]"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>

      {/* Bottom Progress Controls */}
      <div className="px-4 py-2.5 bg-surface-container border-t border-outline flex items-center justify-between text-xs text-on-surface-variant shrink-0">
        <div className="flex items-center gap-3">
          <span>Page:</span>
          <input
            type="number"
            min="1"
            max={book.pageCount || 9999}
            value={currentPage}
            onChange={(e) => handlePageChange(e.target.value)}
            className="w-16 px-2 py-1 text-xs rounded bg-surface border border-outline text-on-surface text-center focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          {book.pageCount > 0 && <span>of {book.pageCount}</span>}
        </div>

        <div className="flex items-center gap-4">
          {book.pageCount > 0 && (
            <span>
              {Math.round((currentPage / book.pageCount) * 100)}% completed
            </span>
          )}
          <span className="hidden sm:inline">Google Books Canvas</span>
        </div>
      </div>
    </div>
  );
}
