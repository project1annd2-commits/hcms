
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const C10_PROGRAM_ID = '1ffcc0bd-b280-4e58-abc8-1d837ca3247d';
const SUBJECT_NAME = 'Attendance';

// Marking Scheme
const MARKING_SCHEME: { [key: number]: number } = {
    16: 10,
    15: 9.5,
    14: 9,
    13: 8.5,
    12: 8,
    11: 7.5,
    10: 7,
    9: 6.5,
    8: 6,
    7: 5
};

async function updateAttendanceMarks() {
    try {
        console.log('Initializing Firebase Admin...');

        // Path adjusted based on script location (server/scripts -> ../../service-account.json)
        // actually looking at investigate_firestore.ts, it was ../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json
        const serviceAccountPath = path.resolve(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');

        if (!fs.existsSync(serviceAccountPath)) {
            throw new Error(`Service account file not found at: ${serviceAccountPath}`);
        }

        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        const db = admin.firestore();
        console.log('✓ Connected to Firestore\n');

        // 1. Get C10 Assignments
        console.log(`Fetching assignments for program: ${C10_PROGRAM_ID}...`);
        const assignmentsSnap = await db.collection('training_assignments')
            .where('training_program_id', '==', C10_PROGRAM_ID)
            .get();

        if (assignmentsSnap.empty) {
            console.log('No assignments found for C10 program. Exiting.');
            return;
        }

        const assignments = assignmentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as any[];

        console.log(`Found ${assignments.length} assignments.\n`);

        // 2. Get Attendance Records
        console.log('Fetching attendance records...');
        const attendanceSnap = await db.collection('training_attendance')
            .where('training_program_id', '==', C10_PROGRAM_ID)
            .where('status', '==', 'present')
            .get();

        console.log(`Found ${attendanceSnap.size} 'present' attendance records.\n`);

        // 3. Map attendance to assignments
        const attendanceCountByAssignment: { [key: string]: number } = {};

        attendanceSnap.docs.forEach(doc => {
            const data = doc.data();
            const assignmentId = data.assignment_id;
            if (assignmentId) {
                attendanceCountByAssignment[assignmentId] = (attendanceCountByAssignment[assignmentId] || 0) + 1;
            }
        });

        // 4. Calculate and Update Marks
        let updatedCount = 0;
        let skippedCount = 0;
        const batches: FirebaseFirestore.WriteBatch[] = [];
        let currentBatch = db.batch();
        let batchOperationCount = 0;

        console.log('=== UPDATING MARKS ===');
        console.log('Scheme: 16d=10, 15d=9.5, ..., 7d=5, <7d=0\n');

        for (const assignment of assignments) {
            const presentDays = attendanceCountByAssignment[assignment.id] || 0;

            // Calculate marks
            let marks = 0;
            if (presentDays >= 16) marks = 10;
            else if (presentDays < 7) marks = 0;
            else {
                marks = MARKING_SCHEME[presentDays] || 0;
            }

            // Prepare update
            const currentMarksData = assignment.marks_data || {};

            // Check if update is needed
            if (currentMarksData[SUBJECT_NAME] === marks) {
                skippedCount++;
                continue;
            }

            const newMarksData = {
                ...currentMarksData,
                [SUBJECT_NAME]: marks
            };

            const assignmentRef = db.collection('training_assignments').doc(assignment.id);
            currentBatch.update(assignmentRef, {
                marks_data: newMarksData,
                updated_at: new Date().toISOString()
            });

            console.log(`[${assignment.id}] Days: ${presentDays} -> Marks: ${marks}`);
            updatedCount++;
            batchOperationCount++;

            // Batch limit is 500
            if (batchOperationCount >= 450) {
                batches.push(currentBatch);
                currentBatch = db.batch();
                batchOperationCount = 0;
            }
        }

        if (batchOperationCount > 0) {
            batches.push(currentBatch);
        }

        if (updatedCount > 0) {
            console.log(`\nCommitting ${batches.length} batches...`);
            for (const batch of batches) {
                await batch.commit();
            }
            console.log('✓ Changes saved to Firestore');
        }

        console.log('\n=== SUMMARY ===');
        console.log(`Total Assignments: ${assignments.length}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Skipped (Already Correct): ${skippedCount}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

updateAttendanceMarks();
