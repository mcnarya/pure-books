import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

export function getBooksFilePath() {
  if (process.env.BOOKS_DATA_PATH) {
    return process.env.BOOKS_DATA_PATH;
  }
  if (process.env.DATA_PATH) {
    if (path.basename(process.env.DATA_PATH) !== 'articles.json') {
      return process.env.DATA_PATH;
    }
    return path.join(path.dirname(process.env.DATA_PATH), 'library.json');
  }
  return path.join(process.cwd(), 'data', 'library.json');
}

const DATA_PATH = getBooksFilePath();

// Known legacy seed book IDs to strip out so library contains ONLY genuine Google Books
const LEGACY_SEED_IDS = new Set([
  'gB5ZAAAAMAAJ',
  'zyTCAlFPjgYC',
  'fV8tDwAAQBAJ',
  'Vnw6DwAAQBAJ',
  '1oUoDwAAQBAJ',
  '17l0DwAAQBAJ'
]);

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Standard Google Play Books bookshelf mapping
export const DEFAULT_BOOKSHELVES = [
  { id: "all", slug: "all", title: "All Books", icon: "Library" },
  { id: "1", slug: "purchased", title: "Purchased", icon: "ShoppingBag" },
  { id: "0", slug: "favorites", title: "Favorites", icon: "Star" },
  { id: "3", slug: "reading-now", title: "Reading Now", icon: "BookOpen" },
  { id: "2", slug: "to-read", title: "To Read", icon: "Clock" },
  { id: "4", slug: "have-read", title: "Have Read", icon: "CheckCircle2" },
  { id: "7", slug: "uploaded", title: "My eBooks", icon: "UploadCloud" }
];

let memoryBooks = null;

export async function readLibrary() {
  if (memoryBooks !== null) {
    return memoryBooks;
  }
  ensureDir(DATA_PATH);
  try {
    if (!fs.existsSync(DATA_PATH)) {
      memoryBooks = [];
      await writeLibrary([]);
      return memoryBooks;
    }
    const raw = await fsPromises.readFile(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const books = Array.isArray(parsed) ? parsed : (parsed.books || []);
    // Ensure only real Google Books are returned (filter out legacy dummy seeds)
    const cleaned = books.filter(b => b.id && !LEGACY_SEED_IDS.has(b.id));
    memoryBooks = cleaned;
    if (cleaned.length !== books.length) {
      await writeLibrary(cleaned);
    }
    return memoryBooks;
  } catch (err) {
    console.error('[Pure-Books] Error reading library file:', err);
    memoryBooks = [];
    return memoryBooks;
  }
}

export async function writeLibrary(books) {
  memoryBooks = books;
  ensureDir(DATA_PATH);
  const tempPath = `${DATA_PATH}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const data = JSON.stringify({ books, updatedAt: new Date().toISOString() }, null, 2);
  await fsPromises.writeFile(tempPath, data, 'utf-8');
  await fsPromises.rename(tempPath, DATA_PATH);
}

function mergeBookIntoList(books, bookData) {
  const existingIndex = books.findIndex(b => b.id === bookData.id);

  if (existingIndex >= 0) {
    const existing = books[existingIndex];
    const existingShelves = Array.isArray(existing.shelves) ? existing.shelves : (existing.shelfId ? [{ id: existing.shelfId, name: existing.shelfName, slug: existing.shelf }] : []);
    const newShelf = bookData.shelfId ? { id: bookData.shelfId, name: bookData.shelfName, slug: bookData.shelf } : null;
    const mergedShelves = [...existingShelves];
    if (newShelf && !mergedShelves.some(s => s.id === newShelf.id)) {
      mergedShelves.push(newShelf);
    }

    books[existingIndex] = {
      ...existing,
      ...bookData,
      shelves: mergedShelves,
      favorite: existing.favorite || bookData.favorite || mergedShelves.some(s => s.id === '0' || s.slug === 'favorites'),
      updatedAt: new Date().toISOString()
    };
    return books[existingIndex];
  } else {
    const initialShelves = Array.isArray(bookData.shelves) ? bookData.shelves : (bookData.shelfId ? [{ id: bookData.shelfId, name: bookData.shelfName, slug: bookData.shelf }] : []);
    const added = {
      ...bookData,
      shelves: initialShelves,
      favorite: !!bookData.favorite || initialShelves.some(s => s.id === '0' || s.slug === 'favorites'),
      addedAt: bookData.addedAt || new Date().toISOString()
    };
    books.unshift(added);
    return added;
  }
}

export async function addBook(bookData) {
  const books = await readLibrary();
  const saved = mergeBookIntoList(books, bookData);
  await writeLibrary(books);
  return saved;
}

export async function addBooksBatch(bookItems) {
  const books = await readLibrary();
  for (const item of bookItems) {
    mergeBookIntoList(books, item);
  }
  await writeLibrary(books);
  return books;
}

export async function updateBook(id, updates) {
  const books = await readLibrary();
  const index = books.findIndex(b => b.id === id);
  if (index === -1) return null;

  books[index] = {
    ...books[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await writeLibrary(books);
  return books[index];
}

export async function deleteBook(id) {
  const books = await readLibrary();
  const filtered = books.filter(b => b.id !== id);
  if (filtered.length === books.length) return false;

  await writeLibrary(filtered);
  return true;
}
