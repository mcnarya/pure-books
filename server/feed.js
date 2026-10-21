import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { readArticles, addArticle, getArticlesFilePath } from './articlesStorage.js';
import { parseArticleUrl } from './parser.js';

const FEEDS_FILE = process.env.FEEDS_PATH || path.join(path.dirname(getArticlesFilePath()), 'feeds.json');

let feedIntervalTimer = null;
let isSyncing = false;

async function ensureFeedFile() {
  try {
    const dir = path.dirname(FEEDS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.access(FEEDS_FILE);
  } catch {
    await fs.writeFile(FEEDS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export async function readFeeds() {
  try {
    await ensureFeedFile();
    const data = await fs.readFile(FEEDS_FILE, 'utf-8');
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading feeds:', err);
    return [];
  }
}

export async function writeFeeds(feeds) {
  await ensureFeedFile();
  const tempFile = `${FEEDS_FILE}.tmp.${Date.now()}`;
  await fs.writeFile(tempFile, JSON.stringify(feeds, null, 2), 'utf-8');
  await fs.rename(tempFile, FEEDS_FILE);
}

export async function addFeed(url) {
  const feeds = await readFeeds();
  const existing = feeds.find(f => f.url === url);
  if (existing) return existing;

  // Simple title inference
  let title = url;
  try {
    const u = new URL(url);
    title = u.hostname.replace('www.', '');
  } catch {}

  const newFeed = {
    id: crypto.randomUUID(),
    url,
    title,
    lastFetchedAt: null,
    createdAt: new Date().toISOString()
  };

  feeds.push(newFeed);
  await writeFeeds(feeds);
  return newFeed;
}

export async function deleteFeed(id) {
  const feeds = await readFeeds();
  const filtered = feeds.filter(f => f.id !== id);
  if (filtered.length === feeds.length) return false;
  await writeFeeds(filtered);
  return true;
}

/**
 * Basic XML tag value extractor without heavy dependencies
 */
function extractXmlTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

/**
 * Extract link attribute or content from RSS/Atom item
 */
function extractLink(xml) {
  // Atom format: <link href="..."/>
  const atomMatch = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (atomMatch) return atomMatch[1];

  // RSS format: <link>...</link>
  const rssMatch = xml.match(/<link[^>]*>([\\s\\S]*?)<\/link>/i);
  if (rssMatch) {
    return rssMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }
  return '';
}

export async function syncFeeds(maxPerFeed = 5) {
  if (isSyncing) {
    return { success: false, message: 'Sync already in progress' };
  }
  isSyncing = true;

  try {
    const feeds = await readFeeds();
    const existingArticles = await readArticles();
    const existingUrls = new Set(existingArticles.map(a => a.url));
    let totalImported = 0;

    for (const feed of feeds) {
      try {
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PureBooks/1.0; +https://github.com/mcnarya/pure-books)'
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          console.warn(`[Feeds] Failed to fetch feed ${feed.url}: ${response.status}`);
          continue;
        }

        const xml = await response.text();

        // Extract feed title if not set properly
        const channelTitle = extractXmlTag(xml, 'title');
        if (channelTitle && (!feed.title || feed.title === feed.url)) {
          feed.title = channelTitle;
        }

        // Split into items (RSS <item> or Atom <entry>)
        let items = [];
        const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
        if (itemMatches.length > 0) {
          items = itemMatches;
        } else {
          items = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
        }

        let feedImportCount = 0;

        for (const itemXml of items) {
          if (feedImportCount >= maxPerFeed) break;

          const link = extractLink(itemXml);
          if (!link || existingUrls.has(link)) continue;

          try {
            console.log(`[Feeds] Auto-stashing from feed ${feed.title || feed.url}: ${link}`);
            const parsed = await parseArticleUrl(link);
            parsed.tags = Array.from(new Set([...(parsed.tags || []), 'feed', feed.title].filter(Boolean)));
            await addArticle(parsed);
            existingUrls.add(link);
            feedImportCount++;
            totalImported++;
          } catch (itemErr) {
            console.warn(`[Feeds] Could not parse item ${link}:`, itemErr.message);
          }
        }

        feed.lastFetchedAt = new Date().toISOString();
      } catch (feedErr) {
        console.error(`[Feeds] Error syncing feed ${feed.url}:`, feedErr.message);
      }
    }

    await writeFeeds(feeds);
    return { success: true, imported: totalImported };
  } finally {
    isSyncing = false;
  }
}

export function startFeedScheduler(intervalMinutes = 30) {
  if (feedIntervalTimer) {
    clearInterval(feedIntervalTimer);
  }
  const ms = Math.max(5, intervalMinutes) * 60 * 1000;
  console.log(`[Feeds] Background feed polling active (every ${intervalMinutes}m)`);
  feedIntervalTimer = setInterval(() => {
    syncFeeds().catch(err => console.error('[Feeds] Background sync error:', err));
  }, ms);
}

export function stopFeedScheduler() {
  if (feedIntervalTimer) {
    clearInterval(feedIntervalTimer);
    feedIntervalTimer = null;
  }
}
