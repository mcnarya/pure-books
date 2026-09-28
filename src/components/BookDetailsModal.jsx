import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Star,
  ExternalLink,
  Calendar,
  Building,
  Layers,
  Trash2,
  Check,
  FileText
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export default function BookDetailsModal({
  book,
  isOpen,
  onClose,
  onOpenReader,
  onOpenPureReader,
  onOpenNotes,
  onUpdateShelf,
  onToggleFavorite,
  onUpdateProgress,
  onDeleteBook
}) {
  if (!isOpen || !book) return null;

  const [currentPageInput, setCurrentPageInput] = useState(book.currentPage || 0);
  const thumbnail = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail;
  const pageCount = book.pageCount || 0;

  const shelvesList = [
    { slug: 'reading-now', id: '3', label: 'Reading Now' },
    { slug: 'to-read', id: '2', label: 'To Read' },
    { slug: 'have-read', id: '4', label: 'Have Read' },
    { slug: 'favorites', id: '0', label: 'Favorites' }
  ];

  const handleSaveProgress = (e) => {
    e.preventDefault();
    const page = Math.max(0, Math.min(pageCount || 99999, Number(currentPageInput) || 0));
    const pct = pageCount > 0 ? Math.round((page / pageCount) * 100) : 0;
    onUpdateProgress(book.id, pct, page);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-surface-container border border-outline rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-container text-primary">
              {book.shelfName || 'Google Play Book'}
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
            <div className="w-32 h-44 shrink-0 rounded-xl overflow-hidden bg-surface-container-high border border-outline shadow-md flex items-center justify-center">
              {thumbnail ? (
                <img src={thumbnail} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-10 h-10 text-on-surface-variant/40" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
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

              {/* Badges / Meta */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {book.categories?.map((cat, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-container-high text-on-surface-variant border border-outline"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="mt-4 pt-3 border-t border-outline/60">
                <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
                  <span>Reading Progress</span>
                  <span className="font-semibold text-primary">{book.progress || 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${book.progress || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => { onClose(); onOpenReader(book); }}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read (Google)</span>
            </button>

            <button
              onClick={() => { onClose(); onOpenPureReader(book); }}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-surface-container-high hover:bg-surface-container border border-outline text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Pure Reader</span>
            </button>

            <button
              onClick={() => { onClose(); onOpenNotes(book); }}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-surface-container-high hover:bg-surface-container border border-outline text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-on-surface-variant" />
              <span>Notes</span>
            </button>

            {book.webReaderLink ? (
              <a
                href={book.webReaderLink}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-xl text-xs font-semibold bg-surface-container-high hover:bg-surface-container border border-outline text-on-surface transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4 text-on-surface-variant" />
                <span>Play Books</span>
              </a>
            ) : (
              <div />
            )}
          </div>

          {/* Manage Shelf & Page Logger */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface/60 border border-outline text-xs">
            <div>
              <label className="font-semibold text-on-surface block mb-1.5">Bookshelf</label>
              <div className="flex flex-wrap gap-1.5">
                {shelvesList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onUpdateShelf(book.id, s.slug, s.id, s.label)}
                    className={`px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
                      book.shelf === s.slug || book.shelfId === s.id
                        ? 'bg-primary text-on-primary border-primary font-medium'
                        : 'bg-surface-container border-outline text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-on-surface block mb-1.5">Log Current Page</label>
              <form onSubmit={handleSaveProgress} className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={pageCount || 99999}
                  value={currentPageInput}
                  onChange={(e) => setCurrentPageInput(e.target.value)}
                  className="w-24 px-2.5 py-1 text-xs rounded-lg bg-surface border border-outline text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <span className="text-on-surface-variant">of {pageCount || '—'}</span>
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline hover:bg-surface-container text-on-surface font-medium cursor-pointer"
                >
                  Save
                </button>
              </form>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-2">Description</h3>
            <div
              className="text-xs text-on-surface-variant leading-relaxed space-y-2"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked.parse(book.description || '*No description provided.*'))
              }}
            />
          </div>

          {/* Publishing Metadata */}
          <div className="pt-4 border-t border-outline/70 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-on-surface-variant">
            {book.publisher && (
              <div>
                <span className="block font-medium text-on-surface">Publisher</span>
                <span>{book.publisher}</span>
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
                <span className="block font-medium text-on-surface">Print Length</span>
                <span>{pageCount} pages</span>
              </div>
            )}
          </div>

          {/* Danger Zone: Delete Book */}
          <div className="pt-4 border-t border-outline flex justify-end">
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to remove "${book.title}" from your library?`)) {
                  onDeleteBook(book.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error/10 border border-error/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove from Library</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
