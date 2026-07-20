const fs = require('fs');

// Read the js file
const jsCode = fs.readFileSync('js/socialAnalyticsImport.js', 'utf8');
eval(jsCode); // This defines processCSVImport and parseCSV in the global scope

// Read the template file
let csvText = fs.readFileSync('templates/social-analytics-import-template.csv', 'utf8');

// csvText = csvText.replace('🎉 Happy Birthday, Lalitha Sri!', '"🎉 Happy Birthday, Lalitha Sri!"');

const result = processCSVImport(csvText);
console.log('--- TEST RESULTS ---');
console.log('Success:', result.success);
console.log('Errors count:', result.errors.length);
console.log('Warnings count:', result.warnings.length);
console.log('Errors:', JSON.stringify(result.errors, null, 2));

if (result.success && result.data.length > 0) {
    console.log('\n--- FIRST PARSED RECORD ---');
    console.log(result.data[0]);
}
