import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
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

async function syncToFirestore() {
    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');

    if (!fs.existsSync(serviceAccountPath)) {
        console.error('Firebase service account not found at:', serviceAccountPath);
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
        credential: cert(serviceAccount)
    });

    const firestoreDb = getFirestore();
    console.log('✓ Connected to Firestore\n');

    if (!uri) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }

    const mongoClient = new MongoClient(uri);

    try {
        await mongoClient.connect();
        console.log('✓ Connected to MongoDB\n');

        const mongoDb = mongoClient.db(process.env.MONGODB_DB_NAME || 'test');

        // Get training programs from MongoDB
        const mongoPrograms = await mongoDb.collection('training_programs').find({}).toArray();
        console.log(`Found ${mongoPrograms.length} training programs in MongoDB`);

        // Get training programs from Firestore
        const firestoreSnapshot = await firestoreDb.collection('training_programs').get();
        const firestorePrograms = firestoreSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Found ${firestorePrograms.length} training programs in Firestore`);

        // Sync MongoDB programs to Firestore
        for (const program of mongoPrograms) {
            const existsInFirestore = firestorePrograms.some(fp => fp.id === program.id || fp.title === program.title);

            if (!existsInFirestore) {
                console.log(`\nSyncing: ${program.title}`);

                const { _id, ...programData } = program;
                const docId = program.id || _id.toString();

                await firestoreDb.collection('training_programs').doc(docId).set(programData);
                console.log(`  ✓ Added to Firestore with ID: ${docId}`);
            } else {
                console.log(`\n✓ Already exists in Firestore: ${program.title}`);
            }
        }

        // Also sync mentor_training_assignments
        console.log('\n--- Syncing Mentor Training Assignments ---');
        const mongoMentorAssignments = await mongoDb.collection('mentor_training_assignments').find({}).toArray();
        console.log(`Found ${mongoMentorAssignments.length} mentor assignments in MongoDB`);

        const firestoreMentorAssignmentsSnap = await firestoreDb.collection('mentor_training_assignments').get();
        const firestoreMentorAssignments = firestoreMentorAssignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Found ${firestoreMentorAssignments.length} mentor assignments in Firestore`);

        for (const assignment of mongoMentorAssignments) {
            const existsInFirestore = firestoreMentorAssignments.some(
                fa => (fa.mentor_id === assignment.mentor_id && fa.training_program_id === assignment.training_program_id)
            );

            if (!existsInFirestore) {
                const { _id, ...assignmentData } = assignment;
                const docId = assignment.id || _id.toString();

                await firestoreDb.collection('mentor_training_assignments').doc(docId).set(assignmentData);
                console.log(`  ✓ Synced assignment: ${docId}`);
            }
        }

        // Final verification
        console.log('\n=== VERIFICATION ===');
        const finalFirestorePrograms = await firestoreDb.collection('training_programs').get();
        console.log(`Training Programs in Firestore: ${finalFirestorePrograms.size}`);
        finalFirestorePrograms.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.title} (${data.status})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoClient.close();
    }
}

syncToFirestore();
