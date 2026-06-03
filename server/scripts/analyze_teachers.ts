import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeTeachers() {
    console.log('🔍 Analyzing Teachers and Assignments...\n');

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

        // 2. Get existing assignments
        const assignmentsSnapshot = await db.collection('training_assignments').get();
        const assignedTeacherIds = new Set(assignmentsSnapshot.docs.map(doc => doc.data().teacher_id));
        console.log(`Existing Assignments: ${assignmentsSnapshot.size}`);

        // 3. Find unassigned teachers
        const unassignedTeachers = teachers.filter((t: any) => !assignedTeacherIds.has(t.id));
        console.log(`Unassigned Teachers: ${unassignedTeachers.length}`);

        // 4. Analyze unassigned teachers
        console.log('\nSample Unassigned Teachers:');
        unassignedTeachers.slice(0, 10).forEach((t: any) => {
            console.log(`- ${t.full_name || t.name} (${t.school_id || 'No School'})`);
        });

        // Check if there's a pattern (e.g., active status)
        const activeUnassigned = unassignedTeachers.filter((t: any) => t.is_active !== false);
        console.log(`\nActive Unassigned Teachers: ${activeUnassigned.length}`);

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

analyzeTeachers().catch(console.error);
