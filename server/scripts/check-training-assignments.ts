import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkTrainingAssignments() {
    console.log('🔍 Checking Training Assignments in Firebase...\n');

    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();
    console.log('✅ Firebase Admin initialized\n');

    try {
        // Check training_assignments collection
        const assignmentsRef = db.collection('training_assignments');
        const snapshot = await assignmentsRef.get();

        console.log(`📊 Training Assignments in Firebase: ${snapshot.size} documents\n`);

        if (snapshot.size > 0) {
            console.log('Sample documents:');
            snapshot.docs.slice(0, 3).forEach((doc, idx) => {
                console.log(`${idx + 1}. ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
            });
        } else {
            console.log('❌ No training assignments found in Firebase');
        }

        // Check training_attendance for reference
        const attendanceRef = db.collection('training_attendance');
        const attendanceSnapshot = await attendanceRef.get();
        console.log(`\n📊 Training Attendance in Firebase: ${attendanceSnapshot.size} documents`);

        if (attendanceSnapshot.size > 0) {
            console.log('\nSample attendance record:');
            const sampleDoc = attendanceSnapshot.docs[0];
            console.log(JSON.stringify(sampleDoc.data(), null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

checkTrainingAssignments().catch(console.error);
