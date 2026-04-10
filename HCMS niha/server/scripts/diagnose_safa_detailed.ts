import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function diagnoseSafaDetailed() {
    console.log('🔍 Detailed Diagnosis: Safa School Assignments\n');
    console.log('='.repeat(80));

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // 1. Find Safa
        console.log('\n📌 STEP 1: Finding Safa Warsi...');
        const usersSnapshot = await db.collection('users').get();
        const user = usersSnapshot.docs.find(d => {
            const data = d.data();
            const fullName = ((data.first_name || '') + ' ' + (data.last_name || '')).toLowerCase();
            const username = (data.username || '').toLowerCase();
            return fullName.includes('safa') || username.includes('safa');
        });

        if (!user) {
            console.log('❌ User "safa" not found.');
            process.exit(1);
        }

        const userData = user.data();
        console.log(`✅ Found: ${userData.first_name} ${userData.last_name}`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Username: ${userData.username}`);
        console.log(`   Role: ${userData.role}`);

        // 2. Get ALL Assignments
        console.log('\n📌 STEP 2: Fetching ALL school assignments...');
        const assignmentsSnapshot = await db.collection('school_assignments')
            .where('employee_id', '==', user.id)
            .get();

        console.log(`   Total Assignments in DB: ${assignmentsSnapshot.size}`);

        if (assignmentsSnapshot.empty) {
            console.log('❌ No assignments found for Safa.');
            process.exit(1);
        }

        // 3. Check which schools exist
        console.log('\n📌 STEP 3: Checking school existence...');
        const schoolIds = assignmentsSnapshot.docs.map(d => d.data().school_id);
        const uniqueSchoolIds = [...new Set(schoolIds)];
        console.log(`   Unique School IDs: ${uniqueSchoolIds.length}`);
        console.log(`   Total Assignment Records: ${assignmentsSnapshot.size}`);

        if (uniqueSchoolIds.length !== assignmentsSnapshot.size) {
            console.log(`   ⚠️  WARNING: There are duplicate school assignments!`);
            console.log(`      Duplicates: ${assignmentsSnapshot.size - uniqueSchoolIds.length}`);
        }

        // 4. Get all schools from DB
        const schoolsSnapshot = await db.collection('schools').get();
        const schoolsMap = new Map();

        schoolsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Schools might use either doc.id or data.id as identifier
            if (data.id) {
                schoolsMap.set(data.id, { docId: doc.id, ...data });
            }
            schoolsMap.set(doc.id, { docId: doc.id, ...data });
        });

        console.log(`   Total Schools in DB: ${schoolsSnapshot.size}`);

        // 5. Detailed Analysis
        console.log('\n📌 STEP 4: Detailed School Analysis...');
        console.log('='.repeat(80));

        let existingCount = 0;
        let missingCount = 0;
        const missingSchools = [];

        for (const doc of assignmentsSnapshot.docs) {
            const assignment = doc.data();
            const schoolId = assignment.school_id;
            const school = schoolsMap.get(schoolId);

            if (school) {
                existingCount++;
                console.log(`✅ ${school.name || 'Unnamed'} (ID: ${schoolId})`);
            } else {
                missingCount++;
                missingSchools.push(schoolId);
                console.log(`❌ MISSING: School ID ${schoolId}`);
            }
        }

        // 6. Summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total Assignments:        ${assignmentsSnapshot.size}`);
        console.log(`Unique Schools Assigned:  ${uniqueSchoolIds.length}`);
        console.log(`Schools Existing in DB:   ${existingCount} ✅`);
        console.log(`Schools Missing from DB:  ${missingCount} ❌`);
        console.log('='.repeat(80));

        // 7. Conclusion
        console.log('\n🎯 DIAGNOSIS:');
        if (missingCount > 0) {
            console.log(`❌ There are ${missingCount} school(s) assigned to Safa that don't exist in the schools collection.`);
            console.log(`   Dashboard shows: ${existingCount} schools (only schools that exist)`);
            console.log(`   Should show: ${assignmentsSnapshot.size} schools (all assignments)`);
            console.log(`\n   Missing School IDs:`);
            missingSchools.forEach(id => console.log(`     - ${id}`));
            console.log(`\n💡 SOLUTION: Either:`);
            console.log(`   1. Remove the ${missingCount} invalid assignment(s) from school_assignments`);
            console.log(`   2. Add the missing school(s) to the schools collection`);
        } else if (uniqueSchoolIds.length < assignmentsSnapshot.size) {
            console.log(`⚠️  There are duplicate assignments for the same schools.`);
            console.log(`   Dashboard correctly shows: ${uniqueSchoolIds.length} unique schools`);
            console.log(`   Assignment records: ${assignmentsSnapshot.size} (includes duplicates)`);
            console.log(`\n💡 SOLUTION: Remove duplicate assignment records.`);
        } else {
            console.log(`✅ All ${existingCount} schools assigned to Safa exist in the database.`);
            console.log(`   Dashboard should show all ${existingCount} schools correctly.`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
    process.exit(0);
}

diagnoseSafaDetailed().catch(console.error);
