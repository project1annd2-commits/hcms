import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findTeachersWithoutAssignments() {
    console.log('🔍 Identifying Teachers Without Training Assignments...\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // 1. Get all teachers
        const teachersSnapshot = await db.collection('teachers').get();
        const teachers = teachersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`Total Teachers: ${teachers.length}`);

        // 2. Get all training assignments
        const assignmentsSnapshot = await db.collection('training_assignments').get();
        const assignedTeacherIds = new Set(assignmentsSnapshot.docs.map(doc => doc.data().teacher_id));
        console.log(`Total Assignments: ${assignmentsSnapshot.size}`);

        // 3. Find missing
        const teachersWithoutAssignments = teachers.filter((t: any) => !assignedTeacherIds.has(t.id));

        console.log(`\n❌ Teachers without assignments: ${teachersWithoutAssignments.length}`);

        if (teachersWithoutAssignments.length > 0) {
            console.log('\nList of teachers needing assignments:');
            teachersWithoutAssignments.slice(0, 30).forEach((t: any, idx) => {
                console.log(`${idx + 1}. ${t.full_name || t.name || 'Unknown Name'} (${t.teacher_id || t.id})`);
            });

            if (teachersWithoutAssignments.length > 30) {
                console.log(`...and ${teachersWithoutAssignments.length - 30} more`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

findTeachersWithoutAssignments().catch(console.error);
