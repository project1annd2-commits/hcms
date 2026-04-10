import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = resolve(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function debugRefresherMentors() {
    console.log('=== Debugging Refresher Training Mentor Assignments ===\n');

    // 1. Find the Refresher Training program
    const programsSnapshot = await db.collection('training_programs').get();
    const refresherProgram = programsSnapshot.docs.find(doc =>
        (doc.data().title || '').toLowerCase().includes('refresher')
    );

    if (!refresherProgram) {
        console.log('No Refresher Training program found!');
        return;
    }

    console.log('Found Refresher Program:');
    console.log(`  ID: ${refresherProgram.id}`);
    console.log(`  Title: ${refresherProgram.data().title}\n`);

    // 2. Check mentor_training_assignments for this program
    const mentorAssignmentsSnapshot = await db.collection('mentor_training_assignments')
        .where('training_program_id', '==', refresherProgram.id)
        .get();

    console.log(`Mentor Assignments for this program: ${mentorAssignmentsSnapshot.size}`);

    if (mentorAssignmentsSnapshot.size > 0) {
        // Get user data for assigned_by lookup
        const usersSnapshot = await db.collection('users').get();
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().full_name]));

        // Get mentor data
        const mentorsSnapshot = await db.collection('mentors').get();
        const mentorsMap = new Map(mentorsSnapshot.docs.map(doc => [doc.id, `${doc.data().first_name} ${doc.data().last_name}`]));

        console.log('\nMentor Assignment Details:');
        mentorAssignmentsSnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`\n  ${index + 1}. Assignment ID: ${doc.id}`);
            console.log(`     Mentor ID: ${data.mentor_id}`);
            console.log(`     Mentor Name: ${mentorsMap.get(data.mentor_id) || 'Unknown'}`);
            console.log(`     Assigned By ID: ${data.assigned_by}`);
            console.log(`     Assigned By Name: ${usersMap.get(data.assigned_by) || 'Unknown'}`);
            console.log(`     Status: ${data.status}`);
            console.log(`     Assigned Date: ${data.assigned_date}`);
        });
    }

    // 3. Check teacher_training_assignments for this program
    const teacherAssignmentsSnapshot = await db.collection('training_assignments')
        .where('training_program_id', '==', refresherProgram.id)
        .get();

    console.log(`\nTeacher Assignments for this program: ${teacherAssignmentsSnapshot.size}`);
}

debugRefresherMentors().catch(console.error);
