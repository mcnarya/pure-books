import React from 'react';
import {
  Library,
  BookOpen,
  FileText,
  Search,
  Plus,
  Settings,
  RefreshCw,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Calendar
} from 'lucide-react';
import SuiteMenu from './SuiteMenu';

export default function Header({
  activeTab,
  onChangeTab,
  booksCount = 0,
  unreadArticlesCount = 0,
  notesCount = 0,
  searchQuery,
  onSearchChange,
  onOpenSearchModal,
  onOpenAddArticleModal,
  onNewNote,
  onDailyNote,
  onOpenSettings,
  googleStatus,
  onSyncGoogle,
  isSyncingGoogle,
  viewMode,
  onToggleViewMode,
  onLock,
  authRequired
}) {
  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-outline px-4 sm:px-6 py-3 transition-colors duration-200">
      <div className="w-full flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Suite Menu & App Title + Section Switcher Pills */}
        <div className="flex items-center gap-3">
          <SuiteMenu />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-primary flex items-center justify-center shadow-xs">
              {activeTab === 'books' ? (
                <Library className="w-4 h-4" />
              ) : activeTab === 'articles' ? (
                <BookOpen className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="hidden xl:block">
              <h1 className="font-semibold text-base tracking-tight leading-none text-on-surface">
                Pure
              </h1>
            </div>
          </div>

          {/* Top Navigation Switcher Tabs (Books, Articles, Notes) */}
          <div className="flex items-center p-1 rounded-xl bg-surface-container border border-outline">
            <button
              onClick={() => onChangeTab('books')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'books'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              <span>Books</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'books' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {booksCount}
              </span>
            </button>

            <button
              onClick={() => onChangeTab('articles')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'articles'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Articles</span>
              {unreadArticlesCount > 0 ? (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'articles' ? 'bg-on-primary/20 text-on-primary' : 'bg-primary/20 text-primary'
                  }`}
                >
                  {unreadArticlesCount}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => onChangeTab('notes')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'notes' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {notesCount}
              </span>
            </button>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === 'books'
                  ? `Search ${booksCount} books by title, author, or category...`
                  : activeTab === 'articles'
                  ? 'Search articles, authors, publications...'
                  : 'Search notes by title or #tag...'
              }
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg bg-surface-container border border-outline text-on-surface placeholder:text-on-surface-variant/60 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'books' ? (
            <>
              {/* Google Sync Pill */}
              {googleStatus?.authenticated ? (
                <button
                  onClick={onSyncGoogle}
                  disabled={isSyncingGoogle}
                  title={isSyncingGoogle ? "Syncing Google Play Books..." : "Google Play Books Connected. Click to sync."}
                  className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-container border border-outline hover:border-primary/50 text-on-surface transition-colors cursor-pointer"
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
                  <RefreshCw className={`w-3 h-3 text-on-surface-variant ${isSyncingGoogle ? 'animate-spin text-primary' : ''}`} />
                </button>
              ) : (
                <button
                  onClick={() => onOpenSettings('google')}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-container hover:bg-surface-container-high border border-outline text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  title="Connect Google Play Books"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Connect Google</span>
                </button>
              )}

              {/* Add Book */}
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
            </>
          ) : activeTab === 'articles' ? (
            <>
              {/* Add Article */}
              <button
                onClick={onOpenAddArticleModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Article</span>
              </button>
            </>
          ) : (
            <>
              {/* Daily Log Button */}
              <button
                onClick={onDailyNote}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-container border border-outline hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                title="Open Today's Daily Log"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Today's Log</span>
              </button>
              {/* New Note Button */}
              <button
                onClick={onNewNote}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Note</span>
              </button>
            </>
          )}

          {/* Settings */}
          <button
            onClick={() => onOpenSettings()}
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline transition-colors cursor-pointer"
            title="Settings & Export"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Optional App Password Lock */}
          {authRequired && (
            <button
              onClick={onLock}
              className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline transition-colors cursor-pointer"
              title="Lock Application"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* Mobile search bar */}
      <div className="mt-2.5 md:hidden">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'books'
                ? "Search books, authors, categories..."
                : activeTab === 'articles'
                ? "Search articles, authors, publications..."
                : "Search notes by title or #tag..."
            }
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
