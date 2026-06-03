
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function investigate() {
    try {
        console.log('Initializing...');
        const serviceAccountPath = path.resolve(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
        if (!fs.existsSync(serviceAccountPath)) return;
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        const db = admin.firestore();

        const mentorsToCheck = [
            'Mubasheera', 'Tabassum', 'Sheema', 'Hajira', 'Meher', 'Muskan', 'Umme'
        ];

        console.log('--- Searching for Specific Mentors ---');

        // We will fetch all mentors once (hope it doesn't hit quota immediately, usually read ops are what counts)
        // If it fails, we know quota is fully dead.
        // Better: Query by name? No, Firestore doesn't support partial match easily and we have 7 names.
        // Let's try to fetch all mentors again, but if it fails, we'll try a different approach (e.g. check assignments directly if possible? No).

        // Safe approach: We suspect they might be TEACHERS or MENTORS.

        const foundMentors: any[] = [];

        try {
            const mentorsSnap = await db.collection('mentors').get();
            console.log(`Fetched ${mentorsSnap.size} mentors.`);
            mentorsSnap.docs.forEach(doc => {
                const data = doc.data();
                const fullName = `${data.first_name || ''} ${data.last_name || ''}`.toLowerCase();
                for (const name of mentorsToCheck) {
                    if (fullName.includes(name.toLowerCase())) {
                        console.log(`FOUND in Mentors: ${doc.id} | ${data.first_name} ${data.last_name}`);
                        foundMentors.push({ id: doc.id, collection: 'mentors', name: fullName });
                    }
                }
            });
        } catch (e) {
            console.log("Error fetching mentors (likely Quota):", e.message);
        }

        const foundTeachers: any[] = [];
        try {
            // Try fetching teachers similarly
            const teachersSnap = await db.collection('teachers').get();
            console.log(`Fetched ${teachersSnap.size} teachers.`);
            teachersSnap.docs.forEach(doc => {
                const data = doc.data();
                const fullName = `${data.first_name || ''} ${data.last_name || ''}`.toLowerCase();
                for (const name of mentorsToCheck) {
                    if (fullName.includes(name.toLowerCase())) {
                        console.log(`FOUND in Teachers: ${doc.id} | ${data.first_name} ${data.last_name}`);
                        foundTeachers.push({ id: doc.id, collection: 'teachers', name: fullName });
                    }
                }
            });
        } catch (e) {
            console.log("Error fetching teachers (likely Quota):", e.message);
        }

        const allFound = [...foundMentors, ...foundTeachers];

        if (allFound.length > 0) {
            console.log('\n--- Checking Assignments for Found Users ---');
            // Check assignments for these IDs
            // We need to check both collections
            const assignCols = ['training_assignments', 'mentor_training_assignments'];

            for (const person of allFound) {
                console.log(`Checking for ${person.name} (${person.id})...`);
                for (const col of assignCols) {
                    // Check as teacher_id
                    let q1 = await db.collection(col).where('teacher_id', '==', person.id).get();
                    if (!q1.empty) {
                        q1.docs.forEach(d => console.log(` - Found in ${col} (as teacher_id): ${d.id} | Status: ${d.data().status} | Program: ${d.data().training_program_id}`));
                    }

                    // Check as mentor_id
                    let q2 = await db.collection(col).where('mentor_id', '==', person.id).get();
                    if (!q2.empty) {
                        q2.docs.forEach(d => console.log(` - Found in ${col} (as mentor_id): ${d.id} | Status: ${d.data().status} | Program: ${d.data().training_program_id}`));
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}
investigate();
