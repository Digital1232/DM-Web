const fs = require('fs');
const path = require('path');

const dailyPlanFixPath = path.join(__dirname, '..', 'js', 'dailyPlanFix.js');
if (fs.existsSync(dailyPlanFixPath)) {
  const content = fs.readFileSync(dailyPlanFixPath, 'utf8');
  console.log('=== js/dailyPlanFix.js ===');
  console.log(content);
} else {
  console.log('js/dailyPlanFix.js NOT FOUND in js/ directory');
  // Search workspace for dailyPlanFix
  const files = fs.readdirSync(path.join(__dirname, '..'));
  console.log('Root files:', files.filter(f => f.includes('Fix') || f.includes('fix')));
}
