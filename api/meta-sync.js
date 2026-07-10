/**
 * Meta Data Sync Service
 * Handles syncing posts and metrics from Meta platforms to local analytics
 * Includes deduplication, data mapping, and scheduled syncing
 */

class MetaSyncService {
    constructor(db, metaAPI, tokenService) {
        this.db = db;
        this.metaAPI = metaAPI;
        this.tokenService = tokenService;
        this.syncInProgress = false;
        this.lastSyncTime = null;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MANUAL SYNC
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Manually trigger sync for all connected pages
     * @param {string} userId - Current user ID
     * @returns {Promise<Object>} Sync results { success, posts, errors, duration }
     */
    async manualSync(userId) {
        if (this.syncInProgress) {
            throw new Error('Sync already in progress');
        }

        this.syncInProgress = true;
        const startTime = Date.now();
        const results = {
            success: true,
            posts: [],
            pages: [],
            errors: [],
            duration: 0,
            syncedAt: new Date().toISOString(),
        };

        try {
            // Get all connected pages for user
            const pages = await this.tokenService.getConnectedPages();

            if (pages.length === 0) {
                results.success = false;
                results.errors.push('No connected pages found');
                return results;
            }

            // Sync each page
            for (const page of pages) {
                try {
                    const pageResults = await this.syncPage(page.tokenId, page.platform, userId);
                    results.posts.push(...pageResults.posts);
                    results.pages.push({
                        pageId: page.pageId,
                        pageName: page.pageName,
                        platform: page.platform,
                        postCount: pageResults.posts.length,
                        success: true,
                    });
                } catch (error) {
                    console.error(`Sync error for page ${page.pageId}:`, error);
                    results.errors.push({
                        pageId: page.pageId,
                        pageName: page.pageName,
                        error: error.message,
                    });
                    results.pages.push({
                        pageId: page.pageId,
                        pageName: page.pageName,
                        platform: page.platform,
                        success: false,
                        error: error.message,
                    });
                }
            }

            results.duration = Date.now() - startTime;
            this.lastSyncTime = Date.now();
            this.syncInProgress = false;

            return results;
        } catch (error) {
            console.error('Manual sync error:', error);
            results.success = false;
            results.errors.push(error.message);
            results.duration = Date.now() - startTime;
            this.syncInProgress = false;
            return results;
        }
    }

    /**
     * Sync posts from a specific page
     * @param {string} tokenId - Token ID for the page
     * @param {string} platform - 'facebook' or 'instagram'
     * @param {string} userId - Current user ID
     * @returns {Promise<Object>} { posts, duplicates }
     */
    async syncPage(tokenId, platform, userId) {
        try {
            const token = await this.tokenService.getToken(tokenId);
            if (!token) throw new Error('Token not found');

            const accessToken = await this.tokenService.getValidAccessToken(tokenId, this.metaAPI);
            const results = { posts: [], duplicates: 0 };

            if (platform === 'facebook') {
                results = await this.syncFacebookPage(token.pageId, accessToken, userId, token);
            } else if (platform === 'instagram') {
                results = await this.syncInstagramPage(token.pageId, accessToken, userId, token);
            }

            return results;
        } catch (error) {
            console.error(`Sync page error (${tokenId}):`, error);
            throw error;
        }
    }

    /**
     * Sync Facebook page posts
     * @private
     */
    async syncFacebookPage(pageId, pageAccessToken, userId, pageToken) {
        try {
            const results = { posts: [], duplicates: 0 };
            const postsData = await this.metaAPI.getFacebookPagePosts(pageId, pageAccessToken, { limit: 25 });

            if (!postsData.data || postsData.data.length === 0) {
                return results;
            }

            for (const post of postsData.data) {
                try {
                    // Get post insights
                    const insights = await this.metaAPI.getFacebookPostInsights(post.id, pageAccessToken);

                    // Map to analytics format
                    const analyticsEntry = this.mapFacebookPostToAnalytics(
                        post,
                        insights,
                        pageToken,
                        userId
                    );

                    // Check for duplicates
                    const isDuplicate = await this.isDuplicatePost(analyticsEntry, userId);
                    if (isDuplicate) {
                        results.duplicates++;
                        continue;
                    }

                    // Save to analytics
                    const docId = await this.saveAnalyticsEntry(analyticsEntry, userId);
                    analyticsEntry.docId = docId;
                    results.posts.push(analyticsEntry);

                } catch (postError) {
                    console.error(`Error syncing Facebook post ${post.id}:`, postError);
                    continue;
                }
            }

            return results;
        } catch (error) {
            console.error('Sync Facebook page error:', error);
            throw error;
        }
    }

    /**
     * Sync Instagram page posts
     * @private
     */
    async syncInstagramPage(pageId, pageAccessToken, userId, pageToken) {
        try {
            const results = { posts: [], duplicates: 0 };

            // Get Instagram Business Account
            const igAccount = await this.metaAPI.getInstagramBusinessAccount(pageId, pageAccessToken);
            if (!igAccount) {
                console.warn(`No Instagram Business Account found for page ${pageId}`);
                return results;
            }

            const mediaData = await this.metaAPI.getInstagramMedia(
                igAccount.id,
                pageAccessToken,
                { limit: 25 }
            );

            if (!mediaData.data || mediaData.data.length === 0) {
                return results;
            }

            for (const media of mediaData.data) {
                try {
                    // Get media insights
                    const insights = await this.metaAPI.getInstagramMediaInsights(media.id, pageAccessToken);

                    // Map to analytics format
                    const analyticsEntry = this.mapInstagramMediaToAnalytics(
                        media,
                        insights,
                        pageToken,
                        userId
                    );

                    // Check for duplicates
                    const isDuplicate = await this.isDuplicatePost(analyticsEntry, userId);
                    if (isDuplicate) {
                        results.duplicates++;
                        continue;
                    }

                    // Save to analytics
                    const docId = await this.saveAnalyticsEntry(analyticsEntry, userId);
                    analyticsEntry.docId = docId;
                    results.posts.push(analyticsEntry);

                } catch (mediaError) {
                    console.error(`Error syncing Instagram media ${media.id}:`, mediaError);
                    continue;
                }
            }

            return results;
        } catch (error) {
            console.error('Sync Instagram page error:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DATA MAPPING
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Map Facebook post to analytics format
     * @private
     */
    mapFacebookPostToAnalytics(post, insights, pageToken, userId) {
        const postingDate = post.created_time ? post.created_time.split('T')[0] : new Date().toISOString().split('T')[0];

        return {
            // User info
            userId: userId,
            userKey: userId.replace(/[.#$\[\]]/g, '_'),
            
            // Basic info
            title: post.message || post.story || '[No caption]',
            platform: 'Facebook',
            postType: 'Post',
            link: post.permalink_url || `https://facebook.com/${post.id}`,
            client: pageToken.pageName || '',
            
            // Dates
            postingDate: postingDate,
            reportDate: new Date().toISOString().split('T')[0],
            
            // Metrics
            views: insights['post_impressions'] || 0,
            reach: insights['post_impressions_unique'] || 0,
            likes: post.likes?.summary?.total_count || 0,
            shares: post.shares?.data?.length || 0,
            comments: post.comments?.summary?.total_count || 0,
            followers: 0, // Will fetch separately
            
            // Meta tracking
            metaPostId: post.id,
            metaPageId: pageToken.pageId,
            metaSyncedAt: new Date().toISOString(),
            autoSynced: true,
            metaMetrics: {
                impressions: insights['post_impressions'],
                engagedUsers: insights['post_engaged_users'],
                negativeFeedback: insights['post_negative_feedback'],
            },
            
            // Status
            notes: `Auto-synced from Meta on ${new Date().toLocaleString()}`,
        };
    }

    /**
     * Map Instagram media to analytics format
     * @private
     */
    mapInstagramMediaToAnalytics(media, insights, pageToken, userId) {
        const postingDate = media.timestamp ? media.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];

        return {
            // User info
            userId: userId,
            userKey: userId.replace(/[.#$\[\]]/g, '_'),
            
            // Basic info
            title: media.caption || '[No caption]',
            platform: 'Instagram',
            postType: this.getInstagramPostType(media.media_type),
            link: media.permalink || `https://instagram.com/p/${media.id}`,
            client: pageToken.pageName || '',
            
            // Dates
            postingDate: postingDate,
            reportDate: new Date().toISOString().split('T')[0],
            
            // Metrics
            views: media.video_views || insights['impressions'] || 0,
            reach: insights['reach'] || 0,
            likes: media.like_count || 0,
            shares: 0, // Instagram API doesn't provide share count
            comments: media.comments_count || 0,
            followers: 0, // Will fetch separately
            
            // Meta tracking
            metaPostId: media.id,
            metaPageId: pageToken.pageId,
            metaSyncedAt: new Date().toISOString(),
            autoSynced: true,
            metaMetrics: {
                impressions: insights['impressions'],
                engagement: insights['engagement'],
                saved: insights['saved'],
                videoViews: insights['video_views'],
            },
            
            // Status
            notes: `Auto-synced from Meta on ${new Date().toLocaleString()}`,
        };
    }

    /**
     * Get Instagram post type from media type
     * @private
     */
    getInstagramPostType(mediaType) {
        const typeMap = {
            'IMAGE': 'Image',
            'VIDEO': 'Video',
            'CAROUSEL': 'Carousel',
            'REELS': 'Reel',
        };
        return typeMap[mediaType] || 'Post';
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEDUPLICATION & STORAGE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Check if post is duplicate
     * @private
     */
    async isDuplicatePost(entry, userId) {
        try {
            const analyticsRef = ref(this.db, `worksync/social_analytics/${userId.replace(/[.#$\[\]]/g, '_')}`);
            const snapshot = await get(analyticsRef);

            if (!snapshot.exists()) {
                return false;
            }

            // Check by metaPostId or by exact match
            let isDuplicate = false;
            snapshot.forEach(childSnapshot => {
                const existing = childSnapshot.val();
                if (existing.metaPostId === entry.metaPostId ||
                    (existing.link === entry.link && existing.postingDate === entry.postingDate)) {
                    isDuplicate = true;
                }
            });

            return isDuplicate;
        } catch (error) {
            console.error('Duplicate check error:', error);
            return false;
        }
    }

    /**
     * Save analytics entry to Firebase
     * @private
     */
    async saveAnalyticsEntry(entry, userId) {
        try {
            const userKey = userId.replace(/[.#$\[\]]/g, '_');
            const docId = `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const entryRef = ref(this.db, `worksync/social_analytics/${userKey}/${docId}`);
            
            await set(entryRef, entry);
            return docId;
        } catch (error) {
            console.error('Save analytics entry error:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SCHEDULED SYNC
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Start scheduled sync
     * @param {string} userId - User ID
     * @param {number} intervalMinutes - Sync interval in minutes (default: 60)
     * @returns {number} Interval ID for cleanup later
     */
    startScheduledSync(userId, intervalMinutes = 60) {
        const intervalId = setInterval(() => {
            this.manualSync(userId)
                .then(results => {
                    console.log(`Scheduled sync completed: ${results.posts.length} posts synced`);
                })
                .catch(error => {
                    console.error('Scheduled sync error:', error);
                });
        }, intervalMinutes * 60 * 1000);

        return intervalId;
    }

    /**
     * Stop scheduled sync
     * @param {number} intervalId - Interval ID from startScheduledSync
     */
    stopScheduledSync(intervalId) {
        if (intervalId) {
            clearInterval(intervalId);
        }
    }

    /**
     * Get sync status
     * @returns {Object} Sync status
     */
    getSyncStatus() {
        return {
            syncInProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime,
            lastSyncFormatted: this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleString() : 'Never',
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetaSyncService;
}
