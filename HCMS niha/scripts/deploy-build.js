import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const netlifyFunctionsDir = path.join(rootDir, 'netlify', 'functions');

// Clean up the entire functions directory
if (fs.existsSync(netlifyFunctionsDir)) {
    fs.rmSync(netlifyFunctionsDir, { recursive: true });
}
fs.mkdirSync(netlifyFunctionsDir, { recursive: true });

// Helper to copy directory recursively
function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

try {
    console.log('Building frontend...');
    execSync('vite build', { stdio: 'inherit', cwd: rootDir });

    console.log('Building server...');
    execSync('npx tsc -p server/tsconfig.json', { stdio: 'inherit', cwd: rootDir });

    console.log('Preparing Netlify function...');
    const serverDistSrc = path.join(serverDir, 'dist');

    if (fs.existsSync(serverDistSrc)) {
        // Copy all compiled server files directly to netlify/functions/
        const entries = fs.readdirSync(serverDistSrc, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(serverDistSrc, entry.name);
            const destPath = path.join(netlifyFunctionsDir, entry.name);

            if (entry.isDirectory()) {
                copyDirSync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }

        // Rename lambda.js to api.js to match the endpoint
        const lambdaPath = path.join(netlifyFunctionsDir, 'lambda.js');
        const apiPath = path.join(netlifyFunctionsDir, 'api.js');
        if (fs.existsSync(lambdaPath)) {
            fs.renameSync(lambdaPath, apiPath);
        }

        console.log('Build complete!');
    } else {
        console.error('Error: Server dist directory not found:', serverDistSrc);
        process.exit(1);
    }
} catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
}
