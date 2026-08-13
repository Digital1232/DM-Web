const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const targetStr = `<div id="strategy-action-buttons" class="hidden">
                            <button onclick="openWeeklyTaskAssigneeModal()"`;

const replaceStr = `<div id="strategy-action-buttons" class="hidden">
                            <button onclick="openAddStrategyEventModal()"`;

// Normalize whitespace for search
if (htmlContent.includes('onclick="openWeeklyTaskAssigneeModal()"')) {
    // Replace specifically around strategy-action-buttons
    const stratBtnIdx = htmlContent.indexOf('id="strategy-action-buttons"');
    if (stratBtnIdx !== -1) {
        const onclickIdx = htmlContent.indexOf('onclick="openWeeklyTaskAssigneeModal()"', stratBtnIdx);
        if (onclickIdx !== -1 && onclickIdx - stratBtnIdx < 100) {
            htmlContent = htmlContent.substring(0, onclickIdx) + 'onclick="openAddStrategyEventModal()"' + htmlContent.substring(onclickIdx + 'onclick="openWeeklyTaskAssigneeModal()"'.length);
            console.log('Successfully updated strategy header button to openAddStrategyEventModal()');
            fs.writeFileSync(htmlPath, htmlContent, 'utf8');
        }
    }
}
