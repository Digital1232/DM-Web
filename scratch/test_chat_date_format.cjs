function formatChatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
}

const tests = [
    { date: new Date(2026, 7, 15, 11, 45), expected: 'Aug 15, 11:45 am' },
    { date: new Date(2026, 7, 15, 23, 45), expected: 'Aug 15, 11:45 pm' },
    { date: new Date(2026, 0, 5, 9, 5), expected: 'Jan 5, 9:05 am' },
    { date: new Date(2026, 11, 31, 0, 0), expected: 'Dec 31, 12:00 am' },
    { date: new Date(2026, 5, 1, 12, 0), expected: 'Jun 1, 12:00 pm' }
];

let failed = false;
tests.forEach(({ date, expected }) => {
    const result = formatChatTime(date.getTime());
    if (result === expected) {
        console.log(`PASS: ${date.toISOString()} -> ${result}`);
    } else {
        console.error(`FAIL: ${date.toISOString()} -> Got "${result}", expected "${expected}"`);
        failed = true;
    }
});

if (failed) {
    process.exit(1);
} else {
    console.log('\nAll tests passed successfully!');
}
