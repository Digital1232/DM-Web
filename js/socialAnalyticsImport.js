/**
 * Social Analytics Import Module
 * Handles CSV import for social media analytics data
 */

// Validation rules for import
const ANALYTICS_IMPORT_RULES = {
  requiredFields: ['reportDate', 'postingDate', 'title', 'platform', 'postType', 'client'],
  validPlatforms: ['Facebook', 'Instagram', 'YouTube', 'LinkedIn', 'X'],
  validPostTypes: ['Video', 'Image', 'Reel', 'Story', 'Carousel', 'Text'],
  numericFields: ['views', 'likes', 'shares', 'comments', 'followers', 'reach'],
  maxRecordsPerImport: 500
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

  // Check required fields
  ANALYTICS_IMPORT_RULES.requiredFields.forEach(field => {
    if (!record[field] || record[field].toString().trim() === '') {
      errors.push(`Row ${rowNumber}: Missing required field "${field}"`);
    }
  });

  // Validate platform
  if (record.platform && !ANALYTICS_IMPORT_RULES.validPlatforms.includes(record.platform)) {
    errors.push(`Row ${rowNumber}: Invalid platform "${record.platform}". Must be one of: ${ANALYTICS_IMPORT_RULES.validPlatforms.join(', ')}`);
  }

  // Validate post type
  if (record.postType && !ANALYTICS_IMPORT_RULES.validPostTypes.includes(record.postType)) {
    errors.push(`Row ${rowNumber}: Invalid postType "${record.postType}". Must be one of: ${ANALYTICS_IMPORT_RULES.validPostTypes.join(', ')}`);
  }

  // Validate date formats
  if (record.reportDate && !isValidDate(record.reportDate)) {
    errors.push(`Row ${rowNumber}: Invalid reportDate "${record.reportDate}". Use YYYY-MM-DD format`);
  }

  if (record.postingDate && !isValidDate(record.postingDate)) {
    errors.push(`Row ${rowNumber}: Invalid postingDate "${record.postingDate}". Use YYYY-MM-DD format`);
  }

  // Validate numeric fields
  ANALYTICS_IMPORT_RULES.numericFields.forEach(field => {
    if (record[field] && record[field].toString().trim() !== '') {
      const num = parseInt(record[field], 10);
      if (isNaN(num) || num < 0) {
        errors.push(`Row ${rowNumber}: ${field} must be a non-negative number, got "${record[field]}"`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if string is a valid date (YYYY-MM-DD)
 * @param {string} dateStr - Date string
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * Normalize and clean record data
 * @param {Object} record - Raw record
 * @returns {Object} Cleaned record
 */
function normalizeRecord(record) {
  const normalized = {};

  // String fields
  ['reportDate', 'postingDate', 'title', 'platform', 'postType', 'client', 'link', 'notes'].forEach(field => {
    if (record[field]) {
      normalized[field] = record[field].toString().trim();
    }
  });

  // Numeric fields
  ANALYTICS_IMPORT_RULES.numericFields.forEach(field => {
    if (record[field] && record[field].toString().trim() !== '') {
      normalized[field] = parseInt(record[field], 10) || 0;
    } else {
      normalized[field] = 0;
    }
  });

  return normalized;
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
 * Download import template CSV
 */
function downloadImportTemplate() {
  const headers = [
    'reportDate', 'postingDate', 'title', 'platform', 'postType',
    'views', 'likes', 'shares', 'comments', 'followers', 'reach',
    'client', 'link', 'notes'
  ];

  const sampleData = [
    [
      '2024-01-15', '2024-01-14', 'Summer Campaign Launch',
      'Facebook', 'Video', '2500', '180', '45', '30', '25', '3200',
      'VilPower', 'https://facebook.com/post/123', 'Strong performance'
    ],
    [
      '2024-01-14', '2024-01-13', 'Product Showcase',
      'Instagram', 'Reel', '3200', '450', '80', '120', '15', '4500',
      'VilPower', 'https://instagram.com/p/456', 'High engagement'
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
    ANALYTICS_IMPORT_RULES
  };
}
