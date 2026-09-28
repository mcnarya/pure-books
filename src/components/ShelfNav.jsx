import React from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Star,
  ShoppingBag,
  UploadCloud,
  Library,
  BookMarked
} from 'lucide-react';

const SHELF_ICONS = {
  'reading-now': BookOpen,
  'to-read': Clock,
  'have-read': CheckCircle2,
  'favorites': Star,
  'purchased': ShoppingBag,
  'uploaded': UploadCloud,
  'all': Library
};

export default function ShelfNav({
  shelves,
  activeShelf,
  onSelectShelf,
  books
}) {
  // Calculate quick library stats
  const totalBooks = books.length;
  const readingNowCount = books.filter(b => b.shelf === 'reading-now' || b.shelfId === '3').length;
  const finishedCount = books.filter(b => b.shelf === 'have-read' || b.shelfId === '4' || b.progress === 100).length;
  const totalPagesRead = books.reduce((acc, b) => acc + (b.currentPage || 0), 0);

  return (
    <div className="border-b border-outline bg-surface/40 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5 no-scrollbar">
          {shelves.map((shelf) => {
            const Icon = SHELF_ICONS[shelf.slug] || BookMarked;
            const isActive = activeShelf === shelf.slug;

            return (
              <button
                key={shelf.id}
                onClick={() => onSelectShelf(shelf.slug)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>{shelf.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive
                      ? 'bg-on-primary/20 text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {shelf.volumeCount || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Reading Metrics Bar */}
        <div className="hidden lg:flex items-center justify-between py-2 text-xs text-on-surface-variant border-t border-outline/50">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <strong>{readingNowCount}</strong> in progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <strong>{finishedCount}</strong> books completed
            </span>
            <span>
              <strong>{totalPagesRead.toLocaleString()}</strong> total pages logged
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] opacity-80">
            <span>Synchronized with Google Play Books</span>
          </div>
        </div>

      </div>
    </div>
  );
}
