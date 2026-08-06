const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let idx = indexHtml.indexOf('tbody.innerHTML = filtered.map');
if (idx !== -1) {
  console.log(indexHtml.substring(idx, idx + 4000));
} else {
  // Let's search for tbody
  let idx2 = indexHtml.indexOf('function renderTasks');
  console.log(indexHtml.substring(idx2 + 14000, idx2 + 20000));
}
