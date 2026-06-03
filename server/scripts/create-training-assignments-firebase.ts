import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTrainingAssignmentsFromAttendance() {
    console.log('🚀 Creating Training Assignments from Attendance Records...\n');

    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();
    console.log('✅ Firebase Admin initialized\n');

    try {
        // 1. Get all training attendance records
        console.log('📊 Fetching training attendance records...');
        const attendanceSnapshot = await db.collection('training_attendance').get();
        console.log(`   Found ${attendanceSnapshot.size} attendance records\n`);

        if (attendanceSnapshot.size === 0) {
            console.log('❌ No attendance records found. Cannot create assignments.');
            process.exit(1);
        }

        // 2. Extract unique assignments from attendance
        const assignmentMap = new Map();

        attendanceSnapshot.docs.forEach(doc => {
            const record = doc.data();
            if (record.assignment_id && record.teacher_id) {
                if (!assignmentMap.has(record.assignment_id)) {
                    assignmentMap.set(record.assignment_id, {
                        id: record.assignment_id,
                        teacher_id: record.teacher_id,
                        training_program_id: record.training_program_id,
                        created_at: record.created_at,
                        updated_at: record.updated_at
                    });
                }
            }
        });

        console.log(`📦 Found ${assignmentMap.size} unique assignments from attendance\n`);

        // 3. Get the active training program
        const programsSnapshot = await db.collection('training_programs').where('status', '==', 'active').get();

        if (programsSnapshot.empty) {
            console.log('⚠️  No active training programs found, checking all programs...');
            const allProgramsSnapshot = await db.collection('training_programs').get();

            if (allProgramsSnapshot.empty) {
                console.log('❌ No training programs found at all.');
                process.exit(1);
            }

            const activeProgram = allProgramsSnapshot.docs[0].data();
            console.log(`   Using program: ${activeProgram.title}\n`);

            // 4. Create training assignments
            await createAssignments(db, assignmentMap, activeProgram.id);
        } else {
            const activeProgram = programsSnapshot.docs[0].data();
            console.log(`   Active program: ${activeProgram.title}\n`);

            // 4. Create training assignments
            await createAssignments(db, assignmentMap, activeProgram.id);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }

    process.exit(0);
}

async function createAssignments(db: any, assignmentMap: Map<string, any>, programId: string) {
    // Clear existing assignments
    console.log('🗑️  Clearing existing training assignments...');
    const existingSnapshot = await db.collection('training_assignments').get();

    if (!existingSnapshot.empty) {
        let batch = db.batch();
        let batchCount = 0;
        let deleted = 0;

        existingSnapshot.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
            batchCount++;
            deleted++;

            if (batchCount >= 400) {
                batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        });

        if (batchCount > 0) {
            await batch.commit();
        }
        console.log(`   Deleted ${deleted} existing assignments\n`);
    } else {
        console.log(`   No existing assignments to clear\n`);
    }

    // Create new assignments
    console.log('📝 Creating training assignments...');
    const assignments = Array.from(assignmentMap.values());

    let batch = db.batch();
    let batchCount = 0;
    let created = 0;

    for (const assignment of assignments) {
        const assignmentData = {
            id: assignment.id,
            training_program_id: programId,
            teacher_id: assignment.teacher_id,
            assigned_date: assignment.created_at
                ? new Date(assignment.created_at).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            due_date: null,
            completion_date: null,
            status: 'assigned',
            progress_percentage: 0,
            score: null,
            assigned_by: null,
            created_at: assignment.created_at || new Date().toISOString(),
            updated_at: assignment.updated_at || new Date().toISOString()
        };

        const ref = db.collection('training_assignments').doc(assignment.id);
        batch.set(ref, assignmentData);
        batchCount++;
        created++;

        if (batchCount >= 400) {
            await batch.commit();
            console.log(`   Progress: ${created}/${assignments.length} assignments...`);
            batch = db.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log(`✅ Created ${created} training assignments\n`);

    // Verify
    const verifySnapshot = await db.collection('training_assignments').get();
    console.log('='.repeat(60));
    console.log('🎉 TRAINING ASSIGNMENTS CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📊 Total training assignments in Firebase: ${verifySnapshot.size}`);

    // Show sample
    console.log('\n📋 Sample assignments:');
    verifySnapshot.docs.slice(0, 3).forEach((doc: any, idx: number) => {
        const data = doc.data();
        console.log(`\n${idx + 1}. Assignment ID: ${data.id}`);
        console.log(`   Teacher ID: ${data.teacher_id}`);
        console.log(`   Program ID: ${data.training_program_id}`);
        console.log(`   Assigned Date: ${data.assigned_date}`);
        console.log(`   Status: ${data.status}`);
    });

    console.log('\n✅ Training assignments are now available in the application\n');
}

createTrainingAssignmentsFromAttendance().catch(console.error);
