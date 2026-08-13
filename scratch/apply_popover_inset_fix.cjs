const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const targetRegex = /\.toast,\s*#toast,\s*#toast:popover-open\s*\{[^}]*\}/;
const targetShowRegex = /\.toast\.show,\s*#toast\.show,\s*#toast:popover-open\.show\s*\{[^}]*\}/;

const newToastCss = `.toast, #toast, #toast:popover-open, [popover].toast {
            position: fixed !important;
            inset: auto !important;
            margin: 0 !important;
            top: 24px !important;
            right: 24px !important;
            bottom: auto !important;
            left: auto !important;
            z-index: 2147483647 !important;
            transform: translateY(-20px);
            opacity: 0;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            pointer-events: none;
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.25) !important;
            max-width: 420px !important;
            width: auto !important;
        }`;

const newToastShowCss = `.toast.show, #toast.show, #toast:popover-open.show, [popover].toast.show {
            position: fixed !important;
            inset: auto !important;
            top: 24px !important;
            right: 24px !important;
            bottom: auto !important;
            left: auto !important;
            transform: translateY(0) !important;
            opacity: 1 !important;
            pointer-events: auto !important;
        }`;

htmlContent = htmlContent.replace(targetRegex, newToastCss);
htmlContent = htmlContent.replace(targetShowRegex, newToastShowCss);

// Also check when showReworkQcModal is called: dismissToast() so double toasts don't appear over the modal
const showReworkModalMarker = "modal.showModal();";
const popupToastDismiss = "dismissToast(); modal.showModal();";

// Replace modal.showModal() inside showReworkQcModal
const reworkStart = htmlContent.indexOf("function showReworkQcModal");
if (reworkStart !== -1) {
    const reworkEnd = htmlContent.indexOf("openTaskResourcesDrawer", reworkStart);
    let reworkChunk = htmlContent.substring(reworkStart, reworkEnd);
    if (!reworkChunk.includes("dismissToast();")) {
        reworkChunk = reworkChunk.replace("modal.showModal();", "dismissToast();\n                modal.showModal();");
        htmlContent = htmlContent.substring(0, reworkStart) + reworkChunk + htmlContent.substring(reworkEnd);
        console.log("Added dismissToast() inside showReworkQcModal to prevent duplicate toast alerts!");
    }
}

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully updated toast popover inset CSS in index.html!');
