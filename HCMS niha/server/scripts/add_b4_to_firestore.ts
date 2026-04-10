import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addB4ToFirestore() {
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

    const db = getFirestore();
    console.log('✓ Connected to Firestore\n');

    try {
        const now = new Date().toISOString();

        // 1. Check if B4 program already exists
        console.log('=== CHECKING TRAINING PROGRAMS ===');
        const programsSnapshot = await db.collection('training_programs').get();
        console.log(`Found ${programsSnapshot.size} training programs:`);

        let b4ProgramId: string | null = null;
        let b4Exists = false;

        programsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.title} (${data.status})`);
            if (data.title?.includes('B4') || data.title?.includes("Mentors' Training")) {
                b4Exists = true;
                b4ProgramId = doc.id;
            }
        });

        // 2. Create B4 program if it doesn't exist
        if (!b4Exists) {
            b4ProgramId = uuidv4();
            const b4Program = {
                id: b4ProgramId,
                title: "Online Mentors' Training-B4",
                description: "Online training program for mentors - Batch 4",
                start_date: "2025-12-09",
                end_date: "2025-12-12",
                status: "active",
                category: "mentor_training",
                duration_hours: 3,
                max_participants: 50,
                is_mandatory: true,
                created_at: now,
                updated_at: now,
                enable_marks_card: true,
                assessment_components: [
                    { name: "Attendance", max_marks: 20, weightage: 20 },
                    { name: "Participation", max_marks: 30, weightage: 30 },
                    { name: "Assessment", max_marks: 50, weightage: 50 }
                ]
            };

            await db.collection('training_programs').doc(b4ProgramId).set(b4Program);
            console.log('\n✓ Created B4 Mentors Training Program in Firestore');
            console.log(`  ID: ${b4ProgramId}`);
        } else {
            console.log(`\n✓ B4 Program already exists with ID: ${b4ProgramId}`);
        }

        // 3. Check/Create Teacher record for Maaz l
        console.log('\n=== CHECKING MAAZ L (9916777753) ===');
        const PHONE = '9916777753';

        // Find teacher by phone
        const teachersSnapshot = await db.collection('teachers').where('phone', '==', PHONE).get();
        let teacherId: string | null = null;
        let teacherData: any = null;

        if (teachersSnapshot.empty) {
            // Check with normalized search
            const allTeachers = await db.collection('teachers').get();
            allTeachers.forEach(doc => {
                const data = doc.data();
                const normalizedPhone = (data.phone || '').replace(/\s+/g, '');
                if (normalizedPhone === PHONE || normalizedPhone.includes(PHONE)) {
                    teacherId = doc.id;
                    teacherData = data;
                }
            });
        } else {
            const doc = teachersSnapshot.docs[0];
            teacherId = doc.id;
            teacherData = doc.data();
        }

        if (teacherId) {
            console.log(`✓ Found teacher: ${teacherData.first_name} ${teacherData.last_name}`);
            console.log(`  ID: ${teacherId}`);
            console.log(`  Phone: ${teacherData.phone}`);
            console.log(`  School ID: ${teacherData.school_id}`);
        } else {
            // Create teacher record
            teacherId = uuidv4();
            teacherData = {
                id: teacherId,
                first_name: 'maaz',
                last_name: 'l',
                email: '',
                phone: PHONE,
                school_id: null,  // Will need to assign to a school
                status: 'active',
                created_at: now,
                updated_at: now
            };
            await db.collection('teachers').doc(teacherId).set(teacherData);
            console.log('✓ Created teacher record for Maaz l');
        }

        // 4. Check/Create Mentor Training Assignment
        console.log('\n=== CHECKING MENTOR TRAINING ASSIGNMENT ===');

        if (b4ProgramId && teacherId) {
            const assignmentsSnapshot = await db.collection('mentor_training_assignments')
                .where('mentor_id', '==', teacherId)
                .where('training_program_id', '==', b4ProgramId)
                .get();

            if (assignmentsSnapshot.empty) {
                const assignmentId = uuidv4();
                const assignment = {
                    id: assignmentId,
                    mentor_id: teacherId,  // Using teacher ID as mentor ID for training
                    training_program_id: b4ProgramId,
                    assigned_date: now.split('T')[0],
                    due_date: null,
                    completion_date: null,
                    status: 'assigned',
                    progress_percentage: 0,
                    score: null,
                    assigned_by: 'system',
                    created_at: now,
                    updated_at: now
                };

                await db.collection('mentor_training_assignments').doc(assignmentId).set(assignment);
                console.log('✓ Created mentor training assignment');
                console.log(`  Assignment ID: ${assignmentId}`);
            } else {
                console.log('✓ Assignment already exists');
                assignmentsSnapshot.forEach(doc => {
                    console.log(`  Assignment ID: ${doc.id}`);
                    console.log(`  Status: ${doc.data().status}`);
                });
            }
        }

        // 5. Verification
        console.log('\n=== FINAL VERIFICATION ===');
        const finalPrograms = await db.collection('training_programs').get();
        console.log(`Training Programs: ${finalPrograms.size}`);
        finalPrograms.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.title} (${data.status})`);
        });

        const finalAssignments = await db.collection('mentor_training_assignments').get();
        console.log(`\nMentor Training Assignments: ${finalAssignments.size}`);

        console.log('\n✓ DONE! All data is stored in Firestore.');
        console.log('Maaz l (9916777753) can now login as a Mentor for B4 training.');

    } catch (error: any) {
        if (error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
            console.error('\n❌ Firestore Quota Exceeded!');
            console.error('Please wait for the quota to reset (usually at midnight Pacific Time).');
            console.error('Or check your Firebase console for quota details.');
        } else {
            console.error('Error:', error);
        }
    }

    process.exit(0);
}

addB4ToFirestore();
