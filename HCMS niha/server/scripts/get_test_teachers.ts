import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getTestTeachers() {
    console.log('🎲 Fetching 10 Random Teachers with Assignments...\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // 1. Get all assignments
        const assignmentsSnapshot = await db.collection('training_assignments').get();
        const assignments = assignmentsSnapshot.docs.map(doc => doc.data());

        if (assignments.length === 0) {
            console.log('No assignments found.');
            process.exit(0);
        }

        // 2. Get unique teacher IDs from assignments
        const teacherIds = [...new Set(assignments.map(a => a.teacher_id))];

        // 3. Shuffle and pick 10
        const shuffled = teacherIds.sort(() => 0.5 - Math.random());
        const selectedIds = shuffled.slice(0, 10);

        console.log(`Found ${teacherIds.length} assigned teachers. Selecting 10 random ones:\n`);
        console.log('----------------------------------------------------------------');
        console.log('| Name                 | Phone Number   | School               |');
        console.log('----------------------------------------------------------------');

        for (const teacherId of selectedIds) {
            const teacherDoc = await db.collection('teachers').doc(teacherId).get();
            if (!teacherDoc.exists) continue;

            const teacher = teacherDoc.data();
            const phone = teacher?.phone || teacher?.mobile || 'No Phone';

            let schoolName = 'Unknown';
            if (teacher?.school_id) {
                const schoolDoc = await db.collection('schools').doc(teacher.school_id).get();
                if (schoolDoc.exists) {
                    schoolName = schoolDoc.data()?.name || 'Unknown';
                }
            }

            console.log(`| ${pad(teacher?.first_name + ' ' + teacher?.last_name, 20)} | ${pad(phone, 14)} | ${pad(schoolName, 20)} |`);
        }
        console.log('----------------------------------------------------------------');

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

function pad(str: string, len: number) {
    return (str || '').substring(0, len).padEnd(len);
}

getTestTeachers().catch(console.error);
