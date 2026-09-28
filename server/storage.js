import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

const DATA_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'data', 'library.json');

// Ensure directory exists
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Curated seed books from Google Play Books catalog
const SEED_BOOKS = [
  {
    id: "gB5ZAAAAMAAJ",
    title: "The Design of Everyday Things",
    subtitle: "Revised and Expanded Edition",
    authors: ["Don Norman"],
    publisher: "Basic Books",
    publishedDate: "2013-11-05",
    description: "Even the smartest among us can feel inept as we try to figure out which light switch or oven burner to turn on, or whether to push, pull, or slide a door. The fault, argues cognitive scientist Don Norman, does not lie with ourselves, but with product design that ignores the needs of users and the principles of cognitive psychology.",
    pageCount: 368,
    categories: ["Design", "Psychology", "Technology"],
    averageRating: 4.5,
    ratingsCount: 1240,
    shelf: "reading-now", // reading-now, to-read, have-read, favorites, purchased
    shelfName: "Reading Now",
    shelfId: "3",
    imageLinks: {
      thumbnail: "https://books.google.com/books/content?id=gB5ZAAAAMAAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      smallThumbnail: "https://books.google.com/books/content?id=gB5ZAAAAMAAJ&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api"
    },
    previewLink: "https://books.google.com/books?id=gB5ZAAAAMAAJ&hl=&source=gbs_api",
    webReaderLink: "http://play.google.com/books/reader?id=gB5ZAAAAMAAJ&hl=&printsec=frontcover&source=gbs_api",
    canonicalVolumeLink: "https://play.google.com/store/books/details?id=gB5ZAAAAMAAJ",
    progress: 42,
    currentPage: 154,
    userNotes: "## Core Principles of Good Design\n\n- **Discoverability**: Is it possible to even figure out what actions are possible and where and how to perform them?\n- **Feedback**: There is full and continuous information about results of actions and current state.\n- **Conceptual Model**: The design projects all the information needed to create a good conceptual model of the system.",
    favorite: true,
    addedAt: "2026-09-01T10:00:00.000Z",
    lastReadAt: "2026-09-26T18:30:00.000Z"
  },
  {
    id: "zyTCAlFPjgYC",
    title: "Clean Code",
    subtitle: "A Handbook of Agile Software Craftsmanship",
    authors: ["Robert C. Martin"],
    publisher: "Pearson Education",
    publishedDate: "2008-08-01",
    description: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code. But it doesn't have to be that way.",
    pageCount: 464,
    categories: ["Computers", "Software Development"],
    averageRating: 4.7,
    ratingsCount: 4500,
    shelf: "reading-now",
    shelfName: "Reading Now",
    shelfId: "3",
    imageLinks: {
      thumbnail: "https://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      smallThumbnail: "https://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api"
    },
    previewLink: "https://books.google.com/books?id=zyTCAlFPjgYC&hl=&source=gbs_api",
    webReaderLink: "http://play.google.com/books/reader?id=zyTCAlFPjgYC&hl=&printsec=frontcover&source=gbs_api",
    canonicalVolumeLink: "https://play.google.com/store/books/details?id=zyTCAlFPjgYC",
    progress: 78,
    currentPage: 362,
    userNotes: "- Functions should do one thing. They should do it well. They should do it only.\n- Meaningful names: intention-revealing names save hours of cognitive overhead.",
    favorite: true,
    addedAt: "2026-08-15T09:20:00.000Z",
    lastReadAt: "2026-09-25T21:15:00.000Z"
  },
  {
    id: "d9e8DwAAQBAJ",
    title: "Klara and the Sun",
    subtitle: "A Novel",
    authors: ["Kazuo Ishiguro"],
    publisher: "Knopf",
    publishedDate: "2021-03-02",
    description: "From the bestselling and Nobel Prize-winning author of Never Let Me Go and The Remains of the Day, a stunning new novel that asks: What does it mean to love? Here is the story of Klara, an Artificial Friend with outstanding observational qualities, who, from her place in the store, watches carefully the behavior of those who come in to browse.",
    pageCount: 320,
    categories: ["Fiction", "Science Fiction", "Literary"],
    averageRating: 4.2,
    ratingsCount: 890,
    shelf: "to-read",
    shelfName: "To Read",
    shelfId: "2",
    imageLinks: {
      thumbnail: "https://books.google.com/books/content?id=d9e8DwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      smallThumbnail: "https://books.google.com/books/content?id=d9e8DwAAQBAJ&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api"
    },
    previewLink: "https://books.google.com/books?id=d9e8DwAAQBAJ&hl=&source=gbs_api",
    webReaderLink: "http://play.google.com/books/reader?id=d9e8DwAAQBAJ&hl=&printsec=frontcover&source=gbs_api",
    canonicalVolumeLink: "https://play.google.com/store/books/details?id=d9e8DwAAQBAJ",
    progress: 0,
    currentPage: 0,
    userNotes: "Recommended by reading club. Deep exploration of artificial consciousness and human affection.",
    favorite: false,
    addedAt: "2026-09-10T14:40:00.000Z",
    lastReadAt: null
  },
  {
    id: "NGgnCwAAQBAJ",
    title: "Designing Data-Intensive Applications",
    subtitle: "The Big Ideas Behind Reliable, Scalable, and Maintainable Systems",
    authors: ["Martin Kleppmann"],
    publisher: "O'Reilly Media",
    publishedDate: "2017-03-16",
    description: "Data is at the center of many challenges in system design today. Difficult issues need to be figured out, such as scalability, consistency, reliability, efficiency, and maintainability. In this practical and comprehensive guide, author Martin Kleppmann helps you navigate this diverse landscape.",
    pageCount: 616,
    categories: ["Computers", "Distributed Systems", "Database Design"],
    averageRating: 4.9,
    ratingsCount: 3200,
    shelf: "have-read",
    shelfName: "Have Read",
    shelfId: "4",
    imageLinks: {
      thumbnail: "https://books.google.com/books/content?id=NGgnCwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      smallThumbnail: "https://books.google.com/books/content?id=NGgnCwAAQBAJ&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api"
    },
    previewLink: "https://books.google.com/books?id=NGgnCwAAQBAJ&hl=&source=gbs_api",
    webReaderLink: "http://play.google.com/books/reader?id=NGgnCwAAQBAJ&hl=&printsec=frontcover&source=gbs_api",
    canonicalVolumeLink: "https://play.google.com/store/books/details?id=NGgnCwAAQBAJ",
    progress: 100,
    currentPage: 616,
    userNotes: "Essential reference book. Notes on consensus algorithms: Raft vs Paxos, partitioning, replication logs, LSM-trees vs B-trees.",
    favorite: true,
    addedAt: "2026-06-01T08:00:00.000Z",
    lastReadAt: "2026-08-20T17:00:00.000Z"
  },
  {
    id: "fV8tDwAAQBAJ",
    title: "Atomic Habits",
    subtitle: "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
    authors: ["James Clear"],
    publisher: "Avery",
    publishedDate: "2018-10-16",
    description: "No matter your goals, Atomic Habits offers a proven framework for improving—every day. James Clear, one of the world's leading experts on habit formation, reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.",
    pageCount: 320,
    categories: ["Self-Help", "Psychology", "Personal Growth"],
    averageRating: 4.8,
    ratingsCount: 6800,
    shelf: "have-read",
    shelfName: "Have Read",
    shelfId: "4",
    imageLinks: {
      thumbnail: "https://books.google.com/books/content?id=fV8tDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      smallThumbnail: "https://books.google.com/books/content?id=fV8tDwAAQBAJ&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api"
    },
    previewLink: "https://books.google.com/books?id=fV8tDwAAQBAJ&hl=&source=gbs_api",
    webReaderLink: "http://play.google.com/books/reader?id=fV8tDwAAQBAJ&hl=&printsec=frontcover&source=gbs_api",
    canonicalVolumeLink: "https://play.google.com/store/books/details?id=fV8tDwAAQBAJ",
    progress: 100,
    currentPage: 320,
    userNotes: "The 4 Laws of Behavior Change:\n1. Make it obvious\n2. Make it attractive\n3. Make it easy\n4. Make it satisfying",
    favorite: true,
    addedAt: "2026-07-11T12:00:00.000Z",
    lastReadAt: "2026-07-30T19:45:00.000Z"
  },
  {
    id: "Vnw6DwAAQBAJ",
    title: "Project Hail Mary",
    subtitle: "A Novel",
    authors: ["Andy Weir"],
    publisher: "Ballantine Books",
    publishedDate: "2021-05-04",
    description: "Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself are doomed. Except right now, he doesn't know that. He can't even remember his own name, let alone the nature of his assignment or how to complete it.",
    pageCount: 496,
    categories: ["Fiction", "Science Fiction", "Space Exploration"],
    averageRating: 4.8,
    ratingsCount: 5120,
    shelf: "favorites",
    shelfName: "Favorites",
    shelfId: "0",
    imageLinks: {
      thumbnail: "https://books.google.com/books/content?id=Vnw6DwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      smallThumbnail: "https://books.google.com/books/content?id=Vnw6DwAAQBAJ&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api"
    },
    previewLink: "https://books.google.com/books?id=Vnw6DwAAQBAJ&hl=&source=gbs_api",
    webReaderLink: "http://play.google.com/books/reader?id=Vnw6DwAAQBAJ&hl=&printsec=frontcover&source=gbs_api",
    canonicalVolumeLink: "https://play.google.com/store/books/details?id=Vnw6DwAAQBAJ",
    progress: 100,
    currentPage: 496,
    userNotes: "Amaze amaze amaze! Incredible hard sci-fi storytelling and companion character Rocky.",
    favorite: true,
    addedAt: "2026-05-18T10:15:00.000Z",
    lastReadAt: "2026-06-02T23:30:00.000Z"
  },
  {
    id: "1oUoDwAAQBAJ",
    title: "Neuromancer",
    subtitle: "Sprawl Trilogy Book 1",
    authors: ["William Gibson"],
    publisher: "Ace",
    publishedDate: "2000-07-01",
    description: "The sky above the port was the color of television, tuned to a dead channel. Case had been the sharpest data-thief in the business, until he crossed the wrong people and they destroyed his nervous system with a wartime Russian mycotoxin.",
    pageCount: 288,
    categories: ["Fiction", "Cyberpunk", "Science Fiction"],
    averageRating: 4.4,
    ratingsCount: 2900,
    shelf: "to-read",
    shelfName: "To Read",
    shelfId: "2",
    imageLinks: {
      thumbnail: "https://books.google.com/books/content?id=1oUoDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      smallThumbnail: "https://books.google.com/books/content?id=1oUoDwAAQBAJ&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api"
    },
    previewLink: "https://books.google.com/books?id=1oUoDwAAQBAJ&hl=&source=gbs_api",
    webReaderLink: "http://play.google.com/books/reader?id=1oUoDwAAQBAJ&hl=&printsec=frontcover&source=gbs_api",
    canonicalVolumeLink: "https://play.google.com/store/books/details?id=1oUoDwAAQBAJ",
    progress: 15,
    currentPage: 43,
    userNotes: "The seminal cyberpunk novel that coined the term 'cyberspace'.",
    favorite: false,
    addedAt: "2026-09-12T16:00:00.000Z",
    lastReadAt: "2026-09-22T20:10:00.000Z"
  }
];

// Standard Google Play Books bookshelf mapping
export const DEFAULT_BOOKSHELVES = [
  { id: "3", slug: "reading-now", title: "Reading Now", icon: "BookOpen" },
  { id: "2", slug: "to-read", title: "To Read", icon: "Clock" },
  { id: "4", slug: "have-read", title: "Have Read", icon: "CheckCircle2" },
  { id: "0", slug: "favorites", title: "Favorites", icon: "Star" },
  { id: "1", slug: "purchased", title: "Purchased", icon: "ShoppingBag" },
  { id: "7", slug: "uploaded", title: "My eBooks / Uploads", icon: "UploadCloud" },
  { id: "all", slug: "all", title: "All Books", icon: "Library" }
];

export async function readLibrary() {
  ensureDir(DATA_PATH);
  try {
    const raw = await fsPromises.readFile(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return parsed.books || [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Seed with initial books
      await writeLibrary(SEED_BOOKS);
      return SEED_BOOKS;
    }
    console.error('[Pure-Books] Error reading library file:', err);
    return SEED_BOOKS;
  }
}

export async function writeLibrary(books) {
  ensureDir(DATA_PATH);
  const tempPath = `${DATA_PATH}.tmp-${Date.now()}`;
  const data = JSON.stringify({ books, updatedAt: new Date().toISOString() }, null, 2);
  await fsPromises.writeFile(tempPath, data, 'utf-8');
  await fsPromises.rename(tempPath, DATA_PATH);
}

export async function addBook(bookData) {
  const books = await readLibrary();
  const existingIndex = books.findIndex(b => b.id === bookData.id);

  const newBook = {
    ...bookData,
    shelf: bookData.shelf || 'to-read',
    shelfId: bookData.shelfId || '2',
    shelfName: bookData.shelfName || 'To Read',
    progress: bookData.progress || 0,
    currentPage: bookData.currentPage || 0,
    favorite: !!bookData.favorite,
    userNotes: bookData.userNotes || '',
    addedAt: bookData.addedAt || new Date().toISOString(),
    lastReadAt: bookData.lastReadAt || null
  };

  if (existingIndex >= 0) {
    books[existingIndex] = { ...books[existingIndex], ...newBook };
  } else {
    books.unshift(newBook);
  }

  await writeLibrary(books);
  return existingIndex >= 0 ? books[existingIndex] : newBook;
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
