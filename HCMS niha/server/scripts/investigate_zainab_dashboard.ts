import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function investigateZainabDashboard() {
    console.log('=== INVESTIGATING ZAINAB DASHBOARD DISCREPANCY ===\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();

    // Find zainab's user ID
    const usersSnapshot = await db.collection('users')
        .where('username', '==', 'zainab740')
        .get();

    if (usersSnapshot.empty) {
        console.log('❌ zainab740 user not found');
        return;
    }

    const zainabUser = usersSnapshot.docs[0];
    const zainabId = zainabUser.id;
    console.log(`Found zainab740: ${zainabId}\n`);

    // Get school assignments for zainab
    const assignmentsSnapshot = await db.collection('school_assignments')
        .where('employee_id', '==', zainabId)
        .get();

    console.log(`School Assignments: ${assignmentsSnapshot.size}`);
    const assignedSchoolIds = assignmentsSnapshot.docs.map(doc => doc.data().school_id);
    console.log(`Assigned School IDs: ${assignedSchoolIds.length}\n`);

    // Get all teachers
    const allTeachersSnapshot = await db.collection('teachers').get();
    console.log(`Total Teachers in Database: ${allTeachersSnapshot.size}`);

    // Filter teachers by assigned schools
    const teachersInAssignedSchools = allTeachersSnapshot.docs.filter(doc => {
        const teacher = doc.data();
        return teacher.school_id && assignedSchoolIds.includes(teacher.school_id);
    });

    console.log(`Teachers in Assigned Schools: ${teachersInAssignedSchools.length}\n`);

    // Count by different criteria
    const activeTeachers = teachersInAssignedSchools.filter(doc => {
        const teacher = doc.data();
        return teacher.status === 'active';
    });

    const teachersWithNonNullSchool = teachersInAssignedSchools.filter(doc => {
        const teacher = doc.data();
        return teacher.school_id !== null && teacher.school_id !== undefined;
    });

    console.log('=== BREAKDOWN ===');
    console.log(`Active Teachers: ${activeTeachers.length}`);
    console.log(`Teachers with Non-Null school_id: ${teachersWithNonNullSchool.length}`);

    // Check for duplicates by school
    const teachersBySchool = new Map<string, number>();
    teachersInAssignedSchools.forEach(doc => {
        const teacher = doc.data();
        const schoolId = teacher.school_id;
        teachersBySchool.set(schoolId, (teachersBySchool.get(schoolId) || 0) + 1);
    });

    console.log(`\nTeachers by School (${teachersBySchool.size} schools):`);
    const sortedSchools = Array.from(teachersBySchool.entries()).sort((a, b) => b[1] - a[1]);
    sortedSchools.slice(0, 10).forEach(([schoolId, count]) => {
        console.log(`  ${schoolId}: ${count} teachers`);
    });

    // Check what the dashboard query would return
    console.log('\n=== DASHBOARD vs TEACHERS PAGE ===');
    console.log(`Dashboard Count (filtered by assigned schools): ${teachersInAssignedSchools.length}`);
    console.log(`Expected Teachers Page Count: Should match above`);

    // Investigate the 97 vs 114 difference
    const difference = 114 - 97;
    console.log(`\nDifference: ${difference} teachers`);
    console.log('\nPossible reasons for discrepancy:');
    console.log('1. Dashboard might filter by status (active only)');
    console.log('2. Teachers page might show ALL teachers, not just assigned schools');
    console.log('3. Some teachers might have null/invalid school_id');

    // Get teachers NOT in assigned schools
    const teachersNotInAssignedSchools = allTeachersSnapshot.docs.filter(doc => {
        const teacher = doc.data();
        return !teacher.school_id || !assignedSchoolIds.includes(teacher.school_id);
    });

    console.log(`\nTeachers NOT in assigned schools: ${teachersNotInAssignedSchools.length}`);
    console.log(`97 + ${teachersNotInAssignedSchools.length} = ${97 + teachersNotInAssignedSchools.length}`);

    if (97 + teachersNotInAssignedSchools.length === 114) {
        console.log('\n✅ FOUND THE ISSUE:');
        console.log('The Teachers page is showing ALL teachers (114)');
        console.log('The Dashboard correctly shows only teachers in assigned schools (97)');
    }
}

investigateZainabDashboard().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
