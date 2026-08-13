const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. Update index.html
const htmlPath = path.join(rootDir, 'index.html');
if (fs.existsSync(htmlPath)) {
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Replace headerBg gradient definitions with solid colors
    htmlContent = htmlContent.replace(
        "headerBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'",
        "headerBg: 'bg-emerald-600'"
    );
    htmlContent = htmlContent.replace(
        "headerBg: 'bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700'",
        "headerBg: 'bg-rose-600'"
    );
    htmlContent = htmlContent.replace(
        "headerBg: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700'",
        "headerBg: 'bg-indigo-600'"
    );

    // Replace inline gradients with solid colors for Client QC Mistake modals
    htmlContent = htmlContent.replaceAll(
        "background: linear-gradient(135deg, #e11d48 0%, #b45309 100%); color: #ffffff;",
        "background: #e11d48; color: #ffffff;"
    );

    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('Updated index.html - Applied solid single colors to modal headers');
}

// 2. Update script.js if present
const scriptPath = path.join(rootDir, 'script.js');
if (fs.existsSync(scriptPath)) {
    let scriptContent = fs.readFileSync(scriptPath, 'utf8');

    scriptContent = scriptContent.replace(
        "headerBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'",
        "headerBg: 'bg-emerald-600'"
    );
    scriptContent = scriptContent.replace(
        "headerBg: 'bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700'",
        "headerBg: 'bg-rose-600'"
    );
    scriptContent = scriptContent.replace(
        "headerBg: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700'",
        "headerBg: 'bg-indigo-600'"
    );

    scriptContent = scriptContent.replaceAll(
        "background: linear-gradient(135deg, #e11d48 0%, #b45309 100%); color: #ffffff;",
        "background: #e11d48; color: #ffffff;"
    );

    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    console.log('Updated script.js - Applied solid single colors to modal headers');
}
