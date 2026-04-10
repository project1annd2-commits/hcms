const fs = require('fs');
const raw = fs.readFileSync('accounts.json');
let str = raw.toString('utf16le');
if (str.charCodeAt(0) === 0xfeff || str.charCodeAt(0) === 0xfffe) str = str.slice(1);
try {
  let accs = JSON.parse(str);
  console.log('Parsed as utf16le');
  checkMatches(accs);
} catch (e) {
  try {
    let str8 = raw.toString('utf8');
    if (str8.charCodeAt(0) === 0xfeff) str8 = str8.slice(1);
    let accs = JSON.parse(str8);
    console.log('Parsed as utf8');
    checkMatches(accs);
  } catch (err) {
    console.error('Failed to parse:', err);
  }
}

function checkMatches(accs) {
  const safa = accs.find(a => JSON.stringify(a).toLowerCase().includes('safa'));
  console.log('Safa:', JSON.stringify(safa, null, 2));
  const employees = accs.filter(a => a.role === 'employee');
  console.log('Total employees:', employees.length);
}
