import React from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Star,
  ShoppingBag,
  UploadCloud,
  Library,
  BookMarked,
  SlidersHorizontal,
  ArrowUpDown,
  Filter
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
  categories = [],
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSelectSort,
  totalBooks,
  filteredCount
}) {
  return (
    <div className="border-b border-outline bg-surface/50 backdrop-blur-xs">
      <div className="w-full px-4 sm:px-6">
        
        {/* Bookshelf Tabs */}
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

        {/* Filter & Sort Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs text-on-surface-variant border-t border-outline/50">
          
          {/* Left: Category filter & Sort by */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Category Dropdown */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-on-surface-variant" />
                <select
                  value={selectedCategory}
                  onChange={(e) => onSelectCategory(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-surface-container border border-outline text-on-surface text-xs focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Categories ({totalBooks})</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-on-surface-variant" />
              <select
                value={sortBy}
                onChange={(e) => onSelectSort(e.target.value)}
                className="px-2 py-1 rounded-lg bg-surface-container border border-outline text-on-surface text-xs focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
              >
                <option value="recent">Recently Added</option>
                <option value="title-asc">Title (A → Z)</option>
                <option value="title-desc">Title (Z → A)</option>
                <option value="author-asc">Author (A → Z)</option>
                <option value="year-desc">Year (Newest First)</option>
                <option value="year-asc">Year (Oldest First)</option>
                <option value="pages-desc">Page Count (High → Low)</option>
                <option value="rating-desc">Rating (Highest First)</option>
              </select>
            </div>

          </div>

          {/* Right: Count summary */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-on-surface">
              Showing {filteredCount} {filteredCount === 1 ? 'book' : 'books'}
            </span>
            {filteredCount !== totalBooks && (
              <span className="text-on-surface-variant/80">
                (filtered from {totalBooks})
              </span>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
