import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

function loadEnv() {
    const searchPaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '..', '.env'),
        path.resolve('C:\\Users\\Hauna\\Downloads\\project-bolt-sb1-gqfzf2es (6)\\project\\.env')
    ];
    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            dotenv.config({ path: p });
            if (process.env.MONGODB_URI) return true;
        }
    }
    return false;
}
loadEnv();

const uri = process.env.MONGODB_URI;

async function check() {
    if (!uri) process.exit(1);
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME || 'test');

        console.log('=== ALL TRAINING PROGRAMS ===');
        const programs = await db.collection('training_programs').find({}).toArray();
        console.log(`Total: ${programs.length}\n`);

        programs.forEach(p => {
            console.log(`- Title: "${p.title}"`);
            console.log(`  ID: ${p.id}`);
            console.log(`  Status: ${p.status}`);
            console.log('');
        });

        console.log('=== ACTIVE PROGRAMS ===');
        const activePrograms = programs.filter(p => p.status === 'active');
        console.log(`Active: ${activePrograms.length}`);
        activePrograms.forEach(p => console.log(`- ${p.title}`));

    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
}

check();
