import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import ShelfNav from './components/ShelfNav';
import BookCard from './components/BookCard';
import EmbeddedReader from './components/EmbeddedReader';
import PureReader from './components/PureReader';
import SearchModal from './components/SearchModal';
import BookDetailsModal from './components/BookDetailsModal';
import NotesModal from './components/NotesModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { BookOpen, Plus, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState([]);
  const [bookshelves, setBookshelves] = useState([]);
  const [activeShelf, setActiveShelf] = useState('reading-now');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('pure_books_view_mode') || 'grid');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('pure_books_theme') || 'theme-nord');

  // Google Status State
  const [googleStatus, setGoogleStatus] = useState(null);

  // Active Reader / Modal States
  const [embeddedReaderBook, setEmbeddedReaderBook] = useState(null);
  const [pureReaderBook, setPureReaderBook] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);
  const [notesBook, setNotesBook] = useState(null);
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

    // Check if OAuth callback succeeded
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      // Clean query params
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      // Trigger sync
      handleSync();
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
      const host = window.location.host;
      const protocol = window.location.protocol;
      const isSubpath = window.location.pathname.startsWith('/books');
      const redirectUri = `${protocol}//${host}${isSubpath ? '/books' : ''}/api/auth/google/callback`;

      const res = await apiFetch(`/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
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
      console.error('Failed saving token:', err);
    }
  };

  // Save OAuth credentials
  const handleSaveCredentials = async (creds) => {
    try {
      const res = await apiFetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed saving credentials:', err);
    }
  };

  // Disconnect Google Account
  const handleLogoutGoogle = async () => {
    try {
      const res = await apiFetch('/auth/logout', { method: 'POST' });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Add Book
  const handleAddBook = async (bookData) => {
    try {
      const res = await apiFetch('/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      });
      if (res.ok) {
        const saved = await res.json();
        setBooks((prev) => [saved, ...prev.filter(b => b.id !== saved.id)]);
        // Reload shelves
        const sRes = await apiFetch('/bookshelves');
        if (sRes.ok) {
          const sData = await sRes.json();
          setBookshelves(sData.bookshelves || []);
        }
      }
    } catch (err) {
      console.error('Failed adding book:', err);
    }
  };

  // Update Shelf
  const handleUpdateShelf = async (bookId, shelfSlug, shelfId, shelfName) => {
    try {
      const updates = { shelf: shelfSlug, shelfId, shelfName };
      if (shelfSlug === 'have-read') {
        updates.progress = 100;
      }
      const res = await apiFetch(`/library/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setBooks((prev) => prev.map(b => b.id === bookId ? { ...b, ...updated } : b));
        if (detailsBook?.id === bookId) setDetailsBook(updated);
        // Refresh shelves count
        const sRes = await apiFetch('/bookshelves');
        if (sRes.ok) {
          const sData = await sRes.json();
          setBookshelves(sData.bookshelves || []);
        }
      }
    } catch (err) {
      console.error('Failed updating shelf:', err);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (bookId) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    try {
      const res = await apiFetch(`/library/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: !book.favorite })
      });
      if (res.ok) {
        const updated = await res.json();
        setBooks((prev) => prev.map(b => b.id === bookId ? { ...b, ...updated } : b));
        if (detailsBook?.id === bookId) setDetailsBook(updated);
      }
    } catch (err) {
      console.error('Failed toggling favorite:', err);
    }
  };

  // Update Reading Progress
  const handleUpdateProgress = async (bookId, progress, currentPage) => {
    try {
      const res = await apiFetch(`/volumes/${bookId}/readingPosition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress, currentPage })
      });
      if (res.ok) {
        const updated = await res.json();
        setBooks((prev) => prev.map(b => b.id === bookId ? { ...b, ...updated } : b));
        if (detailsBook?.id === bookId) setDetailsBook(updated);
        if (embeddedReaderBook?.id === bookId) setEmbeddedReaderBook(prev => ({ ...prev, ...updated }));
        if (pureReaderBook?.id === bookId) setPureReaderBook(prev => ({ ...prev, ...updated }));
      }
    } catch (err) {
      console.error('Failed updating reading progress:', err);
    }
  };

  // Save Book Notes
  const handleSaveNotes = async (bookId, userNotes) => {
    try {
      const res = await apiFetch(`/library/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userNotes })
      });
      if (res.ok) {
        const updated = await res.json();
        setBooks((prev) => prev.map(b => b.id === bookId ? { ...b, ...updated } : b));
        if (notesBook?.id === bookId) setNotesBook(updated);
        if (detailsBook?.id === bookId) setDetailsBook(updated);
      }
    } catch (err) {
      console.error('Failed saving notes:', err);
    }
  };

  // Delete Book
  const handleDeleteBook = async (bookId) => {
    try {
      const res = await apiFetch(`/library/${bookId}`, { method: 'DELETE' });
      if (res.ok) {
        setBooks((prev) => prev.filter(b => b.id !== bookId));
        if (detailsBook?.id === bookId) setDetailsBook(null);
        if (notesBook?.id === bookId) setNotesBook(null);
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

  // Filtered Books Memo
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Shelf Filter
      let matchesShelf = true;
      if (activeShelf === 'all') {
        matchesShelf = true;
      } else if (activeShelf === 'favorites') {
        matchesShelf = book.favorite || book.shelf === 'favorites' || book.shelfId === '0';
      } else {
        matchesShelf = book.shelf === activeShelf || book.shelfId === activeShelf;
      }

      if (!matchesShelf) return false;

      // Query Search Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = book.title?.toLowerCase().includes(q);
      const inAuthors = book.authors?.some(a => a.toLowerCase().includes(q));
      const inCategories = book.categories?.some(c => c.toLowerCase().includes(q));
      const inNotes = book.userNotes?.toLowerCase().includes(q);
      const inDesc = book.description?.toLowerCase().includes(q);

      return inTitle || inAuthors || inCategories || inNotes || inDesc;
    });
  }, [books, activeShelf, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface antialiased transition-colors duration-200">
      
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

      {/* Bookshelf Tabs & Stats Bar */}
      <ShelfNav
        shelves={bookshelves}
        activeShelf={activeShelf}
        onSelectShelf={setActiveShelf}
        books={books}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Loading your Google Play Books library...</p>
          </div>
        ) : filteredBooks.length > 0 ? (
          <div
            className={
              viewMode === 'grid'
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5"
                : "flex flex-col gap-3"
            }
          >
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                viewMode={viewMode}
                onOpenReader={(b) => setEmbeddedReaderBook(b)}
                onOpenPureReader={(b) => setPureReaderBook(b)}
                onOpenNotes={(b) => setNotesBook(b)}
                onOpenDetails={(b) => setDetailsBook(b)}
                onUpdateShelf={handleUpdateShelf}
                onToggleFavorite={handleToggleFavorite}
                onDeleteBook={handleDeleteBook}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-high border border-outline flex items-center justify-center text-primary mb-4 shadow-sm">
              <BookOpen className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-1">
              No books in this view
            </h3>
            <p className="text-xs text-on-surface-variant max-w-sm mb-5">
              {searchQuery
                ? `No books found matching "${searchQuery}". Try a different keyword.`
                : `Your "${activeShelf}" shelf is currently empty.`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Search Google Books</span>
              </button>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-surface-container border border-outline hover:bg-surface-container-high transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Reader 1: Google Books Embedded Viewer */}
      {embeddedReaderBook && (
        <EmbeddedReader
          book={embeddedReaderBook}
          onClose={() => setEmbeddedReaderBook(null)}
          onSwitchToPureReader={() => {
            setPureReaderBook(embeddedReaderBook);
            setEmbeddedReaderBook(null);
          }}
          onUpdateProgress={handleUpdateProgress}
        />
      )}

      {/* Reader 2: Pure Typography Distraction-Free Reader */}
      {pureReaderBook && (
        <PureReader
          book={pureReaderBook}
          onClose={() => setPureReaderBook(null)}
          onSwitchToGoogleViewer={() => {
            setEmbeddedReaderBook(pureReaderBook);
            setPureReaderBook(null);
          }}
          onUpdateProgress={handleUpdateProgress}
        />
      )}

      {/* Modal: Google Books Catalog Search */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAddBook={handleAddBook}
        existingBookIds={books.map(b => b.id)}
        apiBase={apiBase}
      />

      {/* Modal: Book Details & Page Logger */}
      <BookDetailsModal
        book={detailsBook}
        isOpen={Boolean(detailsBook)}
        onClose={() => setDetailsBook(null)}
        onOpenReader={(b) => setEmbeddedReaderBook(b)}
        onOpenPureReader={(b) => setPureReaderBook(b)}
        onOpenNotes={(b) => setNotesBook(b)}
        onUpdateShelf={handleUpdateShelf}
        onToggleFavorite={handleToggleFavorite}
        onUpdateProgress={handleUpdateProgress}
        onDeleteBook={handleDeleteBook}
      />

      {/* Modal: Book Notes & Highlights */}
      <NotesModal
        book={notesBook}
        isOpen={Boolean(notesBook)}
        onClose={() => setNotesBook(null)}
        onSaveNotes={handleSaveNotes}
      />

      {/* Modal: Settings & Google OAuth */}
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
