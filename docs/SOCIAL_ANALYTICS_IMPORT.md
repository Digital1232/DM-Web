# Social Media Analytics Data Import Guide

## Overview

The Social Media Analytics import feature allows you to bulk import social media performance data from a CSV file. This is useful for:
- Migrating historical data
- Batch importing multiple posts at once
- Importing data from external analytics tools

## Template Format

### Column Headers (Required)

The CSV file must include the following columns in this order:

| Column | Type | Required | Format/Values | Notes |
|--------|------|----------|----------------|-------|
| `reportDate` | String | Yes | YYYY-MM-DD | The date the metrics were recorded |
| `postingDate` | String | Yes | YYYY-MM-DD | The date the post was published |
| `title` | String | Yes | Text | Post title or description |
| `platform` | String | Yes | Facebook, Instagram, YouTube, LinkedIn, X | Social media platform |
| `postType` | String | Yes | Video, Image, Reel, Story, Carousel, Text | Type of content posted |
| `views` | Number | No | 0+ | Total views on the post |
| `likes` | Number | No | 0+ | Total likes/reactions |
| `shares` | Number | No | 0+ | Total shares |
| `comments` | Number | No | 0+ | Total comments |
| `followers` | Number | No | 0+ | Followers gained from this post |
| `reach` | Number | No | 0+ | Total reach (potential audience) |
| `client` | String | Yes | Text | Client/brand name |
| `link` | String | No | URL | Direct link to the post (optional) |
| `notes` | String | No | Text | Additional notes about the post |

## Example Data

```csv
reportDate,postingDate,title,platform,postType,views,likes,shares,comments,followers,reach,client,link,notes
2024-01-15,2024-01-14,Summer Campaign Launch,Facebook,Video,2500,180,45,30,25,3200,VilPower,https://facebook.com/post/123,Strong performance with partners
2024-01-14,2024-01-13,Product Showcase,Instagram,Reel,3200,450,80,120,15,4500,VilPower,https://instagram.com/p/456,High engagement on reels
2024-01-13,2024-01-12,Team Announcement,LinkedIn,Text,1200,85,12,24,10,1800,VilPower,https://linkedin.com/posts/789,B2B focused content
2024-01-12,2024-01-11,Behind the Scenes,YouTube,Video,5600,320,45,180,50,8200,VilPower,https://youtube.com/watch/012,Excellent performance
2024-01-11,2024-01-10,Daily Update,X,Text,890,245,65,30,0,2100,VilPower,https://x.com/status/345,Good reach
```

## How to Use

### Step 1: Download Template

1. Click the **"Download Template"** button in the Social Analytics import dialog
2. Save the CSV file to your computer

### Step 2: Fill in Your Data

Edit the template CSV file using:
- **Excel/Google Sheets** - Recommended for visual editing
- **Text Editor** - For direct CSV editing
- **Any CSV-compatible tool**

**Important Guidelines:**
- Keep the header row exactly as-is
- Each data row must have values for all required fields
- Use the exact values for `platform` and `postType`
- Dates must be in YYYY-MM-DD format
- Numbers must be integers (no decimal points)
- Optional fields can be left blank (leave empty string)

### Step 3: Upload File

1. Click **"Choose File"** in the import dialog
2. Select your completed CSV file
3. Click **"Import Data"**

### Step 4: Review Results

After upload, you'll see:
- ✅ Number of valid records imported
- ❌ Any validation errors that prevented import
- ⚠️ Any warnings about unusual data
- Summary of successful imports

## Validation Rules

The import feature validates your data:

### Required Fields
- `reportDate` - Must be a valid date (YYYY-MM-DD)
- `postingDate` - Must be a valid date (YYYY-MM-DD)
- `title` - Cannot be empty
- `platform` - Must be exact match: Facebook, Instagram, YouTube, LinkedIn, or X
- `postType` - Must be exact match: Video, Image, Reel, Story, Carousel, or Text
- `client` - Cannot be empty

### Numeric Validation
- `views`, `likes`, `shares`, `comments`, `followers`, `reach` must be non-negative integers
- If left blank, they default to 0
- Decimals will be converted to integers (2.5 → 2)

### Date Validation
- Format: YYYY-MM-DD (e.g., 2024-01-15)
- Must be valid dates (2024-02-30 will be rejected)

## Limits

- **Maximum records per import:** 500
- **File size:** No strict limit (CSV text-based)
- **Concurrent imports:** One at a time

## Error Examples & Solutions

### Error: "Invalid platform 'facebook'"
- **Problem:** Platform names are case-sensitive
- **Solution:** Use exact values: `Facebook`, `Instagram`, `YouTube`, `LinkedIn`, `X`

### Error: "Invalid postType 'video'"
- **Problem:** PostType names are case-sensitive
- **Solution:** Use exact values: `Video`, `Image`, `Reel`, `Story`, `Carousel`, `Text`

### Error: "Invalid reportDate '01/15/2024'"
- **Problem:** Wrong date format
- **Solution:** Use YYYY-MM-DD format: `2024-01-15`

### Error: "views must be a non-negative number"
- **Problem:** Non-numeric value in numeric field
- **Solution:** Use only numbers (0, 100, 2500, etc.) or leave blank for 0

### Error: "Expected 14 columns, got 12"
- **Problem:** Wrong number of columns
- **Solution:** Ensure all header columns are present and use commas as separators

## Tips

1. **Use Excel/Google Sheets** - Easier to format dates and ensure proper CSV export
2. **Validate before import** - Check a few rows manually before uploading
3. **Keep backups** - Save your original data file
4. **Test with small imports** - Try importing 2-3 rows first to verify format
5. **Check platform names** - Capitalize first letter only (Facebook, not FACEBOOK)
6. **Use quotes in CSV** - If data contains commas, quote the entire cell value

## CSV Tips for Excel/Google Sheets

### Google Sheets Export as CSV
1. Go to **File** → **Download**
2. Select **Comma Separated Values (.csv)**

### Excel Export as CSV
1. Go to **File** → **Save As**
2. Choose format: **CSV (Comma delimited) (*.csv)**
3. Click **Save**

### Manually Edit CSV
- Open in Notepad or any text editor
- Use commas to separate columns
- Quote values containing commas: `"Value with, comma"`
- One data row per line

## After Import

Once data is imported:
- ✅ Records appear in Analytics dashboard immediately
- ✅ Available for filtering by date, platform, and post type
- ✅ Included in charts and KPI calculations
- ✅ Editable individually in the dashboard

## Troubleshooting

**Import shows 0 valid rows:**
- Check for extra blank lines at the end of CSV
- Verify all required fields have values
- Ensure platform/postType values use correct capitalization

**Some rows imported, others failed:**
- Check the error message for specific row numbers
- Fix those rows and re-import just those rows
- Duplicate entries are allowed (import won't block them)

**Can't find Import button:**
- You must have admin permissions to import data
- Contact your administrator if you need access

## Contact Support

If you encounter issues:
1. Note the exact error message
2. Check the row number mentioned in the error
3. Review the CSV file at that row
4. Contact support with the problematic CSV data
