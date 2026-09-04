# 📊 Social Analytics CSV Import - Quick Reference

## 📥 How to Import

1. **Download Template** → Click "Download Template" button
2. **Fill Data** → Add your posts and metrics
3. **Upload** → Select file and import
4. **Verify** → Check results in dashboard

---

## 📋 Column Layout

### Required Columns (Always Need These)
```
Post | Client | Post Date | Post type
```

### Platform Metrics (Choose What You Have)
```
Instagram-Views, Instagram-Likes, Instagram-Comments, Instagram-Shares, Instagram-Saves, Instagram-Follows Increased
Facebook-Views, Facebook-Likes, Facebook-Comments, Facebook-Shares, Facebook-Engagements
X-Views, X-Likes, X-Comments, X-Reposts, X-Engagements
YouTube-Views, YouTube-Likes, YouTube-Comments
```

---

## ✍️ Examples

### Complete Row (All Platforms)
```
My Post Text, Einstein, 07-01-2026, Video, 4149, 149, 1, 137, 8, 3598, 1059, 24, 0, 3, 28, 2150, 45, 12, 8, 65, 164, 5, 0
```

### Partial Row (Instagram Only)
```
My Post Text, Einstein, 07-01-2026, Video, 4149, 149, 1, 137, 8, 3598, -, -, -, -, -, -, -, -, -, -, -, -, -
```

---

## 🎯 Field Values

### Date Format
- ✅ `MM-DD-YYYY` (e.g., 07-01-2026)
- ✅ `YYYY-MM-DD` (e.g., 2026-07-01)
- ✅ `DD-MMM` (e.g., 01-Jul)

### Post Type
- ✅ `Video`
- ✅ `Poster`

### Missing Data
- ✅ Use `-` for missing values
- ✅ Use empty cell for missing values

### Numbers
- ✅ Use numbers: `1234` or `1,234`
- ✅ No decimals needed
- ✅ Cannot be negative

---

## ✅ Checklist Before Upload

- [ ] All posts filled
- [ ] All clients are valid
- [ ] Dates are in correct format
- [ ] Post types are Video or Poster
- [ ] No negative numbers
- [ ] Missing data marked with `-`
- [ ] At least one platform has metrics

---

## 🚫 Common Mistakes

| ❌ Wrong | ✅ Right |
|---------|----------|
| Empty cell | `-` |
| `01/07/2026` | `07-01-2026` |
| `Reel` | `Video` |
| `-100` | `100` |
| `1234.5` | `1234` |
| `Unknown Client` | Valid client name |

---

## 👥 Valid Clients

```
NTT, Einstein, IVN, DreamDaa, Dream Daa, Aladi Ezhilvanan,
Vilpower, Others, Vilpower DM, Quade, Discussion, Learning,
Nivya, Mr.Millet, Mopower, Iniya, 3Jo Toys, SalesNaany,
University, Client, SKM, Ramachandran, Ashmithasree,
Facebook, Instagram, YouTube, LinkedIn, X
```

---

## 🎨 Template Structure

```
Post | Client | Post Date | Post type | Instagram (6 cols) | Facebook (5 cols) | X (5 cols) | YouTube (3 cols)
-----|--------|-----------|-----------|-------------------|-------------------|-----------|------------------
Row1 | Sample data
Row2 | Sample data  
Row3 | Sample data
Row4 | Empty - Fill this!
Row5 | Empty - Fill this!
Row6 | Empty - Fill this!
```

---

## ❓ FAQ

**Q: Can I have only Instagram data?**
A: Yes! Use `-` for platforms without data.

**Q: Can I rearrange columns?**
A: Column order doesn't matter - system auto-detects platforms.

**Q: What date format should I use?**
A: Any of these work: MM-DD-YYYY, YYYY-MM-DD, or DD-MMM.

**Q: Can I add more platforms?**
A: Yes! Just use format: `PlatformName-MetricName` and it works.

**Q: What if I get an error?**
A: Check the error message - it shows exact row and problem.

**Q: Can I edit the template?**
A: No - download it again. Changes might break the import.

---

## 🆘 Need Help?

If you get an error during import:
1. Read the error message - it tells you what's wrong
2. Check the row number mentioned
3. Verify: Dates, Clients, Numbers are all correct
4. Re-download template if unsure
5. Contact support if still stuck

---

## 📞 Support

- 📧 Email: [support contact]
- 💬 Chat: [chat contact]
- 📖 Docs: [documentation link]

Happy importing! 🚀
