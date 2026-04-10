import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getTestTeachers() {
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        const assignmentsSnapshot = await db.collection('training_assignments').get();
        const assignments = assignmentsSnapshot.docs.map(doc => doc.data());

        const teacherIds = [...new Set(assignments.map(a => a.teacher_id))];
        const shuffled = teacherIds.sort(() => 0.5 - Math.random());
        const selectedIds = shuffled.slice(0, 3); // Pick 3 for testing

        const teachers = [];

        for (const teacherId of selectedIds) {
            const teacherDoc = await db.collection('teachers').doc(teacherId).get();
            if (!teacherDoc.exists) continue;

            const teacher = teacherDoc.data();
            const phone = teacher?.phone || teacher?.mobile;

            if (phone) {
                teachers.push({
                    name: teacher.first_name + ' ' + teacher.last_name,
                    phone: phone,
                    school_id: teacher.school_id
                });
            }
        }

        fs.writeFileSync('test_creds.json', JSON.stringify(teachers, null, 2));
        console.log('Written to test_creds.json');

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

getTestTeachers().catch(console.error);
