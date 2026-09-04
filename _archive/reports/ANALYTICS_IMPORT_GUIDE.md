# Analytics Data Import & Fetching Guide

## Overview

The Analytics Import system provides a standardized template for importing social media analytics data from multiple sources (Meta, custom CSV, database). The template ensures consistent data structure and enables seamless data fetching, filtering, and aggregation.

---

## Import Template Schema

### Template Structure

The analytics import template defines the following fields:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `post` | string | ✓ | Post title or content | "🚨Attention Alumni Squad 📢" |
| `client` | string | ✓ | Client/Platform name | "Einstein", "IVN", "NTT", "Dream Daa", "Quade" |
| `postDate` | date | ✓ | Publication date | "07-01-2026" or "2026-07-01" |
| `postType` | string | ✓ | Type of post | "Video", "Post", "Image", "Reel" |
| `views` | number | ✓ | Total views | 4149 |
| `likes` | number | ✓ | Total likes | 149 |
| `comments` | number | ✓ | Total comments | 1 |
| `shares` | number | ✓ | Total shares | 137 |
| `profileVisits` | number | - | Profile visits from post | 8 |
| `profileReach` | number | - | Profile reach | 3598 |
| `engagements` | number | - | Total engagements (auto-calculated) | 287 |
| `clicks` | number | - | Total clicks | 164 |

### Supported Date Formats

The system accepts dates in these formats:
- `MM-DD-YYYY` - "07-01-2026"
- `YYYY-MM-DD` - "2026-07-01"
- `DD-MMM` - "02-Jul" (assumes current year)

### Valid Enum Values

**Clients:** Einstein, IVN, NTT, Dream Daa, Quade  
**Post Types:** Video, Post, Image, Reel, Story, Carousel

---

## CSV Import

### Downloading the Template

```javascript
// Use the built-in template download
downloadImportTemplate();
```

This downloads a CSV file with:
- Correct column headers
- 4 sample rows matching real data structure
- Proper formatting

### CSV Format Example

```csv
"post","client","postDate","postType","views","likes","comments","shares","profileVisits","profileReach","engagements","clicks"
"🚨Attention Alumni Squad 📢","Einstein","07-01-2026","Video","4149","149","1","137","8","3598","287","164"
"Every corner of this campus holds a memory.❤️","Einstein","07-02-2026","Post","1121","26","0","10","0","955","36","-"
"Taste-ல king… IVN செங்கல்பட்டு அரிசி! 👑🌾","IVN","02-Jul","Post","126","6","0","0","0","98","6","-"
```

### Importing CSV Data

```javascript
// Read file content
const csvContent = await readFileAsText(file);

// Process import
const result = processCSVImport(csvContent);

if (result.success) {
  console.log(`Successfully imported ${result.summary.validRows} records`);
  // Use result.data for further processing
} else {
  console.error('Import failed:', formatValidationErrors(result));
}
```

### Import Validation

All CSV imports are validated against:
- Required fields presence
- Valid enum values (client, postType)
- Date format correctness
- Numeric field validity (non-negative integers)
- Optional auto-calculation of engagements

---

## Data Fetching

### Fetch from Meta API

```javascript
// Fetch posts from a specific Facebook page
const analytics = await fetchMetaAnalytics('PAGE_ID', {
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  limit: 100
});
```

**Parameters:**
- `pageId` (string) - Facebook page ID
- `options.startDate` - Filter from date (YYYY-MM-DD)
- `options.endDate` - Filter to date (YYYY-MM-DD)
- `options.limit` - Max records to fetch (default: 25)

**Returns:** Array of analytics records in template format

### Fetch from Database

```javascript
// Fetch analytics from internal database
const analytics = await fetchDatabaseAnalytics({
  client: 'Einstein',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  postType: 'Video',
  limit: 50
});
```

**Filter Parameters:**
- `client` - Filter by client name
- `startDate` - From date (YYYY-MM-DD)
- `endDate` - To date (YYYY-MM-DD)
- `postType` - Post type filter
- `limit` - Max records

**Returns:** Array of analytics records

### Fetch from Multiple Sources

```javascript
// Merge analytics from Meta + database
const merged = await fetchMergedAnalytics([
  {
    type: 'meta',
    pageId: 'EINSTEIN_PAGE_ID',
    options: { startDate: '2026-07-01' }
  },
  {
    type: 'database',
    filters: { client: 'IVN', startDate: '2026-07-01' }
  },
  {
    type: 'csv',
    label: 'Manual Import',
    data: parsedCSVData
  }
]);

// Results include source tracking
console.log(merged.records); // Combined records with _source field
console.log(merged.summary); // Success/failure counts
```

---

## Data Filtering

### Basic Filtering

```javascript
// Filter records by multiple criteria
const filtered = filterAnalytics(records, {
  client: 'Einstein',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  postType: 'Video',
  minViews: 1000,
  minEngagement: 50
});
```

### Available Filters

| Filter | Type | Description |
|--------|------|-------------|
| `client` | string | Client name |
| `startDate` | string | From date (YYYY-MM-DD) |
| `endDate` | string | To date (YYYY-MM-DD) |
| `postType` | string | Post type |
| `minViews` | number | Minimum views threshold |
| `minEngagement` | number | Minimum engagement count |

---

## Data Aggregation

### Aggregate by Client

```javascript
// Group and aggregate by client
const byClient = aggregateAnalytics(records, 'client');

// Results:
// {
//   "Einstein": {
//     totalPosts: 10,
//     totalViews: 45000,
//     totalEngagements: 2500,
//     averageViews: 4500,
//     averageEngagementRate: 5.56,
//     records: [...]
//   },
//   ...
// }
```

### Available Aggregation Options

- `'client'` - Group by client/platform
- `'postType'` - Group by post type (Video, Post, etc.)
- `'date'` - Group by individual date
- `'week'` - Group by week (ISO week format)
- `'month'` - Group by month (YYYY-MM format)

### Calculate Statistics

```javascript
// Get overall statistics
const stats = calculateStatistics(records);

// Returns:
// {
//   totalRecords: 25,
//   totalViews: 85000,
//   totalEngagements: 4200,
//   averageViews: 3400,
//   averageEngagementRate: 4.94,
//   topPost: {...},
//   topPerformerByViews: {...},
//   topPerformerByEngagement: {...}
// }
```

---

## Data Export

### Export to CSV

```javascript
// Export all records to CSV
const csvContent = exportToCSV(records);

// Export specific fields only
const csvContent = exportToCSV(records, ['post', 'client', 'views', 'likes', 'engagements']);

// Download
downloadFile(csvContent, 'analytics-export.csv', 'text/csv');
```

### Export to JSON

```javascript
// Export with metadata
const jsonContent = exportToJSON(records, {
  period: '2026-07',
  client: 'All',
  recordCount: records.length
});

// Download
downloadFile(jsonContent, 'analytics-export.json', 'application/json');
```

---

## Data Validation

### Validate Records Against Template

```javascript
// Check if record matches template schema
const validation = validateAgainstTemplate({
  post: '🚨Attention Alumni Squad 📢',
  client: 'Einstein',
  postDate: '07-01-2026',
  postType: 'Video',
  views: 4149,
  likes: 149,
  comments: 1,
  shares: 137
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Get Template Schema

```javascript
// Retrieve full template definition
const schema = getTemplateSchema();

// Access field definitions
console.log(schema.schema.client);
// {
//   type: 'string',
//   description: 'Client/Platform name',
//   required: true,
//   enum: ['Einstein', 'IVN', 'NTT', 'Dream Daa', 'Quade'],
//   example: 'Einstein'
// }
```

---

## Complete Usage Example

### Step 1: Import CSV Data

```javascript
// User selects file
const file = document.getElementById('csvInput').files[0];
const csvContent = await file.text();

// Validate and process
const result = processCSVImport(csvContent);

if (!result.success) {
  alert(formatValidationErrors(result));
  return;
}

// Normalized records ready to use
const records = result.data;
```

### Step 2: Fetch and Merge from Multiple Sources

```javascript
// Fetch from Meta API + Database
const merged = await fetchMergedAnalytics([
  {
    type: 'meta',
    pageId: 'EINSTEIN_PAGE_ID',
    options: { startDate: '2026-07-01' }
  },
  {
    type: 'database',
    filters: { client: 'Einstein' }
  },
  {
    type: 'csv',
    label: 'Manual Import',
    data: records
  }
]);

console.log(`Loaded ${merged.records.length} records from ${merged.summary.successCount} sources`);
```

### Step 3: Filter and Aggregate

```javascript
// Filter for July videos only
const julyVideos = filterAnalytics(merged.records, {
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  postType: 'Video'
});

// Aggregate by client
const byClient = aggregateAnalytics(julyVideos, 'client');

// Calculate performance metrics
const stats = calculateStatistics(julyVideos);

console.log(`Top performer: ${stats.topPerformerByViews.post}`);
console.log(`Average engagement rate: ${stats.averageEngagementRate}%`);
```

### Step 4: Export Results

```javascript
// Export filtered data
const csvExport = exportToCSV(julyVideos);
downloadFile(csvExport, 'july-videos.csv', 'text/csv');

// Export with analysis
const jsonExport = exportToJSON(julyVideos, {
  period: '2026-07',
  filterApplied: 'Videos only',
  totalRecords: julyVideos.length,
  stats
});
downloadFile(jsonExport, 'july-analysis.json', 'application/json');
```

---

## API Reference

### Social Analytics Import Module (`socialAnalyticsImport.js`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `parseCSV(csvText)` | string | Array | Parse CSV to objects |
| `validateAnalyticsRecord(record, rowNum)` | Object, number | Object | Validate single record |
| `processCSVImport(csvText)` | string | Object | Full import pipeline |
| `downloadImportTemplate()` | - | void | Download CSV template |
| `normalizeRecord(record)` | Object | Object | Normalize & clean data |
| `normalizeDateFormat(dateStr)` | string | string | Convert to YYYY-MM-DD |
| `isValidDate(dateStr)` | string | boolean | Validate date formats |

### Analytics Data Fetcher Module (`analyticsDataFetcher.js`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `fetchMetaAnalytics(pageId, options)` | string, Object | Promise<Array> | Fetch from Meta API |
| `fetchDatabaseAnalytics(filters)` | Object | Promise<Array> | Fetch from database |
| `fetchMergedAnalytics(sources)` | Array | Promise<Object> | Merge from multiple sources |
| `filterAnalytics(records, filters)` | Array, Object | Array | Filter records |
| `aggregateAnalytics(records, groupBy)` | Array, string | Object | Aggregate & group |
| `calculateStatistics(records)` | Array | Object | Calculate stats |
| `validateAgainstTemplate(record)` | Object | Object | Validate schema match |
| `exportToCSV(records, fields)` | Array, Array | string | Export as CSV |
| `exportToJSON(records, metadata)` | Array, Object | string | Export as JSON |
| `getTemplateSchema()` | - | Object | Get template definition |

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing required field" | Field is empty or null | Ensure all required fields have values |
| "Invalid client" | Client not in enum list | Use: Einstein, IVN, NTT, Dream Daa, Quade |
| "Invalid postType" | Type not recognized | Use: Video, Post, Image, Reel, Story, Carousel |
| "Invalid postDate" | Date format incorrect | Use: MM-DD-YYYY, YYYY-MM-DD, or DD-MMM |
| "Field must be a number" | Non-numeric value in numeric field | Remove commas, ensure integer values |

### Validation Error Example

```javascript
const result = processCSVImport(csvContent);

if (!result.success) {
  // Display detailed errors
  result.errors.forEach(error => {
    console.error(error); // "Row 3: Invalid client "InvalidClient""
  });

  // Display summary
  console.log(`Valid: ${result.summary.validRows}, Invalid: ${result.summary.invalidRows}`);
}
```

---

## Best Practices

### 1. Always Validate Before Using

```javascript
// ✓ GOOD
const validation = validateAnalyticsRecord(record, rowNum);
if (validation.valid) {
  useRecord(record);
}

// ✗ AVOID
useRecord(record); // No validation
```

### 2. Handle Null/Missing Optional Fields

```javascript
// ✓ GOOD
const engagements = record.engagements || 0;

// ✗ AVOID
const engagements = record.engagements; // Could be undefined
```

### 3. Use Normalized Records After Import

```javascript
// ✓ GOOD
const importResult = processCSVImport(csvContent);
const normalizedRecords = importResult.data;

// ✗ AVOID
const rawRecords = parseCSV(csvContent); // Not normalized
```

### 4. Combine Filters for Specific Queries

```javascript
// ✓ GOOD
const julyEinsteinVideos = filterAnalytics(records, {
  client: 'Einstein',
  postType: 'Video',
  startDate: '2026-07-01',
  endDate: '2026-07-31'
});

// ✗ AVOID
const filtered = filterAnalytics(records, { client: 'Einstein' }); // Too broad
```

### 5. Leverage Aggregation for Dashboard Data

```javascript
// ✓ GOOD
const weeklyStats = aggregateAnalytics(records, 'week');
displayDashboard(weeklyStats);

// ✗ AVOID
displayRawRecords(records); // Hard to read, not aggregated
```

---

## Integration Checklist

- [ ] Load both `socialAnalyticsImport.js` and `analyticsDataFetcher.js`
- [ ] Implement CSV import UI with file input
- [ ] Add download template button
- [ ] Display validation errors to user
- [ ] Fetch data from Meta API (if needed)
- [ ] Cache fetched data appropriately
- [ ] Implement filtering UI
- [ ] Add export functionality
- [ ] Display aggregated data on dashboard
- [ ] Test with sample data from provided CSV

---

## Support & Troubleshooting

### CSV Won't Parse

1. Check file encoding (UTF-8 recommended)
2. Verify no special characters in headers
3. Ensure proper comma separation
4. Check for extra blank lines at end

### Date Validation Fails

1. Use supported formats only
2. Check for typos in month abbreviations (Jan-Dec, case-insensitive)
3. Ensure 4-digit year for MM-DD-YYYY format
4. Verify day/month are valid calendar dates

### Missing Data After Import

1. Check CSV has data rows (not just headers)
2. Verify required fields are populated
3. Look for rows marked as invalid in summary
4. Check numeric fields for extra characters

For additional support, review the included code comments or consult the API reference above.
