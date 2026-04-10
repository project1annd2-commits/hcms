
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function check() {
    try {
        const serviceAccountPath = path.resolve(process.cwd(), 'hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
        if (!fs.existsSync(serviceAccountPath)) return;
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        const db = admin.firestore();

        const names = ['rahila', 'safa'];

        for (const name of names) {
            console.log(`\n--- Checking ${name} ---`);

            // 1. Check Teachers collection
            const teachersSnap = await db.collection('teachers').get();
            const teacherDoc = teachersSnap.docs.find(d => (d.data().first_name || '').toLowerCase().includes(name));
            if (teacherDoc) {
                console.log(`Found in TEACHERS: ${teacherDoc.id}`);

                // Check assignments for this teacher
                const assigns = await db.collection('training_assignments').where('teacher_id', '==', teacherDoc.id).get();
                console.log(`Assignments in training_assignments: ${assigns.size}`);
                assigns.forEach(a => {
                    console.log(`- Program: ${a.data().training_program_id}, Status: ${a.data().status}`);
                });
            }

            // 2. Check Mentors collection
            const mentorsSnap = await db.collection('mentors').get();
            const mentorDoc = mentorsSnap.docs.find(d => (d.data().first_name || '').toLowerCase().includes(name));
            if (mentorDoc) {
                console.log(`Found in MENTORS: ${mentorDoc.id}`);

                // Check assignments for this mentor
                const assigns = await db.collection('mentor_training_assignments').where('mentor_id', '==', mentorDoc.id).get();
                console.log(`Assignments in mentor_training_assignments: ${assigns.size}`);
                assigns.forEach(a => {
                    console.log(`- Program: ${a.data().training_program_id}, Status: ${a.data().status}`);
                });
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}
check();
