
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

        // 1. Find Program
        const programsSnap = await db.collection('training_programs').get();
        const program = programsSnap.docs.find(d => (d.data().title || '').toLowerCase().includes("online mentors' training-b4"));

        let programId = null;
        if (program) {
            console.log(`Found Program: ${program.id} (${program.data().title})`);
            programId = program.id;
        } else {
            console.log("Program 'Online Mentors' Training-B4' NOT found. Will check all assignments.");
        }

        // 2. Find Users (Rahila/Safa)
        console.log('\n--- Finding Users ---');
        // Search by iterating (safest for small user base vs exact match)
        const usersSnap = await db.collection('users').get();
        const searchNames = ['rahila', 'safa', 'safawarsi277']; // Add specific username found in debug
        const targetUsers: any[] = [];

        usersSnap.docs.forEach(doc => {
            const d = doc.data();
            const fullName = (d.full_name || '').toLowerCase();
            const username = (d.username || '').toLowerCase();

            for (const name of searchNames) {
                if (fullName.includes(name) || username.includes(name)) {
                    console.log(`Found User: ${doc.id} | Name: ${d.full_name} | Username: ${d.username} | Role: ${d.role}`);
                    targetUsers.push({ id: doc.id, name: d.full_name || d.username });
                    break;
                }
            }
        });

        // 3. Check Assignments by Creator
        if (targetUsers.length > 0) {
            console.log('\n--- Checking Assignments Created By Users ---');

            for (const user of targetUsers) {
                console.log(`\nChecking assignments by ${user.name} (${user.id})...`);

                // Check both collections
                const cols = ['training_assignments', 'mentor_training_assignments'];

                for (const col of cols) {
                    let query = db.collection(col).where('assigned_by', '==', user.id);
                    if (programId) {
                        query = query.where('training_program_id', '==', programId);
                    }

                    const snap = await query.get();
                    if (!snap.empty) {
                        console.log(`Found ${snap.size} assignments in '${col}':`);
                        snap.docs.forEach(d => {
                            const data = d.data();
                            console.log(` - Assignment ID: ${d.id}`);
                            console.log(`   - Mentor ID: ${data.mentor_id}`);
                            console.log(`   - Teacher ID: ${data.teacher_id}`);
                            console.log(`   - Status: ${data.status}`);
                            console.log(`   - Program ID: ${data.training_program_id}`);
                        });
                    } else {
                        console.log(`No assignments found in '${col}' for this program.`);
                    }
                }
            }
        } else {
            console.log('No matching users found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}
investigate();
