import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import ShelfNav from './components/ShelfNav';
import BookCard from './components/BookCard';
import SearchModal from './components/SearchModal';
import BookDetailsModal from './components/BookDetailsModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { BookOpen, Plus, Loader2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState([]);
  const [bookshelves, setBookshelves] = useState([]);
  const [activeShelf, setActiveShelf] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('pure_books_view_mode') || 'grid');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('pure_books_theme') || 'theme-nord');

  // Google Status State
  const [googleStatus, setGoogleStatus] = useState(null);

  // Modal States
  const [detailsBook, setDetailsBook] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auth States
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordToken, setPasswordToken] = useState(() => sessionStorage.getItem('pure_books_token') || '');

  // API Base Path Resolver (standalone / vs pure-app hub /books/)
  const apiBase = typeof window !== 'undefined' && window.location.pathname.startsWith('/books')
    ? '/books/api'
    : '/api';

  // Apply Theme
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('pure_books_theme', theme);
  }, [theme]);

  // PostMessage listener for Pure Hub Theme Synchronization
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'PURE_HUB_THEME_CHANGE' && typeof event.data.theme === 'string') {
        setTheme(event.data.theme);
      }
      if (event.data?.type === 'PURE_HUB_DYNAMIC_THEME_OVERRIDE') {
        const { primary, primaryContainer } = event.data;
        if (primary && primaryContainer) {
          document.documentElement.style.setProperty('--md-sys-color-primary', primary);
          document.documentElement.style.setProperty('--md-sys-color-primary-container', primaryContainer);
        }
      }
      if (event.data?.type === 'PURE_HUB_DYNAMIC_THEME_RESET') {
        document.documentElement.style.removeProperty('--md-sys-color-primary');
        document.documentElement.style.removeProperty('--md-sys-color-primary-container');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Save View Mode
  useEffect(() => {
    localStorage.setItem('pure_books_view_mode', viewMode);
  }, [viewMode]);

  // Fetch API Helper with Auth
  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (passwordToken) {
      headers.Authorization = `Bearer ${passwordToken}`;
    }
    const response = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      setAuthRequired(true);
      setAuthenticated(false);
      throw new Error('Authentication required');
    }

    return response;
  }, [apiBase, passwordToken]);

  // Load Library Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch Config & Google status
      const configRes = await apiFetch('/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setGoogleStatus(configData.google);
        setAuthRequired(configData.authRequired);
        if (!configData.authRequired || passwordToken) {
          setAuthenticated(true);
        }
      }

      // Fetch Books
      const booksRes = await apiFetch('/library');
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData);
      }

      // Fetch Bookshelves
      const shelvesRes = await apiFetch('/bookshelves');
      if (shelvesRes.ok) {
        const shelvesData = await shelvesRes.json();
        setBookshelves(shelvesData.bookshelves || []);
      }
    } catch (err) {
      console.error('[Pure-Books] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, passwordToken]);

  // Initial mount & URL query checking
  useEffect(() => {
    loadData();

    // Check if OAuth callback succeeded or failed
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      handleSync();
    }
    const authError = params.get('auth_error');
    if (authError) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      alert(`Google OAuth Error: ${decodeURIComponent(authError)}`);
    }
  }, [loadData]);

  // Password Gate Authentication
  const handleAuthenticate = async (enteredPassword) => {
    try {
      const res = await fetch(`${apiBase}/library`, {
        headers: { Authorization: `Bearer ${enteredPassword}` }
      });
      if (!res.ok) {
        throw new Error('Incorrect password');
      }
      const data = await res.json();
      setBooks(data);
      setPasswordToken(enteredPassword);
      sessionStorage.setItem('pure_books_token', enteredPassword);
      setAuthenticated(true);
      setAuthRequired(false);
      loadData();
    } catch (err) {
      throw err;
    }
  };

  // Google Play Books Sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch('/sync', { method: 'POST' });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert('Sync error: ' + (err.error || 'Failed to sync'));
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Connect Google Account via OAuth
  const handleConnectGoogle = async () => {
    try {
      const isSubpath = window.location.pathname.startsWith('/books');
      const origin = window.location.origin;
      const redirectUri = `${origin}${isSubpath ? '/books' : ''}/api/auth/google/callback`;

      const res = await apiFetch(`/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      if (res.ok) {
        const { url } = await res.json();
        if (window.top && window.top !== window.self) {
          window.top.location.href = url;
        } else {
          window.location.href = url;
        }
      } else {
        const err = await res.json();
        alert('Could not start Google login: ' + (err.error || 'Missing Client ID in settings'));
      }
    } catch (err) {
      alert('OAuth request failed: ' + err.message);
    }
  };

  // Save manual token
  const handleSaveManualToken = async (accessToken, refreshToken, apiKey) => {
    try {
      const res = await apiFetch('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken, apiKey })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed saving manual token:', err);
    }
  };

  // Save OAuth credentials
  const handleSaveCredentials = async (clientId, clientSecret) => {
    try {
      const res = await apiFetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed saving credentials:', err);
    }
  };

  // Logout Google Account
  const handleLogoutGoogle = async () => {
    try {
      const res = await apiFetch('/auth/logout', { method: 'POST' });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed logout:', err);
    }
  };

  // Add Book from Search
  const handleAddBook = async (bookData, shelfSlug = 'purchased', shelfId = '1') => {
    try {
      const shelfMapping = bookshelves.find(s => s.slug === shelfSlug || s.id === shelfId);
      const res = await apiFetch('/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookData,
          shelf: shelfSlug,
          shelfId,
          shelfName: shelfMapping ? shelfMapping.title : 'My Books'
        })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed adding book:', err);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (bookId) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const newFavorite = !book.favorite;
    try {
      const res = await apiFetch(`/library/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: newFavorite })
      });
      if (res.ok) {
        setBooks((prev) => prev.map(b => b.id === bookId ? { ...b, favorite: newFavorite } : b));
        if (detailsBook?.id === bookId) {
          setDetailsBook(prev => ({ ...prev, favorite: newFavorite }));
        }
      }
    } catch (err) {
      console.error('Failed toggling favorite:', err);
    }
  };

  // Delete Book from View
  const handleDeleteBook = async (bookId) => {
    try {
      const res = await apiFetch(`/library/${bookId}`, { method: 'DELETE' });
      if (res.ok) {
        setBooks((prev) => prev.filter(b => b.id !== bookId));
        if (detailsBook?.id === bookId) setDetailsBook(null);
        // Refresh shelves
        const sRes = await apiFetch('/bookshelves');
        if (sRes.ok) {
          const sData = await sRes.json();
          setBookshelves(sData.bookshelves || []);
        }
      }
    } catch (err) {
      console.error('Failed deleting book:', err);
    }
  };

  // Extract Unique Categories with Book Counts
  const categories = useMemo(() => {
    const counts = {};
    books.forEach(b => {
      if (Array.isArray(b.categories)) {
        b.categories.forEach(c => {
          const clean = c.trim();
          if (clean) counts[clean] = (counts[clean] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [books]);

  // Filtered & Sorted Books
  const filteredBooks = useMemo(() => {
    // 1. Filter
    const result = books.filter((book) => {
      // Bookshelf Filter
      let matchesShelf = true;
      if (activeShelf === 'all') {
        matchesShelf = true;
      } else if (activeShelf === 'favorites') {
        matchesShelf = book.favorite || book.shelf === 'favorites' || book.shelfId === '0' ||
          (Array.isArray(book.shelves) && book.shelves.some(s => s.id === '0' || s.slug === 'favorites'));
      } else {
        matchesShelf = book.shelf === activeShelf || book.shelfId === activeShelf ||
          (Array.isArray(book.shelves) && book.shelves.some(s => s.id === activeShelf || s.slug === activeShelf));
      }

      if (!matchesShelf) return false;

      // Category Filter
      if (selectedCategory !== 'all') {
        const hasCategory = Array.isArray(book.categories) && book.categories.includes(selectedCategory);
        if (!hasCategory) return false;
      }

      // Query Search Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = book.title?.toLowerCase().includes(q);
      const inAuthors = book.authors?.some(a => a.toLowerCase().includes(q));
      const inCategories = book.categories?.some(c => c.toLowerCase().includes(q));
      const inPublisher = book.publisher?.toLowerCase().includes(q);
      const inDesc = book.description?.toLowerCase().includes(q);

      return inTitle || inAuthors || inCategories || inPublisher || inDesc;
    });

    // 2. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'author-asc':
          return ((a.authors && a.authors[0]) || '').localeCompare((b.authors && b.authors[0]) || '');
        case 'year-desc':
          return (b.publishedDate || '').localeCompare(a.publishedDate || '');
        case 'year-asc':
          return (a.publishedDate || '').localeCompare(b.publishedDate || '');
        case 'pages-desc':
          return (b.pageCount || 0) - (a.pageCount || 0);
        case 'rating-desc':
          return (b.averageRating || 0) - (a.averageRating || 0);
        case 'recent':
        default:
          return (b.addedAt || '').localeCompare(a.addedAt || '');
      }
    });

    return result;
  }, [books, activeShelf, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="h-screen w-full flex flex-col bg-surface text-on-surface antialiased transition-colors duration-200 overflow-hidden">
      
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSearchModal={() => setIsSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        googleStatus={googleStatus}
        onSync={handleSync}
        isSyncing={isSyncing}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
        totalBooksCount={books.length}
      />

      {/* Bookshelf Tabs, Category Filter & Sorter */}
      <ShelfNav
        shelves={bookshelves}
        activeShelf={activeShelf}
        onSelectShelf={setActiveShelf}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        sortBy={sortBy}
        onSelectSort={setSortBy}
        totalBooks={books.length}
        filteredCount={filteredBooks.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto px-4 sm:px-6 md:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Loading your Google Play Books...</p>
          </div>
        ) : !googleStatus?.authenticated && books.length === 0 ? (
          /* Empty State: Google Account Not Connected */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary-container text-primary flex items-center justify-center mb-5 shadow-sm">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">
              Connect Google Play Books
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6">
              Pure Books is designed to showcase your personal Google Play Books library. Connect your Google account to instantly view and browse all your purchased books, custom shelves, and reading collection.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleConnectGoogle}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
              >
                <span>Connect with Google</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-surface-container border border-outline hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Settings
              </button>
            </div>
          </div>
        ) : filteredBooks.length > 0 ? (
          <div
            className={
              viewMode === 'grid'
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-5"
                : "flex flex-col gap-3"
            }
          >
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                viewMode={viewMode}
                onOpenDetails={(b) => setDetailsBook(b)}
                onToggleFavorite={handleToggleFavorite}
                onDeleteBook={handleDeleteBook}
              />
            ))}
          </div>
        ) : (
          /* Empty Filter State */
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-high border border-outline flex items-center justify-center text-primary mb-4 shadow-sm">
              <BookOpen className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-1">
              No books found
            </h3>
            <p className="text-xs text-on-surface-variant max-w-sm mb-5">
              {searchQuery
                ? `No books match "${searchQuery}".`
                : selectedCategory !== 'all'
                ? `No books found under category "${selectedCategory}".`
                : `Your "${activeShelf}" shelf currently has no volumes.`}
            </p>
            <div className="flex items-center gap-2">
              {(searchQuery || selectedCategory !== 'all' || activeShelf !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setActiveShelf('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Clear Filters
                </button>
              )}
              {googleStatus?.authenticated && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-surface-container border border-outline hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
                  <span>Sync from Google</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Book Details & Google Play Link */}
      <BookDetailsModal
        book={detailsBook}
        isOpen={Boolean(detailsBook)}
        onClose={() => setDetailsBook(null)}
        onToggleFavorite={handleToggleFavorite}
        onDeleteBook={handleDeleteBook}
      />

      {/* Modal: Search Google Play Books */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAddBook={handleAddBook}
        existingBookIds={books.map(b => b.id)}
        apiBase={apiBase}
      />

      {/* Modal: Settings & Google Account */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onSelectTheme={setTheme}
        googleStatus={googleStatus}
        onConnectGoogle={handleConnectGoogle}
        onSaveManualToken={handleSaveManualToken}
        onSaveCredentials={handleSaveCredentials}
        onLogoutGoogle={handleLogoutGoogle}
        apiBase={apiBase}
        onRefreshLibrary={loadData}
      />

      {/* Modal: Optional Password Gate */}
      <AuthModal
        isOpen={authRequired && !authenticated}
        onAuthenticate={handleAuthenticate}
      />

    </div>
  );
}
