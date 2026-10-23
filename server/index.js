import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import { googleBooks } from './googleBooks.js';
import {
  readLibrary,
  writeLibrary,
  addBook,
  addBooksBatch,
  updateBook,
  deleteBook,
  DEFAULT_BOOKSHELVES,
  getBooksFilePath
} from './storage.js';
import {
  readArticles,
  writeArticles,
  getArticleById,
  addArticle,
  updateArticle,
  deleteArticle,
  getArticlesFilePath
} from './articlesStorage.js';
import { parseArticleUrl, parseUploadedFile } from './parser.js';
import { generateEpub, generateHtmlBundle } from './exporter.js';
import {
  readFeeds,
  addFeed,
  deleteFeed,
  syncFeeds,
  startFeedScheduler,
  stopFeedScheduler
} from './feed.js';
import {
  readNotesMetadata,
  getNote,
  saveNote,
  deleteNote,
  getTodayDailyNote,
  getScratchpad,
  saveScratchpad
} from './notesStorage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);

const PORT = process.env.PORT || 3004;
const APP_PASSWORD = process.env.APP_PASSWORD || process.env.PASSWORD || '';

// Multer upload configuration for documents (PDF, DOCX)
const uploadDir = path.join(os.tmpdir(), 'pure-books-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.text({ limit: '20mb' }));

// Auth Middleware for Optional App Password
function requireAuth(req, res, next) {
  if (!APP_PASSWORD) {
    return next();
  }
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : (req.headers['x-app-password'] || req.query.token);
  if (token === APP_PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Invalid or missing password' });
}

// ----------------------------------------------------
// Health & Auth Endpoints
// ----------------------------------------------------
app.get(['/api/health', '/books/api/health', '/read/api/health', '/note/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'pure-books',
    version: '3.0.0',
    googleAuth: googleBooks.getStatus().authenticated,
    timestamp: new Date().toISOString()
  });
});

app.get(['/api/auth/status', '/books/api/auth/status', '/read/api/auth/status', '/note/api/auth/status'], (req, res) => {
  res.json({ authRequired: Boolean(APP_PASSWORD) });
});

app.post(['/api/auth/verify', '/books/api/auth/verify', '/read/api/auth/verify', '/note/api/auth/verify'], (req, res) => {
  const { password } = req.body;
  if (!APP_PASSWORD || password === APP_PASSWORD) {
    return res.json({ valid: true });
  }
  return res.status(401).json({ valid: false, error: 'Incorrect password' });
});

app.get(['/api/config', '/books/api/config', '/read/api/config', '/note/api/config'], (req, res) => {
  const status = googleBooks.getStatus();
  res.json({
    authRequired: Boolean(APP_PASSWORD),
    google: status,
    appVersion: '3.0.0'
  });
});

app.post(['/api/config', '/books/api/config', '/read/api/config', '/note/api/config'], requireAuth, async (req, res) => {
  try {
    const { clientId, clientSecret, apiKey } = req.body;
    const status = await googleBooks.setConfig({ clientId, clientSecret, apiKey });
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Google OAuth & Token Endpoints
// ----------------------------------------------------
app.get(['/api/auth/google/url', '/books/api/auth/google/url'], requireAuth, (req, res) => {
  try {
    const customRedirect = req.query.redirectUri;
    const url = googleBooks.getAuthUrl(customRedirect);
    res.json({ url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get(['/api/auth/google/callback', '/books/api/auth/google/callback'], async (req, res) => {
  const { code, error, state } = req.query;
  const isSubpath = req.path.startsWith('/books');
  const returnBase = isSubpath ? '/books/' : '/';

  if (error) {
    console.error(`[Pure-Books] Google OAuth error from provider: ${error}`);
    return res.redirect(`${returnBase}?auth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(`${returnBase}?auth_error=${encodeURIComponent('Missing authorization code')}`);
  }

  try {
    let redirectUri = '';
    if (state) {
      try {
        const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (parsedState.redirectUri) {
          redirectUri = parsedState.redirectUri.trim();
        }
      } catch (err) {
        console.warn('[Pure-Books] Could not parse OAuth state parameter:', err.message);
      }
    }

    if (!redirectUri) {
      const proto = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('x-forwarded-host') || req.get('host');
      redirectUri = `${proto}://${host}${isSubpath ? '/books' : ''}/api/auth/google/callback`;
    }

    console.log(`[Pure-Books] Exchanging code with redirectUri: "${redirectUri}"`);
    await googleBooks.exchangeCode(code, redirectUri);
    res.redirect(`${returnBase}?auth=success`);
  } catch (err) {
    console.error('[Pure-Books] OAuth callback error:', err);
    res.redirect(`${returnBase}?auth_error=${encodeURIComponent(err.message)}`);
  }
});

app.post(['/api/auth/token', '/books/api/auth/token'], requireAuth, async (req, res) => {
  try {
    const { accessToken, refreshToken, apiKey } = req.body;
    const status = await googleBooks.setManualToken(accessToken, refreshToken, apiKey);
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post(['/api/auth/logout', '/books/api/auth/logout'], requireAuth, async (req, res) => {
  try {
    const status = await googleBooks.logout();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Google Bookshelf & Sync Endpoints
// ----------------------------------------------------
app.get(['/api/bookshelves', '/books/api/bookshelves'], requireAuth, async (req, res) => {
  try {
    const books = await readLibrary();
    let googleShelves = [];

    if (googleBooks.getStatus().authenticated) {
      try {
        const resp = await googleBooks.listBookshelves();
        if (resp && resp.items) {
          googleShelves = resp.items.map(s => ({
            id: String(s.id),
            title: s.title,
            volumeCount: s.volumeCount || 0,
            access: s.access,
            updated: s.updated
          }));
        }
      } catch (e) {
        console.warn('[Pure-Books] Could not fetch remote bookshelves:', e.message);
      }
    }

    const shelvesWithCounts = DEFAULT_BOOKSHELVES.map(shelf => {
      let count = 0;
      if (shelf.id === 'all') {
        count = books.length;
      } else {
        count = books.filter(b =>
          b.shelfId === shelf.id ||
          b.shelf === shelf.slug ||
          (Array.isArray(b.shelves) && b.shelves.some(s => s.id === shelf.id || s.slug === shelf.slug))
        ).length;
      }

      const gMatch = googleShelves.find(gs => gs.id === shelf.id);

      return {
        ...shelf,
        volumeCount: count,
        remoteVolumeCount: gMatch ? gMatch.volumeCount : count
      };
    });

    res.json({
      bookshelves: shelvesWithCounts,
      remoteShelves: googleShelves,
      authenticated: googleBooks.getStatus().authenticated
    });
  } catch (err) {
    console.error('[Pure-Books] Error in /bookshelves:', err);
    res.status(500).json({ error: 'Failed to retrieve bookshelves' });
  }
});

app.post(['/api/sync', '/books/api/sync'], requireAuth, async (req, res) => {
  if (!googleBooks.getStatus().authenticated) {
    return res.status(401).json({ error: 'Google account not connected' });
  }

  try {
    const remoteShelvesRes = await googleBooks.listBookshelves();
    const remoteShelves = remoteShelvesRes?.items || [];
    const batchItems = [];

    for (const shelf of remoteShelves) {
      if (shelf.volumeCount > 0) {
        try {
          let startIndex = 0;
          const pageSize = 40;
          while (true) {
            const volumesRes = await googleBooks.getShelfVolumes(shelf.id, pageSize, startIndex);
            const items = volumesRes?.items || [];
            if (items.length === 0) break;

            for (const item of items) {
              const vi = item.volumeInfo || {};
              const shelfMapping = DEFAULT_BOOKSHELVES.find(s => s.id === String(shelf.id));
              const shelfSlug = shelfMapping ? shelfMapping.slug : 'purchased';

              batchItems.push({
                id: item.id,
                title: vi.title || 'Untitled',
                subtitle: vi.subtitle || '',
                authors: vi.authors || ['Unknown Author'],
                publisher: vi.publisher || '',
                publishedDate: vi.publishedDate || '',
                description: vi.description || '',
                pageCount: vi.pageCount || 0,
                categories: vi.categories || [],
                averageRating: vi.averageRating || null,
                ratingsCount: vi.ratingsCount || null,
                shelf: shelfSlug,
                shelfId: String(shelf.id),
                shelfName: shelf.title,
                imageLinks: vi.imageLinks || {},
                previewLink: vi.previewLink || '',
                webReaderLink: item.accessInfo?.webReaderLink || `https://play.google.com/books/reader?id=${item.id}`,
                canonicalVolumeLink: vi.canonicalVolumeLink || `https://play.google.com/store/books/details?id=${item.id}`,
                accessInfo: item.accessInfo || {}
              });
            }

            startIndex += items.length;
            if (startIndex >= (volumesRes.totalItems || 0) || items.length < pageSize) {
              break;
            }
          }
        } catch (shelfErr) {
          console.warn(`[Pure-Books] Failed syncing shelf ${shelf.title}:`, shelfErr.message);
        }
      }
    }

    if (batchItems.length > 0) {
      await addBooksBatch(batchItems);
    }

    const updatedLibrary = await readLibrary();
    res.json({
      success: true,
      syncedVolumes: batchItems.length,
      totalVolumes: updatedLibrary.length
    });
  } catch (err) {
    console.error('[Pure-Books] Sync error:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// ----------------------------------------------------
// Google Volume Search & Details
// ----------------------------------------------------
app.get(['/api/volumes/search', '/books/api/volumes/search'], requireAuth, async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const results = await googleBooks.searchVolumes(query, 24);
    const items = (results.items || []).map(item => {
      const vi = item.volumeInfo || {};
      return {
        id: item.id,
        title: vi.title || 'Untitled',
        subtitle: vi.subtitle || '',
        authors: vi.authors || ['Unknown Author'],
        publisher: vi.publisher || '',
        publishedDate: vi.publishedDate || '',
        description: vi.description || '',
        pageCount: vi.pageCount || 0,
        categories: vi.categories || [],
        averageRating: vi.averageRating || null,
        ratingsCount: vi.ratingsCount || null,
        imageLinks: vi.imageLinks || {},
        previewLink: vi.previewLink || '',
        webReaderLink: item.accessInfo?.webReaderLink || `http://play.google.com/books/reader?id=${item.id}`,
        canonicalVolumeLink: vi.canonicalVolumeLink || `https://play.google.com/store/books/details?id=${item.id}`
      };
    });

    res.json({
      totalItems: results.totalItems || items.length,
      items
    });
  } catch (err) {
    console.error('[Pure-Books] Search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search Google Books' });
  }
});

app.get(['/api/volumes/:id', '/books/api/volumes/:id'], requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const library = await readLibrary();
    const local = library.find(b => b.id === id);

    let remoteInfo = null;
    try {
      remoteInfo = await googleBooks.getVolume(id);
    } catch {}

    if (local) {
      return res.json({ ...local, remote: remoteInfo });
    }

    if (remoteInfo) {
      const vi = remoteInfo.volumeInfo || {};
      return res.json({
        id: remoteInfo.id,
        title: vi.title || 'Untitled',
        subtitle: vi.subtitle || '',
        authors: vi.authors || ['Unknown Author'],
        publisher: vi.publisher || '',
        publishedDate: vi.publishedDate || '',
        description: vi.description || '',
        pageCount: vi.pageCount || 0,
        categories: vi.categories || [],
        averageRating: vi.averageRating || null,
        imageLinks: vi.imageLinks || {},
        previewLink: vi.previewLink || '',
        webReaderLink: remoteInfo.accessInfo?.webReaderLink || `http://play.google.com/books/reader?id=${remoteInfo.id}`,
        canonicalVolumeLink: vi.canonicalVolumeLink || `https://play.google.com/store/books/details?id=${remoteInfo.id}`
      });
    }

    res.status(404).json({ error: 'Book volume not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/api/volumes/:id/readingPosition', '/books/api/volumes/:id/readingPosition'], requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const library = await readLibrary();
    const book = library.find(b => b.id === id);
    let remotePos = null;

    if (googleBooks.getStatus().authenticated) {
      try {
        remotePos = await googleBooks.getReadingPosition(id);
      } catch {}
    }

    res.json({
      localProgress: book?.progress || 0,
      currentPage: book?.currentPage || 0,
      remotePosition: remotePos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/volumes/:id/readingPosition', '/books/api/volumes/:id/readingPosition'], requireAuth, async (req, res) => {
  const { id } = req.params;
  const { progress, currentPage } = req.body;

  try {
    const updated = await updateBook(id, {
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      currentPage: Number(currentPage) || 0,
      lastReadAt: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Book Library CRUD Endpoints
// ----------------------------------------------------
app.get(['/api/current', '/books/api/current'], async (req, res) => {
  try {
    const books = await readLibrary();
    const readingNow =
      books.find(b => b.shelf === 'reading-now' || b.shelfId === '3' || (Array.isArray(b.shelves) && b.shelves.some(s => s.slug === 'reading-now' || s.id === '3'))) ||
      books.find(b => (b.progress || 0) > 0 && (b.progress || 0) < 100) ||
      books[0];

    if (!readingNow) {
      return res.json({
        title: 'Designing Data-Intensive Applications',
        author: 'Martin Kleppmann',
        progress: 68,
        pagesRead: 412,
        totalPages: 616,
        goalDaysStreak: 14
      });
    }

    const totalPages = readingNow.pageCount || 320;
    const progress = readingNow.progress || 35;
    const pagesRead = readingNow.currentPage || Math.round((progress / 100) * totalPages);

    res.json({
      id: readingNow.id,
      title: readingNow.title,
      author: Array.isArray(readingNow.authors) ? readingNow.authors.join(', ') : 'Unknown Author',
      progress,
      pagesRead,
      totalPages,
      goalDaysStreak: 14
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve current book' });
  }
});

app.get(['/api/library', '/books/api/library'], requireAuth, async (req, res) => {
  try {
    const books = await readLibrary();
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read library' });
  }
});

app.post(['/api/library', '/books/api/library'], requireAuth, async (req, res) => {
  try {
    const bookData = req.body;
    if (!bookData.title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const saved = await addBook(bookData);

    if (googleBooks.getStatus().authenticated && bookData.shelfId && bookData.id) {
      googleBooks.addVolumeToShelf(bookData.shelfId, bookData.id).catch(err => {
        console.warn('[Pure-Books] Failed remote addVolume:', err.message);
      });
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add book to library' });
  }
});

app.patch(['/api/library/:id', '/books/api/library/:id'], requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updated = await updateBook(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (googleBooks.getStatus().authenticated && updates.shelfId) {
      googleBooks.addVolumeToShelf(updates.shelfId, id).catch(e => {
        console.warn('[Pure-Books] Remote shelf update warning:', e.message);
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete(['/api/library/:id', '/books/api/library/:id'], requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const success = await deleteBook(id);
    if (!success) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// ----------------------------------------------------
// Articles / Pure-Read Endpoints
// ----------------------------------------------------
app.get(['/api/articles', '/books/api/articles', '/read/api/articles'], requireAuth, async (req, res) => {
  try {
    const { filter = 'all', q = '', tag } = req.query;
    let articles = await readArticles();

    if (filter === 'unread') {
      articles = articles.filter(a => !a.read);
    } else if (filter === 'starred') {
      articles = articles.filter(a => a.starred);
    } else if (filter === 'archive') {
      articles = articles.filter(a => a.read);
    }

    if (tag) {
      articles = articles.filter(a => a.tags && a.tags.includes(tag));
    }

    if (q) {
      const query = q.toLowerCase();
      articles = articles.filter(a =>
        (a.title && a.title.toLowerCase().includes(query)) ||
        (a.siteName && a.siteName.toLowerCase().includes(query)) ||
        (a.author && a.author.toLowerCase().includes(query)) ||
        (a.excerpt && a.excerpt.toLowerCase().includes(query))
      );
    }

    const isSummary = req.query.summary === 'true';
    if (isSummary) {
      articles = articles.map(({ content, markdown, ...rest }) => rest);
    }

    res.json(articles);
  } catch (err) {
    console.error('Failed to get articles:', err);
    res.status(500).json({ error: 'Failed to retrieve articles' });
  }
});

app.post(['/api/articles', '/books/api/articles', '/read/api/articles'], requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const parsedArticle = await parseArticleUrl(url);
    const saved = await addArticle(parsedArticle);
    res.status(201).json(saved);
  } catch (err) {
    console.error('Failed to parse article:', err);
    res.status(422).json({ error: err.message || 'Failed to parse article' });
  }
});

// Webhook & Bookmarklet Ingest
app.all(['/api/inbox', '/books/api/inbox', '/read/api/inbox', '/api/webhook', '/books/api/webhook', '/read/api/webhook'], requireAuth, async (req, res) => {
  let targetUrl = '';

  if (req.body && typeof req.body === 'object' && req.body.url) {
    targetUrl = req.body.url;
  } else if (req.query.url) {
    targetUrl = req.query.url;
  } else if (typeof req.body === 'string' && req.body.trim().startsWith('http')) {
    targetUrl = req.body.trim();
  }

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing article URL parameter or payload' });
  }

  try {
    const parsed = await parseArticleUrl(targetUrl);
    const saved = await addArticle(parsed);

    if (req.query.redirect === 'true' || req.query.bookmarklet === 'true') {
      return res.send(`
        <!DOCTYPE html>
        <html><head><title>Saved to Pure Books</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>body{background:#2e3440;color:#eceff4;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
        .card{background:#3b4252;padding:2rem;border-radius:1rem;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.3);max-width:90%;}
        h2{margin-bottom:0.5rem;color:#88c0d0;}p{font-size:0.9rem;color:#d8dee9;}button{background:#88c0d0;color:#2e3440;border:none;padding:0.5rem 1rem;border-radius:0.5rem;font-weight:bold;margin-top:1rem;cursor:pointer;}</style>
        </head><body><div class="card"><h2>✓ Saved to Pure Books</h2><p>${saved.title}</p><button onclick="window.close()">Close</button></div>
        <script>setTimeout(() => window.close(), 2500);</script></body></html>
      `);
    }

    return res.status(201).json({
      success: true,
      message: 'Article successfully stashed in Pure Books',
      article: {
        id: saved.id,
        title: saved.title,
        url: saved.url,
        wordCount: saved.wordCount
      }
    });
  } catch (err) {
    console.error('[pure-books] Webhook ingest error:', err);
    res.status(422).json({ error: err.message || 'Failed to parse and stash article' });
  }
});

// RSS Feeds Endpoints
app.get(['/api/feeds', '/books/api/feeds', '/read/api/feeds'], requireAuth, async (req, res) => {
  try {
    const feeds = await readFeeds();
    res.json(feeds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve feeds' });
  }
});

app.post(['/api/feeds', '/books/api/feeds', '/read/api/feeds'], requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Feed URL is required' });
  try {
    const newFeed = await addFeed(url);
    res.status(201).json(newFeed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to add feed' });
  }
});

app.delete(['/api/feeds/:id', '/books/api/feeds/:id', '/read/api/feeds/:id'], requireAuth, async (req, res) => {
  try {
    const success = await deleteFeed(req.params.id);
    if (!success) return res.status(404).json({ error: 'Feed not found' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

app.post(['/api/feeds/sync', '/books/api/feeds/sync', '/read/api/feeds/sync'], requireAuth, async (req, res) => {
  try {
    const result = await syncFeeds(req.body?.maxPerFeed || 5);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// Upload Document (PDF, DOCX) and convert via MarkItDown
app.post(['/api/articles/upload', '/books/api/articles/upload', '/read/api/articles/upload'], requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  try {
    const parsedArticle = await parseUploadedFile(filePath, originalName);
    const saved = await addArticle(parsedArticle);
    res.status(201).json(saved);
  } catch (err) {
    console.error('Failed to parse uploaded document:', err);
    res.status(422).json({ error: err.message || 'Failed to parse document with MarkItDown' });
  } finally {
    try {
      await fsPromises.unlink(filePath);
    } catch {}
  }
});

// Get Single Article (with full content & markdown)
app.get(['/api/articles/:id', '/books/api/articles/:id', '/read/api/articles/:id'], requireAuth, async (req, res) => {
  try {
    const article = await getArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (err) {
    console.error('Failed to get article:', err);
    res.status(500).json({ error: 'Failed to retrieve article' });
  }
});

// Update Article
app.patch(['/api/articles/:id', '/books/api/articles/:id', '/read/api/articles/:id'], requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updated = await updateArticle(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Failed to update article:', err);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Delete Article
app.delete(['/api/articles/:id', '/books/api/articles/:id', '/read/api/articles/:id'], requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const success = await deleteArticle(id);
    if (!success) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to delete article:', err);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// ----------------------------------------------------
// Export & Backup Endpoints
// ----------------------------------------------------
async function resolveExportArticles(req) {
  let articles = await readArticles();
  const { ids, filter, q, tag } = req.query;

  if (ids) {
    const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
    articles = articles.filter(a => idList.includes(a.id));
  } else {
    if (filter === 'unread') {
      articles = articles.filter(a => !a.read);
    } else if (filter === 'starred') {
      articles = articles.filter(a => a.starred);
    } else if (filter === 'archive') {
      articles = articles.filter(a => a.read);
    }
    if (tag) {
      articles = articles.filter(a => a.tags && a.tags.includes(tag));
    }
    if (q) {
      const query = q.toLowerCase();
      articles = articles.filter(a =>
        (a.title && a.title.toLowerCase().includes(query)) ||
        (a.siteName && a.siteName.toLowerCase().includes(query)) ||
        (a.author && a.author.toLowerCase().includes(query)) ||
        (a.excerpt && a.excerpt.toLowerCase().includes(query))
      );
    }
  }
  return articles;
}

// Export Articles as JSON
app.get(['/api/export/articles', '/books/api/export/articles', '/read/api/export'], requireAuth, async (req, res) => {
  try {
    const articles = await resolveExportArticles(req);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=pure-read-export-${Date.now()}.json`);
    res.send(JSON.stringify(articles, null, 2));
  } catch (err) {
    console.error('Export articles JSON failed:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export Books as JSON
app.get(['/api/export/books', '/books/api/export/books'], requireAuth, async (req, res) => {
  try {
    const books = await readLibrary();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=pure-books-export-${Date.now()}.json`);
    res.send(JSON.stringify({
      app: 'pure-books',
      exportedAt: new Date().toISOString(),
      books
    }, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Generic /api/export router: checks ?type=articles vs ?type=books (default books)
app.get(['/api/export', '/books/api/export'], requireAuth, async (req, res) => {
  if (req.query.type === 'articles') {
    try {
      const articles = await resolveExportArticles(req);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=pure-read-export-${Date.now()}.json`);
      return res.send(JSON.stringify(articles, null, 2));
    } catch (err) {
      return res.status(500).json({ error: 'Export failed' });
    }
  }

  // Default to Books JSON
  try {
    const books = await readLibrary();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=pure-books-export-${Date.now()}.json`);
    res.send(JSON.stringify({
      app: 'pure-books',
      exportedAt: new Date().toISOString(),
      books
    }, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export Articles as EPUB 3 eBook
app.get(['/api/export/epub', '/books/api/export/epub', '/read/api/export/epub'], requireAuth, async (req, res) => {
  try {
    const articles = await resolveExportArticles(req);
    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: 'No articles found to export' });
    }
    const title = req.query.title || (articles.length === 1 ? articles[0].title : `Pure Read Digest - ${new Date().toISOString().slice(0, 10)}`);
    const epubBuffer = await generateEpub(articles, { title });

    const safeFilename = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'pure-read-digest';
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.epub"`);
    res.setHeader('Content-Length', epubBuffer.length);
    res.end(epubBuffer);
  } catch (err) {
    console.error('Export EPUB failed:', err);
    res.status(500).json({ error: err.message || 'Export EPUB failed' });
  }
});

// Export Articles as Standalone Offline HTML Bundle
app.get(['/api/export/html', '/books/api/export/html', '/read/api/export/html'], requireAuth, async (req, res) => {
  try {
    const articles = await resolveExportArticles(req);
    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: 'No articles found to export' });
    }
    const title = req.query.title || (articles.length === 1 ? articles[0].title : `Pure Read Digest - ${new Date().toISOString().slice(0, 10)}`);
    const htmlBundle = await generateHtmlBundle(articles, { title });

    const safeFilename = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'pure-read-digest';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.html"`);
    res.send(htmlBundle);
  } catch (err) {
    console.error('Export HTML failed:', err);
    res.status(500).json({ error: err.message || 'Export HTML failed' });
  }
});

// Single Article EPUB Export
app.get(['/api/articles/:id/epub', '/books/api/articles/:id/epub', '/read/api/articles/:id/epub'], requireAuth, async (req, res) => {
  try {
    const articles = await readArticles();
    const article = articles.find(a => a.id === req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    const epubBuffer = await generateEpub([article], { title: article.title });
    const safeFilename = (article.title || 'article').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.epub"`);
    res.setHeader('Content-Length', epubBuffer.length);
    res.end(epubBuffer);
  } catch (err) {
    console.error('Single EPUB export failed:', err);
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

// Single Article Offline HTML Export
app.get(['/api/articles/:id/html', '/books/api/articles/:id/html', '/read/api/articles/:id/html'], requireAuth, async (req, res) => {
  try {
    const articles = await readArticles();
    const article = articles.find(a => a.id === req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    const htmlBundle = await generateHtmlBundle([article], { title: article.title });
    const safeFilename = (article.title || 'article').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.html"`);
    res.send(htmlBundle);
  } catch (err) {
    console.error('Single HTML export failed:', err);
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

// Import Books JSON
app.post(['/api/import', '/books/api/import', '/api/import/books'], requireAuth, async (req, res) => {
  try {
    const { books } = req.body;
    if (!Array.isArray(books)) {
      return res.status(400).json({ error: 'Invalid format: expected array of books' });
    }

    const validBooks = books.filter(b => b && b.title);
    if (validBooks.length > 0) {
      await addBooksBatch(validBooks);
    }

    const library = await readLibrary();
    res.json({ success: true, imported: validBooks.length, total: library.length });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// Import Articles JSON
app.post(['/api/import/articles', '/books/api/import/articles', '/read/api/import'], requireAuth, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.articles;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid format: expected array of articles' });
    }

    let count = 0;
    for (const item of items) {
      if (item.url && item.title) {
        await addArticle(item);
        count++;
      }
    }

    const articles = await readArticles();
    res.json({ success: true, imported: count, total: articles.length });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// ----------------------------------------------------
// Notes / Pure-Note Endpoints
// ----------------------------------------------------
app.get(['/api/notes', '/books/api/notes', '/note/api/notes'], requireAuth, async (req, res) => {
  try {
    const { q, tag, pinned } = req.query;
    let notes = await readNotesMetadata();

    if (pinned === 'true') {
      notes = notes.filter(n => n.pinned);
    }
    if (tag) {
      notes = notes.filter(n => n.tags && n.tags.includes(tag.toLowerCase()));
    }
    if (q) {
      const query = q.toLowerCase();
      notes = notes.filter(n =>
        (n.title && n.title.toLowerCase().includes(query)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(query)))
      );
    }
    res.json(notes);
  } catch (err) {
    console.error('[pure-books] Failed to list notes:', err);
    res.status(500).json({ error: 'Failed to retrieve notes' });
  }
});

app.get(['/api/notes/daily/today', '/books/api/notes/daily/today', '/note/api/notes/daily/today'], requireAuth, async (req, res) => {
  try {
    const note = await getTodayDailyNote();
    res.json(note);
  } catch (err) {
    console.error('[pure-books] Failed to fetch daily note:', err);
    res.status(500).json({ error: 'Failed to load daily note' });
  }
});

app.get(['/api/scratchpad', '/books/api/scratchpad', '/note/api/scratchpad'], requireAuth, async (req, res) => {
  try {
    const scratchpad = await getScratchpad();
    res.json(scratchpad);
  } catch (err) {
    console.error('[pure-books] Failed to load scratchpad:', err);
    res.status(500).json({ error: 'Failed to load scratchpad' });
  }
});

app.put(['/api/scratchpad', '/books/api/scratchpad', '/note/api/scratchpad'], requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    await saveScratchpad(content);
    res.json({ success: true });
  } catch (err) {
    console.error('[pure-books] Failed to save scratchpad:', err);
    res.status(500).json({ error: 'Failed to save scratchpad' });
  }
});

app.get(['/api/notes/:id', '/books/api/notes/:id', '/note/api/notes/:id'], requireAuth, async (req, res) => {
  try {
    const note = await getNote(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (err) {
    console.error('[pure-books] Failed to get note:', err);
    res.status(500).json({ error: 'Failed to retrieve note' });
  }
});

app.post(['/api/notes', '/books/api/notes', '/note/api/notes'], requireAuth, async (req, res) => {
  try {
    const { title, content, pinned, tags } = req.body;
    const note = await saveNote({ title, content, pinned, tags });
    res.status(201).json(note);
  } catch (err) {
    console.error('[pure-books] Failed to create note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.put(['/api/notes/:id', '/books/api/notes/:id', '/note/api/notes/:id'], requireAuth, async (req, res) => {
  try {
    const { title, content, pinned, tags } = req.body;
    const note = await saveNote({ id: req.params.id, title, content, pinned, tags });
    res.json(note);
  } catch (err) {
    console.error('[pure-books] Failed to update note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete(['/api/notes/:id', '/books/api/notes/:id', '/note/api/notes/:id'], requireAuth, async (req, res) => {
  try {
    const success = await deleteNote(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('[pure-books] Failed to delete note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Export Notes as JSON
app.get(['/api/export/notes', '/books/api/export/notes', '/note/api/export'], requireAuth, async (req, res) => {
  try {
    const notesMeta = await readNotesMetadata();
    const fullNotes = [];
    for (const m of notesMeta) {
      const full = await getNote(m.id);
      if (full) fullNotes.push(full);
    }
    const scratchpad = await getScratchpad();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=pure-notes-export-${Date.now()}.json`);
    res.send(JSON.stringify({
      app: 'pure-notes',
      exportedAt: new Date().toISOString(),
      scratchpad: scratchpad.content,
      notes: fullNotes
    }, null, 2));
  } catch (err) {
    console.error('[pure-books] Failed to export notes:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ----------------------------------------------------
// Static Production Frontend Serving
// ----------------------------------------------------
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use('/books', express.static(distPath));
  app.use('/read', express.static(distPath));
  app.use('/note', express.static(distPath));
  app.use('/books-assets', express.static(path.join(distPath, 'books-assets')));
  app.use('/read-assets', express.static(path.join(distPath, 'books-assets')));
  app.use('/note-assets', express.static(path.join(distPath, 'books-assets')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`[Pure-Books] Unified server running on port ${PORT}`);
  console.log(`[Pure-Books] Auth protection: ${APP_PASSWORD ? 'ENABLED' : 'DISABLED'}`);
  console.log(`[Pure-Books] Books data path: ${getBooksFilePath()}`);
  console.log(`[Pure-Books] Articles data path: ${getArticlesFilePath()}`);
  console.log(`[Pure-Books] Google OAuth configured: ${googleBooks.getStatus().hasClientId ? 'YES' : 'NO'}`);
  startFeedScheduler(30);
});

process.on('SIGTERM', () => {
  stopFeedScheduler();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  stopFeedScheduler();
  server.close(() => process.exit(0));
});
