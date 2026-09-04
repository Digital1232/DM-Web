# Social Analytics Import Template - Updated Format

## Overview
The Social Analytics import template has been updated to match your new CSV format with clearer, more organized platform-specific metric columns.

## Key Changes

### 1. **New CSV Structure**
The template now uses a simplified, more intuitive column layout:

```
Post | Client | Post Date | Post type | Instagram-Views | Instagram-Likes | ... | Facebook-Views | ... | X-Views | ... | YouTube-Views | ...
```

### 2. **Platform Metrics Organization**
Each platform section is clearly labeled with the platform name as a prefix:

#### **Instagram Metrics** (Columns 5-10)
- Instagram-Views
- Instagram-Likes
- Instagram-Comments
- Instagram-Shares
- Instagram-Saves
- Instagram-Follows Increased

#### **Facebook Metrics** (Columns 11-15)
- Facebook-Views
- Facebook-Likes
- Facebook-Comments
- Facebook-Shares
- Facebook-Engagements

#### **X (Twitter) Metrics** (Columns 16-20)
- X-Views
- X-Likes
- X-Comments
- X-Reposts
- X-Engagements

#### **YouTube Metrics** (Columns 21-23)
- YouTube-Views
- YouTube-Likes
- YouTube-Comments

### 3. **Sample Data Included**
The template now includes:
- **3 sample rows** with realistic data from different platforms
- **3 empty rows** ready for users to fill in their own data
- All date formats supported: MM-DD-YYYY, YYYY-MM-DD, DD-MMM

### 4. **Updated CSV Parser**
The `processCSVImport()` function has been enhanced to:
- Dynamically parse platform-prefixed columns (e.g., `Instagram-Views`, `Facebook-Likes`)
- Automatically detect which platforms have data
- Map metric names to corresponding record fields
- Calculate engagements automatically when not provided
- Support flexible column ordering

## How to Use

### Download Template
1. Click the **"Download Template"** button in the Social Analytics tab
2. A CSV file will be generated with the new format

### Fill in Your Data
1. Keep the first 4 columns as they are: Post, Client, Post Date, Post type
2. Fill in metrics for each platform you have data for
3. Use `-` or leave blank for platforms with no data for that post
4. All numeric fields accept comma-separated numbers (e.g., `1,234` or `1234`)

### Import the CSV
1. Upload the completed CSV through the import interface
2. The system will validate and process the data
3. Invalid rows will be reported with specific error messages

## Example Row
```
"🚨Attention Alumni Squad 📢","Einstein","07-01-2026","Video","4149","149","1","137","8","3598","1059","24","0","3","28","2150","45","12","8","65","164","5","0"
```

This represents:
- **Post**: 🚨Attention Alumni Squad 📢
- **Client**: Einstein
- **Date**: 07-01-2026
- **Type**: Video
- **Instagram**: 4149 views, 149 likes, 1 comment, 137 shares, 8 saves, 3598 profile reach
- **Facebook**: 1059 views, 24 likes, 0 comments, 3 shares, 28 engagements
- **X**: 2150 views, 45 likes, 12 comments, 8 reposts, 65 engagements
- **YouTube**: 164 views, 5 likes, 0 comments

## Features

✅ **Clear Platform Labeling** - No more guessing which columns belong to which platform
✅ **Flexible Format** - Supports all common date formats
✅ **Intelligent Parsing** - Auto-detects platform data even if columns are rearranged
✅ **Sample Data** - Template includes realistic examples
✅ **Error Reporting** - Detailed validation messages help fix import issues
✅ **Multi-Platform Support** - Easy to add more platforms in the future

## Notes

- Use `-` for missing data in numeric fields
- Dates can be in: `MM-DD-YYYY`, `YYYY-MM-DD`, or `DD-MMM` format
- Post type should be either `Video` or `Poster`
- Client must match one of the configured clients in your system
- All numeric values should be whole numbers (no decimals)
