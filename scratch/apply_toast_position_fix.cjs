const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const oldToastCss = `.toast, #toast, #toast:popover-open {
            position: fixed !important;
            margin: 0 !important;
            top: auto !important;
            left: auto !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 2147483647 !important;
            transform: translateY(150%);
            opacity: 0;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            pointer-events: none;
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.25) !important;
        }`;

const newToastCss = `.toast, #toast, #toast:popover-open {
            position: fixed !important;
            margin: 0 !important;
            top: 24px !important;
            right: 24px !important;
            bottom: auto !important;
            left: auto !important;
            z-index: 2147483647 !important;
            transform: translateY(-30px);
            opacity: 0;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            pointer-events: none;
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.25) !important;
            max-width: 420px !important;
        }`;

if (htmlContent.includes(oldToastCss)) {
    htmlContent = htmlContent.replace(oldToastCss, newToastCss);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('Successfully updated toast CSS to top-right corner!');
} else {
    // Regex replace if whitespace differs
    const regex = /\.toast,\s*#toast,\s*#toast:popover-open\s*\{[^}]*\}/;
    htmlContent = htmlContent.replace(regex, newToastCss);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('Successfully updated toast CSS using regex replacement!');
}
