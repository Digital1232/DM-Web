# Social Analytics Import - Quick Reference

## 📥 What Is It?
Bulk import social media analytics data from CSV files instead of entering data one-by-one.

## 📁 Files Included

| File | Size | Purpose |
|------|------|---------|
| `templates/social-analytics-import-template.csv` | ~500B | Download template with headers & sample data |
| `js/socialAnalyticsImport.js` | ~8KB | Processing & validation logic |
| `docs/SOCIAL_ANALYTICS_IMPORT.md` | ~5KB | Complete user guide |
| `SOCIAL_ANALYTICS_IMPORT_IMPLEMENTATION.md` | ~10KB | Integration instructions |

## 🚀 Quick Start (5 minutes)

### For Users:
1. Click **"Import Data"** button in Analytics dashboard
2. Click **"Download Template"** 
3. Fill CSV with your data in Excel/Google Sheets
4. Click **"Choose File"** and select your CSV
5. Click **"Import Data"** → Done! ✅

### For Developers:
1. Add `<script src="js/socialAnalyticsImport.js"></script>` to HTML head
2. Add "Import Data" button next to "Add Entry" button
3. Add import modal HTML (see implementation guide)
4. Add import handler function (see implementation guide)
5. Test with template file

## 📋 CSV Format

**Required Columns:**
```
reportDate | postingDate | title | platform | postType | views | likes | shares | comments | followers | reach | client | link | notes
```

**Example Row:**
```
2024-01-15 | 2024-01-14 | Summer Campaign | Facebook | Video | 2500 | 180 | 45 | 30 | 25 | 3200 | VilPower | https://... | Notes
```

## ✅ Validation Rules

| Field | Type | Required | Valid Values |
|-------|------|----------|--------------|
| reportDate | Date | ✅ | YYYY-MM-DD |
| postingDate | Date | ✅ | YYYY-MM-DD |
| title | Text | ✅ | Any text |
| platform | Enum | ✅ | Facebook, Instagram, YouTube, LinkedIn, X |
| postType | Enum | ✅ | Video, Image, Reel, Story, Carousel, Text |
| views | Number | ❌ | 0+ (defaults to 0) |
| likes | Number | ❌ | 0+ (defaults to 0) |
| shares | Number | ❌ | 0+ (defaults to 0) |
| comments | Number | ❌ | 0+ (defaults to 0) |
| followers | Number | ❌ | 0+ (defaults to 0) |
| reach | Number | ❌ | 0+ (defaults to 0) |
| client | Text | ✅ | Any text |
| link | URL | ❌ | Optional |
| notes | Text | ❌ | Optional |

## 🔍 Key Functions

```javascript
// Main processing function
processCSVImport(csvText)
// Returns: {success, data, errors, warnings, summary}

// Validate single record
validateAnalyticsRecord(record, rowNumber)
// Returns: {valid, errors}

// Download template
downloadImportTemplate()

// Format errors for display
formatValidationErrors(result)
```

## ⚠️ Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "Invalid platform 'facebook'" | Use exact case: `Facebook` |
| "Invalid postType 'video'" | Use exact case: `Video` |
| "Invalid date format" | Use `YYYY-MM-DD` format |
| "Expected 14 columns" | All header columns must be present |
| "views must be non-negative number" | Use only numbers: `2500` not `2.5k` |
| Import shows 0 records | Check for required field values |

## 📊 Limits & Performance

| Metric | Value |
|--------|-------|
| Max records per import | 500 |
| CSV parsing time | <100ms |
| Validation time | <50ms |
| Firebase upload | 1-2 sec per 100 records |
| Total time for 500 records | ~3-5 seconds |

## 🎯 Use Cases

✅ **When to use import:**
- Migrating historical data from another tool
- Batch importing multiple posts at once
- Setting up initial data for analytics
- Regular bulk uploads from external systems

❌ **When NOT to use (use manual entry instead):**
- Single post entry
- Real-time metrics (use API integration)
- Complex data transformations

## 📱 Supported Platforms

- ✅ Facebook
- ✅ Instagram
- ✅ YouTube
- ✅ LinkedIn
- ✅ X (formerly Twitter)

## 📝 Post Types

- ✅ Video
- ✅ Image
- ✅ Reel
- ✅ Story
- ✅ Carousel
- ✅ Text

## 🔐 Security

- ✅ File type validation (CSV only)
- ✅ Records validated before upload
- ✅ User authentication required
- ✅ Data stored in user's own Firebase node
- ✅ 500 record limit prevents abuse

## 📞 Support

**For Users:**
- See full guide: `docs/SOCIAL_ANALYTICS_IMPORT.md`
- Download template in import dialog
- Check error messages for specific row issues

**For Developers:**
- See implementation guide: `SOCIAL_ANALYTICS_IMPORT_IMPLEMENTATION.md`
- Review module: `js/socialAnalyticsImport.js`
- Check browser console for errors

## 🔄 Data Flow

```
1. User downloads template
   ↓
2. User fills CSV with data
   ↓
3. User uploads file to import modal
   ↓
4. processCSVImport() parses & validates
   ↓
5. Valid records passed to Firebase
   ↓
6. Records appear in Analytics dashboard
   ↓
7. Included in charts & KPIs automatically
```

## 💡 Pro Tips

1. **Use Google Sheets** - Easiest way to edit CSV
2. **Validate dates** - Double-check YYYY-MM-DD format
3. **Export from Sheets as CSV** - Handles quoting automatically
4. **Test small first** - Try 2-3 rows before big import
5. **Keep original file** - For backup/reference
6. **Check platform names** - Case-sensitive!
7. **Blank = 0** - Empty metric fields default to 0

## 📦 What's Included

```
Social Analytics Import Feature
├── Core Module
│   └── js/socialAnalyticsImport.js (processing logic)
├── Template
│   └── templates/social-analytics-import-template.csv
├── Documentation
│   ├── docs/SOCIAL_ANALYTICS_IMPORT.md (full guide)
│   ├── SOCIAL_ANALYTICS_IMPORT_IMPLEMENTATION.md (dev guide)
│   └── SOCIAL_ANALYTICS_IMPORT_QUICK_REFERENCE.md (this file)
└── HTML/JS Integration
    ├── Import button (UI)
    ├── Modal dialog (UI)
    └── Handler functions (logic)
```

## ✨ Features

- ✅ CSV parsing with quote handling
- ✅ Multi-field validation
- ✅ Enum validation (platform, post type)
- ✅ Date format validation
- ✅ Numeric validation
- ✅ Detailed error messages (row-specific)
- ✅ Progress indication
- ✅ Bulk Firebase upload
- ✅ Template download
- ✅ Result summary

## 🎓 Example Workflow

**Scenario:** Import 50 historical posts from January 2024

1. **Get data:** Export from Meta Business Suite, Google Analytics, etc.
2. **Format:** Map columns to template format in Excel
3. **Export:** Save as CSV
4. **Import:** Open Social Analytics → Click "Import Data"
5. **Verify:** Check results show 50 successful imports
6. **View:** See posts in Analytics dashboard with charts updated

Done! 🎉

---

**Version:** 1.0  
**Last Updated:** 2024-01-15  
**Status:** Ready for Integration
