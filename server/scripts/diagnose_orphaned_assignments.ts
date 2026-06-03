import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function diagnoseOrphanedAssignments() {
    console.log('🔍 Diagnosing Orphaned School Assignments\n');
    console.log('='.repeat(80));

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // 1. Find Safa
        console.log('\n📌 Finding Safa Warsi...');
        const usersSnapshot = await db.collection('users')
            .where('username', '==', 'safawarsi')
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            // Fallback: search by name
            const allUsers = await db.collection('users').get();
            const user = allUsers.docs.find(d => {
                const data = d.data();
                const fullName = ((data.first_name || '') + ' ' + (data.last_name || '')).toLowerCase();
                return fullName.includes('safa');
            });

            if (!user) {
                console.log('❌ User "safa" not found.');
                process.exit(1);
            }
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;

        console.log(`✅ Found: ${userData.first_name} ${userData.last_name}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Username: ${userData.username}`);

        // 2. Fetch assignments in ONE call
        console.log('\n📌 Fetching assignments...');
        const assignmentsSnapshot = await db.collection('school_assignments')
            .where('employee_id', '==', userId)
            .get();

        console.log(`   Total Assignments: ${assignmentsSnapshot.size}`);

        if (assignmentsSnapshot.empty) {
            console.log('❌ No assignments found.');
            process.exit(0);
        }

        const assignments = assignmentsSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        // 3. Fetch ALL schools in ONE call
        console.log('\n📌 Fetching all schools...');
        const schoolsSnapshot = await db.collection('schools').get();

        // Build a Set of valid school IDs for O(1) lookup
        const validSchoolIds = new Set();
        const schoolsById = new Map();

        schoolsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Handle both doc.id and data.id as identifiers
            const schoolId = data.id || doc.id;
            validSchoolIds.add(schoolId);
            schoolsById.set(schoolId, { docId: doc.id, ...data });
        });

        console.log(`   Total Schools in DB: ${schoolsSnapshot.size}`);

        // 4. Analyze offline (no more Firestore calls)
        console.log('\n📌 Analyzing assignments...\n');

        let validCount = 0;
        let orphanedCount = 0;
        const orphanedAssignments = [];

        for (const assignment of assignments) {
            const schoolId = assignment.school_id;

            if (validSchoolIds.has(schoolId)) {
                validCount++;
                const school = schoolsById.get(schoolId);
                console.log(`✅ ${school.name || 'Unnamed'} (${schoolId})`);
            } else {
                orphanedCount++;
                orphanedAssignments.push({
                    assignmentId: assignment.id,
                    schoolId: schoolId,
                    assignedDate: assignment.assigned_date || 'N/A'
                });
                console.log(`❌ ORPHANED: Assignment ${assignment.id} → School ${schoolId}`);
            }
        }

        // 5. Summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total Assignments:        ${assignments.length}`);
        console.log(`Valid Assignments:        ${validCount} ✅`);
        console.log(`Orphaned Assignments:     ${orphanedCount} ❌`);
        console.log(`Expected Dashboard Count: ${validCount}`);
        console.log('='.repeat(80));

        // 6. Save orphaned assignments to file
        if (orphanedCount > 0) {
            const reportPath = path.join(__dirname, 'orphaned_assignments_report.json');
            fs.writeFileSync(reportPath, JSON.stringify({
                userId,
                userName: `${userData.first_name} ${userData.last_name}`,
                totalAssignments: assignments.length,
                validAssignments: validCount,
                orphanedAssignments: orphanedAssignments
            }, null, 2));

            console.log(`\n📝 Report saved to: orphaned_assignments_report.json`);
            console.log(`\n💡 NEXT STEPS:`);
            console.log(`   To fix this issue, you can:`);
            console.log(`   1. Delete orphaned assignments (dashboard will show ${validCount} schools)`);
            console.log(`   2. Restore missing schools (dashboard will show ${assignments.length} schools)`);
        } else {
            console.log(`\n✅ No orphaned assignments found!`);
            console.log(`   All ${validCount} assignments reference valid schools.`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
    process.exit(0);
}

diagnoseOrphanedAssignments().catch(console.error);
