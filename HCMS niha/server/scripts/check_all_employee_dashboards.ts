import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkAllEmployees() {
    console.log('🔍 Checking All Employee Dashboards...\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // Fetch all data at once to avoid quota issues
        console.log('Fetching data...');
        const [usersSnapshot, assignmentsSnapshot, schoolsSnapshot] = await Promise.all([
            db.collection('users').where('role', '==', 'employee').get(),
            db.collection('school_assignments').get(),
            db.collection('schools').get()
        ]);

        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const assignments = assignmentsSnapshot.docs.map(doc => doc.data());
        const schools = new Set(schoolsSnapshot.docs.map(doc => doc.data().id));

        console.log(`\nTotal Employees: ${users.length}`);
        console.log(`Total Assignments: ${assignments.length}`);
        console.log(`Total Schools: ${schools.size}\n`);
        console.log('─'.repeat(90));
        console.log('Status | Employee Name     | Username           | Assignments | Schools | Issue');
        console.log('─'.repeat(90));

        let okCount = 0;
        let noDataCount = 0;
        let mismatchCount = 0;

        for (const user of users) {
            const name = `${user.first_name || ''} ${user.last_name || ''}`.trim().substring(0, 17);
            const username = (user.username || 'N/A').substring(0, 18);

            // Get assignments for this employee
            const userAssignments = assignments.filter(a => a.employee_id === user.id);
            const schoolIds = userAssignments.map(a => a.school_id);

            // Count how many assigned schools actually exist
            const existingSchools = schoolIds.filter(id => schools.has(id));

            let status, issue = '';
            if (userAssignments.length === 0) {
                status = '❌';
                issue = 'No assignments';
                noDataCount++;
            } else if (existingSchools.length !== userAssignments.length) {
                status = '⚠️ ';
                issue = `${userAssignments.length - existingSchools.length} missing schools`;
                mismatchCount++;
            } else {
                status = '✅';
                issue = 'OK';
                okCount++;
            }

            console.log(
                `${status}     | ` +
                `${name.padEnd(17)} | ` +
                `${username.padEnd(18)} | ` +
                `${String(userAssignments.length).padStart(11)} | ` +
                `${String(existingSchools.length).padStart(7)} | ` +
                `${issue}`
            );
        }

        console.log('─'.repeat(90));
        console.log(`\nSummary:`);
        console.log(`  ✅ OK: ${okCount}`);
        console.log(`  ⚠️  Mismatch: ${mismatchCount}`);
        console.log(`  ❌ No Data: ${noDataCount}`);

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

checkAllEmployees().catch(console.error);
