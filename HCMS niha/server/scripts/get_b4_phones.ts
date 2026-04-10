import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function getB4Phones() {
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
        console.log('Connected to Firestore\n');

        // 1. Find the B4 Training Program
        const programsSnap = await db.collection('training_programs').get();
        const programs = programsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const b4Program = programs.find((p: any) =>
            p.title && (p.title.toLowerCase().includes("b4") || p.title.toLowerCase().includes("mentors' training"))
        );

        if (!b4Program) {
            console.log('ERROR: B4 Training Program not found!');
            return;
        }

        console.log(`Found B4 Program: "${(b4Program as any).title}" (ID: ${b4Program.id})\n`);

        // 2. Get all mentor training assignments for this program
        const mentorAssignSnap = await db.collection('mentor_training_assignments')
            .where('training_program_id', '==', b4Program.id)
            .get();

        console.log(`Found ${mentorAssignSnap.size} mentor training assignments\n`);

        if (mentorAssignSnap.empty) {
            console.log('No assignments found!');
            return;
        }

        // 3. Get all mentor IDs
        const mentorIds = mentorAssignSnap.docs.map(doc => doc.data().mentor_id);
        console.log(`Unique mentor IDs: ${[...new Set(mentorIds)].length}\n`);

        // 4. Get phone numbers - check both mentors and teachers collections
        const mentorsSnap = await db.collection('mentors').get();
        const teachersSnap = await db.collection('teachers').get();

        const mentors = mentorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const teachers = teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const phoneNumbers: { id: string; name: string; phone: string; source: string }[] = [];

        for (const mId of mentorIds) {
            // Check mentors collection first
            const mentor = mentors.find((m: any) => m.id === mId);
            if (mentor) {
                const m = mentor as any;
                if (m.phone) {
                    phoneNumbers.push({
                        id: m.id,
                        name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
                        phone: m.phone,
                        source: 'mentors'
                    });
                }
                continue;
            }

            // Check teachers collection
            const teacher = teachers.find((t: any) => t.id === mId);
            if (teacher) {
                const t = teacher as any;
                if (t.phone) {
                    phoneNumbers.push({
                        id: t.id,
                        name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
                        phone: t.phone,
                        source: 'teachers'
                    });
                }
            }
        }

        // Remove duplicates
        const uniquePhones = phoneNumbers.filter((p, i, arr) =>
            arr.findIndex(x => x.phone === p.phone) === i
        );

        console.log('='.repeat(60));
        console.log('MENTOR B4 PHONE NUMBERS FOR LOGIN TESTING');
        console.log('='.repeat(60));
        console.log(`Total: ${uniquePhones.length}\n`);

        uniquePhones.forEach((p, idx) => {
            console.log(`${idx + 1}. ${p.phone} - ${p.name} (${p.source})`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('PHONE NUMBERS ONLY (for testing):');
        console.log('='.repeat(60));
        uniquePhones.slice(0, 30).forEach((p, idx) => {
            console.log(`${idx + 1}. ${p.phone}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

getB4Phones();
