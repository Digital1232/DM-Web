/**
 * Meta API Service
 * Handles all Meta Graph API interactions for Facebook and Instagram
 * Including OAuth, token management, data fetching, and sync operations
 */

class MetaAPIService {
    constructor(appId, appSecret, redirectUri) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.redirectUri = redirectUri;
        this.apiVersion = 'v18.0';
        this.baseUrl = 'https://graph.facebook.com';
        this.instagramBaseUrl = 'https://graph.instagram.com';
        this.requestCache = new Map();
        this.rateLimitTracker = { calls: [], resetTime: Date.now() + 3600000 };
    }

    // ═══════════════════════════════════════════════════════════════════
    // OAUTH & AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Generate OAuth login URL
     * @param {string} scope - Space-separated permissions
     * @returns {string} OAuth URL to redirect user
     */
    getLoginUrl(scope = 'pages_read_engagement,pages_read_user_content,instagram_basic,instagram_graph_api') {
        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: scope,
            state: this.generateRandomString(32),
        });

        return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     * @param {string} code - Authorization code from OAuth callback
     * @returns {Promise<Object>} Token data { accessToken, expiresIn }
     */
    async exchangeCodeForToken(code) {
        try {
            const params = new URLSearchParams({
                client_id: this.appId,
                client_secret: this.appSecret,
                redirect_uri: this.redirectUri,
                code: code,
            });

            const response = await fetch(`${this.baseUrl}/${this.apiVersion}/oauth/access_token`, {
                method: 'POST',
                body: params,
            });

            if (!response.ok) {
                throw new Error(`OAuth token exchange failed: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                accessToken: data.access_token,
                expiresIn: data.expires_in,
                tokenType: data.token_type,
            };
        } catch (error) {
            console.error('Token exchange error:', error);
            throw error;
        }
    }

    /**
     * Get long-lived token from short-lived token
     * @param {string} shortLivedToken - Short-lived access token
     * @returns {Promise<Object>} Long-lived token data
     */
    async getLongLivedToken(shortLivedToken) {
        try {
            const params = {
                grant_type: 'fb_exchange_token',
                client_id: this.appId,
                client_secret: this.appSecret,
                fb_exchange_token: shortLivedToken,
            };

            const url = `${this.baseUrl}/${this.apiVersion}/oauth/access_token?${this.objectToQuery(params)}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                throw new Error(`Token exchange failed: ${data.error.message}`);
            }

            return {
                accessToken: data.access_token,
                expiresIn: data.expires_in,
                tokenType: data.token_type,
            };
        } catch (error) {
            console.error('Long-lived token error:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // API CALLS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get user info from access token
     * @param {string} accessToken - User's access token
     * @returns {Promise<Object>} User data with id, name, email
     */
    async getUserInfo(accessToken) {
        try {
            const url = `${this.baseUrl}/${this.apiVersion}/me?fields=id,name,email,picture&access_token=${accessToken}`;
            return await this.cachedFetch(url);
        } catch (error) {
            console.error('Get user info error:', error);
            throw error;
        }
    }

    /**
     * Get all Facebook pages managed by user
     * @param {string} accessToken - User's access token
     * @returns {Promise<Array>} Array of page objects with id, name, access_token, picture
     */
    async getFacebookPages(accessToken) {
        try {
            const fields = 'id,name,picture,access_token,followers_count,engagement';
            const url = `${this.baseUrl}/${this.apiVersion}/me/accounts?fields=${fields}&access_token=${accessToken}`;
            const response = await this.cachedFetch(url);
            return response.data || [];
        } catch (error) {
            console.error('Get Facebook pages error:', error);
            throw error;
        }
    }

    /**
     * Get Instagram Business Account linked to Facebook page
     * @param {string} facebookPageId - Facebook page ID
     * @param {string} pageAccessToken - Page access token
     * @returns {Promise<Object>} Instagram Business Account data
     */
    async getInstagramBusinessAccount(facebookPageId, pageAccessToken) {
        try {
            const fields = 'instagram_business_account';
            const url = `${this.baseUrl}/${this.apiVersion}/${facebookPageId}?fields=${fields}&access_token=${pageAccessToken}`;
            const response = await this.cachedFetch(url);
            return response.instagram_business_account || null;
        } catch (error) {
            console.error('Get Instagram business account error:', error);
            throw error;
        }
    }

    /**
     * Get Facebook page posts with engagement metrics
     * @param {string} pageId - Facebook page ID
     * @param {string} pageAccessToken - Page access token
     * @param {Object} options - Query options { limit, after, until }
     * @returns {Promise<Array>} Array of posts with engagement data
     */
    async getFacebookPagePosts(pageId, pageAccessToken, options = {}) {
        try {
            const {
                limit = 25,
                after = null,
                until = null,
            } = options;

            const fields = 'id,created_time,message,story,permalink_url,picture,type,shares,comments.summary(true),likes.summary(true)';
            let url = `${this.baseUrl}/${this.apiVersion}/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${pageAccessToken}`;

            if (after) url += `&after=${after}`;
            if (until) url += `&until=${until}`;

            return await this.cachedFetch(url);
        } catch (error) {
            console.error('Get Facebook posts error:', error);
            throw error;
        }
    }

    /**
     * Get detailed insights for a specific Facebook post
     * @param {string} postId - Facebook post ID (format: pageId_postId)
     * @param {string} pageAccessToken - Page access token
     * @returns {Promise<Object>} Post insights with metrics
     */
    async getFacebookPostInsights(postId, pageAccessToken) {
        try {
            const metrics = 'post_impressions,post_impressions_unique,post_engaged_users,post_negative_feedback';
            const url = `${this.baseUrl}/${this.apiVersion}/${postId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;
            const response = await this.cachedFetch(url);
            
            // Transform insights into readable format
            const insights = {};
            if (response.data) {
                response.data.forEach(metric => {
                    insights[metric.name] = metric.values[0]?.value || 0;
                });
            }
            return insights;
        } catch (error) {
            console.error('Get Facebook post insights error:', error);
            throw error;
        }
    }

    /**
     * Get Instagram media (posts/reels/stories)
     * @param {string} instagramBusinessAccountId - Instagram Business Account ID
     * @param {string} pageAccessToken - Page access token
     * @param {Object} options - Query options { limit, after }
     * @returns {Promise<Array>} Array of Instagram media
     */
    async getInstagramMedia(instagramBusinessAccountId, pageAccessToken, options = {}) {
        try {
            const {
                limit = 25,
                after = null,
            } = options;

            const fields = 'id,caption,media_type,media_url,timestamp,permalink,thumbnail_url,like_count,comments_count';
            let url = `${this.baseUrl}/${this.apiVersion}/${instagramBusinessAccountId}/media?fields=${fields}&limit=${limit}&access_token=${pageAccessToken}`;

            if (after) url += `&after=${after}`;

            return await this.cachedFetch(url);
        } catch (error) {
            console.error('Get Instagram media error:', error);
            throw error;
        }
    }

    /**
     * Get Instagram post insights
     * @param {string} mediaId - Instagram media ID
     * @param {string} pageAccessToken - Page access token
     * @returns {Promise<Object>} Media insights
     */
    async getInstagramMediaInsights(mediaId, pageAccessToken) {
        try {
            const metrics = 'impressions,engagement,reach,saved,video_views';
            const url = `${this.baseUrl}/${this.apiVersion}/${mediaId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;
            const response = await this.cachedFetch(url);

            // Transform insights
            const insights = {};
            if (response.data) {
                response.data.forEach(metric => {
                    insights[metric.name] = metric.values[0]?.value || 0;
                });
            }
            return insights;
        } catch (error) {
            console.error('Get Instagram media insights error:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Cached fetch with TTL
     * @param {string} url - API URL to fetch
     * @param {number} ttl - Cache TTL in seconds (default: 3600)
     * @returns {Promise<Object>} API response
     */
    async cachedFetch(url, ttl = 3600) {
        const now = Date.now();
        const cached = this.requestCache.get(url);

        if (cached && (now - cached.timestamp) < (ttl * 1000)) {
            return cached.data;
        }

        try {
            this.checkRateLimit();
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            // Cache the result
            this.requestCache.set(url, {
                data,
                timestamp: now,
            });

            // Track rate limit
            this.rateLimitTracker.calls.push(now);
            
            return data;
        } catch (error) {
            console.error('Cached fetch error:', error);
            throw error;
        }
    }

    /**
     * Check rate limit and throw if exceeded
     * @throws {Error} If rate limit exceeded
     */
    checkRateLimit() {
        const now = Date.now();
        const hourAgo = now - 3600000;

        // Reset if hour has passed
        if (now > this.rateLimitTracker.resetTime) {
            this.rateLimitTracker.calls = [];
            this.rateLimitTracker.resetTime = now + 3600000;
        }

        // Count calls in last hour
        const recentCalls = this.rateLimitTracker.calls.filter(time => time > hourAgo).length;

        if (recentCalls >= 200) {
            throw new Error('Rate limit exceeded (200 calls/hour)');
        }
    }

    /**
     * Convert object to query string
     * @param {Object} obj - Object to convert
     * @returns {string} Query string
     */
    objectToQuery(obj) {
        return Object.entries(obj)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
    }

    /**
     * Generate random string for OAuth state
     * @param {number} length - String length
     * @returns {string} Random string
     */
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.requestCache.clear();
    }

    /**
     * Clear old cache entries
     * @param {number} maxAge - Max age in seconds
     */
    clearOldCache(maxAge = 3600) {
        const now = Date.now();
        const threshold = now - (maxAge * 1000);

        for (const [key, value] of this.requestCache.entries()) {
            if (value.timestamp < threshold) {
                this.requestCache.delete(key);
            }
        }
    }
}

// Export for use in Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetaAPIService;
}
