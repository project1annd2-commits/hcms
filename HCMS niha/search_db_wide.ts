import { db } from './src/lib/services/db';

async function searchAllCollections() {
    // This is a bit of a guess since we can't easily list collections without admin SDK
    // But we can try common ones found in the app
    const commonCollections = [
        'schools', 'users', 'teachers', 'mentors', 'students', 
        'student_assessments', 'school_assignments', 'school_followups',
        'implementation_checklists', 'background_tasks', 'audit_logs',
        'notifications', 'messages', 'settings', 'config'
    ];

    console.log('--- SEARCHING FOR SCHOOL ID IN KNOWN COLLECTIONS ---');
    for (const coll of commonCollections) {
        try {
            const data = await db.find(coll, {});
            if (data.length > 0) {
                const hasSchoolId = data.some((item: any) => item.school_id !== undefined);
                console.log(`Collection ${coll}: ${data.length} records. Has school_id: ${hasSchoolId}`);
                if (hasSchoolId && coll !== 'schools' && coll !== 'teachers' && coll !== 'students' && coll !== 'mentors' && coll !== 'school_assignments' && coll !== 'school_followups') {
                    console.log(`Potential Match in ${coll}:`, JSON.stringify(data[0]).substring(0, 200));
                }
            }
        } catch (e) {}
    }
}
searchAllCollections();
