import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Star,
  ExternalLink,
  MoreVertical,
  Trash2,
  Calendar,
  Layers,
  Building
} from 'lucide-react';

export default function BookCard({
  book,
  viewMode = 'grid',
  onOpenDetails,
  onToggleFavorite,
  onDeleteBook
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enhance thumbnail URL to request larger resolution if possible
  const rawThumbnail = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail;
  const thumbnail = rawThumbnail ? rawThumbnail.replace('&edge=curl', '').replace('zoom=5', 'zoom=1') : null;
  const pageCount = book.pageCount || 0;
  const year = book.publishedDate ? book.publishedDate.slice(0, 4) : '';
  const primaryCategory = Array.isArray(book.categories) && book.categories.length > 0 ? book.categories[0] : null;
  const playBooksUrl = book.webReaderLink || book.canonicalVolumeLink || `https://play.google.com/books/reader?id=${book.id}`;

  // ----------------------------------------------------
  // LIST VIEW RENDERING
  // ----------------------------------------------------
  if (viewMode === 'list') {
    return (
      <div className="group flex items-center justify-between gap-3 sm:gap-4 p-3 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-outline hover:border-primary/40 transition-all">
        {/* Cover + Info */}
        <div 
          className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 cursor-pointer" 
          onClick={() => onOpenDetails(book)}
        >
          <div className="relative w-12 sm:w-14 h-16 sm:h-20 shrink-0 rounded-md overflow-hidden bg-surface-container-high border border-outline shadow-xs flex items-center justify-center">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <BookOpen className="w-5 h-5 text-on-surface-variant/40" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm sm:text-base text-on-surface truncate group-hover:text-primary transition-colors">
                {book.title}
              </h3>
              {book.favorite && (
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              )}
            </div>

            <p className="text-xs text-on-surface-variant truncate mt-0.5">
              {book.authors?.join(', ') || 'Unknown Author'}
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs text-on-surface-variant">
              {primaryCategory && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-container-high text-on-surface-variant border border-outline/70">
                  {primaryCategory}
                </span>
              )}
              {year && (
                <span className="flex items-center gap-1 text-[11px] opacity-80">
                  <Calendar className="w-3 h-3" />
                  {year}
                </span>
              )}
              {pageCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] opacity-80">
                  <Layers className="w-3 h-3" />
                  {pageCount} p
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-container text-primary">
                {book.shelfName || book.shelf || 'Google Play'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={playBooksUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            title="Open in Google Play Books"
          >
            <span>Play Books</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => onToggleFavorite(book.id)}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-amber-400 hover:bg-surface-container-high border border-outline transition-colors cursor-pointer"
            title={book.favorite ? "Unmark Favorite" : "Mark Favorite"}
          >
            <Star className={`w-3.5 h-3.5 ${book.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-surface-container-high border border-outline rounded-xl shadow-xl py-1 z-30 text-xs">
                <button
                  onClick={() => { onOpenDetails(book); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>View Details</span>
                </button>
                <a
                  href={playBooksUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-left px-3 py-2 text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Play Books</span>
                </a>
                <div className="border-t border-outline my-1" />
                <button
                  onClick={() => { onDeleteBook(book.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-error hover:bg-error/10 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from View</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // GRID VIEW RENDERING (DEFAULT)
  // ----------------------------------------------------
  return (
    <div className="group relative flex flex-col rounded-2xl bg-surface-container/60 hover:bg-surface-container border border-outline hover:border-primary/40 transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md">
      
      {/* Top Cover Display */}
      <div
        className="relative aspect-3/4 w-full bg-surface-container-high overflow-hidden cursor-pointer flex items-center justify-center p-3"
        onClick={() => onOpenDetails(book)}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={book.title}
            className="w-full h-full object-contain drop-shadow-md group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <BookOpen className="w-10 h-10 text-on-surface-variant/40 mb-2" />
            <span className="text-xs font-medium text-on-surface-variant line-clamp-2">
              {book.title}
            </span>
          </div>
        )}

        {/* Shelf Badge Pill */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-md bg-surface/85 text-on-surface border border-outline shadow-xs">
            {book.shelfName || book.shelf || 'Play Book'}
          </span>
        </div>

        {/* Favorite Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(book.id);
          }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full backdrop-blur-md bg-surface/80 hover:bg-surface border border-outline flex items-center justify-center transition-colors cursor-pointer"
          title={book.favorite ? "Favorited" : "Add to favorites"}
        >
          <Star className={`w-3.5 h-3.5 ${book.favorite ? 'fill-amber-400 text-amber-400' : 'text-on-surface-variant'}`} />
        </button>
      </div>

      {/* Book Metadata & Action Bar */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3
            onClick={() => onOpenDetails(book)}
            className="font-semibold text-sm text-on-surface line-clamp-2 hover:text-primary transition-colors cursor-pointer leading-snug"
            title={book.title}
          >
            {book.title}
          </h3>

          <p className="text-xs text-on-surface-variant line-clamp-1 mt-1 font-normal">
            {book.authors?.join(', ') || 'Unknown Author'}
          </p>

          <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-2.5">
            {primaryCategory ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-container-high border border-outline/50 truncate max-w-[120px]">
                {primaryCategory}
              </span>
            ) : (
              <span className="opacity-70">{year}</span>
            )}

            {pageCount > 0 && (
              <span className="opacity-75">{pageCount} pages</span>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-2.5 border-t border-outline/60 flex items-center justify-between gap-2">
          <button
            onClick={() => onOpenDetails(book)}
            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-surface-container-high hover:bg-surface-container border border-outline text-on-surface hover:text-primary transition-colors cursor-pointer text-center"
          >
            Details
          </button>

          <a
            href={playBooksUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            title="Open in Google Play Books"
          >
            <span>Play Books</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

    </div>
  );
}
