/**
 * Meta API Configuration
 * Handles credentials and configuration for Meta Graph API integration
 */

const META_CONFIG = {
    // Meta App Credentials (Replace with your actual App ID)
    APP_ID: process.env.REACT_APP_META_APP_ID || '',
    APP_SECRET: process.env.REACT_APP_META_APP_SECRET || '',
    
    // API Configuration
    API_VERSION: 'v18.0',
    GRAPH_API_BASE: 'https://graph.instagram.com',
    FACEBOOK_GRAPH_BASE: 'https://graph.facebook.com',
    
    // Redirect URI for OAuth
    REDIRECT_URI: process.env.REACT_APP_META_REDIRECT_URI || 'http://localhost:3000/auth/meta/callback',
    
    // Required permissions for the app
    REQUIRED_PERMISSIONS: [
        'pages_read_engagement',
        'pages_read_user_content',
        'instagram_basic',
        'instagram_graph_api'
    ],
    
    // Token configuration
    TOKEN_CONFIG: {
        ACCESS_TOKEN_EXPIRY_BUFFER: 300, // Refresh 5 minutes before expiry (in seconds)
        CACHE_DURATION: 3600, // Cache results for 1 hour (in seconds)
    },
    
    // Rate limiting
    RATE_LIMIT: {
        MAX_CALLS_PER_HOUR: 200, // Development limit
        CHECK_INTERVAL: 60000, // Check every minute (in milliseconds)
    },
    
    // Field mappings for data extraction
    FACEBOOK_POST_FIELDS: [
        'id',
        'created_time',
        'message',
        'story',
        'permalink_url',
        'type',
        'picture',
        'shares',
        'comments.summary(true)',
    ],
    
    FACEBOOK_INSIGHTS_FIELDS: [
        'post_impressions',
        'post_impressions_unique',
        'post_engaged_users',
        'post_negative_feedback',
        'post_engaged_fan',
    ],
    
    INSTAGRAM_MEDIA_FIELDS: [
        'id',
        'caption',
        'media_type',
        'media_url',
        'timestamp',
        'permalink',
        'thumbnail_url',
    ],
    
    INSTAGRAM_INSIGHTS_FIELDS: [
        'impressions',
        'engagement',
        'reach',
        'saved',
        'video_views',
    ],
    
    // Facebook Graph API fields for metrics
    FACEBOOK_METRIC_FIELDS: {
        'post_impressions': 'impressions',
        'post_engaged_users': 'engaged_users',
        'post_negative_feedback': 'negative_feedback',
        'post_impressions_unique': 'unique_impressions',
    },
};

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = META_CONFIG;
}
