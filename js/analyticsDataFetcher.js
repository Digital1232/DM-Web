/**
 * Analytics Data Fetcher Module
 * Fetches and processes analytics data using the import template
 * Supports fetching from Meta, custom imports, and database
 */

// ════════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITION
// ════════════════════════════════════════════════════════════════════

const ANALYTICS_TEMPLATE = {
  version: '1.0.0',
  schema: {
    post: {
      type: 'string',
      description: 'Post title or content',
      required: true,
      example: '🚨Attention Alumni Squad 📢'
    },
    client: {
      type: 'string',
      description: 'Client/Platform name',
      required: true,
      enum: ['Einstein', 'IVN', 'NTT', 'Dream Daa', 'Quade'],
      example: 'Einstein'
    },
    postDate: {
      type: 'date',
      description: 'Date post was published',
      required: true,
      formats: ['MM-DD-YYYY', 'YYYY-MM-DD', 'DD-MMM'],
      example: '07-01-2026'
    },
    postType: {
      type: 'string',
      description: 'Type of post',
      required: true,
      enum: ['Video', 'Post', 'Image', 'Reel', 'Story', 'Carousel'],
      example: 'Video'
    },
    views: {
      type: 'number',
      description: 'Total views',
      required: true,
      minimum: 0,
      example: 4149
    },
    likes: {
      type: 'number',
      description: 'Total likes',
      required: true,
      minimum: 0,
      example: 149
    },
    comments: {
      type: 'number',
      description: 'Total comments',
      required: true,
      minimum: 0,
      example: 1
    },
    shares: {
      type: 'number',
      description: 'Total shares',
      required: true,
      minimum: 0,
      example: 137
    },
    profileVisits: {
      type: 'number',
      description: 'Profile visits from post',
      required: false,
      minimum: 0,
      example: 8
    },
    profileReach: {
      type: 'number',
      description: 'Profile reach',
      required: false,
      minimum: 0,
      example: 3598
    },
    engagements: {
      type: 'number',
      description: 'Total engagements (auto-calculated if blank)',
      required: false,
      minimum: 0,
      example: 287
    },
    clicks: {
      type: 'number',
      description: 'Total clicks',
      required: false,
      minimum: 0,
      example: 164
    }
  }
};

// ════════════════════════════════════════════════════════════════════
// DATA FETCHING
// ════════════════════════════════════════════════════════════════════

/**
 * Fetch analytics data from Meta API
 * @param {string} pageId - Facebook/Instagram page ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Analytics records
 */
async function fetchMetaAnalytics(pageId, options = {}) {
  const {
    startDate = null,
    endDate = null,
    limit = 25,
    fields = 'created_time,message,type,story,permalink_url,full_picture'
  } = options;

  try {
    const params = new URLSearchParams({
      fields,
      limit,
      access_token: localStorage.getItem('meta_access_token')
    });

    if (startDate) params.append('since', Math.floor(new Date(startDate).getTime() / 1000));
    if (endDate) params.append('until', Math.floor(new Date(endDate).getTime() / 1000));

    const response = await fetch(`/api/meta/pages/${pageId}/posts?${params}`);
    if (!response.ok) {
      throw new Error(`Meta API error: ${response.status}`);
    }

    const data = await response.json();
    return transformMetaPostsToAnalytics(data.data || [], pageId);
  } catch (error) {
    console.error('Error fetching Meta analytics:', error);
    throw error;
  }
}

/**
 * Transform Meta API posts to analytics template format
 * @param {Array} posts - Meta API posts
 * @param {string} pageId - Page ID for context
 * @returns {Array} Transformed records
 */
function transformMetaPostsToAnalytics(posts, pageId) {
  return posts.map(post => ({
    post: post.message || post.story || '(No description)',
    client: pageId, // Would be mapped to actual client name
    postDate: post.created_time,
    postType: mapMetaPostType(post.type),
    views: post.impressions || 0,
    likes: post.likes?.data?.length || 0,
    comments: post.comments?.data?.length || 0,
    shares: post.shares?.data?.length || 0,
    profileVisits: post.profile_visits || 0,
    profileReach: post.reach || 0,
    engagements: (post.likes?.data?.length || 0) + (post.comments?.data?.length || 0) + (post.shares?.data?.length || 0),
    clicks: post.clicks || 0
  }));
}

/**
 * Map Meta post type to analytics template type
 * @param {string} metaType - Meta API post type
 * @returns {string} Template post type
 */
function mapMetaPostType(metaType) {
  const typeMap = {
    'VIDEO': 'Video',
    'STATUS': 'Post',
    'PHOTO': 'Image',
    'LINK': 'Post',
    'CHECKIN': 'Post'
  };
  return typeMap[metaType?.toUpperCase()] || 'Post';
}

/**
 * Fetch analytics data from database
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Analytics records
 */
async function fetchDatabaseAnalytics(filters = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.client) queryParams.append('client', filters.client);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.postType) queryParams.append('postType', filters.postType);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const response = await fetch(`/api/analytics?${queryParams}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error('Error fetching database analytics:', error);
    throw error;
  }
}

/**
 * Fetch and merge analytics from multiple sources
 * @param {Array} sources - Array of source configs: { type: 'meta'|'database', ...options }
 * @returns {Promise<Object>} Merged analytics with source info
 */
async function fetchMergedAnalytics(sources = []) {
  const allRecords = [];
  const errors = [];

  for (const source of sources) {
    try {
      let records = [];
      
      if (source.type === 'meta') {
        records = await fetchMetaAnalytics(source.pageId, source.options);
      } else if (source.type === 'database') {
        records = await fetchDatabaseAnalytics(source.filters);
      } else if (source.type === 'csv') {
        records = source.data || [];
      }

      allRecords.push(...records.map(r => ({
        ...r,
        _source: source.type,
        _sourceId: source.pageId || source.label || 'unknown'
      })));
    } catch (error) {
      errors.push({
        source: source.type,
        sourceId: source.pageId || source.label,
        error: error.message
      });
    }
  }

  return {
    records: allRecords,
    summary: {
      totalRecords: allRecords.length,
      successCount: sources.length - errors.length,
      failureCount: errors.length,
      errors
    }
  };
}

// ════════════════════════════════════════════════════════════════════
// DATA FILTERING & AGGREGATION
// ════════════════════════════════════════════════════════════════════

/**
 * Filter analytics records by criteria
 * @param {Array} records - Analytics records
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered records
 */
function filterAnalytics(records, filters = {}) {
  let filtered = records;

  if (filters.client) {
    filtered = filtered.filter(r => r.client === filters.client);
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    filtered = filtered.filter(r => new Date(r.postDate) >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    filtered = filtered.filter(r => new Date(r.postDate) <= end);
  }

  if (filters.postType) {
    filtered = filtered.filter(r => r.postType === filters.postType);
  }

  if (filters.minViews) {
    filtered = filtered.filter(r => r.views >= filters.minViews);
  }

  if (filters.minEngagement) {
    filtered = filtered.filter(r => (r.engagements || 0) >= filters.minEngagement);
  }

  return filtered;
}

/**
 * Aggregate analytics data
 * @param {Array} records - Analytics records
 * @param {string} groupBy - Grouping field: 'client', 'postType', 'date', 'week', 'month'
 * @returns {Object} Aggregated data
 */
function aggregateAnalytics(records, groupBy = 'client') {
  const aggregated = {};

  records.forEach(record => {
    let key;
    
    switch (groupBy) {
      case 'client':
        key = record.client;
        break;
      case 'postType':
        key = record.postType;
        break;
      case 'date':
        key = record.postDate;
        break;
      case 'week':
        key = getWeekOf(new Date(record.postDate));
        break;
      case 'month':
        key = getMonthOf(new Date(record.postDate));
        break;
      default:
        key = 'all';
    }

    if (!aggregated[key]) {
      aggregated[key] = {
        totalPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalEngagements: 0,
        totalProfileVisits: 0,
        totalProfileReach: 0,
        totalClicks: 0,
        averageViews: 0,
        averageEngagementRate: 0,
        records: []
      };
    }

    const agg = aggregated[key];
    agg.totalPosts++;
    agg.totalViews += record.views || 0;
    agg.totalLikes += record.likes || 0;
    agg.totalComments += record.comments || 0;
    agg.totalShares += record.shares || 0;
    agg.totalEngagements += record.engagements || 0;
    agg.totalProfileVisits += record.profileVisits || 0;
    agg.totalProfileReach += record.profileReach || 0;
    agg.totalClicks += record.clicks || 0;
    agg.records.push(record);
  });

  // Calculate averages
  Object.values(aggregated).forEach(agg => {
    agg.averageViews = agg.totalPosts > 0 ? Math.round(agg.totalViews / agg.totalPosts) : 0;
    agg.averageEngagementRate = agg.totalViews > 0 
      ? Math.round((agg.totalEngagements / agg.totalViews) * 100 * 100) / 100 
      : 0;
  });

  return aggregated;
}

/**
 * Calculate statistics for analytics records
 * @param {Array} records - Analytics records
 * @returns {Object} Statistics
 */
function calculateStatistics(records) {
  if (records.length === 0) {
    return {
      totalRecords: 0,
      totalViews: 0,
      totalEngagements: 0,
      averageViews: 0,
      averageEngagementRate: 0,
      topPost: null,
      topPerformerByViews: null,
      topPerformerByEngagement: null
    };
  }

  const totalViews = records.reduce((sum, r) => sum + (r.views || 0), 0);
  const totalEngagements = records.reduce((sum, r) => sum + (r.engagements || 0), 0);
  const averageViews = Math.round(totalViews / records.length);
  const averageEngagementRate = Math.round((totalEngagements / totalViews) * 100 * 100) / 100;

  const topByViews = [...records].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  const topByEngagement = [...records].sort((a, b) => (b.engagements || 0) - (a.engagements || 0))[0];

  return {
    totalRecords: records.length,
    totalViews,
    totalEngagements,
    averageViews,
    averageEngagementRate,
    topPost: topByViews,
    topPerformerByViews: topByViews,
    topPerformerByEngagement: topByEngagement
  };
}

// ════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════

/**
 * Get week identifier for a date
 * @param {Date} date - Date object
 * @returns {string} Week identifier (e.g., '2026-W28')
 */
function getWeekOf(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get month identifier for a date
 * @param {Date} date - Date object
 * @returns {string} Month identifier (e.g., '2026-07')
 */
function getMonthOf(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get template schema
 * @returns {Object} Template schema
 */
function getTemplateSchema() {
  return ANALYTICS_TEMPLATE;
}

/**
 * Validate data matches template
 * @param {Object} record - Record to validate
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateAgainstTemplate(record) {
  const errors = [];

  Object.entries(ANALYTICS_TEMPLATE.schema).forEach(([field, definition]) => {
    const value = record[field];

    // Check required fields
    if (definition.required && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required field: ${field}`);
      return;
    }

    if (value === undefined || value === null || value === '') return; // Optional field

    // Check enum values
    if (definition.enum && !definition.enum.includes(value)) {
      errors.push(`${field} must be one of: ${definition.enum.join(', ')}`);
    }

    // Check type
    if (definition.type === 'number' && typeof value !== 'number') {
      errors.push(`${field} must be a number`);
    }

    // Check minimum
    if (definition.minimum !== undefined && value < definition.minimum) {
      errors.push(`${field} must be >= ${definition.minimum}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Export analytics to CSV format
 * @param {Array} records - Records to export
 * @param {Array} fields - Fields to include (defaults to all)
 * @returns {string} CSV content
 */
function exportToCSV(records, fields = null) {
  const headers = fields || Object.keys(ANALYTICS_TEMPLATE.schema);
  let csv = headers.map(h => `"${h}"`).join(',') + '\n';

  records.forEach(record => {
    const row = headers.map(field => {
      const value = record[field] || '';
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csv += row.join(',') + '\n';
  });

  return csv;
}

/**
 * Export analytics to JSON format
 * @param {Array} records - Records to export
 * @param {Object} metadata - Optional metadata to include
 * @returns {string} JSON content
 */
function exportToJSON(records, metadata = {}) {
  const output = {
    version: ANALYTICS_TEMPLATE.version,
    timestamp: new Date().toISOString(),
    recordCount: records.length,
    metadata,
    records
  };
  return JSON.stringify(output, null, 2);
}

// ════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ANALYTICS_TEMPLATE,
    fetchMetaAnalytics,
    fetchDatabaseAnalytics,
    fetchMergedAnalytics,
    filterAnalytics,
    aggregateAnalytics,
    calculateStatistics,
    getTemplateSchema,
    validateAgainstTemplate,
    exportToCSV,
    exportToJSON,
    mapMetaPostType,
    transformMetaPostsToAnalytics,
    getWeekOf,
    getMonthOf
  };
}

// Expose globally for HTML usage
window.analyticsDataFetcher = {
  ANALYTICS_TEMPLATE,
  fetchMetaAnalytics,
  fetchDatabaseAnalytics,
  fetchMergedAnalytics,
  filterAnalytics,
  aggregateAnalytics,
  calculateStatistics,
  getTemplateSchema,
  validateAgainstTemplate,
  exportToCSV,
  exportToJSON
};
