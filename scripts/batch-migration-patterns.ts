/**
 * AUTO-MIGRATION BATCH SCRIPT
 * This script documents the exact find/replace patterns for each component
 */

// Standard patterns to apply to ALL remaining components

const migrationPatterns = {
    // Pattern 1: Import statement
    find: /import \{ (supabase[^}]*) \} from '\.\.\/lib\/supabase';/g,
    replace: (match, imports) => {
        const types = imports.replace('supabase, ', '').replace('supabase,', '');
        return `import { ${types} } from '../lib/models';\nimport { db } from '../lib/services/db';\nimport { Collections } from '../lib/mongodb';`;
    },

    // Pattern 2: select all
    find: /await supabase\.from\('(\w+)'\)\.select\('\*'\)/g,
    replace: 'await db.find(Collections.$1.toUpperCase(), {})',

    // Pattern 3: select with eq
    find: /await supabase\.from\('(\w+)'\)\.select\([^)]+\)\.eq\('(\w+)', ([^)]+)\)/g,
    replace: 'await db.findOne(Collections.$1.toUpperCase(), { $2: $3 })',

    // Pattern 4: insert
    find: /await supabase\.from\('(\w+)'\)\.insert\(([^)]+)\)/g,
    replace: 'await db.insertOne(Collections.$1.toUpperCase(), $2 as any)',

    // Pattern 5: update with eq
    find: /await supabase\.from\('(\w+)'\)\.update\(([^)]+)\)\.eq\('id', ([^)]+)\)/g,
    replace: 'await db.updateById(Collections.$1.UPPER(), $3, $2)',

    // Pattern 6: delete with eq
    find: /await supabase\.from\('(\w+)'\)\.delete\(\)\.eq\('id', ([^)]+)\)/g,
    replace: 'await db.deleteById(Collections.$1.toUpperCase(), $2)',
};

// Component-specific migrations  
const componentMigrations = {
    'Te acher Management.tsx': {
        notes: 'Complex - has school relationships, needs join handling',
    },
    'MentorManagement.tsx': {
        notes: 'Has mentor_schools many-to-many relationship',
    },
    // ... etc
};

export { migrationPatterns, componentMigrations };
