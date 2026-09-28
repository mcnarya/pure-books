import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { googleBooks } from './googleBooks.js';
import {
  readLibrary,
  writeLibrary,
  addBook,
  updateBook,
  deleteBook,
  DEFAULT_BOOKSHELVES
} from './storage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3004;
const APP_PASSWORD = process.env.APP_PASSWORD || process.env.PASSWORD || '';

app.use(cors());
app.use(express.json({ limit: '20mb' }));

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
// Health & Config Endpoints
// ----------------------------------------------------
app.get(['/api/health', '/books/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'pure-books',
    version: '1.0.0',
    googleAuth: googleBooks.getStatus().authenticated,
    timestamp: new Date().toISOString()
  });
});

app.get(['/api/config', '/books/api/config'], (req, res) => {
  const status = googleBooks.getStatus();
  res.json({
    authRequired: Boolean(APP_PASSWORD),
    google: status,
    appVersion: '1.0.0'
  });
});

app.post(['/api/config', '/books/api/config'], requireAuth, async (req, res) => {
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

    // Fallback if state is missing
    if (!redirectUri) {
      const proto = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('x-forwarded-host') || req.get('host');
      redirectUri = `${proto}://${host}${isSubpath ? '/books' : ''}/api/auth/google/callback`;
    }

    console.log(`[Pure-Books] Exchanging code with redirectUri: "${redirectUri}"`);
    await googleBooks.exchangeCode(code, redirectUri);
    // Redirect back to the web UI
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
// Bookshelf & Sync Endpoints
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

    // Compute volume count per shelf from local library
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

      // Check if remote shelf exists
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

// Sync user's Google Play Books library into local cache
app.post(['/api/sync', '/books/api/sync'], requireAuth, async (req, res) => {
  if (!googleBooks.getStatus().authenticated) {
    return res.status(401).json({ error: 'Google account not connected' });
  }

  try {
    const remoteShelvesRes = await googleBooks.listBookshelves();
    const remoteShelves = remoteShelvesRes?.items || [];
    let importedCount = 0;

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

              const bookData = {
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
              };

              await addBook(bookData);
              importedCount++;
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

    const updatedLibrary = await readLibrary();
    res.json({
      success: true,
      syncedVolumes: importedCount,
      totalVolumes: updatedLibrary.length
    });
  } catch (err) {
    console.error('[Pure-Books] Sync error:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// ----------------------------------------------------
// Volume Search & Details
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
    // Check local library first
    const library = await readLibrary();
    const local = library.find(b => b.id === id);

    // Fetch fresh volume info from Google Books API
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

// Reading Position Sync
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
// Local Library CRUD Endpoints
// ----------------------------------------------------
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

    // If authenticated and shelfId provided, also add to Google Play Books shelf
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

    // If shelf changed and authenticated, reflect on Google Play Books
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

// Export library as JSON
app.get(['/api/export', '/books/api/export'], requireAuth, async (req, res) => {
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

// Import library from JSON
app.post(['/api/import', '/books/api/import'], requireAuth, async (req, res) => {
  try {
    const { books } = req.body;
    if (!Array.isArray(books)) {
      return res.status(400).json({ error: 'Invalid format: expected array of books' });
    }

    let count = 0;
    for (const b of books) {
      if (b.title) {
        await addBook(b);
        count++;
      }
    }

    const library = await readLibrary();
    res.json({ success: true, imported: count, total: library.length });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// ----------------------------------------------------
// Static Production Frontend Serving
// ----------------------------------------------------
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use('/books', express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[Pure-Books] Server running on port ${PORT}`);
  console.log(`[Pure-Books] Auth protection: ${APP_PASSWORD ? 'ENABLED' : 'DISABLED'}`);
  console.log(`[Pure-Books] Google OAuth configured: ${googleBooks.getStatus().hasClientId ? 'YES' : 'NO'}`);
});
