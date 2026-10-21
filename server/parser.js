import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true
});

// Resolve Python executable
function getPythonBinary() {
  if (process.env.PYTHON_BIN && fs.existsSync(process.env.PYTHON_BIN)) {
    return process.env.PYTHON_BIN;
  }
  const venvPython = path.resolve(__dirname, '../.venv/bin/python3');
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return 'python3';
}

const CONVERTER_SCRIPT = path.resolve(__dirname, 'converter.py');

/**
 * Executes the Python MarkItDown converter bridge
 */
export function runMarkItDown(args, stdinData = null) {
  return new Promise((resolve, reject) => {
    const pythonBin = getPythonBinary();
    const proc = spawn(pythonBin, [CONVERTER_SCRIPT, ...args]);

    let stdout = '';
    let stderr = '';

    if (stdinData) {
      proc.stdin.write(stdinData);
      proc.stdin.end();
    }

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        let errorMsg = stderr.trim();
        try {
          const parsedErr = JSON.parse(stdout);
          if (parsedErr && parsedErr.error) {
            errorMsg = parsedErr.error;
          }
        } catch {}
        return reject(new Error(errorMsg || `Converter failed with exit code ${code}`));
      }

      try {
        const result = JSON.parse(stdout);
        if (!result.success) {
          return reject(new Error(result.error || 'Conversion failed'));
        }
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse converter output: ${err.message}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to launch converter process: ${err.message}`));
    });
  });
}

/**
 * Render Markdown to sanitized HTML for reader display
 */
export async function renderMarkdownToHtml(markdown) {
  const { document } = parseHTML('<!DOCTYPE html><html><body></body></html>');
  const purifier = DOMPurify(document.defaultView);
  const rawHtml = await marked.parse(markdown || '');
  return purifier.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'figure',
      'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br',
      'sub', 'sup', 'mark', 'del', 'span'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'id']
  });
}

/**
 * Parse an article from a web URL or remote document URL using MarkItDown
 */
export async function parseArticleUrl(url) {
  if (!url || !url.startsWith('http')) {
    throw new Error('Invalid URL. URL must start with http:// or https://');
  }

  const urlLower = url.toLowerCase().split('?')[0];
  const isDirectDocument = urlLower.endsWith('.pdf') || urlLower.endsWith('.docx') || urlLower.endsWith('.doc');

  if (isDirectDocument) {
    const convResult = await runMarkItDown(['--url', url]);
    const cleanHtml = await renderMarkdownToHtml(convResult.markdown);
    const id = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
    
    return {
      id,
      url,
      title: convResult.title || 'Document',
      author: convResult.author || null,
      siteName: convResult.siteName || 'Document',
      fileType: convResult.fileType || 'pdf',
      favicon: null,
      leadImage: null,
      excerpt: convResult.excerpt || '',
      markdown: convResult.markdown || '',
      content: cleanHtml,
      wordCount: convResult.wordCount || 0,
      readingTimeMinutes: convResult.readingTimeMinutes || 1,
      read: false,
      starred: false,
      progress: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Fetch webpage
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats')) {
    const convResult = await runMarkItDown(['--url', url]);
    const cleanHtml = await renderMarkdownToHtml(convResult.markdown);
    const id = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);

    return {
      id,
      url,
      title: convResult.title || 'Document',
      author: convResult.author || null,
      siteName: convResult.siteName || 'Document',
      fileType: contentType.includes('pdf') ? 'pdf' : 'docx',
      favicon: null,
      leadImage: null,
      excerpt: convResult.excerpt || '',
      markdown: convResult.markdown || '',
      content: cleanHtml,
      wordCount: convResult.wordCount || 0,
      readingTimeMinutes: convResult.readingTimeMinutes || 1,
      read: false,
      starred: false,
      progress: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const html = await response.text();
  const { document } = parseHTML(html);

  // Extract meta tags for lead image, description, site name, author
  let leadImage = null;
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                  document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
  if (ogImage) {
    try {
      leadImage = new URL(ogImage, url).href;
    } catch {
      leadImage = ogImage;
    }
  }

  let siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  const urlObj = new URL(url);
  if (!siteName) {
    siteName = urlObj.hostname.replace(/^www\./, '');
  }

  // Favicon
  const faviconEl = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  let favicon = null;
  if (faviconEl && faviconEl.getAttribute('href')) {
    try {
      favicon = new URL(faviconEl.getAttribute('href'), url).href;
    } catch {
      favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    }
  } else {
    favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  }

  const pageTitle = document.querySelector('title')?.textContent?.trim() || '';
  const metaAuthor = document.querySelector('meta[name="author"]')?.getAttribute('content') || null;

  // Attempt Readability extraction to isolate article content
  let articleContentHtml = null;
  let readabilityArticle = null;
  try {
    const reader = new Readability(document, {
      keepClasses: true
    });
    readabilityArticle = reader.parse();
    const textLength = readabilityArticle?.textContent?.trim().length || 0;
    if (readabilityArticle?.content && textLength > 100) {
      articleContentHtml = readabilityArticle.content;
    }
  } catch {}

  let convResult = null;
  if (articleContentHtml) {
    try {
      convResult = await runMarkItDown(['--stdin-html'], articleContentHtml);
    } catch {}
  }

  // If readability extraction was empty or yielded minimal markdown (e.g. skip links):
  const mdLen = convResult?.markdown?.trim().length || 0;
  if (!convResult || mdLen < 100) {
    // Try main content selector
    const mainEl = document.querySelector('main, article, [role="main"], #content, #main');
    if (mainEl && mainEl.innerHTML.trim().length > 200) {
      try {
        const mainConv = await runMarkItDown(['--stdin-html'], mainEl.innerHTML);
        if (mainConv && mainConv.markdown.trim().length > mdLen) {
          convResult = mainConv;
        }
      } catch {}
    }

    // Fallback: convert the full page via MarkItDown
    if (!convResult || convResult.markdown.trim().length < 100) {
      try {
        convResult = await runMarkItDown(['--url', url]);
      } catch {
        // As a last resort, convert full body HTML
        if (document.body && document.body.innerHTML.trim().length > 50) {
          convResult = await runMarkItDown(['--stdin-html'], document.body.innerHTML);
        }
      }
    }
  }

  const markdown = convResult?.markdown || '';
  const cleanHtml = await renderMarkdownToHtml(markdown);

  const finalTitle = readabilityArticle?.title || convResult.title || pageTitle || 'Untitled Article';
  const finalAuthor = readabilityArticle?.byline || metaAuthor || convResult.author || null;
  const excerpt = readabilityArticle?.excerpt || convResult.excerpt || '';

  const id = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);

  return {
    id,
    url,
    title: finalTitle,
    author: finalAuthor,
    siteName,
    fileType: 'web',
    favicon,
    leadImage: leadImage || null,
    excerpt,
    markdown,
    content: cleanHtml,
    wordCount: convResult.wordCount,
    readingTimeMinutes: convResult.readingTimeMinutes,
    read: false,
    starred: false,
    progress: 0,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Parse an uploaded document file (PDF, DOCX, etc.) using MarkItDown
 */
export async function parseUploadedFile(filePath, originalFilename) {
  const convResult = await runMarkItDown(['--file', filePath, '--original-name', originalFilename]);
  const cleanHtml = await renderMarkdownToHtml(convResult.markdown);

  const id = crypto.createHash('md5').update(originalFilename + Date.now().toString()).digest('hex').slice(0, 12);
  const fileUrl = `upload://${encodeURIComponent(originalFilename)}`;

  return {
    id,
    url: fileUrl,
    title: convResult.title || path.parse(originalFilename).name,
    author: convResult.author || null,
    siteName: convResult.siteName || 'Uploaded Document',
    fileType: convResult.fileType || 'file',
    favicon: null,
    leadImage: null,
    excerpt: convResult.excerpt || '',
    markdown: convResult.markdown || '',
    content: cleanHtml,
    wordCount: convResult.wordCount || 0,
    readingTimeMinutes: convResult.readingTimeMinutes || 1,
    read: false,
    starred: false,
    progress: 0,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
