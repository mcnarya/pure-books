import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Star,
  ExternalLink,
  MoreVertical,
  FileText,
  Clock,
  CheckCircle2,
  Trash2,
  Check,
  ChevronDown
} from 'lucide-react';

export default function BookCard({
  book,
  viewMode = 'grid',
  onOpenReader,
  onOpenPureReader,
  onOpenNotes,
  onOpenDetails,
  onUpdateShelf,
  onToggleFavorite,
  onDeleteBook
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shelfDropdownOpen, setShelfDropdownOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setShelfDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const thumbnail = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail;
  const progress = Number(book.progress) || 0;
  const pageCount = book.pageCount || 0;
  const currentPage = book.currentPage || 0;

  const shelvesList = [
    { slug: 'reading-now', id: '3', label: 'Reading Now' },
    { slug: 'to-read', id: '2', label: 'To Read' },
    { slug: 'have-read', id: '4', label: 'Have Read' },
    { slug: 'favorites', id: '0', label: 'Favorites' }
  ];

  // List View Rendering
  if (viewMode === 'list') {
    return (
      <div className="group flex items-center justify-between gap-4 p-3 sm:p-4 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-outline hover:border-primary/40 transition-all">
        {/* Cover + Info */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 cursor-pointer" onClick={() => onOpenDetails(book)}>
          <div className="relative w-12 sm:w-16 h-18 sm:h-24 shrink-0 rounded-md overflow-hidden bg-surface-container-high border border-outline shadow-xs">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-1 text-center text-[10px] text-on-surface-variant">
                <BookOpen className="w-5 h-5 text-on-surface-variant/40" />
              </div>
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

            <div className="flex items-center gap-3 mt-2 text-xs text-on-surface-variant">
              {book.averageRating && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>{book.averageRating}</span>
                </span>
              )}
              {pageCount > 0 && (
                <span>{currentPage > 0 ? `${currentPage} / ${pageCount} pages` : `${pageCount} pages`}</span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-container-high text-on-surface-variant border border-outline">
                {book.shelfName || book.shelf}
              </span>
            </div>

            {/* Progress bar */}
            {progress > 0 && (
              <div className="w-full max-w-xs mt-2">
                <div className="h-1 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onOpenReader(book)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
            title="Read in Google Books Viewer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Read</span>
          </button>

          <button
            onClick={() => onOpenNotes(book)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline transition-colors cursor-pointer"
            title="Book Notes & Highlights"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-surface-container-high border border-outline rounded-xl shadow-xl py-1 z-30 text-xs">
                <button
                  onClick={() => { onOpenPureReader(book); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-on-surface hover:bg-surface-container flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>Pure Typography Reader</span>
                </button>
                {book.webReaderLink && (
                  <a
                    href={book.webReaderLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-left px-3 py-2 text-on-surface hover:bg-surface-container flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Play Books</span>
                  </a>
                )}
                <button
                  onClick={() => { onToggleFavorite(book.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-on-surface hover:bg-surface-container flex items-center gap-2"
                >
                  <Star className={`w-3.5 h-3.5 ${book.favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                  <span>{book.favorite ? 'Unmark Favorite' : 'Mark Favorite'}</span>
                </button>
                <div className="border-t border-outline my-1" />
                <button
                  onClick={() => { onDeleteBook(book.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-error hover:bg-error/10 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Library</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid View Rendering
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
            {book.shelfName || book.shelf}
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

        {/* Bottom Progress Bar on Cover */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Book Metadata & Controls */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => onOpenDetails(book)}
              className="font-semibold text-sm text-on-surface line-clamp-1 hover:text-primary transition-colors cursor-pointer"
              title={book.title}
            >
              {book.title}
            </h3>
          </div>

          <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
            {book.authors?.join(', ') || 'Unknown Author'}
          </p>

          <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-2.5">
            {book.averageRating ? (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>{book.averageRating}</span>
              </span>
            ) : (
              <span>{pageCount ? `${pageCount}p` : ''}</span>
            )}

            {progress > 0 ? (
              <span className="font-medium text-primary">
                {progress}% {currentPage > 0 ? `(p.${currentPage})` : ''}
              </span>
            ) : (
              <span className="opacity-70">{book.publishedDate ? book.publishedDate.slice(0, 4) : ''}</span>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-3.5 pt-3 border-t border-outline/60 flex items-center justify-between gap-1.5">
          <button
            onClick={() => onOpenReader(book)}
            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Read</span>
          </button>

          <button
            onClick={() => onOpenNotes(book)}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline transition-colors cursor-pointer"
            title="Notes & Highlights"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* More options menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline transition-colors cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 bottom-full mb-1 w-48 bg-surface-container-high border border-outline rounded-xl shadow-xl py-1 z-30 text-xs">
                <button
                  onClick={() => { onOpenPureReader(book); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-on-surface hover:bg-surface-container flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>Pure Typography Reader</span>
                </button>
                {book.webReaderLink && (
                  <a
                    href={book.webReaderLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-left px-3 py-2 text-on-surface hover:bg-surface-container flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Play Books</span>
                  </a>
                )}
                
                {/* Change Shelf Submenu */}
                <div className="px-3 py-1 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Move to Shelf
                </div>
                {shelvesList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onUpdateShelf(book.id, s.slug, s.id, s.label);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-on-surface hover:bg-surface-container flex items-center justify-between"
                  >
                    <span>{s.label}</span>
                    {(book.shelf === s.slug || book.shelfId === s.id) && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </button>
                ))}

                <div className="border-t border-outline my-1" />
                <button
                  onClick={() => { onDeleteBook(book.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-error hover:bg-error/10 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Library</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
