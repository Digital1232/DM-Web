/**
 * Social Analytics Import Module
 * Handles CSV import for social media analytics data
 * Supports flexible multi-platform format with weekly analytics structure
 */

// Validation rules for import
const ANALYTICS_IMPORT_RULES = {
  requiredFields: ['Post', 'Client', 'Post Date', 'Post type'],
  validClients: ['NTT', 'Einstein', 'IVN', 'DreamDaa', 'Dream Daa', 'Aladi Ezhilvanan', 'Vilpower', 'Others', 'Vilpower DM', 'Quade', 'Discussion', 'Learning', 'Nivya', 'Mr.Millet', 'Mopower', 'Iniya', '3Jo Toys', 'SalesNaany', 'University', 'Client', 'SKM', 'Ramachandran', 'Ashmithasree', 'Facebook', 'Instagram', 'YouTube', 'LinkedIn', 'X'],
  validPostTypes: ['Video', 'Poster'],
  numericFields: ['Views', 'Likes', 'Comments', 'Shares', 'Profile visits', 'Profile Reach', 'Engagements', 'Clicks', 'Repost'],
  dateFormats: ['MM-DD-YYYY', 'YYYY-MM-DD', 'DD-MMM', 'DD-Mon'],
  maxRecordsPerImport: 500
};

/**
 * Parse CSV text and return array of objects containing headers and rows
 * @param {string} csvText - CSV content
 * @returns {Object} Parsed headers and rows
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV must contain header and at least one data row');
  }

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);
    
    // Check if this is an empty row (all values are empty or just quotes)
    const hasData = values.some(val => val && val.trim() !== '');
    if (!hasData) continue; // Skip completely empty rows

    rows.push({ rowNumber: i + 1, values });
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Parsed values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Validate a single analytics record
 * @param {Object} record - Record to validate
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateAnalyticsRecord(record, rowNumber) {
  const errors = [];

  // Check required fields
  ['post', 'client', 'postDate', 'postType', 'platform'].forEach(field => {
    if (!record[field] || record[field].toString().trim() === '') {
      errors.push(`Row ${rowNumber}: Missing required field "${field}"`);
    }
  });

  // Validate client
  const systemClients = (typeof window !== 'undefined' && window.CLIENTS) ? window.CLIENTS : ((typeof CLIENTS !== 'undefined') ? CLIENTS : ANALYTICS_IMPORT_RULES.validClients);
  if (record.client) {
    const normalizedInput = record.client.toLowerCase().replace(/\s+/g, '');
    const matched = systemClients.some(c => c.toLowerCase().replace(/\s+/g, '') === normalizedInput);
    if (!matched) {
      errors.push(`Row ${rowNumber}: Invalid client "${record.client}". Must be one of: ${systemClients.join(', ')}`);
    }
  }

  // Validate post type
  if (record.postType && !ANALYTICS_IMPORT_RULES.validPostTypes.includes(record.postType)) {
    errors.push(`Row ${rowNumber}: Invalid postType "${record.postType}". Must be one of: ${ANALYTICS_IMPORT_RULES.validPostTypes.join(', ')}`);
  }

  // Validate date format
  if (record.postDate && !isValidDate(record.postDate)) {
    errors.push(`Row ${rowNumber}: Invalid postDate "${record.postDate}". Accepted formats: MM-DD-YYYY, YYYY-MM-DD, DD-MMM`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if string is a valid date
 * Supports: MM-DD-YYYY, YYYY-MM-DD, DD-MMM (e.g., 02-Jul), DD-Mon, and slash equivalents
 * @param {string} dateStr - Date string
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  if (!dateStr) return false;
  
  // Normalize slashes to dashes
  dateStr = dateStr.replace(/\//g, '-');
  
  // Format: YYYY-MM-DD
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(dateStr)) {
    return !isNaN(new Date(dateStr).getTime());
  }

  // Format: MM-DD-YYYY or DD-MM-YYYY
  const usRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const usMatch = dateStr.match(usRegex);
  if (usMatch) {
    const [, p1, p2, year] = usMatch;
    const val1 = parseInt(p1, 10);
    const val2 = parseInt(p2, 10);
    const y = parseInt(year, 10);
    
    // Check if valid as MM-DD-YYYY
    const d1 = new Date(y, val1 - 1, val2);
    const isValidUS = d1.getFullYear() === y && d1.getMonth() === val1 - 1 && d1.getDate() === val2;
    if (isValidUS) return true;
    
    // Check if valid as DD-MM-YYYY
    const d2 = new Date(y, val2 - 1, val1);
    const isValidIN = d2.getFullYear() === y && d2.getMonth() === val2 - 1 && d2.getDate() === val1;
    if (isValidIN) return true;
  }

  // Format: DD-MMM (e.g., 02-Jul, 09-Jul) - assumes current year
  const monthAbbr = /^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i;
  const abbrMatch = dateStr.match(monthAbbr);
  if (abbrMatch) {
    const [, day, month] = abbrMatch;
    const year = new Date().getFullYear();
    const date = new Date(`${day} ${month} ${year}`);
    return !isNaN(date.getTime());
  }

  return false;
}

/**
 * Normalize date to YYYY-MM-DD format
 * @param {string} dateStr - Date in various formats
 * @returns {string} Normalized date YYYY-MM-DD
 */
function normalizeDateFormat(dateStr) {
  if (!dateStr) return dateStr;

  // Normalize slashes to dashes
  dateStr = dateStr.replace(/\//g, '-');

  // Already in ISO format
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(dateStr)) {
    return dateStr;
  }

  // MM-DD-YYYY or DD-MM-YYYY
  const usRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const usMatch = dateStr.match(usRegex);
  if (usMatch) {
    const [, p1, p2, year] = usMatch;
    const val1 = parseInt(p1, 10);
    const val2 = parseInt(p2, 10);
    
    // Check if it is clearly DD-MM-YYYY (first part > 12)
    if (val1 > 12 && val2 <= 12) {
      return `${year}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
    }
    // Default to MM-DD-YYYY
    return `${year}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
  }

  // DD-MMM (e.g., 02-Jul)
  const monthAbbr = /^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i;
  const abbrMatch = dateStr.match(monthAbbr);
  if (abbrMatch) {
    const [, day, month] = abbrMatch;
    const year = new Date().getFullYear();
    const date = new Date(`${day} ${month} ${year}`);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // Fallback: try parsing as-is
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }

  return dateStr;
}

/**
 * Process and validate CSV import
 * Maps multiple platform column sections into distinct platform entries.
 * Format: Post, (3 empty), Client, Date, Type, then platform metrics
 * @param {string} csvText - CSV content
 * @returns {Object} { success: boolean, data: Array, errors: Array, warnings: Array, summary: Object }
 */
function processCSVImport(csvText) {
  const result = {
    success: false,
    data: [],
    errors: [],
    warnings: [],
    summary: {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      skippedRows: 0
    }
  };

  try {
    const { headers, rows } = parseCSV(csvText);
    result.summary.totalRows = rows.length;

    // Check header length - should be 25 (Post + 3 empty + Client + Date + Type + 6 + 5 + 6 + 3)
    if (headers.length < 25) {
      result.errors.push('CSV must contain at least 25 columns (Post + 3 empty + Client + Date + Type + all platform metrics)');
      return result;
    }

    rows.forEach(({ rowNumber, values }) => {
      // Validate column count
      if (values.length !== headers.length) {
        result.errors.push(`Row ${rowNumber}: Expected ${headers.length} columns, got ${values.length}`);
        result.summary.invalidRows++;
        return;
      }

      // Common fields
      const post = values[0] ? values[0].trim() : '';
      const rawClient = values[3] ? values[3].trim() : '';
      const rawDate = values[4] ? values[4].trim() : '';
      const rawType = values[5] ? values[5].trim() : '';

      // Validate common fields
      const rowErrors = [];
      if (!post) rowErrors.push(`Row ${rowNumber}: Missing required field "Post"`);
      if (!rawClient) rowErrors.push(`Row ${rowNumber}: Missing required field "Client"`);
      if (!rawDate) rowErrors.push(`Row ${rowNumber}: Missing required field "Post Date"`);
      if (!rawType) rowErrors.push(`Row ${rowNumber}: Missing required field "Post type"`);

      // Match client case-insensitively and space-insensitively
      let client = rawClient;
      if (rawClient) {
        const systemClients = (typeof window !== 'undefined' && window.CLIENTS) ? window.CLIENTS : ((typeof CLIENTS !== 'undefined') ? CLIENTS : ANALYTICS_IMPORT_RULES.validClients);
        const normalizedClientInput = rawClient.toLowerCase().replace(/\s+/g, '');
        const matched = systemClients.find(c => c.toLowerCase().replace(/\s+/g, '') === normalizedClientInput);
        if (matched) {
          client = matched;
        } else {
          rowErrors.push(`Row ${rowNumber}: Invalid client "${rawClient}". Must be one of: ${systemClients.join(', ')}`);
        }
      }

      // Normalize date
      let postDate = rawDate;
      if (rawDate) {
        if (isValidDate(rawDate)) {
          postDate = normalizeDateFormat(rawDate);
        } else {
          rowErrors.push(`Row ${rowNumber}: Invalid postDate "${rawDate}". Accepted formats: MM-DD-YYYY, YYYY-MM-DD, DD-MMM`);
        }
      }

      // Map post type (Automate to Video/Poster only)
      let postType = 'Poster';
      if (rawType) {
        const typeLower = rawType.toLowerCase();
        if (typeLower.includes('video') || typeLower.includes('reel')) {
          postType = 'Video';
        } else {
          postType = 'Poster';
        }
      }

      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
        result.summary.invalidRows++;
        return;
      }

      // Extract platform-specific entries based on fixed column positions
      // Instagram: cols 6-11 (Views, Likes, Comments, Shares, Profile visits, Profile Reach - 6 columns)
      // Facebook: cols 12-16 (Views, Likes, Comments, Shares, Engagements - 5 columns)
      // X: cols 17-22 (Views, Likes, Comments, Repost, Engagement, Clicks - 6 columns)
      // YouTube: cols 23-25 (Views, Likes, Comments - 3 columns)
      const platformsData = [
        {
          name: 'Instagram',
          indices: [6, 7, 8, 9, 10, 11],
          fields: ['views', 'likes', 'comments', 'shares', 'profileVisits', 'profileReach']
        },
        {
          name: 'Facebook',
          indices: [12, 13, 14, 15, 16],
          fields: ['views', 'likes', 'comments', 'shares', 'engagements']
        },
        {
          name: 'X',
          indices: [17, 18, 19, 20, 21, 22],
          fields: ['views', 'likes', 'comments', 'reposts', 'engagements', 'clicks']
        },
        {
          name: 'YouTube',
          indices: [23, 24, 25],
          fields: ['views', 'likes', 'comments']
        }
      ];

      let platformCount = 0;
      let platformErrors = [];

      platformsData.forEach(platformInfo => {
        // Check if there is data for this platform
        const hasData = platformInfo.indices.some(idx => {
          const val = values[idx];
          if (val === undefined || val === null) return false;
          const clean = val.trim();
          return clean !== '-' && clean !== '';
        });

        if (hasData) {
          const record = {
            post,
            title: post,
            client,
            postDate,
            postingDate: postDate,
            reportDate: postDate,
            postType,
            platform: platformInfo.name,
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            reposts: 0,
            engagements: 0,
            reach: 0,
            profileVisits: 0,
            profileReach: 0,
            clicks: 0
          };

          // Extract and validate numeric fields
          platformInfo.indices.forEach((colIdx, i) => {
            const fieldName = platformInfo.fields[i];
            const val = values[colIdx];
            
            if (val !== undefined && val !== null && val.trim() !== '-' && val.trim() !== '') {
              const cleanVal = val.replace(/,/g, '').trim();
              const num = parseInt(cleanVal, 10);
              if (isNaN(num) || num < 0) {
                platformErrors.push(`Row ${rowNumber}: Platform ${platformInfo.name} field "${fieldName}" must be a non-negative number, got "${val}"`);
              } else {
                record[fieldName] = num;
              }
            }
          });

          // Calculate engagements if not provided
          if (record.engagements === 0 && (platformInfo.name === 'Instagram' || platformInfo.name === 'YouTube')) {
            record.engagements = record.likes + record.comments + (record.shares || 0);
          }

          // Double check record validity
          const recordValidation = validateAnalyticsRecord(record, rowNumber);
          if (recordValidation.valid) {
            result.data.push(record);
            platformCount++;
          } else {
            platformErrors.push(...recordValidation.errors);
          }
        }
      });

      if (platformErrors.length > 0) {
        result.errors.push(...platformErrors);
        result.summary.invalidRows++;
      } else if (platformCount > 0) {
        result.summary.validRows++;
      } else {
        result.errors.push(`Row ${rowNumber}: No platform metrics found (all platform columns are empty or '-')`);
        result.summary.invalidRows++;
      }
    });

    result.success = result.summary.validRows > 0 && result.errors.length === 0;

  } catch (error) {
    result.errors.push(`CSV Parse Error: ${error.message}`);
  }

  return result;
}

/**
 * Placeholder for compatibility
 */
function normalizeRecord(record) {
  return record;
}

/**
 * Placeholder for compatibility
 */
function mapRecordFields(record) {
  return record;
}

/**
 * Download import template CSV matching the Weekly Analytics format
 * Format: Post, (3 empty), Client, Post Date, Post type, then platform metrics
 */
function downloadImportTemplate() {
  const headers = [
    'Post', '', '', 'Client', 'Post Date', 'Post type',
    // Instagram metrics (6)
    'Views', 'Likes', 'Comments', 'Shares', 'Profile visits', 'Profile Reach',
    // Facebook metrics (5)
    'Views', 'Likes', 'Comments', 'Shares', 'Engagements',
    // X (Twitter) metrics (6)
    'Views', 'Likes', 'Comments', 'Repost', 'Engagement', 'Clicks',
    // YouTube metrics (3)
    'Views', 'Likes', 'Comments'
  ];

  const sampleData = [
    [
      'Great Achievement Post', '', '', 'Einstein', '07-01-2026', 'Video',
      // Instagram
      '5000', '250', '10', '50', '20', '4500',
      // Facebook
      '1200', '30', '2', '5', '35',
      // X
      '3000', '80', '15', '20', '100', '25',
      // YouTube
      '500', '10', '5'
    ],
    [
      'Learning Post Example', '', '', 'NTT', '07-02-2026', 'Poster',
      // Instagram
      '2000', '100', '5', '20', '10', '1800',
      // Facebook
      '600', '15', '1', '3', '18',
      // X
      '1500', '40', '8', '10', '50', '12',
      // YouTube
      '200', '5', '2'
    ],
    [
      'Product Showcase', '', '', 'IVN', '07-03-2026', 'Video',
      // Instagram
      '8000', '400', '20', '80', '30', '7200',
      // Facebook
      '2000', '50', '4', '10', '60',
      // X
      '4500', '120', '25', '35', '150', '40',
      // YouTube
      '800', '20', '8'
    ],
    [
      'Client Update', '', '', 'Vilpower', '07-04-2026', 'Poster',
      // Instagram
      '3500', '150', '8', '35', '15', '3100',
      // Facebook
      '900', '25', '2', '4', '30',
      // X
      '2000', '60', '12', '18', '80', '18',
      // YouTube
      '350', '8', '3'
    ],
    [
      'Announcement', '', '', 'Einstein', '07-05-2026', 'Video',
      // Instagram
      '6000', '300', '15', '60', '25', '5400',
      // Facebook
      '1500', '40', '3', '8', '48',
      // X
      '3500', '100', '20', '25', '120', '30',
      // YouTube
      '600', '12', '6'
    ]
  ];

  let csv = headers.map(h => `"${h}"`).join(',') + '\n';
  sampleData.forEach(row => {
    csv += row.map(val => `"${val}"`).join(',') + '\n';
  });

  // Add 5 empty rows for user to fill
  const emptyRow = new Array(headers.length).fill('');
  for (let i = 0; i < 5; i++) {
    csv += emptyRow.map(val => `"${val}"`).join(',') + '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `analytics-import-template-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format validation errors for display
 * @param {Object} result - Result from processCSVImport
 * @returns {string} Formatted error message
 */
function formatValidationErrors(result) {
  let message = `Import Summary:\n`;
  message += `Total Rows: ${result.summary.totalRows}\n`;
  message += `Valid Rows: ${result.summary.validRows}\n`;
  message += `Invalid Rows: ${result.summary.invalidRows}\n`;

  if (result.errors.length > 0) {
    message += `\n❌ Errors:\n`;
    result.errors.slice(0, 15).forEach(error => {
      message += `  • ${error}\n`;
    });
    if (result.errors.length > 15) {
      message += `  ... and ${result.errors.length - 15} more errors\n`;
    }
  }

  if (result.warnings.length > 0) {
    message += `\n⚠️ Warnings:\n`;
    result.warnings.slice(0, 5).forEach(warning => {
      message += `  • ${warning}\n`;
    });
  }

  return message;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCSV,
    validateAnalyticsRecord,
    processCSVImport,
    downloadImportTemplate,
    formatValidationErrors,
    normalizeDateFormat,
    isValidDate,
    normalizeRecord,
    ANALYTICS_IMPORT_RULES,
    mapRecordFields,
    getTopPostsForYesterday,
    generateMonthlyClientReport,
    formatReportAsHTML,
    downloadReportPDF
  };
}

/**
 * Get top performing posts from yesterday
 * @param {Array} records - All analytics records
 * @param {string} sortBy - 'views', 'likes', 'engagements', 'shares'
 * @param {number} limit - Number of top posts to return
 * @returns {Array} Top posts
 */
function getTopPostsForYesterday(records, sortBy = 'engagements', limit = 5) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split('T')[0];

  const yesterdayPosts = records.filter(r => r.postDate === yesterdayDate);
  
  const sortField = {
    'views': 'views',
    'likes': 'likes',
    'engagements': 'engagements',
    'shares': 'shares',
    'reach': 'profileReach'
  }[sortBy] || 'engagements';

  return yesterdayPosts
    .sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0))
    .slice(0, limit);
}

/**
 * Generate monthly report for a specific client
 * @param {Array} records - All analytics records
 * @param {string} client - Client name
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Object} Report data with aggregated metrics
 */
function generateMonthlyClientReport(records, client, month, year) {
  const monthStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0];

  const clientRecords = records.filter(r => 
    r.client === client && 
    r.postDate >= monthStart && 
    r.postDate <= monthEnd
  );

  const metrics = {
    totalPosts: clientRecords.length,
    byType: {},
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalEngagements: 0,
    topPost: null,
    averageEngagementRate: 0
  };

  clientRecords.forEach(post => {
    // Count by type
    metrics.byType[post.postType] = (metrics.byType[post.postType] || 0) + 1;
    
    // Aggregate metrics
    metrics.totalViews += post.views || 0;
    metrics.totalLikes += post.likes || 0;
    metrics.totalComments += post.comments || 0;
    metrics.totalShares += post.shares || 0;
    const engagements = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    metrics.totalEngagements += engagements;
  });

  // Find top post
  if (clientRecords.length > 0) {
    metrics.topPost = clientRecords.reduce((max, post) => 
      ((post.engagements || 0) > (max.engagements || 0)) ? post : max
    );
  }

  // Calculate average engagement rate
  if (metrics.totalViews > 0) {
    metrics.averageEngagementRate = ((metrics.totalEngagements / metrics.totalViews) * 100).toFixed(2);
  }

  return {
    client,
    month,
    year,
    period: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`,
    metrics,
    posts: clientRecords
  };
}

/**
 * Format report as HTML for display
 * @param {Object} report - Report object from generateMonthlyClientReport
 * @returns {string} HTML string
 */
function formatReportAsHTML(report) {
  const { client, period, metrics, posts } = report;
  
  let html = `
    <div class="monthly-report">
      <h2>${client} - ${period}</h2>
      <div class="report-metrics">
        <div class="metric-card">
          <div class="metric-label">Total Posts</div>
          <div class="metric-value">${metrics.totalPosts}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Views</div>
          <div class="metric-value">${metrics.totalViews.toLocaleString()}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Engagements</div>
          <div class="metric-value">${metrics.totalEngagements.toLocaleString()}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Engagement Rate</div>
          <div class="metric-value">${metrics.averageEngagementRate}%</div>
        </div>
      </div>

      <div class="report-breakdown">
        <h3>Engagement Breakdown</h3>
        <ul>
          <li><strong>Likes:</strong> ${metrics.totalLikes.toLocaleString()}</li>
          <li><strong>Comments:</strong> ${metrics.totalComments.toLocaleString()}</li>
          <li><strong>Shares:</strong> ${metrics.totalShares.toLocaleString()}</li>
        </ul>
      </div>

      <div class="report-types">
        <h3>Posts by Type</h3>
        <ul>
          ${Object.entries(metrics.byType).map(([type, count]) => 
            `<li>${type}: ${count}</li>`
          ).join('')}
        </ul>
      </div>

      ${metrics.topPost ? `
        <div class="report-top-post">
          <h3>Top Performing Post</h3>
          <p><strong>"${metrics.topPost.post}"</strong></p>
          <p>Type: ${metrics.topPost.postType}</p>
          <p>Date: ${metrics.topPost.postDate}</p>
          <p>Views: ${(metrics.topPost.views || 0).toLocaleString()} | Engagements: ${((metrics.topPost.likes || 0) + (metrics.topPost.comments || 0) + (metrics.topPost.shares || 0)).toLocaleString()}</p>
        </div>
      ` : ''}

      <div class="report-posts-table">
        <h3>All Posts</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Post</th>
              <th>Type</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Shares</th>
            </tr>
          </thead>
          <tbody>
            ${posts.map(post => `
              <tr>
                <td>${post.postDate}</td>
                <td>${post.post.substring(0, 40)}...</td>
                <td>${post.postType}</td>
                <td>${(post.views || 0).toLocaleString()}</td>
                <td>${(post.likes || 0).toLocaleString()}</td>
                <td>${(post.comments || 0).toLocaleString()}</td>
                <td>${(post.shares || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  return html;
}

/**
 * Download report as PDF or CSV
 * @param {Object} report - Report object
 * @param {string} format - 'pdf' or 'csv'
 */
function downloadReportPDF(report, format = 'csv') {
  const { client, period, metrics, posts } = report;
  
  if (format === 'csv') {
    // Generate CSV
    let csv = `Social Analytics Report\n`;
    csv += `Client: ${client}\n`;
    csv += `Period: ${period}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    csv += `Summary Metrics\n`;
    csv += `Total Posts,${metrics.totalPosts}\n`;
    csv += `Total Views,${metrics.totalViews}\n`;
    csv += `Total Engagements,${metrics.totalEngagements}\n`;
    csv += `Engagement Rate,${metrics.averageEngagementRate}%\n\n`;
    
    csv += `Detailed Posts\n`;
    csv += `Date,Post Title,Type,Views,Likes,Comments,Shares\n`;
    posts.forEach(post => {
      csv += `"${post.postDate}","${post.post.replace(/"/g, '""')}","${post.postType}",${post.views},${post.likes},${post.comments},${post.shares}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${client}-report-${period.replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
