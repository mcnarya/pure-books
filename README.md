# Pure Books, Read & Note 📚📖📝

> A clean, distraction-free home for your **Google Play Books** library, "read-it-later" article queue, and markdown journaling scratchpad. Part of the **Pure** ecosystem.

---

## Features

### 📚 Google Play Books
- 📖 **Google Play Books Synchronization**: Connect via Google OAuth 2.0 (`https://www.googleapis.com/auth/books`) or paste an Access Token / API Key to sync your entire library, custom bookshelves, and reading collection.
- 🗂️ **Bookshelves Organization**: Full support for Google Play Books shelves:
  - **Purchased** (Shelf 1)
  - **Favorites** (Shelf 0)
  - **Reading Now** (Shelf 3)
  - **To Read** (Shelf 2)
  - **Have Read** (Shelf 4)
  - **My eBooks / Uploads** (Shelf 7)
- 🎛️ **Catalog Filtering & Sorting**:
  - Live search across titles, authors, categories, and descriptions.
  - Dynamic Category / Genre filter dropdown derived from your Google Books library.
  - Multi-criteria sorting: Recently Added, Title (A-Z / Z-A), Author, Publication Year, Page Count, Rating.
  - Grid View and List / Table View toggles.
- 🔍 **Google Books Catalog Discovery**: Search millions of books directly from the Google Books global catalog and add them to your collection.
- ↗️ **Direct Play Books Launching**: 1-click launch to open any book directly in Google Play Books on web, Android, iOS, or e-reader.

### 📖 Articles & Reading Stash
- 🧹 **Distraction-Free Reading**: Convert articles and web pages into clean Markdown and comfortable typography.
- 📄 **Document Import**: Drag-and-drop or upload PDF and Word (DOCX) files directly into your reading stash.
- ⏱️ **Reading Progress & TTS**: Reading time estimation, scroll progress tracking, and built-in Text-To-Speech reader.
- 📡 **RSS & Atom Feed Stasher**: Subscribe to RSS/Atom feeds with automatic background polling and 1-click sync into your unread queue.
- ⚡ **Webhook & Bookmarklet Ingest**: Stash articles via `POST /api/inbox` or browser bookmarklets with zero friction.
- 📦 **Export & Portability**: 1-click **EPUB 3 eBook** generation (ready for Kindle, Kobo, Boox), standalone offline HTML digests, and JSON exports.

### 📝 Notes, Journal & Scratchpad
- 📅 **1-Click Daily Notes**: Automatically create or jump to today's auto-dated journal note (`YYYY-MM-DD`).
- 📋 **Persistent Scratchpad**: Always-available quick scratchpad for fleeting thoughts, clipboard snippets, and quick ideas.
- ⚡ **Zero-Database Markdown Storage**: Notes saved as raw `.md` files in `/data/notes/` and index in `/data/notes.json`.
- 🎛️ **Dual/Split & Reading Modes**: Seamlessly toggle between Source Edit, Live Split View, and Preview mode.
- ☑️ **Interactive Checklists**: Click checklist boxes directly in preview mode to toggle `- [ ]` and `- [x]` in source markdown.
- 🔍 **Instant Search & Hashtags**: Search across note titles, body text, and filter by `#tags`.

### 🎨 Pure Ecosystem
- 🎨 **Pure Theme Engine**: Material 3 & Nord design tokens. Supports Nord Dark, Nord Light, Material Dark, Material Light, Warm Sepia, OLED Pitch Black, Dracula, Sunset Purple, and Solarized Dark.
- 🌐 **Pure Hub Ready**: Seamlessly runs standalone on port `3004` (`/`) or reverse-proxied under Pure Hub at `/books/`, `/read/`, or `/note/` with dynamic cross-window theme synchronization (`PURE_HUB_THEME_CHANGE`).
- 💾 **Flat-File Storage**: Atomic JSON storage (`/data/library.json`, `/data/articles.json`, `/data/feeds.json`, `/data/notes.json`, `/data/notes/*.md`). No SQL database required.
- 🔒 **Optional Password Gate**: Protect your app with `APP_PASSWORD`.

---

## Quick Start

### Docker Compose

```yaml
services:
  pure-books:
    image: ghcr.io/mcnarya/pure-books:latest
    container_name: pure-books
    restart: unless-stopped
    ports:
      - "3004:3004"
    environment:
      - PORT=3004
      - APP_PASSWORD=yourpassword
      - DATA_PATH=/data/library.json
      - ARTICLES_DATA_PATH=/data/articles.json
      - NOTES_DATA_DIR=/data
      - AUTH_DATA_PATH=/data/auth.json
      - GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
      - GOOGLE_CLIENT_SECRET=your-google-client-secret
      - GOOGLE_API_KEY=your-optional-google-api-key
      - GOOGLE_REDIRECT_URI=http://localhost:3004/api/auth/google/callback
    volumes:
      - ./data:/data
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP Server Port | `3004` |
| `APP_PASSWORD` | Access gate password (optional) | *None (open)* |
| `DATA_PATH` | Path to persistent library JSON file | `/data/library.json` |
| `ARTICLES_DATA_PATH` | Path to persistent articles JSON file | `/data/articles.json` |
| `NOTES_DATA_DIR` | Directory for markdown notes and scratchpad | `/data` |
| `FEEDS_PATH` | Path to RSS feeds configuration JSON file | `/data/feeds.json` |
| `AUTH_DATA_PATH` | Path to persistent auth tokens JSON file | `/data/auth.json` |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth 2.0 Web Client ID | *None* |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth 2.0 Web Client Secret | *None* |
| `GOOGLE_API_KEY` | Optional Google Books API Key for quota boosts | *None* |
| `GOOGLE_REDIRECT_URI` | OAuth 2.0 Redirect URI callback | `http://localhost:3004/api/auth/google/callback` |
| `PYTHON_BIN` | Path to Python 3 binary (for MarkItDown document conversion) | `python3` |

---

## Local Development

```bash
# Install Node dependencies
npm install

# Start frontend dev server
npm run dev

# Build production bundle
npm run build

# Start unified server
npm run start
```
