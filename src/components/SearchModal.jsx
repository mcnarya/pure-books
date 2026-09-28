import React, { useState } from 'react';
import {
  Search,
  X,
  BookOpen,
  Plus,
  Check,
  Star,
  Loader2,
  Clock
} from 'lucide-react';

export default function SearchModal({
  isOpen,
  onClose,
  onAddBook,
  existingBookIds,
  apiBase
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingId, setAddingId] = useState(null);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${apiBase}/volumes/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.items || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (item, shelfSlug, shelfId, shelfName) => {
    setAddingId(item.id);
    const bookData = {
      ...item,
      shelf: shelfSlug,
      shelfId: shelfId,
      shelfName: shelfName,
      progress: shelfSlug === 'have-read' ? 100 : 0,
      currentPage: 0,
      favorite: shelfSlug === 'favorites',
      addedAt: new Date().toISOString()
    };

    await onAddBook(bookData);
    setAddingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface-container border border-outline rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-primary flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-on-surface">Search Google Books Catalog</h2>
              <p className="text-xs text-on-surface-variant">Find any book on Google Play Books and add to your library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Input */}
        <form onSubmit={handleSearch} className="p-4 border-b border-outline bg-surface/50">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Search by book title, author, subject, or ISBN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-24 py-2 text-sm rounded-xl bg-surface border border-outline text-on-surface placeholder:text-on-surface-variant/60 focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </div>
        </form>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs">Searching Google Books repository...</p>
            </div>
          ) : results.length > 0 ? (
            results.map((item) => {
              const isAdded = existingBookIds.includes(item.id);
              const isAdding = addingId === item.id;
              const thumbnail = item.imageLinks?.thumbnail || item.imageLinks?.smallThumbnail;

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-3 rounded-xl bg-surface/80 border border-outline hover:border-outline/80 transition-all"
                >
                  <div className="w-12 h-18 shrink-0 rounded bg-surface-container-high overflow-hidden border border-outline">
                    {thumbnail ? (
                      <img src={thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-on-surface line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-1">
                      {item.authors?.join(', ') || 'Unknown Author'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
                      {item.averageRating && (
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{item.averageRating}</span>
                        </span>
                      )}
                      {item.pageCount > 0 && <span>{item.pageCount} pages</span>}
                      {item.publishedDate && <span>{item.publishedDate.slice(0, 4)}</span>}
                    </div>

                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-1.5 opacity-80">
                      {item.description || 'No description preview.'}
                    </p>
                  </div>

                  {/* Add Buttons */}
                  <div className="shrink-0 flex flex-col gap-1.5">
                    {isAdded ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        <span>In Library</span>
                      </span>
                    ) : (
                      <>
                        <button
                          disabled={isAdding}
                          onClick={() => handleAdd(item, 'reading-now', '3', 'Reading Now')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Reading</span>
                        </button>
                        <button
                          disabled={isAdding}
                          onClick={() => handleAdd(item, 'to-read', '2', 'To Read')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-surface-container-high border border-outline hover:bg-surface-container text-on-surface transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="w-3 h-3" />
                          <span>To Read</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : searched ? (
            <div className="text-center py-16 text-on-surface-variant">
              <p className="text-sm">No books found matching "{query}"</p>
              <p className="text-xs mt-1">Try another title, author, or keyword.</p>
            </div>
          ) : (
            <div className="text-center py-16 text-on-surface-variant">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Type a book title or author to search the Google Books library</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
