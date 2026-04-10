
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

        const searchNames = ['rahila', 'safa'];
        const foundIds: Record<string, { id: string, collection: string }> = {};

        // 1. Check Mentors (Already did, but fast enough)
        console.log('--- Mentors ---');
        const mentorsSnap = await db.collection('mentors').get(); // 58 docs
        mentorsSnap.docs.forEach(doc => {
            const d = doc.data();
            for (const name of searchNames) {
                if ((d.first_name || '').toLowerCase().includes(name) || (d.last_name || '').toLowerCase().includes(name)) {
                    console.log(`FOUND in Mentors: ${doc.id} (${d.first_name} ${d.last_name})`);
                    foundIds[name] = { id: doc.id, collection: 'mentors' };
                }
            }
        });

        // 2. Check Teachers
        console.log('--- Teachers ---');
        const teachersSnap = await db.collection('teachers').get();
        console.log(`Total Teachers: ${teachersSnap.size}`);
        teachersSnap.docs.forEach(doc => {
            const d = doc.data();
            for (const name of searchNames) {
                if ((d.first_name || '').toLowerCase().includes(name) || (d.last_name || '').toLowerCase().includes(name)) {
                    console.log(`FOUND in Teachers: ${doc.id} (${d.first_name} ${d.last_name})`);
                    if (!foundIds[name]) foundIds[name] = { id: doc.id, collection: 'teachers' };
                }
            }
        });

        // 3. Find Program
        console.log('--- Program ---');
        const programsSnap = await db.collection('training_programs').get();
        const program = programsSnap.docs.find(d => (d.data().title || '').toLowerCase().includes("online mentors' training-b4"));

        if (program) {
            console.log(`Found Program: ${program.id} (${program.data().title})`);

            // 4. Check Assignments
            // Only check if we have a program
            console.log('--- Assignments ---');
            const assignsSnap = await db.collection('training_assignments')
                .where('training_program_id', '==', program.id)
                .get();

            console.log(`Assignments count: ${assignsSnap.size}`);

            assignsSnap.docs.forEach(doc => {
                const d = doc.data();
                // Check if any found ID is in this assignment
                for (const name of searchNames) {
                    const f = foundIds[name];
                    if (f) {
                        if (d.mentor_id === f.id || d.teacher_id === f.id || d.user_id === f.id) {
                            console.log(`FOUND Assignment for ${name}: ${doc.id} (Status: ${d.status})`);
                        }
                    }
                }
            });

        } else {
            console.log("Program not found");
        }

    } catch (error) {
        console.error('Error:', error);
    }
}
investigate();
