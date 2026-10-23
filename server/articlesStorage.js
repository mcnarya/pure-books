import fs from 'fs/promises';
import path from 'path';

export function getArticlesFilePath() {
  if (process.env.ARTICLES_DATA_PATH) {
    return process.env.ARTICLES_DATA_PATH;
  }
  if (process.env.DATA_PATH) {
    if (path.basename(process.env.DATA_PATH) === 'articles.json') {
      return process.env.DATA_PATH;
    }
    return path.join(path.dirname(process.env.DATA_PATH), 'articles.json');
  }
  return path.join(process.cwd(), 'data', 'articles.json');
}

async function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

let memoryArticles = null;

export async function readArticles() {
  if (memoryArticles !== null) {
    return memoryArticles;
  }
  const file = getArticlesFilePath();
  try {
    await ensureDirectory(file);
    const data = await fs.readFile(file, 'utf-8');
    if (!data.trim()) {
      memoryArticles = [];
      return memoryArticles;
    }
    memoryArticles = JSON.parse(data);
    return memoryArticles;
  } catch (err) {
    if (err.code === 'ENOENT') {
      memoryArticles = [];
      return memoryArticles;
    }
    console.error('Error reading articles:', err);
    memoryArticles = [];
    return memoryArticles;
  }
}

export async function writeArticles(articles) {
  memoryArticles = articles;
  const file = getArticlesFilePath();
  await ensureDirectory(file);
  const tempFile = `${file}.tmp.${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const payload = JSON.stringify(articles, null, 2);
  await fs.writeFile(tempFile, payload, 'utf-8');
  await fs.rename(tempFile, file);
}

export async function getArticleById(id) {
  const articles = await readArticles();
  return articles.find(a => a.id === id) || null;
}

export async function addArticle(article) {
  const articles = await readArticles();
  const existingIndex = articles.findIndex(a => a.url === article.url);
  if (existingIndex >= 0) {
    articles[existingIndex] = {
      ...articles[existingIndex],
      ...article,
      updatedAt: new Date().toISOString()
    };
    await writeArticles(articles);
    return articles[existingIndex];
  } else {
    articles.unshift(article);
    await writeArticles(articles);
    return article;
  }
}

export async function updateArticle(id, updates) {
  const articles = await readArticles();
  const index = articles.findIndex(a => a.id === id);
  if (index === -1) return null;

  articles[index] = {
    ...articles[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await writeArticles(articles);
  return articles[index];
}

export async function deleteArticle(id) {
  const articles = await readArticles();
  const filtered = articles.filter(a => a.id !== id);
  if (filtered.length === articles.length) return false;

  await writeArticles(filtered);
  return true;
}
