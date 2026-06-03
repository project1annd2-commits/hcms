const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the extra closing parenthesis on line 166
content = content.replace(
  'credentials: { username: \'admin\', password: \'admin123\' }\n    });\n});\n',
  'credentials: { username: \'admin\', password: \'admin123\' }\n    });\n});\n'
);

// Also fix the teacher login route
content = content.replace(
  'res.json({ teacher });\n}));\n',
  'res.json({ teacher });\n});\n'
);

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Syntax errors fixed!');