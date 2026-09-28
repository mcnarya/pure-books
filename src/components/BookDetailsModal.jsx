import React from 'react';
import {
  X,
  BookOpen,
  Star,
  ExternalLink,
  Calendar,
  Building,
  Layers,
  Trash2,
  Tag,
  Globe
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export default function BookDetailsModal({
  book,
  isOpen,
  onClose,
  onToggleFavorite,
  onDeleteBook
}) {
  if (!isOpen || !book) return null;

  const rawThumbnail = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail;
  const thumbnail = rawThumbnail ? rawThumbnail.replace('&edge=curl', '').replace('zoom=5', 'zoom=1') : null;
  const pageCount = book.pageCount || 0;
  const playBooksReaderUrl = book.webReaderLink || `https://play.google.com/books/reader?id=${book.id}`;
  const storeUrl = book.canonicalVolumeLink || `https://play.google.com/store/books/details?id=${book.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-surface-container border border-outline rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-container text-primary">
              {book.shelfName || book.shelf || 'Google Play Book'}
            </span>
            {book.favorite && (
              <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                Favorite
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Top Info section */}
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
            <div className="w-32 h-46 shrink-0 rounded-xl overflow-hidden bg-surface-container-high border border-outline shadow-md flex items-center justify-center p-1.5">
              {thumbnail ? (
                <img src={thumbnail} alt={book.title} className="w-full h-full object-contain" />
              ) : (
                <BookOpen className="w-10 h-10 text-on-surface-variant/40" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight leading-snug">
                {book.title}
              </h2>
              {book.subtitle && (
                <p className="text-sm text-on-surface-variant mt-0.5 font-normal">
                  {book.subtitle}
                </p>
              )}
              <p className="text-sm text-on-surface-variant font-medium mt-1.5">
                By {book.authors?.join(', ') || 'Unknown Author'}
              </p>

              {/* Meta Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-3 text-xs text-on-surface-variant">
                {book.averageRating ? (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{book.averageRating}</span>
                    {book.ratingsCount ? <span className="text-on-surface-variant/70 text-[11px]">({book.ratingsCount})</span> : null}
                  </span>
                ) : null}

                {book.publishedDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {book.publishedDate}
                  </span>
                )}

                {pageCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {pageCount} pages
                  </span>
                )}

                {book.publisher && (
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <Building className="w-3.5 h-3.5" />
                    {book.publisher}
                  </span>
                )}
              </div>

              {/* Category Tags */}
              {Array.isArray(book.categories) && book.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                  {book.categories.map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-[11px] bg-surface-container-high text-on-surface-variant border border-outline/70"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Banner */}
          <div className="p-4 rounded-xl bg-surface/70 border border-outline flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm text-on-surface">
                Ready to read?
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Open directly in Google Play Books on web, phone, tablet, or e-reader.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={playBooksReaderUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Open in Google Play Books</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {storeUrl && (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 rounded-xl text-xs font-medium bg-surface-container-high hover:bg-surface-container border border-outline text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="View Store Listing"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Store</span>
                </a>
              )}
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-2">Description & Synopsis</h3>
            <div
              className="text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-2 max-h-60 overflow-y-auto pr-2"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked.parse(book.description || '*No description provided by Google Books.*'))
              }}
            />
          </div>

          {/* Bookshelf Associations */}
          {Array.isArray(book.shelves) && book.shelves.length > 0 && (
            <div className="p-3.5 rounded-xl bg-surface/60 border border-outline">
              <div className="text-xs font-semibold text-on-surface mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>Google Bookshelves</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {book.shelves.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs bg-surface-container border border-outline text-on-surface"
                  >
                    {s.name || s.title || s.slug}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Publishing & Identification Metadata */}
          <div className="pt-4 border-t border-outline/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-on-surface-variant">
            {book.publisher && (
              <div>
                <span className="block font-medium text-on-surface">Publisher</span>
                <span className="truncate block">{book.publisher}</span>
              </div>
            )}
            {book.publishedDate && (
              <div>
                <span className="block font-medium text-on-surface">Published</span>
                <span>{book.publishedDate}</span>
              </div>
            )}
            {pageCount > 0 && (
              <div>
                <span className="block font-medium text-on-surface">Length</span>
                <span>{pageCount} pages</span>
              </div>
            )}
            {book.id && (
              <div>
                <span className="block font-medium text-on-surface">Volume ID</span>
                <span className="font-mono text-[11px] truncate block">{book.id}</span>
              </div>
            )}
          </div>

          {/* Action Row: Favorite & Remove */}
          <div className="pt-4 border-t border-outline flex items-center justify-between">
            <button
              onClick={() => onToggleFavorite(book.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container border border-outline transition-colors cursor-pointer"
            >
              <Star className={`w-3.5 h-3.5 ${book.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{book.favorite ? 'Favorited' : 'Add to Favorites'}</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to remove "${book.title}" from this view?`)) {
                  onDeleteBook(book.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error/10 border border-error/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove from View</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
