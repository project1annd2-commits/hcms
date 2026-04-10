
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PHONE = '8638759556';

async function checkFirestore() {
    // Initialize Firebase Admin
    // Assuming we run from project root: node server/scripts/...
    const serviceAccountPath = path.join(process.cwd(), 'hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');

    if (!fs.existsSync(serviceAccountPath)) {
        console.error('Firebase service account not found at:', serviceAccountPath);
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();
    console.log('✓ Connected to Firestore');
    console.log(`\n=== CHECKING PHONE: ${PHONE} ===`);

    try {
        // 1. Check for Teacher
        console.log('\n--- Searching Teachers ---');
        // Retrieve all teachers to perform normalized check (since simple query might miss spaces)
        const teachersSnapshot = await db.collection('teachers').get();
        let foundTeacher: any = null;
        let teacherId: string | null = null;

        teachersSnapshot.forEach(doc => {
            const data = doc.data();
            const normalizedPhone = (data.phone || '').replace(/\s+/g, '');
            if (normalizedPhone === PHONE) {
                foundTeacher = data;
                teacherId = doc.id;
            }
        });

        if (foundTeacher) {
            console.log('✓ Found TEACHER record:');
            console.log(`  ID: ${teacherId}`);
            console.log(`  Name: ${foundTeacher.first_name} ${foundTeacher.last_name}`);
            console.log(`  Phone: ${foundTeacher.phone}`);
            console.log(`  Status: ${foundTeacher.status}`);

            // 2. Check for Mentor Training Assignments
            console.log('\n--- Searching Mentor Training Assignments ---');
            // Check assignment where mentor_id matches the teacher ID
            const assignmentsSnapshot = await db.collection('mentor_training_assignments')
                .where('mentor_id', '==', teacherId)
                .get();

            if (assignmentsSnapshot.empty) {
                console.log('❌ NO Mentor Training Assignments found for this teacher ID.');
                console.log(`   Expected an assignment in 'mentor_training_assignments' with mentor_id: ${teacherId}`);
            } else {
                console.log(`✓ Found ${assignmentsSnapshot.size} assignment(s):`);
                assignmentsSnapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`  - Assignment ID: ${doc.id}`);
                    console.log(`    Program ID: ${data.training_program_id}`);
                    console.log(`    Status: ${data.status}`);
                });
            }

        } else {
            console.log('❌ Teacher NOT FOUND in Firestore with this phone number.');
        }

        // 3. Check for Mentor (just in case they were added as a mentor directly)
        console.log('\n--- Searching Mentors ---');
        const mentorsSnapshot = await db.collection('mentors').get();
        let foundMentor = false;
        mentorsSnapshot.forEach(doc => {
            const data = doc.data();
            const normalizedPhone = (data.phone || '').replace(/\s+/g, '');
            if (normalizedPhone === PHONE) {
                console.log('✓ Found MENTOR record:');
                console.log(`  ID: ${doc.id}`);
                console.log(`  Name: ${data.first_name} ${data.last_name}`);
                console.log(`  Status: ${data.status}`);
                foundMentor = true;
            }
        });

        if (!foundMentor) {
            console.log('ℹ️ No MENTOR record found.');
        }

    } catch (error) {
        console.error('Error querying Firestore:', error);
    }
}

checkFirestore();
