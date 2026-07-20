# WorkSync Daily Summary Email - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Preview the Template
1. Open `worksync-daily-summary.html` in your browser
2. This shows the final design with sample data
3. You'll see all sections and styling in action

### Step 2: Understand the Files

| File | Purpose |
|------|---------|
| `worksync-daily-summary.html` | Static template with sample data (preview/reference) |
| `generate-daily-summary.js` | Dynamic generator class (use for real data) |
| `integration-example.js` | Firebase integration examples |
| `WORKSYNC_EMAIL_GUIDE.md` | Complete documentation |
| `QUICK_START.md` | This file (quick reference) |

### Step 3: Choose Your Integration Method

#### Option A: Simple (Static HTML)
Best for: Testing, manual emails, simple deployments

```html
<!-- Just edit the HTML file with your data and send -->
<!-- Update employee rows, KPI values, etc. manually -->
```

#### Option B: Dynamic (Node.js)
Best for: Automated daily emails, real Firebase data

```javascript
const DailySummaryEmailGenerator = require('./generate-daily-summary.js');

const generator = new DailySummaryEmailGenerator({
    date: new Date(),
    employees: [...], // Your employee data
    tasks: [...],     // Your task data
    clients: [...]    // Your client list
});

const htmlEmail = generator.generateHTML();
```

#### Option C: Full Integration (Firebase + Scheduling)
Best for: Production, automated daily reports

```javascript
// Use integration-example.js for complete setup
const { scheduleDefaultDailySummary } = require('./integration-example.js');

scheduleDefaultDailySummary('admin@vilpower.com');
// Runs daily at 6 PM
```

---

## 📊 Email Sections Overview

### 1. Header
- OneDesk branding
- Date and time
- Gradient background

### 2. KPI Dashboard (6 Cards)
- Total Worked Hours
- Tasks Logged
- Active Employees
- Clients Worked
- Average Time per Task
- Productivity Score

### 3. Employee Performance Table
- All team members with stats
- Color-coded status badges
- Top performers highlighted

### 4. Top Performers
- 🥇 Highest Tasks
- 🥈 Longest Hours
- 🥉 Highest Productivity

### 5. Attention Alert
- Inactive employees
- Recommended follow-ups

### 6. Client Summary
- Task distribution by client
- Sorted by volume

### 7. Active Employees
- Currently working staff
- Current task and duration

### 8. AI Insights
- Auto-generated insights
- Performance highlights
- Team analysis

### 9. Recommendations
- Tomorrow's action items
- Optimization suggestions

### 10. Footer
- Company branding
- Disclaimer

---

## 🔧 Quick Implementation

### For Firebase Integration

```javascript
// 1. Import the email generator
const DailySummaryEmailGenerator = require('./generate-daily-summary.js');

// 2. Get your data from Firebase
async function getDailyEmail() {
    // Fetch employees
    const employees = await db.ref('employees').once('value').then(snap => snap.val());
    
    // Fetch today's tasks
    const today = new Date();
    const tasks = await db.ref('tasks')
        .orderByChild('date')
        .startAt(today.toISOString())
        .once('value')
        .then(snap => snap.val());
    
    // Format and create generator
    const data = formatData(employees, tasks);
    const generator = new DailySummaryEmailGenerator(data);
    
    // Generate HTML
    return generator.generateHTML();
}

// 3. Send the email
async function sendDailySummary() {
    const html = await getDailyEmail();
    
    // Send using your email service (Nodemailer, Firebase Functions, etc.)
    await sendEmail({
        to: 'admin@vilpower.com',
        subject: 'WorkSync Daily Summary',
        html: html
    });
}

// 4. Schedule it
const cron = require('node-cron');
cron.schedule('0 18 * * *', sendDailySummary); // 6 PM daily
```

---

## 🎨 Customization Quick Tips

### Change Colors
```javascript
// In generate-daily-summary.js, modify CSS colors:
// Look for #6366f1 (primary blue)
// Look for #7c3aed (secondary purple)
// Change to your brand colors
```

### Change Company Name
```html
<!-- In HTML or generator, change -->
<div class="logo">🔷 ONEDESK</div>
<!-- to -->
<div class="logo">🔷 YOUR_COMPANY</div>
```

### Add Your Logo
```html
<!-- Replace the emoji logo with an image -->
<img src="your-logo.png" alt="Logo" style="height: 40px;">
```

### Modify KPI Formulas
```javascript
calculateKPIs() {
    // Edit this method to customize how KPIs are calculated
    // Change productivity score formula
    // Add new metrics
    // Modify calculations
}
```

---

## 📱 Email Client Support

✅ Works perfectly in:
- Gmail (Desktop & Mobile)
- Outlook (Desktop & Web)
- Apple Mail
- Mobile email clients
- Thunderbird
- Yahoo Mail

---

## ⚡ Data Format Needed

### Employee Data
```javascript
{
    name: "Karthika K",
    email: "karthika@vilpower.com",
    workedSeconds: 27922,        // Total seconds
    completedTasks: 12,
    status: "Working",            // or Break, Hold, Offline
    currentTask: "JULY-401",
    currentDuration: 7095,
    productivity: 98,             // 0-100%
    isTopPerformer: true
}
```

### Task Data
```javascript
{
    id: "JULY-401",
    client: "VilPower",
    employee: "Karthika K",
    duration: 3600,               // Seconds
    completed: true
}
```

---

## 🧪 Testing

### Test 1: Visual Preview
```bash
# Open in browser
open worksync-daily-summary.html
```

### Test 2: Generate Dynamic Email
```bash
# Create test email file
node -e "
const gen = require('./generate-daily-summary.js');
const g = new gen({date: new Date(), employees: [], tasks: [], clients: []});
require('fs').writeFileSync('test.html', g.generateHTML());
"
```

### Test 3: Send Test Email
```javascript
const { saveEmailToFile } = require('./integration-example.js');
saveEmailToFile('test-email.html');
```

---

## 🔌 Integration Checklist

- [ ] Review static HTML template in browser
- [ ] Understand data format required
- [ ] Set up Firebase queries for employees/tasks
- [ ] Test data retrieval from Firebase
- [ ] Generate sample email HTML
- [ ] Test email sending via your service
- [ ] Schedule automated daily emails
- [ ] Monitor first week of automated emails
- [ ] Gather feedback from recipients
- [ ] Make adjustments as needed

---

## 📧 Email Service Setup

### Nodemailer (Node.js)
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-password'
    }
});

transporter.sendMail({
    from: 'worksync@vilpower.com',
    to: recipient,
    subject: 'Daily Summary',
    html: emailHTML
});
```

### Firebase Cloud Functions
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.sendDailySummary = functions.pubsub
    .schedule('0 18 * * *')
    .onRun(async (context) => {
        // Generate and send email
    });
```

### SendGrid
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
    to: recipient,
    from: 'worksync@vilpower.com',
    subject: 'Daily Summary',
    html: emailHTML
});
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not rendering | Check HTML is valid, test in multiple clients |
| Colors not showing | Ensure inline CSS, use simpler color values |
| Mobile layout broken | Check viewport meta tag, test on real phone |
| Data not populating | Verify data format matches requirements |
| Email not sending | Check SMTP credentials, firewall rules |

---

## 📞 Need Help?

1. Check `WORKSYNC_EMAIL_GUIDE.md` for full documentation
2. Review `integration-example.js` for code examples
3. Look at `worksync-daily-summary.html` for HTML structure
4. Test with sample data first

---

## 🎯 Next Steps

1. **Week 1**: Set up and test static template
2. **Week 2**: Integrate with Firebase data
3. **Week 3**: Schedule automated daily emails
4. **Week 4+**: Monitor, optimize, and gather feedback

---

**Version**: 1.0  
**Last Updated**: July 2026  
**Status**: Production Ready ✅
