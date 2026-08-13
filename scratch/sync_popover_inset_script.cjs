const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
if (fs.existsSync(scriptPath)) {
    let scriptContent = fs.readFileSync(scriptPath, 'utf8');
    const reworkStart = scriptContent.indexOf("function showReworkQcModal");
    if (reworkStart !== -1) {
        const reworkEnd = scriptContent.indexOf("openTaskResourcesDrawer", reworkStart);
        if (reworkEnd !== -1) {
            let reworkChunk = scriptContent.substring(reworkStart, reworkEnd);
            if (!reworkChunk.includes("dismissToast();")) {
                reworkChunk = reworkChunk.replace("modal.showModal();", "dismissToast();\n                modal.showModal();");
                scriptContent = scriptContent.substring(0, reworkStart) + reworkChunk + scriptContent.substring(reworkEnd);
                fs.writeFileSync(scriptPath, scriptContent, 'utf8');
                console.log("Updated showReworkQcModal in script.js!");
            }
        }
    }
}
