/**
 * Social Analytics Import Module
 * Handles CSV import for social media analytics data
 * Supports flexible multi-platform format with weekly analytics structure
 */

// Validation rules for import
const ANALYTICS_IMPORT_RULES = {
  requiredFields: ['Post', 'Client', 'Post Date', 'Post type'],
  validClients: ['Einstein', 'IVN', 'NTT', 'Dream Daa', 'Quade', 'Facebook', 'Instagram', 'YouTube', 'LinkedIn', 'X'],
  validPostTypes: ['Video', 'Post', 'Image', 'Reel', 'Story', 'Carousel', 'Text'],
  numericFields: ['Views', 'Likes', 'Comments', 'Shares', 'Profile visits', 'Profile Reach', 'Engagements', 'Clicks', 'Repost'],
  dateFormats: ['MM-DD-YYYY', 'YYYY-MM-DD', 'DD-MMM', 'DD-Mon'],
  maxRecordsPerImport: 500,
  // Map flexible column names to standard fields
  columnMapping: {
    'Post': 'post',
    'Client': 'client',
    'Post Date': 'postDate',
    'Post type': 'postType',
    'Views': 'views',
    'Likes': 'likes',
    'Comments': 'comments',
    'Shares': 'shares',
    'Profile visits': 'profileVisits',
    'Profile Reach': 'profileReach',
    'Engagements': 'engagements',
    'Clicks': 'clicks'
  }
};

/**
 * Parse CSV text and return array of objects
 * @param {string} csvText - CSV content
 * @returns {Array} Parsed records
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain header and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    // Simple CSV parsing (handles basic cases; use CSV library for complex scenarios)
    const values = parseCSVLine(line);
    
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
    }

    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index];
    });

    records.push(record);
  }

  return records;
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

  // Map headers to standard field names
  const mappedRecord = mapRecordFields(record);

  // Check required fields
  ['post', 'client', 'postDate', 'postType'].forEach(field => {
    if (!mappedRecord[field] || mappedRecord[field].toString().trim() === '') {
      errors.push(`Row ${rowNumber}: Missing required field "${field}"`);
    }
  });

  // Validate client
  if (mappedRecord.client && !ANALYTICS_IMPORT_RULES.validClients.includes(mappedRecord.client)) {
    errors.push(`Row ${rowNumber}: Invalid client "${mappedRecord.client}". Must be one of: ${ANALYTICS_IMPORT_RULES.validClients.join(', ')}`);
  }

  // Validate post type
  if (mappedRecord.postType && !ANALYTICS_IMPORT_RULES.validPostTypes.includes(mappedRecord.postType)) {
    errors.push(`Row ${rowNumber}: Invalid postType "${mappedRecord.postType}". Must be one of: ${ANALYTICS_IMPORT_RULES.validPostTypes.join(', ')}`);
  }

  // Validate date format
  if (mappedRecord.postDate && !isValidDate(mappedRecord.postDate)) {
    errors.push(`Row ${rowNumber}: Invalid postDate "${mappedRecord.postDate}". Accepted formats: MM-DD-YYYY, YYYY-MM-DD, DD-MMM`);
  }

  // Validate numeric fields (allow empty/dash values)
  ANALYTICS_IMPORT_RULES.numericFields.forEach(field => {
    const key = field.toLowerCase().replace(/\s+/g, '');
    if (mappedRecord[key] && mappedRecord[key].toString().trim() !== '' && mappedRecord[key] !== '-') {
      const value = mappedRecord[key].toString().replace(/,/g, '').trim();
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 0) {
        errors.push(`Row ${rowNumber}: ${field} must be a non-negative number, got "${mappedRecord[key]}"`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if string is a valid date
 * Supports: MM-DD-YYYY, YYYY-MM-DD, DD-MMM (e.g., 02-Jul), DD-Mon
 * @param {string} dateStr - Date string
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  if (!dateStr) return false;
  
  // Format: YYYY-MM-DD
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(dateStr)) {
    return !isNaN(new Date(dateStr).getTime());
  }

  // Format: MM-DD-YYYY
  const usRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const usMatch = dateStr.match(usRegex);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const date = new Date(year, parseInt(month) - 1, day);
    return date.getMonth() === parseInt(month) - 1 && date.getDate() === parseInt(day);
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
 * Normalize and clean record data
 * Handles comma-separated numbers and standardizes field names
 * @param {Object} record - Raw record
 * @returns {Object} Cleaned record
 */
function normalizeRecord(record) {
  const mapped = mapRecordFields(record);
  const normalized = {};

  // String fields
  ['post', 'client', 'postType'].forEach(field => {
    if (mapped[field]) {
      normalized[field] = mapped[field].toString().trim();
    }
  });

  // Date field - normalize to YYYY-MM-DD
  if (mapped.postDate) {
    normalized.postDate = normalizeDateFormat(mapped.postDate);
  }

  // Numeric fields - strip commas, convert, allow dashes
  const numericFieldsMap = {
    'views': 'Views',
    'likes': 'Likes',
    'comments': 'Comments',
    'shares': 'Shares',
    'profileVisits': 'Profile visits',
    'profileReach': 'Profile Reach',
    'engagements': 'Engagements',
    'clicks': 'Clicks'
  };

  Object.entries(numericFieldsMap).forEach(([normKey, origKey]) => {
    const val = mapped[normKey];
    if (val !== undefined && val !== null && val !== '-' && val.toString().trim() !== '') {
      const num = parseInt(val.toString().replace(/,/g, '').trim(), 10);
      normalized[normKey] = isNaN(num) ? 0 : num;
    } else {
      normalized[normKey] = 0;
    }
  });

  // Calculate engagements if not provided or is 0
  if (normalized.engagements === 0) {
    normalized.engagements = (normalized.likes || 0) + (normalized.comments || 0) + (normalized.shares || 0);
  }

  return normalized;
}

/**
 * Map CSV header fields to standard field names
 * @param {Object} record - Record with original header names
 * @returns {Object} Record with mapped field names
 */
function mapRecordFields(record) {
  const mapped = {};
  
  Object.entries(record).forEach(([key, value]) => {
    if (ANALYTICS_IMPORT_RULES.columnMapping[key]) {
      mapped[ANALYTICS_IMPORT_RULES.columnMapping[key]] = value;
    } else {
      // Try case-insensitive and space-normalized match
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
      const foundMapping = Object.entries(ANALYTICS_IMPORT_RULES.columnMapping).find(
        ([origKey]) => origKey.toLowerCase().replace(/\s+/g, '') === normalizedKey
      );
      
      if (foundMapping) {
        mapped[foundMapping[1]] = value;
      } else {
        // Keep original key
        mapped[key] = value;
      }
    }
  });
  
  return mapped;
}

/**
 * Normalize date to YYYY-MM-DD format
 * @param {string} dateStr - Date in various formats
 * @returns {string} Normalized date YYYY-MM-DD
 */
function normalizeDateFormat(dateStr) {
  // Already in ISO format
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(dateStr)) {
    return dateStr;
  }

  // MM-DD-YYYY
  const usRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const usMatch = dateStr.match(usRegex);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

  return dateStr; // Return as-is if unable to parse
}

/**
 * Process and validate CSV import
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
    const records = parseCSV(csvText);
    result.summary.totalRows = records.length;

    if (records.length > ANALYTICS_IMPORT_RULES.maxRecordsPerImport) {
      result.errors.push(`Import limited to ${ANALYTICS_IMPORT_RULES.maxRecordsPerImport} records. Your file contains ${records.length}`);
      return result;
    }

    records.forEach((record, index) => {
      const rowNumber = index + 2; // +1 for header, +1 for 1-based indexing
      const validation = validateAnalyticsRecord(record, rowNumber);

      if (validation.valid) {
        const normalized = normalizeRecord(record);
        result.data.push(normalized);
        result.summary.validRows++;
      } else {
        result.errors.push(...validation.errors);
        result.summary.invalidRows++;
      }
    });

    result.success = result.summary.validRows > 0;

  } catch (error) {
    result.errors.push(`CSV Parse Error: ${error.message}`);
  }

  return result;
}

/**
 * Download import template CSV matching the Weekly Analytics format
 */
function downloadImportTemplate() {
  const headers = [
    'Post', '', '', 'Client', 'Post Date', 'Post type',
    'Views', 'Likes', 'Comments', 'Shares',
    'Profile visits', 'Profile Reach',
    'Views', 'Likes', 'Comments', 'Shares', 'Engagements',
    'Views', 'Likes', 'Comments', 'Repost', 'Engagement', 'Clicks',
    'Views', 'Likes', 'Comments'
  ];

  const sampleData = [
    [
      '🚨Attention Alumni Squad 📢', '', '', 'Einstein', '07-01-2026', 'Video',
      '4149', '149', '1', '137',
      '8', '3598',
      '1059', '24', '0', '3', '28',
      '-', '-', '-', '-', '-', '-',
      '164', '5', '0'
    ],
    [
      'Every corner of this campus holds a memory.❤️', '', '', 'Einstein', '07-02-2026', 'Post',
      '1121', '26', '0', '10',
      '0', '955',
      '193', '3', '0', '0', '4',
      '-', '-', '-', '-', '-', '-',
      '-', '-', '-'
    ],
    [
      'Taste-ல king… IVN செங்கல்பட்டு அரிசி! 👑🌾', '', '', 'IVN', '02-Jul', 'Post',
      '126', '6', '0', '0',
      '0', '98',
      '30', '3', '0', '0', '3',
      '-', '-', '-', '-', '-', '-',
      '-', '-', '-'
    ]
  ];

  let csv = headers.map(h => `"${h}"`).join(',') + '\n';
  sampleData.forEach(row => {
    csv += row.map(val => `"${val}"`).join(',') + '\n';
  });

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
    result.errors.slice(0, 10).forEach(error => {
      message += `  • ${error}\n`;
    });
    if (result.errors.length > 10) {
      message += `  ... and ${result.errors.length - 10} more errors\n`;
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
