import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import ShelfNav from './components/ShelfNav';
import ArticleNav from './components/ArticleNav';
import BookCard from './components/BookCard';
import ArticleCard from './components/ArticleCard';
import ReaderView from './components/ReaderView';
import SearchModal from './components/SearchModal';
import BookDetailsModal from './components/BookDetailsModal';
import AddArticleModal from './components/AddArticleModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import NoteSidebar from './components/NoteSidebar';
import NoteEditor from './components/NoteEditor';
import { BookOpen, Library, Plus, Loader2, RefreshCw, AlertCircle, Sparkles, Inbox, FileText } from 'lucide-react';

export default function App() {
  // Navigation Section ('books' | 'articles' | 'notes')
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/read')) return 'articles';
      if (window.location.pathname.startsWith('/note')) return 'notes';
    }
    return localStorage.getItem('pure_books_active_tab') || 'books';
  });

  // Books State
  const [books, setBooks] = useState([]);
  const [bookshelves, setBookshelves] = useState([]);
  const [activeShelf, setActiveShelf] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('pure_books_view_mode') || 'grid');
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [googleStatus, setGoogleStatus] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Articles State
  const [articles, setArticles] = useState([]);
  const [articleFilter, setArticleFilter] = useState('unread');
  const [activeArticle, setActiveArticle] = useState(null);
  const [isAddArticleOpen, setIsAddArticleOpen] = useState(false);
  const [isSyncingFeeds, setIsSyncingFeeds] = useState(false);

  // Notes State
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [isScratchpad, setIsScratchpad] = useState(false);
  const [scratchpadContent, setScratchpadContent] = useState('');
  const [selectedNoteTag, setSelectedNoteTag] = useState('');

  // Shared Search & Loading State
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('pure_books_theme') || 'theme-nord');

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState('google');

  // Auth State
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordToken, setPasswordToken] = useState(
    () => sessionStorage.getItem('pure_books_token') || localStorage.getItem('pure_suite_token') || ''
  );

  // API Base Path Resolver
  const apiBase = typeof window !== 'undefined' && window.location.pathname.startsWith('/books')
    ? '/books/api'
    : (typeof window !== 'undefined' && window.location.pathname.startsWith('/read')
      ? '/read/api'
      : (typeof window !== 'undefined' && window.location.pathname.startsWith('/note') ? '/note/api' : '/api'));

  // Save active tab
  useEffect(() => {
    localStorage.setItem('pure_books_active_tab', activeTab);
    setSearchQuery('');
  }, [activeTab]);

  // Apply Theme
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('pure_books_theme', theme);
  }, [theme]);

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

  // Load Books Data
  const loadBooksData = useCallback(async () => {
    try {
      const configRes = await apiFetch('/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setGoogleStatus(configData.google);
        setAuthRequired(configData.authRequired);
        if (!configData.authRequired || passwordToken) {
          setAuthenticated(true);
        }
      }

      const booksRes = await apiFetch('/library');
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData);
      }

      const shelvesRes = await apiFetch('/bookshelves');
      if (shelvesRes.ok) {
        const shelvesData = await shelvesRes.json();
        setBookshelves(shelvesData.bookshelves || []);
      }
    } catch (err) {
      console.error('[pure-books] Failed to load books data:', err);
    }
  }, [apiFetch, passwordToken]);

  // Load Articles Data (summaries for fast list rendering)
  const loadArticlesData = useCallback(async () => {
    try {
      const res = await apiFetch('/articles?summary=true');
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.error('[pure-books] Failed to load articles data:', err);
    }
  }, [apiFetch]);

  const handleOpenArticleReader = useCallback(async (item) => {
    if (!item) return;
    if (item.content !== undefined) {
      setActiveArticle(item);
      return;
    }
    try {
      const res = await apiFetch(`/articles/${item.id}`);
      if (res.ok) {
        const full = await res.json();
        setActiveArticle(full);
        return;
      }
    } catch (err) {
      console.error('[pure-books] Failed to load full article:', err);
    }
    setActiveArticle(item);
  }, [apiFetch]);

  // Load Notes Data
  const loadNotesData = useCallback(async () => {
    try {
      const res = await apiFetch('/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
        if (data.length > 0 && !activeNote && !isScratchpad) {
          const first = await apiFetch(`/notes/${data[0].id}`);
          if (first.ok) {
            setActiveNote(await first.json());
          }
        }
      }
      const scratchRes = await apiFetch('/scratchpad');
      if (scratchRes.ok) {
        const scratchData = await scratchRes.json();
        setScratchpadContent(scratchData.content || '');
      }
    } catch (err) {
      console.error('[pure-books] Failed to load notes data:', err);
    }
  }, [apiFetch, activeNote, isScratchpad]);

  // Initial Load
  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadBooksData(), loadArticlesData(), loadNotesData()]);
    setLoading(false);
  }, [loadBooksData, loadArticlesData, loadNotesData]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Check URL query parameters for OAuth redirect feedback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      loadBooksData();
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (params.get('auth_error')) {
      alert(`Google Authentication error: ${params.get('auth_error')}`);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [loadBooksData]);

  // Auth Verification
  const handleAuthenticate = async (password) => {
    try {
      const res = await fetch(`${apiBase}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        setPasswordToken(password);
        sessionStorage.setItem('pure_books_token', password);
        localStorage.setItem('pure_suite_token', password);
        try {
          window.parent?.postMessage({ type: 'PURE_HUB_AUTH_TOKEN', token: password }, '*');
        } catch {}
        setAuthenticated(true);
        loadAllData();
        return { success: true };
      } else {
        return { success: false, error: 'Incorrect password' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const handleLock = () => {
    setPasswordToken('');
    sessionStorage.removeItem('pure_books_token');
    setAuthenticated(false);
  };

  // Google Sync Action
  const handleSyncGoogle = async () => {
    if (isSyncingGoogle) return;
    try {
      setIsSyncingGoogle(true);
      const res = await apiFetch('/sync', { method: 'POST' });
      if (res.ok) {
        await loadBooksData();
      } else {
        const err = await res.json();
        alert(`Sync failed: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Google OAuth URL Action
  const handleConnectGoogle = async () => {
    try {
      const isSubpath = window.location.pathname.startsWith('/books');
      const origin = window.location.origin;
      const redirectUri = `${origin}${isSubpath ? '/books' : ''}/api/auth/google/callback`;

      const res = await apiFetch(`/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start Google sign-in. Check your OAuth credentials in Settings.');
      }
    } catch (err) {
      alert('Error initiating Google sign-in: ' + err.message);
    }
  };

  // Manual Token / Credential Handlers
  const handleSaveManualToken = async (accessToken, refreshToken, apiKey) => {
    const res = await apiFetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, refreshToken, apiKey })
    });
    if (res.ok) {
      await loadBooksData();
    }
  };

  const handleSaveCredentials = async ({ clientId, clientSecret, apiKey }) => {
    const res = await apiFetch('/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret, apiKey })
    });
    if (res.ok) {
      await loadBooksData();
    }
  };

  const handleLogoutGoogle = async () => {
    const res = await apiFetch('/auth/logout', { method: 'POST' });
    if (res.ok) {
      await loadBooksData();
    }
  };

  // Books CRUD
  const handleAddBook = async (bookData) => {
    try {
      const res = await apiFetch('/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      });
      if (res.ok) {
        await loadBooksData();
      }
    } catch (err) {
      console.error('Failed to add book:', err);
    }
  };

  const handleToggleFavorite = async (book) => {
    try {
      const updatedFavorite = !book.favorite;
      const res = await apiFetch(`/library/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: updatedFavorite })
      });
      if (res.ok) {
        setBooks(prev => prev.map(b => b.id === book.id ? { ...b, favorite: updatedFavorite } : b));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!confirm('Remove this book from your library?')) return;
    try {
      const res = await apiFetch(`/library/${bookId}`, { method: 'DELETE' });
      if (res.ok) {
        setBooks(prev => prev.filter(b => b.id !== bookId));
        if (detailsBook?.id === bookId) setDetailsBook(null);
      }
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  };

  // Articles CRUD
  const handleAddArticle = async (url) => {
    const res = await apiFetch('/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save article');
    }
    const saved = await res.json();
    setArticles(prev => [saved, ...prev.filter(a => a.id !== saved.id)]);
  };

  const handleUploadArticleFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (passwordToken) headers.Authorization = `Bearer ${passwordToken}`;

    const res = await fetch(`${apiBase}/articles/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to parse uploaded document');
    }

    const saved = await res.json();
    setArticles(prev => [saved, ...prev.filter(a => a.id !== saved.id)]);
  };

  const handleToggleArticleRead = async (id, newReadStatus) => {
    try {
      const res = await apiFetch(`/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: newReadStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setArticles(prev => prev.map(a => a.id === id ? updated : a));
        if (activeArticle?.id === id) setActiveArticle(updated);
      }
    } catch (err) {
      console.error('Failed to update read state:', err);
    }
  };

  const handleToggleArticleStar = async (id) => {
    const current = articles.find(a => a.id === id);
    if (!current) return;
    const newStar = !current.starred;

    try {
      const res = await apiFetch(`/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: newStar })
      });
      if (res.ok) {
        const updated = await res.json();
        setArticles(prev => prev.map(a => a.id === id ? updated : a));
        if (activeArticle?.id === id) setActiveArticle(updated);
      }
    } catch (err) {
      console.error('Failed to update star state:', err);
    }
  };

  const handleUpdateArticleProgress = async (id, progress) => {
    try {
      await apiFetch(`/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      });
      setArticles(prev => prev.map(a => a.id === id ? { ...a, progress } : a));
    } catch {}
  };

  const handleDeleteArticle = async (id) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await apiFetch(`/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.id !== id));
        if (activeArticle?.id === id) setActiveArticle(null);
      }
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  const handleSyncFeeds = async () => {
    if (isSyncingFeeds) return;
    try {
      setIsSyncingFeeds(true);
      const res = await apiFetch('/feeds/sync', { method: 'POST' });
      if (res.ok) {
        await loadArticlesData();
      }
    } catch (err) {
      console.error('Failed to sync feeds:', err);
    } finally {
      setIsSyncingFeeds(false);
    }
  };

  // Notes CRUD Handlers
  const handleSelectNote = useCallback(async (id) => {
    try {
      setIsScratchpad(false);
      const res = await apiFetch(`/notes/${id}`);
      if (res.ok) {
        setActiveNote(await res.json());
      }
    } catch (err) {
      console.error('Failed to select note:', err);
    }
  }, [apiFetch]);

  // PostMessage listener for Pure Hub Theme Synchronization & Spotlight Deep-Links
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
      if (event.data?.type === 'PURE_HUB_AUTH_TOKEN' && typeof event.data.token === 'string' && event.data.token) {
        setPasswordToken(event.data.token);
        sessionStorage.setItem('pure_books_token', event.data.token);
        localStorage.setItem('pure_suite_token', event.data.token);
        setAuthenticated(true);
      }
      if (event.data?.type === 'OPEN_BOOK' && event.data.id) {
        setActiveTab('books');
        setActiveArticle(null);
        setBooks((currentBooks) => {
          const match = currentBooks.find((b) => String(b.id) === String(event.data.id));
          if (match) setDetailsBook(match);
          return currentBooks;
        });
      }
      if (event.data?.type === 'OPEN_ARTICLE' && event.data.id) {
        setActiveTab('articles');
        handleOpenArticleReader({ id: event.data.id });
      }
      if (event.data?.type === 'OPEN_NOTE' && event.data.id) {
        setActiveTab('notes');
        setActiveArticle(null);
        handleSelectNote(event.data.id);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleOpenArticleReader, handleSelectNote]);

  const handleSelectScratchpad = () => {
    setIsScratchpad(true);
  };

  const handleNewNote = async () => {
    try {
      const res = await apiFetch('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Note',
          content: '# Untitled Note\n\nStart writing...',
          tags: []
        })
      });
      if (res.ok) {
        const created = await res.json();
        setNotes(prev => [created, ...prev]);
        setActiveNote(created);
        setIsScratchpad(false);
        setActiveTab('notes');
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDailyNote = async () => {
    try {
      const res = await apiFetch('/notes/daily/today');
      if (res.ok) {
        const daily = await res.json();
        setIsScratchpad(false);
        setActiveNote(daily);
        setActiveTab('notes');
        loadNotesData();
      }
    } catch (err) {
      console.error('Failed to get/create daily note:', err);
    }
  };

  const handleSaveNote = async (updatedData) => {
    if (!updatedData?.id) return;
    try {
      const res = await apiFetch(`/notes/${updatedData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        const saved = await res.json();
        setActiveNote(saved);
        setNotes(prev => prev.map(n => n.id === saved.id ? { ...n, ...saved } : n));
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      const res = await apiFetch(`/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (activeNote?.id === id) {
          const remaining = notes.filter(n => n.id !== id);
          if (remaining.length > 0) {
            handleSelectNote(remaining[0].id);
          } else {
            setActiveNote(null);
            setIsScratchpad(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleSaveScratchpad = async (content) => {
    setScratchpadContent(content);
    try {
      await apiFetch('/scratchpad', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    } catch (err) {
      console.error('Failed to save scratchpad:', err);
    }
  };

  // Categories derivation for Books
  const categories = useMemo(() => {
    const map = new Map();
    books.forEach(b => {
      (b.categories || []).forEach(cat => {
        const clean = cat.trim();
        if (clean) {
          map.set(clean, (map.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [books]);

  // Notes tags derivation
  const allNotesTags = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => {
      if (n.tags && Array.isArray(n.tags)) {
        n.tags.forEach(t => set.add(t));
      }
    });
    return Array.from(set);
  }, [notes]);

  // Filtered Books
  const filteredBooks = useMemo(() => {
    let result = [...books];

    if (activeShelf !== 'all') {
      result = result.filter(b => {
        if (b.shelf === activeShelf || b.shelfId === activeShelf) return true;
        if (Array.isArray(b.shelves)) {
          return b.shelves.some(s => s.slug === activeShelf || s.id === activeShelf);
        }
        return false;
      });
    }

    if (selectedCategory !== 'all') {
      result = result.filter(b => (b.categories || []).includes(selectedCategory));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => {
        const titleMatch = (b.title || '').toLowerCase().includes(q);
        const authorMatch = (b.authors || []).some(a => a.toLowerCase().includes(q));
        const catMatch = (b.categories || []).some(c => c.toLowerCase().includes(q));
        const descMatch = (b.description || '').toLowerCase().includes(q);
        return titleMatch || authorMatch || catMatch || descMatch;
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'author':
          return (a.authors?.[0] || '').localeCompare(b.authors?.[0] || '');
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0);
        case 'pages':
          return (b.pageCount || 0) - (a.pageCount || 0);
        case 'recent':
        default:
          return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
      }
    });

    return result;
  }, [books, activeShelf, selectedCategory, searchQuery, sortBy]);

  // Filtered Articles & Counts
  const articleCounts = useMemo(() => ({
    unread: articles.filter(a => !a.read).length,
    all: articles.length,
    starred: articles.filter(a => a.starred).length,
    archive: articles.filter(a => a.read).length
  }), [articles]);

  const filteredArticles = useMemo(() => {
    let list = [...articles];

    if (articleFilter === 'unread') {
      list = list.filter(a => !a.read);
    } else if (articleFilter === 'starred') {
      list = list.filter(a => a.starred);
    } else if (articleFilter === 'archive') {
      list = list.filter(a => a.read);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.siteName?.toLowerCase().includes(q) ||
        a.author?.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [articles, articleFilter, searchQuery]);

  const handleOpenSettingsTab = (tab = 'theme') => {
    setSettingsDefaultTab(tab);
    setIsSettingsOpen(true);
  };

  // Render Reader View when an article is active
  if (activeArticle) {
    return (
      <ReaderView
        article={activeArticle}
        onClose={() => setActiveArticle(null)}
        onToggleRead={handleToggleArticleRead}
        onToggleStar={handleToggleArticleStar}
        onUpdateProgress={handleUpdateArticleProgress}
        apiBase={apiBase}
        passwordToken={passwordToken}
      />
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-surface text-on-surface antialiased transition-colors duration-200 overflow-hidden">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        booksCount={books.length}
        unreadArticlesCount={articleCounts.unread}
        notesCount={notes.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSearchModal={() => setIsSearchOpen(true)}
        onOpenAddArticleModal={() => setIsAddArticleOpen(true)}
        onNewNote={handleNewNote}
        onDailyNote={handleDailyNote}
        onOpenSettings={handleOpenSettingsTab}
        googleStatus={googleStatus}
        onSyncGoogle={handleSyncGoogle}
        isSyncingGoogle={isSyncingGoogle}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
        onLock={handleLock}
        authRequired={authRequired}
      />

      {/* Subnavigation Toolbar: ShelfNav for Books or ArticleNav for Articles */}
      {activeTab === 'books' ? (
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
      ) : activeTab === 'articles' ? (
        <ArticleNav
          filter={articleFilter}
          onSelectFilter={setArticleFilter}
          counts={articleCounts}
          onSyncFeeds={handleSyncFeeds}
          isSyncingFeeds={isSyncingFeeds}
          onOpenSettingsTab={handleOpenSettingsTab}
        />
      ) : null}

      {/* Main Content Area */}
      <main className={`flex-1 w-full ${activeTab === 'notes' ? 'overflow-hidden p-0' : 'overflow-y-auto px-4 sm:px-6 md:px-8 py-6'}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Loading your space...</p>
          </div>
        ) : activeTab === 'books' ? (
          /* ================= BOOKS TAB CONTENT ================= */
          !googleStatus?.authenticated && books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-primary-container text-primary flex items-center justify-center mb-5 shadow-sm">
                <Library className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-on-surface mb-2">
                Connect Google Play Books
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6">
                Connect your Google account to showcase and browse all your purchased books, custom shelves, and reading collection.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleConnectGoogle}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                >
                  <span>Connect with Google</span>
                </button>
                <button
                  onClick={() => handleOpenSettingsTab('google')}
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
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-high border border-outline flex items-center justify-center text-primary mb-4 shadow-sm">
                <Library className="w-8 h-8 opacity-60" />
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
                    onClick={handleSyncGoogle}
                    disabled={isSyncingGoogle}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-surface-container border border-outline hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGoogle ? 'animate-spin text-primary' : ''}`} />
                    <span>Sync from Google</span>
                  </button>
                )}
              </div>
            </div>
          )
        ) : activeTab === 'articles' ? (
          /* ================= ARTICLES TAB CONTENT ================= */
          filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-surface-container border border-outline flex items-center justify-center text-primary mb-4 shadow-sm">
                <BookOpen className="w-8 h-8 opacity-70" />
              </div>
              <h3 className="text-base font-semibold text-on-surface mb-1">
                {searchQuery ? 'No articles found' : 'Your reading stash is empty'}
              </h3>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                {searchQuery
                  ? `No articles match "${searchQuery}". Try a different keyword or clear the search.`
                  : 'Save articles, blog posts, essays, and stories from across the web for clean, distraction-free reading.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsAddArticleOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Your First Article</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onOpenReader={handleOpenArticleReader}
                  onToggleRead={handleToggleArticleRead}
                  onToggleStar={handleToggleArticleStar}
                  onDelete={handleDeleteArticle}
                />
              ))}
            </div>
          )
        ) : (
          /* ================= NOTES TAB CONTENT ================= */
          <div className="w-full h-full flex overflow-hidden">
            <NoteSidebar
              notes={notes}
              activeNoteId={activeNote?.id}
              isScratchpadActive={isScratchpad}
              onSelectNote={handleSelectNote}
              onSelectScratchpad={handleSelectScratchpad}
              onNewNote={handleNewNote}
              onDailyNote={handleDailyNote}
              onDeleteNote={handleDeleteNote}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTag={selectedNoteTag}
              onSelectTag={setSelectedNoteTag}
              allTags={allNotesTags}
            />
            <div className="flex-1 h-full overflow-hidden bg-surface">
              <NoteEditor
                isScratchpad={isScratchpad}
                note={activeNote}
                onSaveNote={handleSaveNote}
                scratchpadContent={scratchpadContent}
                onSaveScratchpad={handleSaveScratchpad}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modal: Book Details */}
      <BookDetailsModal
        book={detailsBook}
        isOpen={Boolean(detailsBook)}
        onClose={() => setDetailsBook(null)}
        onToggleFavorite={handleToggleFavorite}
        onDeleteBook={handleDeleteBook}
      />

      {/* Modal: Search & Add Book */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAddBook={handleAddBook}
        existingBookIds={books.map(b => b.id)}
        apiBase={apiBase}
      />

      {/* Modal: Add Article (URL or Document Upload) */}
      <AddArticleModal
        isOpen={isAddArticleOpen}
        onClose={() => setIsAddArticleOpen(false)}
        onAddArticle={handleAddArticle}
        onUploadFile={handleUploadArticleFile}
      />

      {/* Modal: Comprehensive Settings */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultTab={settingsDefaultTab}
        currentTheme={theme}
        onSelectTheme={setTheme}
        googleStatus={googleStatus}
        onConnectGoogle={handleConnectGoogle}
        onSaveManualToken={handleSaveManualToken}
        onSaveCredentials={handleSaveCredentials}
        onLogoutGoogle={handleLogoutGoogle}
        apiBase={apiBase}
        passwordToken={passwordToken}
        onRefreshLibrary={loadBooksData}
        onRefreshArticles={loadArticlesData}
        totalBooks={books.length}
        totalArticles={articles.length}
        totalNotes={notes.length}
        articleCounts={articleCounts}
      />

      {/* Modal: Password Gate */}
      <AuthModal
        isOpen={authRequired && !authenticated}
        onAuthenticate={handleAuthenticate}
      />

    </div>
  );
}
