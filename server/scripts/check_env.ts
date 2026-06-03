
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current __dirname:', __dirname);
console.log('Current CWD:', process.cwd());

// 1. Try cwd
const cwdPath = path.resolve(process.cwd(), '.env');
console.log('Trying .env at cwd:', cwdPath);
const result1 = dotenv.config({ path: cwdPath });
if (result1.error) console.log('Failed to load from cwd');
else console.log('Loaded from cwd');

// 2. Try relative to script
if (!process.env.MONGODB_URI) {
    const relPath = path.resolve(__dirname, '../../.env');
    console.log('Trying .env at relative:', relPath);
    const result2 = dotenv.config({ path: relPath });
    if (result2.error) console.log('Failed to load from relative');
    else console.log('Loaded from relative');
}

console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'FOUND' : 'MISSING');
if (process.env.MONGODB_URI) {
    console.log('URI content (first 10 chars):', process.env.MONGODB_URI.substring(0, 10));
}
