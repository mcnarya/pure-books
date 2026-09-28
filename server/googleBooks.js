import fs from 'fs';
import path from 'path';

// Auth State Storage Path
const AUTH_FILE = process.env.AUTH_DATA_PATH || path.join(process.cwd(), 'data', 'auth.json');

class GoogleBooksService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3004/api/auth/google/callback';
    
    this.accessToken = process.env.GOOGLE_ACCESS_TOKEN || '';
    this.refreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';
    this.tokenExpiry = 0;
    this.userProfile = null;

    this.loadSavedAuth();
  }

  loadSavedAuth() {
    try {
      if (fs.existsSync(AUTH_FILE)) {
        const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.accessToken = parsed.accessToken || this.accessToken;
        this.refreshToken = parsed.refreshToken || this.refreshToken;
        this.tokenExpiry = parsed.tokenExpiry || 0;
        this.userProfile = parsed.userProfile || null;
        if (parsed.apiKey) this.apiKey = parsed.apiKey;
        if (parsed.clientId) this.clientId = parsed.clientId;
        if (parsed.clientSecret) this.clientSecret = parsed.clientSecret;
      }
    } catch (err) {
      console.warn('[Pure-Books] Failed to load saved auth:', err.message);
    }
  }

  saveAuth() {
    try {
      const dir = path.dirname(AUTH_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(AUTH_FILE, JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry,
        userProfile: this.userProfile,
        apiKey: this.apiKey,
        clientId: this.clientId,
        clientSecret: this.clientSecret
      }, null, 2));
    } catch (err) {
      console.warn('[Pure-Books] Failed to save auth state:', err.message);
    }
  }

  getStatus() {
    return {
      authenticated: Boolean(this.accessToken),
      hasRefreshToken: Boolean(this.refreshToken),
      hasClientId: Boolean(this.clientId),
      hasApiKey: Boolean(this.apiKey),
      userProfile: this.userProfile,
      redirectUri: this.redirectUri
    };
  }

  getAuthUrl(customRedirect) {
    if (!this.clientId) {
      throw new Error('Google Client ID is not configured');
    }
    const redirect = customRedirect || this.redirectUri;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/books https://www.googleapis.com/auth/userinfo.profile');
    return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(this.clientId)}&redirect_uri=${encodeURIComponent(redirect)}&scope=${scope}&access_type=offline&prompt=consent`;
  }

  async exchangeCode(code, customRedirect) {
    const redirect = customRedirect || this.redirectUri;
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirect,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || data.error || 'Failed to exchange authorization code');
    }

    this.accessToken = data.access_token;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }
    this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;

    // Fetch user profile
    await this.fetchUserProfile();
    this.saveAuth();
    return this.getStatus();
  }

  async setManualToken(token, refreshToken = '', apiKey = '') {
    if (token) this.accessToken = token.trim();
    if (refreshToken) this.refreshToken = refreshToken.trim();
    if (apiKey) this.apiKey = apiKey.trim();
    this.tokenExpiry = Date.now() + 3600 * 1000;

    if (this.accessToken) {
      await this.fetchUserProfile().catch(() => {});
    }
    this.saveAuth();
    return this.getStatus();
  }

  async setConfig({ clientId, clientSecret, apiKey }) {
    if (clientId !== undefined) this.clientId = clientId.trim();
    if (clientSecret !== undefined) this.clientSecret = clientSecret.trim();
    if (apiKey !== undefined) this.apiKey = apiKey.trim();
    this.saveAuth();
    return this.getStatus();
  }

  async logout() {
    this.accessToken = '';
    this.refreshToken = '';
    this.tokenExpiry = 0;
    this.userProfile = null;
    this.saveAuth();
    return this.getStatus();
  }

  async getValidToken() {
    if (!this.accessToken) return null;

    // If token about to expire and we have refresh token, refresh it
    if (this.refreshToken && this.tokenExpiry && Date.now() > this.tokenExpiry - 60000 && this.clientId && this.clientSecret) {
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: this.refreshToken,
            grant_type: 'refresh_token'
          })
        });
        const data = await response.json();
        if (response.ok && data.access_token) {
          this.accessToken = data.access_token;
          this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
          this.saveAuth();
        }
      } catch (err) {
        console.error('[Pure-Books] Failed to refresh token:', err);
      }
    }
    return this.accessToken;
  }

  async fetchUserProfile() {
    const token = await this.getValidToken();
    if (!token) return null;
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        this.userProfile = await res.json();
        return this.userProfile;
      }
    } catch {
      // Ignore userinfo failure
    }
    return null;
  }

  // Google Books API Request Helper
  async apiRequest(path, options = {}) {
    const token = await this.getValidToken();
    const url = new URL(`https://www.googleapis.com/books/v1${path}`);
    
    // If no token, attach apiKey if available
    if (!token && this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }

    const headers = { ...options.headers };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers
    });

    if (!response.ok) {
      const errBody = await response.text();
      let parsed;
      try { parsed = JSON.parse(errBody); } catch {}
      const msg = parsed?.error?.message || `Google Books API error ${response.status}: ${errBody}`;
      throw new Error(msg);
    }

    return response.json();
  }

  // List authenticated user's bookshelves
  async listBookshelves() {
    const token = await this.getValidToken();
    if (!token) return null;
    return this.apiRequest('/mylibrary/bookshelves');
  }

  // List volumes on a specific bookshelf
  async getShelfVolumes(shelfId, maxResults = 40, startIndex = 0) {
    const token = await this.getValidToken();
    if (!token) return null;
    return this.apiRequest(`/mylibrary/bookshelves/${shelfId}/volumes?maxResults=${maxResults}&startIndex=${startIndex}`);
  }

  // Add volume to user's bookshelf
  async addVolumeToShelf(shelfId, volumeId) {
    const token = await this.getValidToken();
    if (!token) return null;
    return this.apiRequest(`/mylibrary/bookshelves/${shelfId}/addVolume?volumeId=${encodeURIComponent(volumeId)}`, {
      method: 'POST'
    });
  }

  // Remove volume from user's bookshelf
  async removeVolumeFromShelf(shelfId, volumeId) {
    const token = await this.getValidToken();
    if (!token) return null;
    return this.apiRequest(`/mylibrary/bookshelves/${shelfId}/removeVolume?volumeId=${encodeURIComponent(volumeId)}`, {
      method: 'POST'
    });
  }

  // Get reading position
  async getReadingPosition(volumeId) {
    const token = await this.getValidToken();
    if (!token) return null;
    return this.apiRequest(`/mylibrary/readingpositions/${encodeURIComponent(volumeId)}`);
  }

  // Search public Google Books catalog with Open Library fallback
  async searchVolumes(query, maxResults = 24, startIndex = 0) {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString(),
      startIndex: startIndex.toString(),
      projection: 'full'
    });

    try {
      return await this.apiRequest(`/volumes?${params.toString()}`);
    } catch (err) {
      console.warn('[Pure-Books] Google Books search failed/quota exceeded, trying fallback:', err.message);

      // Fallback to Open Library Search so user search never breaks
      try {
        const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}&offset=${startIndex}`;
        const olRes = await fetch(olUrl);
        if (olRes.ok) {
          const olData = await olRes.json();
          const items = (olData.docs || []).map((doc, idx) => ({
            id: doc.key ? doc.key.replace('/works/', '') : `ol-${idx}-${Date.now()}`,
            volumeInfo: {
              title: doc.title,
              subtitle: doc.subtitle || '',
              authors: doc.author_name || ['Unknown Author'],
              publisher: doc.publisher ? doc.publisher[0] : '',
              publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : '',
              description: doc.first_sentence ? doc.first_sentence[0] : (doc.subject ? `Subjects: ${doc.subject.slice(0, 3).join(', ')}` : ''),
              pageCount: doc.number_of_pages_median || 0,
              categories: doc.subject ? doc.subject.slice(0, 3) : [],
              averageRating: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : null,
              ratingsCount: doc.ratings_count || null,
              imageLinks: doc.cover_i ? {
                thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
                smallThumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`
              } : {},
              previewLink: `https://openlibrary.org${doc.key}`,
              canonicalVolumeLink: `https://openlibrary.org${doc.key}`
            },
            accessInfo: {
              webReaderLink: `https://openlibrary.org${doc.key}`
            }
          }));

          return {
            totalItems: olData.numFound || items.length,
            items,
            fallbackNotice: 'Results provided via open book repository (configure Google API Key in Settings for Google catalog)'
          };
        }
      } catch (olErr) {
        console.warn('[Pure-Books] Open Library fallback error:', olErr.message);
      }

      throw err;
    }
  }

  // Get specific volume details
  async getVolume(volumeId) {
    return this.apiRequest(`/volumes/${encodeURIComponent(volumeId)}?projection=full`);
  }
}

export const googleBooks = new GoogleBooksService();
