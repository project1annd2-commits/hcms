import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTIONS = [
    'training_assignments',
    'training_attendance',
    'teachers',
    'schools',
    'mentors',
    'training_programs',
    'school_assignments',
    'employee_tasks',
    'school_followups',
    'user_devices'
];

async function checkFirestoreLastUpdates() {
    try {
        // Initialize Firebase Admin
        // Looking for the service account file in the project root or server root
        // Based on file list, it's in project root: hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json
        const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');

        if (!fs.existsSync(serviceAccountPath)) {
            console.error(`Service account file not found at: ${serviceAccountPath}`);
            return;
        }

        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        initializeApp({
            credential: cert(serviceAccount)
        });

        const db = getFirestore();
        console.log('✅ Firebase Admin initialized');

        for (const collectionName of COLLECTIONS) {
            const collectionRef = db.collection(collectionName);

            // Try to order by updated_at desc
            // Note: This requires an index in Firestore. If it fails, we might need to fetch all (expensive) or try another way.
            // For now, let's try limit 1.
            try {
                const snapshot = await collectionRef
                    .orderBy('updated_at', 'desc')
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    const doc = snapshot.docs[0].data();
                    console.log(`Collection: ${collectionName.padEnd(25)} Last Update: ${doc.updated_at}`);
                } else {
                    // Try created_at if empty or updated_at not found
                    const createSnapshot = await collectionRef
                        .orderBy('created_at', 'desc')
                        .limit(1)
                        .get();

                    if (!createSnapshot.empty) {
                        const doc = createSnapshot.docs[0].data();
                        console.log(`Collection: ${collectionName.padEnd(25)} Last Update: ${doc.created_at} (created_at)`);
                    } else {
                        console.log(`Collection: ${collectionName.padEnd(25)} Last Update: Never (Empty)`);
                    }
                }
            } catch (error: any) {
                if (error.code === 5 || error.message.includes('requires an index')) {
                    console.log(`Collection: ${collectionName.padEnd(25)} Last Update: Index Missing (Cannot determine efficiently)`);
                } else {
                    console.error(`Error checking ${collectionName}:`, error.message);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkFirestoreLastUpdates();
