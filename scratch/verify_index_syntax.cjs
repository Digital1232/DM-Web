const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract module script contents
const scriptMatches = htmlContent.match(/<script type="module">([\s\S]*?)<\/script>/g);
if (!scriptMatches) {
    console.error('No module scripts found!');
    process.exit(1);
}

console.log(`Found ${scriptMatches.length} module script(s). Testing syntax...`);

scriptMatches.forEach((scriptTag, idx) => {
    const code = scriptTag.replace('<script type="module">', '').replace('</script>', '');
    const tempFile = path.join(__dirname, `temp_script_check_${idx}.mjs`);
    fs.writeFileSync(tempFile, code, 'utf8');
    try {
        execSync(`node --check "${tempFile}"`, { stdio: 'pipe' });
        console.log(`Module script #${idx + 1} syntax check PASSED!`);
    } catch (err) {
        console.error(`Module script #${idx + 1} syntax check FAILED:`, err.stderr.toString());
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
});
