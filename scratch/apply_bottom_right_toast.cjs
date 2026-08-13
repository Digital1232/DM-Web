const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const targetRegex = /\.toast,\s*#toast,\s*#toast:popover-open[^{]*\{[^}]*\}/;
const targetShowRegex = /\.toast\.show,\s*#toast\.show,\s*#toast:popover-open\.show[^{]*\{[^}]*\}/;

const newToastCss = `.toast, #toast, #toast:popover-open, [popover].toast {
            position: fixed !important;
            inset: auto !important;
            margin: 0 !important;
            bottom: 24px !important;
            right: 24px !important;
            top: auto !important;
            left: auto !important;
            z-index: 2147483647 !important;
            transform: translateY(20px);
            opacity: 0;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            pointer-events: none;
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.25) !important;
            max-width: 380px !important;
            width: auto !important;
        }`;

const newToastShowCss = `.toast.show, #toast.show, #toast:popover-open.show, [popover].toast.show {
            position: fixed !important;
            inset: auto !important;
            bottom: 24px !important;
            right: 24px !important;
            top: auto !important;
            left: auto !important;
            transform: translateY(0) !important;
            opacity: 1 !important;
            pointer-events: auto !important;
        }`;

htmlContent = htmlContent.replace(targetRegex, newToastCss);
htmlContent = htmlContent.replace(targetShowRegex, newToastShowCss);

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully updated toast position to bottom-right corner in index.html!');
