# Pure Books 📚

> A distraction-free, privacy-conscious interface and e-reader for your **Google Play Books** library. Part of the **Pure** ecosystem.

---

## Features

- 📖 **Google Play Books Synchronization**: Connect via Google OAuth 2.0 (`https://www.googleapis.com/auth/books`) or paste an Access Token / API Key to sync your entire library, custom bookshelves, and reading history.
- 🗂️ **Bookshelves Organization**: Full support for Google Play Books shelves:
  - **Reading Now** (Shelf 3)
  - **To Read** (Shelf 2)
  - **Have Read** (Shelf 4)
  - **Favorites** (Shelf 0)
  - **Purchased** (Shelf 1)
  - **My eBooks / Uploads** (Shelf 7)
  - Move books between shelves with automatic remote sync.
- 🔍 **Google Books Catalog Discovery**: Search millions of books directly from the Google Books global catalog. Preview descriptions, cover art, page counts, and add them directly to your shelves with one click.
- 🖥️ **Multi-Engine Reader**:
  - **Google Books Embedded Viewer**: Directly embedded book canvas with page-turn controls, zoom, and table of contents powered by the official Google Books Viewer API.
  - **Pure Distraction-Free Typography Reader**: Customizable font styles (Serif, Sans-Serif, Monospace), font size adjustment (14px–28px), line height, reading width margins, and built-in **Text-to-Speech (TTS)** narration.
  - **Play Books Web Launcher**: 1-click bridge to the full Google Play Books web reader.
- 📝 **Markdown Notes & Highlights**: Keep distraction-free notes, memorable quotes, and takeaways for every book in your collection.
- ⏱️ **Reading Metrics & Progress**: Track your current page, reading percentage completion, estimated reading time, and total pages logged.
- 🎨 **Pure Theme Engine**: Material 3 & Nord design tokens. Supports Nord Dark, Nord Light, Material Dark, Material Light, Warm Sepia, OLED Pitch Black, Dracula, Sunset Purple, and Solarized Dark.
- 🌐 **Pure Hub Ready**: Seamlessly runs standalone on port `3004` (`/`) or reverse-proxied under Pure Hub at `/books/` with dynamic cross-window theme synchronization (`PURE_HUB_THEME_CHANGE`).
- 💾 **Zero-Bloat Flat-File Storage**: Stores cached books, reading positions, and notes in an atomic, corruption-safe JSON file (`/data/library.json`). No SQL database required.
- 🔒 **Optional Password Gate**: Protect your library with `APP_PASSWORD`.
- 📦 **1-Click Backup**: Full JSON export and import compatible with Google Takeout backups.

---

## Quick Start

### Docker Run

```bash
docker run -d \
  --name pure-books \
  -p 3004:3004 \
  -e APP_PASSWORD="your-secure-password" \
  -v $(pwd)/data:/data \
  ghcr.io/mcnarya/pure-books:latest
```

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
| `AUTH_DATA_PATH` | Path to persistent auth tokens JSON file | `/data/auth.json` |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth 2.0 Web Client ID | *None* |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth 2.0 Web Client Secret | *None* |
| `GOOGLE_API_KEY` | Optional Google Books API Key for quota boosts | *None* |
| `GOOGLE_REDIRECT_URI` | OAuth 2.0 Redirect URI callback | `http://localhost:3004/api/auth/google/callback` |

---

## Setting Up Google Play Books OAuth 2.0 (Optional)

`pure-books` works immediately out-of-the-box with a curated library and manual token entry. To enable seamless 1-click Google Account sign-in:

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Books API**.
3. Under **APIs & Services > Credentials**, create an **OAuth 2.0 Client ID** (Web application).
4. Under **Authorized redirect URIs**, add:
   - For standalone: `http://localhost:3004/api/auth/google/callback`
   - For Pure Hub: `http://localhost:8000/books/api/auth/google/callback` (or your public domain equivalent)
5. Under **OAuth consent screen**, add the scope:
   - `https://www.googleapis.com/auth/books`
6. Copy your **Client ID** and **Client Secret** into `pure-books` Settings or your `.env` file.

> [!TIP]
> Alternatively, you can paste an Access Token directly into the Settings modal under **Quick Access Token** for zero-setup instant synchronization.

---

## Pure Hub (pure-app) Integration

To route **Pure Books** through **Pure Hub** (`http://localhost:8000/books/`):

### 1. Add to `nginx.conf` in `pure-app`:

```nginx
# Pure Books Service
location /books/ {
    proxy_pass http://pure-books:3004/books/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_cache_bypass $http_upgrade;
}

location /books-assets/ {
    proxy_pass http://pure-books:3004/books-assets/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### 2. Add to `docker-compose.yml` in `pure-app`:

```yaml
pure-books:
  build: ../pure-books
  container_name: pure-books
  restart: unless-stopped
  environment:
    - PORT=3004
    - APP_PASSWORD=${APP_PASSWORD:-}
    - DATA_PATH=/data/library.json
    - AUTH_DATA_PATH=/data/auth.json
  volumes:
    - pure-books-data:/data
  networks:
    - pure-network
```

---

## Local Development

```bash
# Clone and enter repo
cd pure-books

# Install dependencies
npm install

# Start Vite frontend dev server (port 5174)
npm run dev

# In another terminal, start backend Express server (port 3004)
npm start

# Build for production
npm run build
```

---

## License

MIT © [mcnarya](https://github.com/mcnarya)
