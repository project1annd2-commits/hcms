
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function investigate() {
    try {
        console.log('Initializing Firebase Admin...');
        const serviceAccountPath = path.resolve(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');

        if (!fs.existsSync(serviceAccountPath)) {
            console.error(`Service account file not found at: ${serviceAccountPath}`);
            return;
        }

        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        const db = admin.firestore();
        console.log('Connected to Firestore');

        // 1. Find Mentors
        console.log('\n--- Searching for Mentors ---');
        const searchNames = ['rahila', 'safa'];
        const mentorIds: Record<string, string> = {};

        // Fetch all mentors to filter in memory for case-insensitive match
        const mentorsSnap = await db.collection('mentors').get();
        console.log(`Total mentors in DB: ${mentorsSnap.size}`);

        const mentors = mentorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        for (const name of searchNames) {
            const matches = mentors.filter((m: any) =>
                (m.first_name && m.first_name.toLowerCase().includes(name.toLowerCase())) ||
                (m.last_name && m.last_name.toLowerCase().includes(name.toLowerCase())) ||
                (m.email && m.email.toLowerCase().includes(name.toLowerCase()))
            );

            console.log(`Found ${matches.length} matches for "${name}" in 'mentors':`);
            matches.forEach((m: any) => {
                console.log(` - ID: ${m.id}, Name: ${m.first_name} ${m.last_name}, Email: ${m.email}`);
                if (!mentorIds[name]) mentorIds[name] = m.id;
            });
        }

        // Also check USERS
        const usersSnap = await db.collection('users').get();
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        for (const name of searchNames) {
            const matches = users.filter((u: any) =>
                (u.full_name && u.full_name.toLowerCase().includes(name.toLowerCase())) ||
                (u.username && u.username.toLowerCase().includes(name.toLowerCase()))
            );
            if (matches.length > 0) {
                console.log(`Found ${matches.length} matches for "${name}" in 'users' (info only):`);
                matches.forEach((u: any) => console.log(` - ID: ${u.id}, Name: ${u.full_name}`));
                // If not found in mentors, maybe key works here? (Unlikely for mentor assignment but possible)
            }
        }

        // 2. Find Training Program
        console.log('\n--- Searching for Training Program ---');
        const programsSnap = await db.collection('training_programs').get();
        const programs = programsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const program = programs.find((p: any) => p.title && p.title.toLowerCase().includes("online mentors' training-b4".toLowerCase()));

        if (program) {
            console.log(`Found Program: "${program.title}"`);
            console.log(` - ID: ${program.id}`);

            // 3. Find Assignments
            console.log('\n--- Searching for Assignments ---');

            // Check 'training_assignments'
            const assignmentsRef = db.collection('training_assignments');
            // Allow querying by program ID
            const assignSnap = await assignmentsRef.where('training_program_id', '==', program.id).get();

            console.log(`Total assignments found for this program in 'training_assignments': ${assignSnap.size}`);
            const assignments = assignSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            for (const name of searchNames) {
                const mId = mentorIds[name];
                if (mId) {
                    const userAssignments = assignments.filter((a: any) =>
                        a.mentor_id === mId || a.teacher_id === mId || a.user_id === mId
                    );

                    if (userAssignments.length > 0) {
                        console.log(`FAIL: Found ${userAssignments.length} assignments for ${name} (${mId}) in training_assignments.`);
                        userAssignments.forEach((a: any) => console.log(JSON.stringify(a, null, 2)));
                    } else {
                        console.log(`WARN: No assignments found for ${name} (${mId}) in training_assignments.`);
                    }
                }
            }

            // Check for 'mentor_training_assignments'
            const mentorAssignRef = db.collection('mentor_training_assignments');
            const mentorAssignSnap = await mentorAssignRef.where('training_program_id', '==', program.id).get();
            console.log(`Total assignments found in 'mentor_training_assignments': ${mentorAssignSnap.size}`);

            if (!mentorAssignSnap.empty) {
                const mentorAssignments = mentorAssignSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                for (const name of searchNames) {
                    const mId = mentorIds[name];
                    if (mId) {
                        const userAssignments = mentorAssignments.filter((a: any) => a.mentor_id === mId);
                        if (userAssignments.length > 0) {
                            console.log(`INFO: Found ${userAssignments.length} assignments for ${name} (${mId}) in mentor_training_assignments.`);
                            userAssignments.forEach((a: any) => console.log(JSON.stringify(a, null, 2)));
                        }
                    }
                }
            }

        } else {
            console.log(`ERROR: Program "Online Mentors' Training-B4" not found.`);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

investigate();
