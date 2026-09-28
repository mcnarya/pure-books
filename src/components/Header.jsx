import React from 'react';
import {
  Library,
  Search,
  Plus,
  Settings,
  RefreshCw,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import SuiteMenu from './SuiteMenu';

export default function Header({
  searchQuery,
  onSearchChange,
  onOpenSearchModal,
  onOpenSettings,
  googleStatus,
  onSync,
  isSyncing,
  viewMode,
  onToggleViewMode,
  totalBooksCount
}) {
  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-outline px-4 sm:px-6 py-3 transition-colors duration-200">
      <div className="w-full flex items-center justify-between gap-4">
        
        {/* Left: Suite Menu & Branding */}
        <div className="flex items-center gap-3">
          <SuiteMenu />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-primary flex items-center justify-center shadow-xs">
              <Library className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-base sm:text-lg tracking-tight leading-none text-on-surface">
                  Pure Books
                </h1>
                <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline">
                  Play Books
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${totalBooksCount} books by title, author, or category...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg bg-surface-container border border-outline text-on-surface placeholder:text-on-surface-variant/60 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Google Sync Pill */}
          {googleStatus?.authenticated ? (
            <button
              onClick={onSync}
              disabled={isSyncing}
              title={isSyncing ? "Syncing Google Play Books..." : "Google Play Books Connected. Click to sync."}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-container border border-outline hover:border-primary/50 text-on-surface transition-colors"
            >
              {googleStatus.userProfile?.picture ? (
                <img
                  src={googleStatus.userProfile.picture}
                  alt="Profile"
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="truncate max-w-[100px]">
                {googleStatus.userProfile?.name || 'Synced'}
              </span>
              <RefreshCw className={`w-3 h-3 text-on-surface-variant ${isSyncing ? 'animate-spin text-primary' : ''}`} />
            </button>
          ) : (
            <button
              onClick={onOpenSettings}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-container hover:bg-surface-container-high border border-outline text-on-surface-variant hover:text-on-surface transition-colors"
              title="Connect Google Play Books"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Connect Google</span>
            </button>
          )}

          {/* Add Book to Library */}
          <button
            onClick={onOpenSearchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Book</span>
          </button>

          {/* View Mode Toggle (Grid / List) */}
          <button
            onClick={onToggleViewMode}
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline transition-colors cursor-pointer"
            title={viewMode === 'grid' ? 'Switch to List view' : 'Switch to Grid view'}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline transition-colors cursor-pointer"
            title="Settings & Google Account"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Mobile search bar */}
      <div className="mt-2.5 md:hidden">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            placeholder="Search books, authors, categories..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg bg-surface-container border border-outline text-on-surface placeholder:text-on-surface-variant/60 focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
