const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. config.js
const configPath = path.join(rootDir, 'config.js');
if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace("projectKeys: ['AUG', 'JULY']", "projectKeys: ['AUG']");
    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log('Updated config.js - Removed JULY key');
}

// 2. script.js
const scriptPath = path.join(rootDir, 'script.js');
if (fs.existsSync(scriptPath)) {
    let scriptContent = fs.readFileSync(scriptPath, 'utf8');
    scriptContent = scriptContent.replace("projectKeys: ['AUG', 'JULY']", "projectKeys: ['AUG']");
    scriptContent = scriptContent.replace("const projectKeys = JIRA.projectKeys || ['AUG', 'JULY'];", "const projectKeys = JIRA.projectKeys || ['AUG'];");
    scriptContent = scriptContent.replace("if (month === '07') return 'JULY';", "// July key removed");
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    console.log('Updated script.js - Removed JULY key');
}

// 3. index.html inline script
const htmlPath = path.join(rootDir, 'index.html');
if (fs.existsSync(htmlPath)) {
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    htmlContent = htmlContent.replace("projectKeys: ['AUG', 'JULY']", "projectKeys: ['AUG']");
    htmlContent = htmlContent.replace("const projectKeys = JIRA.projectKeys || ['AUG', 'JULY'];", "const projectKeys = JIRA.projectKeys || ['AUG'];");
    htmlContent = htmlContent.replace("if (month === '07') return 'JULY';", "// July key removed");
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('Updated index.html - Removed JULY key');
}
