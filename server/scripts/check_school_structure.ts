import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkSchool() {
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();
    const snapshot = await db.collection('schools').limit(1).get();
    if (!snapshot.empty) {
        console.log('School Doc ID:', snapshot.docs[0].id);
        console.log('School Data:', JSON.stringify(snapshot.docs[0].data(), null, 2));
    } else {
        console.log('No schools found.');
    }
    process.exit(0);
}

checkSchool().catch(console.error);
