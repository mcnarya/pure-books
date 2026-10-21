import { createRequire } from 'module';
import crypto from 'crypto';
import { parseHTML } from 'linkedom';
import { renderMarkdownToHtml } from './parser.js';

const require = createRequire(import.meta.url);
const archiverPkg = require('archiver');
const ZipArchive = archiverPkg.ZipArchive || archiverPkg;

/**
 * Escapes characters for XML / XHTML output
 */
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sanitizes and serializes HTML content into valid XHTML for EPUB
 */
function toValidXHtml(htmlContent) {
  if (!htmlContent) return '<p></p>';

  try {
    const { document } = parseHTML(`<!DOCTYPE html><html><body><div id="content-root">${htmlContent}</div></body></html>`);
    const root = document.getElementById('content-root');
    if (!root) return `<p>${escapeXml(htmlContent)}</p>`;

    // Remove potentially invalid tags in EPUB
    const scripts = root.querySelectorAll('script, style, iframe, form, button, input');
    scripts.forEach((el) => el.remove());

    // Ensure image tags and linebreaks self-close for XHTML
    let inner = root.innerHTML;
    // Replace unclosed void elements
    inner = inner.replace(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)([^>]*?)(?<!\/)>/gi, '<$1$2 />');
    // Escape bare ampersands not part of valid entity references
    inner = inner.replace(/&(?!(?:[a-zA-Z0-9]+|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

    return inner;
  } catch (err) {
    return `<p>${escapeXml(htmlContent)}</p>`;
  }
}

/**
 * Generates an EPUB 3 document stream/buffer for an array of articles
 */
export function generateEpub(articles, options = {}) {
  return new Promise(async (resolve, reject) => {
    if (!articles || articles.length === 0) {
      return reject(new Error('No articles to export'));
    }

    try {
      const isSingle = articles.length === 1;
      const bundleTitle = options.title || (isSingle ? articles[0].title : `Pure Read Digest (${new Date().toLocaleDateString()})`);
      const bundleAuthor = options.author || (isSingle && articles[0].author ? articles[0].author : 'Pure Read');
      const bookId = `urn:uuid:${crypto.randomUUID()}`;
      const nowIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

      const archive = typeof ZipArchive === 'function' && ZipArchive.prototype?.append
        ? new ZipArchive({ zlib: { level: 9 } })
        : archiverPkg('zip', { zlib: { level: 9 } });

      const chunks = [];
      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err) => reject(err));

      // 1. Mimetype MUST be first and stored uncompressed
      archive.append('application/epub+zip', { name: 'mimetype', store: true });

      // 2. META-INF/container.xml
      const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
      archive.append(containerXml, { name: 'META-INF/container.xml' });

      // 3. Prepare Chapters
      const preparedChapters = [];
      for (let i = 0; i < articles.length; i++) {
        const art = articles[i];
        let contentHtml = art.content;
        if (!contentHtml && art.markdown) {
          contentHtml = await renderMarkdownToHtml(art.markdown);
        }
        const xhtmlBody = toValidXHtml(contentHtml);
        const chapterNum = i + 1;
        const chapterId = `chapter_${chapterNum}`;
        const chapterFileName = `chapter_${chapterNum}.xhtml`;

        const chapterContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(art.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <section epub:type="chapter" class="chapter-container">
    <h1 class="chapter-title">${escapeXml(art.title)}</h1>
    <div class="chapter-meta">
      ${art.author ? `<span>By <strong>${escapeXml(art.author)}</strong></span> • ` : ''}
      ${art.siteName ? `<span>${escapeXml(art.siteName)}</span> • ` : ''}
      <span>${art.createdAt ? new Date(art.createdAt).toLocaleDateString() : ''}</span>
      ${art.url && !art.url.startsWith('upload://') ? `<br/><a href="${escapeXml(art.url)}" class="original-link">Original Article</a>` : ''}
    </div>
    <div class="article-body">
      ${xhtmlBody}
    </div>
  </section>
</body>
</html>`;

        preparedChapters.push({
          id: chapterId,
          fileName: chapterFileName,
          title: art.title || `Article ${chapterNum}`,
          author: art.author,
          content: chapterContent
        });

        archive.append(chapterContent, { name: `OEBPS/${chapterFileName}` });
      }

      // 4. OEBPS/style.css
      const cssContent = `@charset "utf-8";
body {
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  line-height: 1.65;
  margin: 1.2em 1.5em;
  color: #1a1a1a;
  background-color: #fff;
}
.chapter-container {
  page-break-before: always;
  break-before: page;
}
h1.chapter-title {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 1.85em;
  font-weight: 700;
  line-height: 1.25;
  margin-top: 0.6em;
  margin-bottom: 0.3em;
  color: #111;
  border-bottom: 1px solid #ddd;
  padding-bottom: 0.4em;
}
.chapter-meta {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 0.85em;
  color: #666;
  margin-bottom: 2em;
  line-height: 1.5;
}
.original-link {
  color: #0284c7;
  text-decoration: underline;
  font-size: 0.85em;
}
.article-body p {
  margin: 1.1em 0;
  text-align: justify;
}
.article-body h2, .article-body h3, .article-body h4 {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  color: #222;
}
blockquote {
  margin: 1.2em 0;
  padding: 0.5em 1.2em;
  border-left: 3px solid #888;
  color: #444;
  font-style: italic;
  background-color: #f9f9f9;
}
pre, code {
  font-family: "Courier New", Courier, monospace;
  background-color: #f3f4f6;
  font-size: 0.9em;
}
pre {
  padding: 0.8em;
  overflow-x: auto;
  white-space: pre-wrap;
  border: 1px solid #e5e7eb;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.5em 0;
}
th, td {
  border: 1px solid #ccc;
  padding: 8px 12px;
  text-align: left;
}
nav#toc ol {
  list-style-type: decimal;
  padding-left: 1.5em;
}
nav#toc li {
  margin: 0.6em 0;
}
nav#toc a {
  text-decoration: none;
  color: #0284c7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
`;
      archive.append(cssContent, { name: 'OEBPS/style.css' });

      // 5. OEBPS/nav.xhtml (EPUB 3 Navigation)
      const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1 class="chapter-title">Table of Contents</h1>
    <ol>
      ${preparedChapters.map((ch) => `<li><a href="${ch.fileName}">${escapeXml(ch.title)}</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
      archive.append(navXhtml, { name: 'OEBPS/nav.xhtml' });

      // 6. OEBPS/toc.ncx (EPUB 2 Compatibility)
      const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(bundleTitle)}</text>
  </docTitle>
  <docAuthor>
    <text>${escapeXml(bundleAuthor)}</text>
  </docAuthor>
  <navMap>
    ${preparedChapters.map((ch, idx) => `
    <navPoint id="navPoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="${ch.fileName}"/>
    </navPoint>`).join('')}
  </navMap>
</ncx>`;
      archive.append(ncxContent, { name: 'OEBPS/toc.ncx' });

      // 7. OEBPS/content.opf
      const opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeXml(bundleTitle)}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>${escapeXml(bundleAuthor)}</dc:creator>
    <dc:publisher>Pure Read</dc:publisher>
    <meta property="dcterms:modified">${nowIso}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    ${preparedChapters.map((ch) => `<item id="${ch.id}" href="${ch.fileName}" media-type="application/xhtml+xml"/>`).join('\n    ')}
  </manifest>
  <spine toc="ncx">
    <itemref idref="nav"/>
    ${preparedChapters.map((ch) => `<itemref idref="${ch.id}"/>`).join('\n    ')}
  </spine>
</package>`;
      archive.append(opfContent, { name: 'OEBPS/content.opf' });

      // Finalize ZIP
      await archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates a standalone, beautiful offline HTML bundle for articles
 */
export async function generateHtmlBundle(articles, options = {}) {
  if (!articles || articles.length === 0) {
    throw new Error('No articles to export');
  }

  const isSingle = articles.length === 1;
  const bundleTitle = options.title || (isSingle ? articles[0].title : `Pure Read Offline Digest (${new Date().toLocaleDateString()})`);
  const totalWords = articles.reduce((acc, a) => acc + (a.wordCount || 0), 0);
  const totalReadingMinutes = articles.reduce((acc, a) => acc + (a.readingTimeMinutes || 1), 0);

  const renderedArticles = [];
  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    let html = art.content;
    if (!html && art.markdown) {
      html = await renderMarkdownToHtml(art.markdown);
    }
    renderedArticles.push({
      ...art,
      renderedHtml: html
    });
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(bundleTitle)}</title>
  <style>
    :root {
      --bg: #2e3440;
      --card-bg: #3b4252;
      --surface-container: #434c5e;
      --text: #eceff4;
      --text-muted: #d8dee9;
      --subtle: #88c0d0;
      --border: #4c566a;
      --accent: #88c0d0;
      --accent-hover: #81a1c1;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card-bg: #ffffff;
        --surface-container: #f1f5f9;
        --text: #0f172a;
        --text-muted: #475569;
        --subtle: #0284c7;
        --border: #e2e8f0;
        --accent: #0284c7;
        --accent-hover: #0369a1;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.7;
      padding: 2rem 1rem;
    }
    .wrapper {
      max-width: 840px;
      margin: 0 auto;
    }
    header.bundle-header {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      background: var(--surface-container);
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 0.8rem;
    }
    h1.bundle-title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    .bundle-meta {
      font-size: 0.875rem;
      color: var(--text-muted);
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }
    .toc-card {
      font-family: system-ui, -apple-system, sans-serif;
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.5rem;
      margin-bottom: 2.5rem;
    }
    .toc-card h2 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    .toc-list {
      list-style-type: decimal;
      padding-left: 1.5rem;
    }
    .toc-list li {
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }
    .toc-list a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }
    .toc-list a:hover {
      text-decoration: underline;
    }
    article.article-card {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem;
      margin-bottom: 3rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .article-header {
      font-family: system-ui, -apple-system, sans-serif;
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    h2.article-title {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 0.5rem;
    }
    .article-meta {
      font-size: 0.85rem;
      color: var(--text-muted);
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      align-items: center;
    }
    .article-meta a {
      color: var(--accent);
      text-decoration: underline;
    }
    .article-body {
      font-size: 1.125rem;
      line-height: 1.8;
    }
    .article-body p {
      margin-bottom: 1.5rem;
    }
    .article-body h1, .article-body h2, .article-body h3, .article-body h4 {
      font-family: system-ui, -apple-system, sans-serif;
      margin-top: 2rem;
      margin-bottom: 0.8rem;
      line-height: 1.3;
    }
    .article-body blockquote {
      border-left: 4px solid var(--accent);
      padding: 0.5rem 1.2rem;
      margin: 1.5rem 0;
      color: var(--text-muted);
      font-style: italic;
      background: var(--surface-container);
      border-radius: 0 8px 8px 0;
    }
    .article-body pre, .article-body code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9em;
      background-color: var(--surface-container);
      border-radius: 6px;
    }
    .article-body code {
      padding: 2px 6px;
    }
    .article-body pre {
      padding: 1.2rem;
      overflow-x: auto;
      margin: 1.5rem 0;
    }
    .article-body img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      margin: 2rem auto;
    }
    .article-body table {
      border-collapse: collapse;
      width: 100%;
      margin: 1.5rem 0;
    }
    .article-body th, .article-body td {
      border: 1px solid var(--border);
      padding: 10px;
      text-align: left;
    }
    .print-bar {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .btn {
      padding: 8px 16px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .btn:hover {
      background: var(--accent-hover);
    }
    @media print {
      body {
        background: #fff !important;
        color: #000 !important;
        padding: 0 !important;
      }
      .wrapper {
        max-width: 100% !important;
      }
      .print-bar, .toc-card {
        display: none !important;
      }
      article.article-card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        page-break-before: always;
        break-before: page;
      }
      .bundle-header {
        border: none !important;
        box-shadow: none !important;
        padding: 1rem 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="print-bar">
      <button class="btn" onclick="window.print()">Print or Save as PDF</button>
    </div>

    <header class="bundle-header">
      <div class="badge">Pure Read Offline Digest</div>
      <h1 class="bundle-title">${escapeXml(bundleTitle)}</h1>
      <div class="bundle-meta">
        <span><strong>${articles.length}</strong> ${articles.length === 1 ? 'Article' : 'Articles'}</span>
        <span><strong>${totalWords.toLocaleString()}</strong> Words</span>
        <span>Est. Reading Time: <strong>~${totalReadingMinutes} min</strong></span>
        <span>Exported: <strong>${new Date().toLocaleDateString()}</strong></span>
      </div>
    </header>

    ${articles.length > 1 ? `
    <nav class="toc-card">
      <h2>Table of Contents</h2>
      <ol class="toc-list">
        ${renderedArticles.map((art, idx) => `
        <li>
          <a href="#article-${idx + 1}">${escapeXml(art.title)}</a>
          ${art.author ? ` <span style="font-size: 0.8em; color: var(--text-muted);">by ${escapeXml(art.author)}</span>` : ''}
        </li>`).join('')}
      </ol>
    </nav>` : ''}

    <main>
      ${renderedArticles.map((art, idx) => `
      <article id="article-${idx + 1}" class="article-card">
        <header class="article-header">
          <h2 class="article-title">${escapeXml(art.title)}</h2>
          <div class="article-meta">
            ${art.author ? `<span>By <strong>${escapeXml(art.author)}</strong></span> • ` : ''}
            ${art.siteName ? `<span>${escapeXml(art.siteName)}</span> • ` : ''}
            <span>${art.createdAt ? new Date(art.createdAt).toLocaleDateString() : ''}</span>
            ${art.url && !art.url.startsWith('upload://') ? ` • <a href="${escapeXml(art.url)}" target="_blank" rel="noopener">Original Link</a>` : ''}
          </div>
        </header>
        <div class="article-body">
          ${art.renderedHtml}
        </div>
      </article>`).join('')}
    </main>
  </div>
</body>
</html>`;
}
