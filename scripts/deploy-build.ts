import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const netlifyFunctionsDir = path.join(rootDir, 'netlify', 'functions');

// Ensure netlify/functions exists
if (!fs.existsSync(netlifyFunctionsDir)) {
    fs.mkdirSync(netlifyFunctionsDir, { recursive: true });
}

try {
    console.log('Building frontend...');
    execSync('vite build', { stdio: 'inherit', cwd: rootDir });

    console.log('Building server...');
    execSync('tsc -p server/tsconfig.json', { stdio: 'inherit', cwd: rootDir });

    console.log('Copying lambda handler...');
    const src = path.join(serverDir, 'dist', 'lambda.js');
    const dest = path.join(netlifyFunctionsDir, 'api.js');
    fs.copyFileSync(src, dest);

    console.log('Build complete!');
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}
