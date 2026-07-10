/**
 * Meta Token Storage Service
 * Securely stores and manages Meta API tokens in Firebase
 * Handles token refresh and expiration
 */

class MetaTokenService {
    constructor(db, userId) {
        this.db = db;
        this.userId = userId;
        this.tokensPath = `worksync/meta_tokens/${userId}`;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Save tokens to Firebase
     * @param {Object} tokenData - { accessToken, refreshToken, expiresAt, pageId, pageName, platform }
     * @returns {Promise<void>}
     */
    async saveTokens(tokenData) {
        try {
            const tokenId = this.generateTokenId();
            const timestamp = new Date().toISOString();

            const token = {
                accessToken: this.encryptToken(tokenData.accessToken),
                refreshToken: tokenData.refreshToken ? this.encryptToken(tokenData.refreshToken) : null,
                expiresAt: tokenData.expiresAt,
                platform: tokenData.platform || 'facebook', // 'facebook' or 'instagram'
                pageId: tokenData.pageId,
                pageName: tokenData.pageName,
                savedAt: timestamp,
                lastUsed: timestamp,
                status: 'active',
                userId: this.userId,
            };

            const tokenRef = ref(this.db, `${this.tokensPath}/${tokenId}`);
            await set(tokenRef, token);

            return tokenId;
        } catch (error) {
            console.error('Save tokens error:', error);
            throw error;
        }
    }

    /**
     * Get all tokens for user
     * @returns {Promise<Array>} Array of token objects
     */
    async getAllTokens() {
        try {
            const tokensRef = ref(this.db, this.tokensPath);
            const snapshot = await get(tokensRef);

            if (!snapshot.exists()) {
                return [];
            }

            const tokens = [];
            snapshot.forEach(childSnapshot => {
                const token = childSnapshot.val();
                token.id = childSnapshot.key;
                tokens.push(token);
            });

            return tokens;
        } catch (error) {
            console.error('Get all tokens error:', error);
            throw error;
        }
    }

    /**
     * Get specific token by ID
     * @param {string} tokenId - Token ID
     * @returns {Promise<Object>} Token data
     */
    async getToken(tokenId) {
        try {
            const tokenRef = ref(this.db, `${this.tokensPath}/${tokenId}`);
            const snapshot = await get(tokenRef);

            if (!snapshot.exists()) {
                return null;
            }

            const token = snapshot.val();
            token.id = tokenId;
            return token;
        } catch (error) {
            console.error('Get token error:', error);
            throw error;
        }
    }

    /**
     * Get valid access token (refresh if needed)
     * @param {string} tokenId - Token ID
     * @param {MetaAPIService} metaAPI - Meta API service instance
     * @returns {Promise<string>} Valid access token
     */
    async getValidAccessToken(tokenId, metaAPI) {
        try {
            const token = await this.getToken(tokenId);

            if (!token) {
                throw new Error('Token not found');
            }

            const now = Date.now();
            const expiresAt = new Date(token.expiresAt).getTime();
            const bufferTime = 5 * 60 * 1000; // 5 minutes

            // Token is still valid
            if (expiresAt - now > bufferTime) {
                // Update last used timestamp
                await this.updateLastUsed(tokenId);
                return this.decryptToken(token.accessToken);
            }

            // Token expired, try to refresh
            if (token.refreshToken) {
                const newToken = await this.refreshToken(tokenId, metaAPI);
                return newToken;
            }

            throw new Error('Token expired and no refresh token available');
        } catch (error) {
            console.error('Get valid access token error:', error);
            throw error;
        }
    }

    /**
     * Refresh token using refresh token
     * @param {string} tokenId - Token ID
     * @param {MetaAPIService} metaAPI - Meta API service instance
     * @returns {Promise<string>} New access token
     */
    async refreshToken(tokenId, metaAPI) {
        try {
            const token = await this.getToken(tokenId);

            if (!token || !token.refreshToken) {
                throw new Error('Cannot refresh: token or refresh token not found');
            }

            const refreshToken = this.decryptToken(token.refreshToken);
            const newTokenData = await metaAPI.getLongLivedToken(refreshToken);

            // Calculate expiration time (Meta gives it in seconds)
            const expiresAt = new Date(Date.now() + newTokenData.expiresIn * 1000);

            // Update token in database
            const tokenRef = ref(this.db, `${this.tokensPath}/${tokenId}`);
            await update(tokenRef, {
                accessToken: this.encryptToken(newTokenData.accessToken),
                expiresAt: expiresAt.toISOString(),
                lastRefreshed: new Date().toISOString(),
            });

            return newTokenData.accessToken;
        } catch (error) {
            console.error('Refresh token error:', error);
            // Mark token as invalid
            await this.markTokenInvalid(tokenId);
            throw error;
        }
    }

    /**
     * Update last used timestamp
     * @param {string} tokenId - Token ID
     * @returns {Promise<void>}
     */
    async updateLastUsed(tokenId) {
        try {
            const tokenRef = ref(this.db, `${this.tokensPath}/${tokenId}`);
            await update(tokenRef, {
                lastUsed: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Update last used error:', error);
        }
    }

    /**
     * Mark token as invalid
     * @param {string} tokenId - Token ID
     * @returns {Promise<void>}
     */
    async markTokenInvalid(tokenId) {
        try {
            const tokenRef = ref(this.db, `${this.tokensPath}/${tokenId}`);
            await update(tokenRef, {
                status: 'invalid',
                invalidatedAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Mark token invalid error:', error);
        }
    }

    /**
     * Delete token
     * @param {string} tokenId - Token ID
     * @returns {Promise<void>}
     */
    async deleteToken(tokenId) {
        try {
            const tokenRef = ref(this.db, `${this.tokensPath}/${tokenId}`);
            await remove(tokenRef);
        } catch (error) {
            console.error('Delete token error:', error);
            throw error;
        }
    }

    /**
     * Get tokens by platform
     * @param {string} platform - 'facebook' or 'instagram'
     * @returns {Promise<Array>} Filtered tokens
     */
    async getTokensByPlatform(platform) {
        try {
            const allTokens = await this.getAllTokens();
            return allTokens.filter(token => token.platform === platform && token.status === 'active');
        } catch (error) {
            console.error('Get tokens by platform error:', error);
            throw error;
        }
    }

    /**
     * Get connected pages
     * @returns {Promise<Array>} Array of connected pages with metadata
     */
    async getConnectedPages() {
        try {
            const allTokens = await this.getAllTokens();
            return allTokens
                .filter(token => token.status === 'active')
                .map(token => ({
                    tokenId: token.id,
                    pageId: token.pageId,
                    pageName: token.pageName,
                    platform: token.platform,
                    connectedAt: token.savedAt,
                    lastUsed: token.lastUsed,
                }));
        } catch (error) {
            console.error('Get connected pages error:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENCRYPTION & SECURITY
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Encrypt token (simple base64 - for production use proper encryption)
     * @param {string} token - Token to encrypt
     * @returns {string} Encrypted token
     */
    encryptToken(token) {
        // TODO: In production, implement proper AES encryption
        // For now, using base64 as placeholder
        return btoa(token);
    }

    /**
     * Decrypt token
     * @param {string} encrypted - Encrypted token
     * @returns {string} Decrypted token
     */
    decryptToken(encrypted) {
        // TODO: In production, implement proper AES decryption
        return atob(encrypted);
    }

    /**
     * Generate unique token ID
     * @returns {string} Token ID
     */
    generateTokenId() {
        return `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetaTokenService;
}
