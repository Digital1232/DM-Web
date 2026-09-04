# Analytics Import - Quick Start Guide

## 🚀 30-Second Setup

1. **Include the scripts:**
   ```html
   <script src="js/socialAnalyticsImport.js"></script>
   <script src="js/analyticsDataFetcher.js"></script>
   ```

2. **Import CSV:**
   ```javascript
   const result = processCSVImport(csvText);
   if (result.success) console.log(result.data);
   ```

3. **Export results:**
   ```javascript
   const csv = exportToCSV(records);
   downloadFile(csv, 'export.csv', 'text/csv');
   ```

---

## 📋 Template Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| post | string | ✓ | "🚨Attention Alumni Squad 📢" |
| client | string | ✓ | "Einstein" |
| postDate | date | ✓ | "07-01-2026" |
| postType | string | ✓ | "Video" |
| views | number | ✓ | 4149 |
| likes | number | ✓ | 149 |
| comments | number | ✓ | 1 |
| shares | number | ✓ | 137 |
| profileVisits | number | - | 8 |
| profileReach | number | - | 3598 |
| engagements | number | - | 287 |
| clicks | number | - | 164 |

**Clients:** Einstein, IVN, NTT, Dream Daa, Quade  
**Post Types:** Video, Post, Image, Reel, Story, Carousel  
**Date Formats:** MM-DD-YYYY, YYYY-MM-DD, DD-MMM (e.g., "02-Jul")

---

## 🎯 Common Tasks

### Download Template
```javascript
downloadImportTemplate();
// Downloads CSV with headers and samples
```

### Import CSV
```javascript
const file = document.getElementById('csvInput').files[0];
const csvContent = await file.text();
const result = processCSVImport(csvContent);

if (result.success) {
  console.log(`Imported ${result.summary.validRows} records`);
} else {
  console.error(result.errors);
}
```

### Fetch from Meta API
```javascript
const records = await fetchMetaAnalytics('PAGE_ID', {
  startDate: '2026-07-01',
  endDate: '2026-07-31'
});
```

### Fetch from Database
```javascript
const records = await fetchDatabaseAnalytics({
  client: 'Einstein',
  postType: 'Video'
});
```

### Filter Data
```javascript
const filtered = filterAnalytics(records, {
  client: 'Einstein',
  postType: 'Video',
  startDate: '2026-07-01',
  minViews: 1000
});
```

### Aggregate by Client
```javascript
const byClient = aggregateAnalytics(records, 'client');
// Returns: { "Einstein": { totalPosts, totalViews, ... }, ... }
```

### Aggregate by Week
```javascript
const byWeek = aggregateAnalytics(records, 'week');
// Returns: { "2026-W27": { ... }, "2026-W28": { ... }, ... }
```

### Calculate Statistics
```javascript
const stats = calculateStatistics(records);
// Returns: totalRecords, totalViews, averageViews, topPost, engagementRate
```

### Export to CSV
```javascript
const csv = exportToCSV(records);
// Or with specific fields:
const csv = exportToCSV(records, ['post', 'client', 'views', 'engagements']);
```

### Export to JSON
```javascript
const json = exportToJSON(records, {
  period: '2026-07',
  exportedBy: 'User',
  source: 'Combined'
});
```

### Merge Multiple Sources
```javascript
const merged = await fetchMergedAnalytics([
  { type: 'meta', pageId: 'PAGE_ID' },
  { type: 'database', filters: { client: 'Einstein' } },
  { type: 'csv', data: csvRecords }
]);

console.log(`${merged.records.length} total records`);
console.log(merged.summary); // { successCount, failureCount, errors }
```

### Validate Record
```javascript
const validation = validateAgainstTemplate(record);
if (!validation.valid) {
  console.error(validation.errors);
}
```

### Get Template Schema
```javascript
const schema = getTemplateSchema();
console.log(schema.schema.client); // Field definition
```

---

## 📊 Real-World Example

```javascript
async function analyzeJulyPerformance() {
  try {
    // 1. Import CSV
    const csvResult = processCSVImport(csvContent);
    const csvRecords = csvResult.data;
    
    // 2. Fetch from database
    const dbRecords = await fetchDatabaseAnalytics({
      startDate: '2026-07-01',
      endDate: '2026-07-31'
    });
    
    // 3. Combine sources
    const allRecords = [...csvRecords, ...dbRecords];
    
    // 4. Filter for videos only
    const videos = filterAnalytics(allRecords, { postType: 'Video' });
    
    // 5. Aggregate by client
    const byClient = aggregateAnalytics(videos, 'client');
    
    // 6. Calculate stats
    const stats = calculateStatistics(videos);
    
    // 7. Export results
    const csv = exportToCSV(videos);
    downloadFile(csv, 'july-videos.csv', 'text/csv');
    
    // 8. Display results
    console.log('July Video Performance:');
    console.log(`  Total Records: ${stats.totalRecords}`);
    console.log(`  Total Views: ${stats.totalViews.toLocaleString()}`);
    console.log(`  Average Views: ${stats.averageViews.toLocaleString()}`);
    console.log(`  Top Post: ${stats.topPost.post}`);
    console.log(`  Engagement Rate: ${stats.averageEngagementRate}%`);
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}
```

---

## ⚠️ Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| "Missing required field" | Empty or null field | Ensure all required fields have values |
| "Invalid client" | Not in enum list | Use: Einstein, IVN, NTT, Dream Daa, Quade |
| "Invalid postDate" | Wrong format | Use: MM-DD-YYYY, YYYY-MM-DD, or DD-MMM |
| "Field must be a number" | Non-numeric value | Remove commas, ensure integers |
| "No data to analyze" | Empty array | Import or fetch data first |
| "Meta API error" | Auth or API issue | Check access token and page ID |

---

## 🧪 Try the Demo

Open `analytics-import-demo.html` in your browser to:
- ✅ Upload and test CSV import
- 📊 Try filtering and aggregation
- 💾 Export to CSV/JSON
- 📈 Calculate statistics
- 📋 View schema
- 📦 Load sample data

---

## 📚 Full Documentation

For complete details, see: `ANALYTICS_IMPORT_GUIDE.md`

For implementation details, see: `ANALYTICS_IMPORT_SUMMARY.md`

---

## 🔑 Key Functions Summary

### Import Module
```javascript
downloadImportTemplate()              // Download CSV template
processCSVImport(csvText)             // Full import pipeline
parseCSV(csvText)                     // Parse CSV to objects
normalizeRecord(record)               // Clean & normalize data
isValidDate(dateStr)                  // Validate date
```

### Fetcher Module
```javascript
fetchMetaAnalytics(pageId, options)   // Fetch from Meta API
fetchDatabaseAnalytics(filters)       // Fetch from DB
fetchMergedAnalytics(sources)         // Merge multiple sources
filterAnalytics(records, filters)     // Filter records
aggregateAnalytics(records, groupBy)  // Group & aggregate
calculateStatistics(records)          // Get statistics
exportToCSV(records, fields)          // Export as CSV
exportToJSON(records, metadata)       // Export as JSON
validateAgainstTemplate(record)       // Validate schema
getTemplateSchema()                   // Get schema definition
```

---

## ✨ Tips & Tricks

- **Auto-calculation**: Leave `engagements` empty, it's auto-calculated as `likes + comments + shares`
- **Date formats**: Mix date formats in same CSV - all are supported
- **Comma numbers**: Numbers like "4,149" are automatically cleaned
- **Aggregation levels**: Use 'month', 'week', 'date', 'client', or 'postType'
- **Batch processing**: Process large files in chunks to avoid memory issues
- **Caching**: Store fetched data in localStorage for offline access
- **Error recovery**: Partial imports succeed - check summary for failure count

---

## 🎓 Learning Path

1. **Start here** - Read this quick start (5 min)
2. **Try the demo** - Open `analytics-import-demo.html` (10 min)
3. **Implement CSV import** - Add file upload to your app (15 min)
4. **Add filtering** - Implement client/date filters (15 min)
5. **Setup export** - Add CSV/JSON export buttons (10 min)
6. **Integrate dashboards** - Display aggregated data (20 min)
7. **Add Meta API** - Optional, fetch live data (30 min)

**Total: Less than 2 hours to full integration**

---

Ready to go! Start with the demo page and refer to this guide as needed. 🚀
