import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeActiveTeachers() {
    console.log('🔍 Analyzing Active Teachers...\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        const teachersSnapshot = await db.collection('teachers').get();
        const teachers = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const activeTeachers = teachers.filter((t: any) => t.is_active !== false); // Assuming default is active
        console.log(`Total Teachers: ${teachers.length}`);
        console.log(`Active Teachers: ${activeTeachers.length}`);

        const assignmentsSnapshot = await db.collection('training_assignments').get();
        console.log(`Current Assignments: ${assignmentsSnapshot.size}`);

        const assignedTeacherIds = new Set(assignmentsSnapshot.docs.map(doc => doc.data().teacher_id));

        const activeUnassigned = activeTeachers.filter((t: any) => !assignedTeacherIds.has(t.id));
        console.log(`Active Unassigned Teachers: ${activeUnassigned.length}`);

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

analyzeActiveTeachers().catch(console.error);
