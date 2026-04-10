
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to find .env file
function loadEnv() {
    const searchPaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../.env'),
        path.resolve('C:\\Users\\Hauna\\Downloads\\project-bolt-sb1-gqfzf2es (6)\\project\\.env') // Hardcoded absolute path as last resort
    ];

    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            console.log(`Found .env at: ${p}`);
            dotenv.config({ path: p });
            if (process.env.MONGODB_URI) return true;
        }
    }
    return false;
}

if (!loadEnv()) {
    console.error('Could not find .env file or MONGODB_URI is missing.');
    // Provide a way to manually input via arg if needed, but not interactive here.
}

const uri = process.env.MONGODB_URI;
const PHONE = '9916777753';

async function investigate() {
    if (!uri) {
        console.error('MONGODB_URI not loaded.');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        // Assume DB Name from env or default
        const dbName = process.env.MONGODB_DB_NAME || 'test';
        const db = client.db(dbName);
        console.log(`Using database: ${dbName}`);

        // Normalize function same as Login.tsx
        const normalize = (p: string | undefined) => p ? p.replace(/\s+/g, '') : '';
        const targetNormalized = normalize(PHONE);

        console.log(`Target Phone: ${PHONE} (Normalized: ${targetNormalized})`);

        // Fetch ALL mentors to do client-side-like check
        const mentors = await db.collection('mentors').find({}).toArray();
        console.log(`Total Mentors in DB: ${mentors.length}`);

        const matches = mentors.filter(m => {
            const p1 = normalize(m.phone);
            const p2 = normalize(m.mobile);
            const p3 = normalize(m.contact_number);
            return p1.includes(targetNormalized) || p2.includes(targetNormalized) || p3.includes(targetNormalized);
        });

        if (matches.length > 0) {
            console.log('\nMATCHING MENTORS:');
            matches.forEach(m => {
                console.log(`- Name: ${m.first_name} ${m.last_name}`);
                console.log(`  ID: ${m._id} (String ID: ${m.id})`); // Check for id field usage
                console.log(`  Phone: '${m.phone}' (Normalized: '${normalize(m.phone)}')`);
                console.log(`  Status: ${m.status}`);
                console.log(`  School ID: ${m.school_id}`);
            });
        } else {
            console.log('\nNO MATCHING MENTORS FOUND via normalization check.');
        }

        // Check if assignments exist for this mentor (if found)
        if (matches.length > 0) {
            const m = matches[0];
            const mentorId = m.id || m._id.toString(); // Support both
            console.log(`\nChecking assignments for Mentor ID: ${mentorId}`);

            const assignments = await db.collection('mentor_training_assignments').find({
                mentor_id: mentorId
            }).toArray();

            console.log(`Found ${assignments.length} assignments.`);
            assignments.forEach(a => {
                console.log(`- Program: ${a.training_program_id}, Status: ${a.status}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

investigate();
