import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkEmployee() {
    console.log('🔍 Checking Single Employee Dashboard Data...\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // Get all employees
        const usersSnapshot = await db.collection('users').where('role', '==', 'employee').limit(5).get();

        console.log(`Found ${usersSnapshot.size} employees\n`);

        for (const userDoc of usersSnapshot.docs) {
            const user = userDoc.data();
            const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Employee: ${name} (${user.username})`);
            console.log(`User ID: ${userDoc.id}`);
            console.log(`${'='.repeat(60)}`);

            // Get assignments
            const assignmentsSnapshot = await db.collection('school_assignments')
                .where('employee_id', '==', userDoc.id)
                .get();

            console.log(`\n📋 School Assignments: ${assignmentsSnapshot.size}`);

            if (assignmentsSnapshot.empty) {
                console.log('   ❌ No assignments found');
                continue;
            }

            const schoolIds = assignmentsSnapshot.docs.map(doc => doc.data().school_id);
            console.log(`\n🏫 Assigned School IDs (${schoolIds.length}):`);
            schoolIds.forEach((id, idx) => {
                console.log(`   ${idx + 1}. ${id}`);
            });

            // Check if schools exist
            console.log(`\n✅ Verifying Schools Exist:`);
            let foundCount = 0;
            let notFoundCount = 0;

            for (const schoolId of schoolIds.slice(0, 10)) { // Check first 10
                const schoolDoc = await db.collection('schools').doc(schoolId).get();
                if (schoolDoc.exists) {
                    foundCount++;
                    console.log(`   ✓ ${schoolId} - ${schoolDoc.data()?.name || 'N/A'}`);
                } else {
                    notFoundCount++;
                    console.log(`   ✗ ${schoolId} - NOT FOUND`);
                }
            }

            if (schoolIds.length > 10) {
                console.log(`   ... (${schoolIds.length - 10} more not checked)`);
            }

            console.log(`\nSummary for ${name}:`);
            console.log(`  Total Assignments: ${assignmentsSnapshot.size}`);
            console.log(`  Schools Found: ${foundCount}`);
            console.log(`  Schools Not Found: ${notFoundCount}`);

            // Check if this is a >30 school IDs case
            if (schoolIds.length > 30) {
                console.log(`\n⚠️  WARNING: This employee has MORE THAN 30 assigned schools!`);
                console.log(`   The dashboard count() method only uses first 30 items in $in filter.`);
                console.log(`   This is the BUG causing zero schools to show!`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

checkEmployee().catch(console.error);
