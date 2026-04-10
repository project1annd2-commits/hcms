const fs = require('fs');
const path = require('path');

const authPath = path.join(__dirname, 'src', 'lib', 'auth.ts');
let content = fs.readFileSync(authPath, 'utf8');

const newFunctions = `

export const managementLogin = async (phone: string): Promise<Management | null> => {
  try {
    const management = await db.findOne<Management>('management', { phone });
    if (!management) {
      return null;
    }
    if (management.status !== 'active') {
      return null;
    }
    localStorage.setItem(MANAGEMENT_STORAGE_KEY, JSON.stringify(management));
    updateLastActivity();
    return management;
  } catch (error) {
    console.error('Management login error:', error);
    return null;
  }
};

export const getCurrentManagement = (): Management | null => {
  const stored = localStorage.getItem(MANAGEMENT_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};
`;

// Find and replace
const pattern = /export const getCurrentMentor = \(\): Mentor \| null => \{[\s\S]*?\};\s*\n\s*export const generateUsername/;
if (content.match(pattern)) {
  content = content.replace(pattern, newFunctions + '\nexport const generateUsername');
}

// Also update logout to clear MANAGEMENT_STORAGE_KEY
content = content.replace(
  'localStorage.removeItem(MENTOR_STORAGE_KEY);',
  'localStorage.removeItem(MENTOR_STORAGE_KEY);\n  localStorage.removeItem(MANAGEMENT_STORAGE_KEY);'
);

fs.writeFileSync(authPath, content);
console.log('Done');
