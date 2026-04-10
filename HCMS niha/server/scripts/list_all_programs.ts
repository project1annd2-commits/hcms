
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function listPrograms() {
    try {
        console.log('Initializing...');
        const serviceAccountPath = path.resolve(process.cwd(), 'hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
        if (!fs.existsSync(serviceAccountPath)) {
            console.error('Service account file not found at:', serviceAccountPath);
            return;
        }
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        const db = admin.firestore();

        console.log('--- Training Programs ---');
        const programsSnap = await db.collection('training_programs').get();
        const programs = programsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        for (const p of programs) {
            const tAssigns = await db.collection('training_assignments').where('training_program_id', '==', p.id).get();
            const mAssigns = await db.collection('mentor_training_assignments').where('training_program_id', '==', p.id).get();
            console.log(`- [${p.id}] ${p.title} (Target: ${p.target_audience})`);
            console.log(`  Teachers assigned: ${tAssigns.size}`);
            console.log(`  Mentors assigned: ${mAssigns.size}`);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}
listPrograms();
