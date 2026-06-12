const fs = require('fs');
const path = 'd:\\Clients\\2026\\VilPower\\Task Tracking Project\\index.html';
let content = fs.readFileSync(path, 'utf8');

const targetPattern = /<span class="report-panel-period[^"]*"[^>]*><\/span>[\s\r\n]*<input id="perf-date-to"[^>]*>[\s\r\n]*<\/div>/;
if (targetPattern.test(content)) {
    content = content.replace(targetPattern, '<span class="report-panel-period text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-widest"></span>');
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully removed perf-date-to input.');
} else {
    // Let's do a literal replacement for safety
    const literalTarget = '<span class="report-panel-period text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-widest"></span>\r\n                                              <input id="perf-date-to" type="date" onchange="handlePerformanceFilterChange()" class="bg-transparent text-xs font-bold text-indigo-600 outline-none cursor-pointer"/>\r\n                                            </div>';
    const literalTargetLF = literalTarget.replace(/\r\n/g, '\n');
    
    if (content.includes(literalTarget)) {
        content = content.replace(literalTarget, '<span class="report-panel-period text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-widest"></span>');
        fs.writeFileSync(path, content, 'utf8');
        console.log('Successfully removed perf-date-to literal CRLF.');
    } else if (content.includes(literalTargetLF)) {
        content = content.replace(literalTargetLF, '<span class="report-panel-period text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-widest"></span>');
        fs.writeFileSync(path, content, 'utf8');
        console.log('Successfully removed perf-date-to literal LF.');
    } else {
        // Fallback: search by index
        const index = content.indexOf('id="perf-date-to"');
        if (index !== -1) {
            console.log('Found perf-date-to at index', index);
            // Let's replace the line containing perf-date-to and the next line containing </div>
            const before = content.substring(0, index);
            const spanIndex = before.lastIndexOf('<span class="report-panel-period');
            if (spanIndex !== -1) {
                const afterInput = content.substring(index);
                const closeDivIndex = afterInput.indexOf('</div>');
                if (closeDivIndex !== -1) {
                    const finalAfter = afterInput.substring(closeDivIndex + 6);
                    content = content.substring(0, spanIndex) + 
                              '<span class="report-panel-period text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-widest"></span>' +
                              finalAfter;
                    fs.writeFileSync(path, content, 'utf8');
                    console.log('Successfully removed perf-date-to using offset indices.');
                }
            }
        } else {
            console.log('Target NOT found.');
        }
    }
}
