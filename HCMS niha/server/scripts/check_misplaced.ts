
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

        console.log('--- Checking for Misplaced Assignments ---');
        // Check training_assignments for any documents with mentor_id
        // We can't do where('mentor_id', '!=', null) easily without index
        // But we can check a sample of recent assignments

        const snap = await db.collection('training_assignments')
            .orderBy('created_at', 'desc') // Check most recent first
            .limit(50)
            .get();

        console.log(`Checked ${snap.size} recent assignments in 'training_assignments'.`);

        let misplacedCount = 0;
        snap.docs.forEach(doc => {
            const data = doc.data();
            if (data.mentor_id) {
                console.log(`FOUND Misplaced Assignment: ${doc.id}`);
                console.log(` - Mentor ID: ${data.mentor_id}`);
                console.log(` - Program ID: ${data.training_program_id}`);
                console.log(` - Assigned By: ${data.assigned_by}`);
                misplacedCount++;
            }
        });

        if (misplacedCount === 0) {
            console.log("No assignments with 'mentor_id' found in the recent 50 'training_assignments'.");
        } else {
            console.log(`Total Misplaced found in sample: ${misplacedCount}`);
        }

        // Also check mentor_training_assignments count
        const mentorSnap = await db.collection('mentor_training_assignments').limit(10).get();
        console.log(`\n'mentor_training_assignments' collection has documents? ${!mentorSnap.empty} (Sample size: ${mentorSnap.size})`);

        // Also check for Safa's created assignments specifically if we know her ID
        const safaId = '021ab274-bf5c-47e5-ad40-8b2008619e0b';
        console.log(`\nChecking assignments by Safa (${safaId})...`);
        const safaAssigns = await db.collection('training_assignments').where('assigned_by', '==', safaId).get();
        console.log(`Found ${safaAssigns.size} in 'training_assignments' assigned by Safa.`);
        safaAssigns.docs.forEach(d => console.log(` - ID: ${d.id}, Mentor?: ${d.data().mentor_id}, Teacher?: ${d.data().teacher_id}`));

        const safaMentorAssigns = await db.collection('mentor_training_assignments').where('assigned_by', '==', safaId).get();
        console.log(`Found ${safaMentorAssigns.size} in 'mentor_training_assignments' assigned by Safa.`);
        safaMentorAssigns.docs.forEach(d => console.log(` - ID: ${d.id}, Mentor?: ${d.data().mentor_id}`));

    } catch (error) {
        console.error('Error:', error);
    }
}
investigate();
